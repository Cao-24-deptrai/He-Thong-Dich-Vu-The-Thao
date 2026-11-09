---
trigger: always_on
description: Quy trình làm việc bắt buộc của agent trên dự án này: đọc spec đúng phần, lập kế hoạch, hỏi khi mơ hồ, test, báo cáo.
---

# Cách làm việc

1. **Đọc đúng phần spec, không đọc cả file.** Lấy module cần làm từ `docs/SPEC.md` (skill `spec-to-tasks`). Đọc thêm mục 3 (kiến trúc) và mục 5 (dữ liệu) chỉ phần liên quan.
2. **Lập kế hoạch trước khi viết mã**, nhất là với module chạm vào tiền, đặt chỗ, ví, gym, gaming, thanh toán: nêu file sẽ đổi, bất biến liên quan, test sẽ viết. Chờ người dùng đồng ý với kế hoạch của các module này.
3. **Gặp giả định A01–A22 chưa được xác nhận** (xem mục 2 của spec) → dùng giá trị mặc định đã ghi trong spec, đưa vào `settings`, và **nói rõ** trong báo cáo cuối. Mâu thuẫn hoặc thiếu thông tin thật sự → dừng và hỏi.
4. **Một việc một lần.** Mỗi thay đổi nhỏ, một mục đích, dễ review. Không refactor ngoài phạm vi, không "tiện tay" sửa module khác.
5. **Test đi cùng mã.** Logic tiền/đặt chỗ phải có test đơn vị + test tranh chấp (`*.race.spec.ts`). Xem rule `testing-and-dod`.
6. **Đối chiếu hợp đồng API**: sửa `packages/contracts` trước, sinh kiểu, rồi mới viết controller/giao diện (skill `openapi-contract-first`).
7. **Không tự thêm thư viện lớn** hoặc đổi stack. Cần thì đề xuất kèm lý do; quyết định lớn ghi ADR.
8. **Không bao giờ** commit bí mật (khóa API, token, chuỗi kết nối). Dùng biến môi trường + `.env.example`.
9. **Dừng và báo** nếu lệnh có thể phá dữ liệu (xóa collection, reset DB, force push). Không chạy trên môi trường thật.
10. **Báo cáo cuối mỗi tác vụ** gồm: đã làm gì, đã chạy lệnh nào và kết quả, giả định đã dùng, việc còn lại/rủi ro. Nói thật khi chưa chạy được test.

Ngôn ngữ: mã, tên biến, commit bằng tiếng Anh; chuỗi giao diện và tài liệu cho người dùng bằng tiếng Việt; trao đổi với người dùng bằng tiếng Việt.
