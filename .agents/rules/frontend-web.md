---
trigger: glob
globs: "apps/web/**, apps/admin/**, apps/pos/**, packages/ui/**"
description: Quy ước giao diện web (Next.js khách, quản trị, POS PWA): dữ liệu, trạng thái, lỗi, hiệu năng, trợ năng.
---

# Frontend web (khách, quản trị, POS)

- **Gọi API chỉ qua client sinh từ `packages/contracts`** (không viết tay `fetch` tới endpoint nghiệp vụ, không khai báo lại kiểu). Đổi API → đổi contract trước.
- **Không tính tiền ở client.** Hiển thị số tiền do server trả; khi cần "ước tính", gọi endpoint báo giá của server.
- Trạng thái thời gian thực (lịch trống, số người gym, sơ đồ máy gaming) qua WebSocket; luôn có phương án dự phòng làm mới định kỳ khi mất kết nối và hiển thị trạng thái kết nối.
- Mọi thao tác ghi gửi `Idempotency-Key` (sinh một lần cho mỗi ý định của người dùng, giữ nguyên khi thử lại). Nút gửi bị vô hiệu hóa khi đang xử lý.
- Hiển thị lỗi theo `code` của `problem+json` bằng bảng ánh xạ sang tiếng Việt (`packages/shared/errors-vi`); không hiện thông báo kỹ thuật thô.
- **POS**: dùng được bằng bàn phím/máy quét mã vạch, tương tác nhanh, chữ lớn, hoạt động ổn khi mạng chập chờn (báo rõ trạng thái, không mất dữ liệu đang nhập). Hành động hủy/hoàn cần PIN quản lý.
- **Trang quản trị**: bảng dữ liệu có phân trang/lọc phía server; thao tác nhạy cảm có hộp thoại xác nhận và nhập lý do; phân quyền ẩn/hiện chỉ để thuận tiện, không thay cho kiểm tra ở backend.
- Trợ năng: nhãn cho mọi điều khiển, thao tác bằng bàn phím, tương phản đủ, thông báo lỗi gắn với trường.
- Hiệu năng: tách mã theo route, không tải thư viện lớn cho trang đơn giản; ảnh có kích thước cố định; báo cáo nặng tải theo yêu cầu.
- Test: logic có test đơn vị; luồng chính (đặt sân, thanh toán, mua thẻ gym, bán hàng POS) có Playwright.
