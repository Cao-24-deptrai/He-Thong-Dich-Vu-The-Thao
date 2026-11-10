import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserSession, UserSessionSchema } from './schemas/user-session.schema';
import { OtpChallenge, OtpChallengeSchema } from './schemas/otp-challenge.schema';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: UserSession.name, schema: UserSessionSchema },
      { name: OtpChallenge.name, schema: OtpChallengeSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') || 'super_secret_jwt_sports_booking_key_2026',
        signOptions: {
          expiresIn: (configService.get<string>('jwt.expiresIn') || '15m') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, JwtStrategy],
  exports: [AuthService, OtpService, JwtModule, PassportModule, MongooseModule],
})
export class AuthModule {}
