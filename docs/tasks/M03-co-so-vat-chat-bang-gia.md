# Kế hoạch triển khai: M03 Cơ sở vật chất, bảng giá, cấu hình (Facility, Pricing & Settings)

Người phụ trách: T3 (Backend Nghiệp vụ) · Giai đoạn: GĐ1 · Ngày công ước lượng (spec 8.2): 35 ngày công

## 1. Phạm vi
- **Làm:**
  - `F03.1`: Quản lý tài nguyên: 8 sân bóng đá (6 sân cụm ghép F1..F6 thành S7-A, S7-B, S7-C, S11; 2 sân độc lập F7, F8), 2 tennis (T1, T2), 2 cầu lông (B1, B2), 2 bóng rổ (BB1, BB2), 10 phòng gaming riêng (R01..R10). Mô hình sân ghép quy về **đơn vị cơ sở** (mục 3.5).
  - `F03.2`: Cấu hình giờ mở cửa hàng tuần (thứ 2 đến Chủ nhật) và ngoại lệ theo ngày (lễ Tết, đóng cửa đột xuất).
  - `F03.3`: Cấu hình khung giờ cao điểm (Peak) và thấp điểm (Off-peak) theo loại sân.
  - `F03.4`: Bảng giá thuê sân theo `(loại sân × khung giờ)`, tiền nguyên VND, có phiên bản và ngày hiệu lực (snapshot không sửa giá cũ).
  - `F03.5`: Bảng giá phòng gaming riêng (theo giờ / khung giờ).
  - `F03.6`: Khóa sân (bảo trì, giải đấu, thời tiết): khóa dải tài nguyên + thời gian; liệt kê các đơn vị cơ sở bị ảnh hưởng.
  - `F03.7`: Hệ thống cấu hình tập trung (`settings` collection) lưu các tham số trong Phụ lục C (mốc hủy 24h, giữ chỗ 10p, sức chứa gym 100, danh mục ví, v.v.).
  - `F03.8`: Lịch sử thay đổi cấu hình và giá được ghi tự động vào `audit_logs`.
  - Khởi tạo dữ liệu mẫu (Seeding) chuẩn xác cho toàn bộ cơ sở vật chất, bảng giá và cấu hình ban đầu.
- **Hoãn / phụ thuộc module sau:**
  - Tự động hoàn tiền / đổi lịch khi khóa sân (chờ M04 và M06 hoàn thành).

## 2. Bất biến liên quan (từ rule 00-invariants)
1. **Mọi sân quy về đơn vị cơ sở**: Sân ghép (S7, S11) ánh xạ xuống danh sách `baseUnitIds`. Kiểm tra trống/khóa luôn thực thi trên các đơn vị cơ sở này.
2. **Tiền là số nguyên VND**: Giá thuê mỗi giờ/slot lưu số nguyên VND an toàn (`Number.isSafeInteger`). Không dùng float.
3. **Giá có hiệu lực theo thời điểm**: Thay đổi giá tạo phiên bản mới có `effectiveFrom`, không sửa đè giá cũ.
4. **Không hardcode tham số**: Mọi giá trị mốc hủy, thời gian giữ chỗ, danh mục ví... đọc từ `SettingsService`.
5. **Ghi nhật ký thao tác**: Mọi thay đổi giá, cấu hình, khóa sân bắt buộc ghi `audit_logs`.

## 3. Giả định đang dùng (cần xác nhận)
| Mã | Giá trị mặc định đang dùng | Khóa `settings` | Đã xác nhận? |
|---|---|---|---|
| A01 | Ô 30 phút, đặt tối thiểu 60 phút, tối đa 30 ngày trước | `booking.slotMinutes`, `booking.minDurationMinutes`, `booking.maxAdvanceDays` | Đã chốt theo spec |
| A07 | Phòng gaming riêng đặt theo ô giờ giống sân, tính theo giờ phòng | `gaming.roomPricingMode` | Đã chốt theo spec |
| Cấu hình Phụ lục C | Mốc hủy 24h, giữ chỗ 10p, gym capacity 100... | Bảng cài đặt `settings` | Đã chốt theo spec |

## 4. Hợp đồng API (packages/contracts)
| Method | Path | Request | Response | Lỗi (`code`) |
|---|---|---|---|---|
| GET | `/api/v1/facilities/resources` | `{ kind, sport, status }` | `Resource[]` | None |
| GET | `/api/v1/facilities/resources/:id` | None | `ResourceDetail` | `RESOURCE_NOT_FOUND` |
| POST | `/api/v1/admin/facilities/resources` | `CreateResourceDto` | `Resource` | `FORBIDDEN`, `CODE_EXISTS` |
| PATCH | `/api/v1/admin/facilities/resources/:id` | `UpdateResourceDto` | `Resource` | `FORBIDDEN`, `RESOURCE_NOT_FOUND` |
| GET | `/api/v1/facilities/operating-hours` | None | `OperatingHoursDto` | None |
| PUT | `/api/v1/admin/facilities/operating-hours` | `UpdateOperatingHoursDto` | `OperatingHoursDto` | `FORBIDDEN` |
| GET | `/api/v1/facilities/pricing` | `{ appliesTo, at }` | `PriceRule[]` | None |
| POST | `/api/v1/admin/facilities/pricing` | `CreatePriceRuleDto` | `PriceRule` | `FORBIDDEN`, `INVALID_PRICE` |
| POST | `/api/v1/facilities/calculate-price` | `{ resourceId, date, slotIndices }` | `{ totalPrice, breakdown[] }` | `RESOURCE_NOT_FOUND` |
| POST | `/api/v1/admin/facilities/closures` | `CreateClosureDto` | `Closure` | `FORBIDDEN`, `INVALID_TIME_RANGE` |
| GET | `/api/v1/facilities/closures` | `{ fromDate, toDate }` | `Closure[]` | None |
| GET | `/api/v1/settings` | None (Public) | `Record<string, unknown>` | None |
| PATCH | `/api/v1/admin/settings/:key` | `{ value }` | `{ key, value, version }` | `FORBIDDEN` |

## 5. Dữ liệu
- **Collections mới:**
  - `resources`: `{ _id, code, name, kind, sport, variant, isComposite, baseUnitIds, capacity, status, orderIndex }`
  - `operating_hours`: `{ dayOfWeek, openTime, closeTime, isOpen, specialDates: [] }`
  - `price_rules`: `{ _id, appliesTo, band, startTime, endTime, pricePerHour, effectiveFrom, version, createdBy }`
  - `closures`: `{ _id, resourceIds, affectedUnitIds, fromAt, toAt, reason, notes, createdBy, createdAt }`
  - `settings`: `{ key (PK), value, version, updatedAt, updatedBy }`
- **Chỉ mục unique & tối ưu:**
  - `resources`: `{ code: 1 }` (unique)
  - `price_rules`: `{ appliesTo: 1, effectiveFrom: -1, band: 1 }`
  - `closures`: `{ fromAt: 1, toAt: 1 }`, `{ affectedUnitIds: 1 }`
  - `settings`: `{ key: 1 }` (unique)

## 6. Nghiệp vụ và ngoại lệ
- **Ánh xạ sân ghép**:
  - Khi tra cứu tài nguyên S11, hệ thống tự động suy ra các đơn vị cơ sở `['F1', 'F2', 'F3', 'F4', 'F5', 'F6']`.
  - S7-A -> `['F1', 'F2']`, S7-B -> `['F3', 'F4']`, S7-C -> `['F5', 'F6']`.
  - Tài nguyên đơn (F1..F8, T1..T2, B1..B2, BB1..BB2, R01..R10) có `baseUnitIds = [code]`.
- **Tính giá tiền (Pricing Engine)**:
  - Chia khoảng đặt thành từng slot 30 phút.
  - Xác định slot nằm trong khung giờ cao điểm hay thấp điểm.
  - Giá 1 slot 30 phút = `pricePerHour / 2`.
  - Tổng tiền = tổng giá các slot (số nguyên VND).
- **Khóa sân**:
  - Tự động quy đổi `resourceIds` sang `affectedUnitIds` cơ sở để sẵn sàng cho module Đặt sân M04 chặn trùng.

## 7. Việc cần làm (theo thứ tự)
- [x] 1. Thêm Zod schemas & hợp đồng API cho Facility, Pricing, Settings trong `packages/contracts`.
- [x] 2. Tạo Mongoose schemas và indexes: `Resource`, `OperatingHours`, `PriceRule`, `Closure`, `Setting`.
- [x] 3. Xây dựng `SettingsService`: đọc cấu hình có cache in-memory, cập nhật cấu hình kèm version & ghi `audit_logs`.
- [x] 4. Xây dựng `FacilityResourceService`: quản lý danh sách sân/phòng, phân giải sân ghép sang đơn vị cơ sở.
- [x] 5. Xây dựng `PricingService`: quản lý bảng giá phiên bản, engine tính giá theo slot (cao điểm / thấp điểm).
- [x] 6. Xây dựng `ClosureService`: quản lý đóng cửa/khóa sân và xác định các đơn vị cơ sở bị ảnh hưởng.
- [x] 7. Xây dựng các Controllers: `FacilitiesController`, `AdminFacilitiesController`, `SettingsController`, `AdminSettingsController`.
- [x] 8. Xây dựng kịch bản Seed Data (`SeedService` / CLI script) nạp đủ 8 sân bóng đá, 2 tennis, 2 cầu lông, 2 bóng rổ, 10 phòng gaming, bảng giá chuẩn và cấu hình Phụ lục C.
- [x] 9. Viết unit test kiểm tra:
  - Phân giải sân ghép (S11 ra 6 sân con, S7 ra 2 sân con).
  - Tính tiền chuẩn xác theo giờ cao điểm / thấp điểm (không dùng float).
  - Khóa sân ghi nhận đúng `affectedUnitIds`.
  - Cache và cập nhật `SettingsService`.
- [x] 10. Chạy kiểm thử toàn bộ monorepo (`typecheck`, `test`, `build`).

## 8. Tiêu chí nghiệm thu (từ Spec M03)
- Chủ cơ sở và quản lý xem và sửa được sân, giá, khung giờ trên API.
- Mô hình sân ghép ánh xạ chính xác: S11 gồm F1..F6, S7 gồm F1..F2...
- Engine tính giá trả kết quả chính xác từng slot 30 phút, phân biệt giờ cao điểm / thấp điểm, tiền là số nguyên VND.
- Mọi thay đổi cấu hình, giá và khóa sân đều được ghi lại trong `audit_logs`.
- Cấu hình Phụ lục C được nạp đầy đủ giá trị mặc định.

## 9. Rủi ro / câu hỏi mở
- Cần đảm bảo `SettingsService` khởi động an toàn ngay cả khi collection `settings` chưa có dữ liệu bằng cách fallback về bộ giá trị mặc định trong mã nguồn.
