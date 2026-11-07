---
trigger: manual
description: Danh sách kiểm tra trước khi phát hành lên staging/production và trước go-live. Gọi bằng @release-checklist.
---

# Checklist phát hành

## Trước mỗi lần phát hành production
- [ ] CI xanh: lint, typecheck, test, test:race, quét bảo mật.
- [ ] Migration chạy thử trên bản sao dữ liệu staging, tương thích ngược, có kế hoạch quay lui.
- [ ] Không còn lỗi mức Nghiêm trọng/Cao mở.
- [ ] Biến môi trường/secrets mới đã có trên môi trường đích; `.env.example` cập nhật.
- [ ] Cổng thanh toán, hóa đơn điện tử, ZNS đang trỏ đúng môi trường (sandbox ≠ thật).
- [ ] Cảnh báo giám sát hoạt động; có người trực.

## Trước go-live (một lần)
- [ ] 20 kịch bản T01–T20 (mục 9.2 của SPEC) đều đạt trên staging.
- [ ] Thử tải: 500 người dùng đồng thời + 70 máy gaming đạt p95 mục tiêu.
- [ ] Pentest bên thứ ba: không còn lỗ hổng mức cao.
- [ ] Đã **thử khôi phục** cơ sở dữ liệu từ sao lưu trong RTO 4 giờ, RPO 15 phút.
- [ ] Thử mất mạng 10 phút: Gaming client và cửa gym vẫn chạy đúng, đồng bộ lại khớp.
- [ ] Thử giao dịch tiền thật giá trị nhỏ qua từng phương thức (VietQR, MoMo, ZaloPay, VNPay) và hoàn tiền.
- [ ] Hóa đơn điện tử ở môi trường thật: mỗi đơn có hóa đơn; báo cáo R8 sạch.
- [ ] Đã đào tạo thu ngân, quản lý, PT; có hướng dẫn và runbook.
- [ ] App đã được duyệt trên App Store/Google Play.
- [ ] Rà soát pháp lý (A22): đồng ý dữ liệu, sinh trắc học, chính sách hoàn tiền hiển thị.
