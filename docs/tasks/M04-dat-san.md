# Kế hoạch triển khai: M04 Đặt sân & Lịch thi đấu (Court Booking Engine)

Người phụ trách: T1 (Backend lõi, Epic E03) · F04.6 đặt định kỳ (M05 kế hoạch) và F04.7 cáp kèo: T3 hỗ trợ (E03/E15) · Giai đoạn: GĐ2 · Ngày công ước lượng (kế hoạch 8.2): 90 ngày công

## 1. Phạm vi
- **Làm:**
  - `F04.1`: Kiểm tra tình trạng trống (Availability Calendar) của từng sân theo ngày (`YYYY-MM-DD`). Hiển thị chi tiết 48 slot (30 phút/slot), đánh dấu slot nào TRỐNG, ĐANG GIỮ (HELD), ĐÃ ĐẶT (CONFIRMED), ĐANG SỬ DỤNG (CHECKED_IN), hoặc ĐÓNG/BẢO TRÌ (CLOSURE).
  - `F04.2`: Giữ chỗ tạm thời (Hold Booking) với kiến trúc 3 lớp chống Double Booking:
    - Lớp 1: Khóa phân tán Redis nguyên tử `lock:slot:${unitId}:${date}:${slotIndex}`.
    - Lớp 2: Giao dịch MongoDB (Session Transaction).
    - Lớp 3: Bảng `booking_slots` có Unique Compound Index `{ unitId: 1, date: 1, slotIndex: 1 }`.
    - Thời gian giữ chỗ mặc định 10 phút (`booking.holdMinutes` từ M03 Settings).
  - `F04.3`: Xác nhận đặt sân (Confirm Booking): Chuyển trạng thái sang `CONFIRMED` khi thanh toán cọc/toàn bộ thành công, xác nhận các slots thành công.
  - `F04.4`: Hủy đặt sân (Cancel Booking): Tính toán hoàn cọc dựa theo `policySnapshot` (mốc hủy 24h); nếu đủ điều kiện thì hoàn tiền về ví (hoặc ghi outbox event).
  - `F04.5`: Check-in nhận sân (Check-in Booking) & Hoàn thành (Complete Booking): Quét mã QR booking hoặc tra cứu SĐT tại quầy.
  - `F04.6`: Đặt định kỳ (Recurring Booking): Tạo chuỗi đặt sân cố định theo tuần, kiểm tra xung đột toàn chuỗi.
  - `F04.7`: Ghép trận / Tìm đối thủ (Matchmaking): Đăng tin tìm đối thủ khi đặt sân, xem danh sách tìm đối thủ công khai.
- **Hoãn / phụ thuộc module sau:**
  - Cổng thanh toán trực tuyến VietQR/MoMo/VNPay (thuộc M07). Ở M04 cung cấp endpoint mock/thanh toán nội bộ để chuyển trạng thái `CONFIRMED`.

## 2. Bất biến liên quan (từ rule 00-invariants)
1. **Chống trùng lịch tuyệt đối (Double Booking Prevention)**: Không bao giờ xảy ra 2 lượt đặt cùng chiếm 1 đơn vị cơ sở vào cùng 1 thời điểm. Chốt chặn cuối cùng là Unique Index `{ unitId: 1, date: 1, slotIndex: 1 }`.
2. **Bảo tồn tiền tệ**: Tiền là số nguyên VND an toàn (`Number.isSafeInteger`). Lưu snapshot giá và chính sách tại thời điểm đặt (`priceSnapshot`, `policySnapshot`).
3. **Múi giờ nhất quán**: Ngày nghiệp vụ `YYYY-MM-DD` và slot 30 phút theo `Asia/Ho_Chi_Minh`. Lưu UTC trong CSDL.
4. **Idempotency & Concurrency**: Các thao tác Hold, Confirm, Cancel đều hỗ trợ Idempotency-Key và xử lý race conditions an toàn.

## 3. Hợp đồng API (packages/contracts)
| Method | Path | Request | Response | Lỗi (`code`) |
|---|---|---|---|---|
| GET | `/api/v1/bookings/availability` | `{ resourceCode, date }` | `AvailabilityResponse` | `RESOURCE_NOT_FOUND` |
| POST | `/api/v1/bookings/hold` | `HoldBookingRequest` | `BookingDetail` | `SLOT_TAKEN`, `FACILITY_CLOSED` |
| POST | `/api/v1/bookings/:id/confirm` | `ConfirmBookingRequest` | `BookingDetail` | `BOOKING_EXPIRED`, `INVALID_STATUS` |
| POST | `/api/v1/bookings/:id/cancel` | `CancelBookingRequest` | `BookingDetail` | `CANNOT_CANCEL` |
| POST | `/api/v1/bookings/:id/check-in` | None (Staff/Admin) | `BookingDetail` | `INVALID_STATUS` |
| POST | `/api/v1/bookings/:id/complete` | None (Staff/Admin) | `BookingDetail` | `INVALID_STATUS` |
| GET | `/api/v1/bookings/my` | `{ status, page, limit }` | `BookingList` | None |
| GET | `/api/v1/bookings/:id` | None | `BookingDetail` | `BOOKING_NOT_FOUND` |
| POST | `/api/v1/bookings/recurring` | `RecurringBookingRequest` | `RecurringBookingResponse` | `SLOT_TAKEN` |
| GET | `/api/v1/bookings/matchmaking` | `{ sport, date }` | `MatchmakingList` | None |

## 4. Cấu trúc CSDL
- **Collection `bookings`:**
  - `_id`: ObjectId
  - `bookingCode`: string (UK, e.g. `BK-20260315-XXXX`)
  - `userId`: ObjectId
  - `resourceCode`: string (e.g. `S11`, `F1`, `T1`)
  - `sport`: SportType
  - `date`: string (YYYY-MM-DD)
  - `slotIndices`: number[]
  - `baseUnitIds`: string[] (e.g. `['F1', 'F2']`)
  - `status`: BookingStatus (`HOLD`, `CONFIRMED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`, `NO_SHOW`)
  - `totalPrice`: number (Integer VND)
  - `depositAmount`: number (Integer VND)
  - `paidAmount`: number (Integer VND)
  - `holdExpiresAt`: Date (cho trạng thái HOLD)
  - `priceSnapshot`: Record<string, unknown>
  - `policySnapshot`: { cancelRefundCutoffHours: number; depositPercent: number }
  - `matchmaking`: { isLookingForOpponent: boolean; notes?: string; level?: string }
  - `checkInAt`?: Date
  - `checkOutAt`?: Date
  - `cancelledAt`?: Date
  - `cancelReason`?: string
  - `refundAmount`?: number
  - `version`: number
- **Collection `booking_slots`:**
  - `_id`: ObjectId
  - `unitId`: string (Đơn vị cơ sở, e.g. `F1`)
  - `date`: string (YYYY-MM-DD)
  - `slotIndex`: number (0..47)
  - `bookingId`: ObjectId
  - `status`: string (`HELD`, `CONFIRMED`, `MAINTENANCE`)
  - `holdExpiresAt`?: Date (cho TTL/cleanup)
  - **Index Unique**: `{ unitId: 1, date: 1, slotIndex: 1 }` (Chốt chặn bất biến chống trùng lịch)

## 5. Kế hoạch thực hiện (thứ tự từng bước)
- [x] 1. Thêm Zod schemas & hợp đồng API cho Booking trong `packages/contracts/src/booking.ts`.
- [x] 2. Tạo Mongoose schemas và Unique indexes: `BookingSchema`, `BookingSlotSchema`.
- [x] 3. Xây dựng Redis Locking Helper (Atomic multi-key lock với Token).
- [x] 4. Xây dựng `AvailabilityService`: truy vấn trạng thái 48 slot của sân, kết hợp lịch đóng sân (M03) và các slot đã đặt/giữ.
- [x] 5. Xây dựng `BookingEngineService`:
  - `hold(...)`: Giữ chỗ 3 lớp phòng thủ, sinh mã đặt sân.
  - `confirm(...)`: Chuyển trạng thái khi cọc thành công, cập nhật slots.
  - `cancel(...)`: Xử lý hủy và tính tiền hoàn theo policySnapshot.
  - `checkIn(...)` & `complete(...)`: Quản lý nhận sân và trả sân tại quầy.
  - `createRecurring(...)`: Đặt lịch định kỳ theo tuần.
- [x] 6. Xây dựng Background Cleanup Job (Dọn các ô HOLD hết hạn).
- [x] 7. Xây dựng Controllers: `BookingsController`, `AdminBookingsController`.
- [x] 8. Viết Unit & Concurrency Tests:
  - Test kiểm tra tình trạng trống (Availability).
  - Test Hold booking thành công.
  - Test Race condition: 2 khách cùng hold 1 slot tại cùng 1 microsecond -> đúng 1 người thành công, 1 người nhận `SLOT_TAKEN` (HTTP 409).
  - Test sân ghép: Hold S7-A thì F1, F2 và S11 đều không thể đặt trong khung giờ đó.
  - Test Hủy trước 24h hoàn tiền, hủy sau 24h không hoàn tiền.
- [x] 9. Chạy kiểm thử toàn bộ monorepo (`typecheck`, `test`, `build`).
