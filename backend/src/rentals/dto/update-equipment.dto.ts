import { PartialType } from '@nestjs/swagger';
import { CreateEquipmentDto } from './create-equipment.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEquipmentDto extends PartialType(CreateEquipmentDto) {
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
