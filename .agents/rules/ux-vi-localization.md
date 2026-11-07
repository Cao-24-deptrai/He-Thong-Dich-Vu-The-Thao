---
trigger: glob
globs: "apps/web/**, apps/admin/**, apps/pos/**, apps/mobile/**, packages/ui/**, packages/shared/**"
description: Quy ước tiếng Việt và định dạng số, ngày giờ, tiền cho mọi giao diện.
---

# Tiếng Việt và định dạng

- Chuỗi giao diện bằng **tiếng Việt có dấu**, giọng lịch sự, ngắn gọn, nhất quán thuật ngữ: "đặt sân", "giữ chỗ", "thanh toán", "hoàn tiền", "thẻ thành viên", "ví". Đặt chuỗi trong tệp i18n (khung đa ngôn ngữ sẵn sàng), không rải chuỗi trong component.
- **Tiền**: `1.250.000 đ` (dấu chấm ngăn cách nghìn, hậu tố ` đ`), dùng `Intl.NumberFormat('vi-VN')`; không hiển thị số lẻ.
- **Ngày giờ**: `dd/MM/yyyy`, `HH:mm` 24 giờ, múi giờ `Asia/Ho_Chi_Minh` (dùng helper `packages/shared/time`). Thứ trong tuần: "Thứ Hai"…"Chủ nhật".
- **Số điện thoại**: nhập dạng `0xxxxxxxxx`, chuẩn hóa về quốc tế khi lưu; hiển thị che một phần ở nơi nhạy cảm.
- Thông báo lỗi nói rõ **chuyện gì xảy ra và làm gì tiếp** ("Khung giờ này vừa có người đặt. Vui lòng chọn khung giờ khác."), không dùng mã lỗi thô.
- Không dịch máy móc các mã nghiệp vụ (`CONFIRMED`...); dùng bảng ánh xạ trạng thái → nhãn tiếng Việt.
