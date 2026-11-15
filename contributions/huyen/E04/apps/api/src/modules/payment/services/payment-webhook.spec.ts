import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { PaymentWebhookService } from './payment-webhook.service.js';
import { PaymentService } from './payment.service.js';
import { PaymentEvent } from '../schemas/payment-event.schema.js';
import { SettingsService } from '../../facility/services/settings.service.js';
import { PaymentProvider } from '@sports/contracts';

describe('PaymentWebhookService', () => {
  let service: PaymentWebhookService;
  let mockPaymentEventModel: any;
  let mockPaymentService: any;
  let mockSettingsService: any;

  const inMemoryEvents: any[] = [];
  const secretKey = 'test_webhook_secret_key_32_chars!';

  beforeEach(async () => {
    inMemoryEvents.length = 0;

    mockPaymentEventModel = jest.fn().mockImplementation((data) => {
      const doc = {
        ...data,
        save: jest.fn().mockImplementation(async function () {
          // Unique index check trên (provider, providerTxnId) cho document khác
          const duplicate = inMemoryEvents.find(
            (e) => e.provider === doc.provider && e.providerTxnId === doc.providerTxnId && e !== doc,
          );
          if (duplicate) {
            const err: any = new Error('E11000 duplicate key error');
            err.code = 11000;
            throw err;
          }
          const index = inMemoryEvents.indexOf(doc);
          if (index >= 0) inMemoryEvents[index] = doc;
          else inMemoryEvents.push(doc);
          return doc;
        }),
      };
      return doc;
    });

    mockPaymentEventModel.findOne = jest.fn().mockImplementation((query) => ({
      exec: jest.fn().mockImplementation(async () => {
        return (
          inMemoryEvents.find(
            (e) => e.provider === query.provider && e.providerTxnId === query.providerTxnId,
          ) || null
        );
      }),
    }));

    mockPaymentService = {
      handlePaymentSuccess: jest.fn().mockResolvedValue({}),
    };

    mockSettingsService = {
      get: jest.fn().mockReturnValue(secretKey),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentWebhookService,
        { provide: getModelToken(PaymentEvent.name), useValue: mockPaymentEventModel },
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    }).compile();

    service = module.get<PaymentWebhookService>(PaymentWebhookService);
  });

  describe('verifySignature', () => {
    it('xác thực thành công với chữ ký HMAC-SHA256 hợp lệ', () => {
      const payload = { test: 123, msg: 'hello' };
      const signature = service.generateSignature(payload, secretKey);

      const isValid = service.verifySignature(payload, signature, secretKey);
      expect(isValid).toBe(true);
    });

    it('từ chối khi chữ ký bị làm giả hoặc sai secret key', () => {
      const payload = { test: 123, msg: 'hello' };
      const signature = service.generateSignature(payload, secretKey);

      const isTampered = service.verifySignature(payload, 'wrong_hex_signature', secretKey);
      expect(isTampered).toBe(false);

      const isWrongSecret = service.verifySignature(payload, signature, 'wrong_secret_32_characters_here!');
      expect(isWrongSecret).toBe(false);
    });
  });

  describe('processWebhook & Deduplication', () => {
    it('từ chối webhook khi chữ ký không hợp lệ', async () => {
      await expect(
        service.processWebhook({
          provider: PaymentProvider.VIETQR,
          providerTxnId: 'VQR_TXN_01',
          paymentCode: 'PAY-20261026-ABC123',
          amount: 200000,
          signature: 'invalid_signature_hex',
          timestamp: '2026-10-26T10:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('xử lý webhook thành công và chuyển sang handlePaymentSuccess', async () => {
      const payload = {
        provider: PaymentProvider.VIETQR,
        providerTxnId: 'VQR_TXN_02',
        paymentCode: 'PAY-20261026-ABC123',
        amount: 200000,
        timestamp: '2026-10-26T10:00:00Z',
      };
      const signature = service.generateSignature(payload, secretKey);

      const res = await service.processWebhook({
        ...payload,
        signature,
      });

      expect(res.success).toBe(true);
      expect(mockPaymentService.handlePaymentSuccess).toHaveBeenCalledWith(
        'PAY-20261026-ABC123',
        200000,
        'VQR_TXN_02',
        undefined,
      );
      expect(inMemoryEvents.length).toBe(1);
    });

    it('khử trùng lặp Idempotency: nhận lại cùng 1 webhook không gọi lại handlePaymentSuccess lần 2', async () => {
      const payload = {
        provider: PaymentProvider.VIETQR,
        providerTxnId: 'VQR_TXN_REPLAY',
        paymentCode: 'PAY-20261026-ABC123',
        amount: 200000,
        timestamp: '2026-10-26T10:00:00Z',
      };
      const signature = service.generateSignature(payload, secretKey);

      // Gọi lần 1
      await service.processWebhook({ ...payload, signature });
      expect(mockPaymentService.handlePaymentSuccess).toHaveBeenCalledTimes(1);

      // Gọi lặp lại lần 2
      const res2 = await service.processWebhook({ ...payload, signature });
      expect(res2.success).toBe(true);
      expect(res2.message).toContain('already processed');
      // Không được gọi lại lần 2
      expect(mockPaymentService.handlePaymentSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
