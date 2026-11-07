---
name: concurrency-test-kit
description: Viết và chạy test tranh chấp (race condition) cho đặt sân, ví, thanh toán, bộ đếm gym, phiên gaming, cùng thử tải k6, theo 20 kịch bản bắt buộc T01–T20. Dùng khi chạm vào đặt chỗ/ví/thanh toán/gym/gaming, khi viết *.race.spec.ts, khi cần chạy pnpm test:race, hoặc chuẩn bị thử tải.
---

# concurrency-test-kit

Mục tiêu: chứng minh các bất biến trong rule `00-invariants` **đúng dưới tải đồng thời**, không chỉ ở luồng đơn.

## Nguyên tắc
1. **Môi trường thật**: MongoDB replica set + Redis thật (`resources/test-env.example.ts`). Gọi `mongoose.syncIndexes()` để unique index tồn tại. Không mock transaction/unique index/Lua.
2. Đặt tên `*.race.spec.ts`, chạy bằng `pnpm test:race` (cấu hình Jest riêng: `testTimeout` lớn, chạy tuần tự `--runInBand`).
3. Phát yêu cầu đồng thời bằng `Promise.allSettled`, rồi **khẳng định bất biến** (số thành công, số dư, số bản ghi, tổng sổ cái), không chỉ "không ném lỗi".
4. Dọn dữ liệu và Redis trước mỗi test; dùng đồng hồ giả cho hạn giữ chỗ/heartbeat, không `sleep` thật.
5. Luôn có cặp test: **"Redis còn"** và **"Redis mất khóa giữa chừng"** (`redis.flushall()`), để chứng minh MongoDB mới là chốt chặn cuối.
6. Test không ổn định (flaky) là **lỗi cần sửa gốc**, không phải thêm retry hay nới ràng buộc.

## 20 kịch bản
Xem `resources/scenarios-T01-T20.md` (kèm skill phụ trách). Mỗi kịch bản có test tự động tương ứng trước go-live.

## Mẫu
- `resources/booking.race.spec.example.ts`: T01, T01b (mất Redis), T02, T03.
- `resources/k6-booking.example.js`: thử tải 500 người dùng đồng thời (T19), ngưỡng p95 theo mục 3.9 của spec; chấp nhận `409 SLOT_TAKEN` là kết quả hợp lệ.

## Khuôn khẳng định bất biến theo miền
| Miền | Khẳng định sau khi chạy đồng thời |
|---|---|
| Đặt sân | Số booking thành công = số lần ô được ghi; không ô `HELD/CONFIRMED` mồ côi; mọi booking `CONFIRMED` có đủ ô |
| Ví | `balance ≥ 0`; `balance + held = Σ ledger.amount`; số lần trừ thành công × số tiền = chênh lệch số dư |
| Thanh toán | Mỗi `providerTxnId` đúng một lần xác nhận; tổng tiền order = tổng payment thành công |
| Gym | `ZCARD gym:inside ≤ capacity`; số người vào thành công = capacity − số người ban đầu |
| Gaming | Một phiên `ACTIVE` mỗi tài khoản; `balance + held` bảo toàn qua hold/settle; sự kiện lặp cùng `eventId` chỉ tính một lần |

## Thử tải (T19)
Chạy trên **staging** gần giống production, không chạy trên production. Ngưỡng: availability p95 < 400 ms, đặt sân p95 < 800 ms, lỗi < 1% (không tính 409 hợp lệ). Ghi lại kết quả và điều chỉnh chỉ mục/bộ nhớ đệm nếu không đạt.

## Báo cáo
Cuối tác vụ nêu: test tranh chấp nào đã thêm/chạy, số lần lặp, kết quả, và (nếu có) test chưa chạy được kèm lý do.
