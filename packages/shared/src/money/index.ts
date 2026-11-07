/**
 * Tiện ích tiền tệ VND cho Hệ thống Quản lý Tổ hợp Đa Thể thao
 * Tuân thủ bất biến Rule 00-invariants:
 * - Tiền là số nguyên VND (Number.isSafeInteger)
 * - Không dùng float, không toFixed, không Decimal128
 */

export type Money = number;

/**
 * Kiểm tra giá trị tiền hợp lệ: phải là số nguyên an toàn (Safe Integer) và không âm.
 */
export function assertValidMoney(amount: unknown, fieldName = 'amount'): asserts amount is number {
  if (typeof amount !== 'number') {
    throw new TypeError(`${fieldName} must be a number, received ${typeof amount}`);
  }
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`${fieldName} must be a safe integer (no float), received ${amount}`);
  }
  if (amount < 0) {
    throw new RangeError(`${fieldName} cannot be negative, received ${amount}`);
  }
}

/**
 * Kiểm tra giá trị biến động tiền (có thể âm khi trừ hoặc dương khi nạp/cộng).
 */
export function assertValidMoneyDelta(delta: unknown, fieldName = 'delta'): asserts delta is number {
  if (typeof delta !== 'number') {
    throw new TypeError(`${fieldName} must be a number, received ${typeof delta}`);
  }
  if (!Number.isSafeInteger(delta)) {
    throw new RangeError(`${fieldName} must be a safe integer (no float), received ${delta}`);
  }
}

/**
 * Cộng 2 khoản tiền VND
 */
export function addMoney(a: number, b: number): number {
  assertValidMoney(a, 'First operand');
  assertValidMoney(b, 'Second operand');
  const result = a + b;
  assertValidMoney(result, 'Addition result');
  return result;
}

/**
 * Trừ 2 khoản tiền VND (kết quả không được âm)
 */
export function subtractMoney(minuend: number, subtrahend: number): number {
  assertValidMoney(minuend, 'Minuend');
  assertValidMoney(subtrahend, 'Subtrahend');
  const result = minuend - subtrahend;
  if (result < 0) {
    throw new RangeError(`Result cannot be negative: ${minuend} - ${subtrahend} = ${result}`);
  }
  assertValidMoney(result, 'Subtraction result');
  return result;
}

/**
 * Nhân khoản tiền với một hệ số (ví dụ tỉ lệ chiết khấu, số lượng, hoặc số giờ)
 * Làm tròn nguyên VND theo chuẩn Math.round
 */
export function multiplyMoney(amount: number, factor: number): number {
  assertValidMoney(amount, 'Amount');
  if (typeof factor !== 'number' || Number.isNaN(factor) || factor < 0) {
    throw new RangeError(`Factor must be a non-negative number, received ${factor}`);
  }
  const result = Math.round(amount * factor);
  assertValidMoney(result, 'Multiplication result');
  return result;
}

/**
 * Định dạng tiền tệ VND chuẩn Việt Nam (vd: 150.000 đ)
 */
export function formatVnd(amount: number): string {
  assertValidMoney(amount, 'Amount');
  return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
}
