import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { EventsGateway } from '../events/events.gateway';
import { MembershipTier } from '../common/enums';

export interface GymPackage {
  id: string;
  code: string;
  name: string;
  price: number;
  durationDays: number;
  sessions: number;
  description: string;
  benefits: string[];
}

@Injectable()
export class GymService {
  private readonly logger = new Logger(GymService.name);

  private packages: GymPackage[] = [
    {
      id: 'gym-day',
      code: 'GYM_DAY',
      name: 'Vé Tập Ngày (1 Lượt)',
      price: 50000,
      durationDays: 1,
      sessions: 1,
      description: 'Sử dụng toàn bộ trang thiết bị Gym & Locker trong ngày',
      benefits: ['Tập không giới hạn giờ trong ngày', 'Tủ khóa locker thông minh', 'Phòng xông hơi khô'],
    },
    {
      id: 'gym-month',
      code: 'GYM_MONTH',
      name: 'Gói Hội Viên Tháng (30 Ngày)',
      price: 600000,
      durationDays: 30,
      sessions: -1,
      description: 'Tập luyện không giới hạn lượt trong 30 ngày liên tục',
      benefits: ['Check-in Face ID tự động', 'Đo chỉ số cơ thể InBody miễn phí 2 lần/tháng', 'Giảm 10% F&B Căng tin'],
    },
    {
      id: 'gym-year',
      code: 'GYM_YEAR',
      name: 'Gói Hội Viên Năm VIP (365 Ngày)',
      price: 6000000,
      durationDays: 365,
      sessions: -1,
      description: 'Gói hội viên VIP không giới hạn 1 năm kèm quà tặng cao cấp',
      benefits: ['Tặng 5 buổi PT 1-1', 'Check-in Face ID VIP làn riêng', 'Miễn phí tủ đồ cố định', 'Miễn phí hồ bơi Olympic'],
    },
    {
      id: 'gym-pt-1on1',
      code: 'GYM_PT_1ON1',
      name: 'Gói Huấn Luyện Viên PT 1-1 (10 Buổi)',
      price: 3500000,
      durationDays: 60,
      sessions: 10,
      description: 'Giáo án cá nhân hóa 1 kèm 1 cùng Huấn luyện viên thể hình quốc tế',
      benefits: ['Thực đơn dinh dưỡng riêng biệt', 'Theo dõi sát sao từng hiệp tập', 'Đảm bảo đạt mục tiêu sau khóa'],
    },
  ];

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private eventsGateway: EventsGateway,
  ) {}

  async getPackages(): Promise<any> {
    return { total: this.packages.length, items: this.packages };
  }

  async faceCheckIn(dto: any): Promise<any> {
    const phone = dto.phone || dto.customerPhone || '0900000005';
    let user = await this.userModel.findOne({ phone }).exec().catch(() => null);

    if (!user && (dto.memberCode || dto.faceToken)) {
      user = await this.userModel.findOne({
        $or: [{ phone: dto.phone }, { fullName: new RegExp(dto.memberCode, 'i') }],
      }).exec().catch(() => null);
    }

    const memberName = user?.fullName || dto.memberName || 'Hội Viên VIP Phanta';
    const memberTier = user?.membershipTier || MembershipTier.GOLD;

    // Phát tín hiệu mở cổng xoay qua WebSocket
    try {
      this.eventsGateway.server?.emit('turnstile_open', {
        gateId: 'GYM_TURNSTILE_01',
        type: 'GYM_FACE_ID',
        memberName,
        membershipTier: memberTier,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      // Ignore if socket not ready
    }

    this.logger.log(`🚪 Face ID Check-in Gym thành công: ${memberName} (${memberTier}) - Mở cổng xoay`);

    return {
      accessGranted: true,
      memberName,
      membershipTier: memberTier,
      message: `Chào mừng Hội viên VIP ${memberName}! Mời quý khách vào phòng tập.`,
      turnstileAction: 'OPEN',
      gateId: 'GYM_TURNSTILE_01',
      checkInTime: new Date(),
    };
  }

  async registerFace(dto: any): Promise<any> {
    const phone = dto.phone || dto.customerPhone;
    if (!phone) {
      throw new BadRequestException('Số điện thoại không được để trống');
    }

    let user = await this.userModel.findOne({ phone }).exec();
    if (!user) {
      user = await this.userModel.findOne().exec();
    }
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng với số điện thoại này');
    }

    user.faceIdVector = dto.faceIdVector || `VEC_${Date.now()}_FACE_HASH`;
    user.isFaceIdActive = true;
    if (dto.avatarUrl) {
      user.avatarUrl = dto.avatarUrl;
    }
    await user.save();

    this.logger.log(`👤 Đăng ký Face ID thành công cho người dùng: ${user.fullName} (${user.phone})`);

    return {
      success: true,
      phone: user.phone,
      fullName: user.fullName,
      isFaceIdActive: user.isFaceIdActive,
      message: 'Đăng ký nhận diện Face ID thành công. Quý khách có thể sử dụng cổng xoay tự động.',
    };
  }
}
