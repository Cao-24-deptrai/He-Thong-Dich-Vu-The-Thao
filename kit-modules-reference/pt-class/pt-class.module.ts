import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StaffProfile, StaffProfileSchema } from './schemas/staff-profile.schema.js';
import { StaffShift, StaffShiftSchema } from './schemas/staff-shift.schema.js';
import { AttendanceRecord, AttendanceRecordSchema } from './schemas/attendance.schema.js';
import { ClassTemplate, ClassTemplateSchema } from './schemas/class-template.schema.js';
import { ClassSession, ClassSessionSchema } from './schemas/class-session.schema.js';
import { ClassRegistration, ClassRegistrationSchema } from './schemas/class-registration.schema.js';
import { PtBookingSession, PtBookingSessionSchema } from './schemas/pt-booking-session.schema.js';
import { User, UserSchema } from '../auth/schemas/user.schema.js';
import { StaffManagementService } from './services/staff-management.service.js';
import { ClassManagementService } from './services/class-management.service.js';
import { PtBookingService } from './services/pt-booking.service.js';
import { PtPublicController } from './controllers/pt-public.controller.js';
import { TrainerController } from './controllers/trainer.controller.js';
import { StaffAttendanceController } from './controllers/staff-attendance.controller.js';
import { AdminPtClassController } from './controllers/admin-pt-class.controller.js';

@Global()
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
  controllers: [
    PtPublicController,
    TrainerController,
    StaffAttendanceController,
    AdminPtClassController,
  ],
  providers: [
    StaffManagementService,
    ClassManagementService,
    PtBookingService,
  ],
  exports: [
    StaffManagementService,
    ClassManagementService,
    PtBookingService,
  ],
})
export class PtClassModule {}
