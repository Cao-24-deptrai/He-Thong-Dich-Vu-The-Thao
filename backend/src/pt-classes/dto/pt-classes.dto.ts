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
} from 'class-validator';
import {
  ClassType,
  StaffEmploymentStatus,
  StaffShiftType,
  PaymentProvider,
} from '../../common/enums';

// 1. Staff Profile DTOs
export class CreateStaffProfileDto {
  @ApiProperty({ description: 'User ID in User collection', example: '65f1a2b3c4d5e6f7a8b9c0d1' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Full Name', example: 'Trần Văn Huấn Luyện' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ description: 'Phone number', example: '0988776655' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Specialties', example: ['Gym', 'Yoga', 'Boxing'] })
  @IsOptional()
  @IsArray()
  specialties?: string[];

  @ApiPropertyOptional({ description: 'Biography' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ description: 'Hourly rate for 1-1 session in VND', example: 250000 })
  @IsNumber()
  @Min(0)
  hourlyRate: number;

  @ApiPropertyOptional({ description: 'Certifications', example: ['NASM-CPT'] })
  @IsOptional()
  @IsArray()
  certifications?: string[];

  @ApiPropertyOptional({ enum: StaffEmploymentStatus, default: StaffEmploymentStatus.ACTIVE })
  @IsOptional()
  @IsEnum(StaffEmploymentStatus)
  employmentStatus?: StaffEmploymentStatus;
}

// 2. Staff Shift DTOs
export class CreateStaffShiftDto {
  @ApiProperty({ description: 'Staff Profile ID' })
  @IsNotEmpty()
  @IsString()
  staffId: string;

  @ApiProperty({ description: 'Shift Date (YYYY-MM-DD)', example: '2026-11-10' })
  @IsNotEmpty()
  @IsDateString()
  shiftDate: string;

  @ApiProperty({ enum: StaffShiftType, example: StaffShiftType.MORNING })
  @IsNotEmpty()
  @IsEnum(StaffShiftType)
  shiftType: StaffShiftType;

  @ApiProperty({ description: 'Start time (HH:mm)', example: '08:00' })
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiProperty({ description: 'End time (HH:mm)', example: '12:00' })
  @IsNotEmpty()
  @IsString()
  endTime: string;

  @ApiPropertyOptional({ description: 'Note' })
  @IsOptional()
  @IsString()
  note?: string;
}

// 3. Attendance DTOs
export class StaffAttendanceCheckinDto {
  @ApiProperty({ description: 'Staff Profile ID' })
  @IsNotEmpty()
  @IsString()
  staffId: string;

  @ApiPropertyOptional({ description: 'Shift ID' })
  @IsOptional()
  @IsString()
  shiftId?: string;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  location?: string;
}

// 4. Class Template DTOs
export class CreateClassTemplateDto {
  @ApiProperty({ description: 'Name of the class', example: 'Yoga Thư Giãn Buổi Sáng' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ClassType, example: ClassType.YOGA })
  @IsNotEmpty()
  @IsEnum(ClassType)
  classType: ClassType;

  @ApiProperty({ description: 'Trainer Staff ID' })
  @IsNotEmpty()
  @IsString()
  trainerId: string;

  @ApiProperty({ description: 'Max Capacity', example: 20 })
  @IsNumber()
  @Min(1)
  @Max(100)
  capacity: number;

  @ApiProperty({ description: 'Price per session (VND)', example: 120000 })
  @IsNumber()
  @Min(0)
  pricePerSession: number;

  @ApiProperty({ description: 'Duration in minutes', example: 60 })
  @IsNumber()
  @Min(15)
  durationMinutes: number;

  @ApiProperty({ description: 'Days of week [0: CN, 1: T2, 3: T4, 5: T6]', example: [1, 3, 5] })
  @IsArray()
  daysOfWeek: number[];

  @ApiProperty({ description: 'Default start time (HH:mm)', example: '08:00' })
  @IsNotEmpty()
  @IsString()
  defaultStartTime: string;

  @ApiProperty({ description: 'Default end time (HH:mm)', example: '09:00' })
  @IsNotEmpty()
  @IsString()
  defaultEndTime: string;

  @ApiPropertyOptional({ description: 'Room / Studio name', example: 'Studio Yoga 1' })
  @IsOptional()
  @IsString()
  roomName?: string;
}

// 5. Register Class DTO
export class RegisterClassDto {
  @ApiProperty({ description: 'Customer Name' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ enum: PaymentProvider, default: PaymentProvider.VIETQR })
  @IsOptional()
  @IsEnum(PaymentProvider)
  paymentMethod?: PaymentProvider;
}

// 6. Book PT Session DTO
export class BookPtSessionDto {
  @ApiProperty({ description: 'Trainer Staff ID' })
  @IsNotEmpty()
  @IsString()
  trainerId: string;

  @ApiProperty({ description: 'Session Date (YYYY-MM-DD)', example: '2026-11-10' })
  @IsNotEmpty()
  @IsDateString()
  sessionDate: string;

  @ApiProperty({ description: 'Start time (HH:mm)', example: '08:00' })
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiPropertyOptional({ description: 'Duration in minutes', default: 60 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Training notes / goals' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: PaymentProvider, default: PaymentProvider.VIETQR })
  @IsOptional()
  @IsEnum(PaymentProvider)
  paymentMethod?: PaymentProvider;
}
