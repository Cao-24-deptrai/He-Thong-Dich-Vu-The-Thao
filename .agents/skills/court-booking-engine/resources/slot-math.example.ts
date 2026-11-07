import { DateTime } from 'luxon';
import { DomainError } from '../../../common/domain-error';

export const TZ = 'Asia/Ho_Chi_Minh';

export interface SlotRange {
  date: string;        // YYYY-MM-DD theo giờ Việt Nam
  firstIndex: number;  // chỉ số ô đầu (0..47 với ô 30 phút)
  count: number;
  indexes: number[];
}

/** Chuyển [startAt, endAt) thành các ô giờ. Không cho phép đi qua nửa đêm (giờ VN). */
export function toSlotRange(startAt: Date, endAt: Date, slotMinutes = 30, minDurationMinutes = 60): SlotRange {
  const s = DateTime.fromJSDate(startAt, { zone: TZ });
  const e = DateTime.fromJSDate(endAt, { zone: TZ });
  const midnight = s.startOf('day').plus({ days: 1 });
  if (e.toMillis() <= s.toMillis()) throw new DomainError('BOOKING_INVALID_RANGE', 'Giờ kết thúc phải sau giờ bắt đầu', 422);
  if (e.toMillis() > midnight.toMillis()) throw new DomainError('BOOKING_CROSSES_MIDNIGHT', 'Lượt đặt không được qua nửa đêm', 422);

  const startMin = s.hour * 60 + s.minute;
  const durMin = Math.round(e.diff(s, 'minutes').minutes);
  if (startMin % slotMinutes !== 0 || durMin % slotMinutes !== 0) {
    throw new DomainError('BOOKING_NOT_ALIGNED', `Thời gian phải là bội số của ${slotMinutes} phút`, 422);
  }
  if (durMin < minDurationMinutes) throw new DomainError('BOOKING_TOO_SHORT', 'Thời lượng tối thiểu chưa đạt', 422);

  const firstIndex = startMin / slotMinutes;
  const count = durMin / slotMinutes;
  return { date: s.toFormat('yyyy-LL-dd'), firstIndex, count, indexes: Array.from({ length: count }, (_, i) => firstIndex + i) };
}
