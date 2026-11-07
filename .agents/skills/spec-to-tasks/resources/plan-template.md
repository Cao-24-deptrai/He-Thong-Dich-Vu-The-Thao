# Kế hoạch triển khai: <Mxx tên module>

Người phụ trách: <Tn> · Giai đoạn: <GĐ> · Ngày công ước lượng (spec 8.2): <n>

## 1. Phạm vi
- Làm: F__, F__, ...
- Hoãn (lý do): ...

## 2. Bất biến liên quan
<trích các mục từ rule 00-invariants áp dụng cho module này>

## 3. Giả định đang dùng (cần xác nhận)
| Mã | Giá trị mặc định đang dùng | Khóa `settings` | Đã xác nhận? |
|---|---|---|---|

## 4. Hợp đồng API (packages/contracts)
| Method | Path | Request | Response | Lỗi (`code`) |
|---|---|---|---|---|

## 5. Dữ liệu
- Collection mới/đổi: ...
- Chỉ mục (đặc biệt **unique**): ...
- Thao tác cần transaction: ...
- Migration: ...

## 6. Nghiệp vụ và ngoại lệ
<danh sách rút từ spec, không thêm bịa>

## 7. Việc cần làm (theo thứ tự)
- [ ] Contract OpenAPI + sinh kiểu
- [ ] Schema + index
- [ ] Repository (nhận `session`)
- [ ] Service (mở transaction, áp bất biến)
- [ ] Controller + guard quyền + audit
- [ ] Test đơn vị / tích hợp / tranh chấp (`*.race.spec.ts`)
- [ ] Giao diện (web/app/POS/admin) nếu thuộc phạm vi
- [ ] Cập nhật tài liệu/ADR

## 8. Tiêu chí nghiệm thu
<copy nguyên từ spec> + kịch bản T__ liên quan

## 9. Rủi ro / câu hỏi mở
