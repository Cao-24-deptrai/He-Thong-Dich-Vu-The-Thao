import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { InvoiceService } from './invoice.service.js';
import { Invoice } from '../schemas/invoice.schema.js';
import { Payment } from '../../payment/schemas/payment.schema.js';
import { User } from '../../auth/schemas/user.schema.js';
import { INVOICE_ADAPTER } from './invoice-adapter.interface.js';
import { SettingsService } from '../../facility/services/settings.service.js';
import { OutboxService } from '../../outbox/services/outbox.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  InvoiceStatus,
  BuyerType,
  PaymentStatus,
  PaymentOrderType,
} from '@sports/contracts';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let mockInvoiceModel: any;
  let mockPaymentModel: any;
  let mockUserModel: any;
  let mockInvoiceAdapter: any;
  let mockSettingsService: any;
  let mockOutboxService: any;
  let mockAuditLogService: any;

  const inMemoryInvoices: any[] = [];
  const inMemoryPayments: any[] = [];
  const inMemoryUsers: any[] = [];

  beforeEach(async () => {
    inMemoryInvoices.length = 0;
    inMemoryPayments.length = 0;
    inMemoryUsers.length = 0;

    mockInvoiceModel = jest.fn().mockImplementation((data) => {
      const doc = {
        ...data,
        _id: data._id || new Types.ObjectId(),
        id: (data._id || new Types.ObjectId()).toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        save: jest.fn().mockImplementation(async function () {
          const index = inMemoryInvoices.findIndex((i) => i.id === doc.id);
          if (index >= 0) inMemoryInvoices[index] = doc;
          else inMemoryInvoices.push(doc);
          return doc;
        }),
      };
      return doc;
    });

    mockInvoiceModel.findById = jest.fn().mockImplementation((id) => ({
      exec: jest.fn().mockImplementation(async () => {
        return inMemoryInvoices.find((i) => i.id === id.toString()) || null;
      }),
    }));

    mockInvoiceModel.findOne = jest.fn().mockImplementation((query) => ({
      exec: jest.fn().mockImplementation(async () => {
        if (query.idempotencyKey) {
          return inMemoryInvoices.find((i) => i.idempotencyKey === query.idempotencyKey) || null;
        }
        if (query.paymentId) {
          return inMemoryInvoices.find((i) => i.paymentId?.toString() === query.paymentId.toString()) || null;
        }
        return null;
      }),
    }));

    mockInvoiceModel.find = jest.fn().mockImplementation((query, projection) => {
      let result = [...inMemoryInvoices];
      if (query && query.status) {
        result = result.filter((i) => i.status === query.status);
      }
      return {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockImplementation(async () => {
          if (projection && projection.paymentId) {
            return result.map((i) => ({ paymentId: i.paymentId }));
          }
          return result;
        }),
      };
    });

    mockInvoiceModel.countDocuments = jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(inMemoryInvoices.length),
    }));

    mockPaymentModel = {
      findById: jest.fn().mockImplementation((id) => ({
        exec: jest.fn().mockImplementation(async () => {
          return inMemoryPayments.find((p) => p.id === id.toString()) || null;
        }),
      })),
      find: jest.fn().mockImplementation((query) => ({
        exec: jest.fn().mockImplementation(async () => {
          if (query?.status) {
            return inMemoryPayments.filter((p) => p.status === query.status);
          }
          return inMemoryPayments;
        }),
      })),
    };

    mockUserModel = {
      findById: jest.fn().mockImplementation((id) => ({
        exec: jest.fn().mockImplementation(async () => {
          return inMemoryUsers.find((u) => u.id === id.toString()) || null;
        }),
      })),
    };

    mockInvoiceAdapter = {
      issueInvoice: jest.fn().mockResolvedValue({
        invoiceNumber: '0001234',
        invoiceSeries: '1C24TND',
        lookupCode: 'LOOKUP-ABCXYZ',
        pdfUrl: 'https://einvoice.example.vn/view/0001234.pdf',
        xmlUrl: 'https://einvoice.example.vn/view/0001234.xml',
        issuedAt: new Date(),
      }),
      cancelInvoice: jest.fn().mockResolvedValue(true),
      getPdfUrl: jest.fn().mockImplementation((invNum, lookup) => {
        return `https://einvoice.example.vn/view/${invNum}-${lookup}.pdf`;
      }),
    };

    mockSettingsService = {
      get: jest.fn().mockImplementation((_key, defaultValue) => defaultValue),
    };

    mockOutboxService = {
      recordEvent: jest.fn().mockResolvedValue({}),
    };

    mockAuditLogService = {
      record: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: getModelToken(Invoice.name), useValue: mockInvoiceModel },
        { provide: getModelToken(Payment.name), useValue: mockPaymentModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: INVOICE_ADAPTER, useValue: mockInvoiceAdapter },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
  });

  describe('createInvoice', () => {
    it('should throw NotFoundException if payment is not found', async () => {
      await expect(
        service.createInvoice({
          paymentId: new Types.ObjectId().toString(),
          orderId: new Types.ObjectId().toString(),
          orderType: PaymentOrderType.BOOKING,
          items: [{ name: 'Thuê sân Pickleball', quantity: 1, unitPrice: 100000, amount: 100000, vatRate: 10, vatAmount: 10000 }],
          subtotal: 100000,
          vatAmount: 10000,
          totalAmount: 110000,
          idempotencyKey: 'idemp_test_1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should auto-populate BuyerType.INDIVIDUAL when user has no tax details', async () => {
      const userId = new Types.ObjectId();
      const user = {
        _id: userId,
        id: userId.toString(),
        fullName: 'Nguyễn Văn A',
        email: 'vana@example.com',
        phone: '0901234567',
      };
      inMemoryUsers.push(user);

      const paymentId = new Types.ObjectId();
      const orderId = new Types.ObjectId();
      const payment = {
        _id: paymentId,
        id: paymentId.toString(),
        userId,
        orderId,
        orderType: PaymentOrderType.BOOKING,
        status: PaymentStatus.SUCCESS,
        paidAmount: 110000,
      };
      inMemoryPayments.push(payment);

      const result = await service.createInvoice({
        paymentId: paymentId.toString(),
        orderId: orderId.toString(),
        orderType: PaymentOrderType.BOOKING,
        items: [{ name: 'Thuê sân Pickleball', quantity: 1, unitPrice: 100000, amount: 100000, vatRate: 10, vatAmount: 10000 }],
        subtotal: 100000,
        vatAmount: 10000,
        totalAmount: 110000,
        idempotencyKey: 'idemp_test_2',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(InvoiceStatus.ISSUED);
      expect(result.buyerInfo.buyerType).toBe(BuyerType.INDIVIDUAL);
      expect(result.buyerInfo.name).toBe('Nguyễn Văn A');
      expect(result.invoiceNumber).toBe('0001234');
      expect(mockOutboxService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'invoice.created' }),
      );
      expect(mockOutboxService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'invoice.issued' }),
      );
    });

    it('should auto-populate BuyerType.ENTERPRISE when user has company invoiceInfo', async () => {
      const userId = new Types.ObjectId();
      const user = {
        _id: userId,
        id: userId.toString(),
        fullName: 'Trần Kế Toán',
        email: 'ketoan@congty.vn',
        phone: '0912345678',
        invoiceInfo: {
          taxId: '0101234567',
          companyName: 'Công ty TNHH Thể Thao Việt',
          address: '123 Đường Láng, Hà Nội',
          email: 'hoadon@congty.vn',
        },
      };
      inMemoryUsers.push(user);

      const paymentId = new Types.ObjectId();
      const orderId = new Types.ObjectId();
      const payment = {
        _id: paymentId,
        id: paymentId.toString(),
        userId,
        orderId,
        orderType: PaymentOrderType.BOOKING,
        status: PaymentStatus.SUCCESS,
        paidAmount: 220000,
      };
      inMemoryPayments.push(payment);

      const result = await service.createInvoice({
        paymentId: paymentId.toString(),
        orderId: orderId.toString(),
        orderType: PaymentOrderType.BOOKING,
        items: [{ name: 'Thuê cụm sân', quantity: 2, unitPrice: 100000, amount: 200000, vatRate: 10, vatAmount: 20000 }],
        subtotal: 200000,
        vatAmount: 20000,
        totalAmount: 220000,
        idempotencyKey: 'idemp_test_3',
      });

      expect(result.buyerInfo.buyerType).toBe(BuyerType.ENTERPRISE);
      expect(result.buyerInfo.companyName).toBe('Công ty TNHH Thể Thao Việt');
      expect(result.buyerInfo.taxCode).toBe('0101234567');
      expect(result.buyerInfo.address).toBe('123 Đường Láng, Hà Nội');
    });

    it('should return existing invoice when replaying the same idempotencyKey', async () => {
      const paymentId = new Types.ObjectId();
      const orderId = new Types.ObjectId();
      const existing = {
        id: new Types.ObjectId().toString(),
        idempotencyKey: 'dup_key',
        paymentId,
        status: InvoiceStatus.ISSUED,
      };
      inMemoryInvoices.push(existing);

      const result = await service.createInvoice({
        paymentId: paymentId.toString(),
        orderId: orderId.toString(),
        orderType: PaymentOrderType.BOOKING,
        items: [{ name: 'Item 1', quantity: 1, unitPrice: 100000, amount: 100000, vatRate: 0, vatAmount: 0 }],
        subtotal: 100000,
        vatAmount: 0,
        totalAmount: 100000,
        idempotencyKey: 'dup_key',
      });

      expect(result).toBe(existing);
      expect(mockInvoiceAdapter.issueInvoice).not.toHaveBeenCalled();
    });

    it('should return existing invoice if payment already has an invoice (1-1 mapping)', async () => {
      const paymentId = new Types.ObjectId();
      const orderId = new Types.ObjectId();
      const existing = {
        id: new Types.ObjectId().toString(),
        idempotencyKey: 'other_key',
        paymentId,
        status: InvoiceStatus.ISSUED,
      };
      inMemoryInvoices.push(existing);

      const result = await service.createInvoice({
        paymentId: paymentId.toString(),
        orderId: orderId.toString(),
        orderType: PaymentOrderType.BOOKING,
        items: [{ name: 'Item 1', quantity: 1, unitPrice: 100000, amount: 100000, vatRate: 0, vatAmount: 0 }],
        subtotal: 100000,
        vatAmount: 0,
        totalAmount: 100000,
        idempotencyKey: 'new_unique_key',
      });

      expect(result).toBe(existing);
    });
  });

  describe('issueInvoiceWithRetry', () => {
    it('should throw NotFoundException if invoice not found', async () => {
      await expect(
        service.issueInvoiceWithRetry(new Types.ObjectId().toString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if invoice is already cancelled', async () => {
      const invId = new Types.ObjectId().toString();
      inMemoryInvoices.push({
        id: invId,
        status: InvoiceStatus.CANCELLED,
      });

      await expect(service.issueInvoiceWithRetry(invId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should increment retryCount and record lastError if adapter fails', async () => {
      mockInvoiceAdapter.issueInvoice.mockRejectedValueOnce(
        new Error('VNPT API timeout'),
      );

      const invId = new Types.ObjectId().toString();
      const invoiceDoc = mockInvoiceModel({
        _id: new Types.ObjectId(invId),
        invoiceCode: 'INV-20261026-001',
        orderId: new Types.ObjectId(),
        totalAmount: 100000,
        status: InvoiceStatus.PENDING,
        retryCount: 0,
        buyerInfo: { name: 'Khách', buyerType: BuyerType.INDIVIDUAL },
        items: [],
      });
      inMemoryInvoices.push(invoiceDoc);

      const result = await service.issueInvoiceWithRetry(invId);

      expect(result.retryCount).toBe(1);
      expect(result.lastError).toContain('VNPT API timeout');
      expect(result.status).toBe(InvoiceStatus.PENDING);
      expect(mockOutboxService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'invoice.issue_failed' }),
      );
    });

    it('should mark status as FAILED after 3 failed retries', async () => {
      mockInvoiceAdapter.issueInvoice.mockRejectedValueOnce(
        new Error('Connection refused'),
      );

      const invId = new Types.ObjectId().toString();
      const invoiceDoc = mockInvoiceModel({
        _id: new Types.ObjectId(invId),
        invoiceCode: 'INV-20261026-002',
        orderId: new Types.ObjectId(),
        totalAmount: 100000,
        status: InvoiceStatus.PENDING,
        retryCount: 2,
        buyerInfo: { name: 'Khách', buyerType: BuyerType.INDIVIDUAL },
        items: [],
      });
      inMemoryInvoices.push(invoiceDoc);

      const result = await service.issueInvoiceWithRetry(invId);

      expect(result.retryCount).toBe(3);
      expect(result.status).toBe(InvoiceStatus.FAILED);
    });
  });

  describe('cancelInvoice', () => {
    it('should mark invoice as CANCELLED and call adapter.cancelInvoice', async () => {
      const invId = new Types.ObjectId().toString();
      const invoiceDoc = mockInvoiceModel({
        _id: new Types.ObjectId(invId),
        invoiceCode: 'INV-20261026-003',
        invoiceNumber: '0005555',
        status: InvoiceStatus.ISSUED,
      });
      inMemoryInvoices.push(invoiceDoc);

      const result = await service.cancelInvoice(invId, 'Khách hủy đặt sân');

      expect(result.status).toBe(InvoiceStatus.CANCELLED);
      expect(mockInvoiceAdapter.cancelInvoice).toHaveBeenCalledWith(
        '0005555',
        'Khách hủy đặt sân',
      );
      expect(mockOutboxService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'invoice.cancelled' }),
      );
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'INVOICE_CANCELLED' }),
      );
    });
  });

  describe('getInvoicePdf', () => {
    it('should return existing pdfUrl if already set', async () => {
      const invId = new Types.ObjectId().toString();
      inMemoryInvoices.push({
        id: invId,
        pdfUrl: 'https://cdn.example.com/inv.pdf',
      });

      const url = await service.getInvoicePdf(invId);
      expect(url).toBe('https://cdn.example.com/inv.pdf');
    });

    it('should call adapter.getPdfUrl when pdfUrl not set but invoiceNumber and lookupCode exist', async () => {
      const invId = new Types.ObjectId().toString();
      inMemoryInvoices.push({
        id: invId,
        invoiceNumber: '0008888',
        lookupCode: 'XYZ123',
      });

      const url = await service.getInvoicePdf(invId);
      expect(url).toBe('https://einvoice.example.vn/view/0008888-XYZ123.pdf');
      expect(mockInvoiceAdapter.getPdfUrl).toHaveBeenCalledWith('0008888', 'XYZ123');
    });

    it('should throw BadRequestException if invoice is pending without invoiceNumber', async () => {
      const invId = new Types.ObjectId().toString();
      inMemoryInvoices.push({
        id: invId,
        status: InvoiceStatus.PENDING,
      });

      await expect(service.getInvoicePdf(invId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findUninvoicedPayments', () => {
    it('should return report of successful payments that have no invoices', async () => {
      const p1Id = new Types.ObjectId();
      const p2Id = new Types.ObjectId();

      inMemoryPayments.push(
        {
          _id: p1Id,
          id: p1Id.toString(),
          paymentCode: 'PAY-001',
          orderId: new Types.ObjectId(),
          orderType: PaymentOrderType.BOOKING,
          status: PaymentStatus.SUCCESS,
          paidAmount: 150000,
          createdAt: new Date(),
        },
        {
          _id: p2Id,
          id: p2Id.toString(),
          paymentCode: 'PAY-002',
          orderId: new Types.ObjectId(),
          orderType: PaymentOrderType.BOOKING,
          status: PaymentStatus.SUCCESS,
          paidAmount: 250000,
          createdAt: new Date(),
        },
      );

      // p1 is already invoiced
      inMemoryInvoices.push({
        id: new Types.ObjectId().toString(),
        paymentId: p1Id,
      });

      const report = await service.findUninvoicedPayments();

      expect(report.uninvoicedCount).toBe(1);
      expect(report.uninvoicedTotal).toBe(250000);
      expect(report.payments).toHaveLength(1);
      expect(report.payments[0]?.paymentCode).toBe('PAY-002');
    });
  });
});
