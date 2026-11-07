---
trigger: model_decision
description: Áp dụng khi viết test, hoàn thành một tác vụ, chuẩn bị PR hoặc khi cần biết thế nào là "xong" (Definition of Done) và test tranh chấp bắt buộc.
---

# Kiểm thử và Definition of Done

## Một tác vụ chỉ "xong" khi
1. Mã đã được tự review, `pnpm lint` và `pnpm typecheck` sạch.
2. Có test đơn vị cho logic; test tích hợp cho endpoint ghi; **test tranh chấp** nếu chạm vào đặt chỗ, ví, thanh toán, bộ đếm gym, phiên gaming.
3. `packages/contracts` đã cập nhật và kiểu đã sinh lại (`pnpm contracts:gen`) nếu đổi API.
4. Tài liệu/ADR đã cập nhật nếu đổi hành vi hoặc quyết định.
5. Báo cáo cuối nêu rõ đã chạy lệnh nào, kết quả, giả định đã dùng.

## Test tranh chấp bắt buộc (xem skill `concurrency-test-kit`)
Đặt trùng (T01–T03), webhook lặp (T04), thanh toán muộn (T05), lệch số tiền (T06), ví đồng thời (T07), hủy đúng/sai mốc (T08), bộ đếm gym (T09), offline cửa gym (T10), offline gaming (T11–T13), nâng cấp thẻ (T14). Đặt tên `*.race.spec.ts`, chạy bằng `pnpm test:race`.

## Nguyên tắc
- Test chạy trên **MongoDB replica set và Redis thật** (container hoặc memory-server); không mock transaction/unique index.
- Không làm test "xanh" bằng cách nới ràng buộc, xóa unique index, hay tăng timeout vô tội vạ.
- Dữ liệu test độc lập, dọn sau mỗi test; thời gian dùng đồng hồ giả (fake timers), không `sleep` thật.
- Test mô tả hành vi bằng tiếng Anh ngắn, tên theo mẫu `should <behavior> when <condition>`.
