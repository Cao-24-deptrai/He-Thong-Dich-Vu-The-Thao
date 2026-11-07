import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { VoucherService } from './voucher.service.js';
import { Voucher } from '../schemas/voucher.schema.js';
import { VoucherUsage } from '../schemas/voucher-usage.schema.js';
import { User } from '../../auth/schemas/user.schema.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  VoucherDiscountType,
  VoucherScope,
  PromotionChannel,
} from '@sports/shared';

describe('VoucherService Concurrency Defense (20 Concurrent Customers for 1 Last Voucher Usage Slot)', () => {
  let service: VoucherService;

  const inMemoryVouchers: any[] = [];
  const inMemoryUsages: any[] = [];

  beforeEach(async () => {
    inMemoryVouchers.length = 0;
    inMemoryUsages.length = 0;

    // Khởi tạo voucher flash sale chỉ còn đúng 1 lượt dùng (99/100)
    inMemoryVouchers.push({
      _id: new Types.ObjectId(),
      code: 'FLASH99',
      name: 'Flash Sale Giảm 50k',
      discountType: VoucherDiscountType.FIXED,
      discountValue: 50000,
      totalUsageLimit: 100,
      usedCount: 99,
      perCustomerLimit: 1,
      applicableScopes: [VoucherScope.ALL],
      channel: PromotionChannel.ALL,
      isActive: true,
      validFrom: new Date(Date.now() - 3600000),
      validTo: new Date(Date.now() + 86400000),
    });

    // Mô phỏng Document-level serialization của MongoDB engine với atomic findOneAndUpdate
    let lock = Promise.resolve();

    const mockVoucherModel: any = {
      findOneAndUpdate: jest.fn().mockImplementation((query, update, options) => {
        return new Promise((resolve) => {
          lock = lock.then(async () => {
            // Thêm jitter ngẫu nhiên mô phỏng độ trễ mạng thực tế giữa các luồng
            await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 5)));

            const target = inMemoryVouchers.find((v) => {
              if (query.code && v.code !== query.code) return false;
              if (query.isActive !== undefined && v.isActive !== query.isActive) return false;
              // Điều kiện giới hạn tổng lượt dùng
              if (v.totalUsageLimit !== undefined && v.usedCount >= v.totalUsageLimit) return false;
              return true;
            });

            if (!target) return resolve(null);

            if (update.$inc?.usedCount) {
              target.usedCount += update.$inc.usedCount;
            }

            resolve(options?.new ? { ...target } : { ...target });
          });
        });
      }),
      findOne: jest.fn().mockImplementation((query) => {
        const found = inMemoryVouchers.find((v) => v.code === query.code);
        return Promise.resolve(found ? { ...found } : null);
      }),
    };

    const mockVoucherUsageModel: any = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      save: jest.fn().mockImplementation(async function (this: any) {
        return new Promise((resolve) => {
          lock = lock.then(async () => {
            inMemoryUsages.push({ ...this });
            resolve(this);
          });
        });
      }),
    }));

    const mockUserModel = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const mockAuditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoucherService,
        { provide: getModelToken(Voucher.name), useValue: mockVoucherModel },
        { provide: getModelToken(VoucherUsage.name), useValue: mockVoucherUsageModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<VoucherService>(VoucherService);
  });

  it('20 khách hàng thanh toán đồng thời tranh 1 suất voucher cuối cùng -> Đúng 1 người thành công, 19 người bị từ chối VOUCHER_USAGE_LIMIT_EXCEEDED, usedCount = 100', async () => {
    const totalRequests = 20;

    // Kích hoạt đồng thời 20 lệnh consume voucher
    const results = await Promise.allSettled(
      Array.from({ length: totalRequests }).map((_, index) => {
        const customerId = new Types.ObjectId().toString();
        const orderId = `order-race-${index + 1}`;
        return service.consumeVoucher('FLASH99', customerId, 'BOOKING', orderId, 50000);
      }),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    // Bất biến: Đúng 1 giao dịch tiêu voucher thành công, 19 giao dịch bị chặn
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(19);

    // Xác minh toàn bộ 19 giao dịch thất bại đều có mã lỗi VOUCHER_USAGE_LIMIT_EXCEEDED
    for (const fail of failed) {
      if (fail.status === 'rejected') {
        expect(fail.reason).toBeInstanceOf(BadRequestException);
        expect((fail.reason as any).response.code).toBe('VOUCHER_USAGE_LIMIT_EXCEEDED');
      }
    }

    // Bất biến: usedCount đạt chính xác 100 (tối đa), không bao giờ bị vượt ngưỡng (oversell)
    expect(inMemoryVouchers[0].usedCount).toBe(100);

    // Bất biến: Chỉ có đúng 1 bản ghi sử dụng được tạo trong cơ sở dữ liệu
    expect(inMemoryUsages).toHaveLength(1);
  });
});
