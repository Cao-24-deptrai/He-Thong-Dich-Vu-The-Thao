import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service.js';

@Injectable()
export class RedisLockService {
  private readonly logger = new Logger(RedisLockService.name);

  // Lua script khóa đồng thời tất cả các keys (All or Nothing)
  private readonly acquireMultiLockScript = `
    for i, key in ipairs(KEYS) do
      if redis.call('EXISTS', key) == 1 then
        return 0
      end
    end
    for i, key in ipairs(KEYS) do
      redis.call('SET', key, ARGV[1], 'EX', ARGV[2])
    end
    return 1
  `;

  // Lua script giải phóng khóa an toàn theo token
  private readonly releaseMultiLockScript = `
    for i, key in ipairs(KEYS) do
      if redis.call('GET', key) == ARGV[1] then
        redis.call('DEL', key)
      end
    end
    return 1
  `;

  constructor(private readonly redisService: RedisService) {}

  /**
   * Khóa nguyên tử danh sách các ô slot bằng Redis
   * Trả về true nếu khóa thành công toàn bộ, false nếu có bất kỳ slot nào bị trùng
   */
  async acquireSlotLocks(keys: string[], token: string, ttlSeconds = 600): Promise<boolean> {
    if (!keys || keys.length === 0) return true;

    try {
      const result = await this.redisService.client.eval(
        this.acquireMultiLockScript,
        keys.length,
        ...keys,
        token,
        ttlSeconds.toString(),
      );
      return result === 1;
    } catch (err) {
      this.logger.warn(`Redis multi-lock failed (${(err as Error).message}). Fallback to MongoDB unique index.`);
      // Nếu Redis lỗi tạm thời, cho phép tiếp tục để tầng MongoDB Unique Index bảo vệ
      return true;
    }
  }

  /**
   * Giải phóng danh sách các khóa đã đặt theo token
   */
  async releaseSlotLocks(keys: string[], token: string): Promise<void> {
    if (!keys || keys.length === 0) return;

    try {
      await this.redisService.client.eval(
        this.releaseMultiLockScript,
        keys.length,
        ...keys,
        token,
      );
    } catch (err) {
      this.logger.warn(`Failed to release Redis slot locks: ${(err as Error).message}`);
    }
  }
}
