import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VoucherService } from '../services/voucher.service.js';
import { ComboPackageService } from '../services/combo-package.service.js';
import { CurrentUser, Public } from '../../auth/index.js';
import {
  VoucherListQueryDto,
  ValidateVoucherDto,
  ComboPackageListQueryDto,
  PurchaseComboDto,
  DeductPackageItemDto,
} from '@sports/contracts';

@Controller('promotions')
export class PromotionController {
  constructor(
    private readonly voucherService: VoucherService,
    private readonly comboPackageService: ComboPackageService,
  ) {}

  @Public()
  @Get('vouchers')
  async listActiveVouchers(@Query() query: VoucherListQueryDto) {
    return this.voucherService.findAll({ ...query, isActive: true });
  }

  @Public()
  @Post('vouchers/validate')
  @HttpCode(HttpStatus.OK)
  async validateVoucher(@Body() dto: ValidateVoucherDto) {
    return this.voucherService.validateAndCalculateDiscount(dto);
  }

  @Public()
  @Get('combos')
  async listActiveCombos(@Query() query: ComboPackageListQueryDto) {
    return this.comboPackageService.findAll({ ...query, isActive: true });
  }

  @Public()
  @Get('combos/:id')
  async getComboDetail(@Param('id') id: string) {
    return this.comboPackageService.findById(id);
  }

  @Post('combos/purchase')
  @HttpCode(HttpStatus.OK)
  async purchaseCombo(
    @CurrentUser('id') actorId: string,
    @Body() dto: PurchaseComboDto,
  ) {
    return this.comboPackageService.purchaseComboPackage(actorId, dto);
  }

  @Get('my-packages')
  async getMyPackages(@CurrentUser('id') customerId: string) {
    return this.comboPackageService.findMyPackages(customerId);
  }

  @Post('packages/deduct')
  @HttpCode(HttpStatus.OK)
  async deductPackageItem(@Body() dto: DeductPackageItemDto) {
    return this.comboPackageService.deductPackageItem(dto);
  }
}
