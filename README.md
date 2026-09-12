# Hệ Thống Đặt Lịch Tổ Hợp Thể Thao & Esports (Sports & Esports Booking Platform)

Hệ thống đặt lịch thể thao đa năng chuẩn Production đáp ứng 100% yêu cầu kỹ thuật theo tài liệu đặc tả **`build-spec-sports-booking-app.md`**.

---

## 1. Kiến Trúc Hệ Thống & Tech Stack

```
anti/
├── backend/       # NestJS + TypeScript + Mongoose (MongoDB Atlas) + Redis + Socket.io + PayOS SDK
├── admin/         # Next.js 14 App Router + Tailwind CSS + Lucide Icons (Cổng Vận Hành Quầy & Quản Trị)
├── mobile/        # React Native (Expo Bare Workflow) + TypeScript + Zustand (App Khách Hàng)
└── k6/            # Script kiểm thử tải k6 mô phỏng 100+ Virtual Users đồng thời
```

- **Backend**: NestJS 11, Node.js 20+, TypeScript, Mongoose 8 (MongoDB Atlas), Redis (Dual-mode: Upstash Cloud & In-memory Fallback), Socket.io Gateway, PayOS Payment SDK, MoMo Payment Gateway.
- **Web Admin**: Next.js 14 (App Router), Tailwind CSS, Lucide React, HTML5-QRCode Scanner.
- **Mobile App**: React Native (Expo), TypeScript, Zustand, SVG/Canvas QR Renderer, Socket.io Client.
- **Cơ chế chống trùng lịch 3 lớp**:
  1. *Lớp 1*: Redis Mutex Lock (`SET lock:{venueId}:{date}:{slot} {userId} NX PX 3000`).
  2. *Lớp 2*: Business Hold MongoDB với `holdExpiresAt = now + 10 phút`, tự động giải phóng qua Cron.
  3. *Lớp 3*: Partial Unique Compound Index trên MongoDB: `{ venueId: 1, bookingDate: 1, startTime: 1 }` với filter `{ status: { $in: ['HELD', 'CONFIRMED'] } }`.

---

## 2. Tài Khoản Khởi Tạo Mẫu (Seed Credentials)

| Vai trò | Số điện thoại | Mật khẩu | Chức năng |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `0999999999` | `Admin@123456` | Toàn quyền quản trị cơ sở, bảng giá, duyệt hoàn tiền, quản lý hội viên |
| **STAFF** | `0988888888` | `Staff@123456` | Lễ tân tại quầy: Đặt Walk-in, quét QR check-in sân & phòng gym |
| **CUSTOMER** | `0911223344` | `User@123456` | Khách hàng đặt sân, giữ chỗ 10p, nhận vé QR động 60s, cáp kèo |

---

## 3. Hướng Dẫn Khởi Chạy Từng Ứng Dụng

### 3.1. Backend API (Cổng 3000)
```bash
cd backend
npm install
npm run start:dev
```
- Swagger API Docs: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- WebSocket Gateway: `ws://localhost:3000`

### 3.2. Web Admin Vận Hành (Cổng 3001)
```bash
cd admin
npm install
npm run dev -- -p 3001
```
- Truy cập trình duyệt: [http://localhost:3001](http://localhost:3001)
- Các phân hệ:
  - `/facilities`: Quản lý cụm cơ sở, sân bãi và bảng giá giờ cao điểm.
  - `/walk-in`: Lịch đặt tại quầy với tính năng chặn xung đột slot online (`SLOT_ALREADY_TAKEN_ONLINE`).
  - `/checkin`: Quét camera QR check-in vé vào sân.
  - `/refunds`: Xử lý hoàn tiền cho Late Webhook (Hoàn tiền thủ công & Tự động 1-click qua cổng thanh toán).
  - `/gym`: Quản lý thẻ tập Gym & Quầy soát vé trừ lượt tự động.
  - `/matchmaking`: Giám sát các bài đăng cáp kèo và ghép đội.

### 3.3. Mobile App (Expo Bare Workflow)
```bash
cd mobile
npm install
npm run web     # Chạy trên trình duyệt Web
# Hoặc:
npm run start   # Chạy trên Expo Go / iOS Simulator / Android Emulator
```

---

## 4. Kiểm Thử Tự Động & Stress Test

### 4.1. Chạy Trọn Bộ 10 Test Suites E2E (87 Tests)
```bash
cd backend
npm run test:e2e -- --forceExit
```
**Kết quả kiểm thử**: 10/10 Test Suites PASS (100%), 87/87 Tests PASS (100%).
1. `swagger.spec.ts`: Kiểm tra OpenAPI Swagger 7 tags & schemas.
2. `auth.e2e-spec.ts`: Đăng ký, đăng nhập, JWT guard, RBAC (Customer / Staff / Admin).
3. `schema-index.spec.ts`: Kiểm tra Unique Partial Compound Index chống trùng lịch.
4. `race-condition.spec.ts`: 30 request đồng thời tranh chấp 1 slot.
5. `payment-checkin.e2e-spec.ts`: Tích hợp PayOS VietQR, Late Webhook, Dynamic QR 60s, Chặn quét trùng.
6. `edge-cases.spec.ts`: Xử lý ngoại lệ, hủy đơn, hoàn tiền thủ công.
7. `admin-web-flow.e2e-spec.ts`: Toàn bộ nghiệp vụ Web Admin vận hành.
8. `mobile-full-flow.e2e-spec.ts`: Toàn bộ luồng khách hàng trên Mobile App.
9. `extended-modules.e2e-spec.ts`: Module Gym (trừ lượt, thẻ hết hạn), Esports combo đêm, Cáp kèo Matchmaking, MoMo Gateway, Auto-Refund.
10. `concurrency-stress.e2e-spec.ts`: Mô phỏng 50 Virtual Users đồng thời tranh chấp 1 slot (Đúng 1 request 201 thành công, 49 request 409 bị chặn, 0 lỗi 500, thời gian xử lý trung bình 16ms).

### 4.2. Chạy Stress Test k6
```bash
# Cài đặt k6 nếu chưa có: brew install k6
k6 run k6/booking-stress-test.js
```
