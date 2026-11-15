import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PtClassesService } from './pt-classes.service';
import {
  CreateStaffProfileDto,
  CreateStaffShiftDto,
  StaffAttendanceCheckinDto,
  CreateClassTemplateDto,
  RegisterClassDto,
  BookPtSessionDto,
} from './dto/pt-classes.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('PT & Classes (M11)')
@Controller('pt-classes')
export class PtClassesController {
  constructor(private readonly ptClassesService: PtClassesService) {}

  // ==================== TRAINERS ====================

  @Get('trainers')
  @ApiOperation({ summary: 'Danh sách huấn luyện viên đang hoạt động' })
  @ApiResponse({ status: 200, description: 'Danh sách HLV' })
  async getTrainers(@Query('specialty') specialty?: string, @Query('search') search?: string) {
    return this.ptClassesService.getTrainers({ specialty, search });
  }

  @Get('trainers/:id')
  @ApiOperation({ summary: 'Chi tiết huấn luyện viên' })
  @ApiResponse({ status: 200, description: 'Thông tin chi tiết HLV' })
  async getTrainerById(@Param('id') id: string) {
    return this.ptClassesService.getTrainerById(id);
  }

  @Post('trainers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo mới hồ sơ huấn luyện viên / nhân sự' })
  async createStaffProfile(@Body() dto: CreateStaffProfileDto) {
    return this.ptClassesService.createStaffProfile(dto);
  }

  // ==================== CLASSES ====================

  @Get('classes')
  @ApiOperation({ summary: 'Danh sách buổi học nhóm sắp diễn ra' })
  async getClassSessions(@Query('date') date?: string, @Query('classType') classType?: string) {
    return this.ptClassesService.getClassSessions({ date, classType });
  }

  @Get('classes/:id')
  @ApiOperation({ summary: 'Chi tiết buổi học nhóm' })
  async getClassSessionById(@Param('id') id: string) {
    return this.ptClassesService.getClassSessionById(id);
  }

  @Post('templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo mẫu lớp học định kỳ' })
  async createClassTemplate(@Body() dto: CreateClassTemplateDto) {
    return this.ptClassesService.createClassTemplate(dto);
  }

  @Post('templates/:id/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tự động sinh các buổi học theo mẫu lớp' })
  async generateSessions(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('daysAhead') daysAhead?: number,
  ) {
    return this.ptClassesService.generateSessionsForTemplate(id, startDate || new Date().toISOString(), daysAhead || 14);
  }

  @Post('classes/:id/register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Khách hàng đăng ký tham gia lớp học' })
  async registerClass(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: RegisterClassDto,
  ) {
    return this.ptClassesService.registerClass(id, user._id || user.id || user.sub, dto);
  }

  // ==================== PT 1-1 BOOKINGS ====================

  @Post('pt/book')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Khách hàng đặt lịch tập PT 1-1' })
  async bookPtSession(@CurrentUser() user: any, @Body() dto: BookPtSessionDto) {
    return this.ptClassesService.bookPtSession(user._id || user.id || user.sub, dto);
  }

  @Get('pt/my-sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lịch sử đặt lịch PT của khách hàng' })
  async getUserPtSessions(@CurrentUser() user: any) {
    return this.ptClassesService.getUserPtSessions(user._id || user.id || user.sub);
  }

  // ==================== SHIFTS & ATTENDANCE ====================

  @Post('shifts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xếp ca làm việc cho nhân viên / HLV' })
  async createShift(@Body() dto: CreateStaffShiftDto) {
    return this.ptClassesService.createShift(dto);
  }

  @Get('shifts/:staffId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tra cứu ca làm việc của nhân viên' })
  async getStaffShifts(
    @Param('staffId') staffId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ptClassesService.getStaffShifts(staffId, startDate, endDate);
  }

  @Post('attendance/checkin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chấm công vào ca' })
  async checkinAttendance(@Body() dto: StaffAttendanceCheckinDto) {
    return this.ptClassesService.checkinAttendance(dto);
  }

  @Post('attendance/:id/checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chấm công ra ca' })
  async checkoutAttendance(@Param('id') id: string) {
    return this.ptClassesService.checkoutAttendance(id);
  }
}
