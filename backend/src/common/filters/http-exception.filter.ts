import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Lỗi máy chủ nội bộ';
    let errorCode = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        message = (res as any).message || res;
        errorCode = (res as any).errorCode || (res as any).error || errorCode;
      } else {
        message = res;
      }
    } else if ((exception as any)?.name === 'MongoServerError' && (exception as any)?.code === 11000) {
      status = HttpStatus.CONFLICT;
      const keyPattern = (exception as any).keyPattern || {};
      if (keyPattern.venueId && keyPattern.bookingDate && keyPattern.startTime) {
        errorCode = 'SLOT_ALREADY_TAKEN';
        message = 'Khung giờ này đã có người giữ chỗ hoặc đặt thành công.';
      } else if (keyPattern.phone) {
        errorCode = 'PHONE_ALREADY_EXISTS';
        message = 'Số điện thoại này đã được đăng ký trong hệ thống.';
      } else {
        errorCode = 'DUPLICATE_KEY_ERROR';
        message = 'Dữ liệu đã tồn tại trong hệ thống.';
      }
    } else {
      this.logger.error('Unhandled Exception:', exception);
    }

    response.status(status).json({
      statusCode: status,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
