# Kế hoạch triển khai: M14 Khu máy Gaming / Phòng Game (Gaming Server)

Người phụ trách: T6 (Backend Gaming Server) · Giai đoạn: GĐ4 · Ngày công ước lượng (spec 8.2): 55 ngày công (phần Server)
Trạng thái: **ĐÃ HOÀN THÀNH (100%)**

## 1. Phạm vi
- **Làm:**
  - `F14.1`: Quản lý danh mục máy: Mã máy (`machineCode`), khu vực/nhóm (`STANDARD`, `VIP`, `STREAMING`), vị trí tọa độ sơ đồ (`x`, `y`, `floor`, `roomName`), cấu hình phần cứng, trạng thái máy (`OFFLINE`, `IDLE`, `IN_USE`, `LOCKED`, `MAINTENANCE`), đăng ký thiết bị bằng mã dùng 1 lần (One-Time Registration Code).
  - `F14.2`: Bảng giá máy theo nhóm × khung giờ: Đơn giá/giờ, tính theo phút làm tròn lên, số phút tính tối thiểu ban đầu (ví dụ 15 phút), phụ thu theo giờ cao điểm/thấp điểm (`PriceBand.PEAK` / `OFFPEAK`).
  - `F14.3`: Quản lý phiên chơi (`GamingSession`):
    - Đăng nhập mở phiên bằng SĐT + mật khẩu hoặc quét mã QR.
    - Chống chơi đồng thời: 1 tài khoản chỉ có duy nhất 1 phiên chơi tại một thời điểm trên toàn hệ thống.
    - Tính tiền thời gian thực theo phút. Khi phiên đi qua mốc đổi khung giá (ví dụ 17:00 từ off-peak sang peak), mỗi phút tính đúng theo giá của khung giờ đó.
  - `F14.4`: Cơ chế tạm giữ tiền theo đợt (Block-based Wallet Hold):
    - Tạm giữ trước mỗi đợt 15 phút từ Ví nội bộ (`WalletCategory.GAMING`).
    - Cảnh báo sắp hết tiền trước 10, 5, 1 phút.
    - Tự động tạm giữ đợt tiếp theo nếu ví còn đủ tiền.
    - Khi hết tiền: chuyển trạng thái `LOCKED` có thời gian ân hạn 60 giây (`gracePeriodSeconds`).
    - Quyết toán khi kết thúc phiên: tính tổng tiền thực tế, hoàn trả 100% số tiền tạm giữ dư thừa vào ví của khách.
  - `F14.5`: Sơ đồ phòng máy thời gian thực (Floor Map): Trả về danh sách máy, trạng thái, người đang chơi, số phút đã dùng, chi phí tạm tính.
  - `F14.6`: Điều khiển từ xa (Remote Control Commands): Lệnh khóa, mở, gửi tin nhắn thông báo, tắt máy, khởi động lại, kết thúc phiên, chuyển máy (chuyển sang máy mới giữ nguyên phiên và số tiền tích lũy).
  - `F14.7`: Mở phiên tại quầy & nạp tiền nhanh: Thu ngân mở phiên hộ tại quầy cho khách vãng lai hoặc nạp tiền ví ngay trên màn hình quản lý.
  - `F14.8`: Tích hợp phòng riêng Game Room (10 phòng):
    - Đặt theo khung giờ qua M04 Booking Engine.
    - Quét QR check-in mở khóa toàn bộ máy trong phòng cho khung giờ đã đặt.
    - Tiền tính trọn gói theo phòng, không tính theo phút từng máy.
  - `F14.9`: Đồng bộ offline & Heartbeat:
    - Client gửi heartbeat mỗi 30s.
    - Mất tín hiệu 3 phút: tự động chốt phiên theo mốc heartbeat cuối cùng.
    - Đồng bộ sự kiện offline khử trùng lặp qua `idempotencyKey`.
  - `F14.10`: Báo cáo gaming: Tổng giờ chơi, doanh thu theo nhóm máy, tỷ lệ lấp đầy.

## 2. Bất biến liên quan (từ rule 00-invariants & SPEC 3.6/M14)
1. **Chống chơi đồng thời (SPEC Rule 1)**:
   Mỗi tài khoản khách chỉ được có duy nhất **1 phiên chơi đang hoạt động** (`STARTING`, `ACTIVE`, `OFFLINE_GRACE`, `LOCKED`). Đăng nhập máy khác bị từ chối với lỗi `ACCOUNT_ALREADY_IN_SESSION`.
2. **Không tiêu quá số dư ví (SPEC Rule 3 - Block Hold Invariant)**:
   Ví nội bộ bị tạm giữ trước theo từng đợt (15 phút). Tiền tạm giữ bị khóa khỏi ví để khách không thể vừa chơi game vừa mua canteen làm âm số dư. Khi quyết toán, hoàn trả chính xác phần dư thừa `refundHoldAmount = totalHoldAmount - actualUsageAmount`.
3. **Tính tiền theo phút làm tròn lên & tách khung giá (SPEC Rule 2)**:
   Tiền tính theo từng phút thực tế. Khi đi qua mốc đổi khung giờ, mỗi phút thuộc khung giờ nào sẽ nhân đơn giá của khung giờ đó.
4. **Đồng hồ máy chủ là chuẩn tối thượng (SPEC Rule 5)**:
   Thời gian tính tiền hoàn toàn căn cứ theo mốc thời gian máy chủ hoặc chuỗi monotonic clock đã được máy chủ xác thực.
5. **Tiền nguyên VND an toàn**: Toàn bộ đơn giá, số tiền tạm giữ, tiền hoàn trả và doanh thu phải là số nguyên VND (`Number.isSafeInteger`).

## 3. Hợp đồng API (packages/contracts)
| Method | Path | Request | Response | Lỗi (`code`) |
|---|---|---|---|---|
| GET | `/api/v1/gaming/machines` | `{ zone, status, roomName }` | `GamingMachineListResponse` | None |
| GET | `/api/v1/gaming/machines/:id` | None | `GamingMachineDetail` | `MACHINE_NOT_FOUND` |
| POST | `/api/v1/gaming/machines/register` | `RegisterMachineDto` | `RegisterMachineResponse` | `INVALID_REGISTRATION_CODE` |
| POST | `/api/v1/gaming/sessions/start` | `StartGamingSessionDto` | `GamingSessionDetail` | `ACCOUNT_ALREADY_IN_SESSION`, `MACHINE_NOT_AVAILABLE`, `INSUFFICIENT_BALANCE` |
| POST | `/api/v1/gaming/sessions/heartbeat` | `GamingHeartbeatDto` | `GamingHeartbeatResponse` | `SESSION_EXPIRED`, `SESSION_LOCKED` |
| POST | `/api/v1/gaming/sessions/end` | `EndGamingSessionDto` | `GamingSessionDetail` | `SESSION_NOT_FOUND`, `SESSION_ALREADY_ENDED` |
| POST | `/api/v1/gaming/sessions/switch-machine` | `SwitchMachineDto` | `GamingSessionDetail` | `TARGET_MACHINE_BUSY` |
| GET | `/api/v1/gaming/map` | `{ floor }` | `GamingFloorMapResponse` | None |
| POST | `/api/v1/admin/gaming/remote-control` | `RemoteControlDto` | `RemoteControlResponse` | `MACHINE_NOT_FOUND` |
| POST | `/api/v1/admin/gaming/machines` | `CreateGamingMachineDto` | `GamingMachineDetail` | `MACHINE_CODE_EXISTS` |
| PATCH | `/api/v1/admin/gaming/machines/:id` | `UpdateGamingMachineDto` | `GamingMachineDetail` | `MACHINE_NOT_FOUND` |
| GET | `/api/v1/admin/gaming/reports/usage` | `{ fromDate, toDate }` | `GamingUsageReportResponse` | None |
