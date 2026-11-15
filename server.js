const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// IN-MEMORY DATABASE FOR SPORTS COMPLEX HUB
// ==========================================

// Audit Log Store (Epic E16)
let auditLogs = [
  {
    id: 'AUD-9015',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    actor: 'Thu ngân: Cáp Nguyễn Thanh Huyền (NV-HUYEN-07)',
    action: 'MỞ CA SÁNG (07:00 - 15:00)',
    epic: 'E06',
    severity: 'INFO',
    detail: 'Thu ngân Cáp Nguyễn Thanh Huyền mở ca sáng #CA-20261026-01 với quỹ đầu ca 1,500,000 VND.',
    metadata: { shiftId: 'CA-20261026-01', cashier: 'Cáp Nguyễn Thanh Huyền', initialCash: 1500000 }
  },
  {
    id: 'AUD-9012',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    actor: 'Chủ tổ hợp: Hoàng Đình Dũng (Owner)',
    action: 'CHỦ KIỂM TRA & DUYỆT BÀN GIAO CA',
    epic: 'E06',
    severity: 'SUCCESS',
    detail: 'Chủ tổ hợp kiểm tra và phê duyệt bàn giao Ca Tối hôm qua (Nguyễn Văn Đạt bàn giao, khớp 100% két 4,850,000 VND).',
    metadata: { shiftId: 'CA-20261025-03', auditResult: 'APPROVED', difference: 0 }
  },
  {
    id: 'AUD-9011',
    timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    actor: 'Hệ thống VietQR Webhook (T2)',
    action: 'THANH TOÁN THÀNH CÔNG',
    epic: 'E04',
    severity: 'SUCCESS',
    detail: 'Giao dịch MBBank 450,000 VND khớp mã đơn SPORT-BK-7712 (Sân Pickleball VIP 2).',
    metadata: { orderId: 'SPORT-BK-7712', amount: 450000, bankRef: 'MBB7894231' }
  },
  {
    id: 'AUD-9010',
    timestamp: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
    actor: 'Quản lý: Lê Hoàng Nam (T1)',
    action: 'CỨU ĐƠN BẤT THƯỜNG',
    epic: 'E04',
    severity: 'WARNING',
    detail: 'Khách chuyển khoản thiếu cú pháp nội dung "Dat san 5". Khớp thủ công vào đơn SPORT-BK-7690.',
    metadata: { orderId: 'SPORT-BK-7690', rescuedAmount: 600000, matchedBy: 'phone_amount' }
  },
  {
    id: 'AUD-9009',
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    actor: 'Thủ kho: Nguyễn Quốc Huy (T3)',
    action: 'KIỂM KÊ & ĐIỀU CHỈNH KHO',
    epic: 'E06',
    severity: 'WARNING',
    detail: 'Kiểm kê chênh lệch sản phẩm Quấn cán vợt Yonex (-2 chiếc do rách vỏ bảo quản).',
    metadata: { itemCode: 'YONEX-GRIP', systemQty: 25, actualQty: 23 }
  }
];

function logAudit(actor, action, epic, severity, detail, metadata = {}) {
  const logEntry = {
    id: 'AUD-' + Math.floor(1000 + Math.random() * 9000),
    timestamp: new Date().toISOString(),
    actor,
    action,
    epic,
    severity,
    detail,
    metadata
  };
  auditLogs.unshift(logEntry);
  if (auditLogs.length > 200) auditLogs.pop();
  return logEntry;
}

// ==========================================
// EPIC E04: VIETQR, CỨU ĐƠN & HOÀN TIỀN
// ==========================================

let vietqrOrders = [
  {
    orderId: 'SPORT-BK-8924',
    customerName: 'Nguyễn Tiến Đạt',
    customerPhone: '0988123456',
    courtName: 'Sân Bóng Đá Số 3 (7 người)',
    timeSlot: '18:00 - 19:30 (Hôm nay)',
    amount: 550000,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    accountNumber: '098812345688',
    bankBin: '970422',
    bankName: 'MB Bank',
    accountName: 'TO HOP THE THAO SAO VANG',
    memo: 'SPORT BK 8924'
  },
  {
    orderId: 'SPORT-BK-8925',
    customerName: 'Trần Quỳnh Nga',
    customerPhone: '0912345678',
    courtName: 'Sân Pickleball Pro Court 1',
    timeSlot: '19:30 - 21:00 (Hôm nay)',
    amount: 320000,
    status: 'PAID',
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    paidAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    accountNumber: '098812345688',
    bankBin: '970422',
    bankName: 'MB Bank',
    accountName: 'TO HOP THE THAO SAO VANG',
    memo: 'SPORT BK 8925',
    transactionRef: 'FT262991084201'
  },
  {
    orderId: 'SPORT-BK-8920',
    customerName: 'Lê Tuấn Hưng',
    customerPhone: '0977654321',
    courtName: 'Sân Cầu Lông Số 4',
    timeSlot: '17:00 - 18:30 (Hôm nay)',
    amount: 240000,
    status: 'PAID',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    paidAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    accountNumber: '098812345688',
    bankBin: '970422',
    bankName: 'MB Bank',
    accountName: 'TO HOP THE THAO SAO VANG',
    memo: 'SPORT BK 8920',
    transactionRef: 'FT262991081122'
  }
];

let unmatchedTransactions = [
  {
    bankTransId: 'MBB-TX-99214',
    bankName: 'MB Bank',
    transferTime: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    amount: 480000,
    rawContent: 'LE VAN QUANG CHUYEN TIEN SAN TENNIS CHIỀU NAY',
    senderAccount: '970422******1942',
    senderName: 'LÊ VĂN QUANG',
    rescueStatus: 'PENDING',
    suggestedBookingId: 'SPORT-BK-8919'
  },
  {
    bankTransId: 'VCB-TX-77319',
    bankName: 'Vietcombank',
    transferTime: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
    amount: 350000,
    rawContent: 'PHAM HONG HAI TT COC PICKLEBALL 0933888999',
    senderAccount: '970436******7711',
    senderName: 'PHẠM HỒNG HẢI',
    rescueStatus: 'PENDING',
    suggestedBookingId: 'SPORT-BK-8918'
  }
];

let refundRequests = [
  {
    refundId: 'RF-2026-001',
    bookingId: 'SPORT-BK-8899',
    customerName: 'Đặng Quốc Bảo',
    customerPhone: '0909112233',
    originalAmount: 600000,
    refundAmount: 600000,
    reason: 'Mưa to ngập sân ngoài trời (Sân bóng đá sân 7)',
    requestTime: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    status: 'APPROVED_PENDING_PAYOUT',
    method: 'VIETQR_REVERSE',
    bankName: 'Techcombank',
    accountNumber: '190345678910',
    accountName: 'DANG QUOC BAO'
  },
  {
    refundId: 'RF-2026-002',
    bookingId: 'SPORT-BK-8840',
    customerName: 'Hoàng Mai Phương',
    customerPhone: '0944556677',
    originalAmount: 300000,
    refundAmount: 240000,
    reason: 'Khách báo huỷ lịch tập Pickleball trước 10 tiếng',
    requestTime: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    status: 'COMPLETED',
    method: 'WALLET',
    completedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    approvedBy: 'Lê Hoàng Nam (Quản lý)'
  }
];

// ==========================================
// EPIC E06: QUẦY POS BÁN LẺ VỚI HÌNH ẢNH THẬT
// ==========================================

let inventoryProducts = [
  {
    id: 'PRD-01',
    barcode: '893456011',
    name: 'Nước Bù Khoáng Pocari Sweat 500ml',
    category: 'BEVERAGE',
    price: 20000,
    cost: 12000,
    stock: 14,
    minThreshold: 20, // Low stock alert!
    unit: 'Chai',
    imageUrl: '/images/pocari.png',
    desc: 'Đã có Pocari Sweat bù nước nhanh bổ sung ion thiết yếu khi tập luyện'
  },
  {
    id: 'PRD-02',
    barcode: '893456012',
    name: 'Nước Tăng Lực Bò Húc Red Bull Lon Vàng 250ml',
    category: 'BEVERAGE',
    price: 18000,
    cost: 10500,
    stock: 45,
    minThreshold: 25,
    unit: 'Lon',
    imageUrl: '/images/redbull.png',
    desc: 'Nước tăng lực Red Bull Krating Daeng nạp năng lượng bừng tỉnh sảng khoái'
  },
  {
    id: 'PRD-03',
    barcode: '893456013',
    name: 'Nước Suối Tinh Khiết TH true WATER 500ml',
    category: 'BEVERAGE',
    price: 12000,
    cost: 6000,
    stock: 62,
    minThreshold: 30,
    unit: 'Chai',
    imageUrl: '/images/water.png',
    desc: 'Nước uống tinh khiết TH true WATER từ nguồn nước ngầm tự nhiên'
  },
  {
    id: 'PRD-04',
    barcode: '893456021',
    name: 'Thuê Vợt Pickleball Selkirk Vanguard Pro (Theo Giờ)',
    category: 'RENTAL',
    price: 50000,
    cost: 0,
    stock: 8,
    minThreshold: 3,
    unit: 'Chiếc/Lượt',
    imageUrl: '/images/pickleball_paddle.jpg',
    desc: 'Mặt carbon T700 cao cấp, trợ lực xoáy cực tốt'
  },
  {
    id: 'PRD-05',
    barcode: '893456022',
    name: 'Hộp Bóng Pickleball Franklin X-40 (Hộp 3 Quả)',
    category: 'EQUIPMENT',
    price: 140000,
    cost: 95000,
    stock: 5,
    minThreshold: 6, // Low stock alert!
    unit: 'Hộp',
    imageUrl: '/images/pickleball_balls.jpg',
    desc: 'Bóng thi đấu chuẩn USAPA, độ nảy và độ bền ngoài trời cao'
  },
  {
    id: 'PRD-06',
    barcode: '893456023',
    name: 'Thuê Vợt Cầu Lông Yonex Astrox 88D Pro (Theo Giờ)',
    category: 'RENTAL',
    price: 40000,
    cost: 0,
    stock: 12,
    minThreshold: 4,
    unit: 'Chiếc/Lượt',
    imageUrl: '/images/badminton_racket.jpg',
    desc: 'Dòng vợt tấn công smash cắm sàn chuyên nghiệp'
  },
  {
    id: 'PRD-07',
    barcode: '893456024',
    name: 'Quấn Cán Vợt Cầu Lông / Pickleball Yonex Super Grap',
    category: 'EQUIPMENT',
    price: 35000,
    cost: 20000,
    stock: 23,
    minThreshold: 10,
    unit: 'Cái',
    imageUrl: '/images/grip_tape.jpg',
    desc: 'Chống trơn trượt, thấm hút mồ hôi tay cực êm'
  },
  {
    id: 'PRD-08',
    barcode: '893456031',
    name: 'Thanh Năng Lượng Hạt Dinh Dưỡng NUTSBAR ENERGY',
    category: 'SNACK',
    price: 45000,
    cost: 28000,
    stock: 19,
    minThreshold: 10,
    unit: 'Thanh',
    imageUrl: '/images/nutsbar.png',
    desc: 'Thanh hạt dinh dưỡng NUTSBAR ENERGY vị táo đỏ bùi ngậy, nạp năng lượng tức thì'
  },
  {
    id: 'PRD-09',
    barcode: '893456032',
    name: 'Xúc Xích Tiệt Trùng OH TEEN LC Foods 200g',
    category: 'SNACK',
    price: 15000,
    cost: 8000,
    stock: 35,
    minThreshold: 15,
    unit: 'Gói',
    imageUrl: '/images/ohteen_sausage.png',
    desc: 'Xúc xích tiệt trùng Oh Teen LC Foods thơm ngon, tiện lợi bổ sung năng lượng'
  },
  {
    id: 'PRD-10',
    barcode: '893456041',
    name: 'Combo Trận Đấu Năng Lượng (1 Pocari + 1 Bò Húc + Bóng)',
    category: 'COMBO',
    price: 165000,
    cost: 116000,
    stock: 15,
    minThreshold: 5,
    unit: 'Set',
    imageUrl: '/images/combo.jpg',
    desc: 'Combo ưu đãi tiết kiệm 15,000đ cho nhóm tập luyện'
  }
];

let posOrders = [
  {
    id: 'POS-20261026-089',
    time: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    cashierName: 'Cáp Nguyễn Thanh Huyền (Ca Sáng 06:00 - 12:00)',
    items: [
      { name: 'Nước Bù Khoáng Pocari Sweat 500ml', qty: 2, price: 20000 },
      { name: 'Thuê Vợt Pickleball Selkirk Vanguard Pro', qty: 2, price: 50000 }
    ],
    subtotal: 140000,
    discount: 0,
    total: 140000,
    paymentMethod: 'VIETQR',
    status: 'PAID'
  },
  {
    id: 'POS-20261026-088',
    time: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    cashierName: 'Cáp Nguyễn Thanh Huyền (Ca Sáng 06:00 - 12:00)',
    items: [
      { name: 'Nước Suối Tinh Khiết Aquafina 500ml', qty: 4, price: 12000 },
      { name: 'Thanh Năng Lượng Protein Bar Whey 60g', qty: 2, price: 45000 }
    ],
    subtotal: 138000,
    discount: 10000,
    total: 128000,
    paymentMethod: 'CASH',
    status: 'PAID'
  }
];

// ==============================================================================
// CẤU TRÚC 3 CA CHÍNH (6H-12H, 12H-18H, 18H-23H) + CA GÃY CUỐI TUẦN (T7 & CN)
// ==============================================================================

const SHIFT_SCHEDULES = [
  {
    id: 'CA_SANG',
    name: 'Ca Sáng',
    timeRange: '06:00 - 12:00',
    duration: '6 tiếng',
    defaultCashier: 'Cáp Nguyễn Thanh Huyền',
    staffId: 'NV-HUYEN-06',
    type: 'MAIN',
    applicableDays: 'Thứ 2 - Chủ Nhật (Hàng ngày)',
    description: 'Ca sáng mở cửa tổ hợp lúc 06:00, đón khách đá bóng, tennis & pickleball sáng sớm'
  },
  {
    id: 'CA_CHIEU',
    name: 'Ca Chiều',
    timeRange: '12:00 - 18:00',
    duration: '6 tiếng',
    defaultCashier: 'Đặng Minh Quân',
    staffId: 'NV-QUAN-12',
    type: 'MAIN',
    applicableDays: 'Thứ 2 - Chủ Nhật (Hàng ngày)',
    description: 'Ca chiều đón khách giờ trưa văn phòng và chuẩn bị tiếp quản giờ cao điểm'
  },
  {
    id: 'CA_TOI',
    name: 'Ca Tối (Ca Cuối Trong Ngày)',
    timeRange: '18:00 - 23:00',
    duration: '5 tiếng',
    defaultCashier: 'Phạm Hoàng Long',
    staffId: 'NV-LONG-18',
    type: 'MAIN',
    applicableDays: 'Thứ 2 - Chủ Nhật (Hàng ngày)',
    description: 'Ca cuối cùng trong ngày (18h-23h). Sau 23h đóng cửa tổ hợp, kết ca an toàn, không làm đêm. Sáng 06h hôm sau mở ca mới.'
  },
  {
    id: 'CA_GAY_CUOI_TUAN_CHIEU',
    name: 'Ca Gãy Cuối Tuần - Cao Điểm Chiều Tối',
    timeRange: '16:00 - 20:00',
    duration: '4 tiếng',
    defaultCashier: 'Lê Thu Trang',
    staffId: 'NV-GAY-TRANG',
    type: 'SPLIT_WEEKEND',
    applicableDays: 'Thứ Bảy & Chủ Nhật (Cuối tuần đông khách)',
    description: 'Tăng cường quầy thu ngân F&B và dịch vụ khi lượng khách thi đấu cuối tuần tăng đột biến'
  },
  {
    id: 'CA_GAY_CUOI_TUAN_SANG',
    name: 'Ca Gãy Cuối Tuần - Giải Đấu Sáng Trưa',
    timeRange: '08:30 - 12:30',
    duration: '4 tiếng',
    defaultCashier: 'Vũ Tuấn Kiệt',
    staffId: 'NV-GAY-KIET',
    type: 'SPLIT_WEEKEND',
    applicableDays: 'Thứ Bảy & Chủ Nhật (Cuối tuần đông khách)',
    description: 'Tăng cường hỗ trợ các giải giao hữu bóng đá & pickleball sáng thứ 7 và chủ nhật'
  }
];

// Ca làm việc hiện tại: Ca Sáng (06:00 - 12:00) do Cáp Nguyễn Thanh Huyền phụ trách
let currentShift = {
  shiftId: 'CA-20261027-01',
  shiftCode: 'CA_SANG',
  shiftName: 'Ca Sáng (06:00 - 12:00)',
  dayOfWeek: 'Hôm nay: Thứ Ba, 27/10/2026',
  cashierName: 'Cáp Nguyễn Thanh Huyền',
  cashierStaffId: 'NV-HUYEN-06',
  openedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // Mở từ 06:00 sáng
  initialCash: 1500000, // Quỹ đầu ca trong két
  status: 'ACTIVE', // ACTIVE, HANDED_OVER, OWNER_AUDITED
  cashSales: 1680000,
  vietqrSales: 3450000,
  cardPosSales: 1120000,
  totalSales: 6250000,
  cashPayouts: 200000, // Chi tiền mua đá lạnh quầy
  expectedCashInDrawer: 1500000 + 1680000 - 200000, // 2,980,000 VND
  handoverTo: 'Đặng Minh Quân (Ca Chiều 12:00 - 18:00)',
  ownerAuditStatus: 'WAITING_FOR_HANDOVER', // WAITING_FOR_HANDOVER, PENDING_OWNER_AUDIT, OWNER_APPROVED, FLAGGED_DISCREPANCY
  ownerAuditNotes: '',
  ownerAuditedAt: null
};

// Lịch sử các ca đã bàn giao và được chủ kiểm tra
let shiftHistory = [
  {
    shiftId: 'CA-20261026-03',
    shiftCode: 'CA_TOI',
    shiftName: 'Ca Tối (18:00 - 23:00 - Ca Cuối Ngày)',
    cashierName: 'Phạm Hoàng Long',
    cashierStaffId: 'NV-LONG-18',
    handoverTo: 'Hoàng Đình Dũng (Chủ Tổ Hợp - Khóa Két Đóng Cửa 23h)',
    openedAt: '2026-10-26T18:00:00.000Z',
    closedAt: '2026-10-26T23:05:00.000Z',
    initialCash: 1500000,
    actualCashCounted: 4850000,
    expectedCash: 4850000,
    difference: 0,
    vietqrTotal: 12450000,
    cardPosTotal: 3800000,
    status: 'BALANCED',
    ownerAuditStatus: 'OWNER_APPROVED',
    ownerAuditNotes: 'Chủ tổ hợp Hoàng Đình Dũng: Đã kiểm tra số dư két khớp 100%, niêm phong két lúc 23h đóng cửa, sáng 06h mở lại.',
    ownerAuditedAt: '2026-10-26T23:25:00.000Z',
    cashBreakdown: { 500000: 6, 200000: 6, 100000: 4, 50000: 4, 20000: 2, 10000: 1, 5000: 0, 2000: 0, 1000: 0 },
    note: 'Kết thúc ca tối cuối cùng trong ngày (23h). Đã kiểm tra cụm sân, tắt đèn, niêm phong két tiền.'
  },
  {
    shiftId: 'CA-20261026-02',
    shiftCode: 'CA_CHIEU',
    shiftName: 'Ca Chiều (12:00 - 18:00)',
    cashierName: 'Đặng Minh Quân',
    cashierStaffId: 'NV-QUAN-12',
    handoverTo: 'Phạm Hoàng Long (Ca Tối 18:00 - 23:00)',
    openedAt: '2026-10-26T12:00:00.000Z',
    closedAt: '2026-10-26T18:05:00.000Z',
    initialCash: 1500000,
    actualCashCounted: 3200000,
    expectedCash: 3200000,
    difference: 0,
    vietqrTotal: 6500000,
    cardPosTotal: 2100000,
    status: 'BALANCED',
    ownerAuditStatus: 'OWNER_APPROVED',
    ownerAuditNotes: 'Chủ kiểm tra: Bàn giao ca chiều sang ca tối đầy đủ, hóa đơn chuẩn.',
    ownerAuditedAt: '2026-10-26T18:30:00.000Z',
    cashBreakdown: { 500000: 4, 200000: 4, 100000: 3, 50000: 1, 20000: 2, 10000: 1, 5000: 0, 2000: 0, 1000: 0 },
    note: 'Bàn giao ca chiều cho ca tối phục vụ giải đấu đêm.'
  }
];

// ==========================================
// EPIC E16: BÁO CÁO & KIỂM TOÁN (M17)
// ==========================================

const DAYS_OF_WEEK = ['T2 (Thứ 2)', 'T3 (Thứ 3)', 'T4 (Thứ 4)', 'T5 (Thứ 5)', 'T6 (Thứ 6)', 'T7 (Thứ 7)', 'CN (Chủ Nhật)'];
const HOURS = Array.from({ length: 18 }, (_, i) => `${i + 6}:00`);

function generateOccupancyData() {
  const result = [];
  DAYS_OF_WEEK.forEach((day, dayIdx) => {
    HOURS.forEach((hourStr, hourIdx) => {
      const h = hourIdx + 6;
      let baseRate = 25;
      if (h >= 6 && h <= 8) baseRate = 55;
      if (h >= 11 && h <= 14) baseRate = 30;
      if (h >= 17 && h <= 21) baseRate = 92;
      if (h >= 22) baseRate = 45;
      if (dayIdx >= 5) {
        baseRate = Math.min(98, baseRate + 20);
      }
      const occupancyRate = Math.max(10, Math.min(100, Math.round(baseRate + (Math.sin(hourIdx * 2 + dayIdx) * 8))));
      result.push({
        day,
        dayIdx,
        hour: hourStr,
        occupancyRate,
        bookedCourts: Math.round((occupancyRate / 100) * 16),
        totalCourts: 16
      });
    });
  });
  return result;
}

const occupancyHeatmap = generateOccupancyData();

// ==========================================
// API ROUTES FOR E04 (VIETQR, RESCUE & REFUND)
// ==========================================

app.get('/api/e04/orders', (req, res) => {
  res.json(vietqrOrders);
});

app.post('/api/e04/create-payment', (req, res) => {
  const { customerName, customerPhone, courtName, timeSlot, amount } = req.body;
  const newOrderId = 'SPORT-BK-' + Math.floor(8930 + Math.random() * 100);
  const memo = newOrderId.replace(/-/g, ' ');

  const order = {
    orderId: newOrderId,
    customerName: customerName || 'Khách Đặt Tại Chỗ',
    customerPhone: customerPhone || '0988776655',
    courtName: courtName || 'Sân Pickleball VIP 1',
    timeSlot: timeSlot || '20:00 - 21:30 (Hôm nay)',
    amount: Number(amount) || 350000,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    accountNumber: '098812345688',
    bankBin: '970422',
    bankName: 'MB Bank',
    accountName: 'TO HOP THE THAO SAO VANG',
    memo: memo
  };

  vietqrOrders.unshift(order);
  logAudit(
    'Cổng Thanh Toán (T2)',
    'KHỞI TẠO VIETQR',
    'E04',
    'INFO',
    `Khởi tạo mã VietQR cho đơn ${newOrderId} số tiền ${order.amount.toLocaleString()} VND.`,
    { orderId: newOrderId, amount: order.amount }
  );

  res.json({ success: true, order });
});

app.get('/api/e04/status/:orderId', (req, res) => {
  const order = vietqrOrders.find(o => o.orderId === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ status: order.status, order });
});

app.post('/api/e04/simulate-webhook', (req, res) => {
  const { orderId, isFailure } = req.body;
  const order = vietqrOrders.find(o => o.orderId === orderId);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (isFailure) {
    order.status = 'EXPIRED';
    logAudit(
      'Hệ thống VietQR Webhook (T2)',
      'THANH TOÁN THẤT BẠI / QUÁ HẠN',
      'E04',
      'WARNING',
      `Đơn ${orderId} quá thời gian chờ thanh toán (15 phút). Giải phóng giữ chỗ sân.`,
      { orderId }
    );
    return res.json({ success: false, status: 'EXPIRED', message: 'Mô phỏng đơn quá hạn/thất bại' });
  }

  order.status = 'PAID';
  order.paidAt = new Date().toISOString();
  order.transactionRef = 'MBB-AUTO-' + Math.floor(10000000 + Math.random() * 90000000);

  currentShift.vietqrSales += order.amount;
  currentShift.totalSales += order.amount;

  logAudit(
    'Hệ thống VietQR Webhook (T2)',
    'THANH TOÁN THÀNH CÔNG',
    'E04',
    'SUCCESS',
    `Webhook ghi nhận tiền về: ${order.amount.toLocaleString()} VND cho đơn ${orderId} (${order.courtName}).`,
    { orderId, transactionRef: order.transactionRef, amount: order.amount }
  );

  res.json({ success: true, status: 'PAID', order });
});

app.get('/api/e04/unmatched-transactions', (req, res) => {
  res.json(unmatchedTransactions);
});

app.post('/api/e04/rescue-match', (req, res) => {
  const { bankTransId, bookingId, rescueReason } = req.body;
  const tx = unmatchedTransactions.find(t => t.bankTransId === bankTransId);
  if (!tx) return res.status(404).json({ error: 'Không tìm thấy giao dịch ngân hàng' });

  let booking = vietqrOrders.find(o => o.orderId === bookingId);
  if (!booking) {
    booking = {
      orderId: bookingId,
      customerName: tx.senderName,
      customerPhone: '09xxxxxx',
      courtName: 'Sân Thể Thao (Cứu đơn thủ công)',
      timeSlot: 'Đã kích hoạt',
      amount: tx.amount,
      status: 'PAID',
      createdAt: tx.transferTime,
      paidAt: new Date().toISOString(),
      transactionRef: tx.bankTransId
    };
    vietqrOrders.unshift(booking);
  } else {
    booking.status = 'PAID';
    booking.paidAt = new Date().toISOString();
    booking.transactionRef = tx.bankTransId;
  }

  tx.rescueStatus = 'MATCHED';
  tx.matchedWith = bookingId;

  logAudit(
    'Quản trị viên / Đối soát viên (T1/T2)',
    'CỨU ĐƠN THỦ CÔNG (RESCUE ORDER)',
    'E04',
    'WARNING',
    `Đã cứu đơn thành công: Giao dịch ${tx.bankTransId} (${tx.amount.toLocaleString()} VND) được gán vào đơn ${bookingId}. Lý do: ${rescueReason || 'Khách chuyển nhầm nội dung syntax'}.`,
    { bankTransId, bookingId, amount: tx.amount, rescueReason }
  );

  res.json({ success: true, message: 'Cứu đơn thành công & Sân đã kích hoạt!', booking, tx });
});

app.get('/api/e04/refunds', (req, res) => {
  res.json(refundRequests);
});

app.post('/api/e04/refunds/process', (req, res) => {
  const { refundId, action, method, approverNote } = req.body;
  const refund = refundRequests.find(r => r.refundId === refundId);
  if (!refund) return res.status(404).json({ error: 'Không tìm thấy yêu cầu hoàn tiền' });

  if (action === 'APPROVE') {
    refund.status = 'COMPLETED';
    refund.method = method || refund.method;
    refund.completedAt = new Date().toISOString();
    refund.approverNote = approverNote || 'Đã duyệt hoàn tiền hợp lệ theo quy chế huỷ sân';

    if (refund.method === 'CASH') {
      currentShift.cashPayouts += refund.refundAmount;
      currentShift.expectedCashInDrawer -= refund.refundAmount;
    }

    logAudit(
      `Thu ngân ca: ${currentShift.cashierName} (T5)`,
      'HOÀN TIỀN THÀNH CÔNG',
      'E04',
      'SUCCESS',
      `Đã hoàn tất hoàn tiền ${refund.refundAmount.toLocaleString()} VND cho đơn ${refund.bookingId} (${refund.customerName}) qua phương thức ${refund.method}.`,
      { refundId, bookingId: refund.bookingId, refundAmount: refund.refundAmount, method: refund.method }
    );

    return res.json({ success: true, refund });
  } else if (action === 'REJECT') {
    refund.status = 'REJECTED';
    refund.approverNote = approverNote || 'Từ chối: Vi phạm chính sách huỷ dưới 2 tiếng';

    logAudit(
      'Kế toán trưởng (T1)',
      'TỪ CHỐI HOÀN TIỀN',
      'E04',
      'WARNING',
      `Từ chối hoàn tiền cho đơn ${refund.bookingId}. Lý do: ${refund.approverNote}.`,
      { refundId, bookingId: refund.bookingId }
    );

    return res.json({ success: true, refund });
  }

  res.status(400).json({ error: 'Action không hợp lệ' });
});

// ==========================================
// API ROUTES FOR E06 (POS, KHO, CA THU NGÂN & CHỦ KIỂM TRA)
// ==========================================

app.get('/api/e06/products', (req, res) => {
  res.json(inventoryProducts);
});

app.post('/api/e06/checkout', (req, res) => {
  const { items, paymentMethod, discount, customerInfo } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Giỏ hàng trống' });
  }

  let subtotal = 0;
  for (const item of items) {
    const prd = inventoryProducts.find(p => p.id === item.id);
    if (prd) {
      if (prd.stock < item.qty) {
        return res.status(400).json({ error: `Sản phẩm "${prd.name}" chỉ còn ${prd.stock} trong kho!` });
      }
      prd.stock -= item.qty;
      subtotal += prd.price * item.qty;
    }
  }

  const discountAmount = Number(discount) || 0;
  const total = Math.max(0, subtotal - discountAmount);
  const newOrderId = 'POS-20261026-' + Math.floor(100 + Math.random() * 900);

  const order = {
    id: newOrderId,
    time: new Date().toISOString(),
    cashierName: `${currentShift.cashierName} (${currentShift.shiftName})`,
    items,
    subtotal,
    discount: discountAmount,
    total,
    paymentMethod: paymentMethod || 'CASH',
    status: 'PAID',
    customerInfo: customerInfo || 'Khách tại quầy'
  };

  posOrders.unshift(order);

  if (order.paymentMethod === 'CASH') {
    currentShift.cashSales += total;
    currentShift.expectedCashInDrawer += total;
  } else if (order.paymentMethod === 'VIETQR') {
    currentShift.vietqrSales += total;
  } else if (order.paymentMethod === 'CARD_POS') {
    currentShift.cardPosSales += total;
  }
  currentShift.totalSales += total;

  logAudit(
    `Thu ngân: ${currentShift.cashierName} (T5)`,
    'BÁN LẺ TẠI QUẦY POS',
    'E06',
    'INFO',
    `Thanh toán đơn hàng ${newOrderId} thành công (${total.toLocaleString()} VND) qua hình thức ${order.paymentMethod}. Đã trừ tồn kho tự động.`,
    { orderId: newOrderId, total, paymentMethod: order.paymentMethod, cashier: currentShift.cashierName }
  );

  res.json({ success: true, order, currentStock: inventoryProducts });
});

app.post('/api/e06/inventory/adjust', (req, res) => {
  const { productId, type, quantity, reason } = req.body;
  const prd = inventoryProducts.find(p => p.id === productId);
  if (!prd) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

  const oldStock = prd.stock;
  if (type === 'IMPORT') {
    prd.stock += Number(quantity);
  } else if (type === 'ADJUST_AUDIT') {
    prd.stock = Number(quantity);
  } else if (type === 'SCRAP') {
    prd.stock = Math.max(0, prd.stock - Number(quantity));
  }

  logAudit(
    'Thủ kho: Nguyễn Quốc Huy (T3)',
    type === 'IMPORT' ? 'NHẬP KHO BỔ SUNG' : (type === 'SCRAP' ? 'XUẤT HỦY HÀNG HỎNG' : 'KIỂM KÊ ĐIỀU CHỈNH KHO'),
    'E06',
    'WARNING',
    `Điều chỉnh kho SP ${prd.name}: Tồn cũ ${oldStock} -> Tồn mới ${prd.stock} (${prd.unit}). Lý do: ${reason || 'Kiểm kê định kỳ'}.`,
    { productId, oldStock, newStock: prd.stock, reason }
  );

  res.json({ success: true, product: prd, inventory: inventoryProducts });
});

// Shift management routes
app.get('/api/e06/shift/schedules', (req, res) => {
  res.json(SHIFT_SCHEDULES);
});

app.get('/api/e06/shift/current', (req, res) => {
  res.json({ currentShift, history: shiftHistory, schedules: SHIFT_SCHEDULES });
});

// Kết ca & Bàn giao ca (Cáp Nguyễn Thanh Huyền bàn giao ca cho ca tiếp theo)
app.post('/api/e06/shift/handover', (req, res) => {
  const { countedCash, cashBreakdown, handoverToStaff, handoverShiftCode, note } = req.body;
  const actualCash = Number(countedCash) || 0;
  const diff = actualCash - currentShift.expectedCashInDrawer;

  const nextStaffInfo = handoverToStaff || 'Đặng Minh Quân (Ca Tối 15:00 - 23:00)';

  const closedRecord = {
    shiftId: currentShift.shiftId,
    shiftCode: currentShift.shiftCode,
    shiftName: currentShift.shiftName,
    cashierName: currentShift.cashierName,
    cashierStaffId: currentShift.cashierStaffId,
    handoverTo: nextStaffInfo,
    openedAt: currentShift.openedAt,
    closedAt: new Date().toISOString(),
    initialCash: currentShift.initialCash,
    actualCashCounted: actualCash,
    expectedCash: currentShift.expectedCashInDrawer,
    difference: diff,
    status: diff === 0 ? 'BALANCED' : (diff > 0 ? 'SURPLUS' : 'DEFICIT'),
    vietqrTotal: currentShift.vietqrSales,
    cardPosTotal: currentShift.cardPosSales,
    cashBreakdown: cashBreakdown || {},
    note: note || 'Bàn giao ca bình thường',
    ownerAuditStatus: 'PENDING_OWNER_AUDIT', // Chờ chủ kiểm tra trên hệ thống!
    ownerAuditNotes: 'Đang đợi Chủ tổ hợp kiểm tra & xác nhận số dư két',
    ownerAuditedAt: null
  };

  shiftHistory.unshift(closedRecord);

  logAudit(
    `Thu ngân: ${currentShift.cashierName} (T5)`,
    'BÀN GIAO CA THU NGÂN (CHỜ CHỦ DUYỆT)',
    'E06',
    diff !== 0 ? 'WARNING' : 'SUCCESS',
    `Thu ngân ${currentShift.cashierName} kết ca ${currentShift.shiftName} và bàn giao cho ${nextStaffInfo}. Tiền lý thuyết: ${currentShift.expectedCashInDrawer.toLocaleString()} đ, Tiền thực đếm: ${actualCash.toLocaleString()} đ (Lệch: ${diff.toLocaleString()} đ). Đang chờ Chủ kiểm tra.`,
    { shiftId: currentShift.shiftId, cashier: currentShift.cashierName, handoverTo: nextStaffInfo, diff, actualCash }
  );

  // Chuyển sang ca tiếp theo
  let nextShiftConfig = SHIFT_SCHEDULES.find(s => s.id === handoverShiftCode) || SHIFT_SCHEDULES[1]; // Default Ca Tối

  currentShift = {
    shiftId: 'CA-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-02',
    shiftCode: nextShiftConfig.id,
    shiftName: `${nextShiftConfig.name} (${nextShiftConfig.timeRange})`,
    cashierName: nextShiftConfig.defaultCashier,
    cashierStaffId: nextShiftConfig.staffId,
    openedAt: new Date().toISOString(),
    initialCash: actualCash, // Nhận toàn bộ két thực tế từ ca trước
    status: 'ACTIVE',
    cashSales: 0,
    vietqrSales: 0,
    cardPosSales: 0,
    totalSales: 0,
    cashPayouts: 0,
    expectedCashInDrawer: actualCash,
    handoverTo: 'Chưa chỉ định',
    ownerAuditStatus: 'ACTIVE_SHIFT',
    ownerAuditNotes: '',
    ownerAuditedAt: null
  };

  res.json({ success: true, closedShift: closedRecord, newShift: currentShift });
});

// Chủ Tổ Hợp Kiểm Tra & Phê Duyệt / Bắt Lỗi Bàn Giao (Owner Audit Portal)
app.post('/api/e06/shift/owner-audit', (req, res) => {
  const { shiftId, action, ownerNotes } = req.body;
  const shiftRecord = shiftHistory.find(s => s.shiftId === shiftId);
  if (!shiftRecord) return res.status(404).json({ error: 'Không tìm thấy ca kiểm tra' });

  if (action === 'APPROVE') {
    shiftRecord.ownerAuditStatus = 'OWNER_APPROVED';
    shiftRecord.ownerAuditNotes = ownerNotes || 'Chủ tổ hợp Hoàng Đình Dũng: Đã kiểm tra số dư khớp, duyệt đóng ca thành công.';
    shiftRecord.ownerAuditedAt = new Date().toISOString();

    logAudit(
      'Chủ tổ hợp: Hoàng Đình Dũng (Owner)',
      'CHỦ PHÊ DUYỆT BÀN GIAO CA',
      'E06',
      'SUCCESS',
      `Chủ tổ hợp đã kiểm tra và PHÊ DUYỆT biên bản bàn giao ca ${shiftRecord.shiftName} (Thu ngân bàn giao: ${shiftRecord.cashierName} -> Người nhận: ${shiftRecord.handoverTo}). Tiền thực đếm: ${shiftRecord.actualCashCounted.toLocaleString()} đ. Ghi chú: ${shiftRecord.ownerAuditNotes}`,
      { shiftId, ownerAction: 'APPROVE', actualCash: shiftRecord.actualCashCounted }
    );

    return res.json({ success: true, shift: shiftRecord });
  } else if (action === 'FLAG') {
    shiftRecord.ownerAuditStatus = 'FLAGGED_DISCREPANCY';
    shiftRecord.ownerAuditNotes = ownerNotes || 'Chủ tổ hợp: Phát hiện nghi vấn chênh lệch két hoặc sai lệch chứng từ. Yêu cầu giải trình!';
    shiftRecord.ownerAuditedAt = new Date().toISOString();

    logAudit(
      'Chủ tổ hợp: Hoàng Đình Dũng (Owner)',
      'CHỦ CẢNH BÁO BẤT THƯỜNG BÀN GIAO CA',
      'E06',
      'CRITICAL',
      `Chủ tổ hợp PHÁT HIỆN BẤT THƯỜNG tại ca ${shiftRecord.shiftName} của thu ngân ${shiftRecord.cashierName}. Yêu cầu lập tức kiểm tra camera và giải trình: ${shiftRecord.ownerAuditNotes}`,
      { shiftId, ownerAction: 'FLAG', discrepancy: shiftRecord.difference }
    );

    return res.json({ success: true, shift: shiftRecord });
  }

  res.status(400).json({ error: 'Hành động không hợp lệ' });
});

// ==========================================
// EPIC E16: BÁO CÁO DOANH THU, LẤP ĐẦY & KIỂM TOÁN (M17)
// ==========================================

app.get('/api/e16/reports/dashboard', (req, res) => {
  const totalRevenueToday = 18450000;
  const totalBookingsToday = 42;
  const avgOccupancyRate = 78.4;
  const lowStockCount = inventoryProducts.filter(p => p.stock <= p.minThreshold).length;

  const channelBreakdown = [
    { channel: 'Thuê Sân Bóng Đá (7 người)', amount: 7800000, percentage: 42.3, color: '#4ade80' },
    { channel: 'Thuê Sân Pickleball Pro', amount: 4650000, percentage: 25.2, color: '#9cff93' },
    { channel: 'Thuê Sân Cầu Lông & Tennis', amount: 3200000, percentage: 17.3, color: '#38bdf8' },
    { channel: 'Quầy POS F&B & Dụng Cụ (E06)', amount: 2450000, percentage: 13.3, color: '#f59e0b' },
    { channel: 'Dịch Vụ & Khác (Gửi xe, Giặt đồ)', amount: 350000, percentage: 1.9, color: '#a855f7' }
  ];

  const paymentBreakdown = [
    { method: 'VietQR Động (E04)', amount: 11800000, percentage: 63.9, icon: 'qr' },
    { method: 'Tiền Mặt Tại Quầy POS (E06)', amount: 4250000, percentage: 23.0, icon: 'cash' },
    { method: 'Thẻ POS & Ví Hội Viên', amount: 2400000, percentage: 13.1, icon: 'card' }
  ];

  const sevenDayTrend = [
    { date: '20/10', revenue: 14200000, occupancy: 71 },
    { date: '21/10', revenue: 15600000, occupancy: 74 },
    { date: '22/10', revenue: 16100000, occupancy: 76 },
    { date: '23/10', revenue: 17800000, occupancy: 82 },
    { date: '24/10', revenue: 23500000, occupancy: 94 },
    { date: '25/10', revenue: 25200000, occupancy: 97 },
    { date: '26/10 (Hôm nay)', revenue: 18450000, occupancy: 78 }
  ];

  res.json({
    kpis: {
      totalRevenueToday,
      totalBookingsToday,
      avgOccupancyRate,
      lowStockCount,
      activeShift: currentShift.shiftId,
      currentCashier: currentShift.cashierName
    },
    channelBreakdown,
    paymentBreakdown,
    sevenDayTrend
  });
});

app.get('/api/e16/reports/occupancy', (req, res) => {
  res.json({
    days: DAYS_OF_WEEK,
    hours: HOURS,
    heatmap: occupancyHeatmap,
    peakHoursSummary: {
      peakSlot: '18:00 - 21:00 (Tỷ lệ lấp đầy đạt 95% - 98%)',
      offPeakSlot: '09:00 - 14:00 (Tỷ lệ lấp đầy 28% - 35%)',
      recommendation: 'Áp dụng Dynamic Pricing: Giảm 25% giờ thấp điểm để kích cầu, Tăng 10% giờ cao điểm Thứ 6 - CN.'
    }
  });
});

app.get('/api/e16/audit-logs', (req, res) => {
  const { epic, severity, search } = req.query;
  let filtered = [...auditLogs];

  if (epic && epic !== 'ALL') {
    filtered = filtered.filter(l => l.epic === epic);
  }
  if (severity && severity !== 'ALL') {
    filtered = filtered.filter(l => l.severity === severity);
  }
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(l => 
      l.action.toLowerCase().includes(s) || 
      l.detail.toLowerCase().includes(s) || 
      l.actor.toLowerCase().includes(s)
    );
  }

  res.json(filtered);
});

// Start server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🏆 HỆ THỐNG ĐẶT LỊCH TỔ HỢP THỂ THAO - PHÂN HỆ E04, E06, E16`);
  console.log(`⚡ Server running live at: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
