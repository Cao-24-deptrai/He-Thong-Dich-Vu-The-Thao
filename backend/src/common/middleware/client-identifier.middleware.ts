import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export type ClientType = 'WEB_ADMIN' | 'CASHIER_POS' | 'CUSTOMER_APP' | 'SYSTEM_API' | 'UNKNOWN';

export interface IdentifiedRequest extends Request {
  clientType?: ClientType;
  startTime?: number;
}

@Injectable()
export class ClientIdentifierMiddleware implements NestMiddleware {
  use(req: IdentifiedRequest, res: Response, next: NextFunction) {
    const startTime = Date.now();
    req.startTime = startTime;

    // 1. Kiểm tra header tường minh X-Client-Type
    let clientType = req.headers['x-client-type'] as ClientType;

    // 2. Nếu client chưa gửi header, tự động nhận diện qua Origin / Referer
    if (!clientType) {
      const referer = (req.headers['referer'] || '').toLowerCase();
      const origin = (req.headers['origin'] || '').toLowerCase();
      const source = `${referer} ${origin}`;

      if (source.includes('cashier.html') || source.includes('/cashier')) {
        clientType = 'CASHIER_POS';
      } else if (source.includes('admin.html') || source.includes('/admin')) {
        clientType = 'WEB_ADMIN';
      } else if (
        source.includes('user-app.html') ||
        source.includes('/user-app') ||
        source.includes('/app') ||
        source.includes(':8081') ||
        source.includes(':19006')
      ) {
        clientType = 'CUSTOMER_APP';
      } else if (req.headers['user-agent']?.includes('Postman') || req.headers['user-agent']?.includes('curl')) {
        clientType = 'SYSTEM_API';
      } else {
        clientType = 'UNKNOWN';
      }
    }

    req.clientType = clientType;

    // Đính kèm clientType vào response header
    res.setHeader('X-Client-Type', clientType);

    // Ghi nhận X-Response-Time bằng cách hook vào writeHead trước khi headers được gửi đi
    const originalWriteHead = res.writeHead.bind(res);
    res.writeHead = function (...args: any[]) {
      const duration = Date.now() - startTime;
      res.setHeader('X-Response-Time', `${duration}ms`);
      return originalWriteHead(...(args as [any, any?, any?]));
    };

    next();
  }
}
