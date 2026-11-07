import { createHmac, timingSafeEqual } from 'node:crypto';

// QR động: do SERVER sinh (app chỉ hiển thị), đổi mỗi 30 giây, dùng một lần.
const STEP_MS = 30_000;

export function issueQr(userId: string, purpose: 'GYM' | 'BOOKING' | 'GAME_LOGIN', secret: string, now = Date.now()) {
  const bucket = Math.floor(now / STEP_MS);
  const sig = sign(`${userId}.${purpose}.${bucket}`, secret);
  return `v1.${userId}.${purpose}.${bucket}.${sig}`;
}

export async function verifyQr(token: string, secret: string, redis: { set: Function }, now = Date.now()) {
  const [v, userId, purpose, bucketStr, sig] = token.split('.');
  if (v !== 'v1') return null;
  const bucket = Number(bucketStr);
  const cur = Math.floor(now / STEP_MS);
  if (!Number.isInteger(bucket) || bucket > cur || bucket < cur - 1) return null; // chỉ nhận bucket hiện tại và liền trước
  const expect = sign(`${userId}.${purpose}.${bucket}`, secret);
  if (sig.length !== expect.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  // Một lần dùng: SET NX có TTL
  const ok = await redis.set(`qr:used:${sig}`, '1', 'EX', 90, 'NX');
  return ok === 'OK' ? { userId, purpose } : null;
}

const sign = (data: string, secret: string) => createHmac('sha256', secret).update(data).digest('base64url').slice(0, 22);
