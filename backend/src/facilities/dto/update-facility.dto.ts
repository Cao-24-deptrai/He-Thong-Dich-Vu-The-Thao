import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateFacilityDto } from './create-facility.dto';

export class UpdateFacilityDto extends PartialType(CreateFacilityDto) {
  @ApiProperty({ description: 'Trạng thái hoạt động (Soft delete)', required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
