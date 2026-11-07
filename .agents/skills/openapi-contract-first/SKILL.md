---
name: openapi-contract-first
description: Quy trình thiết kế API theo hợp đồng OpenAPI trước, sinh kiểu TypeScript và zod dùng chung cho backend, web, mobile, POS. Dùng khi thêm hoặc sửa endpoint, DTO, mã lỗi, hoặc khi giao diện cần gọi API mới.
---

# openapi-contract-first

Nguyên tắc: **hợp đồng đi trước, mã đi sau.** Backend, web, admin, POS, mobile đều dùng cùng một nguồn trong `packages/contracts`.

## Quy trình
1. Sửa/thêm đường dẫn trong `packages/contracts/openapi/<module>.yaml`.
2. Lint: `pnpm contracts:lint` (Spectral). Sửa mọi cảnh báo.
3. Sinh kiểu và client: `pnpm contracts:gen` (openapi-typescript → `packages/contracts/src/generated`). Không sửa tay file sinh ra.
4. Backend: controller dùng DTO zod khớp contract; trả đúng kiểu sinh ra.
5. Frontend/mobile: dùng client sinh ra, không tự `fetch` endpoint nghiệp vụ.
6. Test hợp đồng: kiểm tra phản hồi thật khớp schema (Supertest + validator schema).

## Quy ước API
- Tiền tố `/api/v1`. Danh từ số nhiều (`/bookings`), hành động đặc biệt là sub-resource động từ (`POST /bookings/{id}/cancel`).
- **Thao tác ghi liên quan đặt sân/thanh toán/ví: bắt buộc header `Idempotency-Key`** (UUID do client sinh một lần cho mỗi ý định, giữ nguyên khi thử lại). Gửi lặp cùng key → trả lại kết quả cũ, không tạo mới.
- Phân trang theo con trỏ: `?limit=` (tối đa 100) và `?cursor=`; phản hồi `{ items, nextCursor }`.
- Thời gian ISO-8601 UTC (`2026-11-02T10:30:00Z`); ngày nghiệp vụ `YYYY-MM-DD` (giờ VN) đặt tên trường rõ ràng (`businessDate`).
- Tiền là **số nguyên VND** (`type: integer`, `minimum: 0`), tên trường kết thúc bằng `Vnd` hoặc nằm trong object `money` thống nhất.
- Lỗi: `application/problem+json` với `code` ổn định. Mỗi endpoint liệt kê các `code` có thể trả trong contract.
- Quyền: mỗi endpoint khai báo khóa quyền cần thiết (`x-permission: booking.cancel.any`) để sinh bảng quyền và kiểm tra trong guard.
- Không đổi phá vỡ: thêm trường là an toàn; đổi/xóa trường hoặc đổi nghĩa → phiên bản mới hoặc giai đoạn chuyển tiếp, ghi ADR.

## Mẫu một endpoint
```yaml
/bookings/{id}/cancel:
  post:
    operationId: cancelBooking
    x-permission: booking.cancel.own
    parameters:
      - { name: Idempotency-Key, in: header, required: true, schema: { type: string, format: uuid } }
      - { name: id, in: path, required: true, schema: { type: string } }
    responses:
      '200': { description: Đã hủy, content: { application/json: { schema: { $ref: '#/components/schemas/CancelBookingResult' } } } }
      '409': { description: BOOKING_NOT_CANCELLABLE, content: { application/problem+json: { schema: { $ref: '#/components/schemas/Problem' } } } }
```

## Checklist trước khi báo xong
- [ ] Contract lint sạch, kiểu đã sinh lại, không có file sinh ra bị sửa tay.
- [ ] Mã lỗi mới đã thêm vào bảng ánh xạ tiếng Việt (`packages/shared/errors-vi`).
- [ ] Endpoint ghi có `Idempotency-Key` và có test gửi lặp.
