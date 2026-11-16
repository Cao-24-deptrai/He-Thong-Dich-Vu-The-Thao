import {
  toVietnamDateString,
  parseVietnamDate,
  timeToSlotIndex,
  slotIndexToTimeString,
  slotToUtcRange,
  assertValidSlotIndex,
} from './index.js';

describe('packages/shared/time', () => {
  describe('toVietnamDateString and parseVietnamDate', () => {
    it('formats UTC date into Vietnam business date YYYY-MM-DD correctly', () => {
      // 2026-10-15T18:00:00Z is 2026-10-16 01:00:00 in Vietnam (+7)
      const utcDate = new Date('2026-10-15T18:00:00.000Z');
      expect(toVietnamDateString(utcDate)).toBe('2026-10-16');

      // 2026-10-15T16:00:00Z is 2026-10-15 23:00:00 in Vietnam (+7)
      const utcEvening = new Date('2026-10-15T16:00:00.000Z');
      expect(toVietnamDateString(utcEvening)).toBe('2026-10-15');
    });

    it('parses Vietnam date string to start of day in Vietnam timezone', () => {
      const dt = parseVietnamDate('2026-10-15');
      expect(dt.isValid).toBe(true);
      expect(dt.hour).toBe(0);
      expect(dt.minute).toBe(0);
      expect(dt.zoneName).toBe('Asia/Ho_Chi_Minh');
    });

    it('throws error on invalid date string', () => {
      expect(() => parseVietnamDate('invalid-date')).toThrow();
    });
  });

  describe('slot indices and conversions', () => {
    it('correctly maps time to slot index', () => {
      expect(timeToSlotIndex(0, 0)).toBe(0);
      expect(timeToSlotIndex(0, 29)).toBe(0);
      expect(timeToSlotIndex(0, 30)).toBe(1);
      expect(timeToSlotIndex(17, 0)).toBe(34); // 17h = 34th slot
      expect(timeToSlotIndex(23, 45)).toBe(47);
    });

    it('validates slot index', () => {
      expect(() => assertValidSlotIndex(0)).not.toThrow();
      expect(() => assertValidSlotIndex(47)).not.toThrow();
      expect(() => assertValidSlotIndex(-1)).toThrow(RangeError);
      expect(() => assertValidSlotIndex(48)).toThrow(RangeError);
      expect(() => assertValidSlotIndex(1.5)).toThrow(RangeError);
    });

    it('converts slot index to human-readable time string', () => {
      expect(slotIndexToTimeString(0)).toEqual({ startTime: '00:00', endTime: '00:30' });
      expect(slotIndexToTimeString(34)).toEqual({ startTime: '17:00', endTime: '17:30' });
      expect(slotIndexToTimeString(47)).toEqual({ startTime: '23:30', endTime: '24:00' });
    });

    it('computes exact UTC range for a slot in Vietnam date', () => {
      const { startUtc, endUtc } = slotToUtcRange('2026-10-15', 34); // 17:00 - 17:30 VN
      // 17:00 VN is 10:00 UTC (17 - 7)
      expect(startUtc.toISOString()).toBe('2026-10-15T10:00:00.000Z');
      expect(endUtc.toISOString()).toBe('2026-10-15T10:30:00.000Z');
    });
  });
});
