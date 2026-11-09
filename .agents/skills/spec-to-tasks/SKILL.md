---
name: spec-to-tasks
description: Biến một module trong docs/SPEC.md (M02–M22) thành kế hoạch triển khai và danh sách việc có tiêu chí nghiệm thu. Dùng khi bắt đầu làm một module/tính năng mới, khi người dùng nói "làm module M04", "triển khai đặt sân", "lập kế hoạch cho ví", hoặc khi cần tra giả định A01–A22.
---

# spec-to-tasks

Mục tiêu: không bao giờ đọc cả `docs/SPEC.md` (rất dài). Lấy **đúng phần cần**, lập kế hoạch, rồi mới viết mã.

## Quy trình

1. **Lấy phần spec** bằng script (chạy từ gốc kho; xem `--help`-style ở đầu file nếu cần):
   ```bash
   node .agents/skills/spec-to-tasks/scripts/spec-section.mjs M04        # đặc tả module
   node .agents/skills/spec-to-tasks/scripts/spec-section.mjs "3.6"      # kiến trúc liên quan
   node .agents/skills/spec-to-tasks/scripts/spec-section.mjs A02        # tra một giả định
   node .agents/skills/spec-to-tasks/scripts/spec-section.mjs --list     # mục lục
   ```
   Luôn lấy thêm: mục 5.3–5.5 (collection, chỉ mục, transaction) của các collection module đụng tới, và **bảng ngày công** ở mục 8.2 để biết quy mô.

2. **Xác định ngữ cảnh**: module phụ thuộc module nào (xem mục 3.4 "Các module backend"), giai đoạn nào (mục 7), người phụ trách (mục 8.2). Nếu module phụ thuộc chưa có, nói rõ và đề xuất thứ tự.

3. **Liệt kê giả định liên quan** (A01–A22). Với mỗi giả định chưa xác nhận: ghi giá trị mặc định sẽ dùng, đưa nó vào `settings`, và đánh dấu để hỏi người dùng. Mâu thuẫn hoặc thiếu thông tin thực sự → **hỏi trước khi làm**.

4. **Soạn kế hoạch** theo mẫu `resources/plan-template.md`, lưu vào `docs/tasks/<module>.md`:
   - Phạm vi (chức năng F-xx nào làm, cái nào hoãn) và bất biến liên quan (rule `00-invariants`).
   - Hợp đồng API cần thêm/sửa (`packages/contracts`).
   - Thay đổi dữ liệu: collection, chỉ mục unique, migration.
   - Nghiệp vụ chính + trường hợp ngoại lệ (lấy từ spec, không bịa thêm).
   - Danh sách việc nhỏ theo thứ tự: contract → schema/index → repository → service → controller → test → giao diện.
   - Tiêu chí nghiệm thu: **copy nguyên** từ phần "Nghiệp thu" của module trong spec, kèm các kịch bản T01–T20 liên quan.
   - Rủi ro, câu hỏi mở.

5. **Dừng và xin người dùng duyệt kế hoạch** với module chạm vào tiền, đặt chỗ, ví, thanh toán, gym, gaming. Module khác có thể bắt đầu ngay nếu không còn câu hỏi mở.

6. Khi triển khai, mỗi việc nhỏ là một thay đổi riêng, tick vào kế hoạch khi xong.

## Chú ý
- Spec là nguồn sự thật. Nếu code hiện có khác spec, **báo sự khác biệt**, đừng âm thầm chọn một bên.
- Ưu tiên M/S/C trong spec cho biết cái gì cắt được nếu chậm tiến độ; đừng tự cắt mà không báo.
- Kế hoạch ngắn gọn, cụ thể, kiểm chứng được. Không viết lại cả spec vào kế hoạch.
