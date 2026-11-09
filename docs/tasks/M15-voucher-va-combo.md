# Kế hoạch triển khai: M15 Khuyến mãi (Voucher và Gói Combo)

Người phụ trách: T2 (Backend Promotion) · Giai đoạn: GĐ3 · Ngày công ước lượng (spec 8.2): 35 ngày công

## 1. Phạm vi
- **Làm:**
  - `F15.1`: Quản lý danh mục Voucher:
    - Mã voucher (`code`: duy nhất, viết hoa, ví dụ `SUMMER2026`, `CHAOBANMOI`).
    - Loại giảm giá: Giảm theo phần trăm (`PERCENT`) hoặc giảm số tiền cố định (`FIXED`).
    - Giá trị giảm (`discountValue`), mức giảm tối đa (`maxDiscountAmount`), giá trị đơn tối thiểu (`minOrderAmount`).
    - Phạm vi áp dụng (`applicableScopes`: `COURT`, `CANTEEN`, `GYM`, `RENTAL`, `GAMING`, `ALL`).
    - Thời hạn hiệu lực: `validFrom`, `validTo`.
    - Giới hạn lượt dùng: Tổng toàn hệ thống (`totalUsageLimit`) và mỗi khách hàng (`perCustomerLimit`).
    - Kênh áp dụng: `ONLINE`, `POS`, `ALL`.
    - Trạng thái: `ACTIVE`, `PAUSED`, `EXPIRED`.
  - `F15.2`: Động cơ thẩm định & Áp mã Voucher (`validateAndApplyVoucher`):
    - Kiểm tra điều kiện: thời hạn, số lượt còn lại, mức đơn tối thiểu, phạm vi dịch vụ, giới hạn mỗi khách hàng.
    - Tính toán số tiền được giảm giá (`discountAmount`) chuẩn Integer VND.
    - Trả về lý do chi tiết khi không hợp lệ (`VOUCHER_EXPIRED`, `MIN_ORDER_NOT_MET`, `VOUCHER_LIMIT_EXCEEDED`, `VOUCHER_SCOPE_MISMATCH`).
  - `F15.3`: Tiêu và hoàn trả Voucher (`consumeVoucher` / `rollbackVoucherUsage`):
    - Khử trùng lặp và ghi nhận lịch sử áp mã (`VoucherUsage`).
    - Hoàn lại lượt dùng khi đơn hàng bị hủy trong thời hạn cho phép.
  - `F15.4`: Quản lý mẫu Gói Combo (`ComboPackage`):
    - Tên gói, mô tả, ảnh, giá bán (`price`, Integer VND).
    - Các thành phần trong gói (`items`: loại dịch vụ `itemType`: `COURT_HOURS`, `GYM_DAYS`, `PT_SESSIONS`, `GAMING_HOURS`; số lượng `quantity`).
    - Thời hạn sử dụng gói (`validDays`, ví dụ 30 ngày, 90 ngày).
    - Kênh bán: `ONLINE`, `POS`, `ALL`.
  - `F15.5`: Mua và Khấu trừ Gói Combo (`UserPackage`):
    - Mua gói: Thanh toán qua Tiền mặt, VietQR hoặc Ví nội bộ.
    - **Bất biến SPEC Rule 3**: Gói combo chứa thành phần ngoài danh mục ví (như Gym, PT) thì **tuyệt đối không được** thanh toán bằng ví nội bộ (`WALLET_PAYMENT_FORBIDDEN_FOR_COMBO`).
    - Khởi tạo số dư gói cho khách hàng theo từng thành phần (`remainingItems`).
    - Khấu trừ số lượng gói (`deductPackageItem`) khi khách đặt sân hoặc điểm danh học tập/tập gym thay vì trả tiền.
  - `F15.6`: Theo dõi vòng đời và báo cáo:
    - Trạng thái: `ACTIVE`, `EXPIRED`, `DEPLETED` (đã dùng hết).
    - Thống kê lượt dùng voucher, tổng tiền chiết khấu, doanh thu bán gói combo.

## 2. Bất biến liên quan (từ rule 00-invariants & SPEC 3.6/M15)
1. **Mỗi đơn dùng tối đa 1 voucher (SPEC Rule 1)**:
   Không được cộng dồn nhiều voucher trên cùng một đơn hàng hoặc lượt đặt chỗ.
2. **Tiêu voucher khi thanh toán thành công & hoàn khi hủy (SPEC Rule 2)**:
   Voucher được ghi nhận "tiêu" (`VoucherUsage`) khi đơn thanh toán thành công; nếu đơn hủy hợp lệ thì phục hồi lại lượt sử dụng cho khách.
3. **Cấm thanh toán ví cho combo chứa dịch vụ ngoài danh mục ví (SPEC Rule 3)**:
   Nếu gói combo chứa thành phần ngoài danh mục ví (ví dụ chứa thẻ gym hoặc buổi PT), hệ thống bắt buộc từ chối thanh toán bằng Ví nội bộ (`WALLET_PAYMENT_FORBIDDEN_FOR_COMBO`).
4. **Tiền nguyên VND an toàn**: Toàn bộ giá trị chiết khấu, đơn giá, số tiền giảm và giá gói combo phải là số nguyên VND (`Number.isSafeInteger`).

## 3. Hợp đồng API (packages/contracts)
| Method | Path | Request | Response | Lỗi (`code`) |
|---|---|---|---|---|
| GET | `/api/v1/promotions/vouchers` | `{ scope, channel }` | `VoucherListResponse` | None |
| POST | `/api/v1/promotions/vouchers/validate` | `ValidateVoucherDto` | `ValidateVoucherResult` | `VOUCHER_NOT_FOUND`, `VOUCHER_EXPIRED`, `MIN_ORDER_NOT_MET` |
| GET | `/api/v1/promotions/combos` | `{ channel }` | `ComboPackageListResponse` | None |
| GET | `/api/v1/promotions/combos/:id` | None | `ComboPackageDetail` | `COMBO_NOT_FOUND` |
| POST | `/api/v1/promotions/combos/purchase` | `PurchaseComboDto` | `UserPackageDetail` | `WALLET_PAYMENT_FORBIDDEN_FOR_COMBO`, `INSUFFICIENT_BALANCE` |
| GET | `/api/v1/promotions/my-packages` | None | `UserPackageListResponse` | None |
| POST | `/api/v1/promotions/my-packages/deduct` | `DeductPackageItemDto` | `UserPackageDetail` | `PACKAGE_EXPIRED`, `INSUFFICIENT_PACKAGE_BALANCE` |
| POST | `/api/v1/admin/promotions/vouchers` | `CreateVoucherDto` | `VoucherDetail` | `VOUCHER_CODE_EXISTS` |
| PATCH | `/api/v1/admin/promotions/vouchers/:id` | `UpdateVoucherDto` | `VoucherDetail` | `VOUCHER_NOT_FOUND` |
| POST | `/api/v1/admin/promotions/combos` | `CreateComboPackageDto` | `ComboPackageDetail` | None |
| PATCH | `/api/v1/admin/promotions/combos/:id` | `UpdateComboPackageDto` | `ComboPackageDetail` | `COMBO_NOT_FOUND` |
| GET | `/api/v1/admin/promotions/reports` | `{ fromDate, toDate }` | `PromotionReportResponse` | None |

## 4. Kiểm thử & Nghiệm thu (Đã hoàn thành 100%)
- **Trạng thái**: Hoàn thành toàn diện (100%).
- **Kiểm thử đơn vị & tích hợp**:
  - `voucher.service.spec.ts`: 13/13 tests passed (tạo, cập nhật, thẩm định thời hạn, scope, channel, min order, trần chiết khấu percent/fixed, tiêu voucher và rollback).
  - `combo-package.service.spec.ts`: 11/11 tests passed (tạo, cập nhật, bất biến cấm thanh toán ví cho combo chứa Gym/PT, khấu trừ từng thành phần, tự động chuyển DEPLETED, báo cáo khuyến mãi).
  - `voucher.race.spec.ts`: 1/1 concurrency race test passed (20 khách hàng tranh 1 suất voucher cuối cùng -> đúng 1 người thành công, 19 người bị từ chối `VOUCHER_USAGE_LIMIT_EXCEEDED`, `usedCount = 100`).
- **Monorepo Suite**: Toàn bộ 35 test suites, 207 tests passed 100%. `turbo run typecheck build` 0 errors.

