# Hướng Dẫn Chạy Kiểm Thử Tải k6 (Mục 7.1)

## 1. Cài đặt k6
- **MacOS (Homebrew)**:
  ```bash
  brew install k6
  ```
- **Hoặc dùng Docker**:
  ```bash
  docker run --rm -i grafana/k6 run - <k6/booking-stress-test.js
  ```

## 2. Thực thi kịch bản kiểm thử tải
```bash
# Chạy trực tiếp
k6 run k6/booking-stress-test.js

# Hoặc truyền biến môi trường (URL, Venue ID, Ngày đặt):
k6 run -e API_URL=http://localhost:3000 -e VENUE_ID=<VENUE_ID> -e BOOKING_DATE=2026-10-25 k6/booking-stress-test.js
```

## 3. Tiêu chí nghiệm thu Đạt (Pass Criteria):
1. `successful_bookings = 1`: Đúng 1 yêu cầu giữ chỗ thành công duy nhất.
2. `conflict_bookings_409 >= 90`: Tất cả các user còn lại nhận mã lỗi 409 Conflict rõ ràng.
3. `error_bookings_500 = 0`: Không có bất kỳ lỗi Crash hay Unhandled 500 nào.
4. `http_req_duration p(95) < 500ms`: Tốc độ phản hồi đạt chuẩn cao dưới tải lớn.
