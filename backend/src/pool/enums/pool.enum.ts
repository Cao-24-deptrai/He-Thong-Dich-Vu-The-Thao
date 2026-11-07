export enum PoolTicketType {
  ADULT = 'ADULT',
  CHILD = 'CHILD',
}

export enum PoolTicketStatus {
  UNUSED = 'UNUSED',
  USED = 'USED',
  REFUNDED = 'REFUNDED',
  EXPIRED = 'EXPIRED',
}

export enum PoolCode {
  POOL_50M = 'POOL_50M',
  POOL_25M = 'POOL_25M',
}

// Bảng giá vé bơi theo lượt chuẩn theo BR-31 (chưa VAT)
export const POOL_PRICES: Record<PoolTicketType, number> = {
  [PoolTicketType.ADULT]: 25000, // 25.000 VND / lượt người lớn
  [PoolTicketType.CHILD]: 20000, // 20.000 VND / lượt trẻ em (< 1m4)
};
