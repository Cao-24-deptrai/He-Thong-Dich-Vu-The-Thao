import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VoucherService } from '../services/voucher.service.js';
import { ComboPackageService } from '../services/combo-package.service.js';
import { RequireRoles } from '../../auth/index.js';
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  VoucherListQueryDto,
  CreateComboPackageDto,
  UpdateComboPackageDto,
  ComboPackageListQueryDto,
  DeductPackageItemDto,
} from '@sports/contracts';
import { Role } from '@sports/shared';

@Controller('admin/promotions')
@RequireRoles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
export class AdminPromotionController {
  constructor(
    private readonly voucherService: VoucherService,
    private readonly comboPackageService: ComboPackageService,
  ) {}

  // ==================== VOUCHER MANAGEMENT ====================

  @Post('vouchers')
  @HttpCode(HttpStatus.CREATED)
  async createVoucher(@Body() dto: CreateVoucherDto) {
    return this.voucherService.createVoucher(dto);
  }

  @Patch('vouchers/:id')
  async updateVoucher(
    @Param('id') id: string,
    @Body() dto: UpdateVoucherDto,
  ) {
    return this.voucherService.updateVoucher(id, dto);
  }

  @Get('vouchers')
  async listVouchers(@Query() query: VoucherListQueryDto) {
    return this.voucherService.findAll(query);
  }

  @Get('vouchers/:id')
  async getVoucherDetail(@Param('id') id: string) {
    return this.voucherService.findById(id);
  }

  // ==================== COMBO MANAGEMENT ====================

  @Post('combos')
  @HttpCode(HttpStatus.CREATED)
  async createCombo(@Body() dto: CreateComboPackageDto) {
    return this.comboPackageService.createComboPackage(dto);
  }

  @Patch('combos/:id')
  async updateCombo(
    @Param('id') id: string,
    @Body() dto: UpdateComboPackageDto,
  ) {
    return this.comboPackageService.updateComboPackage(id, dto);
  }

  @Get('combos')
  async listCombos(@Query() query: ComboPackageListQueryDto) {
    return this.comboPackageService.findAll(query);
  }

  @Get('combos/:id')
  async getComboDetail(@Param('id') id: string) {
    return this.comboPackageService.findById(id);
  }

  // ==================== COUNTER DEDUCTION & REPORTS ====================

  @Post('packages/deduct')
  @HttpCode(HttpStatus.OK)
  async deductPackageItem(@Body() dto: DeductPackageItemDto) {
    return this.comboPackageService.deductPackageItem(dto);
  }

  @Get('reports')
  async getPromotionReport(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;
    return this.comboPackageService.getPromotionReport(from, to);
  }
}
