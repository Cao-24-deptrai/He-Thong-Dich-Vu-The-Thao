# AGENTS.md — Hệ thống quản lý tổ hợp đa thể thao

Hệ thống phần mềm cho **một cơ sở** gồm 8 sân bóng đá 5 người (6 sân ghép được thành sân 7/sân 11), 2 tennis, 2 cầu lông, 2 bóng rổ, khu gaming (60 máy + 10 phòng riêng), 1 phòng gym (tối đa 100 người cùng lúc). Bốn kênh: web khách, app mobile, POS quầy, trang quản trị; cộng Gaming client và Bridge agent chạy tại cơ sở. Toàn bộ trên cloud.

## Nguồn sự thật
- **`docs/SPEC.md`**: đặc tả đầy đủ (kiến trúc, module M01–M22, dữ liệu, giai đoạn, giả định A01–A22). **Không đọc cả file.** Dùng skill `spec-to-tasks` hoặc `node .agents/skills/spec-to-tasks/scripts/spec-section.mjs M04` để lấy đúng phần cần làm.
- **`docs/adr/`**: các quyết định kỹ thuật đã chốt. Quyết định mới → thêm ADR, không âm thầm đổi hướng.
- Khi spec và code mâu thuẫn, hoặc spec thiếu/mơ hồ (đặc biệt các giả định A01–A22): **dừng và hỏi người dùng**, đừng tự đoán.

## Stack
NestJS (TypeScript) modular monolith · MongoDB 7+ **replica set** (Mongoose) · Redis (ioredis, BullMQ) · Next.js (web, admin) · React + Vite PWA (POS) · React Native (mobile) · C# .NET WPF (Gaming client) · .NET service (Bridge agent) · Terraform/Docker.

## Cấu trúc kho (monorepo pnpm + Turborepo)
```
apps/api  apps/web  apps/admin  apps/pos  apps/mobile
packages/contracts   # OpenAPI + kiểu sinh ra + zod schema dùng chung
packages/shared      # tiền (VND), thời gian (Asia/Ho_Chi_Minh), enum, hằng số
packages/ui          # component và design tokens
gaming-client/  bridge-agent/  infra/  docs/
```

## Lệnh chuẩn (tạo đúng tên script này nếu chưa có)
`pnpm install` · `pnpm dev` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:race` (kiểm thử tranh chấp) · `pnpm contracts:gen` · `pnpm --filter api migrate`

## Từ điển nhanh
**Đơn vị cơ sở** (sân/phòng nhỏ nhất) · **Ô giờ / slot** (30 phút) · **Hold** (giữ chỗ tạm) · **Ledger** (sổ cái ví, chỉ ghi thêm) · **Tạm giữ** (hold tiền ví cho phiên gaming) · **Bridge agent** (phần mềm tại quầy nối thiết bị) · **Heartbeat** (tín hiệu sống của máy khách).

## Ba điều không bao giờ được làm
1. Tính tiền bằng số thực, hoặc để client quyết định số tiền.
2. Ghi thay đổi số dư ví/đặt chỗ ngoài transaction, hoặc không có ràng buộc duy nhất chặn trùng.
3. Tự thay đổi quy tắc nghiệp vụ trong `docs/SPEC.md` mà không hỏi.

## Rules và Skills của dự án
- Rules (`.agents/rules/`): `00-invariants` · `01-agent-workflow` · `02-security-privacy` luôn bật; `backend-nestjs`, `mongodb-data`, `frontend-web`, `mobile-react-native`, `dotnet-clients`, `ux-vi-localization` bật theo đường dẫn tệp; `testing-and-dod` theo ngữ cảnh; `release-checklist` gọi tay bằng `@`.
- Skills (`.agents/skills/`): `spec-to-tasks`, `nestjs-module-scaffold`, `openapi-contract-first`, `court-booking-engine`, `wallet-ledger`, `payment-provider-integration`, `einvoice-adapter`, `notification-events`, `gym-membership-access`, `gaming-session-billing`, `pos-inventory-shift`, `tournament-engine`, `reporting-daily-stats`, `concurrency-test-kit`, `security-review`.
