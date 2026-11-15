# K6 Concurrency & Stress Testing Suite — Phanta Sports & Gaming Platform

Bộ kịch bản kiểm thử tải đồng thời cao (High-Concurrency Stress Testing) nhằm xác thực các bất biến nghiệp vụ (Invariants) được chỉ định trong SRS:

## 1. Danh sách kịch bản test:

### Kịch bản 1: Đặt chỗ sân bãi đồng thời (`booking-stress-test.js`)
- **Mục tiêu:** 100 Virtual Users (VUs) cùng tranh chấp giữ 01 khung giờ sân bãi duy nhất (Hold Slot).
- **Kỳ vọng bất biến:** Đúng **1 request** được chấp nhận (HTTP 201), 99 request còn lại bị từ chối với HTTP 409 Conflict. Không phát sinh 500.

### Kịch bản 2: Khởi động phiên chơi Gaming 100 máy (`gaming-concurrency-stress.js`)
- **Mục tiêu:** 100 VUs cùng kích hoạt phiên chơi trên hệ thống 100 máy gaming (M14).
- **Kỳ vọng bất biến (Rule 1):** Mỗi tài khoản người dùng chỉ được active tối đa 01 phiên chơi tại 1 thời điểm. Chặn trùng lặp, p95 latency < 500ms.

### Kịch bản 3: Tranh chấp suất lớp học nhóm (`pt-class-stress-test.js`)
- **Mục tiêu:** 50 VUs đồng thời bấm đăng ký vào lớp học giới hạn sĩ số (M11).
- **Kỳ vọng bất biến:** Khi lớp chạm ngưỡng `capacity`, mọi request tiếp theo nhận HTTP 400 (Lớp đã đầy), ngăn chặn triệt để tình trạng overbooking do race condition.

---

## 2. Hướng dẫn chạy kiểm thử với K6:

Cài đặt k6 (nếu chưa có):
```bash
# Windows (winget hoặc choco)
winget install k6 --source winget
# hoặc macOS
brew install k6
```

Chạy kịch bản:
```bash
# Chạy stress test đặt sân
k6 run k6/booking-stress-test.js

# Chạy stress test 100 máy gaming
k6 run k6/gaming-concurrency-stress.js

# Chạy stress test đăng ký lớp học PT
k6 run k6/pt-class-stress-test.js
```

Tùy biến endpoint qua biến môi trường:
```bash
k6 run -e API_URL=http://localhost:3000 k6/gaming-concurrency-stress.js
```
