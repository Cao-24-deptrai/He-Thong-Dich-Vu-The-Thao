/**
 * Các Enums chuẩn cho Hệ thống Quản lý Tổ hợp Đa Thể thao
 */

export enum Role {
  ADMIN = 'ADMIN', // Chủ cơ sở
  MANAGER = 'MANAGER', // Quản lý
  CASHIER = 'CASHIER', // Thu ngân / Lễ tân
  TRAINER = 'TRAINER', // Huấn luyện viên / PT
  CUSTOMER = 'CUSTOMER', // Khách hàng
}

export enum FacilityType {
  COURT = 'COURT',
  GAME_DESK = 'GAME_DESK',
  GAME_ROOM = 'GAME_ROOM',
  GYM = 'GYM',
}

export enum CourtType {
  FOOTBALL_5 = 'FOOTBALL_5',
  FOOTBALL_7 = 'FOOTBALL_7',
  FOOTBALL_11 = 'FOOTBALL_11',
  TENNIS = 'TENNIS',
  BADMINTON = 'BADMINTON',
  BASKETBALL = 'BASKETBALL',
}

export enum BookingStatus {
  HOLD = 'HOLD', // Giữ chỗ tạm thời (Redis / DB)
  CONFIRMED = 'CONFIRMED', // Đã thanh toán thành công
  CHECKED_IN = 'CHECKED_IN', // Khách đã đến nhận sân
  COMPLETED = 'COMPLETED', // Đã sử dụng xong
  CANCELLED = 'CANCELLED', // Đã hủy (hoàn tiền hoặc không)
  NO_SHOW = 'NO_SHOW', // Khách không đến
}

export enum PaymentMethod {
  CASH = 'CASH', // Tiền mặt tại quầy
  VIETQR = 'VIETQR', // Chuyển khoản QR ngân hàng
  MOMO = 'MOMO', // Ví MoMo
  ZALOPAY = 'ZALOPAY', // Ví ZaloPay
  VNPAY = 'VNPAY', // Cổng VNPay
  INTERNAL_WALLET = 'INTERNAL_WALLET', // Ví nội bộ
}

export enum PaymentStatus {
  CREATED = 'CREATED',
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  MISMATCH = 'MISMATCH', // Số tiền nhận được lệch với số tiền cần trả hoặc thanh toán muộn
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum PaymentProvider {
  CASH = 'CASH',
  VIETQR = 'VIETQR',
  MOMO = 'MOMO',
  ZALOPAY = 'ZALOPAY',
  VNPAY = 'VNPAY',
  INTERNAL_WALLET = 'INTERNAL_WALLET',
}

export enum PaymentOrderType {
  BOOKING = 'BOOKING',
  CANTEEN_ORDER = 'CANTEEN_ORDER',
  RETAIL_ORDER = 'RETAIL_ORDER',
  WALLET_TOPUP = 'WALLET_TOPUP',
  GYM_MEMBERSHIP = 'GYM_MEMBERSHIP',
  EQUIPMENT_RENTAL = 'EQUIPMENT_RENTAL',
  GAMING_SESSION = 'GAMING_SESSION',
  COMBO_PACKAGE = 'COMBO_PACKAGE',
  CLASS_REGISTRATION = 'CLASS_REGISTRATION',
  PT_SESSION = 'PT_SESSION',
  TOURNAMENT_ENTRY_FEE = 'TOURNAMENT_ENTRY_FEE',
}

export enum WalletTxnType {
  DEPOSIT = 'DEPOSIT', // Nạp tiền
  PAYMENT = 'PAYMENT', // Trừ tiền thanh toán dịch vụ
  HOLD = 'HOLD', // Tạm giữ (cho phiên gaming)
  RELEASE = 'RELEASE', // Giải tỏa tạm giữ
  SETTLE = 'SETTLE', // Quyết toán phiên gaming
  REFUND = 'REFUND', // Hoàn tiền
  ADJUSTMENT = 'ADJUSTMENT', // Bút toán điều chỉnh (chỉ admin có quyền)
  WITHDRAW = 'WITHDRAW', // Rút tiền tại quầy
}

export enum WalletCategory {
  COURT = 'COURT',
  GAME_TIME = 'GAME_TIME',
  GAME_ROOM = 'GAME_ROOM',
  CANTEEN = 'CANTEEN',
  RENTAL = 'RENTAL',
}

export enum OutboxStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

export enum InvoiceStatus {
  PENDING = 'PENDING',
  ISSUED = 'ISSUED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REPLACED = 'REPLACED',
}

export enum InvoiceProvider {
  MOCK = 'MOCK',
  MISA = 'MISA',
  VIETTEL = 'VIETTEL',
  VNPT = 'VNPT',
}

export enum BuyerType {
  INDIVIDUAL = 'INDIVIDUAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum NotificationChannel {
  PUSH = 'PUSH',
  ZNS = 'ZNS',
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  FALLBACK = 'FALLBACK',
}

export enum NotificationEventType {
  OTP_CODE = 'OTP_CODE',
  BOOKING_HELD = 'BOOKING_HELD',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_REMINDER = 'BOOKING_REMINDER',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_RESCHEDULED = 'BOOKING_RESCHEDULED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_MISMATCH = 'PAYMENT_MISMATCH',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  WALLET_TOPUP = 'WALLET_TOPUP',
  INVOICE_ISSUED = 'INVOICE_ISSUED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
}

export enum GymMembershipStatus {
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  UPGRADED = 'UPGRADED',
  CANCELLED = 'CANCELLED',
}

export enum GymAccessType {
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT',
  AUTO_CHECK_OUT = 'AUTO_CHECK_OUT',
}

export enum GymAccessMethod {
  RFID = 'RFID',
  DYNAMIC_QR = 'DYNAMIC_QR',
  FINGERPRINT = 'FINGERPRINT',
  MANUAL = 'MANUAL',
}

export enum ProductCategory {
  CANTEEN = 'CANTEEN',
  RETAIL = 'RETAIL',
}

export enum StockTxnType {
  PURCHASE_IN = 'PURCHASE_IN',
  SALE_OUT = 'SALE_OUT',
  RETURN_IN = 'RETURN_IN',
  DISCARD_OUT = 'DISCARD_OUT',
  AUDIT_ADJUST = 'AUDIT_ADJUST',
}

export enum CashierShiftStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum CanteenOrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum RentalPricingType {
  PER_TURN = 'PER_TURN',
  HOURLY = 'HOURLY',
}

export enum RentalTicketStatus {
  RENTING = 'RENTING',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum RentalItemCondition {
  GOOD = 'GOOD',
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
}

export enum GamingMachineZone {
  STANDARD = 'STANDARD',
  VIP = 'VIP',
  STREAMING = 'STREAMING',
  PRIVATE_ROOM = 'PRIVATE_ROOM',
}

export enum GamingMachineStatus {
  OFFLINE = 'OFFLINE',
  IDLE = 'IDLE',
  IN_USE = 'IN_USE',
  LOCKED = 'LOCKED',
  MAINTENANCE = 'MAINTENANCE',
}

export enum GamingSessionStatus {
  STARTING = 'STARTING',
  ACTIVE = 'ACTIVE',
  OFFLINE_GRACE = 'OFFLINE_GRACE',
  LOCKED = 'LOCKED',
  ENDING = 'ENDING',
  SETTLED = 'SETTLED',
}

export enum GamingRemoteAction {
  LOCK = 'LOCK',
  UNLOCK = 'UNLOCK',
  MESSAGE = 'MESSAGE',
  REBOOT = 'REBOOT',
  SHUTDOWN = 'SHUTDOWN',
  END_SESSION = 'END_SESSION',
  SWITCH_MACHINE = 'SWITCH_MACHINE',
}

export enum VoucherDiscountType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export enum VoucherScope {
  COURT = 'COURT',
  CANTEEN = 'CANTEEN',
  GYM = 'GYM',
  RENTAL = 'RENTAL',
  GAMING = 'GAMING',
  ALL = 'ALL',
}

export enum PromotionChannel {
  ONLINE = 'ONLINE',
  POS = 'POS',
  ALL = 'ALL',
}

export enum ComboItemType {
  COURT_HOURS = 'COURT_HOURS',
  GYM_DAYS = 'GYM_DAYS',
  PT_SESSIONS = 'PT_SESSIONS',
  GAMING_HOURS = 'GAMING_HOURS',
}

export enum UserPackageStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  DEPLETED = 'DEPLETED',
}

export enum ClassType {
  YOGA = 'YOGA',
  ZUMBA = 'ZUMBA',
  PILATES = 'PILATES',
  BOXING = 'BOXING',
  SPINNING = 'SPINNING',
  AEROBIC = 'AEROBIC',
  CROSSFIT = 'CROSSFIT',
  GENERAL = 'GENERAL',
}

export enum ClassSessionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ClassRegistrationStatus {
  REGISTERED = 'REGISTERED',
  CHECKED_IN = 'CHECKED_IN',
  CANCELLED = 'CANCELLED',
}

export enum PtSessionStatus {
  BOOKED = 'BOOKED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum StaffShiftType {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  EVENING = 'EVENING',
  NIGHT = 'NIGHT',
  FULL_DAY = 'FULL_DAY',
}

export enum StaffEmploymentStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED',
}

export enum TournamentType {
  SPORT = 'SPORT',
  ESPORT = 'ESPORT',
}

export enum TournamentFormat {
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
  DOUBLE_ELIMINATION = 'DOUBLE_ELIMINATION',
  ROUND_ROBIN = 'ROUND_ROBIN',
  GROUP_STAGE_ELIMINATION = 'GROUP_STAGE_ELIMINATION',
}

export enum TournamentStatus {
  DRAFT = 'DRAFT',
  REGISTRATION_OPEN = 'REGISTRATION_OPEN',
  REGISTRATION_CLOSED = 'REGISTRATION_CLOSED',
  BRACKET_GENERATED = 'BRACKET_GENERATED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TournamentTeamStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  CONFIRMED = 'CONFIRMED',
  WITHDRAWN = 'WITHDRAWN',
  DISQUALIFIED = 'DISQUALIFIED',
}

export enum TournamentMatchStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FORFEIT = 'FORFEIT',
  CANCELLED = 'CANCELLED',
}

export enum TournamentBracketType {
  WINNERS = 'WINNERS',
  LOSERS = 'LOSERS',
  FINALS = 'FINALS',
  ROUND_ROBIN = 'ROUND_ROBIN',
}

export enum BridgeAgentStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  ERROR = 'ERROR',
  REVOKED = 'REVOKED',
}

export enum DeviceType {
  RFID_READER = 'RFID_READER',
  QR_SCANNER = 'QR_SCANNER',
  TURNSTILE = 'TURNSTILE',
  ESC_POS_PRINTER = 'ESC_POS_PRINTER',
  CASH_DRAWER = 'CASH_DRAWER',
  COURT_RELAY = 'COURT_RELAY',
}

export enum DeviceHealthStatus {
  OK = 'OK',
  ERROR = 'ERROR',
  DISCONNECTED = 'DISCONNECTED',
  OUT_OF_PAPER = 'OUT_OF_PAPER',
  JAMMED = 'JAMMED',
}

export enum DeviceCommandType {
  PRINT_RECEIPT = 'PRINT_RECEIPT',
  OPEN_CASH_DRAWER = 'OPEN_CASH_DRAWER',
  TRIGGER_TURNSTILE = 'TRIGGER_TURNSTILE',
  SWITCH_COURT_LIGHT = 'SWITCH_COURT_LIGHT',
  SYNC_MEMBERS = 'SYNC_MEMBERS',
}

export enum DeviceCommandStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum DeviceEventType {
  RFID_SWIPED = 'RFID_SWIPED',
  QR_SCANNED = 'QR_SCANNED',
  TURNSTILE_PASSED = 'TURNSTILE_PASSED',
  PRINTER_STATUS_CHANGED = 'PRINTER_STATUS_CHANGED',
  DRAWER_OPENED = 'DRAWER_OPENED',
  TAMPER_ALERT = 'TAMPER_ALERT',
}



