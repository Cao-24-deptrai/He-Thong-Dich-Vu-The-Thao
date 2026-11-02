import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TournamentType,
  TournamentFormat,
  PaymentProvider,
} from '../../common/enums';

export class TeamMemberDto {
  @ApiPropertyOptional({ description: 'Member User ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Full Name' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ description: 'Phone Number' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'In-game Name or Jersey Number' })
  @IsOptional()
  @IsString()
  inGameNameOrJerseyNumber?: string;

  @ApiPropertyOptional({ description: 'Is captain' })
  @IsOptional()
  isCaptain?: boolean;
}

export class CreateTournamentDto {
  @ApiProperty({ description: 'Unique Tournament Code', example: 'CUP-PHANTA-2026' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ description: 'Tournament Name', example: 'Giải Bóng Đá Tứ Hùng Phanta 2026' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ enum: TournamentType, example: TournamentType.SPORT })
  @IsNotEmpty()
  @IsEnum(TournamentType)
  type: TournamentType;

  @ApiProperty({ description: 'Sport or Esport game name', example: 'Bóng đá 7 người' })
  @IsNotEmpty()
  @IsString()
  sportOrGame: string;

  @ApiProperty({ enum: TournamentFormat, example: TournamentFormat.SINGLE_ELIMINATION })
  @IsNotEmpty()
  @IsEnum(TournamentFormat)
  format: TournamentFormat;

  @ApiProperty({ description: 'Min teams', example: 4 })
  @IsNumber()
  @Min(2)
  minTeams: number;

  @ApiProperty({ description: 'Max teams', example: 16 })
  @IsNumber()
  @Min(2)
  maxTeams: number;

  @ApiProperty({ description: 'Team size', example: 7 })
  @IsNumber()
  @Min(1)
  teamSize: number;

  @ApiProperty({ description: 'Entry fee per team (VND)', example: 500000 })
  @IsNumber()
  @Min(0)
  entryFee: number;

  @ApiProperty({ description: 'Prize pool (VND)', example: 5000000 })
  @IsNumber()
  @Min(0)
  prizePool: number;

  @ApiProperty({ description: 'Registration start date', example: '2026-11-05' })
  @IsNotEmpty()
  @IsDateString()
  registrationStartDate: string;

  @ApiProperty({ description: 'Registration end date', example: '2026-11-20' })
  @IsNotEmpty()
  @IsDateString()
  registrationEndDate: string;

  @ApiProperty({ description: 'Tournament start date', example: '2026-11-25' })
  @IsNotEmpty()
  @IsDateString()
  tournamentStartDate: string;

  @ApiProperty({ description: 'Tournament end date', example: '2026-11-30' })
  @IsNotEmpty()
  @IsDateString()
  tournamentEndDate: string;

  @ApiPropertyOptional({ description: 'Rules' })
  @IsOptional()
  @IsString()
  rules?: string;

  @ApiPropertyOptional({ description: 'Banner URL' })
  @IsOptional()
  @IsString()
  bannerUrl?: string;
}

export class RegisterTournamentTeamDto {
  @ApiProperty({ description: 'Team Name', example: 'Chiến Binh Rồng' })
  @IsNotEmpty()
  @IsString()
  teamName: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ type: [TeamMemberDto], description: 'Team members' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  members: TeamMemberDto[];

  @ApiPropertyOptional({ enum: PaymentProvider, default: PaymentProvider.VIETQR })
  @IsOptional()
  @IsEnum(PaymentProvider)
  paymentMethod?: PaymentProvider;
}

export class UpdateMatchResultDto {
  @ApiProperty({ description: 'Score of Team 1', example: 2 })
  @IsNumber()
  @Min(0)
  score1: number;

  @ApiProperty({ description: 'Score of Team 2', example: 1 })
  @IsNumber()
  @Min(0)
  score2: number;

  @ApiPropertyOptional({ description: 'Is match forfeit' })
  @IsOptional()
  isForfeit?: boolean;
}

export class ScheduleMatchDto {
  @ApiProperty({ description: 'Scheduled match start time' })
  @IsNotEmpty()
  @IsDateString()
  scheduledStartTime: string;

  @ApiPropertyOptional({ description: 'Venue / Court ID' })
  @IsOptional()
  @IsString()
  resourceId?: string;
}
