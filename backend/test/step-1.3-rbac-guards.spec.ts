import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus, Controller, Get, UseGuards } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { UserRole } from '../src/common/enums';
import { UsersService } from '../src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { RequirePermissions } from '../src/common/decorators/permissions.decorator';

@Controller('test-perm')
@UseGuards(JwtAuthGuard, PermissionsGuard)
class TestPermissionsController {
  @Get('audit')
  @RequirePermissions('AUDIT_LOG_READ')
  auditEndpoint() {
    return { ok: true, message: 'Audit log accessed' };
  }
}

describe('Bước 1.3: Nâng cấp Guards & Decorators phân quyền RBAC & Quản trị Users', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let usersService: UsersService;
  let jwtService: JwtService;

  let customerToken: string;
  let customerId: string;
  let staffToken: string;
  let managerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot(uri),
        AuthModule,
        UsersModule,
      ],
      controllers: [TestPermissionsController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    usersService = moduleFixture.get<UsersService>(UsersService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Tạo các tài khoản test đại diện cho từng vai trò
    const customer = await usersService.create({
      phone: '0911000001',
      password: 'Password@123',
      fullName: 'Khách Hàng 1',
      role: UserRole.CUSTOMER,
      permissions: [],
    });
    customerId = customer._id.toString();
    customerToken = jwtService.sign({
      sub: customerId,
      phone: customer.phone,
      role: customer.role,
      permissions: customer.permissions,
    });

    const staff = await usersService.create({
      phone: '0911000002',
      password: 'Password@123',
      fullName: 'Nhân Viên Quầy',
      role: UserRole.STAFF,
      permissions: ['CHECKIN_SCAN', 'WALK_IN_CREATE'],
    });
    staffToken = jwtService.sign({
      sub: staff._id.toString(),
      phone: staff.phone,
      role: staff.role,
      permissions: staff.permissions,
    });

    const manager = await usersService.create({
      phone: '0911000003',
      password: 'Password@123',
      fullName: 'Quản Lý Cơ Sở',
      role: UserRole.MANAGER,
      permissions: ['USER_READ', 'BOOKING_READ', 'REPORT_VIEW'],
    });
    managerToken = jwtService.sign({
      sub: manager._id.toString(),
      phone: manager.phone,
      role: manager.role,
      permissions: manager.permissions,
    });

    const admin = await usersService.create({
      phone: '0999999999',
      password: 'Admin@123456',
      fullName: 'Quản Trị Tối Cao',
      role: UserRole.ADMIN,
      permissions: ['*'],
    });
    adminToken = jwtService.sign({
      sub: admin._id.toString(),
      phone: admin.phone,
      role: admin.role,
      permissions: admin.permissions,
    });
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('1. Quản lý Hồ sơ & Hóa đơn cá nhân (/users/me)', () => {
    it('GET /users/me xem thông tin cá nhân', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.phone).toBe('0911000001');
      expect(res.body.role).toBe(UserRole.CUSTOMER);
      expect(res.body.permissions).toEqual([]);
    });

    it('PATCH /users/me cập nhật họ tên và thông tin xuất hóa đơn VAT', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          fullName: 'Nguyễn Văn Vy Khách Hàng',
          invoiceInfo: {
            buyerTaxCode: '0312999888',
            companyName: 'Công Ty CP Thể Thao Phanta Test',
            companyAddress: '456 Lê Duẩn, Đà Nẵng',
          },
        })
        .expect(HttpStatus.OK);

      expect(res.body.fullName).toBe('Nguyễn Văn Vy Khách Hàng');
      expect(res.body.invoiceInfo?.buyerTaxCode).toBe('0312999888');
      expect(res.body.invoiceInfo?.companyName).toBe('Công Ty CP Thể Thao Phanta Test');
    });
  });

  describe('2. Phân quyền RolesGuard (/users quản trị)', () => {
    it('Khách hàng (CUSTOMER) truy cập GET /users -> 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('Nhân viên (STAFF) đổi vai trò người khác -> 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${customerId}/role`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ role: UserRole.STAFF })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('Quản lý (MANAGER) truy cập GET /users xem danh sách phân trang -> 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get('/users?page=1&limit=10')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.items).toBeDefined();
      expect(res.body.total).toBeGreaterThanOrEqual(4);
      expect(res.body.page).toBe(1);
    });

    it('Admin (ADMIN) cập nhật vai trò và cấp quyền động cho khách hàng -> 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/${customerId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: UserRole.STAFF,
          permissions: ['CHECKIN_SCAN', 'AUDIT_LOG_READ'],
        })
        .expect(HttpStatus.OK);

      expect(res.body.user.role).toBe(UserRole.STAFF);
      expect(res.body.user.permissions).toContain('AUDIT_LOG_READ');
    });

    it('Admin (ADMIN) tạm khóa tài khoản thủ công 30 phút', async () => {
      const res = await request(app.getHttpServer())
        .post(`/users/${customerId}/lock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ minutes: 30, reason: 'Vi phạm quy tắc đặt sân' })
        .expect(HttpStatus.OK);

      expect(res.body.lockedUntil).toBeDefined();

      // Tài khoản bị khóa thử đăng nhập -> Bị từ chối 403
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: '0911000001', password: 'Password@123' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('Admin (ADMIN) mở khóa tài khoản thủ công', async () => {
      await request(app.getHttpServer())
        .post(`/users/${customerId}/unlock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);

      // Đăng nhập lại thành công
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: '0911000001', password: 'Password@123' })
        .expect(HttpStatus.OK);
    });
  });

  describe('3. Phân quyền PermissionsGuard (@RequirePermissions)', () => {
    it('Nhân viên không có quyền AUDIT_LOG_READ gọi endpoint yêu cầu -> 403 Forbidden (PERMISSION_DENIED)', async () => {
      const res = await request(app.getHttpServer())
        .get('/test-perm/audit')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(HttpStatus.FORBIDDEN);

      expect(res.body.errorCode).toBe('PERMISSION_DENIED');
      expect(res.body.requiredPermissions).toContain('AUDIT_LOG_READ');
    });

    it('Admin có toàn quyền bỏ qua kiểm tra permissions -> 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get('/test-perm/audit')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.ok).toBe(true);
    });
  });
});
