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

## E06 – POS, kho và ca thu ngân

**Có:** controller/service/schema canteen, test đơn vị/concurrency, trang demo E06 cho môi trường development.
**Chưa xác nhận:** test qua đăng nhập và quyền thật, nghiệp vụ dữ liệu Mongo thực, frontend POS/admin chính thức, bridge-agent thiết bị.

**Phụ thuộc:** AppModule, Auth, MongoDB, Redis, shared/contracts và các hạ tầng của repo nhóm. Trang `/demo/e06` phải được đăng ký qua `DemoE06Module` trong AppModule ở môi trường dev; không thêm vào production.

**Đường dẫn stage gợi ý:** `git add apps/api/src/modules/canteen packages/contracts/src/canteen.ts` và chỉ thêm demo khi nhóm đồng ý.
