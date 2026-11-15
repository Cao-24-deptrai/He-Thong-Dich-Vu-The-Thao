import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type FacilityDocument = Facility & Document;

@Schema()
export class Facility {
  @ApiProperty({ description: 'Facility name', example: 'Tổ hợp Thể thao Mỹ Đình' })
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty({ description: 'Full address', example: 'Số 1 Lê Đức Thọ, Nam Từ Liêm, Hà Nội' })
  @Prop({ type: String, required: true })
  address: string;

  @ApiProperty({
    description: 'GeoJSON Location [longitude, latitude]',
    example: { type: 'Point', coordinates: [105.7725, 21.0185] },
  })
  @Prop(
    raw({
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    }),
  )
  location: {
    type: string;
    coordinates: number[];
  };

  @ApiProperty({ description: 'List of sport types offered', example: ['FOOTBALL', 'BADMINTON', 'ESPORT'] })
  @Prop({ type: [String], default: [] })
  sportTypes: string[];

  @ApiProperty({ description: 'Owner user ID', required: false })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  ownerId?: Types.ObjectId;

  @ApiProperty({ description: 'Trạng thái hoạt động (Soft delete)', default: true })
  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const FacilitySchema = SchemaFactory.createForClass(Facility);
FacilitySchema.index({ location: '2dsphere' });
