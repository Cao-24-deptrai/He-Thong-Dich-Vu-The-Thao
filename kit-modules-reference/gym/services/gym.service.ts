import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import crypto from 'node:crypto';
import {
  GymPackage,
  GymPackageDocument,
} from '../schemas/gym-package.schema.js';
import {
  GymMembership,
  GymMembershipDocument,
} from '../schemas/gym-membership.schema.js';
import {
  GymAccessEvent,
  GymAccessEventDocument,
} from '../schemas/gym-access-event.schema.js';
import { User, UserDocument } from '../../auth/schemas/user.schema.js';
import { RedisService } from '../../../redis/redis.service.js';
import { SettingsService } from '../../facility/services/settings.service.js';
import { OutboxService } from '../../outbox/services/outbox.service.js';
import { AuditLogService } from '../../auth/services/audit-log.service.js';
import {
  GymMembershipStatus,
  GymAccessType,
  GymAccessMethod,
  PurchaseGymMembershipDto,
  RenewGymMembershipDto,
  UpgradeGymMembershipDto,
  GymCheckInDto,
  GymCheckOutDto,
  GymCapacityStatus,
} from '@sports/contracts';
import { assertValidMoney } from '@sports/shared';

const GYM_CHECKIN_LUA = `
local isMember = redis.call('SISMEMBER', KEYS[1], ARGV[1])
if isMember == 1 then
  return {0, 'ANTI_PASSBACK', redis.call('SCARD', KEYS[1])}
end
local count = redis.call('SCARD', KEYS[1])
if count >= tonumber(ARGV[2]) then
  return {0, 'GYM_FULL', count}
end
redis.call('SADD', KEYS[1], ARGV[1])
return {1, 'OK', count + 1}
`;

@Injectable()
export class GymService implements OnModuleInit {
  private readonly logger = new Logger(GymService.name);
  private readonly QR_SECRET = 'gym-dynamic-qr-signature-secret-key';

  constructor(
    @InjectModel(GymPackage.name)
    private readonly packageModel: Model<GymPackageDocument>,
    @InjectModel(GymMembership.name)
    private readonly membershipModel: Model<GymMembershipDocument>,
    @InjectModel(GymAccessEvent.name)
    private readonly accessEventModel: Model<GymAccessEventDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly redisService: RedisService,
    private readonly settingsService: SettingsService,
    private readonly outboxService: OutboxService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultPackages();
  }

  /**
   * Khởi tạo các gói thẻ Gym mặc định nếu CSDL trống
   */
  async seedDefaultPackages() {
    const count = await this.packageModel.countDocuments().exec();
    if (count > 0) return;

    const defaultPackages: Partial<GymPackage>[] = [
      {
        code: 'GYM-1M',
        name: 'Gói Hội viên 1 Tháng',
        durationMonths: 1,
        price: 600000,
        benefits: ['Tập không giới hạn', 'Tủ đồ miễn phí', 'Tắm nóng lạnh'],
        earlyRenewDiscountPercent: 5,
        isActive: true,
      },
      {
        code: 'GYM-3M',
        name: 'Gói Hội viên 3 Tháng (Quý)',
        durationMonths: 3,
        price: 1600000,
        benefits: ['Tập không giới hạn', 'Tủ đồ cá nhân', '1 buổi định hướng PT'],
        earlyRenewDiscountPercent: 7,
        isActive: true,
      },
      {
        code: 'GYM-6M',
        name: 'Gói Hội viên 6 Tháng',
        durationMonths: 6,
        price: 3000000,
        benefits: ['Tập không giới hạn', 'Tủ đồ VIP', '2 buổi định hướng PT', 'Khăn tập mỗi buổi'],
        earlyRenewDiscountPercent: 10,
        isActive: true,
      },
      {
        code: 'GYM-12M',
        name: 'Gói Hội viên 12 Tháng (Năm)',
        durationMonths: 12,
        price: 5400000,
        benefits: ['Tập không giới hạn', 'Tủ đồ VIP cố định', '5 buổi PT', 'Áo tập thể thao'],
        earlyRenewDiscountPercent: 10,
        isActive: true,
      },
    ];

    await this.packageModel.insertMany(defaultPackages);
    this.logger.log('Seeded default gym packages successfully');
  }

  private generateMembershipCode(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `GYM-${dateStr}-${rand}`;
  }

  /**
   * 1. Mua thẻ hội viên Gym (F10.2)
   * Bất biến: Tuyệt đối CẤM thanh toán bằng ví nội bộ (INTERNAL_WALLET)
   */
  async purchaseMembership(
    userId: string,
    dto: PurchaseGymMembershipDto,
    actorId?: string,
  ): Promise<GymMembershipDocument> {
    assertValidMoney(dto.amount, 'amount');

    if (dto.paymentMethod === ('INTERNAL_WALLET' as any)) {
      throw new BadRequestException('Không được phép thanh toán thẻ gym bằng ví nội bộ');
    }

    const existing = await this.membershipModel
      .findOne({ idempotencyKey: dto.idempotencyKey })
      .exec();
    if (existing) {
      this.logger.log(`Idempotent gym membership replay for: ${dto.idempotencyKey}`);
      return existing;
    }

    const pkg = await this.packageModel.findById(dto.packageId).exec();
    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('Gói thẻ gym không tồn tại hoặc đã ngừng cung cấp');
    }

    if (dto.amount !== pkg.price) {
      throw new BadRequestException(
        `Số tiền thanh toán (${dto.amount}đ) không khớp giá gói (${pkg.price}đ)`,
      );
    }

    const now = new Date();
    let startDate = now;
    if (dto.startDate) {
      const requestedDate = new Date(dto.startDate);
      const maxAdvance = 30 * 24 * 60 * 60 * 1000;
      if (requestedDate.getTime() - now.getTime() > maxAdvance) {
        throw new BadRequestException('Ngày bắt đầu thẻ chỉ được chọn trước tối đa 30 ngày');
      }
      startDate = requestedDate;
    }

    // Tính ngày hết hạn theo số tháng
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + pkg.durationMonths);

    const isUpcoming = startDate.getTime() > now.getTime();
    const status = isUpcoming ? GymMembershipStatus.UPCOMING : GymMembershipStatus.ACTIVE;

    const membershipCode = this.generateMembershipCode();

    const membership = new this.membershipModel({
      membershipCode,
      userId: new Types.ObjectId(userId),
      packageId: pkg._id,
      packageName: pkg.name,
      startDate,
      endDate,
      status,
      pricePaid: dto.amount,
      idempotencyKey: dto.idempotencyKey,
    });

    const saved = await membership.save();

    await this.outboxService.recordEvent({
      eventType: 'gym_membership.purchased',
      aggregateType: 'gym_membership',
      aggregateId: saved.id,
      payload: {
        membershipCode: saved.membershipCode,
        userId,
        packageCode: pkg.code,
        pricePaid: saved.pricePaid,
        startDate: saved.startDate.toISOString(),
        endDate: saved.endDate.toISOString(),
      },
    });

    await this.auditLogService.record({
      actorId: actorId || userId,
      action: 'GYM_MEMBERSHIP_PURCHASED',
      targetType: 'gym_membership',
      targetId: saved.id,
      after: {
        membershipCode: saved.membershipCode,
        packageCode: pkg.code,
        pricePaid: saved.pricePaid,
      },
    });

    return saved;
  }

  /**
   * 2. Gia hạn thẻ hội viên (F10.3)
   * Quy tắc: Cộng dồn thời gian nếu còn hạn (startDate mới = endDate cũ + 1 ngày);
   * Ưu đãi gia hạn sớm: giảm giá nếu gia hạn trước từ 7 ngày trở lên.
   */
  async renewMembership(
    userId: string,
    membershipId: string,
    dto: RenewGymMembershipDto,
    actorId?: string,
  ): Promise<GymMembershipDocument> {
    assertValidMoney(dto.amount, 'amount');

    if (dto.paymentMethod === ('INTERNAL_WALLET' as any)) {
      throw new BadRequestException('Không được phép thanh toán thẻ gym bằng ví nội bộ');
    }

    const existing = await this.membershipModel
      .findOne({ idempotencyKey: dto.idempotencyKey })
      .exec();
    if (existing) {
      return existing;
    }

    const current = await this.membershipModel.findById(membershipId).exec();
    if (!current || current.userId.toString() !== userId) {
      throw new NotFoundException('Không tìm thấy thẻ hội viên cần gia hạn');
    }

    if (
      current.status === GymMembershipStatus.CANCELLED ||
      current.status === GymMembershipStatus.UPGRADED
    ) {
      throw new BadRequestException('Thẻ hội viên đã bị hủy hoặc nâng cấp, không thể gia hạn');
    }

    const pkg = await this.packageModel.findById(current.packageId).exec();
    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('Gói thẻ của hội viên không còn hoạt động để gia hạn');
    }

    const now = new Date();
    let isEarlyRenew = false;
    let expectedPrice = pkg.price;

    const daysUntilExpire = Math.ceil(
      (current.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (daysUntilExpire >= 7 && pkg.earlyRenewDiscountPercent > 0) {
      isEarlyRenew = true;
      const discount = Math.round((pkg.price * pkg.earlyRenewDiscountPercent) / 100);
      expectedPrice = pkg.price - discount;
    }

    if (dto.amount !== expectedPrice) {
      throw new BadRequestException(
        `Số tiền thanh toán (${dto.amount}đ) không khớp giá gia hạn (${expectedPrice}đ)`,
      );
    }

    // Tính ngày bắt đầu và kết thúc mới (Cộng dồn)
    let newStartDate: Date;
    if (current.endDate.getTime() >= now.getTime()) {
      newStartDate = new Date(current.endDate.getTime() + 24 * 60 * 60 * 1000);
    } else {
      newStartDate = now;
    }

    const newEndDate = new Date(newStartDate);
    newEndDate.setMonth(newEndDate.getMonth() + pkg.durationMonths);

    // Tạo bản ghi thẻ mới được gia hạn
    const membershipCode = this.generateMembershipCode();
    const newMembership = new this.membershipModel({
      membershipCode,
      userId: current.userId,
      packageId: pkg._id,
      packageName: pkg.name,
      startDate: newStartDate,
      endDate: newEndDate,
      status:
        newStartDate.getTime() > now.getTime()
          ? GymMembershipStatus.UPCOMING
          : GymMembershipStatus.ACTIVE,
      rfidCardId: current.rfidCardId,
      pricePaid: dto.amount,
      idempotencyKey: dto.idempotencyKey,
    });

    const saved = await newMembership.save();

    await this.outboxService.recordEvent({
      eventType: 'gym_membership.renewed',
      aggregateType: 'gym_membership',
      aggregateId: saved.id,
      payload: {
        membershipCode: saved.membershipCode,
        userId,
        isEarlyRenew,
        pricePaid: saved.pricePaid,
        newEndDate: saved.endDate.toISOString(),
      },
    });

    await this.auditLogService.record({
      actorId: actorId || userId,
      action: 'GYM_MEMBERSHIP_RENEWED',
      targetType: 'gym_membership',
      targetId: saved.id,
      after: {
        membershipCode: saved.membershipCode,
        pricePaid: saved.pricePaid,
        newEndDate: saved.endDate.toISOString(),
      },
    });

    return saved;
  }

  /**
   * 3. Nâng cấp thẻ hội viên giữa chừng (F10.4)
   * Công thức Pro-Rata (SPEC A10):
   * giá trị còn lại = làm tròn (giá đã trả cũ * số ngày còn lại / tổng số ngày cũ)
   * số tiền phải trả = max(0, giá gói mới - giá trị còn lại)
   * Gói mới bắt đầu từ ngày nâng cấp; gói cũ chuyển UPGRADED; cấm hạ cấp.
   */
  async upgradeMembership(
    userId: string,
    membershipId: string,
    dto: UpgradeGymMembershipDto,
    actorId?: string,
  ): Promise<GymMembershipDocument> {
    assertValidMoney(dto.amount, 'amount');

    if (dto.paymentMethod === ('INTERNAL_WALLET' as any)) {
      throw new BadRequestException('Không được phép thanh toán thẻ gym bằng ví nội bộ');
    }

    const existing = await this.membershipModel
      .findOne({ idempotencyKey: dto.idempotencyKey })
      .exec();
    if (existing) {
      return existing;
    }

    const current = await this.membershipModel.findById(membershipId).exec();
    if (!current || current.userId.toString() !== userId) {
      throw new NotFoundException('Không tìm thấy thẻ hội viên cần nâng cấp');
    }

    if (current.status !== GymMembershipStatus.ACTIVE) {
      throw new BadRequestException('Chỉ có thể nâng cấp thẻ đang trong trạng thái ACTIVE');
    }

    const newPkg = await this.packageModel.findById(dto.newPackageId).exec();
    if (!newPkg || !newPkg.isActive) {
      throw new NotFoundException('Gói thẻ mới không tồn tại hoặc đã ngừng hoạt động');
    }

    if (newPkg.price <= current.pricePaid) {
      throw new BadRequestException('Không thể hạ cấp xuống gói có giá trị thấp hơn hoặc bằng gói cũ');
    }

    const now = new Date();
    const totalDays = Math.max(
      1,
      Math.ceil(
        (current.endDate.getTime() - current.startDate.getTime()) / (24 * 60 * 60 * 1000),
      ),
    );
    const remainingDays = Math.max(
      0,
      Math.ceil((current.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    );

    if (remainingDays <= 0) {
      throw new BadRequestException('Thẻ cũ đã hết hạn sử dụng, vui lòng mua gói mới hoặc gia hạn');
    }

    const remainingValue = Math.round((current.pricePaid * remainingDays) / totalDays);
    const expectedAmountToPay = Math.max(0, newPkg.price - remainingValue);

    if (dto.amount !== expectedAmountToPay) {
      throw new BadRequestException(
        `Số tiền nâng cấp (${dto.amount}đ) không khớp giá trị tính toán theo công thức pro-rata (${expectedAmountToPay}đ)`,
      );
    }

    // Đánh dấu gói cũ sang UPGRADED
    current.status = GymMembershipStatus.UPGRADED;
    await current.save();

    // Tạo gói mới bắt đầu từ hôm nay cho đủ thời hạn mới
    const newStartDate = now;
    const newEndDate = new Date(newStartDate);
    newEndDate.setMonth(newEndDate.getMonth() + newPkg.durationMonths);

    const membershipCode = this.generateMembershipCode();
    const newMembership = new this.membershipModel({
      membershipCode,
      userId: current.userId,
      packageId: newPkg._id,
      packageName: newPkg.name,
      startDate: newStartDate,
      endDate: newEndDate,
      status: GymMembershipStatus.ACTIVE,
      rfidCardId: current.rfidCardId,
      pricePaid: dto.amount,
      idempotencyKey: dto.idempotencyKey,
    });

    const saved = await newMembership.save();

    await this.outboxService.recordEvent({
      eventType: 'gym_membership.upgraded',
      aggregateType: 'gym_membership',
      aggregateId: saved.id,
      payload: {
        membershipCode: saved.membershipCode,
        oldMembershipCode: current.membershipCode,
        userId,
        remainingValue,
        pricePaid: saved.pricePaid,
        newEndDate: saved.endDate.toISOString(),
      },
    });

    await this.auditLogService.record({
      actorId: actorId || userId,
      action: 'GYM_MEMBERSHIP_UPGRADED',
      targetType: 'gym_membership',
      targetId: saved.id,
      after: {
        membershipCode: saved.membershipCode,
        oldMembershipCode: current.membershipCode,
        pricePaid: saved.pricePaid,
      },
    });

    return saved;
  }

  /**
   * 4. Sinh mã QR động 30 giây có chữ ký số HMAC-SHA256 (F10.6)
   */
  async generateDynamicQr(userId: string): Promise<{ qrToken: string; expiresInSeconds: number }> {
    const active = await this.membershipModel
      .findOne({
        userId: new Types.ObjectId(userId),
        status: GymMembershipStatus.ACTIVE,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      })
      .exec();

    if (!active) {
      throw new BadRequestException('Hội viên không có thẻ Gym ACTIVE còn hạn để tạo mã QR');
    }

    const exp = Math.floor(Date.now() / 1000) + 30; // 30s
    const jti = crypto.randomUUID();
    const payload = `${userId}:${exp}:${jti}`;
    const hmac = crypto.createHmac('sha256', this.QR_SECRET).update(payload).digest('hex');
    const qrToken = Buffer.from(`${payload}:${hmac}`).toString('base64');

    return { qrToken, expiresInSeconds: 30 };
  }

  /**
   * 5. Check-In phòng Gym với bộ đếm 100 người & Anti-passback (F10.7, F10.8)
   */
  async checkIn(
    dto: GymCheckInDto,
    operatorId?: string,
  ): Promise<{ success: boolean; currentInside: number; message: string }> {
    let targetUserId: string | undefined;
    let membershipDoc: GymMembershipDocument | null = null;

    if (dto.method === GymAccessMethod.DYNAMIC_QR) {
      if (!dto.qrToken) {
        throw new BadRequestException('Vui lòng cung cấp mã QR động');
      }
      try {
        const decoded = Buffer.from(dto.qrToken, 'base64').toString('utf8');
        const [userId, expStr, jti, hmac] = decoded.split(':');
        if (!userId || !expStr || !jti || !hmac) {
          throw new BadRequestException('Mã QR không hợp lệ');
        }

        const expectedHmac = crypto
          .createHmac('sha256', this.QR_SECRET)
          .update(`${userId}:${expStr}:${jti}`)
          .digest('hex');

        if (hmac !== expectedHmac) {
          throw new BadRequestException('Chữ ký mã QR không hợp lệ');
        }

        const exp = parseInt(expStr, 10);
        if (Math.floor(Date.now() / 1000) > exp) {
          throw new BadRequestException('Mã QR đã hết hạn (quá 30 giây)');
        }

        // Kiểm tra xem QR đã dùng chưa (One-time use)
        const qrUsedKey = `gym:qr:used:${jti}`;
        const isUsed = await this.redisService.client.set(qrUsedKey, 'USED', 'EX', 60, 'NX');
        if (!isUsed) {
          throw new BadRequestException('Mã QR đã được sử dụng trước đó');
        }

        targetUserId = userId;
      } catch (err: any) {
        throw new BadRequestException(`Xác thực mã QR thất bại: ${err.message}`);
      }
    } else if (dto.method === GymAccessMethod.RFID) {
      if (!dto.rfidCardId) {
        throw new BadRequestException('Vui lòng cung cấp mã thẻ RFID');
      }
      membershipDoc = await this.membershipModel
        .findOne({ rfidCardId: dto.rfidCardId, status: GymMembershipStatus.ACTIVE })
        .exec();
      if (!membershipDoc) {
        throw new BadRequestException('Thẻ RFID chưa được gán hoặc thẻ không còn hoạt động');
      }
      targetUserId = membershipDoc.userId.toString();
    } else if (dto.method === GymAccessMethod.MANUAL) {
      if (!dto.reason) {
        throw new BadRequestException('Bắt buộc phải ghi rõ lý do khi lễ tân check-in thủ công');
      }
      if (!dto.membershipId) {
        throw new BadRequestException('Vui lòng chọn thẻ hội viên cần check-in');
      }
      membershipDoc = await this.membershipModel.findById(dto.membershipId).exec();
      if (!membershipDoc) {
        throw new NotFoundException('Không tìm thấy thẻ hội viên');
      }
      targetUserId = membershipDoc.userId.toString();
    }

    if (!targetUserId) {
      throw new BadRequestException('Không xác định được danh tính hội viên');
    }

    // Kiểm tra thẻ hội viên có hợp lệ và còn hạn không
    if (!membershipDoc) {
      membershipDoc = await this.membershipModel
        .findOne({
          userId: new Types.ObjectId(targetUserId),
          status: GymMembershipStatus.ACTIVE,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        })
        .exec();
    }

    if (!membershipDoc || membershipDoc.status !== GymMembershipStatus.ACTIVE) {
      throw new BadRequestException('Hội viên không có thẻ còn hạn sử dụng');
    }

    const now = new Date();
    if (membershipDoc.startDate > now || membershipDoc.endDate < now) {
      throw new BadRequestException('Thẻ hội viên chưa đến ngày bắt đầu hoặc đã hết hạn');
    }

    // Chạy Atomic Lua Script kiểm tra sức chứa 100 người & Anti-passback
    const maxCapacity = this.settingsService.get<number>('gym.capacity', 100);
    const rawResult: any = await this.redisService.client.eval(
      GYM_CHECKIN_LUA,
      1,
      'gym:inside',
      targetUserId,
      maxCapacity,
    );

    const isSuccess = rawResult[0] === 1;
    const code = rawResult[1];
    const currentInside = rawResult[2];

    if (!isSuccess) {
      if (code === 'ANTI_PASSBACK') {
        throw new BadRequestException(
          'Thành viên đang ở trong phòng tập chưa check-out (Anti-passback)',
        );
      }
      if (code === 'GYM_FULL') {
        throw new BadRequestException(
          `Phòng gym đang đầy (${currentInside}/${maxCapacity} người), vui lòng chờ`,
        );
      }
      throw new BadRequestException(`Không thể check-in: ${code}`);
    }

    // Ghi nhận sự kiện GymAccessEvent
    await this.accessEventModel.create({
      userId: new Types.ObjectId(targetUserId),
      membershipId: membershipDoc._id,
      type: GymAccessType.CHECK_IN,
      method: dto.method,
      operatorId: operatorId ? new Types.ObjectId(operatorId) : undefined,
      reason: dto.reason,
      occurredAt: now,
    });

    await this.outboxService.recordEvent({
      eventType: 'gym_access.checked_in',
      aggregateType: 'gym_access',
      aggregateId: targetUserId,
      payload: {
        userId: targetUserId,
        membershipCode: membershipDoc.membershipCode,
        currentInside,
      },
    });

    return {
      success: true,
      currentInside,
      message: 'Check-in thành công. Mời vào phòng tập.',
    };
  }

  /**
   * 6. Check-Out phòng Gym (F10.7)
   */
  async checkOut(
    dto: GymCheckOutDto,
    operatorId?: string,
  ): Promise<{ success: boolean; currentInside: number; message: string }> {
    let targetUserId = dto.userId;

    if (!targetUserId && dto.rfidCardId) {
      const membership = await this.membershipModel
        .findOne({ rfidCardId: dto.rfidCardId })
        .exec();
      if (membership) targetUserId = membership.userId.toString();
    }

    if (!targetUserId && dto.qrToken) {
      try {
        const decoded = Buffer.from(dto.qrToken, 'base64').toString('utf8');
        targetUserId = decoded.split(':')[0];
      } catch {}
    }

    if (!targetUserId) {
      throw new BadRequestException('Không tìm thấy thông tin thành viên cần check-out');
    }

    await this.redisService.client.srem('gym:inside', targetUserId);
    const count = await this.redisService.client.scard('gym:inside');

    const membership = await this.membershipModel
      .findOne({ userId: new Types.ObjectId(targetUserId) })
      .sort({ createdAt: -1 })
      .exec();

    await this.accessEventModel.create({
      userId: new Types.ObjectId(targetUserId),
      membershipId: membership?._id || new Types.ObjectId(),
      type: GymAccessType.CHECK_OUT,
      method: dto.method || GymAccessMethod.RFID,
      operatorId: operatorId ? new Types.ObjectId(operatorId) : undefined,
      occurredAt: new Date(),
    });

    return {
      success: true,
      currentInside: count,
      message: 'Check-out thành công. Hẹn gặp lại quý khách!',
    };
  }

  /**
   * 7. Tự động check-out sau 4 giờ (F10.9)
   */
  async autoCheckoutExpired(hours = 4): Promise<number> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const currentInsideUserIds = await this.redisService.client.smembers('gym:inside');

    let checkedOutCount = 0;
    for (const userId of currentInsideUserIds) {
      const lastCheckIn = await this.accessEventModel
        .findOne({
          userId: new Types.ObjectId(userId),
          type: GymAccessType.CHECK_IN,
        })
        .sort({ occurredAt: -1 })
        .exec();

      if (lastCheckIn && lastCheckIn.occurredAt < cutoff) {
        await this.redisService.client.srem('gym:inside', userId);
        await this.accessEventModel.create({
          userId: new Types.ObjectId(userId),
          membershipId: lastCheckIn.membershipId,
          type: GymAccessType.AUTO_CHECK_OUT,
          method: GymAccessMethod.MANUAL,
          reason: `Tự động check-out sau ${hours} giờ tập`,
          occurredAt: new Date(),
        });
        checkedOutCount++;
      }
    }

    return checkedOutCount;
  }

  /**
   * 8. Đọc trạng thái sức chứa hiện tại (F10.8)
   */
  async getCapacityStatus(): Promise<GymCapacityStatus> {
    const currentInside = await this.redisService.client.scard('gym:inside');
    const maxCapacity = this.settingsService.get<number>('gym.capacity', 100);

    return {
      currentInside,
      maxCapacity,
      isFull: currentInside >= maxCapacity,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * 9. Gán thẻ RFID vật lý cho hội viên (F10.5)
   */
  async assignRfid(membershipId: string, rfidCardId: string, actorId?: string) {
    const existing = await this.membershipModel
      .findOne({
        rfidCardId,
        _id: { $ne: new Types.ObjectId(membershipId) },
        status: GymMembershipStatus.ACTIVE,
      })
      .exec();

    if (existing) {
      throw new BadRequestException('Thẻ RFID này đang được sử dụng bởi một hội viên khác');
    }

    const membership = await this.membershipModel.findById(membershipId).exec();
    if (!membership) {
      throw new NotFoundException('Không tìm thấy thẻ hội viên');
    }

    membership.rfidCardId = rfidCardId;
    const saved = await membership.save();

    await this.auditLogService.record({
      actorId,
      action: 'ASSIGN_RFID_CARD',
      targetType: 'gym_membership',
      targetId: saved.id,
      after: { rfidCardId },
    });

    return saved;
  }

  /**
   * 10. Danh sách gói thẻ Gym đang mở bán
   */
  async getActivePackages() {
    return this.packageModel.find({ isActive: true }).exec();
  }

  /**
   * 11. Danh sách thẻ hội viên của tôi
   */
  async findMyMemberships(userId: string) {
    return this.membershipModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * 12. Danh sách toàn bộ thẻ hội viên cho Admin
   */
  async findAllMemberships(query: {
    status?: GymMembershipStatus;
    phone?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;

    if (query.phone) {
      const user = await this.userModel.findOne({ phone: query.phone }).exec();
      if (user) filter.userId = user._id;
      else return { items: [], total: 0, page, limit };
    }

    const [items, total] = await Promise.all([
      this.membershipModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.membershipModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit };
  }
}
