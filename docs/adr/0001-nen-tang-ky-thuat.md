# ADR-0001: Nền tảng và quy ước kỹ thuật

Trạng thái: **Đã chấp nhận** · Ngày: 06/10/2026 · Người quyết định: chủ dự án + Tech Lead

## Bối cảnh
Một cơ sở, 7 lập trình viên, ~10 tháng. Ưu tiên: đúng tiền và đúng đặt chỗ, dễ vận hành, dễ thay người.

## Quyết định
| Hạng mục | Chọn | Ghi chú |
|---|---|---|
| Kiến trúc | Modular monolith (NestJS) | Không microservices ở v1 |
| Quản lý kho mã | pnpm workspaces + Turborepo | Gaming client và Bridge agent là kho/thư mục .NET riêng trong cùng repo |
| Ngôn ngữ | TypeScript `strict: true` | Cấm `any` ngầm; `unknown` + zod khi nhận dữ liệu ngoài |
| Xác thực dữ liệu | zod (dùng chung qua `packages/contracts`), `nestjs-zod` ở backend | Một nguồn cho web, mobile, API |
| CSDL | MongoDB 7+ replica set, Mongoose | Bắt buộc transaction cho thao tác tiền/đặt chỗ |
| Cache/khóa/hàng đợi | Redis (ioredis), BullMQ | Redis không phải nguồn sự thật |
| Thời gian | luxon, múi giờ `Asia/Ho_Chi_Minh` | Lưu UTC; ngày nghiệp vụ dạng `YYYY-MM-DD` giờ VN |
| Tiền | Số nguyên VND (`Number.isSafeInteger`) | Helper trong `packages/shared/money` |
| Log | pino, có che dữ liệu nhạy cảm | |
| Hợp đồng API | OpenAPI trước (contract-first), Spectral lint, `openapi-typescript` | |
| Kiểm thử | Jest + Supertest, Playwright, k6, `mongodb-memory-server` (replica set) hoặc Testcontainers | |
| Lỗi API | RFC 7807 `application/problem+json` + trường `code` ổn định | Ví dụ `SLOT_TAKEN`, `WALLET_INSUFFICIENT` |
| Commit | Conventional Commits, tiếng Anh | PR nhỏ, một mục đích |
| Ngôn ngữ | Mã, tên biến, commit: **tiếng Anh**. Chuỗi giao diện, tài liệu cho người dùng: **tiếng Việt** | |

## Hệ quả
- Mọi lệch khỏi bảng trên cần ADR mới.
- Phiên bản Node.js/.NET: dùng bản LTS hiện hành tại thời điểm khởi tạo dự án và ghi vào `.nvmrc`/`global.json`.
