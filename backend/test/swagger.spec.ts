import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import configuration from '../src/config/configuration';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { FacilitiesModule } from '../src/facilities/facilities.module';
import { VenuesModule } from '../src/venues/venues.module';
import { BookingsModule } from '../src/bookings/bookings.module';
import { PaymentsModule } from '../src/payments/payments.module';
import { MembershipPassModule } from '../src/membership-pass/membership-pass.module';
import { MatchRequestsModule } from '../src/match-requests/match-requests.module';

describe('Swagger Documentation & Models (Mục 1.4 Spec)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

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
        FacilitiesModule,
        VenuesModule,
        BookingsModule,
        PaymentsModule,
        MembershipPassModule,
        MatchRequestsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('Swagger Document sinh thành công với đầy đủ endpoint và schemas', () => {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Sports & Esports Booking API')
      .setDescription('API documentation for Sports Booking')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    expect(document).toBeDefined();
    expect(document.info.title).toBe('Sports & Esports Booking API');

    // Kiểm tra các endpoint Auth
    const paths = Object.keys(document.paths);
    expect(paths).toContain('/auth/register');
    expect(paths).toContain('/auth/login');
    expect(paths).toContain('/auth/me');
    expect(paths).toContain('/auth/admin-test');

    // Kiểm tra các Schemas/DTOs được sinh trong components.schemas
    const schemas = Object.keys(document.components?.schemas || {});
    expect(schemas).toContain('RegisterDto');
    expect(schemas).toContain('LoginDto');

    // Kiểm tra cấu trúc RegisterDto trong Swagger
    const registerSchema: any = document.components?.schemas?.RegisterDto;
    expect(registerSchema.properties).toHaveProperty('phone');
    expect(registerSchema.properties).toHaveProperty('password');
    expect(registerSchema.properties).toHaveProperty('fullName');
  });
});
