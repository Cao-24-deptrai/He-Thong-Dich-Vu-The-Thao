import { Test, TestingModule } from '@nestjs/testing';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';
import { DiscountType } from '../common/enums';

describe('VouchersController', () => {
  let controller: VouchersController;
  let service: VouchersService;

  const mockVouchersService = {
    createVoucher: jest.fn(),
    findAll: jest.fn(),
    findByCode: jest.fn(),
    validateVoucher: jest.fn(),
    applyVoucherAtomically: jest.fn(),
    rollbackVoucherUsage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VouchersController],
      providers: [
        {
          provide: VouchersService,
          useValue: mockVouchersService,
        },
      ],
    }).compile();

    controller = module.get<VouchersController>(VouchersController);
    service = module.get<VouchersService>(VouchersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('POST /vouchers - Tạo voucher mới', async () => {
    const dto = {
      code: 'TEST50K',
      title: 'Giảm 50K',
      discountType: DiscountType.FIXED,
      discountValue: 50000,
      minOrderValue: 200000,
      startDate: '2026-11-01T00:00:00.000Z',
      endDate: '2026-12-31T23:59:59.000Z',
    };

    mockVouchersService.createVoucher.mockResolvedValue({ _id: 'v1', ...dto });

    const result = await controller.createVoucher(dto as any);
    expect(result).toBeDefined();
    expect(result.code).toBe('TEST50K');
    expect(mockVouchersService.createVoucher).toHaveBeenCalledWith(dto);
  });

  it('GET /vouchers - Lấy danh sách voucher', async () => {
    mockVouchersService.findAll.mockResolvedValue([{ code: 'V1' }, { code: 'V2' }]);

    const result = await controller.getVouchers('true');
    expect(result).toHaveLength(2);
    expect(mockVouchersService.findAll).toHaveBeenCalledWith(true);
  });

  it('GET /vouchers/:code - Chi tiết voucher', async () => {
    mockVouchersService.findByCode.mockResolvedValue({ code: 'PHANTA50K', discountValue: 50000 });

    const result = await controller.getVoucherByCode('PHANTA50K');
    expect(result.code).toBe('PHANTA50K');
    expect(mockVouchersService.findByCode).toHaveBeenCalledWith('PHANTA50K');
  });

  it('POST /vouchers/validate - Kiểm tra hợp lệ và tính tiền giảm', async () => {
    const dto = { code: 'PHANTA50K', orderAmount: 300000 };
    mockVouchersService.validateVoucher.mockResolvedValue({
      isValid: true,
      discountAmount: 50000,
      finalAmount: 250000,
    });

    const result = await controller.validateVoucher(dto);
    expect(result.isValid).toBe(true);
    expect(result.discountAmount).toBe(50000);
    expect(result.finalAmount).toBe(250000);
  });

  it('POST /vouchers/apply - Áp dụng voucher nguyên tử', async () => {
    const dto = { code: 'PHANTA50K', orderAmount: 300000, bookingId: 'b1' };
    mockVouchersService.applyVoucherAtomically.mockResolvedValue({
      success: true,
      usageId: 'u1',
      voucherCode: 'PHANTA50K',
      discountAmount: 50000,
      finalAmount: 250000,
    });

    const result = await controller.applyVoucher('user-123', dto);
    expect(result.success).toBe(true);
    expect(result.discountAmount).toBe(50000);
    expect(mockVouchersService.applyVoucherAtomically).toHaveBeenCalledWith(dto, 'user-123');
  });

  it('POST /vouchers/:usageId/rollback - Hoàn lại lượt voucher', async () => {
    mockVouchersService.rollbackVoucherUsage.mockResolvedValue({
      _id: 'u1',
      status: 'ROLLED_BACK',
    });

    const result = await controller.rollbackUsage('u1');
    expect(result.status).toBe('ROLLED_BACK');
    expect(mockVouchersService.rollbackVoucherUsage).toHaveBeenCalledWith('u1');
  });
});
