# Giao thức đồng bộ phiên gaming (client ↔ server)

## Sự kiện từ client (mỗi sự kiện có `eventId` GUID duy nhất, `seq` tăng dần trong phiên, `monoMs` từ Stopwatch)
| type | Khi nào | Nội dung chính |
|---|---|---|
| `START` | Khách đăng nhập tại máy | machineId, tài khoản |
| `HEARTBEAT` | Mỗi 10 giây khi online | monoMs, số dư hiển thị |
| `HOLD_REQUEST` | Sắp hết đợt tạm giữ hiện tại | đợt tiếp theo (số phút) |
| `OFFLINE_ENTER` | Mất mạng | monoMs |
| `OFFLINE_SYNC` | Có mạng lại | danh sách sự kiện đã xếp hàng |
| `END` | Đăng xuất / hết tiền / nhân viên kết thúc | monoMs, lý do |

## Server
1. Khử trùng theo `eventId` (unique index `gaming_events.eventId`); xử lý theo `seq`.
2. **Phiên đang chạy**: thời gian dùng = `serverNow − startedAt` (đồng hồ máy chủ là chuẩn).
3. **Khoảng offline**: thời gian dùng của khoảng đó = `monoMs` do client báo, **kẹp trong** `[0, khoảng thời gian thực giữa heartbeat cuối và heartbeat đầu tiên sau khi có mạng + 60 giây]`. Lệch bất thường (client báo < 50% khoảng thời gian thực) → gắn cờ `ANOMALY` cho quản lý xem.
4. **Mất heartbeat > 3 phút** (máy tắt/mất điện): phiên kết thúc tại **mốc heartbeat cuối** (khách không bị tính thừa).
5. Quyết toán trong transaction: `wallet.settleHold` (trừ phần dùng từ `held`, trả phần dư về `balance`) + cập nhật phiên + order line `GAME_TIME`.
6. Một tài khoản một phiên `ACTIVE`: unique index một phần `(userId)` với `status: 'ACTIVE'`.

## Hành vi client khi offline
- Tiếp tục đếm bằng `Stopwatch`; ghi sự kiện vào SQLite mã hóa **trước khi** thực hiện.
- Dùng hết phần tạm giữ đã có → cảnh báo, rồi khóa máy (không cho "nợ").
- Có mạng lại: gửi `OFFLINE_SYNC`, nhận số dư/ trạng thái mới, mở lại nếu còn tiền.
