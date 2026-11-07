import { DateTime } from 'luxon';
const TZ = 'Asia/Ho_Chi_Minh';

// Ngày hết hạn tính CẢ NGÀY CUỐI (inclusive): gói 30 ngày bắt đầu 01/11 hết hạn 30/11.
export const endDateOf = (start: DateTime, durationDays: number) => start.plus({ days: durationDays - 1 });
const today = () => DateTime.now().setZone(TZ).startOf('day');

/** Gia hạn: còn hạn → cộng dồn (bắt đầu = ngày hết hạn + 1); hết hạn → từ hôm nay. */
export function renewal(current: { endDate: DateTime } | null, plan: { durationDays: number; price: number; earlyRenewDays: number; earlyRenewDiscountPct: number }) {
  const t = today();
  const active = current && current.endDate >= t;
  const start = active ? current!.endDate.plus({ days: 1 }) : t;
  const daysLeft = active ? Math.round(current!.endDate.diff(t, 'days').days) + 1 : 0;
  const early = active && daysLeft >= plan.earlyRenewDays;
  const discount = early ? Math.floor((plan.price * plan.earlyRenewDiscountPct) / 100) : 0;
  return { start, end: endDateOf(start, plan.durationDays), amount: plan.price - discount, discount };
}

/** Nâng cấp (A10): trừ giá trị còn lại của gói cũ; gói mới bắt đầu từ hôm nay; không hạ cấp. */
export function upgrade(current: { startDate: DateTime; endDate: DateTime; pricePaid: number; durationDays: number }, newPlan: { durationDays: number; price: number }) {
  const t = today();
  const remainingDays = Math.max(0, Math.round(current.endDate.diff(t, 'days').days) + 1); // tính cả hôm nay
  const credit = Math.floor((current.pricePaid * remainingDays) / current.durationDays);
  const payable = Math.max(0, newPlan.price - credit);
  if (newPlan.price <= current.pricePaid) throw new Error('DOWNGRADE_NOT_ALLOWED'); // hoặc DomainError
  return { start: t, end: endDateOf(t, newPlan.durationDays), credit, payable };
}
