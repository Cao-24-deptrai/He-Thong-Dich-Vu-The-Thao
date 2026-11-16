import { DateTime } from 'luxon';

/**
 * Tiện ích thời gian múi giờ Việt Nam (Asia/Ho_Chi_Minh)
 * Tuân thủ bất biến Rule 00-invariants:
 * - Lưu trữ UTC trong CSDL
 * - Ngày nghiệp vụ (YYYY-MM-DD) và slot 30 phút tính toán theo Asia/Ho_Chi_Minh
 * - Không tự ý `new Date()` + cộng trừ giờ thủ công
 */

export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const SLOT_DURATION_MINUTES = 30;
export const SLOTS_PER_DAY = 48; // 24 giờ * 2 slot

/**
 * Lấy DateTime hiện tại theo múi giờ Việt Nam
 */
export function nowInVietnam(): DateTime {
  return DateTime.now().setZone(VIETNAM_TIMEZONE);
}

/**
 * Chuyển đổi một đối tượng Date hoặc ISO string sang DateTime múi giờ Việt Nam
 */
export function toVietnamDateTime(input: Date | string): DateTime {
  if (input instanceof Date) {
    return DateTime.fromJSDate(input, { zone: 'utc' }).setZone(VIETNAM_TIMEZONE);
  }
  return DateTime.fromISO(input).setZone(VIETNAM_TIMEZONE);
}

/**
 * Định dạng ngày nghiệp vụ `YYYY-MM-DD` theo múi giờ Việt Nam
 */
export function toVietnamDateString(input: Date | string | DateTime = nowInVietnam()): string {
  const dt = input instanceof DateTime ? input.setZone(VIETNAM_TIMEZONE) : toVietnamDateTime(input);
  const formatted = dt.toFormat('yyyy-MM-dd');
  if (!formatted) {
    throw new Error(`Invalid date format for: ${input}`);
  }
  return formatted;
}

/**
 * Parse chuỗi ngày nghiệp vụ `YYYY-MM-DD` thành đầu ngày (00:00:00) theo múi giờ Việt Nam
 */
export function parseVietnamDate(dateStr: string): DateTime {
  const dt = DateTime.fromFormat(dateStr, 'yyyy-MM-dd', { zone: VIETNAM_TIMEZONE }).startOf('day');
  if (!dt.isValid) {
    throw new Error(`Invalid Vietnam date string (expected YYYY-MM-DD): ${dateStr}`);
  }
  return dt;
}

/**
 * Kiểm tra slot index hợp lệ (0 đến 47)
 */
export function assertValidSlotIndex(slotIndex: number): asserts slotIndex is number {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= SLOTS_PER_DAY) {
    throw new RangeError(`Slot index must be an integer between 0 and 47, received: ${slotIndex}`);
  }
}

/**
 * Chuyển giờ và phút (giờ VN) thành slot index (0 - 47)
 */
export function timeToSlotIndex(hour: number, minute: number): number {
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new RangeError(`Invalid time: ${hour}:${minute}`);
  }
  const slotIndex = Math.floor((hour * 60 + minute) / SLOT_DURATION_MINUTES);
  assertValidSlotIndex(slotIndex);
  return slotIndex;
}

/**
 * Chuyển slot index thành chuỗi hiển thị khung giờ "HH:mm - HH:mm" (giờ VN)
 */
export function slotIndexToTimeString(slotIndex: number): { startTime: string; endTime: string } {
  assertValidSlotIndex(slotIndex);
  const startTotalMinutes = slotIndex * SLOT_DURATION_MINUTES;
  const endTotalMinutes = startTotalMinutes + SLOT_DURATION_MINUTES;

  const startHour = Math.floor(startTotalMinutes / 60).toString().padStart(2, '0');
  const startMinute = (startTotalMinutes % 60).toString().padStart(2, '0');

  const endHour = Math.floor(endTotalMinutes / 60).toString().padStart(2, '0');
  const endMinute = (endTotalMinutes % 60).toString().padStart(2, '0');

  return {
    startTime: `${startHour}:${startMinute}`,
    endTime: `${endHour}:${endMinute}`,
  };
}

/**
 * Tính khoảng thời gian UTC bắt đầu và kết thúc của một slot trong ngày nghiệp vụ
 */
export function slotToUtcRange(dateStr: string, slotIndex: number): { startUtc: Date; endUtc: Date } {
  assertValidSlotIndex(slotIndex);
  const startOfDay = parseVietnamDate(dateStr);
  const startDt = startOfDay.plus({ minutes: slotIndex * SLOT_DURATION_MINUTES });
  const endDt = startDt.plus({ minutes: SLOT_DURATION_MINUTES });

  return {
    startUtc: startDt.toUTC().toJSDate(),
    endUtc: endDt.toUTC().toJSDate(),
  };
}
