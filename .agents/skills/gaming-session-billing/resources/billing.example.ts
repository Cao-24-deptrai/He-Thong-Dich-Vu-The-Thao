import { DateTime } from 'luxon';
const TZ = 'Asia/Ho_Chi_Minh';

/**
 * Tính tiền phiên chơi theo PHÚT, mỗi phút theo mức giá của chính phút đó (đi qua mốc cao/thấp điểm vẫn đúng).
 * Số nguyên tuyệt đối: cộng "đồng/giờ" của từng phút rồi chia 60 làm tròn LÊN một lần ở cuối.
 *  - minutes = ceil(giây đã dùng / 60)  (làm tròn lên phút)
 *  - roundingStepVnd mặc định 1 (làm tròn lên bậc 100/500 nếu nghiệp vụ muốn → hỏi và ghi ADR)
 */
export function priceMinutes(
  startAt: Date,
  minutes: number,
  ratePerHourAt: (minuteOfDay: number) => number, // đồng/giờ theo khung giờ của nhóm máy
  opts: { minChargeVnd?: number; roundingStepVnd?: number } = {},
): number {
  const { minChargeVnd = 0, roundingStepVnd = 1 } = opts;
  const s = DateTime.fromJSDate(startAt, { zone: TZ });
  let sum = 0;
  for (let i = 0; i < minutes; i++) {
    const t = s.plus({ minutes: i });
    sum += ratePerHourAt(t.hour * 60 + t.minute);
  }
  const raw = Math.ceil(sum / 60);
  const rounded = Math.ceil(raw / roundingStepVnd) * roundingStepVnd;
  return Math.max(rounded, minChargeVnd);
}

/** Số tiền cần tạm giữ cho một đợt: dùng mức giá CAO NHẤT trong đợt để không bao giờ thiếu. */
export function holdAmount(startAt: Date, chunkMinutes: number, ratePerHourAt: (m: number) => number): number {
  const s = DateTime.fromJSDate(startAt, { zone: TZ });
  let max = 0;
  for (let i = 0; i < chunkMinutes; i++) {
    const t = s.plus({ minutes: i });
    max = Math.max(max, ratePerHourAt(t.hour * 60 + t.minute));
  }
  return Math.ceil((max * chunkMinutes) / 60);
}
