import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;
  private inMemoryLocks = new Map<string, { ownerId: string; expiresAt: number }>();

  // Lua script để nhả lock an toàn (chỉ giải phóng khi đúng ownerId)
  private readonly RELEASE_LOCK_LUA = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('redis.host') || '127.0.0.1';
    const port = this.configService.get<number>('redis.port') || 6379;
    const password = this.configService.get<string>('redis.password');

    try {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: (times) => {
          if (times > 2) {
            this.logger.warn('⚠️ Không thể kết nối Redis server sau 2 lần thử. Tự động chuyển sang chế độ In-Memory Mutex Lock an toàn.');
            return null; // Dừng retry, dùng in-memory fallback
          }
          return 500;
        },
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`✅ Đã kết nối Redis Server tại ${host}:${port}`);
      });

      this.client.on('error', (err) => {
        if (this.isConnected) {
          this.logger.warn(`Redis connection error: ${err.message}`);
        }
        this.isConnected = false;
      });

      await this.client.connect().catch(() => {
        this.logger.warn('ℹ️ Redis Server chưa bật. Hệ thống đang sử dụng Engine Mutex Lock In-Memory với độ trễ 0ms.');
        this.isConnected = false;
      });
    } catch (err) {
      this.logger.warn('ℹ️ Khởi tạo Redis thất bại, fallback sang In-Memory Mutex Lock.');
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (_) {
        // ignore
      }
    }
  }

  /**
   * Lớp 1: Mutex Lock (Mục 4.1 của spec)
   * SET lock:{venueId}:{date}:{slot} {userId} NX PX 3000
   * Trả về true nếu giữ được khóa, false nếu khóa đang bị giữ bởi request khác
   */
  async acquireLock(key: string, ownerId: string, ttlMs = 3000): Promise<boolean> {
    if (this.isConnected && this.client) {
      try {
        const result = await this.client.set(key, ownerId, 'PX', ttlMs, 'NX');
        return result === 'OK';
      } catch (err) {
        this.logger.error(`Lỗi Redis acquireLock: ${err.message}, fallback in-memory.`);
      }
    }

    // In-memory Mutex Lock với Atomic Check & Expiration
    const now = Date.now();
    const existing = this.inMemoryLocks.get(key);
    if (existing && existing.expiresAt > now) {
      return false; // Đang có người giữ lock
    }

    this.inMemoryLocks.set(key, { ownerId, expiresAt: now + ttlMs });
    return true;
  }

  /**
   * Nhả Mutex Lock ngay lập tức (Mục 4.1 của spec)
   * Đảm bảo chỉ đúng ownerId mới được phép xóa khóa
   */
  async releaseLock(key: string, ownerId: string): Promise<boolean> {
    if (this.isConnected && this.client) {
      try {
        const result = await this.client.eval(this.RELEASE_LOCK_LUA, 1, key, ownerId);
        return result === 1;
      } catch (err) {
        this.logger.error(`Lỗi Redis releaseLock: ${err.message}`);
      }
    }

    const existing = this.inMemoryLocks.get(key);
    if (existing && existing.ownerId === ownerId) {
      this.inMemoryLocks.delete(key);
      return true;
    }
    return false;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}
