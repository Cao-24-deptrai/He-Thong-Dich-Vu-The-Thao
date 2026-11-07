# Kịch bản kiểm thử đặt sân (phải có test tự động)

| Mã | Kịch bản | Kỳ vọng |
|---|---|---|
| T01 | 200 yêu cầu đặt cùng một ô cùng lúc | Đúng 1 thành công, 199 `SLOT_TAKEN`, không bản ghi hỏng |
| T02 | Đặt sân 11, rồi đặt sân 7 / sân 5 cùng khung giờ trong cụm | Các lần sau bị từ chối |
| T03 | Đặt sân 5 (F1), rồi đặt sân 11 chứa F1 | Sân 11 bị từ chối |
| T05 | Thanh toán đến sau khi giữ chỗ hết hạn | Ô còn trống → xác nhận; đã mất → hoàn ví + báo khách |
| T08 | Hủy trước 24 giờ / sau 24 giờ | Hoàn 100% / 0 đồng theo snapshot |
| — | Hold hết hạn rồi người khác đặt cùng ô | Người sau đặt được, ô "ma" không gây `SLOT_TAKEN` oan |
| — | Mất Redis giữa chừng (xóa hết khóa) | Vẫn không đặt trùng nhờ unique index |
| — | Gửi lặp cùng `Idempotency-Key` | Trả lại kết quả cũ, không tạo thêm booking |
| — | Đổi lịch sang khung đã bị người khác giữ | Từ chối, lượt đặt cũ giữ nguyên |
| — | Đặt qua nửa đêm / lệch 30 phút / dưới 60 phút | `BOOKING_CROSSES_MIDNIGHT` / `BOOKING_NOT_ALIGNED` / `BOOKING_TOO_SHORT` |
