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
import {
  GymPlanType,
  GymQrStatus,
  GYM_PLANS,
  GymPlanConfig,
} from './enums/gym-plan-type.enum';
import {
  GymQrCredential,
  GymQrCredentialDocument,
} from './schemas/gym-qr-credential.schema';
import {
  GymSubscription,
  GymSubscriptionDocument,
} from './schemas/gym-subscription.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class GymMembershipService {
  private readonly logger = new Logger(GymMembershipService.name);

  constructor(
    @InjectModel(GymQrCredential.name)
    private readonly qrCredentialModel: Model<GymQrCredentialDocument>,
    @InjectModel(GymSubscription.name)
    private readonly subscriptionModel: Model<GymSubscriptionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Lấy danh sách 4 gói tập Gym chuẩn theo BR-27 (1 ngày, 1 tháng, 3 tháng, 6 tháng, không có gói năm)
   */
  getPlans(): GymPlanConfig[] {
    return Object.values(GYM_PLANS);
  }

  /**
   * Lấy cấu hình chi tiết của một gói tập
   */
  getPlanByCode(planCode: GymPlanType): GymPlanConfig {
    const plan = GYM_PLANS[planCode];
    if (!plan) {
      throw new BadRequestException(`Gói tập gym "${planCode}" không hợp lệ. Hệ thống chỉ hỗ trợ gói 1 ngày, 1, 3, 6 tháng (BR-27).`);
    }
    return plan;
  }

  /**
   * Lấy thông tin mã QR định danh duy nhất của khách hàng (BR-26, BR-30a)
   * Tự động cập nhật trạng thái EXPIRED nếu gói tập đã hết hạn (AC-70).
   */
  async getQrCredential(userId: string): Promise<GymQrCredentialDocument | null> {
    const credential = await this.qrCredentialModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    if (!credential) {
      return null;
    }

    const now = new Date();
    if (now > credential.activeUntil && credential.status !== GymQrStatus.EXPIRED) {
      credential.status = GymQrStatus.EXPIRED;
      await credential.save();
      this.logger.log(`⚠️ Mã QR Gym của user ${userId} đã hết hạn -> Chuyển sang EXPIRED (AC-70)`);
    }

    return credential;
  }

  /**
   * Tính toán số tiền khấu trừ từ các ngày chưa sử dụng của gói cũ khi nâng cấp (BR-28)
   */
  async calculateUpgradeCredit(
    userId: string,
    targetPlanCode: GymPlanType,
  ): Promise<{
    hasActivePlan: boolean;
    remainingDays: number;
    creditDeducted: number;
    targetPlanPrice: number;
    finalAmount: number;
    currentPlanName?: string;
  }> {
    const targetPlan = this.getPlanByCode(targetPlanCode);

    const credential = await this.qrCredentialModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    const now = new Date();
    // Nếu chưa có thẻ hoặc thẻ đã hết hạn
    if (!credential || now >= credential.activeUntil) {
      return {
        hasActivePlan: false,
        remainingDays: 0,
        creditDeducted: 0,
        targetPlanPrice: targetPlan.price,
        finalAmount: targetPlan.price,
      };
    }

    // Tìm subscription đang hoạt động gần nhất
    const activeSub = await this.subscriptionModel
      .findOne({
        userId: new Types.ObjectId(userId),
        status: 'ACTIVE',
        endDate: { $gt: now },
      })
      .sort({ createdAt: -1 })
      .exec();

    if (!activeSub) {
      return {
        hasActivePlan: false,
        remainingDays: 0,
        creditDeducted: 0,
        targetPlanPrice: targetPlan.price,
        finalAmount: targetPlan.price,
      };
    }

    // Tính số ngày còn lại chưa dùng
    const msDiff = credential.activeUntil.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));

    if (remainingDays <= 0) {
      return {
        hasActivePlan: false,
        remainingDays: 0,
        creditDeducted: 0,
        targetPlanPrice: targetPlan.price,
        finalAmount: targetPlan.price,
        currentPlanName: activeSub.planName,
      };
    }

    // Giá trị mỗi ngày của gói cũ = paidAmount / durationDays
    const dailyRate = activeSub.paidAmount / (activeSub.durationDays || 1);
    const rawCredit = dailyRate * remainingDays;
    const creditDeducted = Math.min(Math.round(rawCredit), targetPlan.price);
    const finalAmount = Math.max(0, targetPlan.price - creditDeducted);

    return {
      hasActivePlan: true,
      remainingDays,
      creditDeducted,
      targetPlanPrice: targetPlan.price,
      finalAmount,
      currentPlanName: activeSub.planName,
    };
  }

  /**
   * Mua mới, gia hạn hoặc nâng cấp gói tập Gym (BR-26, BR-27, BR-28, AC-70)
   */
  async purchaseOrRenewPlan(
    userId: string,
    planCode: GymPlanType,
    options?: {
      isUpgrade?: boolean;
      paymentId?: string;
    },
  ): Promise<{
    credential: GymQrCredentialDocument;
    subscription: GymSubscriptionDocument;
    isNewCredential: boolean;
    isRenewal: boolean;
    isUpgrade: boolean;
    paidAmount: number;
    creditDeducted: number;
  }> {
    const plan = this.getPlanByCode(planCode);
    const isUpgrade = options?.isUpgrade === true;
    const now = new Date();

    let credential = await this.qrCredentialModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    let isNewCredential = false;
    let isRenewal = false;
    let creditDeducted = 0;
    let paidAmount = plan.price;
    let newStartDate: Date;
    let newEndDate: Date;

    // --- TRƯỜNG HỢP 1: MUA LẦN ĐẦU TIÊN (CHƯA CÓ MÃ QR) ---
    if (!credential) {
      isNewCredential = true;
      newStartDate = now;
      newEndDate = new Date(now.getTime() + plan.durationDays * 86400000);

      // Cấp duy nhất 1 mã QR định danh bảo mật cho tài khoản (BR-26, BR-30a)
      const uniqueSuffix = randomBytes(4).toString('hex').toUpperCase();
      const qrCode = `PHANTA_GYM_${userId.slice(-6).toUpperCase()}_${uniqueSuffix}`;

      credential = new this.qrCredentialModel({
        userId: new Types.ObjectId(userId),
        qrCode,
        status: GymQrStatus.ACTIVE,
        activeUntil: newEndDate,
        currentPlanCode: planCode,
        issuedAt: now,
        lastRenewedAt: now,
      });
      await credential.save();

      this.logger.log(`🎟️ Cấp mã QR định danh Gym mới cho user ${userId}: ${qrCode} (Hạn: ${newEndDate.toISOString()})`);
    } else {
      // --- TRƯỜNG HỢP 2: ĐÃ CÓ MÃ QR TỪ TRƯỚC ---
      const hasActivePeriod = credential.activeUntil > now;

      if (isUpgrade && hasActivePeriod) {
        // --- 2A: NÂNG CẤP GÓI (UPGRADE) VÀ KHẤU TRỪ TIỀN CHƯA DÙNG (BR-28) ---
        const upgradeCalc = await this.calculateUpgradeCredit(userId, planCode);
        creditDeducted = upgradeCalc.creditDeducted;
        paidAmount = upgradeCalc.finalAmount;

        // Đánh dấu gói cũ chuyển thành UPGRADED
        await this.subscriptionModel.updateMany(
          { userId: new Types.ObjectId(userId), status: 'ACTIVE' },
          { $set: { status: 'UPGRADED' } },
        );

        // Hạn mới tính từ ngày nâng cấp
        newStartDate = now;
        newEndDate = new Date(now.getTime() + plan.durationDays * 86400000);

        credential.activeUntil = newEndDate;
        credential.currentPlanCode = planCode;
        credential.status = GymQrStatus.ACTIVE;
        credential.lastRenewedAt = now;
        await credential.save();

        this.logger.log(
          `🚀 User ${userId} nâng cấp lên ${planCode}: Khấu trừ ${creditDeducted}đ, thực trả ${paidAmount}đ. Dùng lại mã QR ${credential.qrCode}`,
        );
      } else if (hasActivePeriod) {
        // --- 2B: GIA HẠN CỘNG DỒN TIẾP NỐI HẠN CŨ (BR-28) ---
        isRenewal = true;
        newStartDate = credential.activeUntil;
        newEndDate = new Date(credential.activeUntil.getTime() + plan.durationDays * 86400000);

        credential.activeUntil = newEndDate;
        credential.currentPlanCode = planCode;
        credential.status = GymQrStatus.ACTIVE;
        credential.lastRenewedAt = now;
        await credential.save();

        this.logger.log(
          `🔄 User ${userId} gia hạn tiếp nối gói ${planCode}: Hạn mới cộng dồn đến ${newEndDate.toISOString()}`,
        );
      } else {
        // --- 2C: GIA HẠN SAU KHI ĐÃ HẾT HẠN (AC-70) ---
        isRenewal = true;
        newStartDate = now;
        newEndDate = new Date(now.getTime() + plan.durationDays * 86400000);

        // Kích hoạt lại mã QR cũ sang ACTIVE ngay lập tức, không sinh mã mới (AC-70)
        credential.activeUntil = newEndDate;
        credential.currentPlanCode = planCode;
        credential.status = GymQrStatus.ACTIVE;
        credential.lastRenewedAt = now;
        await credential.save();

        this.logger.log(
          `⚡ Kích hoạt lại mã QR cũ ${credential.qrCode} sang ACTIVE cho user ${userId} sau khi gia hạn (AC-70)`,
        );
      }
    }

    // Ghi nhận Subscription
    const subscription = new this.subscriptionModel({
      userId: new Types.ObjectId(userId),
      planCode,
      planName: plan.name,
      durationDays: plan.durationDays,
      originalPrice: plan.price,
      creditDeducted,
      paidAmount,
      startDate: newStartDate,
      endDate: newEndDate,
      isUpgrade,
      status: 'ACTIVE',
      paymentId: options?.paymentId,
    });
    await subscription.save();

    return {
      credential,
      subscription,
      isNewCredential,
      isRenewal,
      isUpgrade,
      paidAmount,
      creditDeducted,
    };
  }

  /**
   * Xem lịch sử các gói tập của khách hàng
   */
  async getUserSubscriptions(userId: string): Promise<GymSubscriptionDocument[]> {
    return this.subscriptionModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }
}
