import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import * as fs from 'fs';
import * as express from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;

  // Phục vụ tĩnh thư mục uploads cho hình ảnh sản phẩm / avatar
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Bật CORS cho cả 3 Giao diện: Web Admin, Web Thu Ngân POS và App Khách Hàng Mobile
  const allowedOrigins = [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:19006',
    'http://127.0.0.1:19006',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (curl, mobile apps) hoặc từ các origin hợp lệ
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'X-Client-Type',
      'X-Client-Version',
      'X-Station-Id',
      'Idempotency-Key',
    ],
    exposedHeaders: [
      'Content-Disposition',
      'X-Client-Type',
      'X-Response-Time',
    ],
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
