import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ClassRegistrationStatus, PaymentMethod } from '@sports/shared';

export type ClassRegistrationDocument = ClassRegistration & Document;

@Schema({ timestamps: true, collection: 'class_registrations' })
export class ClassRegistration {
  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'ClassSession' })
  sessionId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'User' })
  customerId!: Types.ObjectId;

  @Prop({ trim: true })
  customerName?: string;

  @Prop({ required: true, trim: true, index: true })
  customerPhone!: string;

  @Prop({ required: true, min: 0 })
  pricePaid!: number;

  @Prop({
    type: String,
    enum: Object.values(PaymentMethod),
    required: true,
  })
  paymentMethod!: PaymentMethod;

  @Prop({ type: Types.ObjectId, ref: 'UserPackage' })
  userPackageId?: Types.ObjectId; // Nếu trừ từ gói combo

  @Prop({ type: Date, required: true, default: Date.now })
  registeredAt!: Date;

  @Prop({
    type: String,
    enum: Object.values(ClassRegistrationStatus),
    default: ClassRegistrationStatus.REGISTERED,
    index: true,
  })
  status!: ClassRegistrationStatus;

  @Prop({ type: Date })
  checkedInAt?: Date;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ trim: true })
  cancellationReason?: string;

  @Prop({ required: true, unique: true, index: true })
  idempotencyKey!: string;
}

export const ClassRegistrationSchema = SchemaFactory.createForClass(ClassRegistration);

// Chặn khách hàng đăng ký 2 lần cho cùng một buổi học (nếu đăng ký chưa bị hủy)
ClassRegistrationSchema.index(
  { sessionId: 1, customerId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: [ClassRegistrationStatus.REGISTERED, ClassRegistrationStatus.CHECKED_IN] } },
  },
);
