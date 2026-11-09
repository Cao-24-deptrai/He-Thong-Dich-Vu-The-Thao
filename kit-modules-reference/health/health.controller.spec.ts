import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller.js';
import { DatabaseTransactionService } from '../../database/database-transaction.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { Response } from 'express';

describe('HealthController', () => {
  let controller: HealthController;
  let dbTxServiceMock: { getConnection: jest.Mock };
  let redisServiceMock: { isHealthy: jest.Mock };

  beforeEach(async () => {
    dbTxServiceMock = {
      getConnection: jest.fn().mockReturnValue({ readyState: 1 }),
    };

    redisServiceMock = {
      isHealthy: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DatabaseTransactionService,
          useValue: dbTxServiceMock,
        },
        {
          provide: RedisService,
          useValue: redisServiceMock,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('getHealth', () => {
    it('returns ok status and version', () => {
      const response = controller.getHealth();
      expect(response.status).toBe('ok');
      expect(response.version).toBe('1.0.0');
      expect(response.timestamp).toBeDefined();
    });
  });

  describe('getReadiness', () => {
    it('returns ready (HTTP 200) when both DB and Redis are healthy', async () => {
      const statusFn = jest.fn().mockReturnThis();
      const jsonFn = jest.fn();
      const res = { status: statusFn, json: jsonFn } as unknown as Response;

      await controller.getReadiness(res);

      expect(statusFn).toHaveBeenCalledWith(200);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready',
          services: { database: true, redis: true },
        }),
      );
    });

    it('returns not_ready (HTTP 503) when database is not connected', async () => {
      dbTxServiceMock.getConnection.mockReturnValue({ readyState: 0 });

      const statusFn = jest.fn().mockReturnThis();
      const jsonFn = jest.fn();
      const res = { status: statusFn, json: jsonFn } as unknown as Response;

      await controller.getReadiness(res);

      expect(statusFn).toHaveBeenCalledWith(503);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not_ready',
          services: { database: false, redis: true },
        }),
      );
    });
  });
});
