import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import { WalletLedger, WalletLedgerDocument } from './schemas/wallet-ledger.schema';
import { WalletTxnType, WalletCategory, WalletStatus } from '../common/enums';
import {
  TopupWalletDto,
  WalletPayDto,
  WalletHoldDto,
  WalletReleaseDto,
  AdjustWalletDto,
} from './dto/wallet.dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<WalletDocument>,
    @InjectModel(WalletLedger.name) private readonly ledgerModel: Model<WalletLedgerDocument>,
  ) {}

  async getOrCreateWallet(userId: string): Promise<WalletDocument> {
    const userObjectId = new Types.ObjectId(userId);
    let wallet = await this.walletModel.findOne({ userId: userObjectId }).exec();

    if (!wallet) {
      wallet = new this.walletModel({
        userId: userObjectId,
        balance: 500000, // Tặng sẵn 500,000 VND số dư ban đầu cho trải nghiệm
        held: 0,
        status: WalletStatus.ACTIVE,
        version: 0,
      });
      await wallet.save();

      // Tạo bút toán khởi tạo ban đầu
      const initialLedger = new this.ledgerModel({
        walletId: wallet._id,
        userId: userObjectId,
        type: WalletTxnType.DEPOSIT,
        amount: 500000,
        heldDelta: 0,
        balanceAfter: 500000,
        heldAfter: 0,
        category: WalletCategory.TOPUP,
        refType: 'SYSTEM_INITIAL',
        refId: wallet._id.toString(),
        idempotencyKey: `INIT-${wallet._id.toString()}`,
        note: 'Khởi tạo ví Phanta Pay ban đầu',
      });
      await initialLedger.save();
    }

    return wallet;
  }

  async getMyWallet(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      id: wallet._id.toString(),
      userId: wallet.userId.toString(),
      balance: wallet.balance,
      held: wallet.held,
      total: wallet.balance + wallet.held,
      status: wallet.status,
      version: wallet.version,
      updatedAt: wallet.updatedAt,
    };
  }

  async getTransactions(userId: string, filter?: { type?: string; page?: number; limit?: number }) {
    await this.getOrCreateWallet(userId);
    const userObjectId = new Types.ObjectId(userId);
    const query: any = { userId: userObjectId };
    if (filter?.type) {
      query.type = filter.type;
    }

    const page = filter?.page || 1;
    const limit = filter?.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.ledgerModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.ledgerModel.countDocuments(query).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async topup(userId: string, dto: TopupWalletDto, actorId?: string) {
    const wallet = await this.getOrCreateWallet(userId);

    // Kiểm tra idempotency
    const existingLedger = await this.ledgerModel.findOne({ idempotencyKey: dto.idempotencyKey }).exec();
    if (existingLedger) {
      return { success: true, duplicated: true, ledger: existingLedger };
    }

    const previousBalance = wallet.balance;
    const newBalance = previousBalance + dto.amount;

    wallet.balance = newBalance;
    wallet.version += 1;
    await wallet.save();

    const ledger = new this.ledgerModel({
      walletId: wallet._id,
      userId: wallet.userId,
      type: WalletTxnType.DEPOSIT,
      amount: dto.amount,
      heldDelta: 0,
      balanceAfter: newBalance,
      heldAfter: wallet.held,
      category: WalletCategory.TOPUP,
      refType: 'TOPUP_VIETQR',
      refId: dto.idempotencyKey,
      idempotencyKey: dto.idempotencyKey,
      note: dto.note || `Nạp tiền ví Phanta Pay: +${dto.amount.toLocaleString('vi-VN')} đ`,
      actorId: actorId || userId,
    });
    await ledger.save();

    return {
      success: true,
      wallet: {
        id: wallet._id.toString(),
        balance: wallet.balance,
        held: wallet.held,
      },
      ledger,
    };
  }

  async pay(userId: string, dto: WalletPayDto, actorId?: string) {
    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.status === WalletStatus.LOCKED) {
      throw new BadRequestException('Ví của bạn đang bị tạm khóa. Vui lòng liên hệ ban quản trị.');
    }

    if (wallet.balance < dto.amount) {
      throw new BadRequestException(`Số dư ví không đủ (Khả dụng: ${wallet.balance.toLocaleString('vi-VN')} đ, Cần: ${dto.amount.toLocaleString('vi-VN')} đ)`);
    }

    const existingLedger = await this.ledgerModel.findOne({ idempotencyKey: dto.idempotencyKey }).exec();
    if (existingLedger) {
      return { success: true, duplicated: true, ledger: existingLedger };
    }

    const newBalance = wallet.balance - dto.amount;
    wallet.balance = newBalance;
    wallet.version += 1;
    await wallet.save();

    const ledger = new this.ledgerModel({
      walletId: wallet._id,
      userId: wallet.userId,
      type: WalletTxnType.PAYMENT,
      amount: -dto.amount,
      heldDelta: 0,
      balanceAfter: newBalance,
      heldAfter: wallet.held,
      category: dto.category,
      refType: dto.refType,
      refId: dto.refId,
      idempotencyKey: dto.idempotencyKey,
      note: dto.note || `Thanh toán ${dto.refType} #${dto.refId}: -${dto.amount.toLocaleString('vi-VN')} đ`,
      actorId: actorId || userId,
    });
    await ledger.save();

    return {
      success: true,
      wallet: {
        id: wallet._id.toString(),
        balance: wallet.balance,
        held: wallet.held,
      },
      ledger,
    };
  }

  async hold(userId: string, dto: WalletHoldDto, actorId?: string) {
    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.balance < dto.amount) {
      throw new BadRequestException('Số dư khả dụng không đủ để tạm giữ cọc.');
    }

    const existingLedger = await this.ledgerModel.findOne({ idempotencyKey: dto.idempotencyKey }).exec();
    if (existingLedger) {
      return { success: true, duplicated: true, ledger: existingLedger };
    }

    wallet.balance -= dto.amount;
    wallet.held += dto.amount;
    wallet.version += 1;
    await wallet.save();

    const ledger = new this.ledgerModel({
      walletId: wallet._id,
      userId: wallet.userId,
      type: WalletTxnType.HOLD,
      amount: -dto.amount,
      heldDelta: dto.amount,
      balanceAfter: wallet.balance,
      heldAfter: wallet.held,
      category: WalletCategory.GAME_TIME,
      refType: dto.refType,
      refId: dto.refId,
      idempotencyKey: dto.idempotencyKey,
      note: dto.note || `Tạm giữ tiền cọc ${dto.refType} #${dto.refId}`,
      actorId: actorId || userId,
    });
    await ledger.save();

    return { success: true, wallet, ledger };
  }

  async release(userId: string, dto: WalletReleaseDto, actorId?: string) {
    const wallet = await this.getOrCreateWallet(userId);

    const existingLedger = await this.ledgerModel.findOne({ idempotencyKey: dto.idempotencyKey }).exec();
    if (existingLedger) {
      return { success: true, duplicated: true, ledger: existingLedger };
    }

    const releaseAmount = Math.min(dto.amount, wallet.held);
    wallet.held -= releaseAmount;
    wallet.balance += releaseAmount;
    wallet.version += 1;
    await wallet.save();

    const ledger = new this.ledgerModel({
      walletId: wallet._id,
      userId: wallet.userId,
      type: WalletTxnType.RELEASE,
      amount: releaseAmount,
      heldDelta: -releaseAmount,
      balanceAfter: wallet.balance,
      heldAfter: wallet.held,
      category: WalletCategory.GAME_TIME,
      refType: dto.refType,
      refId: dto.refId,
      idempotencyKey: dto.idempotencyKey,
      note: dto.note || `Giải tỏa tiền tạm giữ ${dto.refType} #${dto.refId}`,
      actorId: actorId || userId,
    });
    await ledger.save();

    return { success: true, wallet, ledger };
  }

  // --- ADMIN APIs ---
  async getAllWallets(filter?: { search?: string; status?: string }) {
    const query: any = {};
    if (filter?.status) {
      query.status = filter.status;
    }

    const wallets = await this.walletModel.find(query).populate('userId', 'fullName phone email role').sort({ balance: -1 }).lean().exec();
    return wallets;
  }

  async getAllLedgers(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.ledgerModel.find().populate('userId', 'fullName phone').sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.ledgerModel.countDocuments().exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async adjustWallet(dto: AdjustWalletDto, adminId: string) {
    const wallet = await this.getOrCreateWallet(dto.userId);

    const existingLedger = await this.ledgerModel.findOne({ idempotencyKey: dto.idempotencyKey }).exec();
    if (existingLedger) {
      return { success: true, duplicated: true, ledger: existingLedger };
    }

    wallet.balance += dto.amountDelta;
    if (wallet.balance < 0) {
      throw new BadRequestException('Số dư sau điều chỉnh không thể âm.');
    }
    wallet.version += 1;
    await wallet.save();

    const ledger = new this.ledgerModel({
      walletId: wallet._id,
      userId: wallet.userId,
      type: WalletTxnType.ADJUSTMENT,
      amount: dto.amountDelta,
      heldDelta: 0,
      balanceAfter: wallet.balance,
      heldAfter: wallet.held,
      category: WalletCategory.ADJUSTMENT,
      refType: 'ADMIN_ADJUSTMENT',
      refId: dto.idempotencyKey,
      idempotencyKey: dto.idempotencyKey,
      note: `[Admin Điều chỉnh] ${dto.reason}`,
      actorId: adminId,
    });
    await ledger.save();

    return { success: true, wallet, ledger };
  }

  async toggleLock(walletId: string) {
    const wallet = await this.walletModel.findById(walletId).exec();
    if (!wallet) throw new NotFoundException('Không tìm thấy ví');

    wallet.status = wallet.status === WalletStatus.ACTIVE ? WalletStatus.LOCKED : WalletStatus.ACTIVE;
    await wallet.save();
    return wallet;
  }
}
