import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { FacilitiesService } from './facilities/facilities.service';
import { VenuesService } from './venues/venues.service';
import { PtClassesService } from './pt-classes/pt-classes.service';
import { ClassType, StaffEmploymentStatus, UserRole, VenueType } from './common/enums';
import { ConfigService } from '@nestjs/config';

async function seed() {
  const logger = new Logger('Seed');
  logger.log('Bắt đầu khởi tạo dữ liệu mẫu (Seed Data)...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const facilitiesService = app.get(FacilitiesService);
  const venuesService = app.get(VenuesService);
  const ptClassesService = app.get(PtClassesService);
  const configService = app.get(ConfigService);

  const adminPhone = configService.get<string>('admin.phone') || '240106';
  const adminPassword = configService.get<string>('admin.password') || '123456';
  const adminName = configService.get<string>('admin.name') || 'Quản trị viên';

  try {
    // 1. Tạo tài khoản Admin, Staff (Nhân viên quầy), Manager (Quản lý)
    let admin = await usersService.findByPhone(adminPhone);
    if (!admin) {
      admin = await usersService.create({
        phone: adminPhone,
        password: adminPassword,
        fullName: adminName,
        email: 'admin@sportsbooking.vn',
        role: UserRole.ADMIN,
      });
      logger.log(`✅ Đã tạo tài khoản ADMIN: Tài khoản: ${adminPhone} | Mật khẩu: ${adminPassword}`);
    } else {
      logger.log(`ℹ️ Tài khoản ADMIN (${adminPhone}) đã tồn tại.`);
    }

    const staffPhone = '280906';
    let staff = await usersService.findByPhone(staffPhone);
    if (!staff) {
      staff = await usersService.create({
        phone: staffPhone,
        password: '123456',
        fullName: 'Nhân viên Quầy',
        email: 'staff@sportsbooking.vn',
        role: UserRole.STAFF,
      });
      logger.log(`✅ Đã tạo tài khoản STAFF: Tài khoản: ${staffPhone} | Mật khẩu: 123456`);
    } else {
      logger.log(`ℹ️ Tài khoản STAFF (${staffPhone}) đã tồn tại.`);
    }

    const managerPhone = '190705';
    let manager = await usersService.findByPhone(managerPhone);
    if (!manager) {
      manager = await usersService.create({
        phone: managerPhone,
        password: '123456',
        fullName: 'Quản lý Cơ sở',
        email: 'manager@sportsbooking.vn',
        role: UserRole.MANAGER,
      });
      logger.log(`✅ Đã tạo tài khoản MANAGER: Tài khoản: ${managerPhone} | Mật khẩu: 123456`);
    } else {
      logger.log(`ℹ️ Tài khoản MANAGER (${managerPhone}) đã tồn tại.`);
    }

    // 2. Tạo Cơ sở thể thao mẫu nếu chưa có
    const existingFacilities = await facilitiesService.findAll({});
    let defaultFacility: any = existingFacilities && existingFacilities.length > 0 ? existingFacilities[0] : null;

    if (!defaultFacility) {
      defaultFacility = await facilitiesService.create({
        name: 'Tổ hợp Thể thao Mỹ Đình',
        address: 'Số 1 Lê Đức Thọ, Nam Từ Liêm, Hà Nội',
        location: {
          longitude: 105.7725,
          latitude: 21.0185,
        },
      }, (admin as any)._id?.toString());
      logger.log(`✅ Đã tạo cơ sở mẫu: ${defaultFacility.name}`);
    } else {
      logger.log(`ℹ️ Cơ sở mẫu (${defaultFacility.name}) đã tồn tại.`);
    }

    // 3. Tạo các Sân mẫu nếu cơ sở chưa có sân
    const facilityId = defaultFacility._id.toString();
    const existingVenues = await venuesService.findAll(facilityId);

    if (!existingVenues || existingVenues.length === 0) {
      const sampleVenues = [
        { name: 'Sân bóng 5A', type: VenueType.FOOTBALL_5, basePricePerHour: 200000 },
        { name: 'Sân bóng 5B', type: VenueType.FOOTBALL_5, basePricePerHour: 200000 },
        { name: 'Sân bóng 7A (Ghép)', type: VenueType.FOOTBALL_7, basePricePerHour: 350000 },
        { name: 'Sân bóng 11 Lớn (Ghép)', type: VenueType.FOOTBALL_11, basePricePerHour: 700000 },
        { name: 'Sân Cầu Lông 1', type: VenueType.BADMINTON, basePricePerHour: 100000 },
        { name: 'Sân Cầu Lông 2', type: VenueType.BADMINTON, basePricePerHour: 100000 },
        { name: 'Sân Tennis Vip 1', type: VenueType.TENNIS, basePricePerHour: 250000 },
      ];

      for (const v of sampleVenues) {
        await venuesService.create({
          facilityId,
          name: v.name,
          type: v.type,
          basePricePerHour: v.basePricePerHour,
        });
      }
      logger.log(`✅ Đã tạo ${sampleVenues.length} sân mẫu cho cơ sở ${defaultFacility.name}`);
    } else {
      logger.log(`ℹ️ Cơ sở đã có sẵn ${existingVenues.length} sân.`);
    }

    // 4. Tạo dữ liệu mẫu Huấn luyện viên & Lớp học kỹ năng
    const existingTrainers = await ptClassesService.getTrainers();
    if (!existingTrainers || existingTrainers.length === 0) {
      const sampleTrainers = [
        {
          phone: '0901000101',
          fullName: 'HLV Hoàng Nam',
          specialties: ['TENNIS'],
          hourlyRate: 350000,
          bio: 'Cựu vận động viên quần vợt quốc gia với 8 năm kinh nghiệm giảng dạy kỹ thuật giao bóng xoáy, di chuyển giảm chấn khớp gối và giáo án thể lực chuẩn ATP.',
          certifications: ['ITF Level 2', 'HLV Quần Vợt Quốc Gia'],
        },
        {
          phone: '0901000102',
          fullName: 'HLV Mai Linh',
          specialties: ['SWIMMING'],
          hourlyRate: 300000,
          bio: 'Chứng chỉ HLV Bơi lội Quốc tế FINIS. Hướng dẫn kỹ thuật bơi sải, bơi ếch, bơi bướm chuẩn Olympic và bài tập giải tỏa áp lực cột sống dưới nước.',
          certifications: ['FINIS International Coach', 'Cứu hộ & Phục hồi dưới nước'],
        },
        {
          phone: '0901000103',
          fullName: 'HLV Quốc Bảo',
          specialties: ['BADMINTON'],
          hourlyRate: 280000,
          bio: 'Chuyên gia bộ pháp di chuyển 4 góc, kỹ thuật đập cầu cuối sân, bỏ nhỏ lưới và chiến thuật đánh đôi từ cơ bản đến thi đấu phong trào.',
          certifications: ['BWF Coach Level 1'],
        },
        {
          phone: '0901000104',
          fullName: 'Coach Minh Quân',
          specialties: ['GYM'],
          hourlyRate: 320000,
          bio: 'Huấn luyện viên cá nhân NASM-CPT chuyên tăng cơ giảm mỡ, chỉnh form các bài Compound (Squat, Deadlift, Bench) và phục hồi tư thế văn phòng.',
          certifications: ['NASM-CPT', 'Strength & Conditioning'],
        },
      ];

      const createdTrainerIds: Record<string, string> = {};
      for (const tr of sampleTrainers) {
        let user = await usersService.findByPhone(tr.phone);
        if (!user) {
          user = await usersService.create({
            phone: tr.phone,
            password: 'Password123!',
            fullName: tr.fullName,
            role: UserRole.STAFF,
          });
        }
        const profile = await ptClassesService.createStaffProfile({
          userId: String((user as any)._id),
          fullName: tr.fullName,
          phone: tr.phone,
          specialties: tr.specialties,
          bio: tr.bio,
          hourlyRate: tr.hourlyRate,
          certifications: tr.certifications,
          employmentStatus: StaffEmploymentStatus.ACTIVE,
        });
        createdTrainerIds[tr.specialties[0]] = String((profile as any)._id);
      }

      const sampleClasses = [
        {
          name: 'Khóa Quần Vợt Cơ Bản (10 Buổi) - Thứ 3 - 5 - 7',
          description: 'Lớp Quần vợt cơ bản rèn kỹ thuật cầm vợt, thuận tay, trái tay và giao bóng chuẩn.',
          classType: ClassType.TENNIS,
          trainerId: createdTrainerIds['TENNIS'],
          capacity: 12,
          pricePerSession: 150000,
          durationMinutes: 90,
          daysOfWeek: [2, 4, 6],
          defaultStartTime: '18:00',
          defaultEndTime: '19:30',
          roomName: 'Sân Tennis VIP 1',
        },
        {
          name: 'Lớp Bơi Sải Nâng Cao (8 Buổi) - Thứ 2 - 4 - 6',
          description: 'Hoàn thiện nhịp thở, quạt tay và tối ưu tốc độ bơi sải đường dài.',
          classType: ClassType.SWIMMING,
          trainerId: createdTrainerIds['SWIMMING'],
          capacity: 10,
          pricePerSession: 150000,
          durationMinutes: 90,
          daysOfWeek: [1, 3, 5],
          defaultStartTime: '19:00',
          defaultEndTime: '20:30',
          roomName: 'Hồ bơi 4 mùa Phanta',
        },
        {
          name: 'Lớp Cầu Lông Kỹ Thuật & Bộ Pháp (8 Buổi) - Thứ 3 - 5 - 7',
          description: 'Luyện bộ pháp di chuyển, phông cầu, cắt nhỏ và phối hợp đánh đôi.',
          classType: ClassType.BADMINTON,
          trainerId: createdTrainerIds['BADMINTON'],
          capacity: 12,
          pricePerSession: 125000,
          durationMinutes: 90,
          daysOfWeek: [2, 4, 6],
          defaultStartTime: '19:30',
          defaultEndTime: '21:00',
          roomName: 'Nhà thi đấu Cầu lông 1',
        },
        {
          name: 'Lớp Thể Hình & Core Conditioning (12 Buổi) - Thứ 2 - 4 - 6',
          description: 'Tăng sức bền cơ lõi, đốt mỡ toàn thân và cải thiện thể lực tim mạch.',
          classType: ClassType.GYM,
          trainerId: createdTrainerIds['GYM'],
          capacity: 16,
          pricePerSession: 120000,
          durationMinutes: 60,
          daysOfWeek: [1, 3, 5],
          defaultStartTime: '18:30',
          defaultEndTime: '19:30',
          roomName: 'Phòng Gym & Fitness tầng 2',
        },
      ];

      const todayIso = new Date().toISOString().slice(0, 10);
      for (const cls of sampleClasses) {
        if (!cls.trainerId) continue;
        const tpl = await ptClassesService.createClassTemplate(cls);
        await ptClassesService.generateSessionsForTemplate(String((tpl as any)._id), todayIso, 14);
      }
      logger.log(`✅ Đã seed ${sampleTrainers.length} HLV và ${sampleClasses.length} lớp học kỹ năng.`);
    } else {
      logger.log(`ℹ️ Đã có sẵn ${existingTrainers.length} huấn luyện viên.`);
    }

    logger.log('🎉 Hoàn thành seed dữ liệu thành công!');
  } catch (error) {
    logger.error('Lỗi khi seed dữ liệu:', error);
  } finally {
    await app.close();
  }
}

seed();
