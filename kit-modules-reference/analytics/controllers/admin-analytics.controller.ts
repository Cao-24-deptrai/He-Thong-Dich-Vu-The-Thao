import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnalyticsReportService } from '../services/analytics-report.service.js';
import { DailyStatsService } from '../services/daily-stats.service.js';
import { RequireRoles } from '../../auth/index.js';
import { Role } from '@sports/shared';
import {
  RevenueReportQueryDto,
  OccupancyReportQueryDto,
  CustomerReportQueryDto,
  ShiftReconciliationQueryDto,
  GamingReportQueryDto,
  GymReportQueryDto,
  ExceptionReportQueryDto,
  RecalculateDailyStatsDto,
} from '@sports/contracts';

@Controller('admin/analytics')
@RequireRoles(Role.ADMIN, Role.MANAGER)
export class AdminAnalyticsController {
  constructor(
    private readonly reportService: AnalyticsReportService,
    private readonly dailyStatsService: DailyStatsService,
  ) {}

  @Get('dashboard')
  async getExecutiveDashboard() {
    return this.reportService.getExecutiveDashboard();
  }

  @Get('revenue')
  async getRevenueReport(@Query() query: RevenueReportQueryDto) {
    return this.reportService.getRevenueReport(query);
  }

  @Get('occupancy')
  async getOccupancyReport(@Query() query: OccupancyReportQueryDto) {
    return this.reportService.getOccupancyReport(query);
  }

  @Get('customers')
  async getCustomerReport(@Query() query: CustomerReportQueryDto) {
    return this.reportService.getCustomerReport(query);
  }

  @Get('inventory')
  async getInventoryReport() {
    return this.reportService.getInventoryReport();
  }

  @Get('cashier-shifts')
  async getShiftReconciliationReport(@Query() query: ShiftReconciliationQueryDto) {
    return this.reportService.getShiftReconciliationReport(query);
  }

  @Get('gaming')
  async getGamingReport(@Query() query: GamingReportQueryDto) {
    return this.reportService.getGamingReport(query);
  }

  @Get('gym')
  async getGymReport(@Query() query: GymReportQueryDto) {
    return this.reportService.getGymReport(query);
  }

  @Get('exceptions')
  async getExceptionReport(@Query() query: ExceptionReportQueryDto) {
    return this.reportService.getExceptionReport(query);
  }

  @Post('daily-stats/recalculate')
  @HttpCode(HttpStatus.OK)
  async recalculateDailyStats(@Body() dto: RecalculateDailyStatsDto) {
    return this.dailyStatsService.recalculateDailyStats(dto.date);
  }
}
