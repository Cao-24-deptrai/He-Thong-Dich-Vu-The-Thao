---
name: court-booking-engine
description: Triển khai và sửa công cụ đặt sân (giữ chỗ, sân ghép sân 5/7/11, phòng gaming riêng, hủy, đổi lịch, check-in, no-show) với cơ chế chống trùng 3 lớp Redis + idempotency + MongoDB unique index. Dùng khi làm module booking/M04/M05, slots, lịch trống, hủy hoàn tiền, đặt sân cố định.
---

# court-booking-engine

Đọc trước: spec mục **3.5** (sân ghép), **3.6** (3 lớp), **M04**, **M05**, **5.3–5.5** (`slots`, `bookings`, chỉ mục, transaction). Lấy bằng skill `spec-to-tasks`.

## Mô hình
- Mọi sân quy về **đơn vị cơ sở**. `resources.baseUnitIds` cho biết sân ghép gồm đơn vị nào (S11 = F1..F6; S7-A = F1,F2; S7-B = F3,F4; S7-C = F5,F6; F7, F8 độc lập).
- Mỗi **ô giờ** = (`unitId`, `date` giờ VN, `slotIndex` 0..47). Collection `slots` có **unique index `(unitId, date, slotIndex)`** — đây là bất biến số một.
- Khóa/đặt sân ghép = ghi ô cho **tất cả** đơn vị cơ sở của nó. Không bao giờ tự suy luận "trống" bằng tính toán phức tạp: chỉ cần kiểm tra các ô của đơn vị cơ sở.
- Phòng gaming riêng (`GAME_ROOM`) dùng chung engine này.

## Luồng đặt (xem `resources/hold-booking.example.ts`)
1. `toSlotRange` (resources/slot-math.example.ts): kiểm tra bội số 30 phút, tối thiểu 60 phút, không qua nửa đêm.
2. Lớp 2: interceptor `Idempotency-Key` (gửi lặp → trả kết quả cũ).
3. Lớp 1: `acquire-locks.lua` khóa tất cả ô, TTL = thời gian giữ chỗ. Thất bại → `SLOT_TAKEN`.
4. Báo giá từng ô theo khung cao/thấp điểm; **snapshot** giá và chính sách vào booking.
5. Lớp 3: trong transaction: xóa ô HELD đã hết hạn trong phạm vi → `insertMany` ô → tạo order + booking `PENDING_PAYMENT`. Lỗi `E11000` → `SLOT_TAKEN`.
6. Lỗi bất kỳ → nhả khóa Redis (`release-locks.lua`, kiểm tra token).
7. Thanh toán thành công → `confirmPaid` trong transaction (ô HELD→CONFIRMED, booking CONFIRMED, ghi outbox). Giữ chỗ đã mất → **hoàn vào ví**, không nuốt tiền.
8. Worker mỗi 30 giây: ô `HELD` hết hạn → xóa, booking `PENDING_PAYMENT` → `EXPIRED`, nhả khóa.

## Quy tắc nghiệp vụ cần nhớ
- Hạn giữ chỗ mặc định 10 phút; mỗi khách tối đa 2 lượt chờ thanh toán (A01, `settings`).
- **Hủy**: hoàn 100% nếu `now <= startAt − cutoff` (cutoff lấy từ **policySnapshot** của booking), ngược lại 0 (A02). Hoàn vào ví (A04). Voucher hoàn lại nếu còn hạn (A20).
- **Đổi lịch**: ≥ 2 giờ trước giờ bắt đầu, cùng loại sân, tối đa 2 lần (A03); trong **một transaction**: giữ ô mới → nhả ô cũ → bù/hoàn chênh lệch. Thất bại thì giữ nguyên lượt đặt cũ.
- **Check-in** từ T−30 phút đến T+15 phút; **no-show** sau 15 phút không hoàn tiền.
- Đóng sân/bảo trì (`closures`): ghi ô `BLOCKED`; **không tự hủy** lượt đặt trùng, liệt kê danh sách ảnh hưởng và yêu cầu xử lý từng lượt (đổi lịch miễn phí hoặc hoàn 100%).
- Đặt cố định (M05): kiểm tra xung đột **toàn bộ** các buổi trước khi tạo (tất cả hoặc báo danh sách trùng); mỗi buổi là một booking riêng gắn `recurringRuleId`.

## Máy trạng thái
`PENDING_PAYMENT → CONFIRMED | EXPIRED | CANCELLED`; `CONFIRMED → CHECKED_IN | CANCELLED | RESCHEDULED | NO_SHOW`; `CHECKED_IN → COMPLETED`. Chuyển trạng thái bằng cập nhật có điều kiện (`{_id, status: from}`), `matchedCount === 0` → xung đột trạng thái. Không cho phép chuyển ngoài sơ đồ.

## Cạm bẫy thường gặp
- Check-then-insert không có unique index → lỗi đặt trùng khi tải cao.
- Tin Redis là nguồn sự thật. Redis mất khóa vẫn phải đúng.
- Dùng `new Date()` + cộng giờ thay vì helper múi giờ VN → ô lệch ngày.
- Đọc lại giá/chính sách hiện tại khi hủy thay vì dùng snapshot.
- Quên nhả khóa Redis khi lỗi; nhả khóa không kiểm tra token.
- Cho `insertMany` chạy ngoài transaction → ô mồ côi khi lỗi giữa chừng.

## Kiểm thử bắt buộc
Xem `resources/scenarios.md` (T01–T03, T05, T08 và các kịch bản phụ) và skill `concurrency-test-kit`. Chạy `pnpm test:race` trước khi báo hoàn thành.
