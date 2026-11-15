import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import {
  MembershipPass,
  MembershipPassDocument,
} from './schemas/membership-pass.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { MembershipPassType, PaymentProvider, PaymentStatus } from '../common/enums';
import { PurchasePassDto, CheckInPassDto } from './dto/membership-pass.dto';

@Injectable()
export class MembershipPassService {
  private readonly logger = new Logger(MembershipPassService.name);

  constructor(
    @InjectModel(MembershipPass.name)
    private passModel: Model<MembershipPassDocument>,
    @InjectModel(Payment.name)
    private paymentModel: Model<PaymentDocument>,
    private jwtService: JwtService,
  ) {}

  /**
   * Mua gói tập gym (Mục 6.1: SINGLE_PASS, MONTHLY_PASS, YEARLY_PASS)
   */
  async purchasePass(userId: string, dto: PurchasePassDto) {
    let amount = 60000;
    let totalCheckIns = 1;
    let daysValid = 1;

    switch (dto.type) {
      case MembershipPassType.SINGLE_PASS:
        amount = 60000;
        totalCheckIns = 1;
        daysValid = 1;
        break;
      case MembershipPassType.MONTHLY_PASS:
        amount = 500000;
        totalCheckIns = 30;
        daysValid = 30;
        break;
      case MembershipPassType.YEARLY_PASS:
        amount = 4500000;
        totalCheckIns = 365;
        daysValid = 365;
        break;
      default:
        throw new BadRequestException('Loại gói thẻ Gym không hợp lệ');
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysValid);

    // 1. Tạo MembershipPass
    const pass = new this.passModel({
      userId: new Types.ObjectId(userId),
      type: dto.type,
      totalCheckIns,
      remainingCheckIns: totalCheckIns,
      expiryDate,
    });
    const savedPass = await pass.save();

    // 2. Ghi nhận giao dịch thanh toán
    const payment = new this.paymentModel({
      passId: savedPass._id,
      amount,
      provider: dto.paymentProvider || PaymentProvider.PAYOS,
      transactionId: `GYM_TX_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      status: PaymentStatus.SUCCESS,
      rawPayload: {
        passId: savedPass._id,
        passType: dto.type,
        userId,
      },
    });
    const savedPayment = await payment.save();

    this.logger.log(`✅ Khách hàng ${userId} đã mua thành công gói ${dto.type} (ID: ${savedPass._id})`);

    return {
      success: true,
      pass: savedPass,
      payment: savedPayment,
      message: `Mua thẻ tập Gym ${dto.type} thành công! Có ${totalCheckIns} lượt tập, hạn dùng đến ${expiryDate.toLocaleDateString('vi-VN')}.`,
    };
  }

  /**
   * Xem danh sách thẻ tập của khách hàng hiện tại
   */
  async getUserPasses(userId: string) {
    const passes = await this.passModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();

    const now = new Date();
    return passes.map((pass) => {
      const isExpired = pass.expiryDate ? now > pass.expiryDate : false;
      const isDepleted = (pass.remainingCheckIns ?? 0) <= 0;
      return {
        ...pass.toObject(),
        isExpired,
        isDepleted,
        status: isExpired ? 'EXPIRED' : isDepleted ? 'DEPLETED' : 'ACTIVE',
      };
    });
  }

  /**
   * Chi tiết thẻ tập theo ID
   */
  async getPassById(passId: string) {
    const pass = await this.passModel.findById(passId).populate('userId', 'fullName phone email').exec();
    if (!pass) {
      throw new NotFoundException('Không tìm thấy thẻ tập Gym');
    }
    return pass;
  }

  /**
   * Sinh mã QR động 60s cho thẻ tập Gym
   */
  async generatePassQr(passId: string, userId: string) {
    const pass = await this.passModel.findById(passId).exec();
    if (!pass) {
      throw new NotFoundException('Không tìm thấy thẻ tập Gym');
    }

    if (pass.userId?.toString() !== userId) {
      throw new ConflictException('Bạn không có quyền sử dụng thẻ tập này');
    }

    if (pass.expiryDate && new Date() > pass.expiryDate) {
      throw new BadRequestException('Thẻ tập đã hết hạn sử dụng (PASS_EXPIRED)');
    }

    if ((pass.remainingCheckIns ?? 0) <= 0) {
      throw new BadRequestException('Thẻ tập đã hết số lượt vào phòng (NO_REMAINING_CHECKINS)');
    }

    const payload = {
      passId: pass._id.toString(),
      userId,
      type: 'GYM_PASS',
      jti: randomUUID(),
    };

    const qrToken = this.jwtService.sign(payload, { expiresIn: '60s' });
    const expiresAt = new Date(Date.now() + 60 * 1000);

    return {
      qrToken,
      expiresInSeconds: 60,
      expiresAt,
      passId: pass._id,
      passType: pass.type,
      remainingCheckIns: pass.remainingCheckIns,
      expiryDate: pass.expiryDate,
    };
  }

  /**
   * Nhân viên / Cổng soát vé quẹt mã check-in trừ 1 lượt (Mục 6.1)
   */
  async checkInPass(dto: CheckInPassDto) {
    let targetPassId = dto.passId;

    if (dto.qrToken) {
      try {
        const decoded: any = this.jwtService.verify(dto.qrToken);
        targetPassId = decoded.passId;
      } catch (err) {
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'QR_TOKEN_EXPIRED',
          message: 'Mã QR thẻ tập đã hết hạn (quá 60s) hoặc không hợp lệ. Vui lòng tạo lại mã!',
        });
      }
    }

    if (!targetPassId) {
      throw new BadRequestException('Vui lòng cung cấp passId hoặc qrToken hợp lệ');
    }

    const pass = await this.passModel.findById(targetPassId).populate('userId', 'fullName phone').exec();
    if (!pass) {
      throw new NotFoundException('Không tìm thấy thẻ tập Gym');
    }

    // Kiểm tra hết hạn
    if (pass.expiryDate && new Date() > pass.expiryDate) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'PASS_EXPIRED',
        message: 'Thẻ tập đã hết hạn sử dụng!',
      });
    }

    // Kiểm tra số lượt còn lại
    if ((pass.remainingCheckIns ?? 0) <= 0) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'NO_REMAINING_CHECKINS',
        message: 'Thẻ tập đã hết số lượt check-in!',
      });
    }

    // Nguyên tử: Trừ 1 lượt
    const updatedPass = await this.passModel.findOneAndUpdate(
      { _id: pass._id, remainingCheckIns: { $gt: 0 } },
      { $inc: { remainingCheckIns: -1 } },
      { new: true },
    );

    if (!updatedPass) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'NO_REMAINING_CHECKINS',
        message: 'Không thể trừ lượt, thẻ tập đã hết lượt!',
      });
    }

    this.logger.log(`🏋️ Đã check-in thẻ Gym ${pass._id} thành công. Lượt còn lại: ${updatedPass.remainingCheckIns}`);

    return {
      success: true,
      message: 'Check-in phòng Gym thành công!',
      passId: updatedPass._id,
      passType: updatedPass.type,
      remainingCheckIns: updatedPass.remainingCheckIns,
      totalCheckIns: updatedPass.totalCheckIns,
      expiryDate: updatedPass.expiryDate,
      user: pass.userId,
    };
  }

  /**
   * Danh sách tất cả thẻ tập (dành cho Web Admin quản lý)
   */
  async getAllPassesForAdmin() {
    return this.passModel
      .find()
      .populate('userId', 'fullName phone email')
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
  }
}
