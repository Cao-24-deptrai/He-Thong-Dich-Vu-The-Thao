export enum GymPlanType {
  DAY_1 = 'DAY_1',
  MONTH_1 = 'MONTH_1',
  MONTH_3 = 'MONTH_3',
  MONTH_6 = 'MONTH_6',
}

export enum GymQrStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
}

export interface GymPlanConfig {
  code: GymPlanType;
  name: string;
  price: number;
  durationDays: number;
  description: string;
}

export const GYM_PLANS: Record<GymPlanType, GymPlanConfig> = {
  [GymPlanType.DAY_1]: {
    code: GymPlanType.DAY_1,
    name: 'Gói Tập Ngày (1 Ngày)',
    price: 50000,
    durationDays: 1,
    description: 'Tập không giới hạn giờ trong 1 ngày, tủ locker thông minh',
  },
  [GymPlanType.MONTH_1]: {
    code: GymPlanType.MONTH_1,
    name: 'Gói Hội Viên 1 Tháng (30 Ngày)',
    price: 500000,
    durationDays: 30,
    description: 'Tập không giới hạn 30 ngày, mã QR định danh qua cửa xoay tự động',
  },
  [GymPlanType.MONTH_3]: {
    code: GymPlanType.MONTH_3,
    name: 'Gói Hội Viên 3 Tháng (90 Ngày)',
    price: 1350000, // Tiết kiệm 150k
    durationDays: 90,
    description: 'Tập không giới hạn 90 ngày, ưu tiên giờ cao điểm, đo InBody miễn phí',
  },
  [GymPlanType.MONTH_6]: {
    code: GymPlanType.MONTH_6,
    name: 'Gói Hội Viên 6 Tháng (180 Ngày)',
    price: 2400000, // Tiết kiệm 600k (tương đương 400k/tháng)
    durationDays: 180,
    description: 'Tập không giới hạn 180 ngày, tặng 2 buổi PT 1-1 hướng dẫn kỹ thuật',
  },
};
