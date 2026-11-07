import { startTestEnv, resetTestEnv, stopTestEnv, redis } from './test-env.example';

describe('booking race (T01–T03)', () => {
  beforeAll(startTestEnv, 120_000);
  beforeEach(resetTestEnv);
  afterAll(stopTestEnv);

  it('T01 should let exactly one of 200 concurrent requests hold the same slot', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 200 }, (_, i) =>
        bookingService.hold({ resourceId: F1, startAt: T('19:00'), endAt: T('20:00') }, `user-${i}`),
      ),
    );
    const ok = results.filter((r) => r.status === 'fulfilled');
    const taken = results.filter((r) => r.status === 'rejected' && (r.reason as any).code === 'SLOT_TAKEN');
    expect(ok).toHaveLength(1);
    expect(taken).toHaveLength(199);
    expect(await slotsCollection.countDocuments({ unitId: F1, date: D, slotIndex: { $in: [38, 39] } })).toBe(2); // không ô thừa/mồ côi
  });

  it('T01b should still never double-book when Redis locks are lost', async () => {
    const racing = Array.from({ length: 50 }, (_, i) => bookingService.hold(input, `u-${i}`));
    await redis.flushall(); // giả lập mất toàn bộ khóa giữa chừng
    const results = await Promise.allSettled([...racing, ...Array.from({ length: 50 }, (_, i) => bookingService.hold(input, `v-${i}`))]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1); // chốt chặn cuối: unique index
  });

  it('T02 should reject sân 7 and sân 5 once sân 11 is booked in the same window', async () => {
    await bookingService.hold({ resourceId: S11, ...window }, 'a');
    await expect(bookingService.hold({ resourceId: S7_A, ...window }, 'b')).rejects.toMatchObject({ code: 'SLOT_TAKEN' });
    await expect(bookingService.hold({ resourceId: F3, ...window }, 'c')).rejects.toMatchObject({ code: 'SLOT_TAKEN' });
  });

  it('T03 should reject sân 11 when one of its sân 5 is already booked', async () => {
    await bookingService.hold({ resourceId: F1, ...window }, 'a');
    await expect(bookingService.hold({ resourceId: S11, ...window }, 'b')).rejects.toMatchObject({ code: 'SLOT_TAKEN' });
  });
});
