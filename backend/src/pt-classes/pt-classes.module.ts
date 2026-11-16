import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StaffProfile, StaffProfileSchema } from './schemas/staff-profile.schema';
import { StaffShift, StaffShiftSchema } from './schemas/staff-shift.schema';
import { AttendanceRecord, AttendanceRecordSchema } from './schemas/attendance.schema';
import { ClassTemplate, ClassTemplateSchema } from './schemas/class-template.schema';
import { ClassSession, ClassSessionSchema } from './schemas/class-session.schema';
import { ClassRegistration, ClassRegistrationSchema } from './schemas/class-registration.schema';
import { PtBookingSession, PtBookingSessionSchema } from './schemas/pt-booking-session.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { PtClassesService } from './pt-classes.service';
import { PtClassesController } from './pt-classes.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StaffProfile.name, schema: StaffProfileSchema },
      { name: StaffShift.name, schema: StaffShiftSchema },
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
      { name: ClassTemplate.name, schema: ClassTemplateSchema },
      { name: ClassSession.name, schema: ClassSessionSchema },
      { name: ClassRegistration.name, schema: ClassRegistrationSchema },
      { name: PtBookingSession.name, schema: PtBookingSessionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [PtClassesController],
  providers: [PtClassesService],
  exports: [PtClassesService],
})
export class PtClassesModule {}
