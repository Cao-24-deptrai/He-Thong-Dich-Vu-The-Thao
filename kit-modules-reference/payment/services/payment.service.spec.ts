import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PaymentService } from './payment.service.js';
import { Payment } from '../schemas/payment.schema.js';
import { VietQrService } from './vietqr.service.js';
import { WalletService } from '../../wallet/services/wallet.service.js';
import { BookingService } from '../../booking/services/booking.service.js';
import { SettingsService } from '../../facility/services/settings.service.js';
import { DatabaseTransactionService } from '../../../database/database-transaction.service.js';
import { OutboxService } from '../../outbox/services/outbox.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  PaymentMethod,
  PaymentStatus,
  PaymentOrderType,
  PaymentProvider,
} from '@sports/contracts';

describe('PaymentService', () => {
  let service: PaymentService;
  let mockPaymentModel: any;
  let mockVietQrService: any;
  let mockWalletService: any;
  let mockBookingService: any;
  let mockSettingsService: any;
  let mockTransactionService: any;
  let mockOutboxService: any;
  let mockAuditLogService: any;

  const inMemoryPayments: any[] = [];

  beforeEach(async () => {
    inMemoryPayments.length = 0;

    mockPaymentModel = jest.fn().mockImplementation((data) => {
      const doc = {
        ...data,
        _id: data._id || new Types.ObjectId(),
        id: (data._id || new Types.ObjectId()).toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        save: jest.fn().mockImplementation(async function () {
          const index = inMemoryPayments.findIndex((p) => p.id === doc.id);
          if (index >= 0) inMemoryPayments[index] = doc;
          else inMemoryPayments.push(doc);
          return doc;
        }),
      };
      return doc;
    });

    mockPaymentModel.findById = jest.fn().mockImplementation((id) => ({
      exec: jest.fn().mockImplementation(async () => {
        return inMemoryPayments.find((p) => p.id === id.toString()) || null;
      }),
    }));

    mockPaymentModel.findOne = jest.fn().mockImplementation((query) => ({
      session: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(async () => {
        if (query.idempotencyKey) {
          return inMemoryPayments.find((p) => p.idempotencyKey === query.idempotencyKey) || null;
        }
        if (query.paymentCode) {
          return inMemoryPayments.find((p) => p.paymentCode === query.paymentCode) || null;
        }
        return null;
      }),
    }));

    mockPaymentModel.find = jest.fn().mockImplementation((query) => ({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(async () => {
        return inMemoryPayments.filter((p) => {
          if (query.status && p.status !== query.status) return false;
          if (query.provider && p.provider !== query.provider) return false;
          return true;
        });
      }),
    }));

    mockPaymentModel.countDocuments = jest.fn().mockImplementation((query) => ({
      exec: jest.fn().mockImplementation(async () => {
        return inMemoryPayments.filter((p) => {
          if (query.status && p.status !== query.status) return false;
          return true;
        }).length;
      }),
    }));

    mockVietQrService = {
      generateVietQr: jest.fn().mockReturnValue({
        qrCodeText: 'vietqr://mock?amount=200000',
        qrDataUrl: 'https://img.vietqr.io/mock.png',
      }),
    };

    mockWalletService = {
      pay: jest.fn().mockResolvedValue({}),
      refund: jest.fn().mockResolvedValue({}),
    };

    mockBookingService = {
      confirmBooking: jest.fn().mockResolvedValue({}),
    };

    mockSettingsService = {
      get: jest.fn().mockImplementation((key, defaultVal) => {
        if (key === 'booking.holdMinutes') return 10;
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
        PaymentService,
        { provide: getModelToken(Payment.name), useValue: mockPaymentModel },
        { provide: VietQrService, useValue: mockVietQrService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: BookingService, useValue: mockBookingService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: DatabaseTransactionService, useValue: mockTransactionService },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  const userId = new Types.ObjectId().toString();
  const orderId = new Types.ObjectId().toString();

  describe('createPayment', () => {
    it('khởi tạo giao dịch VietQR sinh mã QR chuẩn và thời hạn 10 phút', async () => {
      const payment = await service.createPayment(userId, {
        orderId,
        orderType: PaymentOrderType.BOOKING,
        amount: 250000,
        method: PaymentMethod.VIETQR,
        idempotencyKey: 'idem_create_01',
      });

      expect(payment).toBeDefined();
      expect(payment.paymentCode).toMatch(/^PAY-\d{8}-[A-F0-9]{6}$/);
      expect(payment.amount).toBe(250000);
      expect(payment.status).toBe(PaymentStatus.CREATED);
      expect(payment.provider).toBe(PaymentProvider.VIETQR);
      expect(payment.qrCodeText).toBeDefined();
      expect(payment.qrDataUrl).toBeDefined();
      expect(mockVietQrService.generateVietQr).toHaveBeenCalled();
      expect(mockOutboxService.recordEvent).toHaveBeenCalled();
    });

    it('idempotency: trả về giao dịch cũ nếu trùng idempotencyKey', async () => {
      const p1 = await service.createPayment(userId, {
        orderId,
        orderType: PaymentOrderType.BOOKING,
        amount: 100000,
        method: PaymentMethod.CASH,
        idempotencyKey: 'idem_replay_01',
      });

      const p2 = await service.createPayment(userId, {
        orderId,
        orderType: PaymentOrderType.BOOKING,
        amount: 100000,
        method: PaymentMethod.CASH,
        idempotencyKey: 'idem_replay_01',
      });

      expect(p2.paymentCode).toBe(p1.paymentCode);
      expect(inMemoryPayments.length).toBe(1);
    });
  });

  describe('processCashPayment', () => {
    it('thu tiền mặt tại quầy và tính tiền thừa chính xác', async () => {
      const payment = await service.createPayment(userId, {
        orderId,
        orderType: PaymentOrderType.CANTEEN_ORDER,
        amount: 85000,
        method: PaymentMethod.CASH,
        idempotencyKey: 'idem_cash_01',
      });

      const paidPayment = await service.processCashPayment('cashier_01', {
        paymentId: payment.id,
        receivedAmount: 100000, // Khách đưa 100k
        idempotencyKey: 'cash_paid_01',
      });

      expect(paidPayment.status).toBe(PaymentStatus.SUCCESS);
      expect(paidPayment.paidAmount).toBe(85000);
      expect(paidPayment.changeAmount).toBe(15000); // Tiền thừa trả lại 15k
      expect(mockAuditLogService.record).toHaveBeenCalled();
    });

    it('từ chối nếu tiền khách đưa ít hơn số tiền cần thanh toán', async () => {
      const payment = await service.createPayment(userId, {
        orderId,
        orderType: PaymentOrderType.CANTEEN_ORDER,
        amount: 100000,
        method: PaymentMethod.CASH,
        idempotencyKey: 'idem_cash_02',
      });

      await expect(
        service.processCashPayment('cashier_01', {
          paymentId: payment.id,
          receivedAmount: 90000, // Thiếu 10k
          idempotencyKey: 'cash_paid_02',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('processWalletPayment', () => {
    it('thanh toán qua ví nội bộ thành công và kích hoạt xác nhận booking', async () => {
      const payment = await service.createPayment(userId, {
        orderId,
        orderType: PaymentOrderType.BOOKING,
        amount: 150000,
        method: PaymentMethod.INTERNAL_WALLET,
        idempotencyKey: 'idem_wallet_01',
      });

      const paid = await service.processWalletPayment(userId, payment.id, 'pay_wallet_01');

      expect(paid.status).toBe(PaymentStatus.SUCCESS);
      expect(mockWalletService.pay).toHaveBeenCalled();
      expect(mockBookingService.confirmBooking).toHaveBeenCalledWith(
        orderId,
        expect.objectContaining({ paidAmount: 150000 }),
        userId,
      );
    });

    it('từ chối nếu người dùng không sở hữu giao dịch thanh toán', async () => {
      const payment = await service.createPayment(userId, {
        orderId,
        orderType: PaymentOrderType.BOOKING,
        amount: 150000,
        method: PaymentMethod.INTERNAL_WALLET,
        idempotencyKey: 'idem_wallet_02',
      });

      await expect(
        service.processWalletPayment('another_user', payment.id, 'pay_wallet_02'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('processSplitPayment', () => {
    it('từ chối nếu tổng các khoản thanh toán không bằng tổng đơn', async () => {
      await expect(
        service.processSplitPayment('cashier_01', {
          orderId,
          orderType: PaymentOrderType.CANTEEN_ORDER,
          totalAmount: 200000,
          splits: [
            { method: PaymentMethod.CASH, amount: 100000, idempotencyKey: 'split_1' },
            { method: PaymentMethod.CASH, amount: 80000, idempotencyKey: 'split_2' }, // Tổng = 180k != 200k
          ],
        }),
      ).rejects.toThrow('không khớp với tổng đơn');
    });

    it('thanh toán hỗn hợp thành công khi tổng khớp 100%', async () => {
      const results = await service.processSplitPayment('cashier_01', {
        orderId,
        orderType: PaymentOrderType.CANTEEN_ORDER,
        totalAmount: 200000,
        splits: [
          {
            method: PaymentMethod.CASH,
            amount: 120000,
            receivedAmount: 150000,
            idempotencyKey: 'split_ok_1',
          },
          {
            method: PaymentMethod.INTERNAL_WALLET,
            amount: 80000,
            idempotencyKey: 'split_ok_2',
          },
        ],
      });

      expect(results.length).toBe(2);
      expect(results[0]?.status).toBe(PaymentStatus.SUCCESS);
      expect(results[0]?.changeAmount).toBe(30000); // 150k - 120k = 30k tiền thừa
    });
  });

  describe('handlePaymentSuccess (Invariants: Exact Match & Late Payment)', () => {
    it('Bất biến 1: Lệch số tiền (chuyển thừa hoặc thiếu 1đ) -> Chuyển MISMATCH và không xác nhận booking', async () => {
      const payment = await service.createPayment(userId, {
        orderId,
        orderType: PaymentOrderType.BOOKING,
        amount: 200000,
        method: PaymentMethod.VIETQR,
        idempotencyKey: 'idem_mismatch_01',
      });

      // Cổng báo nhận được 199.999 đ (thiếu 1 đ)
      const res = await service.handlePaymentSuccess(payment.paymentCode, 199999, 'VQR_TXN_01');

      expect(res.status).toBe(PaymentStatus.MISMATCH);
      expect(res.paidAmount).toBe(199999);
      expect(res.mismatchReason).toContain('không khớp');
      expect(mockBookingService.confirmBooking).not.toHaveBeenCalled();
      expect(mockOutboxService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'payment.mismatch' }),
        expect.anything(),
      );
    });

    it('Bất biến 2: Thanh toán muộn (quá hạn giữ chỗ) -> Chuyển MISMATCH và tự động hoàn tiền vào ví khách', async () => {
      const payment = await service.createPayment(userId, {
        orderId,
        orderType: PaymentOrderType.BOOKING,
        amount: 200000,
        method: PaymentMethod.VIETQR,
        idempotencyKey: 'idem_late_01',
      });

      // Giả lập giao dịch đã quá hạn 10 phút trước
      payment.expiresAt = new Date(Date.now() - 60 * 1000); // Hết hạn từ 1 phút trước

      const res = await service.handlePaymentSuccess(payment.paymentCode, 200000, 'VQR_TXN_LATE');

      expect(res.status).toBe(PaymentStatus.MISMATCH);
      expect(res.mismatchReason).toContain('Thanh toán muộn');
      // Tự động hoàn tiền vào ví khách
      expect(mockWalletService.refund).toHaveBeenCalledWith(
        userId,
        200000,
        'LATE_PAYMENT',
        payment.paymentCode,
        expect.stringContaining('REFUND_LATE_'),
        expect.any(String),
        'SYSTEM',
      );
      expect(mockBookingService.confirmBooking).not.toHaveBeenCalled();
    });

    it('Khớp số tiền và còn trong hạn giữ chỗ -> Xác nhận SUCCESS và confirmBooking', async () => {
      const payment = await service.createPayment(userId, {
        orderId,
        orderType: PaymentOrderType.BOOKING,
        amount: 200000,
        method: PaymentMethod.VIETQR,
        idempotencyKey: 'idem_ok_01',
      });

      const res = await service.handlePaymentSuccess(payment.paymentCode, 200000, 'VQR_TXN_OK');

      expect(res.status).toBe(PaymentStatus.SUCCESS);
      expect(res.paidAmount).toBe(200000);
      expect(mockBookingService.confirmBooking).toHaveBeenCalledWith(
        orderId,
        expect.objectContaining({ paidAmount: 200000 }),
        userId,
      );
      expect(mockOutboxService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'payment.succeeded' }),
        expect.anything(),
      );
    });
  });

  describe('refundPayment & reconcileDaily', () => {
    it('refundPayment: hoàn tiền thành công vào ví nội bộ', async () => {
      const payment = await service.createPayment(userId, {
        orderId,
        orderType: PaymentOrderType.BOOKING,
        amount: 100000,
        method: PaymentMethod.VIETQR,
        idempotencyKey: 'idem_ref_01',
      });
      await service.handlePaymentSuccess(payment.paymentCode, 100000, 'TXN_REF');

      const refunded = await service.refundPayment(payment.id, 100000, 'Hủy lịch trước 24h', 'admin_01');

      expect(refunded.status).toBe(PaymentStatus.REFUNDED);
      expect(mockWalletService.refund).toHaveBeenCalledWith(
        userId,
        100000,
        'PAYMENT_REFUND',
        payment.paymentCode,
        expect.stringContaining('REFUND_'),
        'Hủy lịch trước 24h',
        'admin_01',
      );
    });

    it('reconcileDaily: báo cáo đối soát tổng hợp trong ngày', async () => {
      // 1 giao dịch thành công 300k
      const p1 = await service.createPayment(userId, {
        orderId,
        orderType: PaymentOrderType.BOOKING,
        amount: 300000,
        method: PaymentMethod.VIETQR,
        idempotencyKey: 'idem_rec_01',
      });
      await service.handlePaymentSuccess(p1.paymentCode, 300000, 'TXN_REC_1');

      // 1 giao dịch lệch tiền
      const p2 = await service.createPayment(userId, {
        orderId,
        orderType: PaymentOrderType.BOOKING,
        amount: 200000,
        method: PaymentMethod.VIETQR,
        idempotencyKey: 'idem_rec_02',
      });
      await service.handlePaymentSuccess(p2.paymentCode, 150000, 'TXN_REC_2');

      const summary = await service.reconcileDaily(new Date().toISOString().slice(0, 10));

      expect(summary.systemTotal).toBe(300000);
      expect(summary.systemCount).toBe(1);
      expect(summary.mismatchCount).toBe(1);
      expect(summary.isBalanced).toBe(false);
    });
  });
});
