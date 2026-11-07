import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type RentalTicketDocument = RentalTicket & Document;

@Schema({ timestamps: true })
export class RentalTicket {
  @ApiProperty({ description: 'Rental ticket code', example: 'RENT-20261027-101' })
  @Prop({ type: String, required: true, unique: true })
  ticketCode: string;

  @ApiProperty({ description: 'Rental Item ID' })
  @Prop({ type: String, required: true })
  itemId: string;

  @ApiProperty({ description: 'Item name', example: 'Bóng Molten Vantaggio 5000' })
  @Prop({ type: String, required: true })
  itemName: string;

  @ApiProperty({ description: 'Rented quantity', example: 2 })
  @Prop({ type: Number, required: true, default: 1 })
  quantity: number;

  @ApiProperty({ description: 'Customer Name', example: 'Nguyễn Văn Tuấn' })
  @Prop({ type: String, required: true })
  customerName: string;

  @ApiProperty({ description: 'Customer Phone', example: '0987654321' })
  @Prop({ type: String, required: true })
  customerPhone: string;

  @ApiProperty({ description: 'Total deposit amount in VND', example: 400000 })
  @Prop({ type: Number, required: true })
  depositAmount: number;

  @ApiProperty({ description: 'Rental fee in VND', example: 100000 })
  @Prop({ type: Number, required: true })
  rentalFee: number;

  @ApiProperty({ description: 'Total money collected (Rental fee + Deposit) in VND', example: 500000 })
  @Prop({ type: Number, required: true })
  totalCollected: number;

  @ApiProperty({ description: 'Rental status', example: 'RENTING', default: 'RENTING' })
  @Prop({ type: String, enum: ['RENTING', 'RETURNED'], default: 'RENTING' })
  status: string;

  @ApiProperty({ description: 'Rental start timestamp' })
  @Prop({ type: Date, default: Date.now })
  rentedAt: Date;

  @ApiProperty({ description: 'Return timestamp', required: false })
  @Prop({ type: Date })
  returnedAt?: Date;
}

export const RentalTicketSchema = SchemaFactory.createForClass(RentalTicket);

RentalTicketSchema.index({ status: 1 });
RentalTicketSchema.index({ customerPhone: 1 });
