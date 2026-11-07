import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { Wallet, WalletDocument } from '../schemas/wallet.schema.js';
import { WalletLedger, WalletLedgerDocument } from '../schemas/wallet-ledger.schema.js';
import { SettingsService } from '../../facility/services/settings.service.js';
import { DatabaseTransactionService } from '../../../database/database-transaction.service.js';
import { OutboxService } from '../../outbox/services/outbox.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  TopupWalletDto,
  WalletPayDto,
  WalletHoldDto,
  WalletReleaseDto,
  WalletSettleDto,
  AdjustWalletDto,
  ReconciliationResult,
  WalletTxnType,
} from '@sports/contracts';
import { assertValidMoney, assertValidMoneyDelta } from '@sports/shared';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<WalletDocument>,
    @InjectModel(WalletLedger.name) private readonly walletLedgerModel: Model<WalletLedgerDocument>,
    private readonly settingsService: SettingsService,
    private readonly transactionService: DatabaseTransactionService,
    private readonly outboxService: OutboxService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Lấy hoặc khởi tạo ví khách hàng nếu chưa có
   */
  async getOrCreateWallet(userId: string, session?: ClientSession): Promise<WalletDocument> {
    const userObjectId = new Types.ObjectId(userId);
    let wallet = await this.walletModel.findOne({ userId: userObjectId }).session(session || null).exec();

    if (!wallet) {
      wallet = new this.walletModel({
        userId: userObjectId,
        balance: 0,
        held: 0,
        version: 0,
      });
      await wallet.save({ session });
      this.logger.log(`Created new internal wallet for user ${userId}`);
    }

    return wallet;
  }

  /**
   * Helper bọc transaction với Idempotency:
   * 1. Tìm bản ghi có sẵn theo idempotencyKey -> trả về ngay (idempotent replay)
   * 2. Chạy transaction thực thi nghiệp vụ
   * 3. Bắt lỗi E11000 trùng key khi nhiều luồng cùng gọi đồng thời -> tìm lại bản ghi vừa được commit và trả về an toàn
   */
  private async executeWithIdempotency<T extends WalletLedgerDocument>(
    idempotencyKey: string,
    operation: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    const existing = await this.walletLedgerModel.findOne({ idempotencyKey }).exec();
    if (existing) {
      this.logger.log(`Idempotent replay: ${idempotencyKey}`);
      return existing as T;
    }

    try {
      return await this.transactionService.runTransaction(operation);
    } catch (err: any) {
      if (err?.code === 11000 || err?.message?.includes('E11000')) {
        const replay = await this.walletLedgerModel.findOne({ idempotencyKey }).exec();
        if (replay) {
          this.logger.log(`Handled concurrent duplicate key: ${idempotencyKey}`);
          return replay as T;
        }
      }
      throw err;
    }
  }

  /**
   * Nạp tiền vào ví (TOPUP / DEPOSIT)
   */
  async topup(userId: string, dto: TopupWalletDto, actorId?: string): Promise<WalletLedgerDocument> {
    assertValidMoney(dto.amount, 'topup amount');

    // Kiểm tra hạn mức nạp tối thiểu
    const minTopup = this.settingsService.get<number>('wallet.minTopup', 20000);
    if (dto.amount < minTopup) {
      throw new BadRequestException(`Số tiền nạp tối thiểu là ${minTopup.toLocaleString('vi-VN')} VND`);
    }

    // Kiểm tra hạn mức số dư tối đa
    const maxBalance = this.settingsService.get<number>('wallet.maxBalance', 50000000);

    return this.executeWithIdempotency(dto.idempotencyKey, async (session: ClientSession) => {
      const wallet = await this.getOrCreateWallet(userId, session);

      if (wallet.balance + wallet.held + dto.amount > maxBalance) {
        throw new BadRequestException(`Số dư ví sau khi nạp vượt quá hạn mức tối đa (${maxBalance.toLocaleString('vi-VN')} VND)`);
      }

      const updatedWallet = await this.walletModel.findOneAndUpdate(
        { _id: wallet._id },
        { $inc: { balance: dto.amount, version: 1 } },
        { new: true, session },
      );

      if (!updatedWallet) {
        throw new NotFoundException('Không tìm thấy ví người dùng');
      }

      const ledgerEntry = new this.walletLedgerModel({
        walletId: wallet._id,
        userId: new Types.ObjectId(userId),
        type: WalletTxnType.DEPOSIT,
        amount: dto.amount,
        heldDelta: 0,
        balanceAfter: updatedWallet.balance,
        heldAfter: updatedWallet.held,
        refType: 'TOPUP',
        refId: dto.idempotencyKey,
        idempotencyKey: dto.idempotencyKey,
        note: dto.note || 'Nạp tiền vào ví nội bộ',
        actorId,
      });

      const savedLedger = await ledgerEntry.save({ session });

      await this.outboxService.recordEvent(
        {
          eventType: 'wallet.topup_success',
          aggregateType: 'wallet',
          aggregateId: wallet.id,
          payload: {
            userId,
            amount: dto.amount,
            newBalance: updatedWallet.balance,
            idempotencyKey: dto.idempotencyKey,
          },
        },
        session,
      );

      await this.auditLogService.record(
        {
          actorId,
          action: 'WALLET_TOPUP',
          targetType: 'wallet',
          targetId: wallet.id,
          after: { amount: dto.amount, balanceAfter: updatedWallet.balance },
        },
        session,
      );

      return savedLedger;
    });
  }

  /**
   * Trừ tiền ví thanh toán dịch vụ (SPEND / PAYMENT)
   */
  async pay(userId: string, dto: WalletPayDto, actorId?: string): Promise<WalletLedgerDocument> {
    assertValidMoney(dto.amount, 'payment amount');

    // Kiểm tra danh mục được phép thanh toán
    const allowedCategories = this.settingsService.get<string[]>('wallet.allowedCategories', [
      'COURT',
      'GAME_TIME',
      'GAME_ROOM',
      'CANTEEN',
      'RENTAL',
    ]);

    if (!allowedCategories.includes(dto.category)) {
      throw new BadRequestException(`Danh mục ${dto.category} không được phép thanh toán bằng ví nội bộ`);
    }

    return this.executeWithIdempotency(dto.idempotencyKey, async (session: ClientSession) => {
      const wallet = await this.getOrCreateWallet(userId, session);

      // Thao tác nguyên tử kiểm tra balance >= amount và trừ tiền (Chống âm số dư)
      const updatedWallet = await this.walletModel.findOneAndUpdate(
        { _id: wallet._id, balance: { $gte: dto.amount } },
        { $inc: { balance: -dto.amount, version: 1 } },
        { new: true, session },
      );

      if (!updatedWallet) {
        throw new BadRequestException('Số dư ví không đủ để thanh toán');
      }

      const ledgerEntry = new this.walletLedgerModel({
        walletId: wallet._id,
        userId: new Types.ObjectId(userId),
        type: WalletTxnType.PAYMENT,
        amount: -dto.amount,
        heldDelta: 0,
        balanceAfter: updatedWallet.balance,
        heldAfter: updatedWallet.held,
        category: dto.category,
        refType: dto.refType,
        refId: dto.refId,
        idempotencyKey: dto.idempotencyKey,
        note: dto.note || `Thanh toán ${dto.category}`,
        actorId,
      });

      const savedLedger = await ledgerEntry.save({ session });

      await this.outboxService.recordEvent(
        {
          eventType: 'wallet.spent',
          aggregateType: 'wallet',
          aggregateId: wallet.id,
          payload: {
            userId,
            amount: dto.amount,
            category: dto.category,
            refId: dto.refId,
            newBalance: updatedWallet.balance,
          },
        },
        session,
      );

      await this.auditLogService.record(
        {
          actorId,
          action: 'WALLET_PAY',
          targetType: 'wallet',
          targetId: wallet.id,
          after: { amount: dto.amount, category: dto.category, balanceAfter: updatedWallet.balance },
        },
        session,
      );

      return savedLedger;
    });
  }

  /**
   * Tạm giữ số dư (HOLD) cho phiên chơi gaming
   */
  async hold(userId: string, dto: WalletHoldDto, actorId?: string): Promise<WalletLedgerDocument> {
    assertValidMoney(dto.amount, 'hold amount');

    return this.executeWithIdempotency(dto.idempotencyKey, async (session: ClientSession) => {
      const wallet = await this.getOrCreateWallet(userId, session);

      // Chuyển tiền từ balance sang held
      const updatedWallet = await this.walletModel.findOneAndUpdate(
        { _id: wallet._id, balance: { $gte: dto.amount } },
        { $inc: { balance: -dto.amount, held: dto.amount, version: 1 } },
        { new: true, session },
      );

      if (!updatedWallet) {
        throw new BadRequestException('Số dư ví không đủ để thực hiện tạm giữ');
      }

      const ledgerEntry = new this.walletLedgerModel({
        walletId: wallet._id,
        userId: new Types.ObjectId(userId),
        type: WalletTxnType.HOLD,
        amount: -dto.amount,
        heldDelta: dto.amount,
        balanceAfter: updatedWallet.balance,
        heldAfter: updatedWallet.held,
        refType: dto.refType || 'GAMING_SESSION',
        refId: dto.refId,
        idempotencyKey: dto.idempotencyKey,
        note: dto.note || 'Tạm giữ số dư chơi gaming',
        actorId,
      });

      return ledgerEntry.save({ session });
    });
  }

  /**
   * Giải tỏa tạm giữ (RELEASE) trả lại về số dư khả dụng
   */
  async release(userId: string, dto: WalletReleaseDto, actorId?: string): Promise<WalletLedgerDocument> {
    assertValidMoney(dto.amount, 'release amount');

    return this.executeWithIdempotency(dto.idempotencyKey, async (session: ClientSession) => {
      const wallet = await this.getOrCreateWallet(userId, session);

      const updatedWallet = await this.walletModel.findOneAndUpdate(
        { _id: wallet._id, held: { $gte: dto.amount } },
        { $inc: { balance: dto.amount, held: -dto.amount, version: 1 } },
        { new: true, session },
      );

      if (!updatedWallet) {
        throw new BadRequestException('Số tiền tạm giữ không đủ để giải tỏa');
      }

      const ledgerEntry = new this.walletLedgerModel({
        walletId: wallet._id,
        userId: new Types.ObjectId(userId),
        type: WalletTxnType.RELEASE,
        amount: dto.amount,
        heldDelta: -dto.amount,
        balanceAfter: updatedWallet.balance,
        heldAfter: updatedWallet.held,
        refType: 'GAMING_SESSION',
        refId: dto.refId,
        idempotencyKey: dto.idempotencyKey,
        note: dto.note || 'Giải tỏa số dư tạm giữ',
        actorId,
      });

      return ledgerEntry.save({ session });
    });
  }

  /**
   * Quyết toán phiên tạm giữ (SETTLE - dành cho gaming)
   */
  async settle(userId: string, dto: WalletSettleDto, actorId?: string): Promise<WalletLedgerDocument> {
    assertValidMoney(dto.amount, 'settle cost amount');
    assertValidMoney(dto.heldToRelease, 'held to release');

    if (dto.amount > dto.heldToRelease) {
      throw new BadRequestException('Chi phí thực tế không được vượt quá số tiền đã tạm giữ');
    }

    const refundBack = dto.heldToRelease - dto.amount;

    return this.executeWithIdempotency(dto.idempotencyKey, async (session: ClientSession) => {
      const wallet = await this.getOrCreateWallet(userId, session);

      // Giải phóng toàn bộ heldToRelease, cộng lại phần tiền thừa refundBack vào balance
      const updatedWallet = await this.walletModel.findOneAndUpdate(
        { _id: wallet._id, held: { $gte: dto.heldToRelease } },
        { $inc: { balance: refundBack, held: -dto.heldToRelease, version: 1 } },
        { new: true, session },
      );

      if (!updatedWallet) {
        throw new BadRequestException('Số tiền tạm giữ không đủ để quyết toán');
      }

      const ledgerEntry = new this.walletLedgerModel({
        walletId: wallet._id,
        userId: new Types.ObjectId(userId),
        type: WalletTxnType.SETTLE,
        amount: refundBack,
        heldDelta: -dto.heldToRelease,
        balanceAfter: updatedWallet.balance,
        heldAfter: updatedWallet.held,
        category: dto.category,
        refType: 'GAMING_SESSION',
        refId: dto.refId,
        idempotencyKey: dto.idempotencyKey,
        note: dto.note || `Quyết toán phiên gaming (${dto.amount.toLocaleString('vi-VN')} đ)`,
        actorId,
      });

      return ledgerEntry.save({ session });
    });
  }

  /**
   * Hoàn tiền vào ví (REFUND - do hủy sân trước 24h hoặc slot bị sự cố)
   */
  async refund(
    userId: string,
    amount: number,
    refType: string,
    refId: string,
    idempotencyKey: string,
    reason?: string,
    actorId?: string,
  ): Promise<WalletLedgerDocument> {
    assertValidMoney(amount, 'refund amount');

    return this.executeWithIdempotency(idempotencyKey, async (session: ClientSession) => {
      const wallet = await this.getOrCreateWallet(userId, session);

      const updatedWallet = await this.walletModel.findOneAndUpdate(
        { _id: wallet._id },
        { $inc: { balance: amount, version: 1 } },
        { new: true, session },
      );

      if (!updatedWallet) {
        throw new NotFoundException('Không tìm thấy ví');
      }

      const ledgerEntry = new this.walletLedgerModel({
        walletId: wallet._id,
        userId: new Types.ObjectId(userId),
        type: WalletTxnType.REFUND,
        amount,
        heldDelta: 0,
        balanceAfter: updatedWallet.balance,
        heldAfter: updatedWallet.held,
        refType,
        refId,
        idempotencyKey,
        note: reason || 'Hoàn tiền vào ví',
        actorId,
      });

      const saved = await ledgerEntry.save({ session });

      await this.outboxService.recordEvent(
        {
          eventType: 'wallet.refunded',
          aggregateType: 'wallet',
          aggregateId: wallet.id,
          payload: { userId, amount, refId },
        },
        session,
      );

      return saved;
    });
  }

  /**
   * Bút toán điều chỉnh số dư thủ công (ADJUSTMENT - Chỉ Admin có quyền, bắt buộc có lý do)
   */
  async adjust(userId: string, dto: AdjustWalletDto, actorId: string): Promise<WalletLedgerDocument> {
    assertValidMoneyDelta(dto.amount, 'adjustment amount');

    return this.executeWithIdempotency(dto.idempotencyKey, async (session: ClientSession) => {
      const wallet = await this.getOrCreateWallet(userId, session);

      const filter: Record<string, unknown> = { _id: wallet._id };
      if (dto.amount < 0) {
        filter.balance = { $gte: -dto.amount };
      }

      const updatedWallet = await this.walletModel.findOneAndUpdate(
        filter,
        { $inc: { balance: dto.amount, version: 1 } },
        { new: true, session },
      );

      if (!updatedWallet) {
        throw new BadRequestException('Số dư ví không đủ để thực hiện điều chỉnh giảm');
      }

      const ledgerEntry = new this.walletLedgerModel({
        walletId: wallet._id,
        userId: new Types.ObjectId(userId),
        type: WalletTxnType.ADJUSTMENT,
        amount: dto.amount,
        heldDelta: 0,
        balanceAfter: updatedWallet.balance,
        heldAfter: updatedWallet.held,
        refType: 'MANUAL_ADJUSTMENT',
        refId: dto.idempotencyKey,
        idempotencyKey: dto.idempotencyKey,
        note: dto.reason,
        actorId,
      });

      const saved = await ledgerEntry.save({ session });

      await this.auditLogService.record(
        {
          actorId,
          action: 'WALLET_ADJUST',
          targetType: 'wallet',
          targetId: wallet.id,
          before: { balance: wallet.balance },
          after: { amount: dto.amount, reason: dto.reason, balanceAfter: updatedWallet.balance },
        },
        session,
      );

      return saved;
    });
  }

  /**
   * Kiểm tra đối soát sổ cái (Reconciliation Invariant: balance + held = Σ ledger.amount + heldDelta)
   */
  async reconcile(userId: string): Promise<ReconciliationResult> {
    const wallet = await this.getOrCreateWallet(userId);
    const ledgerEntries = await this.walletLedgerModel.find({ userId: wallet.userId }).exec();

    let ledgerSum = 0;
    for (const entry of ledgerEntries) {
      ledgerSum += entry.amount + entry.heldDelta;
    }

    const walletTotal = wallet.balance + wallet.held;
    const isBalanced = walletTotal === ledgerSum;

    if (!isBalanced) {
      this.logger.error(
        `RECONCILIATION MISMATCH for user ${userId}: WalletTotal = ${walletTotal}, LedgerSum = ${ledgerSum}`,
      );
    }

    return {
      userId,
      walletBalance: wallet.balance,
      walletHeld: wallet.held,
      walletTotal,
      ledgerSum,
      isBalanced,
      transactionCount: ledgerEntries.length,
    };
  }

  /**
   * Xem thông tin ví
   */
  async getWallet(userId: string): Promise<WalletDocument> {
    return this.getOrCreateWallet(userId);
  }

  /**
   * Lịch sử giao dịch ví có phân trang
   */
  async getTransactions(
    userId: string,
    filter?: { type?: WalletTxnType; page?: number; limit?: number },
  ) {
    const page = filter?.page || 1;
    const limit = Math.min(filter?.limit || 20, 100);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    if (filter?.type) {
      query.type = filter.type;
    }

    const [items, total] = await Promise.all([
      this.walletLedgerModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.walletLedgerModel.countDocuments(query).exec(),
    ]);

    return { items, total, page, limit };
  }
}
