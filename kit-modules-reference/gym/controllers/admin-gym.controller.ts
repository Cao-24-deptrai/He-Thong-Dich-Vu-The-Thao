import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@sports/shared';
import { RequireRoles, CurrentUser } from '../../auth/index.js';
import { GymService } from '../services/gym.service.js';
import {
  GymMembershipStatus,
  GymAccessMethod,
  assignRfidSchema,
  AssignRfidDto,
} from '@sports/contracts';

@Controller('admin/gym')
@RequireRoles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
export class AdminGymController {
  constructor(private readonly gymService: GymService) {}

  @Get('memberships')
  async getMemberships(
    @Query('status') status?: GymMembershipStatus,
    @Query('phone') phone?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.gymService.findAllMemberships({
      status,
      phone,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { data: result };
  }

  @Post('memberships/:id/assign-rfid')
  @HttpCode(HttpStatus.OK)
  async assignRfid(
    @Param('id') id: string,
    @Body() body: AssignRfidDto,
    @CurrentUser('sub') actorId: string,
  ) {
    const validated = assignRfidSchema.parse(body);
    const result = await this.gymService.assignRfid(
      id,
      validated.rfidCardId,
      actorId,
    );
    return { data: result };
  }

  @Post('check-in-manual')
  @HttpCode(HttpStatus.OK)
  async checkInManual(
    @CurrentUser('sub') actorId: string,
    @Body('membershipId') membershipId: string,
    @Body('reason') reason: string,
  ) {
    const result = await this.gymService.checkIn(
      {
        method: GymAccessMethod.MANUAL,
        membershipId,
        reason: reason || 'Lễ tân check-in thủ công',
      },
      actorId,
    );
    return { data: result };
  }
}
