import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { DatabaseTransactionService } from '../../database/database-transaction.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { HealthResponse, ReadinessResponse } from '@sports/contracts';

@Controller('api/v1/health')
export class HealthController {
  constructor(
    private readonly dbTxService: DatabaseTransactionService,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  @Get('ready')
  async getReadiness(@Res() res: Response): Promise<void> {
    const isDbConnected = this.dbTxService.getConnection().readyState === 1;
    const isRedisConnected = await this.redisService.isHealthy();

    const isReady = isDbConnected && isRedisConnected;

    const responseData: ReadinessResponse = {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      services: {
        database: isDbConnected,
        redis: isRedisConnected,
      },
    };

    const httpStatus = isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(httpStatus).json(responseData);
  }
}
