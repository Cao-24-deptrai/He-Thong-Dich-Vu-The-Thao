import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;

  // Bật CORS cho Web Admin và Mobile App
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Cấu hình Swagger OpenAPI theo Mục 1.1
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sports & Esports Booking API')
    .setDescription(
      'Hệ thống API đặt lịch tổ hợp thể thao & Esports (Bóng đá, Cầu lông, Tennis, Gym, Esports)',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Xác thực và phân quyền tài khoản')
    .addTag('Facilities', 'Quản lý tổ hợp thể thao')
    .addTag('Venues', 'Quản lý sân / phòng gym / máy esports')
    .addTag('Bookings', 'Quản lý đặt chỗ và chống trùng lịch')
    .addTag('Payments', 'Thanh toán và Webhook')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  logger.log(`🚀 Backend đang chạy tại: http://localhost:${port}`);
  logger.log(`📚 Swagger Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
