import {
  assertValidMoney,
  assertValidMoneyDelta,
  addMoney,
  subtractMoney,
  multiplyMoney,
  formatVnd,
} from './index.js';

describe('packages/shared/money', () => {
  describe('assertValidMoney', () => {
    it('accepts non-negative safe integers', () => {
      expect(() => assertValidMoney(0)).not.toThrow();
      expect(() => assertValidMoney(100000)).not.toThrow();
      expect(() => assertValidMoney(15000000)).not.toThrow();
    });

    it('rejects floating point numbers', () => {
      expect(() => assertValidMoney(100.5)).toThrow(RangeError);
      expect(() => assertValidMoney(0.001)).toThrow(RangeError);
    });

    it('rejects negative numbers', () => {
      expect(() => assertValidMoney(-1)).toThrow(RangeError);
      expect(() => assertValidMoney(-1000)).toThrow(RangeError);
    });

    it('rejects non-number values', () => {
      expect(() => assertValidMoney('1000')).toThrow(TypeError);
      expect(() => assertValidMoney(null)).toThrow(TypeError);
      expect(() => assertValidMoney(undefined)).toThrow(TypeError);
    });
  });

  describe('assertValidMoneyDelta', () => {
    it('accepts negative and positive safe integers', () => {
      expect(() => assertValidMoneyDelta(-50000)).not.toThrow();
      expect(() => assertValidMoneyDelta(50000)).not.toThrow();
      expect(() => assertValidMoneyDelta(0)).not.toThrow();
    });

    it('rejects floats and non-integers', () => {
      expect(() => assertValidMoneyDelta(-10.5)).toThrow(RangeError);
      expect(() => assertValidMoneyDelta(10.5)).toThrow(RangeError);
    });
  });

  describe('addMoney', () => {
    it('correctly adds integers', () => {
      expect(addMoney(100000, 50000)).toBe(150000);
      expect(addMoney(0, 0)).toBe(0);
    });

    it('throws if operands are invalid', () => {
      expect(() => addMoney(100.5, 200)).toThrow(RangeError);
    });
  });

  describe('subtractMoney', () => {
    it('correctly subtracts integers', () => {
      expect(subtractMoney(150000, 50000)).toBe(100000);
      expect(subtractMoney(100000, 100000)).toBe(0);
    });

    it('throws if result is negative', () => {
      expect(() => subtractMoney(50000, 100000)).toThrow(RangeError);
    });
  });

  describe('multiplyMoney', () => {
    it('multiplies and rounds safely to integer VND', () => {
      expect(multiplyMoney(100000, 0.1)).toBe(10000);
      expect(multiplyMoney(100000, 0.155)).toBe(15500);
      expect(multiplyMoney(100003, 0.1)).toBe(10000); // 10000.3 rounded
      expect(multiplyMoney(100007, 0.1)).toBe(10001); // 10000.7 rounded
    });

    it('throws if factor is negative', () => {
      expect(() => multiplyMoney(100000, -1)).toThrow(RangeError);
    });
  });

  describe('formatVnd', () => {
    it('formats amount with Vietnamese currency format', () => {
      const formatted = formatVnd(150000);
      expect(formatted).toContain('150');
      expect(formatted).toContain('đ');
    });
  });
});
