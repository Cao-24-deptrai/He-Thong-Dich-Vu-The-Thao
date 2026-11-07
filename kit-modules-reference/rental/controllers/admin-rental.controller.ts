import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RequireRoles } from '../../auth/index.js';
import { Role } from '@sports/shared';
import { EquipmentService } from '../services/equipment.service.js';
import { RentalService } from '../services/rental.service.js';
import {
  createEquipmentSchema,
  CreateEquipmentDto,
  updateEquipmentSchema,
  UpdateEquipmentDto,
} from '@sports/contracts';

@Controller('admin/rentals')
@RequireRoles(Role.ADMIN, Role.MANAGER)
export class AdminRentalController {
  constructor(
    private readonly equipmentService: EquipmentService,
    private readonly rentalService: RentalService,
  ) {}

  @Post('equipments')
  @HttpCode(HttpStatus.CREATED)
  async createEquipment(@Body() body: CreateEquipmentDto) {
    const validated = createEquipmentSchema.parse(body);
    const result = await this.equipmentService.createEquipment(validated);
    return { data: result };
  }

  @Patch('equipments/:id')
  async updateEquipment(@Param('id') id: string, @Body() body: UpdateEquipmentDto) {
    const validated = updateEquipmentSchema.parse(body);
    const result = await this.equipmentService.updateEquipment(id, validated);
    return { data: result };
  }

  @Get('reports/usage')
  async getUsageReport(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;
    const result = await this.rentalService.getUsageReport(from, to);
    return { data: result };
  }
}
