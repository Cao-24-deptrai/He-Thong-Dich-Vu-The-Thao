import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MembershipPass, MembershipPassSchema } from './schemas/membership-pass.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { MembershipPassService } from './membership-pass.service';
import { MembershipPassController } from './membership-pass.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MembershipPass.name, schema: MembershipPassSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') || 'super_secret_jwt_sports_booking_key_2026',
        signOptions: {
          expiresIn: '60s',
        },
      }),
    }),
  ],
  controllers: [MembershipPassController],
  providers: [MembershipPassService],
  exports: [MembershipPassService, MongooseModule],
})
export class MembershipPassModule {}
