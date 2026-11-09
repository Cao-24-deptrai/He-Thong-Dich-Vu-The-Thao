import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '@sports/shared';

export type UserDocument = User & Document;

@Schema({ _id: false })
export class InvoiceInfo {
  @Prop() taxId?: string;
  @Prop() companyName?: string;
  @Prop() address?: string;
  @Prop() email?: string;
}

@Schema({ _id: false })
export class UserConsents {
  @Prop({ default: true }) personalData!: boolean;
  @Prop({ default: false }) biometric!: boolean;
  @Prop({ default: false }) marketing!: boolean;
  @Prop({ default: '1.0' }) termsVersion!: string;
  @Prop() consentedAt?: Date;
}

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, enum: ['CUSTOMER', 'STAFF'], default: 'CUSTOMER', index: true })
  type!: 'CUSTOMER' | 'STAFF';

  @Prop({ required: true, unique: true, index: true })
  phone!: string;

  @Prop({ index: true })
  email?: string;

  @Prop({ required: true })
  fullName!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({
    required: true,
    enum: ['ACTIVE', 'LOCKED', 'PENDING_ACTIVATION', 'ANONYMIZED'],
    default: 'ACTIVE',
    index: true,
  })
  status!: 'ACTIVE' | 'LOCKED' | 'PENDING_ACTIVATION' | 'ANONYMIZED';

  @Prop({ required: true, enum: Role, default: Role.CUSTOMER, index: true })
  role!: Role;

  @Prop({ type: [String], default: [] })
  permissions!: string[];

  @Prop({ type: InvoiceInfo, default: () => ({}) })
  invoiceInfo!: InvoiceInfo;

  @Prop({ type: UserConsents, default: () => ({}) })
  consents!: UserConsents;

  @Prop({ type: Object, default: () => ({ push: true, zns: true, email: true }) })
  notificationPreferences!: { push: boolean; zns: boolean; email: boolean };

  @Prop({ type: [String], default: [] })
  fcmTokens!: string[];

  @Prop({ default: 0 })
  failedLoginAttempts!: number;

  @Prop()
  lockedUntil?: Date;

  @Prop()
  lastLoginAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
