import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import configuration from '../src/config/configuration';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { TournamentsModule } from '../src/tournaments/tournaments.module';

describe('Epic E14 - Tournaments Module (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let adminToken: string;
  let captain1Token: string;
  let tournamentId: string;
  let matchId: string;

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
        AuthModule,
        UsersModule,
        TournamentsModule,
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
      .send({ phone: '0999999999', password: 'AdminPassword123', fullName: 'Admin' });
    adminToken = adminRes.body.accessToken;

    // 2. Register Captain 1
    const cap1Res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: '0911111111', password: 'Password123', fullName: 'Đội Trưởng 1' });
    captain1Token = cap1Res.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('1. Admin tạo giải đấu mới (F16.1)', async () => {
    const res = await request(app.getHttpServer())
      .post('/tournaments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'PHANTA-CUP-2026',
        name: 'Giải Bóng Đá Tứ Hùng Phanta 2026',
        type: 'SPORT',
        sportOrGame: 'Bóng đá 7 người',
        format: 'SINGLE_ELIMINATION',
        minTeams: 4,
        maxTeams: 8,
        teamSize: 7,
        entryFee: 500000,
        prizePool: 5000000,
        registrationStartDate: '2026-11-01',
        registrationEndDate: '2026-11-20',
        tournamentStartDate: '2026-11-25',
        tournamentEndDate: '2026-11-30',
      })
      .expect(201);

    expect(res.body.code).toBe('PHANTA-CUP-2026');
    tournamentId = res.body._id;
  });

  it('2. Đội trưởng đăng ký đội tham gia giải đấu (F16.2)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/register-team`)
      .set('Authorization', `Bearer ${captain1Token}`)
      .send({
        teamName: 'Chiến Binh Rồng',
        members: [{ fullName: 'Đội Trưởng 1', phone: '0911111111', isCaptain: true }],
      })
      .expect(201);

    expect(res.body.teamName).toBe('Chiến Binh Rồng');
  });

  it('3. Chặn thanh toán lệ phí giải bằng ví nội bộ (F16.2 Bất biến)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/register-team`)
      .set('Authorization', `Bearer ${captain1Token}`)
      .send({
        teamName: 'Đội Ví Nội Bộ',
        paymentMethod: 'INTERNAL_WALLET',
        members: [{ fullName: 'Captain', phone: '0911111111' }],
      })
      .expect(400);

    expect(res.body.message).toContain('WALLET_PAYMENT_FORBIDDEN_FOR_TOURNAMENT');
  });

  it('4. Đăng ký đủ 4 đội và Bốc thăm sinh nhánh đấu (F16.4)', async () => {
    // Đăng ký thêm 3 đội
    for (let i = 2; i <= 4; i++) {
      const capRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone: `092222222${i}`, password: 'Password123', fullName: `Đội Trưởng ${i}` });

      await request(app.getHttpServer())
        .post(`/tournaments/${tournamentId}/register-team`)
        .set('Authorization', `Bearer ${capRes.body.accessToken}`)
        .send({
          teamName: `Đội Bóng ${i}`,
          members: [{ fullName: `Captain ${i}`, phone: `092222222${i}` }],
        })
        .expect(201);
    }

    // Bốc thăm sinh nhánh đấu
    const res = await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/generate-bracket`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(Array.isArray(res.body)).toBe(true);
    // 4 đội loại trực tiếp có 2 trận bán kết (Round 1) và 1 trận chung kết (Round 2)
    expect(res.body.length).toBe(3);
    matchId = res.body[0]._id;
  });

  it('5. Cập nhật tỷ số trận đấu & tự động thăng hạng đội thắng (F16.6)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/tournaments/matches/${matchId}/result`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ score1: 3, score2: 1 })
      .expect(200);

    expect(res.body.status).toBe('COMPLETED');
    expect(res.body.winnerId).toBeDefined();

    // Kiểm tra trận Chung kết đã được đẩy tên đội thắng vào
    const matchesRes = await request(app.getHttpServer())
      .get(`/tournaments/${tournamentId}/matches`)
      .expect(200);

    const finalMatch = matchesRes.body.find((m: any) => m.matchCode === 'FINAL');
    expect(finalMatch.team1Id || finalMatch.team2Id).toBe(res.body.winnerId);
  });
});
