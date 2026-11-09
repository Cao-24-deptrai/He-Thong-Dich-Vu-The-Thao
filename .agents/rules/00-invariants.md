---
trigger: always_on
description: Các bất biến nghiệp vụ về tiền, ví, đặt chỗ, thời gian, idempotency của hệ thống tổ hợp thể thao. Luôn áp dụng.
---

# Bất biến nghiệp vụ (không thương lượng)

Vi phạm bất kỳ mục nào dưới đây là lỗi nghiêm trọng, kể cả khi test vẫn xanh.

## Tiền
1. Tiền là **số nguyên VND** (`Number.isSafeInteger`). Không `float`, không `toFixed`, không `Decimal128`. Dùng helper `packages/shared/money`.
2. **Server tính mọi số tiền.** Client chỉ hiển thị. Không tin `amount` từ client.
3. **Chụp lại (snapshot)** giá và chính sách (mốc hủy, thuế) vào booking/đơn/phiên tại thời điểm giao dịch. Đổi giá sau đó không làm đổi giao dịch cũ.
4. Giảm giá, hoàn tiền, phí đều là dòng riêng, có lý do; không sửa đè số tiền gốc.

## Ví nội bộ
1. Số dư **không bao giờ âm**. Trừ ví luôn là cập nhật có điều kiện `balance >= amount` trong **cùng transaction** với dòng sổ cái.
2. `wallet_ledger` **chỉ ghi thêm**. Không update/delete. Sai sót sửa bằng bút toán điều chỉnh mới (có lý do + audit).
3. Ví chỉ trả cho danh mục: `COURT`, `GAME_TIME`, `GAME_ROOM`, `CANTEEN`, `RENTAL`. **Không** trả cho `GYM_MEMBERSHIP`, `RETAIL`, `CLASS`, `PT`, `PACKAGE`, `TOURNAMENT_FEE`. Danh sách lấy từ `settings` (`wallet.allowedCategories`), không viết cứng ở nhiều nơi.
4. Mọi thao tác ví nhận `idempotencyKey` duy nhất.

## Đặt chỗ
1. Mọi sân quy về **đơn vị cơ sở**. Sân ghép (sân 7, sân 11) khóa đồng thời các đơn vị cơ sở của nó.
2. Chống trùng **3 lớp**: Redis lock (nhanh) → idempotency key (gửi lặp) → **unique index MongoDB** `(unitId, date, slotIndex)` trong transaction (chốt chặn cuối). Không bao giờ kiểu "kiểm tra rồi mới ghi" mà thiếu ràng buộc duy nhất.
3. Redis có thể mất khóa bất kỳ lúc nào; tính đúng đắn do MongoDB bảo đảm.
4. Booking không vượt qua nửa đêm (giờ VN). Cần đổi quy tắc này thì hỏi và viết ADR.

## Thanh toán
1. Webhook: xác minh chữ ký **trước khi** parse; lưu bản gốc vào `payment_events`; khử trùng bằng unique `(provider, providerTxnId)`.
2. Số tiền nhận phải **khớp chính xác** số tiền cần trả. Lệch → `MISMATCH`, không tự xác nhận.
3. Thanh toán đến sau khi giữ chỗ hết hạn: ô còn trống thì xác nhận; đã mất thì **hoàn vào ví** và báo khách. Không bao giờ nuốt tiền.

## Thời gian
- Lưu UTC. "Ngày nghiệp vụ" (`date` của slot, báo cáo theo ngày) tính theo `Asia/Ho_Chi_Minh`. Dùng helper trong `packages/shared/time`, không tự `new Date()` + cộng giờ.
- Máy chủ là nguồn thời gian duy nhất. Gaming client không tin đồng hồ máy.

## Khác
- **Capacity gym 100** và **số dư gaming** là ràng buộc cứng: Redis Lua nguyên tử cho bộ đếm; tạm giữ tiền theo đợt cho phiên chơi.
- Không hardcode giá, mốc hủy, sức chứa, hạn giữ chỗ: lấy từ `settings` / `price_rules` (có lịch sử thay đổi).
- Thao tác nhạy cảm (đổi giá/cấu hình, hủy đơn, hoàn tiền, điều chỉnh ví, sửa hạn thẻ, mở/khóa máy từ xa, đổi vai trò) **luôn ghi `audit_logs`**.
