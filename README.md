# 🏆 Hệ Thống Đặt Lịch Tổ Hợp Thể Thao (Golden Star Sports Hub)

Hệ thống quản lý và vận hành thông minh dành cho tổ hợp thể thao đa năng (Bóng đá, Pickleball, Cầu lông, Tennis, Gym). Dự án tập trung triển khai chuyên sâu 3 phân hệ cốt lõi:

* **⚡ Epic E04: Cổng Thanh Toán VietQR Tự Động, Cứu Đơn & Hoàn Tiền (M06)**
  - Sinh mã VietQR động theo chuẩn Napas 24/7 với bộ đếm ngược 15 phút.
  - Mô phỏng Webhook IPN ngân hàng xác nhận giao dịch thời gian thực.
  - Trung tâm cứu đơn bất thường (khớp giao dịch sai cú pháp / thiếu mã đặt sân).
  - Sổ cái kiểm soát hoàn tiền & khiếu nại (VietQR ngược, tiền mặt, ví hội viên).

* **🛒 Epic E06: Quầy Bán Lẻ POS, Quản Lý Kho & Ca Thu Ngân (M12)**
  - Quầy POS bán lẻ cảm ứng: F&B (Pocari Sweat, Red Bull, TH true WATER, Thanh Nutsbar Energy, Xúc xích Oh Teen LC Foods), thuê vợt và phụ kiện thể thao.
  - Quản lý kho, ngưỡng cảnh báo sắp hết hàng và điều chỉnh nhập/xuất kho.
  - Quản lý phân ca làm việc (06:00 - 23:00):
    + **Ca Sáng (06:00 - 12:00)**: Thu ngân Cáp Nguyễn Thanh Huyền (`NV-HUYEN-06`).
    + **Ca Chiều (12:00 - 18:00)**: Thu ngân Đặng Minh Quân (`NV-QUAN-12`).
    + **Ca Tối (18:00 - 23:00)**: Thu ngân Phạm Hoàng Long (`NV-LONG-18`) - Ca cuối ngày.
    + **Sau 23:00**: Đóng cửa tổ hợp, nghỉ đêm an toàn, sáng 06:00 mở ca mới.
    + **Ca gãy cuối tuần (Thứ 7 & CN)**: 16:00 - 20:00 (Lê Thu Trang) và 08:30 - 12:30 (Vũ Tuấn Kiệt).
  - Bảng kiểm đếm két tiền đầy đủ 9 mệnh giá (từ 500.000 đ đến 1.000 đ) khi bàn giao ca.
  - **Cổng Chủ Tổ Hợp Kiểm Tra (Owner Shift Audit Portal)**: Chủ (Hoàng Đình Dũng) đối soát và phê duyệt trực tiếp trên hệ thống.

* **📊 Epic E16: Báo Cáo Doanh Thu, Tỷ Lệ Lấp Đầy & Nhật Ký Kiểm Toán (M17)**
  - Dashboard KPIs doanh thu, kênh thanh toán, top mặt hàng bán chạy.
  - Heatmap trực quan tỷ lệ lấp đầy sân (7 ngày x 18 khung giờ từ 06h - 23h).
  - Nhật ký kiểm toán hệ thống (Audit Trail) bất biến và xuất file đối soát CSV.

---

## 🛠️ Công Nghệ Sử Dụng
* **Backend:** Node.js, Express.js REST API
* **Frontend:** HTML5, CSS3 (Modern Dark Theme), Vanilla JavaScript ES6+
* **Âm thanh hiệu ứng:** Web Audio API synthesizer
* **Chuẩn hình ảnh & giao diện:** Dark theme chuyên nghiệp, tối ưu quầy POS cảm ứng

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Cài đặt thư viện
```bash
npm install
```

### 2. Khởi chạy máy chủ
```bash
node server.js
```

### 3. Mở trên trình duyệt
Truy cập địa chỉ: **[http://localhost:3000](http://localhost:3000)**
