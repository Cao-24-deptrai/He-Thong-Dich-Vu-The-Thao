# PHANTA – Hướng dẫn ghép vào repository nhóm

Đây là gói **mã nguồn trích từ bản PHANTA-E06-BAN-SUA-TIEP** để review/merge, KHÔNG phải một ứng dụng chạy độc lập. Các đường dẫn giữ nguyên tương đối so với gốc repository.

## Cách đưa lên GitHub đúng cách
1. Tạo nhánh từ repository nhóm mới nhất (không đẩy trực tiếp lên main).
2. Giải nén vào bản sao repository chung và kiểm tra xung đột/diff, **không ghi đè khi chưa so sánh**.
3. Chạy build/test với toàn bộ dependency của repository nhóm trước khi commit.
4. Dùng `git status`, `git diff`, rồi `git add` chọn lọc các file theo Epic; commit và tạo Pull Request.
5. KHÔNG commit `.env`, `node_modules`, `dist`, thông tin đăng nhập hay key PayOS.

## Lưu ý
- Source này là code thử nghiệm được tách ra, không xác nhận đã qua test E2E hoặc đã ghép thành công với repository của nhóm.
- Các import dùng `@sports/contracts`, `@sports/shared` và những module liên quan vốn có trong workspace PHANTA chung. Phải đồng bộ schema/exports nếu repo nhóm khác phiên bản.

## E04 – Thanh toán VietQR, cứu đơn, hoàn tiền

**Có:** payment controller, payment/webhook/vietqr services, schemas và tests, contract payment.
**Còn thiếu để chạy tích hợp:** BookingModule/BookingService và quy tắc cập nhật trạng thái đặt sân từ repository nhóm; cấu hình/cách thử webhook PayOS; kiểm thử chữ ký webhook, idempotency và refund.

**Frontend dự kiến theo phân công:** mobile VietQrModal, admin finance **không có trong ZIP nguồn**.

**Đường dẫn stage gợi ý:** `git add apps/api/src/modules/payment packages/contracts/src/payment.ts`.
