---
name: tournament-engine
description: Triển khai giải đấu thể thao và esports — tạo giải, đăng ký đội và lệ phí, bốc thăm, sinh sơ đồ nhánh (loại trực tiếp, vòng tròn, chia bảng rồi loại trực tiếp), xếp lịch trận gắn khóa sân/phòng/máy, nhập kết quả, bảng xếp hạng. Dùng khi làm module tournament/M16 hoặc trang giải đấu công khai.
---

# tournament-engine

Đọc trước: spec **M16**, **5.2 nhóm G**, giả định liên quan; skill `court-booking-engine` (khóa tài nguyên) và `payment-provider-integration` (lệ phí).

## Quy tắc
- Thể thức: **loại trực tiếp**, **vòng tròn**, **chia bảng rồi loại trực tiếp**. Thể thức và luật phân định thứ hạng **chốt trước khi mở đăng ký** và không đổi sau khi đóng đăng ký.
- Đăng ký: đội trưởng tạo đội, mời thành viên bằng số điện thoại (thành viên phải có tài khoản và chấp nhận). **Lệ phí không trả bằng ví nội bộ** (tiền mặt, QR, ví điện tử). Quản lý duyệt đội (hoặc tự duyệt khi đã thanh toán). Đội rút trước khi đóng đăng ký → hoàn lệ phí theo chính sách.
- Sơ đồ nhánh: dùng thuật toán thuần hàm trong `resources/bracket.example.ts` (`seedOrder`, `singleElimination`, `roundRobin`, `snakeGroups`); **viết test cho các hàm này** (2, 3, 5, 8, 13 đội; số lẻ; BYE chỉ cho hạt giống cao).
- **Xếp lịch gắn tài nguyên**: mỗi trận chiếm sân/phòng/máy qua cơ chế khóa (ô `BLOCKED` với lý do `TOURNAMENT`, `closures` loại `TOURNAMENT`) bằng chính engine đặt sân — **không** viết cơ chế khóa riêng. Trùng lượt đặt thường → cảnh báo, không tự hủy lượt của khách. Mỗi trận chỉ một tài nguyên tại một thời điểm.
- Kết quả: nhập bởi quản lý/thu ngân; thắng đi tiếp tự động vào `nextMatchId`; xử thắng/thua do bỏ cuộc (walkover), dời trận; **sửa kết quả đã nhập chỉ quản lý, có audit**. Luật phân định thứ hạng (điểm, hiệu số, đối đầu…) cấu hình theo giải.
- Trang giải công khai (web/app): nhánh đấu, lịch, kết quả realtime; thông báo cho đội khi có lịch/đổi lịch/kết quả (skill `notification-events`).
- **Esports** (mức ưu tiên Could): gán nhóm máy cho trận, bật chế độ giải trên Gaming client (khóa mọi thứ ngoài giải, ẩn giá), không trừ ví đội trong trận.

## Mô hình dữ liệu
`tournaments`, `teams` (nhúng `members`), `matches` (`round`, `teamAId`, `teamBId`, `resourceId`, `startAt`, `result`, `nextMatchId`). Chỉ mục: `(tournamentId, round)` trên `matches`; unique `(tournamentId, name)` trên `teams`.

## Cạm bẫy
- Tự viết lại khóa sân cho giải → xung đột với đặt thường.
- Đổi thể thức sau khi đã có đội đăng ký.
- Quên xử lý BYE ở vòng 1 làm nhánh lệch.
- Cho phép sửa kết quả mà không audit.

## Kiểm thử
Test thuần hàm cho thuật toán; giải thử 8 đội chạy hết đăng ký → thanh toán → bốc thăm → xếp lịch → kết quả → bảng xếp hạng; khóa tài nguyên trùng đặt thường; đăng ký quá số đội tối đa bị từ chối.
