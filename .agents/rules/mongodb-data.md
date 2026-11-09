---
trigger: glob
globs: "apps/api/**/schemas/**, apps/api/**/*.schema.ts, apps/api/**/*.repository.ts, apps/api/**/migrations/**"
description: Quy ước MongoDB: schema, chỉ mục, transaction, truy vấn an toàn, migration.
---

# MongoDB

- Chạy **replica set** (kể cả ở dev/test) vì cần transaction nhiều tài liệu. Xem danh sách thao tác bắt buộc dùng transaction ở mục 5.5 của `docs/SPEC.md`.
- Mỗi collection có `createdAt`, `updatedAt`; collection hay bị sửa đồng thời có thêm `version` (khóa lạc quan: `updateOne({_id, version}, {$inc:{version:1}, ...})`, `matchedCount===0` → xung đột).
- **Chỉ mục là một phần của schema**: khai báo cùng schema, kiểm thử bằng test "index tồn tại". Các unique index chống trùng (xem mục 5.4 spec) là **bất biến**, không được xóa/nới lỏng để "cho test qua".
- Tiền: validator `Number.isSafeInteger` + `min: 0` (trừ khi là bút toán điều chỉnh có dấu, ghi rõ). Không dùng `Decimal128`.
- Tham chiếu bằng `ObjectId`; nhúng chỉ khi dữ liệu nhỏ, đi cùng cha, không truy vấn riêng (dòng đơn hàng, thành viên đội).
- **Truy vấn**: luôn có điều kiện dùng được chỉ mục; mọi `find` danh sách có `limit` + phân trang theo con trỏ; không `find({})` không giới hạn; tránh `$where`/`$regex` không neo.
- Không dùng `updateOne` read-modify-write ở tầng ứng dụng cho số dư/bộ đếm: dùng toán tử nguyên tử (`$inc`) kèm điều kiện.
- TTL index cho dữ liệu tạm (`otp_challenges`, `idempotency_keys`).
- **Migration**: file đánh số, chạy được nhiều lần (idempotent), tương thích ngược (thêm trường/chỉ mục trước, bỏ sau). Tạo index trên collection lớn dùng chế độ nền, không khóa ghi.
- Không dùng dữ liệu thật trong test; seed từ `apps/api/test/seed`.
