import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { FacilitiesService } from './facilities/facilities.service';
import { VenuesService } from './venues/venues.service';
import { UserRole, VenueType } from './common/enums';
import { ConfigService } from '@nestjs/config';

async function seed() {
  const logger = new Logger('Seed');
  logger.log('Bắt đầu khởi tạo dữ liệu mẫu (Seed Data)...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const facilitiesService = app.get(FacilitiesService);
  const venuesService = app.get(VenuesService);
  const configService = app.get(ConfigService);

  const adminPhone = configService.get<string>('admin.phone') || '0999999999';
  const adminPassword = configService.get<string>('admin.password') || 'Admin@123456';
  const adminName = configService.get<string>('admin.name') || 'Super Admin';

  try {
    // 1. Tạo tài khoản Admin & Staff
    let admin = await usersService.findByPhone(adminPhone);
    if (!admin) {
      admin = await usersService.create({
        phone: adminPhone,
        password: adminPassword,
        fullName: adminName,
        email: 'admin@sportsbooking.vn',
        role: UserRole.ADMIN,
      });
      logger.log(`✅ Đã tạo tài khoản ADMIN: SĐT: ${adminPhone} | Mật khẩu: ${adminPassword}`);
    } else {
      logger.log(`ℹ️ Tài khoản ADMIN (${adminPhone}) đã tồn tại.`);
    }

    const staffPhone = '0988888888';
    let staff = await usersService.findByPhone(staffPhone);
    if (!staff) {
      staff = await usersService.create({
        phone: staffPhone,
        password: 'Staff@123456',
        fullName: 'Nhân viên Quầy',
        email: 'staff@sportsbooking.vn',
        role: UserRole.STAFF,
      });
      logger.log(`✅ Đã tạo tài khoản STAFF: SĐT: ${staffPhone} | Mật khẩu: Staff@123456`);
    } else {
      logger.log(`ℹ️ Tài khoản STAFF (${staffPhone}) đã tồn tại.`);
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

    logger.log('🎉 Hoàn thành seed dữ liệu thành công!');
  } catch (error) {
    logger.error('Lỗi khi seed dữ liệu:', error);
  } finally {
    await app.close();
  }
}

seed();
