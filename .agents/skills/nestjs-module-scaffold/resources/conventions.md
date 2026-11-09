# Quy ước backend (tham khảo nhanh)

## Thư mục
```
modules/<name>/
  <name>.module.ts
  index.ts                  # API công khai
  controllers/  services/  repositories/  schemas/  dto/  events/  tests/
```

## Đặt tên
- Class: `PascalCase`; file: `kebab-case`; collection Mongo: `snake_case` số nhiều.
- Mã lỗi domain: `SCREAMING_SNAKE` ổn định, không đổi sau khi phát hành (client ánh xạ sang tiếng Việt). Ví dụ: `SLOT_TAKEN`, `HOLD_EXPIRED`, `BOOKING_NOT_CANCELLABLE`, `WALLET_INSUFFICIENT`, `WALLET_CATEGORY_NOT_ALLOWED`, `PAYMENT_MISMATCH`, `GYM_FULL`, `MEMBERSHIP_INACTIVE`, `SESSION_ALREADY_ACTIVE`.

## DomainError
```ts
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus = 409,
    public readonly details?: Record<string, unknown>,
  ) { super(message); }
}
```
Một filter toàn cục chuyển thành `application/problem+json`: `{ type, title, status, code, detail, instance, details? }`.

## Sự kiện
Sự kiện nghiệp vụ ghi vào `outbox` **trong cùng transaction** với thay đổi dữ liệu; worker đọc ra và gửi thông báo/hóa đơn. Tên sự kiện: `<module>.<noun>.<verb-past>` (`booking.booking.confirmed`, `wallet.ledger.credited`).
