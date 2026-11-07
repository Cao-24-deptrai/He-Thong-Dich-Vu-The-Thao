---
trigger: glob
globs: "apps/mobile/**"
description: Quy ước app React Native của khách: điều hướng, QR, push, lưu trữ an toàn, offline, phát hành.
---

# App mobile (React Native)

- Dùng client sinh từ `packages/contracts`; không tự định nghĩa lại kiểu API. Không tính tiền ở app.
- **Token** lưu trong kho an toàn của hệ điều hành (Keychain/Keystore), không dùng AsyncStorage cho bí mật.
- **QR check-in** (sân, gym, phòng gaming) là QR động có chữ ký, đổi mỗi 30 giây: app làm mới theo máy chủ, không tự sinh; hiển thị mờ khi mất mạng thay vì hiện mã cũ.
- **Push**: đăng ký token theo thiết bị, hủy khi đăng xuất; xử lý chạm vào thông báo mở đúng màn hình (đặt sân, thẻ gym, giải đấu).
- Thanh toán: mở QR ngân hàng/ deeplink ví điện tử, sau đó **hỏi lại server** trạng thái thanh toán; không coi "quay lại app" là đã thanh toán.
- Mất mạng: hiển thị trạng thái rõ; thao tác ghi bị chặn (không xếp hàng đợi âm thầm) trừ những thao tác đã thiết kế offline.
- Tuân thủ chính sách cửa hàng ứng dụng: có chính sách quyền riêng tư, chức năng **xóa tài khoản** trong app, xin quyền camera/thông báo đúng lúc kèm giải thích tiếng Việt.
- Test luồng chính bằng Maestro hoặc Detox; thử trên thiết bị thật iOS và Android trước mỗi bản phát hành.
