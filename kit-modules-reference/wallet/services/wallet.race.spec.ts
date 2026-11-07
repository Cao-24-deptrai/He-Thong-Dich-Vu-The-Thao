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
import { WalletCategory } from '@sports/contracts';

describe('WalletService - Concurrency & Idempotency Races', () => {
  let service: WalletService;

  // Mô phỏng lưu trữ in-memory mô phỏng hành vi nguyên tử của MongoDB findOneAndUpdate
  const inMemoryWallets: any[] = [];
  const inMemoryLedgers: any[] = [];
  const processedIdempotencyKeys = new Set<string>();

  beforeEach(async () => {
    inMemoryWallets.length = 0;
    inMemoryLedgers.length = 0;
    processedIdempotencyKeys.clear();

    const mockWalletModel: any = jest.fn().mockImplementation((data) => {
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
          if (index >= 0) {
            inMemoryWallets[index].balance = doc.balance;
            inMemoryWallets[index].held = doc.held;
            inMemoryWallets[index].version = doc.version;
            return inMemoryWallets[index];
          } else {
            inMemoryWallets.push(doc);
            return doc;
          }
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

    // findOneAndUpdate nguyên tử có hỗ trợ session delta tracking
    mockWalletModel.findOneAndUpdate = jest.fn().mockImplementation(async (filter, update, options) => {
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

      if (!target) return null;

      const incBalance = update.$inc?.balance || 0;
      const incHeld = update.$inc?.held || 0;

      target.balance += incBalance;
      target.held += incHeld;
      if (update.$inc?.version) target.version += update.$inc.version;
      target.updatedAt = new Date();

      if (options?.session?.deltas) {
        const key = target._id.toString();
        const prev = options.session.deltas.get(key) || { balance: 0, held: 0 };
        options.session.deltas.set(key, {
          balance: prev.balance + incBalance,
          held: prev.held + incHeld,
        });
      }

      return target;
    });

    const mockWalletLedgerModel: any = jest.fn().mockImplementation((data) => {
      const doc = {
        ...data,
        _id: data._id || new Types.ObjectId(),
        id: (data._id || new Types.ObjectId()).toString(),
        createdAt: new Date(),
        save: jest.fn().mockImplementation(async function () {
          // Mô phỏng MongoDB unique index trên idempotencyKey
          if (processedIdempotencyKeys.has(doc.idempotencyKey)) {
            const err: any = new Error('E11000 duplicate key error');
            err.code = 11000;
            throw err;
          }
          processedIdempotencyKeys.add(doc.idempotencyKey);
          inMemoryLedgers.push(doc);
          return doc;
        }),
      };
      return doc;
    });

    mockWalletLedgerModel.findOne = jest.fn().mockImplementation((query) => ({
      session: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(async () => {
        if (query.idempotencyKey) {
          return inMemoryLedgers.find((l) => l.idempotencyKey === query.idempotencyKey) || null;
        }
        return null;
      }),
    }));

    mockWalletLedgerModel.find = jest.fn().mockImplementation((query) => ({
      exec: jest.fn().mockImplementation(async () => {
        return inMemoryLedgers.filter((l) => {
          if (query.userId && l.userId.toString() !== query.userId.toString()) return false;
          return true;
        });
      }),
    }));

    const mockSettingsService = {
      get: jest.fn().mockImplementation((key, defaultVal) => {
        if (key === 'wallet.minTopup') return 20000;
        if (key === 'wallet.maxBalance') return 50000000;
        if (key === 'wallet.allowedCategories') {
          return ['COURT', 'GAME_TIME', 'GAME_ROOM', 'CANTEEN', 'RENTAL'];
        }
        return defaultVal;
      }),
    };

    let sessionCounter = 0;
    const mockTransactionService = {
      runTransaction: jest.fn().mockImplementation(async (cb) => {
        const session = { id: ++sessionCounter, deltas: new Map<string, { balance: number; held: number }>() };
        try {
          return await cb(session as any);
        } catch (err) {
          for (const [walletId, delta] of session.deltas.entries()) {
            const w = inMemoryWallets.find((x) => x._id.toString() === walletId);
            if (w) {
              w.balance -= delta.balance;
              w.held -= delta.held;
            }
          }
          throw err;
        }
      }),
    };

    const mockOutboxService = {
      recordEvent: jest.fn().mockResolvedValue({}),
    };

    const mockAuditLogService = {
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

  it('20 concurrent payment requests of 100k on 1M balance -> exactly 10 succeed, 10 fail, balance is 0', async () => {
    // 1. Nạp ban đầu 1,000,000 VND
    await service.topup(userId, {
      amount: 1000000,
      idempotencyKey: 'initial_deposit_1m',
    });

    const initialWallet = await service.getWallet(userId);
    expect(initialWallet.balance).toBe(1000000);

    // 2. Gửi đồng thời 20 requests thanh toán 100,000 VND với các idempotencyKey khác nhau
    const requests = Array.from({ length: 20 }, (_, i) =>
      service
        .pay(userId, {
          amount: 100000,
          category: WalletCategory.COURT,
          refType: 'BOOKING',
          refId: `race_book_${i}`,
          idempotencyKey: `race_pay_idem_${i}`,
        })
        .then((res) => ({ success: true, res }))
        .catch((err) => ({ success: false, err })),
    );

    const results = await Promise.all(requests);

    const succeeded = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    // Đúng 10 giao dịch thành công (10 x 100k = 1M)
    expect(succeeded.length).toBe(10);
    // Đúng 10 giao dịch thất bại do hết số dư
    expect(failed.length).toBe(10);

    for (const f of failed) {
      expect((f as any).err).toBeInstanceOf(BadRequestException);
      expect((f as any).err.message).toContain('Số dư ví không đủ');
    }

    // 3. Số dư cuối cùng phải là 0, không bao giờ bị âm
    const finalWallet = await service.getWallet(userId);
    expect(finalWallet.balance).toBe(0);
    expect(finalWallet.balance).toBeGreaterThanOrEqual(0);

    // 4. Đối soát phải khớp tuyệt đối
    const reconcile = await service.reconcile(userId);
    expect(reconcile.isBalanced).toBe(true);
    expect(reconcile.walletTotal).toBe(0);
    expect(reconcile.ledgerSum).toBe(0);
  });

  it('20 concurrent requests with the SAME idempotencyKey -> exactly 1 topup executed', async () => {
    // Khởi tạo ví trước khi chạy race condition
    await service.getOrCreateWallet(userId);

    // Gửi đồng thời 20 requests topup cùng idempotencyKey
    const sameKey = 'same_idempotency_key_race';
    const requests = Array.from({ length: 20 }, () =>
      service
        .topup(userId, {
          amount: 50000,
          idempotencyKey: sameKey,
        })
        .then((res) => ({ success: true, res }))
        .catch((err) => ({ success: false, err })),
    );

    const results = await Promise.all(requests);
    const succeeded = results.filter((r) => r.success);

    // Tất cả đều trả về thành công cho caller (idempotent replay)
    expect(succeeded.length).toBe(20);

    // Nhưng số dư chỉ tăng duy nhất 1 lần (50,000 VND)
    const wallet = await service.getWallet(userId);
    expect(wallet.balance).toBe(50000);

    // Số bản ghi ledger chỉ có duy nhất 1 bản ghi
    expect(inMemoryLedgers.length).toBe(1);
    expect(inMemoryLedgers[0].idempotencyKey).toBe(sameKey);
  });
});
