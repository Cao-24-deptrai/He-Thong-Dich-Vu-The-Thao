# 20 kịch bản bắt buộc trước go-live (mục 9.2 của docs/SPEC.md)

| Mã | Kịch bản | Tiêu chí đạt | Skill liên quan |
|---|---|---|---|
| T01 | 200 yêu cầu đặt cùng một ô cùng lúc | Đúng 1 thành công, 199 báo trùng, không bản ghi hỏng | court-booking-engine |
| T02 | Đặt sân 11, rồi sân 7 và sân 5 cùng khung giờ trong cụm | Các lần sau bị từ chối đúng | court-booking-engine |
| T03 | Đặt sân 5 rồi đặt sân 11 chứa nó | Sân 11 bị từ chối | court-booking-engine |
| T04 | Webhook thanh toán gửi lặp 10 lần | Xác nhận một lần, số dư/đơn đúng | payment-provider-integration |
| T05 | Chuyển khoản sau khi giữ chỗ hết hạn | Ô trống → xác nhận; đã mất → hoàn ví + báo khách | payment-provider-integration |
| T06 | Chuyển khoản sai số tiền | `MISMATCH`, không tự xác nhận | payment-provider-integration |
| T07 | 1.000 thao tác trừ ví đồng thời trên một ví | Số dư cuối khớp tổng sổ cái, không âm | wallet-ledger |
| T08 | Hủy trước 24 giờ và sau 24 giờ | Hoàn 100% và 0 đồng theo chính sách | court-booking-engine |
| T09 | 150 người quét vào gym khi có 90 người | Đúng 10 người vào, bộ đếm 100 | gym-membership-access |
| T10 | Ngắt mạng cửa gym 10 phút | Thành viên hợp lệ vẫn vào, đồng bộ lại đúng | gym-membership-access |
| T11 | Ngắt mạng máy gaming đang chơi 10 phút rồi nối lại | Số tiền khớp từng phút, không âm | gaming-session-billing |
| T12 | Rút điện đột ngột một máy gaming | Phiên kết thúc theo heartbeat cuối, không tính thừa | gaming-session-billing |
| T13 | Một tài khoản đăng nhập 2 máy gaming | Lần hai bị từ chối | gaming-session-billing |
| T14 | Nâng cấp thẻ gym giữa chừng | Tiền chênh lệch và ngày hiệu lực đúng công thức | gym-membership-access |
| T15 | Quản lý khóa sân trùng nhiều lượt đã đặt | Danh sách ảnh hưởng đúng, không lượt nào tự mất | court-booking-engine |
| T16 | Bán hàng khi chưa mở ca; chốt ca có chênh lệch | Bị chặn; chênh lệch hiển thị đúng | pos-inventory-shift |
| T17 | Thu ngân gọi API doanh thu tổng | 403 | security-review |
| T18 | Khôi phục cơ sở dữ liệu từ sao lưu | Đúng trong RTO 4 giờ, mất dữ liệu trong RPO 15 phút | (vận hành) |
| T19 | 500 người dùng đồng thời + 70 máy gaming | p95 trong mục tiêu, không lỗi dây chuyền | k6 |
| T20 | Mỗi đơn đã thanh toán có hóa đơn điện tử | Báo cáo R8 không còn đơn thiếu hóa đơn | einvoice-adapter |
