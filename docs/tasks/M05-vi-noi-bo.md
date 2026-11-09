# Kế hoạch triển khai: M05 Ví nội bộ & Sổ cái kế toán kép (Internal Wallet & Double-Entry Ledger)

Người phụ trách: T2 (Backend Thanh toán và Tài chính, Epic E08, M07 trong kế hoạch) · Giai đoạn: GĐ3 · Ngày công ước lượng (kế hoạch 8.2): 30 ngày công

## 1. Phạm vi
- **Làm:**
  - `F05.1`: Quản lý ví khách hàng: mỗi tài khoản người dùng có 1 ví duy nhất (`wallets { userId, balance, held, version }`).
  - `F05.2`: Sổ cái kế toán bất biến (`wallet_ledger`): Chỉ ghi thêm (Append-only), cấm sửa đè hoặc xóa.
  - `F05.3`: Nạp tiền vào ví (`TOPUP`): Nạp tại quầy (tiền mặt/chuyển khoản) hoặc qua cổng thanh toán (webhook M07 mock). Kiểm tra hạn mức nạp tối thiểu (20.000 đ) và số dư tối đa (50.000.000 đ).
  - `F05.4`: Trừ tiền thanh toán dịch vụ (`SPEND`): Thanh toán tiền cọc đặt sân (M04), canteen (M06), giờ chơi net (M09). Kiểm tra danh mục hợp lệ (`wallet.allowedCategories`: COURT, GAME_TIME, GAME_ROOM, CANTEEN, RENTAL).
  - `F05.5`: Tạm giữ và quyết toán phiên gaming (`HOLD`, `RELEASE`, `SETTLE`):
    - `HOLD`: Chuyển tiền từ `balance` sang `held` khi mở máy chơi net.
    - `RELEASE`: Hoàn trả tiền tạm giữ còn thừa từ `held` về `balance`.
    - `SETTLE`: Quyết toán trừ tiền giờ chơi từ `held` sang doanh thu.
  - `F05.6`: Hoàn tiền vào ví (`REFUND`): Hủy sân trước 24h, hoàn tiền khi slot mất.
  - `F05.7`: Điều chỉnh số dư thủ công (`ADJUST`): Chỉ Admin/Quản lý có quyền, bắt buộc có lý do và ghi `audit_logs`.
  - `F05.8`: Yêu cầu rút tiền ví (`WITHDRAW`): Khách yêu cầu rút tiền tại quầy, quản lý phê duyệt và chi tiền.
  - `F05.9`: Đối soát sổ cái (Reconciliation): Hàm kiểm tra tính toàn vẹn `balance + held = Σ ledger.amount`.
- **Hoãn / phụ thuộc module sau:**
  - Tích hợp quét mã QR VietQR động (chờ M07 Cổng thanh toán).

## 2. Bất biến liên quan (từ rule 00-invariants & skill wallet-ledger)
1. **Sổ cái bất biến (Append-only)**: Không bao giờ sửa đè hoặc xóa dòng sổ cái. Bút toán sai bắt buộc tạo bút toán điều chỉnh (`ADJUST`).
2. **Nguyên tắc kế toán kép & Số nguyên an toàn**: Tiền tệ luôn là số nguyên VND (`Number.isSafeInteger`).
3. **Chống chi tiêu quá mức (Negative Balance Prevention)**: Số dư ví không bao giờ âm. Trừ tiền thực hiện bằng atomic operation `findOneAndUpdate({ userId, balance: { $gte: amount } }, { $inc: { balance: -amount } })` trong MongoDB Transaction.
4. **Idempotency tuyệt đối**: Mỗi giao dịch sổ cái có `idempotencyKey` duy nhất. Gửi trùng key trả về kết quả cũ an toàn.
5. **Bảo tồn số dư**: `balance ≥ 0`, `held ≥ 0` và `balance + held = Σ ledger.amount`.

## 3. Hợp đồng API (packages/contracts)
| Method | Path | Request | Response | Lỗi (`code`) |
|---|---|---|---|---|
| GET | `/api/v1/wallets/me` | None | `WalletDetail` | None |
| GET | `/api/v1/wallets/me/transactions` | `{ page, limit, type }` | `WalletTransactionList` | None |
| POST | `/api/v1/wallets/topup` | `TopupWalletRequest` | `WalletTransactionDetail` | `MIN_TOPUP_VIOLATION`, `MAX_BALANCE_EXCEEDED` |
| POST | `/api/v1/wallets/pay` | `WalletPayRequest` | `WalletTransactionDetail` | `INSUFFICIENT_BALANCE`, `CATEGORY_NOT_ALLOWED` |
| POST | `/api/v1/wallets/hold` | `WalletHoldRequest` | `WalletTransactionDetail` | `INSUFFICIENT_BALANCE` |
| POST | `/api/v1/wallets/release` | `WalletReleaseRequest` | `WalletTransactionDetail` | `INSUFFICIENT_HELD` |
| POST | `/api/v1/wallets/settle` | `WalletSettleRequest` | `WalletTransactionDetail` | `INVALID_SETTLE_AMOUNT` |
| POST | `/api/v1/admin/wallets/:userId/adjust` | `AdjustWalletRequest` | `WalletTransactionDetail` | `FORBIDDEN`, `REASON_REQUIRED` |
| GET | `/api/v1/admin/wallets/:userId/reconcile` | None | `ReconciliationResult` | `FORBIDDEN` |

## 4. Cấu trúc CSDL
- **Collection `wallets`:**
  - `_id`: ObjectId
  - `userId`: ObjectId (Unique)
  - `balance`: number (Integer VND, >= 0)
  - `held`: number (Integer VND, >= 0)
  - `version`: number
- **Collection `wallet_ledger`:**
  - `_id`: ObjectId
  - `walletId`: ObjectId (index)
  - `userId`: ObjectId (index)
  - `type`: WalletTxnType (`TOPUP`, `SPEND`, `REFUND`, `ADJUST`, `WITHDRAW`, `HOLD`, `RELEASE`, `SETTLE`)
  - `amount`: number (Integer VND, biến động trên balance)
  - `heldDelta`: number (Integer VND, biến động trên held)
  - `balanceAfter`: number
  - `heldAfter`: number
  - `category`?: WalletCategory (`COURT`, `GAME_TIME`, `GAME_ROOM`, `CANTEEN`, `RENTAL`)
  - `refType`: string (`BOOKING`, `GAMING_SESSION`, `ORDER`, `MANUAL`)
  - `refId`: string
  - `idempotencyKey`: string (Unique index)
  - `note`?: string
  - `actorId`?: string
  - `createdAt`: Date

## 5. Kế hoạch thực hiện (thứ tự từng bước)
- [x] 1. Thêm Zod schemas & hợp đồng API cho Wallet trong `packages/contracts/src/wallet.ts`.
- [x] 2. Tạo Mongoose schemas và Unique indexes: `WalletSchema`, `WalletLedgerSchema`.
- [x] 3. Xây dựng `WalletService`:
  - `getOrCreateWallet(userId)`
  - `topup(userId, dto, actorId)`
  - `pay(userId, dto, actorId)`
  - `hold(userId, dto, actorId)`
  - `release(userId, dto, actorId)`
  - `settle(userId, dto, actorId)`
  - `refund(userId, dto, actorId)`
  - `adjust(userId, dto, actorId)`
  - `reconcile(userId)` (Kiểm tra đối soát `balance + held = Σ ledger.amount`)
- [x] 4. Xây dựng Controllers: `WalletsController`, `AdminWalletsController`.
- [x] 5. Đăng ký `WalletModule` vào `app.module.ts`.
- [x] 6. Viết Unit & Concurrency Tests:
  - Nạp tiền, trừ tiền, số dư cập nhật chuẩn xác.
  - Chống số dư âm: trừ vượt số dư bị từ chối `INSUFFICIENT_BALANCE`.
  - Kiểm tra tính bất biến `balance + held = Σ ledger.amount`.
  - Idempotency test: Gửi trùng `idempotencyKey` nhiều lần song song chỉ thực hiện đúng 1 lần.
  - Concurrency test (T07): 20 giao dịch trừ tiền đồng thời trên cùng một ví.
- [x] 7. Chạy kiểm thử toàn bộ monorepo (`typecheck`, `test`, `build`).
