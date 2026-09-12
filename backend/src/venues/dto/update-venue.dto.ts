import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateVenueDto } from './create-venue.dto';

export class UpdateVenueDto extends PartialType(CreateVenueDto) {
  @ApiProperty({ description: 'Trạng thái hoạt động (Soft delete)', required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
