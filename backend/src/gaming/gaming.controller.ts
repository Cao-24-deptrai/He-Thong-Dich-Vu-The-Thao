import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { GamingService } from './gaming.service';

@ApiTags('Cyber Gaming 100 PC Matrix')
@Controller('gaming')
export class GamingController {
  constructor(private readonly gamingService: GamingService) {}

  @Get('stations')
  @ApiOperation({ summary: 'Lấy sơ đồ ma trận 100 máy trạm Cyber Gaming kèm 4 phòng riêng' })
  @ApiQuery({ name: 'zone', required: false, description: 'Lọc theo Zone: TOURNAMENT, VIP, STANDARD, ALL' })
  @ApiQuery({ name: 'roomId', required: false, description: 'Lọc theo Phòng: E01, R01, R02, R03' })
  @ApiResponse({ status: 200, description: 'Danh sách 100 máy, 4 phòng và thống kê sức chứa' })
  async getStations(@Query('zone') zone?: string, @Query('roomId') roomId?: string): Promise<any> {
    return this.gamingService.getStations(zone, roomId);
  }

  @Post('session/start')
  @ApiOperation({ summary: 'Mở máy trạm lẻ và nạp tiền đặt cọc giờ chơi ban đầu' })
  @ApiResponse({ status: 201, description: 'Mở máy thành công' })
  async startSession(@Body() dto: any): Promise<any> {
    return this.gamingService.startSession(dto);
  }

  @Post('session/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đóng máy trạm lẻ, tính cước cuốn chiếu 15 phút và hoàn tiền thừa' })
  @ApiResponse({ status: 200, description: 'Chốt phiên chơi thành công' })
  async endSession(@Body() dto: any): Promise<any> {
    return this.gamingService.endSession(dto);
  }

  @Post('topup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nạp thêm tiền giờ chơi trực tiếp vào máy đang mở' })
  @ApiResponse({ status: 200, description: 'Nạp tiền thành công' })
  async topup(@Body() dto: any): Promise<any> {
    return this.gamingService.topup(dto);
  }

  @Post('room/start')
  @ApiOperation({ summary: 'Mở trọn phòng gaming (R01-R03 hoặc E01) và kích hoạt đồng loạt máy' })
  @ApiResponse({ status: 201, description: 'Mở trọn phòng thành công' })
  async startRoomSession(@Body() dto: any): Promise<any> {
    return this.gamingService.startRoomSession(dto);
  }

  @Post('room/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đóng trọn phòng gaming, tính cước giờ phòng và giải phóng toàn bộ máy' })
  @ApiResponse({ status: 200, description: 'Đóng trọn phòng thành công' })
  async endRoomSession(@Body() dto: any): Promise<any> {
    return this.gamingService.endRoomSession(dto);
  }
}
