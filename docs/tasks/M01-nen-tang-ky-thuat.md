# Kế hoạch triển khai: M01 Nền tảng kỹ thuật (Technical Foundation)

Người phụ trách: T1 (Tech Lead) · Giai đoạn: GĐ1 · Ngày công ước lượng (spec 8.2): 30 ngày công

## 1. Phạm vi
- **Làm:**
  - Khởi tạo monorepo: `pnpm workspaces` + `Turborepo` + `tsconfig.base.json` + `.gitignore` + `.nvmrc`.
  - Khởi tạo `packages/shared`:
    - `money`: Helper tiền tệ nguyên VND (`Number.isSafeInteger`), không float, làm tròn an toàn, format VND.
    - `time`: Helper múi giờ `Asia/Ho_Chi_Minh` (luxon), chuẩn hóa ngày nghiệp vụ `YYYY-MM-DD`, tính slot 30 phút.
    - `enums` & `constants`: Khởi tạo các mã trạng thái và enum dùng chung.
  - Khởi tạo `packages/contracts`:
    - Cấu hình contract-first OpenAPI, Zod schemas dùng chung, script sinh TypeScript types (`openapi-typescript`).
  - Khởi tạo `apps/api` (NestJS Modular Monolith):
    - Cấu hình NestJS với TypeScript strict.
    - `ConfigModule` xác thực biến môi trường bằng Zod.
    - `LoggerModule` với Pino, cấu hình che dữ liệu nhạy cảm (password, token, otp, pin, biometric).
    - `DomainError` và `ProblemDetailsFilter` chuẩn RFC 7807 `application/problem+json` với mã lỗi ổn định.
    - `DatabaseModule` kết nối MongoDB Replica Set qua Mongoose với helper transaction session.
    - `RedisModule` kết nối Redis (ioredis), cấu hình BullMQ.
    - `IdempotencyInterceptor` kiểm soát `Idempotency-Key` với Redis.
    - `OutboxModule` schema và publisher cho Outbox pattern.
  - Thiết lập CI pipeline (`.github/workflows/ci.yml`): lint, typecheck, test, build.
  - Các script chuẩn tại root `package.json`: `dev`, `build`, `lint`, `typecheck`, `test`, `test:race`, `contracts:gen`.
- **Hoãn (thuộc các module sau):**
  - Nghiệp vụ cụ thể của Auth (M02), Cơ sở vật chất (M03), Booking (M04)...
  - Giao diện web/mobile/POS/admin (làm khung ở giai đoạn tiếp theo của GĐ1).
  - Client .NET WPF và Bridge agent.

## 2. Bất biến liên quan (từ rule 00-invariants)
1. **Tiền:** Số nguyên VND (`Number.isSafeInteger`). Không dùng float. Helper trong `packages/shared/money`.
2. **Thời gian:** Lưu UTC, ngày nghiệp vụ và slot tính theo `Asia/Ho_Chi_Minh`. Helper trong `packages/shared/time`.
3. **Idempotency:** Mọi API thay đổi trạng thái/tiền/đặt chỗ phải nhận `Idempotency-Key`.
4. **Lỗi:** Chuẩn RFC 7807 `application/problem+json`, có trường `code` ổn định, không để lộ stack trace.
5. **Cơ sở dữ liệu:** Bắt buộc MongoDB Replica Set để hỗ trợ Multi-Document Transactions.
6. **Bảo mật:** Không commit bí mật, lọc bỏ token/password/pin trong log.

## 3. Giả định đang dùng (cần xác nhận)
| Mã | Giá trị mặc định đang dùng | Khóa `settings` | Đã xác nhận? |
|---|---|---|---|
| A01 | 1 cơ sở duy nhất, dữ liệu hoàn toàn mới | N/A | Đã chốt theo spec |
| A21 | Tiền VND số nguyên, không dùng thẻ quốc tế | `payment.currency` | Đã chốt theo spec |

## 4. Hợp đồng API (packages/contracts)
| Method | Path | Request | Response | Lỗi (`code`) |
|---|---|---|---|---|
| GET | `/api/v1/health` | None | `{ status: "ok", timestamp: string, version: string }` | None |
| GET | `/api/v1/health/ready` | None | `{ status: "ready", db: boolean, redis: boolean }` | `SERVICE_UNAVAILABLE` |

## 5. Dữ liệu
- **Collection nền tảng:**
  - `outbox_events`: `{ _id, eventType, aggregateType, aggregateId, payload, status, createdAt, processedAt, retryCount }`
  - `audit_logs`: `{ _id, actorId, actorRole, action, targetType, targetId, before, after, ip, userAgent, createdAt }`
- **Chỉ mục:**
  - `outbox_events`: `{ status: 1, createdAt: 1 }`
  - `audit_logs`: `{ targetType: 1, targetId: 1, createdAt: -1 }`
- **Thao tác cần transaction:**
  - Ghi sự kiện vào `outbox_events` luôn đi cùng transaction của nghiệp vụ chính.

## 6. Nghiệp vụ và ngoại lệ
- Endpoint Healthcheck phản ánh đúng trạng thái sống (`/health`) và sẵn sàng phục vụ (`/health/ready` kiểm tra MongoDB + Redis).
- Mọi exception không bắt được chuyển thành HTTP 500 kèm mã `INTERNAL_SERVER_ERROR`, không làm lộ chi tiết hệ thống.
- Interceptor Idempotency từ chối các request thiếu header `Idempotency-Key` trên các endpoint ghi nhận nhạy cảm, đồng thời trả kết quả cũ nếu key trùng lặp.

## 7. Việc cần làm (theo thứ tự)
- [x] 1. Khởi tạo cấu trúc Monorepo pnpm workspaces + Turborepo (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `docker-compose.yml`).
- [x] 2. Xây dựng `packages/shared`:
  - `money`: kiểu và hàm tiện ích VND (`Number.isSafeInteger`).
  - `time`: helper Luxon múi giờ `Asia/Ho_Chi_Minh`, chuyển đổi UTC <-> Giờ VN, tính slot.
  - `enums` & `constants`: HTTP status, role, booking/payment status cơ bản.
  - Test đơn vị cho `money` và `time` (20/20 test passed).
- [x] 3. Xây dựng `packages/contracts`:
  - Cấu hình OpenAPI spec khởi đầu (`healthcheck.yaml`, `problem-details.yaml`).
  - Cấu hình Zod và sinh types cho Healthcheck và ProblemDetails (RFC 7807).
- [x] 4. Khởi tạo `apps/api` (NestJS Modular Monolith):
  - Khung ứng dụng NestJS với `tsconfig.json` kế thừa base.
  - `EnvModule` validate biến môi trường qua Zod.
  - `LoggerModule` (Pino) che dữ liệu nhạy cảm.
  - `DomainError` + `ProblemDetailsFilter` (RFC 7807).
  - `DatabaseModule` kết nối MongoDB Replica Set, cung cấp transaction helper.
  - `RedisModule` kết nối ioredis.
  - `IdempotencyInterceptor` lưu trạng thái vào Redis.
  - `OutboxModule` schema Mongoose + repository ghi outbox.
  - Controller Healthcheck (`/api/v1/health`, `/api/v1/health/ready`).
- [x] 5. Thiết lập CI GitHub Actions (`.github/workflows/ci.yml`).
- [x] 6. Viết test cho Healthcheck và Exception Filter (3/3 test passed).
- [x] 7. Kiểm tra toàn bộ lệnh chuẩn: `pnpm typecheck`, `pnpm test`, `pnpm build` (tất cả 100% pass).

## 8. Tiêu chí nghiệm thu
- Chạy lệnh `pnpm install`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` thành công không lỗi.
- Tiêu chí từ Spec M01: Một yêu cầu đi suốt từ giao diện/API đến DB/Redis kiểm tra sẵn sàng.
- Helper `money` từ chối số thực (float), tính toán chính xác tiền VND.
- Helper `time` tính toán chuẩn theo múi giờ `Asia/Ho_Chi_Minh` không bị lệch giờ server UTC.
- Filter lỗi trả đúng định dạng RFC 7807 `application/problem+json` kèm trường `code`.

## 9. Rủi ro / câu hỏi mở
- Môi trường phát triển cục bộ cần có MongoDB Replica Set (để hỗ trợ transaction) và Redis (chạy qua Docker Compose).
