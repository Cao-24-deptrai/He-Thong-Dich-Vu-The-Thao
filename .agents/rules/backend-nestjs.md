---
trigger: glob
globs: "apps/api/**/*.ts"
description: Quy ước viết backend NestJS: ranh giới module, controller/service/repository, lỗi, idempotency, hàng đợi.
---

# Backend NestJS

- Cấu trúc: `apps/api/src/modules/<module>/{controllers,services,repositories,schemas,dto,events,tests}` + `index.ts` (API công khai của module). Tạo module mới bằng skill `nestjs-module-scaffold`.
- **Ranh giới module**: module khác chỉ import từ `index.ts` (service công khai). Cấm import repository/schema của module khác (ESLint `boundaries`). Giao tiếp bất đồng bộ qua **outbox** + BullMQ.
- **Controller mỏng**: nhận DTO (zod), kiểm tra quyền (guard), gọi service, trả kiểu từ `packages/contracts`. Không có logic nghiệp vụ trong controller.
- **Service** chứa nghiệp vụ; **repository** chứa truy vấn Mongo và nhận `session` (transaction) làm tham số tùy chọn. Transaction được mở ở service, truyền xuống repository.
- Thao tác POST liên quan đặt sân/thanh toán/ví bắt buộc header `Idempotency-Key` (dùng interceptor chung, không tự viết lại mỗi nơi).
- **Lỗi**: ném `DomainError` có `code` ổn định (`SLOT_TAKEN`, `HOLD_EXPIRED`, `WALLET_INSUFFICIENT`, `PAYMENT_MISMATCH`...), filter chung chuyển sang `application/problem+json`. Không trả stack trace; không để lộ chi tiết nội bộ.
- Retry transaction chỉ với `TransientTransactionError`/`UnknownTransactionCommitResult` (dùng `session.withTransaction`). `E11000` trên unique index của slot → `SLOT_TAKEN`, không retry.
- Việc nền (hết hạn giữ chỗ, đối soát, gửi thông báo/hóa đơn): BullMQ worker, **idempotent**, có retry với backoff, có dead-letter + cảnh báo.
- Cấu hình đọc từ `SettingsService` (có cache + version); không đọc `process.env` rải rác, cấu hình env qua một module có zod validate.
- Mọi endpoint ghi có test tích hợp (Supertest) chạy trên MongoDB replica set thật (memory-server hoặc container).
