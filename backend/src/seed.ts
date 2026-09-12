import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { UserRole } from './common/enums';
import { ConfigService } from '@nestjs/config';

async function seed() {
  const logger = new Logger('Seed');
  logger.log('Bắt đầu khởi tạo dữ liệu mẫu (Seed Data)...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const configService = app.get(ConfigService);

  const adminPhone = configService.get<string>('admin.phone') || '0999999999';
  const adminPassword = configService.get<string>('admin.password') || 'Admin@123456';
  const adminName = configService.get<string>('admin.name') || 'Super Admin';

  try {
    const existingAdmin = await usersService.findByPhone(adminPhone);
    if (!existingAdmin) {
      await usersService.create({
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
    const existingStaff = await usersService.findByPhone(staffPhone);
    if (!existingStaff) {
      await usersService.create({
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

    logger.log('🎉 Hoàn thành seed dữ liệu thành công!');
  } catch (error) {
    logger.error('Lỗi khi seed dữ liệu:', error);
  } finally {
    await app.close();
  }
}

seed();
