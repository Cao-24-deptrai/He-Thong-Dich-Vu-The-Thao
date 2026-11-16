import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ _id: false })
export class StaffResponse {
  @ApiProperty({ description: 'ID nhân viên phản hồi' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  respondedBy: Types.ObjectId;

  @ApiProperty({ description: 'Tên nhân viên phản hồi' })
  @Prop({ required: true, trim: true })
  responderName: string;

  @ApiProperty({ description: 'Nội dung phản hồi' })
  @Prop({ required: true, trim: true })
  content: string;

  @ApiProperty({ description: 'Thời điểm phản hồi', default: Date.now })
  @Prop({ default: Date.now })
  respondedAt: Date;
}

export const StaffResponseSchema = SchemaFactory.createForClass(StaffResponse);

@Schema({ timestamps: true, collection: 'reviews' })
export class Review {
  @ApiProperty({ description: 'ID đơn đặt sân (Unique: mỗi đơn chỉ đánh giá 1 lần)' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Booking', required: true, unique: true, index: true })
  bookingId: Types.ObjectId;

  @ApiProperty({ description: 'ID khách hàng' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  customerId: Types.ObjectId;

  @ApiProperty({ description: 'Tên khách hàng' })
  @Prop({ required: true, trim: true })
  customerName: string;

  @ApiProperty({ description: 'Số điện thoại khách', required: false })
  @Prop({ trim: true })
  customerPhone?: string;

  @ApiProperty({ description: 'ID cơ sở thể thao' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Facility', required: true, index: true })
  facilityId: Types.ObjectId;

  @ApiProperty({ description: 'ID sân cụ thể', required: false })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Venue', required: false, index: true })
  venueId?: Types.ObjectId;

  // 4 tiêu chí bắt buộc theo đặc tả SRS
  @ApiProperty({ description: 'Điểm cơ sở vật chất (1-5 sao)', minimum: 1, maximum: 5, example: 5 })
  @Prop({ required: true, min: 1, max: 5 })
  facilityRating: number;

  @ApiProperty({ description: 'Điểm chất lượng dịch vụ (1-5 sao)', minimum: 1, maximum: 5, example: 4 })
  @Prop({ required: true, min: 1, max: 5 })
  serviceRating: number;

  @ApiProperty({ description: 'Điểm thái độ nhân viên (1-5 sao)', minimum: 1, maximum: 5, example: 5 })
  @Prop({ required: true, min: 1, max: 5 })
  staffRating: number;

  @ApiProperty({ description: 'Điểm vệ sinh sân bãi (1-5 sao)', minimum: 1, maximum: 5, example: 4 })
  @Prop({ required: true, min: 1, max: 5 })
  cleanlinessRating: number;

  @ApiProperty({ description: 'Điểm trung bình cộng 4 tiêu chí', example: 4.5 })
  @Prop({ required: true, min: 1, max: 5, index: true })
  overallRating: number;

  @ApiProperty({ description: 'Nội dung nhận xét chi tiết của khách' })
  @Prop({ required: true, trim: true })
  comment: string;

  @ApiProperty({ description: 'Nhân viên phục vụ / check-in gắn với đơn', required: false })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false, index: true })
  staffId?: Types.ObjectId;

  @ApiProperty({
    description: 'Cờ cảnh báo khẩn cấp: true nếu overallRating <= 2 hoặc có tiêu chí <= 2 sao',
    default: false,
  })
  @Prop({ default: false, index: true })
  needsAttention: boolean;

  @ApiProperty({ description: 'Phản hồi từ nhân viên quầy / quản trị', required: false })
  @Prop({ type: StaffResponseSchema, required: false })
  staffResponse?: StaffResponse;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ facilityId: 1, overallRating: -1 });
ReviewSchema.index({ needsAttention: 1, createdAt: -1 });
ReviewSchema.index({ customerId: 1, createdAt: -1 });
