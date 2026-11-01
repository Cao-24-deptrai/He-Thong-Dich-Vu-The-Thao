import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { CreateReviewDto, QueryReviewDto } from './dto/create-review.dto';
import { RespondReviewDto } from './dto/respond-review.dto';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { Venue, VenueDocument } from '../venues/schemas/venue.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(Venue.name)
    private readonly venueModel: Model<VenueDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  // -------------------------------------------------------------
  // CREATE REVIEW (WITH 7-DAY RULE & BR-REVIEWS ALERT)
  // -------------------------------------------------------------

  async createReview(userId: string, dto: CreateReviewDto): Promise<Review> {
    const booking = await this.bookingModel.findById(dto.bookingId);
    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn đặt sân với ID ${dto.bookingId}`);
    }

    // Must be user's own booking
    if (booking.userId && booking.userId.toString() !== userId) {
      throw new BadRequestException('Bạn chỉ có thể đánh giá cho đơn đặt sân của chính mình.');
    }

    // Must be confirmed or completed
    if (booking.status !== 'CONFIRMED' && (booking.status as string) !== 'COMPLETED') {
      throw new BadRequestException('Chỉ có thể đánh giá cho các đơn đặt sân đã được xác nhận hoặc hoàn thành.');
    }

    // 7-day rule check (BR-1304 in SRS)
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const bookingTime = new Date(booking.bookingDate).getTime();
    if (Date.now() - bookingTime > SEVEN_DAYS_MS) {
      throw new BadRequestException('Đã quá thời hạn 7 ngày gửi đánh giá cho lượt dịch vụ này.');
    }

    // Unique review check (BR-1307 in SRS)
    const existing = await this.reviewModel.findOne({ bookingId: new Types.ObjectId(dto.bookingId) });
    if (existing) {
      throw new ConflictException('Bạn đã gửi đánh giá cho lượt dịch vụ này trước đó.');
    }

    // Fetch User info
    const customer = await this.userModel.findById(userId);
    const customerName = customer ? (customer as any).fullName || customer.phone : 'Khách hàng';
    const customerPhone = customer ? customer.phone : undefined;

    // Fetch Venue & Facility
    const venue = await this.venueModel.findById(booking.venueId);
    if (!venue) {
      throw new NotFoundException('Không tìm thấy sân thể thao tương ứng với đơn đặt chỗ.');
    }

    // Calculate Overall Rating
    const overallRating = Number(
      ((dto.facilityRating + dto.serviceRating + dto.staffRating + dto.cleanlinessRating) / 4).toFixed(1),
    );

    // Alert flag for low scores (<= 2 stars)
    const needsAttention =
      overallRating <= 2 ||
      dto.facilityRating <= 2 ||
      dto.serviceRating <= 2 ||
      dto.staffRating <= 2 ||
      dto.cleanlinessRating <= 2;

    const review = new this.reviewModel({
      bookingId: booking._id,
      customerId: new Types.ObjectId(userId),
      customerName,
      customerPhone,
      facilityId: venue.facilityId,
      venueId: venue._id,
      facilityRating: dto.facilityRating,
      serviceRating: dto.serviceRating,
      staffRating: dto.staffRating,
      cleanlinessRating: dto.cleanlinessRating,
      overallRating,
      comment: dto.comment.trim(),
      needsAttention,
    });

    return review.save();
  }

  // -------------------------------------------------------------
  // REVIEWS SUMMARY & AGGREGATION
  // -------------------------------------------------------------

  async getReviewSummary(facilityId?: string) {
    const matchFilter: Record<string, any> = {};
    if (facilityId) {
      matchFilter.facilityId = new Types.ObjectId(facilityId);
    }

    const [stats] = await this.reviewModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          avgOverall: { $avg: '$overallRating' },
          avgFacility: { $avg: '$facilityRating' },
          avgService: { $avg: '$serviceRating' },
          avgStaff: { $avg: '$staffRating' },
          avgCleanliness: { $avg: '$cleanlinessRating' },
          star5Count: { $sum: { $cond: [{ $gte: ['$overallRating', 4.5] }, 1, 0] } },
          star4Count: { $sum: { $cond: [{ $and: [{ $gte: ['$overallRating', 3.5] }, { $lt: ['$overallRating', 4.5] }] }, 1, 0] } },
          star3Count: { $sum: { $cond: [{ $and: [{ $gte: ['$overallRating', 2.5] }, { $lt: ['$overallRating', 3.5] }] }, 1, 0] } },
          star2Count: { $sum: { $cond: [{ $and: [{ $gte: ['$overallRating', 1.5] }, { $lt: ['$overallRating', 2.5] }] }, 1, 0] } },
          star1Count: { $sum: { $cond: [{ $lt: ['$overallRating', 1.5] }, 1, 0] } },
          needsAttentionCount: { $sum: { $cond: ['$needsAttention', 1, 0] } },
        },
      },
    ]);

    if (!stats) {
      return {
        totalReviews: 0,
        avgOverall: 5.0,
        avgFacility: 5.0,
        avgService: 5.0,
        avgStaff: 5.0,
        avgCleanliness: 5.0,
        starsBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        needsAttentionCount: 0,
      };
    }

    return {
      totalReviews: stats.totalReviews,
      avgOverall: Number(stats.avgOverall.toFixed(1)),
      avgFacility: Number(stats.avgFacility.toFixed(1)),
      avgService: Number(stats.avgService.toFixed(1)),
      avgStaff: Number(stats.avgStaff.toFixed(1)),
      avgCleanliness: Number(stats.avgCleanliness.toFixed(1)),
      starsBreakdown: {
        5: stats.star5Count,
        4: stats.star4Count,
        3: stats.star3Count,
        2: stats.star2Count,
        1: stats.star1Count,
      },
      needsAttentionCount: stats.needsAttentionCount,
    };
  }

  // -------------------------------------------------------------
  // QUERY & STAFF RESPONSE
  // -------------------------------------------------------------

  async findAll(query: QueryReviewDto): Promise<Review[]> {
    const filter: Record<string, any> = {};

    if (query.facilityId) filter.facilityId = new Types.ObjectId(query.facilityId);
    if (query.venueId) filter.venueId = new Types.ObjectId(query.venueId);
    if (query.needsAttention === 'true') filter.needsAttention = true;
    if (query.rating) {
      const r = Number(query.rating);
      filter.overallRating = { $gte: r, $lt: r + 1 };
    }

    return this.reviewModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<Review> {
    const review = await this.reviewModel.findById(id).exec();
    if (!review) {
      throw new NotFoundException(`Không tìm thấy đánh giá với ID ${id}`);
    }
    return review;
  }

  async respondToReview(reviewId: string, staffUser: any, dto: RespondReviewDto): Promise<Review> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException(`Không tìm thấy đánh giá với ID ${reviewId}`);
    }

    review.staffResponse = {
      respondedBy: new Types.ObjectId(staffUser.userId || staffUser._id),
      responderName: staffUser.fullName || staffUser.phone || 'Quản trị viên',
      content: dto.content.trim(),
      respondedAt: new Date(),
    };

    return review.save();
  }

  async dismissAttention(reviewId: string): Promise<Review> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException(`Không tìm thấy đánh giá với ID ${reviewId}`);
    }
    review.needsAttention = false;
    return review.save();
  }
}
