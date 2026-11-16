import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { WalletService } from './wallet.service.js';
import { Wallet } from '../schemas/wallet.schema.js';
import { WalletLedger } from '../schemas/wallet-ledger.schema.js';
import { SettingsService } from '../../facility/services/settings.service.js';
import { DatabaseTransactionService } from '../../../database/database-transaction.service.js';
import { OutboxService } from '../../outbox/services/outbox.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import { WalletCategory, WalletTxnType } from '@sports/contracts';

describe('WalletService', () => {
  let service: WalletService;
  let mockWalletModel: any;
  let mockWalletLedgerModel: any;
  let mockSettingsService: any;
  let mockTransactionService: any;
  let mockOutboxService: any;
  let mockAuditLogService: any;

  const inMemoryWallets: any[] = [];
  const inMemoryLedgers: any[] = [];

  beforeEach(async () => {
    inMemoryWallets.length = 0;
    inMemoryLedgers.length = 0;

    mockWalletModel = jest.fn().mockImplementation((data) => {
      const doc = {
        ...data,
        _id: data._id || new Types.ObjectId(),
        id: (data._id || new Types.ObjectId()).toString(),
        userId: data.userId,
        balance: data.balance || 0,
        held: data.held || 0,
        version: data.version || 0,
        updatedAt: new Date(),
        save: jest.fn().mockImplementation(async function () {
          const index = inMemoryWallets.findIndex((w) => w.userId.toString() === doc.userId.toString());
          if (index >= 0) inMemoryWallets[index] = doc;
          else inMemoryWallets.push(doc);
          return doc;
        }),
      };
      return doc;
    });

    mockWalletModel.findOne = jest.fn().mockImplementation((query) => ({
      session: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(async () => {
        if (query.userId) {
          return inMemoryWallets.find((w) => w.userId.toString() === query.userId.toString()) || null;
        }
        if (query._id) {
          return inMemoryWallets.find((w) => w._id.toString() === query._id.toString()) || null;
        }
        return null;
      }),
    }));

    mockWalletModel.findOneAndUpdate = jest.fn().mockImplementation((filter, update) => {
      const target = inMemoryWallets.find((w) => {
        if (filter._id && w._id.toString() !== filter._id.toString()) return false;
        if (filter['balance'] && filter['balance'].$gte !== undefined) {
          if (w.balance < filter['balance'].$gte) return false;
        }
        if (filter['held'] && filter['held'].$gte !== undefined) {
          if (w.held < filter['held'].$gte) return false;
        }
        return true;
      });

      if (!target) return Promise.resolve(null);

      if (update.$inc) {
        if (update.$inc.balance !== undefined) target.balance += update.$inc.balance;
        if (update.$inc.held !== undefined) target.held += update.$inc.held;
        if (update.$inc.version !== undefined) target.version += update.$inc.version;
      }
      target.updatedAt = new Date();
      return Promise.resolve(target);
    });

    mockWalletLedgerModel = jest.fn().mockImplementation((data) => {
      const doc = {
        ...data,
        _id: data._id || new Types.ObjectId(),
        id: (data._id || new Types.ObjectId()).toString(),
        createdAt: new Date(),
        save: jest.fn().mockImplementation(async function () {
          inMemoryLedgers.push(doc);
          return doc;
        }),
      };
      return doc;
    });

    mockWalletLedgerModel.findOne = jest.fn().mockImplementation((query) => ({
      exec: jest.fn().mockImplementation(async () => {
        if (query.idempotencyKey) {
          return inMemoryLedgers.find((l) => l.idempotencyKey === query.idempotencyKey) || null;
        }
        return null;
      }),
    }));

    mockWalletLedgerModel.find = jest.fn().mockImplementation((query) => ({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(async () => {
        return inMemoryLedgers.filter((l) => {
          if (query.userId && l.userId.toString() !== query.userId.toString()) return false;
          if (query.type && l.type !== query.type) return false;
          return true;
        });
      }),
    }));

    mockWalletLedgerModel.countDocuments = jest.fn().mockImplementation((query) => ({
      exec: jest.fn().mockImplementation(async () => {
        return inMemoryLedgers.filter((l) => {
          if (query.userId && l.userId.toString() !== query.userId.toString()) return false;
          if (query.type && l.type !== query.type) return false;
          return true;
        }).length;
      }),
    }));

    mockSettingsService = {
      get: jest.fn().mockImplementation((key, defaultVal) => {
        if (key === 'wallet.minTopup') return 20000;
        if (key === 'wallet.maxBalance') return 50000000;
        if (key === 'wallet.allowedCategories') {
          return ['COURT', 'GAME_TIME', 'GAME_ROOM', 'CANTEEN', 'RENTAL'];
        }
        return defaultVal;
      }),
    };

    mockTransactionService = {
      runTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
    };

    mockOutboxService = {
      recordEvent: jest.fn().mockResolvedValue({}),
    };

    mockAuditLogService = {
      record: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: getModelToken(Wallet.name), useValue: mockWalletModel },
        { provide: getModelToken(WalletLedger.name), useValue: mockWalletLedgerModel },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: DatabaseTransactionService, useValue: mockTransactionService },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  const userId = new Types.ObjectId().toString();

  describe('getOrCreateWallet', () => {
    it('khởi tạo ví mới với balance = 0, held = 0 nếu chưa tồn tại', async () => {
      const wallet = await service.getOrCreateWallet(userId);
      expect(wallet).toBeDefined();
      expect(wallet.balance).toBe(0);
      expect(wallet.held).toBe(0);
      expect(inMemoryWallets.length).toBe(1);
    });

    it('trả về ví hiện có nếu đã tồn tại', async () => {
      await service.getOrCreateWallet(userId);
      const sameWallet = await service.getOrCreateWallet(userId);
      expect(inMemoryWallets.length).toBe(1);
      expect(sameWallet.userId.toString()).toBe(userId);
    });
  });

  describe('topup', () => {
    it('từ chối số tiền nhỏ hơn minTopup (20,000 VND)', async () => {
      await expect(
        service.topup(userId, {
          amount: 15000,
          idempotencyKey: 'topup_test_01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối nếu vượt quá maxBalance (50,000,000 VND)', async () => {
      await expect(
        service.topup(userId, {
          amount: 51000000,
          idempotencyKey: 'topup_test_02',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('nạp tiền thành công và tạo bút toán DEPOSIT', async () => {
      const ledger = await service.topup(userId, {
        amount: 200000,
        idempotencyKey: 'topup_test_03',
      });

      expect(ledger.type).toBe(WalletTxnType.DEPOSIT);
      expect(ledger.amount).toBe(200000);
      expect(ledger.balanceAfter).toBe(200000);

      const wallet = await service.getWallet(userId);
      expect(wallet.balance).toBe(200000);
      expect(mockOutboxService.recordEvent).toHaveBeenCalled();
      expect(mockAuditLogService.record).toHaveBeenCalled();
    });

    it('idempotency: gọi lại cùng idempotencyKey không làm tăng số dư lần 2', async () => {
      await service.topup(userId, {
        amount: 100000,
        idempotencyKey: 'topup_replay_01',
      });
      const walletBefore = await service.getWallet(userId);
      expect(walletBefore.balance).toBe(100000);

      // Replay
      const replayLedger = await service.topup(userId, {
        amount: 100000,
        idempotencyKey: 'topup_replay_01',
      });
      expect(replayLedger.idempotencyKey).toBe('topup_replay_01');

      const walletAfter = await service.getWallet(userId);
      expect(walletAfter.balance).toBe(100000); // Vẫn là 100k
    });
  });

  describe('pay', () => {
    beforeEach(async () => {
      await service.topup(userId, {
        amount: 500000,
        idempotencyKey: 'setup_balance_01',
      });
    });

    it('từ chối thanh toán nếu danh mục không hợp lệ', async () => {
      await expect(
        service.pay(userId, {
          amount: 100000,
          category: 'ILLEGAL_CAT' as any,
          refType: 'TEST',
          refId: 'ref_01',
          idempotencyKey: 'pay_fail_01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối thanh toán nếu số dư không đủ', async () => {
      await expect(
        service.pay(userId, {
          amount: 600000, // Số dư chỉ có 500k
          category: WalletCategory.COURT,
          refType: 'BOOKING',
          refId: 'book_01',
          idempotencyKey: 'pay_fail_02',
        }),
      ).rejects.toThrow('Số dư ví không đủ');
    });

    it('thanh toán thành công và trừ số dư chính xác', async () => {
      const ledger = await service.pay(userId, {
        amount: 150000,
        category: WalletCategory.COURT,
        refType: 'BOOKING',
        refId: 'book_02',
        idempotencyKey: 'pay_success_01',
      });

      expect(ledger.type).toBe(WalletTxnType.PAYMENT);
      expect(ledger.amount).toBe(-150000);
      expect(ledger.balanceAfter).toBe(350000);

      const wallet = await service.getWallet(userId);
      expect(wallet.balance).toBe(350000);
    });
  });

  describe('hold, release, settle (Gaming sessions)', () => {
    beforeEach(async () => {
      await service.topup(userId, {
        amount: 300000,
        idempotencyKey: 'setup_gaming_01',
      });
    });

    it('hold thành công: chuyển từ balance sang held', async () => {
      const holdLedger = await service.hold(userId, {
        amount: 100000,
        refId: 'game_session_01',
        idempotencyKey: 'hold_01',
      });

      expect(holdLedger.type).toBe(WalletTxnType.HOLD);
      expect(holdLedger.amount).toBe(-100000);
      expect(holdLedger.heldDelta).toBe(100000);
      expect(holdLedger.balanceAfter).toBe(200000);
      expect(holdLedger.heldAfter).toBe(100000);

      const wallet = await service.getWallet(userId);
      expect(wallet.balance).toBe(200000);
      expect(wallet.held).toBe(100000);
    });

    it('release thành công: hoàn trả số tiền tạm giữ về balance', async () => {
      await service.hold(userId, {
        amount: 100000,
        refId: 'game_session_02',
        idempotencyKey: 'hold_02',
      });

      const releaseLedger = await service.release(userId, {
        amount: 100000,
        refId: 'game_session_02',
        idempotencyKey: 'release_01',
      });

      expect(releaseLedger.type).toBe(WalletTxnType.RELEASE);
      expect(releaseLedger.amount).toBe(100000);
      expect(releaseLedger.heldDelta).toBe(-100000);

      const wallet = await service.getWallet(userId);
      expect(wallet.balance).toBe(300000);
      expect(wallet.held).toBe(0);
    });

    it('settle thành công: trừ tiền tiêu dùng thực tế và hoàn trả số tiền tạm giữ còn lại', async () => {
      // Tạm giữ 100k, thực tế chơi hết 60k, thừa 40k hoàn lại ví
      await service.hold(userId, {
        amount: 100000,
        refId: 'game_session_03',
        idempotencyKey: 'hold_03',
      });

      const settleLedger = await service.settle(userId, {
        amount: 60000,
        heldToRelease: 100000,
        category: WalletCategory.GAME_TIME,
        refId: 'game_session_03',
        idempotencyKey: 'settle_01',
      });

      expect(settleLedger.type).toBe(WalletTxnType.SETTLE);
      expect(settleLedger.amount).toBe(40000); // 100k - 60k = 40k hoàn lại balance
      expect(settleLedger.heldDelta).toBe(-100000); // giải tỏa 100k khỏi held

      const wallet = await service.getWallet(userId);
      expect(wallet.balance).toBe(240000); // 200k + 40k = 240k
      expect(wallet.held).toBe(0);
    });
  });

  describe('refund & adjust & reconcile', () => {
    it('refund: hoàn tiền vào ví thành công', async () => {
      await service.getOrCreateWallet(userId);

      const refundLedger = await service.refund(
        userId,
        120000,
        'CANCEL_BOOKING',
        'book_cancel_01',
        'refund_01',
        'Hủy sân trước 24h',
      );

      expect(refundLedger.type).toBe(WalletTxnType.REFUND);
      expect(refundLedger.amount).toBe(120000);
      expect(refundLedger.balanceAfter).toBe(120000);

      const wallet = await service.getWallet(userId);
      expect(wallet.balance).toBe(120000);
    });

    it('adjust: điều chỉnh tăng số dư thành công', async () => {
      await service.getOrCreateWallet(userId);

      const adjustLedger = await service.adjust(
        userId,
        {
          amount: 50000,
          reason: 'Bù tiền khuyến mãi giải đấu',
          idempotencyKey: 'adj_01',
        },
        'admin_01',
      );

      expect(adjustLedger.type).toBe(WalletTxnType.ADJUSTMENT);
      expect(adjustLedger.amount).toBe(50000);

      const wallet = await service.getWallet(userId);
      expect(wallet.balance).toBe(50000);
    });

    it('reconcile: kiểm tra đối soát khớp tuyệt đối balance + held = Σ ledger', async () => {
      // 1. Nạp 500k
      await service.topup(userId, { amount: 500000, idempotencyKey: 'rec_topup_1' });
      // 2. Thanh toán sân 200k
      await service.pay(userId, {
        amount: 200000,
        category: WalletCategory.COURT,
        refType: 'BOOKING',
        refId: 'rec_book_1',
        idempotencyKey: 'rec_pay_1',
      });
      // 3. Tạm giữ gaming 100k
      await service.hold(userId, { amount: 100000, refId: 'rec_game_1', idempotencyKey: 'rec_hold_1' });
      // 4. Quyết toán gaming 70k (hoàn 30k)
      await service.settle(userId, {
        amount: 70000,
        heldToRelease: 100000,
        refId: 'rec_game_1',
        idempotencyKey: 'rec_settle_1',
      });

      const result = await service.reconcile(userId);
      expect(result.isBalanced).toBe(true);
      expect(result.walletBalance).toBe(230000); // 500k - 200k - 100k + 30k = 230k
      expect(result.walletHeld).toBe(0);
      expect(result.walletTotal).toBe(230000);
      expect(result.ledgerSum).toBe(230000);
      expect(result.transactionCount).toBe(4);
    });
  });
});
