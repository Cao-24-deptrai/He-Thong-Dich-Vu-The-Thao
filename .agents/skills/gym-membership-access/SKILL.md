---
name: gym-membership-access
description: Triển khai thẻ thành viên gym (gói, mua, gia hạn cộng dồn, ưu đãi gia hạn sớm, nâng cấp bù chênh lệch), kiểm soát vào ra RFID/vân tay/QR, bộ đếm tối đa 100 người, chế độ offline của cửa. Dùng khi làm module membership/M10, check-in gym, bộ đếm sức chứa, bridge agent cho cửa.
---

# gym-membership-access

Đọc trước: spec **M10**, **M22**, **3.7** (offline), **5.3**, giả định **A10, A11, A14**.

## Quy tắc thẻ (xem `resources/membership-math.example.ts`)
- Gói: tháng/quý/năm, **không có vé lượt**. Ngày dùng theo giờ VN, **ngày hết hạn tính cả ngày cuối**.
- **Gia hạn**: còn hạn → bắt đầu = hết hạn + 1 (cộng dồn); đã hết → từ hôm nay. **Ưu đãi gia hạn sớm**: gia hạn khi còn ≥ N ngày (mặc định 7) giảm X% theo từng gói; làm tròn xuống đồng.
- **Nâng cấp (A10)**: giá trị còn lại = `giá đã trả × số ngày còn lại / tổng ngày` (tính cả hôm nay, làm tròn xuống); phải trả = `max(0, giá mới − giá trị còn lại)`; gói mới bắt đầu hôm nay; gói cũ → `UPGRADED`; **không hạ cấp**. Trong transaction với order + payment.
- **Không** có bảo lưu, chuyển nhượng. Thanh toán thẻ gym **không** dùng ví nội bộ.
- Một khách tối đa một thẻ `ACTIVE`; các thẻ nối tiếp là `UPCOMING`. Trạng thái `EXPIRED` do job hằng đêm + kiểm tra ngay khi check-in (không chỉ tin job).

## Kiểm soát vào ra
Luồng: quét RFID/vân tay/QR → kiểm tra thẻ hợp lệ → kiểm tra đã ở trong phòng (anti-passback) → kiểm tra sức chứa → ghi vào → mở cửa → cập nhật bộ đếm realtime.
- **Bộ đếm 100 người** = Redis ZSET `gym:inside`; vào/ra bằng Lua nguyên tử (`resources/enter-gym.lua`, `exit-gym.lua`). Sức chứa lấy từ `settings` (`gym.capacity`). Đầy → `GYM_FULL` kèm số người hiện tại.
- Mọi lượt ghi `gym_access_events` (IN/OUT, phương thức, kết quả, lý do nếu thủ công). Lễ tân cho vào thủ công: **lý do bắt buộc** + audit.
- **Tự check-out** sau 4 giờ (A11): job quét `ZRANGEBYSCORE gym:inside -inf (now−4h)` → `ZREM` + ghi sự kiện OUT phương thức `AUTO`.
- **Đối chiếu bộ đếm**: job định kỳ dựng lại tập "đang trong phòng" từ `gym_access_events` và so với Redis; lệch → sửa + cảnh báo. Quản lý có thao tác "đối chiếu bộ đếm" thủ công.
- **QR động** (`resources/qr-token.example.ts`): server sinh, đổi mỗi 30 giây, một lần dùng, app không tự sinh.
- **Vân tay (A14, tùy chọn)**: chỉ khi có đồng ý rõ ràng; mẫu mã hóa AES-256-GCM, không rời thiết bị ở dạng thô; rút đồng ý → xóa mẫu. Thẻ RFID là mặc định.
- Mất thẻ RFID: khóa thẻ cũ ngay, gán thẻ mới cho cùng thành viên.

## Chế độ offline (Bridge agent)
- Agent giữ **bản sao mã hóa** danh sách thành viên còn hạn (đồng bộ mỗi phút) và tự quyết định mở/đóng cửa khi mất mạng.
- Mọi lượt vào/ra lưu hàng đợi cục bộ (mã hóa, có `eventId` + `seq`), đồng bộ khi có mạng; server khử trùng theo `eventId`.
- Khi offline, bộ đếm do agent tạm tính; khi có mạng, server áp lại các sự kiện theo thứ tự thời gian và đối chiếu bộ đếm (có thể tạm vượt 100 trong thời gian offline — ghi nhận, không tự đá người ra).

## Cạm bẫy
- Kiểm tra sức chứa bằng `ZCARD` rồi mới `ZADD` ở hai lệnh riêng (race) — phải dùng Lua.
- Chỉ tin trạng thái thẻ lưu sẵn mà không kiểm tra ngày hết hạn lúc check-in.
- Quên check-out → bộ đếm lệch (cần tự check-out + đối chiếu).
- Tính ngày bằng UTC làm thẻ hết hạn lệch một ngày.

## Kiểm thử bắt buộc
**T09** (150 người quét khi có 90 → đúng 10 vào), **T10** (ngắt mạng cửa 10 phút → thành viên hợp lệ vẫn vào, đồng bộ lại đúng), **T14** (nâng cấp đúng công thức), + gia hạn cộng dồn/ưu đãi sớm, tự check-out, đối chiếu bộ đếm. Xem skill `concurrency-test-kit`.
