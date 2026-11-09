---
name: nestjs-module-scaffold
description: Tạo khung một module NestJS mới của dự án (module, controller, service, repository, schema, dto, events, tests) đúng quy ước ranh giới module. Dùng khi cần thêm module backend như booking, wallet, gym-access, gaming, pos, tournament, hoặc khi người dùng nói "tạo module", "scaffold module".
---

# nestjs-module-scaffold

## Khi nào dùng
Mỗi lần thêm một module backend mới trong `apps/api/src/modules/`.

## Cách dùng
Script là hộp đen: chạy `--dry-run` trước, **đừng đọc mã nguồn script** trừ khi lỗi.

```bash
node .agents/skills/nestjs-module-scaffold/scripts/scaffold-module.mjs <ten-kebab-case> --dry-run
node .agents/skills/nestjs-module-scaffold/scripts/scaffold-module.mjs <ten-kebab-case>
```

Tên module khớp mục 3.4 của spec: `auth`, `facility`, `booking`, `payment`, `wallet`, `invoice`, `notification`, `membership`, `staff`, `pos`, `rental`, `gaming`, `promotion`, `tournament`, `report`, `audit`, `realtime`. Module mới ngoài danh sách → hỏi trước, viết ADR.

## Sau khi tạo (checklist)
1. Import `<Pascal>Module` vào `AppModule`.
2. Điền schema theo mục 5 của spec; **khai báo chỉ mục (nhất là unique) ngay trong schema**. Tiền là số nguyên; thêm validator `Number.isSafeInteger`.
3. Chỉ export **service công khai** trong `index.ts`. Cấm export repository/schema ra ngoài module.
4. Thêm quy tắc ESLint `boundaries` cho module nếu chưa có (module khác chỉ import `index.ts`).
5. Repository nhận `session?: ClientSession`; service mở transaction cho thao tác chạm nhiều collection (mục 5.5 spec).
6. Controller: DTO zod từ `packages/contracts`, guard quyền, interceptor `Idempotency-Key` cho thao tác tiền/đặt chỗ.
7. Ghi `audit_logs` cho thao tác nhạy cảm (rule `00-invariants`).
8. Viết test: `tests/<ten>.service.spec.ts`; module tiền/đặt chỗ thêm `<ten>.race.spec.ts` (skill `concurrency-test-kit`).
9. Cập nhật `packages/contracts` trước khi viết endpoint (skill `openapi-contract-first`).

## Mẫu tham khảo
Xem `resources/conventions.md` cho quy ước đặt tên, lỗi domain và cấu trúc thư mục chi tiết.
