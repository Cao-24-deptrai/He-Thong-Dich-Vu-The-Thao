import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import configuration from '../src/config/configuration';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { RedisModule } from '../src/redis/redis.module';
import { PtClassesModule } from '../src/pt-classes/pt-classes.module';
import { UserRole } from '../src/common/enums';

describe('Epic E14 - PT & Classes Module (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let adminToken: string;
  let customerToken: string;
  let trainerUserId: string;
  let trainerStaffId: string;
  let classTemplateId: string;
  let classSessionId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        MongooseModule.forRoot(uri),
        RedisModule,
        AuthModule,
        UsersModule,
        PtClassesModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    // 1. Register Admin
    const adminRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        phone: '0999999999',
        password: 'AdminPassword123',
        fullName: 'Admin Quản Trị',
      });
    adminToken = adminRes.body.accessToken;

    // 2. Register Customer
    const custRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        phone: '0911223344',
        password: 'UserPassword123',
        fullName: 'Khách Hàng Tập Gym',
      });
    customerToken = custRes.body.accessToken;

    // 3. Register Trainer User
    const trainerUserRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        phone: '0988776655',
        password: 'TrainerPassword123',
        fullName: 'HLV Huấn Luyện',
      });
    trainerUserId = trainerUserRes.body.user.id || trainerUserRes.body.user._id;
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('1. Admin tạo hồ sơ Huấn luyện viên (StaffProfile)', async () => {
    const res = await request(app.getHttpServer())
      .post('/pt-classes/trainers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: trainerUserId,
        fullName: 'HLV Huấn Luyện',
        phone: '0988776655',
        specialties: ['Gym', 'Yoga', 'Boxing'],
        hourlyRate: 250000,
        certifications: ['NASM-CPT'],
      })
      .expect(201);

    expect(res.body).toHaveProperty('_id');
    expect(res.body.hourlyRate).toBe(250000);
    trainerStaffId = res.body._id;
  });

  it('2. Khách hàng tra cứu danh sách HLV công khai', async () => {
    const res = await request(app.getHttpServer())
      .get('/pt-classes/trainers')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('3. Admin tạo mẫu lớp học nhóm Yoga (ClassTemplate)', async () => {
    const res = await request(app.getHttpServer())
      .post('/pt-classes/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Yoga Thư Giãn Buổi Sáng',
        classType: 'YOGA',
        trainerId: trainerStaffId,
        capacity: 2, // Đặt sức chứa nhỏ để test race condition
        pricePerSession: 100000,
        durationMinutes: 60,
        daysOfWeek: [1, 2, 3, 4, 5],
        defaultStartTime: '08:00',
        defaultEndTime: '09:00',
        roomName: 'Studio Yoga 1',
      })
      .expect(201);

    expect(res.body.capacity).toBe(2);
    classTemplateId = res.body._id;
  });

  it('4. Tự động sinh buổi học thực tế (generate sessions)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/pt-classes/templates/${classTemplateId}/generate?startDate=2026-11-10&daysAhead=5`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    classSessionId = res.body[0]._id;
  });

  it('5. Khách hàng đăng ký tham gia lớp học thành công', async () => {
    const res = await request(app.getHttpServer())
      .post(`/pt-classes/classes/${classSessionId}/register`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ customerName: 'Khách Hàng Tập Gym' })
      .expect(201);

    expect(res.body.status).toBe('REGISTERED');
  });

  it('6. Chặn đăng ký khi lớp học đã đầy sức chứa (F11.6 - CLASS_FULL_CAPACITY)', async () => {
    // Đăng ký người thứ 2
    const user2Res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: '0922334455', password: 'Password123', fullName: 'Học Viên 2' });

    await request(app.getHttpServer())
      .post(`/pt-classes/classes/${classSessionId}/register`)
      .set('Authorization', `Bearer ${user2Res.body.accessToken}`)
      .expect(201);

    // Người thứ 3 đăng ký sẽ bị chặn 409
    const user3Res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: '0933445566', password: 'Password123', fullName: 'Học Viên 3' });

    const res = await request(app.getHttpServer())
      .post(`/pt-classes/classes/${classSessionId}/register`)
      .set('Authorization', `Bearer ${user3Res.body.accessToken}`)
      .expect(409);

    expect(res.body.message).toContain('CLASS_FULL_CAPACITY');
  });

  it('7. Khách hàng đặt lịch PT 1-1 với HLV (F11.8)', async () => {
    const res = await request(app.getHttpServer())
      .post('/pt-classes/pt/book')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        trainerId: trainerStaffId,
        sessionDate: '2026-11-15',
        startTime: '10:00',
        durationMinutes: 60,
      })
      .expect(201);

    expect(res.body.sessionCode).toMatch(/^PT-/);
    expect(res.body.status).toBe('CONFIRMED');
  });

  it('8. Chặn đặt trùng khung giờ PT 1-1 của HLV (TRAINER_TIME_SLOT_CONFLICT)', async () => {
    const user2Res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '0922334455', password: 'Password123' });

    const res = await request(app.getHttpServer())
      .post('/pt-classes/pt/book')
      .set('Authorization', `Bearer ${user2Res.body.accessToken}`)
      .send({
        trainerId: trainerStaffId,
        sessionDate: '2026-11-15',
        startTime: '10:00', // Cùng ngày giờ với buổi đã đặt
      })
      .expect(409);

    expect(res.body.message).toContain('TRAINER_TIME_SLOT_CONFLICT');
  });
});
