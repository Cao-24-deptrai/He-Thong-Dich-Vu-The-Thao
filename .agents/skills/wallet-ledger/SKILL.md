---
name: wallet-ledger
description: Triển khai ví nội bộ và sổ cái bất biến (nạp, trừ, hoàn, điều chỉnh, rút, tạm giữ cho gaming), đảm bảo số dư không âm, idempotency và đối soát. Dùng khi làm module wallet/M07, trừ tiền ví khi đặt sân/canteen/thuê dụng cụ/giờ chơi, hoàn tiền vào ví, rút ví.
---

# wallet-ledger

Đọc trước: spec **M07**, **5.2 nhóm C**, **5.3** (`wallets`, `wallet_ledger`), **5.5**, và rule `00-invariants` (mục Ví nội bộ).

## Mô hình
- `wallets { userId (unique), balance, held, version }` và `wallet_ledger` **chỉ ghi thêm**.
- Mỗi dòng sổ cái: `type` (`TOPUP|SPEND|REFUND|ADJUST|WITHDRAW|HOLD|RELEASE`), `amount` (ảnh hưởng lên **balance + held**, có dấu), `heldDelta`, `balanceAfter`, `heldAfter`, `refType/refId`, `idempotencyKey` **unique**.
  (`heldDelta`/`heldAfter` là mở rộng tương thích để đối soát phần tạm giữ — ghi vào `docs/` khi triển khai.)
- **Bất biến đối soát**: `balance ≥ 0`, `held ≥ 0`, và `balance + held = Σ ledger.amount` cho mỗi ví. Job hằng ngày kiểm tra; chênh lệch → cảnh báo chủ và Tech Lead.

| Thao tác | amount | heldDelta | Ghi chú |
|---|---:|---:|---|
| TOPUP | +n | 0 | Nạp qua QR/ví điện tử/tiền mặt tại quầy; luôn OTP (A12) |
| SPEND | −n | 0 | Chỉ danh mục cho phép |
| REFUND | +n | 0 | Hủy sân, hủy lớp, thanh toán muộn thất bại |
| ADJUST | ±n | 0 | Quản lý, **bắt buộc lý do**, ghi audit |
| WITHDRAW | −n | 0 | Quản lý duyệt, có OTP (A05) |
| HOLD | 0 | +n | balance → held (gaming) |
| RELEASE | 0 | −n | held → balance |
| SPEND từ held | −cost | −held | settle phiên gaming |

## Cách làm đúng (xem `resources/wallet.service.example.ts`)
1. Mọi thay đổi chạy trong **transaction**; ghi ví + sổ cái cùng lúc.
2. Trừ tiền bằng `findOneAndUpdate({userId, balance: {$gte: n}}, {$inc: {...}})`. **Không** đọc số dư rồi ghi lại.
3. `idempotencyKey` unique. Trùng key → trả kết quả cũ (đã có) hoặc để transaction thất bại và trả `IDEMPOTENT_REPLAY`.
4. Kiểm tra danh mục: lấy `wallet.allowedCategories` từ `settings`. Nếu đơn có dòng không thuộc danh mục thì **phần đó** phải trả bằng phương thức khác (thanh toán hỗn hợp).
5. Hạn mức: nạp tối thiểu 20.000 đ; nạp tại quầy tối đa 5.000.000 đ/lần (vượt cần quản lý duyệt); số dư tối đa 20.000.000 đ — đều từ `settings`.
6. Rút ví là **yêu cầu** (`PENDING → APPROVED → PAID | REJECTED`); chỉ khi chi trả mới ghi `WITHDRAW`. Rút cần OTP + quyền quản lý.
7. Điều chỉnh thủ công: quyền `wallet.adjust`, lý do bắt buộc, ghi `audit_logs` (trước/sau).
8. Thông báo biến động số dư qua outbox (không gửi trong transaction).

## Cạm bẫy
- Dùng số thực/`toFixed`; client gửi số tiền; trừ ví ngoài transaction.
- Sửa/xóa dòng sổ cái "cho khớp" — cấm. Sai thì thêm bút toán điều chỉnh.
- Quên cập nhật `held` khi quyết toán phiên gaming → số dư lệch.
- Cho ví trả thẻ gym/sản phẩm bán lẻ/lớp/PT/lệ phí giải (trái yêu cầu).

## Kiểm thử bắt buộc
- **T07**: 1.000 thao tác trừ ví đồng thời trên một ví → số dư cuối = đầu − Σ thành công, không âm, khớp tổng sổ cái.
- Gửi lặp cùng `idempotencyKey` 20 lần song song → đúng một lần trừ.
- Hold/settle: tổng `balance + held` bảo toàn; `cost > held` bị từ chối.
- Trừ cho danh mục không cho phép → `WALLET_CATEGORY_NOT_ALLOWED`.
Xem skill `concurrency-test-kit`.
