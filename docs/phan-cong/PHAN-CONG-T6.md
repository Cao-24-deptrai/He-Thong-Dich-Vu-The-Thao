# PHAN-CONG-T6: Gaming và Thiết bị

**Kỹ năng:** C#/.NET (WPF), Windows internals, WebSocket, SDK thiết bị

**Khối lượng (kế hoạch 8.3):** M14a (55) + M14b (80) + M22 (30) + M16 esports (20) = 185 ngày công (99%)

**Người dự phòng (kế hoạch 8.6):** T7 (và ngược lại)

Nguồn: ảnh phân công Epic E01–E17 + `ke-hoach-he-thong-to-hop-the-thao` v1.0. Khi hai nguồn lệch nhau, ảnh là bản mới hơn; những chỗ lệch được liệt kê ở mục 5 để bạn xác nhận.

## 1. Epic bạn tham gia (5 epic)

| Epic | Tên epic | Lớp việc | Chi tiết trong ô | Ghi chú ảnh | Chủ epic (màu) |
|---|---|---|---|---|---|
| E05 | Vé QR & soát vé | Gaming / IoT / phần cứng | đầu đọc QR, camera | US-010 do T1, quét vé do T3 | Vy |
| E06 | Quầy POS, kho & ca thu ngân | Gaming / IoT / phần cứng | Bridge Agent quầy | POS & Kho M12, ca thu ngân | Huyền |
| E11 | Gym Face ID & hồ bơi | Gaming / IoT / phần cứng | Face ID, cửa xoay | Gym M10, hồ bơi | Khang |
| E12 | Khu Gaming & thiết bị | Backend | Gaming Server | T2 hỗ trợ phần ví tạm giữ | Phong |
| E12 | Khu Gaming & thiết bị | Frontend / Mobile | Gaming Client | T2 hỗ trợ phần ví tạm giữ | Phong |
| E12 | Khu Gaming & thiết bị | Gaming / IoT / phần cứng | — | T2 hỗ trợ phần ví tạm giữ | Phong |
| E17 | Hạng mục nền (Enabler) | Gaming / IoT / phần cứng | phần cứng, 100 máy Gaming | Toàn đội hỗ trợ UAT, Go-Live | Phong |

### Hiện có trong kit cho các epic này

- **E05 Vé QR & soát vé:** api: QR trong `booking` (check-in), `gym` (qr-token), `rental` · web: `components/qr-code.tsx` · mobile: `components/DynamicQrPass.tsx` · **chưa có app "Staff Desk" riêng**; đầu đọc QR/camera chưa có (bridge-agent chưa tạo)
- **E06 Quầy POS, kho & ca thu ngân:** api: `modules/canteen` (product, order, inventory, cashier-shift) · pos: `app/orders`, `app/shifts`, `app/hardware`, `lib/bridge.ts` · admin: `app/pos`, `app/inventory` · **bridge-agent chưa tạo**
- **E11 Gym Face ID & hồ bơi:** api: `modules/gym` (package, membership, access-event) · web: `app/gym` · mobile: `screens/gym` · admin: `app/gym` · **Face ID và hồ bơi: chưa có trong SPEC lẫn mã**
- **E12 Khu Gaming & thiết bị:** api: `modules/gaming` (machine, session, price-rule), `modules/bridge` · admin: `app/gaming`, `app/bridge` · **gaming-client (C#/.NET) chưa tạo**
- **E17 Hạng mục nền (Enabler):** `.github/workflows/ci.yml`, `docker-compose.yml`, `modules/testing` · **infra/ (Terraform) và gaming-client chưa tạo**

## 2. Mã nguồn bạn sở hữu

- `apps/api/src/modules/bridge/` (16 tệp, trong đó 4 tệp test)
- `apps/api/src/modules/gaming/` (14 tệp, trong đó 4 tệp test)
- `packages/contracts/src/`: `bridge.ts`, `gaming.ts`
- Thư mục chưa có trong kit, sẽ thuộc bạn: `gaming-client/`, `bridge-agent/` (khi tạo)

**Quy tắc sở hữu:** chỉ sửa file thuộc phần bạn. Muốn đổi file của người khác thì mở PR và gắn chủ file review. Mọi thay đổi chạm tiền hoặc đặt chỗ cần Tech Lead (T1) review. Hợp đồng API nằm ở `packages/contracts/src/<module>.ts`: chủ module sửa, người dùng contract chỉ đọc.

Các file khác trong thư mục này (khung API, `packages/*`, module `auth`/`outbox`/`health`, các rule/skill nền, `docs/SPEC.md`) là **bản tham chiếu** để bạn đọc và build; chúng thuộc T1 và giống nhau trong cả 7 phần.

## 3. Tài liệu, rule, skill đi kèm

**Task (docs/tasks):**
- Sở hữu: `docs/tasks/M14-khu-gaming.md`, `docs/tasks/M22-bridge-agent.md`
- Hỗ trợ (đọc để phối hợp): `docs/tasks/M10-phong-gym.md`, `docs/tasks/M12-canteen-ban-le-kho.md`, `docs/tasks/M16-giai-dau.md`

**Skills (`.agents/skills/`):** nền cho mọi người: `spec-to-tasks`, `openapi-contract-first`. Dùng chính: `gaming-session-billing`, `gym-membership-access`, `wallet-ledger`, `tournament-engine`, `pos-inventory-shift`, `nestjs-module-scaffold`, `concurrency-test-kit`

**Rules (`.agents/rules/`):** luôn bật `00-invariants`, `01-agent-workflow`, `02-security-privacy`, `03-vai-tro-T6` (vai trò của bạn); theo ngữ cảnh: `testing-and-dod`, `dotnet-clients`, `backend-nestjs`, `mongodb-data`, `ux-vi-localization`

## 4. Lộ trình theo giai đoạn (kế hoạch mục 8.5)

| **GĐ** | **Công việc** |
| --- | --- |
| GĐ0 | Nguyên mẫu khóa/mở máy từ xa, đồng hồ offline; thử đầu đọc RFID/vân tay mẫu |
| GĐ1 | Khung Gaming client (khóa màn hình, kết nối WebSocket, đăng ký thiết bị); khung bridge agent |
| GĐ2 | Nguyên mẫu phiên chơi (đăng nhập, đồng hồ, kết thúc); module server gaming phần nền |
| GĐ3 | **M22 bridge agent đầy đủ**: RFID, vân tay, QR, cửa, máy in, offline, đồng bộ; hỗ trợ M10 phần kiểm soát vào ra |
| GĐ4 | **M14 đầy đủ**: tạm giữ tiền, cảnh báo, hết tiền, chuyển máy, điều khiển từ xa, sơ đồ máy, phòng riêng, offline đầy đủ, chống can thiệp, cập nhật tự động; esports chế độ giải; thử 20 máy 3 ngày |
| GĐ5 | Thử mất điện/mất mạng hàng loạt; tối ưu; sửa lỗi |
| GĐ6 | Cài đặt trên 70 máy, trực khu gaming, hỗ trợ sự cố thiết bị |

## 5. Chỗ lệch cần xác nhận liên quan đến T6

| Epic / Mục | Vấn đề | Chi tiết cần xác nhận |
|---|---|---|
| E11 | Face ID và hồ bơi | Kế hoạch v1.0 (mục 1.5) ghi **nhận diện khuôn mặt và quản lý camera nằm ngoài phạm vi**, và SPEC không có hồ bơi. Kit không có mã cho cả hai. Theo AGENTS.md: phải sửa SPEC/ADR trước rồi mới làm. |
| E12 | Ô đỏ T6 (Gaming Server) | Ô này tô đỏ trong ảnh, và T6 vừa làm Gaming Server, Gaming Client, phần cứng. Tải E12 dồn lên một người; cần xác nhận ý nghĩa ô đỏ. |
| E17 | Ô đỏ T7 (DevOps) | Ô này tô đỏ trong ảnh. Cần xác nhận ý nghĩa. |
| Kit | Thư mục chưa tồn tại | AGENTS.md nhắc `packages/ui`, `gaming-client/`, `bridge-agent/`, `infra/` nhưng kit chưa có. Khi tạo: `packages/ui` → T4, `gaming-client/` và `bridge-agent/` → T6, `infra/` → T7. |

Theo AGENTS.md: khi spec thiếu hoặc mơ hồ, **dừng và hỏi**, đừng tự đoán; muốn đổi nghiệp vụ thì sửa SPEC trước.
