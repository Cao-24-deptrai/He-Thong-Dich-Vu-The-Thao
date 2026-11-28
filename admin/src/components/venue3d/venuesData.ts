export type SportCategory =
  | 'FOOTBALL'
  | 'BADMINTON'
  | 'TENNIS'
  | 'BASKETBALL'
  | 'POOL'
  | 'GYM'
  | 'GAMING';

export interface VenueSlot {
  id: string;
  time: string;
  status: 'AVAILABLE' | 'BOOKED' | 'HELD';
  price: number;
  isPeak?: boolean;
  bookedBy?: string;
}

export interface VenueItem {
  id: string;
  name: string;
  shortName: string;
  category: SportCategory;
  categoryLabel: string;
  basePrice: number;
  peakPrice: number;
  position: { x: number; y: number; z: number };
  dimensions: { w: number; h: number };
  subtitle: string;
  status: 'AVAILABLE' | 'BUSY';
}

export const VENUES_DATA: VenueItem[] = [
  {
    id: 'fb-cluster-1',
    name: 'Sân bóng đá mini F1 - F4 (Ghép sân 7 & 11)',
    shortName: 'Sân bóng đá F1 - F4',
    category: 'FOOTBALL',
    categoryLabel: 'Bóng đá',
    basePrice: 250000,
    peakPrice: 325000,
    position: { x: -38, y: 0, z: -16 },
    dimensions: { w: 32, h: 22 },
    subtitle: 'Cụm 4 sân 5 ghép thành sân 7A (F1+F2) - 7B (F3+F4) và sân 11; mặt cỏ FIFA Pro',
    status: 'AVAILABLE',
  },
  {
    id: 'fb-cluster-2',
    name: 'Sân bóng đá mini F5 - F8 (Độc lập & Đèn LED)',
    shortName: 'Sân bóng đá F5 - F8',
    category: 'FOOTBALL',
    categoryLabel: 'Bóng đá',
    basePrice: 250000,
    peakPrice: 325000,
    position: { x: -38, y: 0, z: 16 },
    dimensions: { w: 32, h: 22 },
    subtitle: 'Sân F5-F8 mặt cỏ tiêu chuẩn - camera AI VAR - dàn đèn LED chiếu sáng ban đêm',
    status: 'AVAILABLE',
  },
  {
    id: 'badminton-hall',
    name: 'Cụm 3 sân cầu lông (CL-01, CL-02, CL-03)',
    shortName: 'Cụm 3 sân cầu lông',
    category: 'BADMINTON',
    categoryLabel: 'Cầu lông',
    basePrice: 120000,
    peakPrice: 160000,
    position: { x: 0, y: 0, z: -20 },
    dimensions: { w: 28, h: 18 },
    subtitle: '3 sân thảm PVC chuẩn BWF - trần cao 9m - đèn chống lóa - ghế trọng tài',
    status: 'AVAILABLE',
  },
  {
    id: 'tennis-hall',
    name: 'Cụm 2 sân tennis tiêu chuẩn (T1 & T2)',
    shortName: 'Cụm 2 sân tennis',
    category: 'TENNIS',
    categoryLabel: 'Tennis',
    basePrice: 200000,
    peakPrice: 260000,
    position: { x: 0, y: 0, z: 8 },
    dimensions: { w: 28, h: 24 },
    subtitle: '2 sân cứng Acrylic US Open - đai tâm - đèn cao áp thi đấu chuyên nghiệp',
    status: 'AVAILABLE',
  },
  {
    id: 'basketball-court',
    name: 'Cụm 2 sân bóng rổ tiêu chuẩn (BB1 & BB2)',
    shortName: 'Cụm 2 sân bóng rổ',
    category: 'BASKETBALL',
    categoryLabel: 'Bóng rổ',
    basePrice: 180000,
    peakPrice: 240000,
    position: { x: 0, y: 0, z: 36 },
    dimensions: { w: 28, h: 18 },
    subtitle: '2 sân bóng rổ mặt cao su giảm chấn - 4 trụ bảng rổ kính cường lực FIBA',
    status: 'AVAILABLE',
  },
  {
    id: 'pool-olympic',
    name: 'Hồ bơi 1: Olympic 50m (8 làn bơi tiêu chuẩn)',
    shortName: 'Hồ bơi Olympic 50m',
    category: 'POOL',
    categoryLabel: 'Bể bơi',
    basePrice: 25000,
    peakPrice: 25000,
    position: { x: 38, y: 0, z: -20 },
    dimensions: { w: 24, h: 32 },
    subtitle: 'Dài 50m - 8 làn bơi tiêu chuẩn - sâu 2.0m - phao phân làn - 2 cứu hộ trực',
    status: 'AVAILABLE',
  },
  {
    id: 'pool-warm',
    name: 'Hồ bơi 2: Nước ấm 25m (Trẻ em & Dưỡng sinh)',
    shortName: 'Hồ bơi nước ấm 25m',
    category: 'POOL',
    categoryLabel: 'Bể bơi',
    basePrice: 25000,
    peakPrice: 25000,
    position: { x: 64, y: 0, z: -20 },
    dimensions: { w: 18, h: 20 },
    subtitle: 'Dài 25m - sâu 0.8m đến 1.2m - gia nhiệt Heat Pump 31.5°C - nước ozone',
    status: 'AVAILABLE',
  },
  {
    id: 'gym-complex',
    name: 'Tổ hợp phòng tập Gym & Fitness (AI Face ID)',
    shortName: 'Phòng tập Gym & Fitness',
    category: 'GYM',
    categoryLabel: 'Gym',
    basePrice: 80000,
    peakPrice: 80000,
    position: { x: 40, y: 0, z: 12 },
    dimensions: { w: 22, h: 18 },
    subtitle: 'Dàn tạ tay đôi - máy chạy bộ điện tử - ghế Olympic - cổng xoay Face ID AI',
    status: 'AVAILABLE',
  },
  {
    id: 'esport-vip',
    name: 'Trung tâm Gaming (100 PC: Sảnh + 4 phòng VIP)',
    shortName: 'Trung tâm Gaming 100 PC',
    category: 'GAMING',
    categoryLabel: 'Gaming',
    basePrice: 35000,
    peakPrice: 45000,
    position: { x: 40, y: 0, z: 36 },
    dimensions: { w: 22, h: 18 },
    subtitle: '100 máy PC gaming RTX 4070Ti/4090 - 60 máy sảnh thường + 4 phòng VIP thi đấu',
    status: 'AVAILABLE',
  },
];

export function createInitialSlotsForVenue(venue: VenueItem): VenueSlot[] {
  return [
    { id: 's1', time: '06:00 - 07:30', status: 'AVAILABLE', price: venue.basePrice },
    { id: 's2', time: '07:30 - 09:00', status: 'BOOKED', price: venue.basePrice, bookedBy: 'FC Banker VIP' },
    { id: 's3', time: '09:00 - 10:30', status: 'AVAILABLE', price: venue.basePrice },
    { id: 's4', time: '14:00 - 15:30', status: 'HELD', price: venue.basePrice, bookedBy: 'HĐ Doanh Nghiệp FPT' },
    { id: 's5', time: '15:30 - 17:00', status: 'AVAILABLE', price: venue.basePrice },
    { id: 's6', time: '17:00 - 18:30', status: 'AVAILABLE', price: venue.peakPrice, isPeak: true },
    { id: 's7', time: '18:30 - 20:00', status: 'BOOKED', price: venue.peakPrice, isPeak: true, bookedBy: 'Giải Tứ Hùng' },
    { id: 's8', time: '20:00 - 21:30', status: 'AVAILABLE', price: venue.peakPrice, isPeak: true },
    { id: 's9', time: '21:30 - 23:00', status: 'AVAILABLE', price: venue.basePrice },
  ];
}

export const SPORT_FILTERS: { id: 'ALL' | SportCategory; label: string }[] = [
  { id: 'ALL', label: 'Tất cả (9)' },
  { id: 'FOOTBALL', label: 'Bóng đá' },
  { id: 'TENNIS', label: 'Tennis' },
  { id: 'BADMINTON', label: 'Cầu lông' },
  { id: 'BASKETBALL', label: 'Bóng rổ' },
  { id: 'POOL', label: 'Bể bơi' },
  { id: 'GYM', label: 'Gym' },
  { id: 'GAMING', label: 'Gaming' },
];
