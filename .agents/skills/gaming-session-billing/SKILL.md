---
name: gaming-session-billing
description: Triển khai khu gaming — vòng đời phiên chơi, tính tiền theo phút qua nhiều khung giá, tạm giữ tiền ví theo đợt, heartbeat, đồng bộ offline, một tài khoản một phiên, phòng riêng, điều khiển máy từ xa, Gaming client .NET. Dùng khi làm module gaming/M14, Gaming client, sơ đồ máy, quyết toán phiên chơi.
---

# gaming-session-billing

Đọc trước: spec **M14**, **3.7** (offline), **5.3** (`gaming_sessions`, `gaming_events`), rule `dotnet-clients`, skill `wallet-ledger`.

## Vòng đời phiên
`STARTING → ACTIVE ⇄ (OFFLINE_GRACE) → LOCKED → ENDING → SETTLED` (hoặc `REJECTED`). Chuyển trạng thái có điều kiện, không nhảy cóc. Máy: `OFFLINE|IDLE|IN_USE|LOCKED|MAINTENANCE`.

## Tiền: tạm giữ theo đợt (không bao giờ vượt số dư)
1. Mở phiên: kiểm tra số dư ≥ phí tối thiểu, **tạm giữ đợt đầu** (mặc định 15 phút) bằng `wallet.hold` (balance → held). Số tiền tạm giữ dùng **mức giá cao nhất trong đợt** (`holdAmount`).
2. Trước khi hết đợt: tạm giữ đợt kế (`HOLD_REQUEST`). Không đủ tiền → cảnh báo còn 10/5/1 phút → hết thì khóa sau ân hạn 60 giây (`gaming.lockGraceSeconds`).
3. Kết thúc: `settleHold` trừ phần dùng thật từ `held`, trả phần dư về `balance`. Tất cả trong **một transaction** với cập nhật phiên và order line.
4. Nhờ tạm giữ, khách mua canteen đồng thời cũng không làm số dư âm.

## Tính tiền (xem `resources/billing.example.ts`)
- `phút = ceil(giây dùng / 60)`; **mỗi phút tính theo mức giá của chính phút đó** (đi qua mốc cao/thấp điểm vẫn đúng); cộng đồng/giờ của từng phút rồi chia 60 làm tròn lên **một lần** → số nguyên.
- Giá theo (nhóm máy × khung giờ) lấy từ `gaming_rates`/`price_rules`, **snapshot** vào `gaming_sessions.rateSnapshot` lúc mở phiên.
- Làm tròn bậc tiền (100/500 đ) hay phí tối thiểu: đang để mặc định 1 đ/0 đ trong `settings` — **hỏi người dùng** nếu muốn khác, rồi ghi ADR.
- Hóa đơn điện tử: một hóa đơn khi phiên kết thúc (skill `einvoice-adapter`).

## Heartbeat, offline, đồng bộ
- Heartbeat mỗi 10 giây; quá 3 phút không có → kết thúc phiên tại **mốc heartbeat cuối**.
- Offline/đồng bộ, khử trùng `eventId`, kẹp thời gian offline: xem `resources/sync-protocol.md`.
- **Một tài khoản một phiên `ACTIVE`**: unique index một phần. Đăng nhập máy thứ hai → `SESSION_ALREADY_ACTIVE` (hoặc theo cấu hình, kết thúc phiên cũ).

## Phòng riêng (10 phòng)
- Đặt theo ô giờ bằng engine đặt sân (`GAME_ROOM`, skill `court-booking-engine`), check-in QR, mở khóa các máy của phòng trong khung giờ đã đặt; tiền tính theo giá phòng (không tính theo phút từng máy); chơi lố giờ thu thêm theo giá phòng. Số máy mỗi phòng là cấu hình (A07).

## Điều khiển từ xa
Khóa/mở/nhắn tin/khởi động lại/tắt/kết thúc phiên/chuyển máy (giữ nguyên phiên) qua WebSocket tới client; thao tác nhạy cảm ghi `audit_logs`; mục tiêu < 3 giây cho 10 máy. Quyền: thu ngân và quản lý.

## Gaming client (.NET) — nhắc nhanh
Kiosk toàn màn hình, chặn thoát + watchdog, mã ký số, token riêng từng máy, đồng hồ đơn điện (`Stopwatch`), hàng đợi SQLite mã hóa DPAPI, tự cập nhật theo đợt có quay lui. Chi tiết trong rule `dotnet-clients`.

## Cạm bẫy
- Tin đồng hồ máy khách hoặc để client quyết định số tiền.
- Trừ ví từng phút một (nhiều ghi nhỏ) thay vì tạm giữ theo đợt.
- Quên quyết toán khi máy mất điện; tính thừa sau lần heartbeat cuối.
- Dùng số thực để tính tiền theo phút (sai số).

## Kiểm thử bắt buộc
**T11** (ngắt mạng 10 phút, số tiền khớp từng phút, không âm), **T12** (rút điện đột ngột → kết thúc theo heartbeat cuối), **T13** (một tài khoản hai máy → máy thứ hai bị từ chối) + qua mốc đổi khung giá, hold/settle bảo toàn tiền, đồng bộ lặp cùng `eventId`. Thử thật trên 20 máy chạy 3 ngày trước go-live.
