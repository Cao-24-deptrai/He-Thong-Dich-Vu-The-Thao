import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser, Public } from '../../auth/index.js';
import { GymService } from '../services/gym.service.js';
import {
  purchaseGymMembershipSchema,
  PurchaseGymMembershipDto,
  renewGymMembershipSchema,
  RenewGymMembershipDto,
  upgradeGymMembershipSchema,
  UpgradeGymMembershipDto,
  gymCheckInSchema,
  GymCheckInDto,
  gymCheckOutSchema,
  GymCheckOutDto,
} from '@sports/contracts';

@Controller('gym')
export class GymController {
  constructor(private readonly gymService: GymService) {}

  @Public()
  @Get('packages')
  async getPackages() {
    const result = await this.gymService.getActivePackages();
    return { data: result };
  }

  @Public()
  @Get('capacity')
  async getCapacity() {
    const result = await this.gymService.getCapacityStatus();
    return { data: result };
  }

  @Get('memberships/me')
  async getMyMemberships(@CurrentUser('sub') userId: string) {
    const result = await this.gymService.findMyMemberships(userId);
    return { data: result };
  }

  @Get('memberships/me/qr')
  async getDynamicQr(@CurrentUser('sub') userId: string) {
    const result = await this.gymService.generateDynamicQr(userId);
    return { data: result };
  }

  @Post('memberships')
  @HttpCode(HttpStatus.CREATED)
  async purchaseMembership(
    @CurrentUser('sub') userId: string,
    @Body() body: PurchaseGymMembershipDto,
  ) {
    const validated = purchaseGymMembershipSchema.parse(body);
    const result = await this.gymService.purchaseMembership(userId, validated);
    return { data: result };
  }

  @Post('memberships/:id/renew')
  @HttpCode(HttpStatus.OK)
  async renewMembership(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: RenewGymMembershipDto,
  ) {
    const validated = renewGymMembershipSchema.parse(body);
    const result = await this.gymService.renewMembership(userId, id, validated);
    return { data: result };
  }

  @Post('memberships/:id/upgrade')
  @HttpCode(HttpStatus.OK)
  async upgradeMembership(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: UpgradeGymMembershipDto,
  ) {
    const validated = upgradeGymMembershipSchema.parse(body);
    const result = await this.gymService.upgradeMembership(userId, id, validated);
    return { data: result };
  }

  @Public()
  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  async checkIn(@Body() body: GymCheckInDto) {
    const validated = gymCheckInSchema.parse(body);
    const result = await this.gymService.checkIn(validated);
    return { data: result };
  }

  @Public()
  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  async checkOut(@Body() body: GymCheckOutDto) {
    const validated = gymCheckOutSchema.parse(body);
    const result = await this.gymService.checkOut(validated);
    return { data: result };
  }
}
