---
name: reporting-daily-stats
description: Triển khai báo cáo và bảng điều khiển (doanh thu theo khu, lấp đầy sân và cao/thấp điểm, khách hàng, tồn kho và dụng cụ, đối soát ca, gaming, gym, thanh toán và hóa đơn, nhật ký) bằng bảng tổng hợp daily_stats cập nhật gia tăng từ outbox kèm job tính lại ban đêm. Dùng khi làm module report/M17, thêm một báo cáo, sửa số liệu dashboard.
---

# reporting-daily-stats

Đọc trước: spec **M17** (bảng R1–R9), **5.2 nhóm H** (`daily_stats`).

## Kiến trúc
- Không quét toàn bộ dữ liệu giao dịch để dựng báo cáo. Dùng `daily_stats { key (unique), date, zone, metrics }`.
- **Cập nhật gia tăng**: consumer sự kiện `outbox` (đã thanh toán, hủy, hoàn, check-in, kết thúc phiên…) `$inc` vào số liệu của ngày/khu tương ứng — **idempotent** (khử trùng theo `eventId`).
- **Tính lại ban đêm**: job dựng lại `daily_stats` của hôm qua (và N ngày gần đây) từ dữ liệu gốc, so với bản gia tăng; lệch → ghi đè bằng bản tính lại và cảnh báo. Có lệnh chạy lại cho một khoảng ngày.
- Báo cáo nặng (xuất Excel/PDF khoảng dài) chạy nền, trả liên kết tải; có phân trang/lọc phía server.
- Phân quyền xem theo vai trò (xem Phụ lục A): thu ngân không xem doanh thu tổng; quản lý xem phần được cấu hình.

## Định nghĩa chỉ số (không tự ý đổi)
| Chỉ số | Định nghĩa |
|---|---|
| Doanh thu gộp | Σ `orders.total` đã thanh toán (trước giảm giá/hoàn) theo **ngày thanh toán** giờ VN |
| Doanh thu thuần | Gộp − giảm giá − hoàn tiền |
| Khu (zone) | Ánh xạ từ `lines[].category`: sân (4 môn, tách theo `sport`), gym thẻ (`GYM_MEMBERSHIP`), lớp/PT (`CLASS`,`PT`), gaming sảnh (`GAME_TIME`), gaming phòng riêng (`GAME_ROOM`), canteen, bán lẻ, cho thuê, giải đấu, gói combo |
| Lấp đầy | Số phút được đặt (CONFIRMED/CHECKED_IN/COMPLETED/NO_SHOW) / số phút mở cửa, theo sân, môn, giờ trong ngày; tách cao điểm/thấp điểm theo `price_rules` |
| Tỷ lệ hủy / no-show | Số lượt hủy (hoặc no-show) / số lượt đặt |
| Khách mới | Lần đầu có giao dịch thanh toán thành công trong kỳ |
| Khách quay lại | Từ 2 lượt đặt trong 30 ngày |
| Khách rời bỏ | Không phát sinh giao dịch 60 ngày |
| Tỷ lệ gia hạn gym | Số thẻ gia hạn trong vòng N ngày quanh hạn / số thẻ đến hạn |
| Đối soát ca | `expectedCash` so với tiền thực đếm của ca (skill `pos-inventory-shift`) |

Ranh giới ngày luôn theo `Asia/Ho_Chi_Minh`; dùng helper `packages/shared/time`.

## Thêm một báo cáo mới
1. Xác định chỉ số + bộ lọc; thêm định nghĩa vào bảng trên **và** vào M17 của `docs/SPEC.md`.
2. Thêm sự kiện/giá trị cần thiết vào consumer gia tăng và job tính lại (cả hai phải cho cùng kết quả).
3. Contract endpoint `GET /reports/<tên>` (skill `openapi-contract-first`), có `x-permission`.
4. Chỉ mục phù hợp cho truy vấn (`daily_stats(date, zone)`).
5. Giao diện admin (bảng/biểu đồ) + xuất Excel/CSV/PDF.
6. Test: dữ liệu mẫu cố định → số liệu kỳ vọng; **gia tăng ≡ tính lại**; hoàn tiền và hủy ảnh hưởng đúng; ranh giới nửa đêm.

## Cạm bẫy
- Tính ngày theo UTC làm doanh thu lệch ngày.
- Đếm trùng khi consumer xử lý sự kiện lặp (thiếu khử trùng).
- Cộng doanh thu theo ngày **đặt** thay vì ngày **thanh toán**/**sử dụng** không nhất quán giữa báo cáo — chốt định nghĩa và ghi lại.
- Báo cáo chậm vì truy vấn trên collection giao dịch lớn.
