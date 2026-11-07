# Kế hoạch triển khai: M16 Giải đấu thể thao và Esports (Tournaments & Leagues)

Người phụ trách: T5 (Backend Core) + T6 (Esports & Client) · Giai đoạn: GĐ4 · Ngày công ước lượng (spec 8.2): 55 ngày công

## 1. Phạm vi
- **Làm:**
  - `F16.1`: Quản lý giải đấu (`Tournament`):
    - Phân loại: Thể thao truyền thống (`SPORT`: bóng đá, tennis, cầu lông, bóng rổ) hoặc Thể thao điện tử (`ESPORT`: LMHT, Valorant, FC Online, CS2, PUBG...).
    - Thể thức thi đấu (`TournamentFormat`): Loại trực tiếp (`SINGLE_ELIMINATION`), Nhánh thắng - nhánh thua (`DOUBLE_ELIMINATION`), Vòng tròn tính điểm (`ROUND_ROBIN`), Chia bảng rồi đấu loại trực tiếp (`GROUP_STAGE_ELIMINATION`).
    - Quy mô: Số đội tối thiểu (`minTeams`), tối đa (`maxTeams`), số vận động viên mỗi đội (`teamSize`).
    - Tài chính: Lệ phí tham gia giải (`entryFee`, Integer VND), cơ cấu giải thưởng (`prizePool`).
    - Lịch trình: Thời hạn đăng ký (`registrationStartDate`, `registrationEndDate`), thời gian thi đấu (`tournamentStartDate`, `tournamentEndDate`).
    - Trạng thái giải: `DRAFT`, `REGISTRATION_OPEN`, `REGISTRATION_CLOSED`, `BRACKET_GENERATED`, `ONGOING`, `COMPLETED`, `CANCELLED`.
  - `F16.2`: Đăng ký đội & Thu lệ phí (`TournamentTeam`):
    - Đội trưởng tạo đội (`teamName`, `captainPhone`, `captainName`, `logoUrl`).
    - Mời thành viên vào đội, kiểm tra tài khoản khách hàng.
    - Thanh toán lệ phí giải bằng Tiền mặt hoặc VietQR.
    - **Bất biến**: Tuyệt đối **không** thanh toán lệ phí giải bằng ví nội bộ (`WALLET_PAYMENT_FORBIDDEN_FOR_TOURNAMENT`).
  - `F16.3`: Duyệt đội & Rút lui:
    - Quản lý duyệt đội hoặc tự động duyệt khi hoàn tất đóng lệ phí.
    - Cho phép đội rút lui và hoàn lệ phí trước khi đóng đăng ký.
  - `F16.4`: Bốc thăm & Tự động sinh nhánh đấu (`generateBracket`):
    - Xếp hạt giống (ngẫu nhiên hoặc chỉ định hạt giống).
    - Tự động sinh các trận đấu (`TournamentMatch`: vòng đấu, cặp đấu, liên kết đội thắng vào `nextMatchId`).
  - `F16.5`: Xếp lịch thi đấu & Khóa tài nguyên (`scheduleMatch`):
    - Gán sân thể thao (`resourceId`) hoặc dàn máy gaming (`gamingMachineIds`).
    - Khóa tài nguyên chống trùng lịch với đặt sân thường (`Closure` loại `TOURNAMENT`).
    - Mỗi trận chỉ được gán duy nhất 1 tài nguyên tại một thời điểm.
  - `F16.6`: Nhập kết quả trận đấu & Cập nhật nhánh đấu (`updateMatchResult`):
    - Nhập tỉ số, xử lý bỏ cuộc (`FORFEIT`).
    - Tự động thăng hạng đội thắng vào vòng tiếp theo.
    - Cập nhật bảng xếp hạng tính điểm (`TournamentStanding`: Thắng, Hòa, Thua, Điểm, Hiệu số).
    - **Bất biến**: Kết quả đã nhập chỉ được sửa đổi bởi Quản lý (`ADMIN` / `MANAGER`) và có nhật ký Hash Chain Audit Log.
  - `F16.7`: Trang công khai (Public Bracket & Schedule):
    - Tra cứu sơ đồ nhánh đấu trực quan thời gian thực, bảng xếp hạng và lịch thi đấu.
  - `F16.8`: Esports Tournament Mode:
    - Gán nhóm máy trạm cho trận đấu, miễn trừ tính phí giờ chơi ví trong thời gian diễn ra trận đấu.
  - `F16.9`: Báo cáo giải đấu:
    - Tổng số đội, tổng lệ phí thu được, chi phí giải thưởng và lợi nhuận tổ chức giải.

## 2. Bất biến liên quan (Rule 00-invariants & SPEC 3.6/M16)
1. **Cấm thanh toán lệ phí giải bằng ví nội bộ (`WALLET_PAYMENT_FORBIDDEN_FOR_TOURNAMENT`)**: Lệ phí thi đấu giải thể thao/esports bắt buộc thanh toán bằng Tiền mặt hoặc VietQR.
2. **Khóa thể thức và luật khi đóng đăng ký**: Thể thức và luật phân định thứ hạng chốt trước khi mở đăng ký và không được thay đổi sau khi đóng đăng ký.
3. **Mỗi trận chỉ gán 1 tài nguyên tại một thời điểm**: Một sân hoặc một nhóm máy tính trạm không thể diễn ra 2 trận đấu cùng lúc (`RESOURCE_CONFLICT`).
4. **Kiểm soát sửa đổi kết quả có lưu nhật ký**: Chỉ Quản lý (`ADMIN` / `MANAGER`) mới được sửa tỉ số đã duyệt, kèm ghi nhận Audit Log.
5. **Tiền VND nguyên an toàn**: Lệ phí giải, giải thưởng phải là số nguyên VND an toàn (`Number.isSafeInteger`).

## 3. Hợp đồng API (packages/contracts)
| Method | Path | Quyền | Mục đích |
|---|---|---|---|
| GET | `/api/v1/tournaments` | Public | Danh sách giải đấu công khai |
| GET | `/api/v1/tournaments/:id` | Public | Chi tiết giải đấu, thể lệ & cơ cấu giải |
| GET | `/api/v1/tournaments/:id/bracket` | Public | Sơ đồ nhánh đấu & bảng xếp hạng |
| GET | `/api/v1/tournaments/:id/matches` | Public | Lịch thi đấu và kết quả các trận |
| POST | `/api/v1/tournaments/:id/teams/register` | Customer | Đội trưởng đăng ký đội tham gia |
| POST | `/api/v1/tournaments/teams/:teamId/withdraw` | Customer | Rút lui trước hạn đóng đăng ký |
| POST | `/api/v1/admin/tournaments` | Admin/Manager | Khởi tạo giải đấu mới |
| PATCH | `/api/v1/admin/tournaments/:id` | Admin/Manager | Cập nhật thông tin giải đấu |
| POST | `/api/v1/admin/tournaments/:id/generate-bracket` | Admin/Manager | Bốc thăm & sinh nhánh đấu |
| POST | `/api/v1/admin/tournaments/matches/:id/schedule` | Admin/Manager | Xếp lịch & gán tài nguyên thi đấu |
| POST | `/api/v1/admin/tournaments/matches/:id/result` | Admin/Manager | Nhập kết quả trận đấu |
| GET | `/api/v1/admin/tournaments/:id/report` | Admin/Manager | Báo cáo tài chính & kết quả giải |

---

## 4. Tiến độ hoàn thành (Trạng thái: 100% HOÀN TẤT)
- [x] **Enums & Shared Types**: `TournamentType`, `TournamentFormat`, `TournamentStatus`, `TournamentTeamStatus`, `TournamentMatchStatus`, `TournamentBracketType`, `PaymentOrderType.TOURNAMENT_ENTRY_FEE`.
- [x] **Zod Contracts & DTOs (`packages/contracts/src/tournament.ts`)**: Đầy đủ schemas cho Tournament, Team Registration, Bracket Generation, Match Scheduling, Match Result Update, Standings & Financial Reports.
- [x] **Mongoose Schemas (`apps/api/src/modules/tournament/schemas/`)**:
  - `Tournament`: lưu thông tin giải, thể thức, số đội, lệ phí, cơ cấu thưởng, thời gian đăng ký và thi đấu.
  - `TournamentTeam`: quản lý đội tham gia, đội trưởng, danh sách thành viên, trạng thái thanh toán và seedNumber. Unique compound index `{ tournamentId: 1, teamName: 1 }`.
  - `TournamentMatch`: quản lý trận đấu theo vòng, nhánh đấu, liên kết đội thắng vào `nextMatchId`, gán tài nguyên và tỉ số.
  - `TournamentStanding`: bảng xếp hạng cho giải đấu vòng tròn (Round Robin).
- [x] **Services & Controllers (`apps/api/src/modules/tournament/`)**:
  - `TournamentService`: CRUD giải đấu, kiểm tra ngày tháng, khóa thay đổi thể thức khi đóng đăng ký, lọc và phân trang.
  - `TournamentRegistrationService`: Đăng ký đội, áp dụng bất biến `WALLET_PAYMENT_FORBIDDEN_FOR_TOURNAMENT` (bắt buộc CASH hoặc VIETQR), chặn quá tải chỗ với atomic increment `currentTeamCount < maxTeams`, tích hợp ghi nhận ca thu ngân `CashierShift`, rút lui trước hạn đóng đăng ký và hoàn tiền.
  - `TournamentBracketService`: Tự động sinh nhánh đấu Single Elimination (liên kết cây `nextMatchId`) và Round Robin (sinh cặp đấu & bảng điểm ban đầu), kiểm tra xung đột tài nguyên sân và máy gaming (`RESOURCE_CONFLICT`), cập nhật kết quả và tự động thăng hạng đội thắng vào vòng kế tiếp, báo cáo giải đấu.
  - `TournamentPublicController` & `AdminTournamentController`.
  - Đăng ký `TournamentModule` vào `AppModule`.
- [x] **Unit & Concurrency Tests**:
  - `tournament-registration.service.spec.ts`: 11 tests passed.
  - `tournament-bracket.service.spec.ts`: 12 tests passed.
  - `tournament-team-limit.race.spec.ts`: 1 race test passed (20 đội tranh 2 suất cuối -> 2 thành công, 18 bị từ chối với `TOURNAMENT_TEAMS_FULL`, `currentTeamCount = 16`).
  - `tournament-resource-conflict.race.spec.ts`: 1 race test passed (10 trận tranh chấp cùng 1 sân và khung giờ -> 1 thành công, 9 bị từ chối với `RESOURCE_CONFLICT`).
  - Toàn bộ monorepo: `turbo typecheck` 0 lỗi, `turbo build` 100% sạch.
