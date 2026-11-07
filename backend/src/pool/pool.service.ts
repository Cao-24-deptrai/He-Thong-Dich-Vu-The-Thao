import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { EventsGateway } from '../events/events.gateway';
import {
  PoolTicket,
  PoolTicketDocument,
} from './schemas/pool-ticket.schema';
import {
  PoolTicketType,
  PoolTicketStatus,
  PoolCode,
  POOL_PRICES,
} from './enums/pool.enum';
import {
  PurchasePoolTicketDto,
  ScanPoolTicketDto,
  EmergencyClosePoolDto,
  PoolCheckOutDto,
} from './dto/pool.dto';

export interface PoolConfig {
  code: PoolCode;
  name: string;
  lengthMeters: number;
  capacity: number;
  currentSwimmers: number;
  isClosed: boolean;
  closureReason?: string;
}

@Injectable()
export class PoolService {
  private readonly logger = new Logger(PoolService.name);

  // 2 Hồ bơi tiêu chuẩn theo BR-31: Olympic 50m (80 người) và Khởi động 25m (40 người)
  private pools: Record<PoolCode, PoolConfig> = {
    [PoolCode.POOL_50M]: {
      code: PoolCode.POOL_50M,
      name: 'Hồ Bơi Thi Đấu Olympic 50m',
      lengthMeters: 50,
      capacity: 80, // Sức chứa an toàn tối đa 80 người
      currentSwimmers: 0,
      isClosed: false,
    },
    [PoolCode.POOL_25M]: {
      code: PoolCode.POOL_25M,
      name: 'Hồ Bơi Tiêu Chuẩn Khởi Động 25m',
      lengthMeters: 25,
      capacity: 40, // Sức chứa an toàn tối đa 40 người
      currentSwimmers: 0,
      isClosed: false,
    },
  };

  constructor(
    @InjectModel(PoolTicket.name)
    private readonly poolTicketModel: Model<PoolTicketDocument>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Xem trạng thái sức chứa và mở/đóng của 2 hồ bơi thời gian thực
   */
  async getPoolsStatus(): Promise<{
    pools: Array<PoolConfig & { occupancyRate: number; isFull: boolean }>;
    totalCapacity: number;
    totalSwimmers: number;
    overallOccupancy: number;
  }> {
    const poolList = Object.values(this.pools).map((p) => {
      const occupancyRate = Math.min(100, Math.round((p.currentSwimmers / p.capacity) * 100));
      return {
        ...p,
        occupancyRate,
        isFull: p.currentSwimmers >= p.capacity,
      };
    });

    const totalCapacity = poolList.reduce((acc, p) => acc + p.capacity, 0);
    const totalSwimmers = poolList.reduce((acc, p) => acc + p.currentSwimmers, 0);
    const overallOccupancy = Math.round((totalSwimmers / totalCapacity) * 100);

    return {
      pools: poolList,
      totalCapacity,
      totalSwimmers,
      overallOccupancy,
    };
  }

  /**
   * Bán vé bơi theo lượt trong ngày: Người lớn 25k, Trẻ em 20k (BR-31)
   * Vé có giá trị trong ngày mua, dùng chung cho cả 2 hồ bơi.
   */
  async purchaseTickets(
    userId: string | undefined,
    dto: PurchasePoolTicketDto,
  ): Promise<{
    success: boolean;
    totalTickets: number;
    totalPrice: number;
    validDate: Date;
    tickets: PoolTicketDocument[];
  }> {
    const adultCount = Math.max(0, dto.adultCount || 0);
    const childCount = Math.max(0, dto.childCount || 0);
    const totalCount = adultCount + childCount;

    if (totalCount <= 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 vé bơi người lớn hoặc trẻ em');
    }

    const totalPrice =
      adultCount * POOL_PRICES[PoolTicketType.ADULT] +
      childCount * POOL_PRICES[PoolTicketType.CHILD];

    // Vé có giá trị trong ngày mua theo BR-31 (kết thúc lúc 23:59:59 của ngày mua)
    const validDate = new Date();
    validDate.setHours(23, 59, 59, 999);

    const createdTickets: PoolTicketDocument[] = [];

    // Tạo vé người lớn
    for (let i = 0; i < adultCount; i++) {
      const randSuffix = randomBytes(3).toString('hex').toUpperCase();
      const ticketCode = `POOL_ADULT_${Date.now().toString().slice(-4)}_${randSuffix}`;
      const ticket = new this.poolTicketModel({
        userId: (userId && Types.ObjectId.isValid(userId)) ? new Types.ObjectId(userId) : undefined,
        ticketCode,
        ticketType: PoolTicketType.ADULT,
        price: POOL_PRICES[PoolTicketType.ADULT],
        validDate,
        status: PoolTicketStatus.UNUSED,
        customerPhone: dto.customerPhone,
        customerName: dto.customerName,
      });
      createdTickets.push(await ticket.save());
    }

    // Tạo vé trẻ em
    for (let i = 0; i < childCount; i++) {
      const randSuffix = randomBytes(3).toString('hex').toUpperCase();
      const ticketCode = `POOL_CHILD_${Date.now().toString().slice(-4)}_${randSuffix}`;
      const ticket = new this.poolTicketModel({
        userId: (userId && Types.ObjectId.isValid(userId)) ? new Types.ObjectId(userId) : undefined,
        ticketCode,
        ticketType: PoolTicketType.CHILD,
        price: POOL_PRICES[PoolTicketType.CHILD],
        validDate,
        status: PoolTicketStatus.UNUSED,
        customerPhone: dto.customerPhone,
        customerName: dto.customerName,
      });
      createdTickets.push(await ticket.save());
    }

    this.logger.log(
      `🏊 Bán thành công ${totalCount} vé bơi cho ${dto.customerName} (${dto.customerPhone}) - Tổng: ${totalPrice.toLocaleString('vi-VN')} VND`,
    );

    return {
      success: true,
      totalTickets: totalCount,
      totalPrice,
      validDate,
      tickets: createdTickets,
    };
  }

  /**
   * Quét vé qua cổng hồ bơi (BR-31)
   * Khách cầm vé đến quét cổng hồ nào thì gán vào hồ đó và tăng bộ đếm sức chứa của hồ đó.
   */
  async scanPoolTicket(dto: ScanPoolTicketDto): Promise<{
    accessGranted: boolean;
    turnstileAction: 'OPEN';
    ticket: PoolTicketDocument;
    pool: {
      code: PoolCode;
      name: string;
      currentSwimmers: number;
      capacity: number;
    };
    message: string;
  }> {
    const pool = this.pools[dto.poolCode];
    if (!pool) {
      throw new BadRequestException(`Mã hồ bơi "${dto.poolCode}" không hợp lệ`);
    }

    // 1. Kiểm tra hồ bơi có bị đóng cửa đột xuất không
    if (pool.isClosed) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'POOL_CLOSED',
        message: `Hồ bơi ${pool.name} hiện đang tạm đóng: ${pool.closureReason || 'Bảo trì'}. Cửa không mở.`,
      });
    }

    // 2. Tìm kiếm vé bơi
    const ticket = await this.poolTicketModel.findOne({ ticketCode: dto.ticketCode }).exec();
    if (!ticket) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'TICKET_NOT_FOUND',
        message: 'Mã vé bơi không tồn tại trong hệ thống',
      });
    }

    // 3. Kiểm tra trạng thái vé
    if (ticket.status === PoolTicketStatus.REFUNDED) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'TICKET_REFUNDED',
        message: `Vé bơi này đã được hoàn 100% tiền do hồ đóng đột xuất (Lý do: ${ticket.refundReason || 'Sự cố'}). Vé không còn hiệu lực.`,
      });
    }

    if (ticket.status === PoolTicketStatus.USED) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'TICKET_ALREADY_USED',
        message: `Vé bơi này đã được quét qua cổng ${ticket.scannedPoolCode} vào lúc ${ticket.scannedAt?.toLocaleTimeString('vi-VN')}. Mỗi vé chỉ có giá trị 1 lượt (BR-31).`,
      });
    }

    // 4. Kiểm tra ngày hiệu lực (trong ngày mua)
    const now = new Date();
    const startOfValidDay = new Date(ticket.validDate);
    startOfValidDay.setHours(0, 0, 0, 0);

    const endOfValidDay = new Date(ticket.validDate);
    endOfValidDay.setHours(23, 59, 59, 999);

    if (now < startOfValidDay || now > endOfValidDay) {
      ticket.status = PoolTicketStatus.EXPIRED;
      await ticket.save();
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'TICKET_EXPIRED',
        message: 'Vé bơi đã hết hạn sử dụng. Vé chỉ có giá trị trong ngày mua theo quy định BR-31.',
      });
    }

    // 5. Kiểm tra sức chứa an toàn của hồ bơi được quét (capacity)
    if (pool.currentSwimmers >= pool.capacity) {
      this.logger.warn(`🚫 Hồ bơi ${pool.name} đã đầy (${pool.capacity}/${pool.capacity}) -> Từ chối vào`);
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'POOL_CAPACITY_FULL',
        message: `Hồ bơi ${pool.name} đã đạt sức chứa an toàn tối đa (${pool.capacity} người). Vui lòng đợi khách ra hoặc chọn hồ bơi còn lại.`,
      });
    }

    // 6. Gán hồ bơi đã quét và tăng số người trong hồ (BR-31)
    ticket.status = PoolTicketStatus.USED;
    ticket.scannedPoolCode = dto.poolCode;
    ticket.scannedAt = now;
    await ticket.save();

    pool.currentSwimmers += 1;

    // 7. Phát WebSocket thông báo mở cửa xoay hồ bơi và cập nhật dashboard
    try {
      this.eventsGateway.server?.emit('pool_turnstile_open', {
        poolCode: pool.code,
        poolName: pool.name,
        ticketCode: ticket.ticketCode,
        ticketType: ticket.ticketType,
        customerName: ticket.customerName,
        currentSwimmers: pool.currentSwimmers,
        capacity: pool.capacity,
        timestamp: now.toISOString(),
      });

      this.eventsGateway.server?.emit('pool_capacity_updated', {
        poolCode: pool.code,
        currentSwimmers: pool.currentSwimmers,
        capacity: pool.capacity,
      });
    } catch (_) {}

    this.logger.log(
      `🚪 Mở cổng hồ bơi ${pool.name}: ${ticket.customerName} (${ticket.ticketCode}) | Khách hiện tại: ${pool.currentSwimmers}/${pool.capacity}`,
    );

    return {
      accessGranted: true,
      turnstileAction: 'OPEN',
      ticket,
      pool: {
        code: pool.code,
        name: pool.name,
        currentSwimmers: pool.currentSwimmers,
        capacity: pool.capacity,
      },
      message: `Quét vé thành công! Chào mừng quý khách vào ${pool.name}.`,
    };
  }

  /**
   * Khách rời hồ bơi: Giải phóng sức chứa (Check-out)
   */
  async checkOutSwimmer(dto: PoolCheckOutDto): Promise<{
    success: boolean;
    poolCode: PoolCode;
    poolName: string;
    currentSwimmers: number;
    capacity: number;
  }> {
    const pool = this.pools[dto.poolCode];
    if (!pool) {
      throw new BadRequestException(`Mã hồ bơi "${dto.poolCode}" không hợp lệ`);
    }

    const count = Math.max(1, dto.swimmerCount || 1);
    pool.currentSwimmers = Math.max(0, pool.currentSwimmers - count);

    try {
      this.eventsGateway.server?.emit('pool_capacity_updated', {
        poolCode: pool.code,
        currentSwimmers: pool.currentSwimmers,
        capacity: pool.capacity,
      });
    } catch (_) {}

    this.logger.log(
      `🏊 Khách rời hồ bơi ${pool.name} (-${count}) | Còn lại: ${pool.currentSwimmers}/${pool.capacity}`,
    );

    return {
      success: true,
      poolCode: pool.code,
      poolName: pool.name,
      currentSwimmers: pool.currentSwimmers,
      capacity: pool.capacity,
    };
  }

  /**
   * Đóng hồ bơi đột xuất & Hủy hoàn 100% tiền vé chưa quét trong ngày (AC-87)
   */
  async emergencyClosePool(dto: EmergencyClosePoolDto): Promise<{
    success: boolean;
    poolCode: PoolCode;
    poolName: string;
    isClosed: boolean;
    closureReason: string;
    refundedTicketsCount: number;
    totalRefundAmount: number;
    refundedTicketCodes: string[];
    message: string;
  }> {
    const pool = this.pools[dto.poolCode];
    if (!pool) {
      throw new BadRequestException(`Mã hồ bơi "${dto.poolCode}" không hợp lệ`);
    }

    // 1. Cập nhật trạng thái hồ bơi đóng đột xuất
    pool.isClosed = true;
    pool.closureReason = dto.reason;

    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 2. Tìm tất cả các vé bơi chưa quét trong ngày (status = UNUSED)
    const unusedTickets = await this.poolTicketModel
      .find({
        status: PoolTicketStatus.UNUSED,
        validDate: { $gte: startOfToday, $lte: endOfToday },
      })
      .exec();

    const refundedTicketCodes: string[] = [];
    let totalRefundAmount = 0;

    // 3. Hủy và hoàn 100% tiền vé cho các vé chưa quét theo quy định AC-87
    for (const ticket of unusedTickets) {
      ticket.status = PoolTicketStatus.REFUNDED;
      ticket.refundedAt = now;
      ticket.refundReason = `Hồ bơi ${pool.name} đóng đột xuất: ${dto.reason}`;
      await ticket.save();

      refundedTicketCodes.push(ticket.ticketCode);
      totalRefundAmount += ticket.price;
    }

    // 4. Phát WebSocket thông báo khẩn cấp
    try {
      this.eventsGateway.server?.emit('pool_emergency_closed', {
        poolCode: pool.code,
        poolName: pool.name,
        reason: dto.reason,
        refundedCount: unusedTickets.length,
        totalRefundAmount,
        timestamp: now.toISOString(),
      });
    } catch (_) {}

    this.logger.warn(
      `🚨 Đóng hồ bơi đột xuất: ${pool.name}. Tự động hoàn 100% cho ${unusedTickets.length} vé chưa quét (Tổng: ${totalRefundAmount.toLocaleString('vi-VN')} VND) (AC-87)`,
    );

    return {
      success: true,
      poolCode: pool.code,
      poolName: pool.name,
      isClosed: true,
      closureReason: dto.reason,
      refundedTicketsCount: unusedTickets.length,
      totalRefundAmount,
      refundedTicketCodes,
      message: `Đã đóng hồ bơi ${pool.name} khẩn cấp và hoàn 100% tiền cho ${unusedTickets.length} vé bơi chưa quét trong ngày theo tiêu chuẩn AC-87.`,
    };
  }

  /**
   * Mở lại hồ bơi sau khi khắc phục sự cố
   */
  async reopenPool(poolCode: PoolCode): Promise<{ success: boolean; message: string }> {
    const pool = this.pools[poolCode];
    if (!pool) {
      throw new BadRequestException(`Mã hồ bơi "${poolCode}" không hợp lệ`);
    }

    pool.isClosed = false;
    pool.closureReason = undefined;

    this.logger.log(`✅ Đã mở lại hoạt động cho ${pool.name}`);

    try {
      this.eventsGateway.server?.emit('pool_reopened', {
        poolCode: pool.code,
        poolName: pool.name,
        timestamp: new Date().toISOString(),
      });
    } catch (_) {}

    return {
      success: true,
      message: `Hồ bơi ${pool.name} đã mở cửa đón khách trở lại`,
    };
  }

  /**
   * Tra cứu danh sách vé bơi của khách hàng (hoặc theo số điện thoại)
   */
  async getMyTickets(userId?: string, phone?: string): Promise<PoolTicketDocument[]> {
    const query: any = {};
    if (userId) {
      query.userId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
    } else if (phone) {
      query.customerPhone = phone;
    } else {
      return [];
    }

    return this.poolTicketModel.find(query).sort({ createdAt: -1 }).limit(50).exec();
  }

  // ==========================================
  // TƯƠNG THÍCH NGƯỢC (LEGACY APIS)
  // ==========================================
  async getStatus(): Promise<any> {
    return this.getPoolsStatus();
  }

  async createTicket(dto: any): Promise<any> {
    const res = await this.purchaseTickets(undefined, {
      adultCount: dto.ticketCount || 1,
      childCount: 0,
      customerName: dto.customerName || 'Khách vãng lai',
      customerPhone: dto.customerPhone || '0988776655',
    });
    return res.tickets[0];
  }

  async checkOut(dto: any): Promise<any> {
    return this.checkOutSwimmer({
      poolCode: dto.poolCode || PoolCode.POOL_50M,
      swimmerCount: 1,
    });
  }
}
