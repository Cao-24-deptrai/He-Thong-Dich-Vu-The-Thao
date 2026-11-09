# Bộ Rules và Skills cho Antigravity: Hệ thống quản lý tổ hợp đa thể thao

Gói này đưa vào **gốc kho mã** của dự án. Định dạng đã đối chiếu với tài liệu hiện hành của Antigravity (Rules, Agent skills): thư mục `.agents/`, rule có frontmatter `trigger`, skill là thư mục có `SKILL.md`.

## Nội dung gói
```
AGENTS.md                        # Luôn bật. Tổng quan, stack, cấu trúc kho, lệnh chuẩn, 3 điều cấm
docs/SPEC.md                     # Đặc tả đầy đủ (nguồn sự thật). Agent đọc từng phần, không đọc cả file
docs/adr/0001-nen-tang-ky-thuat.md   # Quyết định kỹ thuật nền (CÓ THỂ ĐỔI trước khi bắt đầu)
.agents/rules/                   # 11 rules
.agents/skills/                  # 15 skills (một số có scripts/ và resources/)
```

### Rules (`.agents/rules/`)
| Tệp | Kích hoạt | Nội dung |
|---|---|---|
| `00-invariants.md` | luôn bật | Bất biến về tiền, ví, đặt chỗ, thanh toán, thời gian |
| `01-agent-workflow.md` | luôn bật | Cách làm việc: đọc đúng spec, lập kế hoạch, hỏi khi mơ hồ, báo cáo |
| `02-security-privacy.md` | luôn bật | Xác thực, OTP, phân quyền, webhook, log, sinh trắc học |
| `backend-nestjs.md` | theo tệp `apps/api/**` | Ranh giới module, controller/service/repository, lỗi, hàng đợi |
| `mongodb-data.md` | theo tệp schema/repository/migration | Chỉ mục, transaction, truy vấn an toàn |
| `frontend-web.md` | theo tệp web/admin/pos/ui | Client sinh từ contract, idempotency, POS, trợ năng |
| `mobile-react-native.md` | theo tệp `apps/mobile/**` | QR động, push, lưu token, chính sách cửa hàng |
| `dotnet-clients.md` | theo tệp gaming-client/bridge-agent | Offline, kiosk, đồng hồ đơn điệu, thiết bị |
| `ux-vi-localization.md` | theo tệp giao diện | Tiếng Việt, định dạng tiền/ngày/giờ |
| `testing-and-dod.md` | theo ngữ cảnh | Definition of Done, test tranh chấp bắt buộc |
| `release-checklist.md` | gọi tay `@release-checklist` | Kiểm tra trước phát hành và go-live |

Ba rule luôn bật + `AGENTS.md` chiếm khoảng vài nghìn token, nằm trong ngân sách 20.000 token của rule luôn bật.

### Skills (`.agents/skills/`)
| Skill | Dùng khi |
|---|---|
| `spec-to-tasks` | Bắt đầu một module: lấy đúng phần spec, lập kế hoạch + tiêu chí nghiệm thu (có script `spec-section.mjs`) |
| `nestjs-module-scaffold` | Tạo module backend mới (có script `scaffold-module.mjs`) |
| `openapi-contract-first` | Thêm/sửa API theo hợp đồng OpenAPI, sinh kiểu dùng chung |
| `court-booking-engine` | Đặt sân, sân ghép 5/7/11, hủy, đổi lịch, chống trùng 3 lớp |
| `wallet-ledger` | Ví nội bộ, sổ cái bất biến, tạm giữ, đối soát |
| `payment-provider-integration` | VietQR, MoMo, ZaloPay, VNPay, webhook, đối soát |
| `einvoice-adapter` | Hóa đơn điện tử tự động qua adapter |
| `notification-events` | Push, Zalo ZNS, email, OTP qua outbox |
| `gym-membership-access` | Thẻ gym, gia hạn, nâng cấp, vào ra, bộ đếm 100 người, offline |
| `gaming-session-billing` | Phiên chơi, tính tiền theo phút, tạm giữ, offline, Gaming client |
| `pos-inventory-shift` | POS, kho, ca thu ngân, cho thuê dụng cụ |
| `tournament-engine` | Giải đấu thể thao và esports, nhánh đấu, lịch trận |
| `reporting-daily-stats` | Báo cáo, dashboard, `daily_stats` |
| `concurrency-test-kit` | Test tranh chấp, thử tải, 20 kịch bản T01–T20 |
| `security-review` | Rà soát bảo mật cho thay đổi nhạy cảm |

Skill được agent tự phát hiện theo mô tả và cũng gọi được thủ công bằng `/<tên-skill>`, ví dụ `/court-booking-engine`.

## Cài đặt
1. Giải nén vào **gốc kho mã** (cùng cấp với `apps/`, `packages/`). Giữ nguyên thư mục `.agents/`.
   - Antigravity hiện mặc định dùng `.agents/`. Nếu phiên bản bạn dùng còn đọc `.agent/` (cũ), đổi tên thư mục tương ứng; nội dung không đổi.
   - Muốn dùng cho mọi dự án trên máy: đặt skills ở thư mục skills toàn cục của Antigravity (`~/.gemini/config/skills/`), nhưng với dự án này nên để trong kho mã để cả nhóm dùng chung.
2. Mở dự án trong Antigravity, vào **Customizations** (menu `…` của agent side panel) và kiểm tra tab **Rules** và **Skills** đã liệt kê đủ. Rule không hiện thường do thiếu frontmatter hoặc sai `trigger` (Antigravity âm thầm bỏ qua).
3. **Đọc `docs/adr/0001-nen-tang-ky-thuat.md` và sửa nếu cần trước khi bắt đầu.** Các lựa chọn như pnpm/Turborepo, Mongoose, zod, luxon là mặc định mình đề xuất, chưa được bạn xác nhận. Đổi sau khi đã có mã sẽ tốn công.
4. Commit cả `.agents/`, `AGENTS.md`, `docs/` vào git để cả đội 7 người dùng chung cấu hình.

## Gợi ý thứ tự làm và câu lệnh khởi động
Gửi từng câu, chờ agent đưa **kế hoạch** và duyệt trước khi cho viết mã (rule `01-agent-workflow` yêu cầu điều này với module chạm tiền/đặt chỗ).

1. `Dùng skill spec-to-tasks. Khởi tạo monorepo theo AGENTS.md và ADR-0001 (M01 nền tảng): pnpm + Turborepo, apps/api NestJS, packages/contracts, packages/shared (money, time), CI. Chỉ lập kế hoạch trước.`
2. `Dùng spec-to-tasks cho M02 (xác thực, OTP, RBAC, audit).` → sau đó `nestjs-module-scaffold`.
3. `Dùng spec-to-tasks cho M03 (tài nguyên, sân ghép, giá, cấu hình).`
4. `Dùng court-booking-engine và concurrency-test-kit để làm M04. Bắt đầu bằng test T01–T03 trước.`
5. `Dùng payment-provider-integration cho VietQR trước, sandbox.` (cần tài khoản sandbox, agent sẽ hỏi bạn)
6. Tiếp theo theo kế hoạch ở mục 7 của `docs/SPEC.md`: ví → gym → POS → gaming → khuyến mãi/giải đấu → báo cáo.
7. Mỗi khi xong một module: `Dùng security-review cho thay đổi vừa rồi` và chạy `pnpm test:race`.

## Lưu ý quan trọng
- **Mã trong `resources/*.example.*` là mẫu minh họa**, đã kiểm tra cú pháp nhưng **chưa chạy trong dự án thật**. Agent phải điều chỉnh theo mã thực tế và có test.
- **Các giả định A01–A22** (mục 2 của `docs/SPEC.md`) chưa được bạn xác nhận hết. Agent được yêu cầu dùng giá trị mặc định, đưa vào `settings` và nói rõ. Hãy xác nhận sớm các mục A02, A04–A08, A10, A15.
- **API của cổng thanh toán và nhà cung cấp hóa đơn**: skills yêu cầu agent đọc tài liệu chính thức và dùng sandbox, không đoán. Bạn cần cung cấp tài khoản sandbox.
- `docs/SPEC.md` là nguồn sự thật. Khi đổi nghiệp vụ, **sửa SPEC trước**, rồi mới sửa mã.
- Giới hạn của Antigravity: mỗi tệp rule tối đa 24 KB; rule luôn bật dùng chung ngân sách 20.000 token. Đừng nhồi thêm vào rule luôn bật; hãy thêm skill hoặc rule theo ngữ cảnh.
- Rule/skill chỉ hướng dẫn agent, không thay thế review của người. Với module tiền và đặt chỗ, Tech Lead vẫn review mọi thay đổi.
