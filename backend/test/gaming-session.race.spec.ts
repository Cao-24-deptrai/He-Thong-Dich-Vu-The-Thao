import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Model } from 'mongoose';
import configuration from '../src/config/configuration';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { RedisModule } from '../src/redis/redis.module';
import { GamingModule } from '../src/gaming/gaming.module';
import { User, UserDocument } from '../src/users/schemas/user.schema';
import { GamingMachine, GamingMachineDocument } from '../src/gaming/schemas/gaming-machine.schema';
import { UserRole } from '../src/common/enums';

describe('Epic E12 - Gaming Module & Concurrency Race Invariant (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let adminToken: string;
  let customerToken: string;
  let customerUser: any;
  let userModel: Model<UserDocument>;
  let machineModel: Model<GamingMachineDocument>;

  let machine1Id: string;
  let machine2Id: string;

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
        GamingModule,
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

    userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
    machineModel = moduleFixture.get<Model<GamingMachineDocument>>(getModelToken(GamingMachine.name));

    // 1. Setup Admin
    const adminRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        phone: '0988888888',
        password: 'AdminPassword123',
        fullName: 'Admin Gaming Net',
      });
    adminToken = adminRes.body.accessToken;
    await userModel.updateOne({ phone: '0988888888' }, { role: UserRole.ADMIN });

    // 2. Setup Customer with 150,000 VND wallet balance
    const custRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        phone: '0977777777',
        password: 'CustomerPass123',
        fullName: 'Gamer Hoàng Nam',
      });
    customerToken = custRes.body.accessToken;
    customerUser = custRes.body.user;

    await userModel.updateOne(
      { phone: '0977777777' },
      { walletBalance: 150000 },
    );
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('1. Setup Machines and Pricing Rules', () => {
    it('should create pricing rule for VIP Zone', async () => {
      const res = await request(app.getHttpServer())
        .post('/gaming/price-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          zone: 'VIP',
          hourlyRate: 20000,
          minBlockMinutes: 15,
          roundingBlockMinutes: 15,
          active: true,
        })
        .expect(201);

      expect(res.body.zone).toBe('VIP');
      expect(res.body.hourlyRate).toBe(20000);
    });

    it('should register 2 VIP Gaming Machines', async () => {
      const res1 = await request(app.getHttpServer())
        .post('/gaming/machines')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          machineCode: 'PC-VIP-01',
          zone: 'VIP',
          row: 'R01',
          column: 1,
          specs: {
            cpu: 'Core i7-14700K',
            gpu: 'RTX 4070 Super',
            ramGb: 32,
            monitorHz: 240,
          },
          ipAddress: '192.168.10.11',
          macAddress: 'AA:BB:CC:DD:EE:01',
        })
        .expect(201);

      machine1Id = res1.body._id;
      expect(res1.body.machineCode).toBe('PC-VIP-01');

      const res2 = await request(app.getHttpServer())
        .post('/gaming/machines')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          machineCode: 'PC-VIP-02',
          zone: 'VIP',
          row: 'R01',
          column: 2,
          specs: {
            cpu: 'Core i7-14700K',
            gpu: 'RTX 4070 Super',
            ramGb: 32,
            monitorHz: 240,
          },
          ipAddress: '192.168.10.12',
          macAddress: 'AA:BB:CC:DD:EE:02',
        })
        .expect(201);

      machine2Id = res2.body._id;
      expect(res2.body.machineCode).toBe('PC-VIP-02');
    });

    it('should list all machines with current status', async () => {
      const res = await request(app.getHttpServer())
        .get('/gaming/machines')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('2. Gaming Session Flow & Race Condition Invariant (SPEC Rule 1)', () => {
    let activeSessionId: string;

    it('should start a session on PC-VIP-01 and hold balance', async () => {
      const res = await request(app.getHttpServer())
        .post('/gaming/sessions/start')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          machineId: machine1Id,
        })
        .expect(201);

      expect(res.body.session).toBeDefined();
      expect(res.body.session.status).toBe('ACTIVE');
      expect(res.body.session.heldAmount).toBeGreaterThan(0);
      activeSessionId = res.body.session._id;

      // Verify customer wallet had hold deducted
      const updatedUser = await userModel.findById(customerUser.id);
      expect(updatedUser.walletBalance).toBeLessThan(150000);
    });

    it('RACE CONDITION INVARIANT: should REJECT concurrent start on PC-VIP-02 for same account with 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post('/gaming/sessions/start')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          machineId: machine2Id,
        })
        .expect(409);

      expect(res.body.message).toContain('Tài khoản đang có phiên chơi');
    });

    it('should allow customer to check active session', async () => {
      const res = await request(app.getHttpServer())
        .get('/gaming/sessions/active')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body._id).toBe(activeSessionId);
      expect(res.body.machineCode).toBe('PC-VIP-01');
    });

    it('should gracefully end session, charge usage and refund excess hold', async () => {
      const endRes = await request(app.getHttpServer())
        .post(`/gaming/sessions/${activeSessionId}/end`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'USER_LOGOUT',
        })
        .expect(200);

      expect(endRes.body.session.status).toBe('COMPLETED');
      expect(endRes.body.settlement).toBeDefined();
      expect(endRes.body.settlement.chargedAmount).toBeGreaterThanOrEqual(0);

      // Verify machine status returned to AVAILABLE
      const m1 = await machineModel.findById(machine1Id);
      expect(m1.status).toBe('AVAILABLE');
    });

    it('should allow customer to start session on PC-VIP-02 now that previous session ended', async () => {
      const res = await request(app.getHttpServer())
        .post('/gaming/sessions/start')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          machineId: machine2Id,
        })
        .expect(201);

      expect(res.body.session.status).toBe('ACTIVE');

      // Cleanup
      await request(app.getHttpServer())
        .post(`/gaming/sessions/${res.body.session._id}/end`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send()
        .expect(200);
    });
  });
});
