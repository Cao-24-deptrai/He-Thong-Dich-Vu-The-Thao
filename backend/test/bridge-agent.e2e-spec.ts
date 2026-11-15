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
import { BridgeModule } from '../src/bridge/bridge.module';
import { User, UserDocument } from '../src/users/schemas/user.schema';
import { UserRole } from '../src/common/enums';

describe('Epic E12 - Bridge Agent & Local IoT Devices (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let adminToken: string;
  let userModel: Model<UserDocument>;
  let createdCommandId: string;

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
        BridgeModule,
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

    // Register Admin
    const adminRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        phone: '0966666666',
        password: 'AdminPassword123',
        fullName: 'Admin IoT Devices',
      });
    adminToken = adminRes.body.accessToken;
    await userModel.updateOne({ phone: '0966666666' }, { role: UserRole.ADMIN });
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('1. Agent Handshake & Heartbeat Lifecycle', () => {
    it('should register a new Bridge Agent with attached devices', async () => {
      const res = await request(app.getHttpServer())
        .post('/bridge/agents/register')
        .send({
          agentId: 'AGENT-TURNSTILE-GATE-01',
          hostname: 'GATE-TRIPOD-HOST',
          localIp: '192.168.1.50',
          macAddress: '00:1A:2B:3C:4D:5E',
          agentVersion: '1.4.2',
          devices: [
            {
              deviceId: 'RELAY-TURNSTILE-01',
              type: 'TURNSTILE_BARRIER',
              name: 'Tripod Barrier Gym Gate',
              port: 'COM1',
              status: 'ONLINE',
            },
            {
              deviceId: 'QR-READER-01',
              type: 'QR_SCANNER',
              name: 'Fixed Barcode Scanner',
              port: 'USB HID',
              status: 'ONLINE',
            },
          ],
        })
        .expect(201);

      expect(res.body.agentId).toBe('AGENT-TURNSTILE-GATE-01');
      expect(res.body.devices.length).toBe(2);
      expect(res.body.status).toBe('ONLINE');
    });

    it('should receive heartbeat from registered agent', async () => {
      const res = await request(app.getHttpServer())
        .post('/bridge/agents/heartbeat')
        .send({
          agentId: 'AGENT-TURNSTILE-GATE-01',
          status: 'ONLINE',
          offlineQueueSize: 0,
          deviceStatuses: [
            {
              deviceId: 'RELAY-TURNSTILE-01',
              status: 'ONLINE',
            },
            {
              deviceId: 'QR-READER-01',
              status: 'ONLINE',
            },
          ],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.acknowledged).toBe(true);
    });

    it('should list registered bridge agents for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/bridge/agents')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].agentId).toBe('AGENT-TURNSTILE-GATE-01');
    });
  });

  describe('2. Remote Command Dispatch & Execution', () => {
    it('should dispatch TRIGGER_RELAY_OPEN command from Admin to Agent', async () => {
      const res = await request(app.getHttpServer())
        .post('/bridge/commands/dispatch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          agentId: 'AGENT-TURNSTILE-GATE-01',
          deviceId: 'RELAY-TURNSTILE-01',
          commandType: 'TRIGGER_RELAY_OPEN',
          params: { pulseDurationMs: 4000, direction: 'IN' },
        })
        .expect(201);

      expect(res.body._id).toBeDefined();
      expect(res.body.status).toBe('PENDING');
      createdCommandId = res.body._id;
    });

    it('agent should fetch pending commands', async () => {
      const res = await request(app.getHttpServer())
        .get('/bridge/agents/AGENT-TURNSTILE-GATE-01/commands/pending')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const cmd = res.body.find((c: any) => c._id === createdCommandId);
      expect(cmd).toBeDefined();
    });

    it('agent should acknowledge command execution result', async () => {
      const res = await request(app.getHttpServer())
        .post(`/bridge/commands/${createdCommandId}/ack`)
        .send({
          status: 'COMPLETED',
          result: { relayTriggeredMs: 4000, gpioPin: 12 },
        })
        .expect(200);

      expect(res.body.status).toBe('COMPLETED');
    });
  });

  describe('3. Event Ingestion & Idempotency Deduplication', () => {
    const testIdempotencyKey = 'IDEMP-EVENT-PASSAGE-9999';

    it('should ingest passage event on first submission', async () => {
      const res = await request(app.getHttpServer())
        .post('/bridge/events')
        .send({
          agentId: 'AGENT-TURNSTILE-GATE-01',
          deviceId: 'RELAY-TURNSTILE-01',
          eventType: 'PASSAGE_DETECTED',
          idempotencyKey: testIdempotencyKey,
          payload: { memberId: 'USER-12345', direction: 'IN' },
        })
        .expect(201);

      expect(res.body.idempotencyKey).toBe(testIdempotencyKey);
    });

    it('IDEMPOTENCY: should deduplicate resubmitted event with same key without errors', async () => {
      const res = await request(app.getHttpServer())
        .post('/bridge/events')
        .send({
          agentId: 'AGENT-TURNSTILE-GATE-01',
          deviceId: 'RELAY-TURNSTILE-01',
          eventType: 'PASSAGE_DETECTED',
          idempotencyKey: testIdempotencyKey,
          payload: { memberId: 'USER-12345', direction: 'IN' },
        })
        .expect(201);

      // Should return the previously saved event without duplication
      expect(res.body.idempotencyKey).toBe(testIdempotencyKey);
    });
  });
});
