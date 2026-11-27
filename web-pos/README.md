# Phanta Web POS

Ứng dụng Web POS cho quầy thu ngân tổ hợp thể thao và Esports Phanta Sports, xây dựng bằng Next.js 14 (App Router) và Tailwind CSS.

## Yêu cầu môi trường

- Node.js 20 trở lên
- Backend NestJS đang chạy tại `http://localhost:3000` (hoặc cấu hình `NEXT_PUBLIC_API_URL` trong `.env.local`)

## Cài đặt và chạy

```bash
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:3001/login`.

Để chạy bản production:

```bash
npm run build
npm run start
```

## Các trang và phím tắt

- `/login` và `/signup`: Đăng nhập và đăng ký tài khoản quầy thu ngân.
- `/pos/checkin-walkin` (`F1`): Soát vé QR vào sân và đặt chỗ trực tiếp tại quầy.
- `/pos/canteen` (`F2`): Bán hàng Canteen, tính tiền khách đưa và tiền thối.
- `/pos/gym` (`F3`): Soát thẻ hội viên Gym và tra cứu danh sách thẻ.
- `/pos/gaming` (`F4`): Sơ đồ mặt bằng 100 máy Cyber Gaming và điều khiển phiên chơi.
- `/pos/refunds` (`F5`): Xử lý hoàn tiền thủ công hoặc qua cổng thanh toán.
- `/pos/bridge` (`F6`): Theo dõi thiết bị ngoại vi tại quầy và nhật ký lệnh.
- `/pos/shift` (`F7`): Mở ca, kiểm đếm 9 mệnh giá tiền polymer VNĐ và chốt ca.
- `/pos/rentals` (`F8`): Thuê dụng cụ, thu tiền cọc và quyết toán hoàn cọc / hư hại / mất khi trả đồ.
- Phím tắt dùng chung trong khu POS: `F9` mở mẫu in nhiệt 80mm, `Ctrl+K` đưa con trỏ vào ô tìm kiếm nhanh, `Esc` đóng hộp thoại đang mở.
