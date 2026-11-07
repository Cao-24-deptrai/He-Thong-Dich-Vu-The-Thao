# Kế hoạch triển khai: M17 Báo cáo và bảng điều khiển (Analytics & Dashboards)

Người phụ trách: T4 (giao diện báo cáo/dashboard, E16) · dữ liệu: T2 (doanh thu), T3 (lấp đầy), T1 (kiểm toán) · Giai đoạn: GĐ4 · Ngày công ước lượng (kế hoạch 8.2): 45 ngày công

## 1. Phạm vi
- **Làm:**
  - `F17.1`: Tổng hợp dữ liệu thống kê (`DailyStats` collection):
    - Cơ chế cập nhật gia tăng (incremental update) theo thời gian thực khi có giao dịch/sự kiện hoàn tất.
    - Hỗ trợ đối chiếu tái tạo (reconciliation roll-up) chạy định kỳ hoặc theo yêu cầu để đối chiếu số liệu mà không cần quét toàn bộ các bảng cơ sở lớn.
  - `F17.2`: Báo cáo Doanh thu toàn tổ hợp (`R1`):
    - Tổng doanh thu gộp (`grossRevenue`), chiết khấu/giảm giá (`discount`), hoàn tiền (`refund`), doanh thu thuần (`netRevenue = gross - discount - refund`).
    - Phân bổ theo phân hệ/ngành hàng: Đặt sân thể thao (`COURT_BOOKING`), Thẻ hội viên Gym (`GYM_MEMBERSHIP`), Lớp học & PT (`PT_CLASS`), Dịch vụ Gaming (`GAMING`), Canteen & Bán lẻ (`CANTEEN`), Cho thuê dụng cụ (`RENTAL`), Lệ phí giải đấu (`TOURNAMENT`).
    - Phân bổ theo phương thức thanh toán: Tiền mặt (`CASH`), VietQR (`VIETQR`), Ví nội bộ (`INTERNAL_WALLET`).
  - `F17.3`: Báo cáo Công suất & Tỷ lệ lấp đầy sân bãi (`R2`):
    - Tỷ lệ lấp đầy = `Tổng số phút đã đặt / Tổng số phút mở cửa theo lịch`.
    - Phân bổ theo từng sân (`resourceId`), từng bộ môn thể thao (`sportType`), phân tích giờ cao điểm (`PEAK`) vs giờ thấp điểm (`OFF_PEAK`).
    - Tỷ lệ hủy sân và tỷ lệ bỏ đặt không đến (`no-show`).
  - `F17.4`: Báo cáo Khách hàng & Hội viên (`R3`):
    - Khách hàng mới đăng ký, khách hàng quay lại (từ 2 lượt trong 30 ngày), khách hàng có nguy cơ rời bỏ (không phát sinh giao dịch > 60 ngày).
    - Thẻ hội viên gym sắp hết hạn (trong vòng 7 ngày tới) và tỷ lệ gia hạn thẻ.
  - `F17.5`: Báo cáo Tồn kho & Dụng cụ (`R4`):
    - Tổng giá trị hàng tồn kho, cảnh báo các mặt hàng dưới ngưỡng an toàn (`stock <= minStockLevel`).
    - Tình trạng dụng cụ cho thuê: đang thuê, quá hạn trả (`OVERDUE`), hỏng hóc/thất lạc.
  - `F17.6`: Báo cáo Đối soát ca thu ngân (`R5`):
    - Tổng kết từng ca làm việc, so sánh doanh thu hệ thống tính toán với tiền thực đếm (`actualCashAtEnd`), độ lệch thừa/thiếu (`cashDifference`), số đơn hoàn/hủy.
  - `F17.7`: Báo cáo Gaming & Gym (`R6 & R7`):
    - Gaming: Tổng giờ chơi, tỷ lệ sử dụng máy, doanh thu theo khu vực máy (sảnh thường vs phòng VIP).
    - Gym: Biểu đồ lượt vào tập theo khung giờ trong ngày, đỉnh tải phòng tập, phân bổ hội viên theo gói.
  - `F17.8`: Báo cáo Bất thường & Hóa đơn (`R8`):
    - Thống kê giao dịch thanh toán sai lệch (`MISMATCH`), đơn hàng chưa xuất hóa đơn điện tử hoặc xuất thất bại.
  - `F17.9`: Bảng điều khiển thời gian thực cho Quản lý & Chủ tổ hợp (`Executive Dashboard`):
    - Doanh thu tức thời trong ngày, số sân đang có người chơi, số hội viên đang tập gym, số máy gaming đang hoạt động, danh sách cảnh báo tồn kho/lệch ca.

## 2. Bất biến liên quan (Rule 00-invariants & SPEC 3.6/M17)
1. **Tiền VND nguyên an toàn**: Tất cả các chỉ số doanh thu, chiết khấu, hoàn tiền, giá trị kho phải là số nguyên VND an toàn (`Number.isSafeInteger`).
2. **Công thức doanh thu thuần**: `netRevenue = grossRevenue - discountAmount - refundAmount`. Không được phép có sai lệch số học giữa tổng doanh thu và tổng các khoản phân rã chi tiết.
3. **Phân quyền chặt chẽ (RBAC)**: Chỉ tài khoản có vai trò `ADMIN` hoặc `MANAGER` mới được truy cập các báo cáo doanh thu và tài chính.
4. **Không làm chậm hệ thống nghiệp vụ chính**: Việc lấy báo cáo không được khóa bảng hoặc thực hiện quét full collection trên các bảng nghiệp vụ lớn trong giờ cao điểm. Tối ưu thông qua `daily_stats` và MongoDB aggregation pipeline với index phù hợp.

## 3. Hợp đồng API (packages/contracts)
| Method | Path | Quyền | Mục đích |
|---|---|---|---|
| GET | `/api/v1/admin/analytics/dashboard` | Admin/Manager | Dashboard tổng quan thời gian thực hôm nay |
| GET | `/api/v1/admin/analytics/revenue` | Admin/Manager | Báo cáo doanh thu R1 theo ngày/tháng/ngành hàng |
| GET | `/api/v1/admin/analytics/occupancy` | Admin/Manager | Báo cáo tỷ lệ lấp đầy sân bãi R2 & heatmap |
| GET | `/api/v1/admin/analytics/customers` | Admin/Manager | Báo cáo phân tích khách hàng & hội viên R3 |
| GET | `/api/v1/admin/analytics/inventory` | Admin/Manager | Báo cáo tồn kho canteen & dụng cụ thể thao R4 |
| GET | `/api/v1/admin/analytics/cashier-shifts` | Admin/Manager | Báo cáo đối soát chênh lệch ca thu ngân R5 |
| GET | `/api/v1/admin/analytics/gaming` | Admin/Manager | Báo cáo công suất & giờ chơi khu gaming R6 |
| GET | `/api/v1/admin/analytics/gym` | Admin/Manager | Báo cáo lượt tập và tải hội viên gym R7 |
| POST | `/api/v1/admin/analytics/daily-stats/recalculate` | Admin | Chạy lại đối soát & tổng hợp số liệu ngày |

## 4. Trạng thái & Kết quả kiểm thử (100% Hoàn thành)
- **Contracts (`packages/contracts/src/analytics.ts`)**: 9 schemas query/response cho Executive Dashboard & 8 báo cáo R1-R8. Exported và build thành công.
- **Mongoose Schema (`DailyStats`)**:
  - Lưu trữ tổng hợp ngày với composite indexes tối ưu, lưu trữ revenueSummary, revenueByService, revenueByPaymentMethod, bookingSummary, gymSummary, gamingSummary, canteenSummary, rentalSummary, tournamentSummary, customer metrics.
- **Dịch vụ (`DailyStatsService` & `AnalyticsReportService`)**:
  - `recordRevenueEvent`: Cập nhật nguyên tử gia tăng `$inc` với kiểm tra số nguyên an toàn `Number.isSafeInteger`.
  - `recalculateDailyStats`: Đối soát và tổng hợp lại số liệu từ 7 bảng nghiệp vụ (Payment, Booking, CanteenOrder, RentalTicket, GamingSession, GymAccessEvent, User).
  - 8 Báo cáo & Dashboard thời gian thực: `getExecutiveDashboard`, `getRevenueReport` (R1), `getOccupancyReport` (R2), `getCustomerReport` (R3), `getInventoryReport` (R4), `getShiftReconciliationReport` (R5), `getGamingReport` (R6), `getGymReport` (R7), `getExceptionReport` (R8).
- **Bộ kiểm thử tự động**:
  - `daily-stats.service.spec.ts`: 4/4 tests passed.
  - `analytics-report.service.spec.ts`: 10/10 tests passed.
  - Monorepo full suite: 46/46 test suites passed, 274/274 tests passed. Typecheck 0 errors, build cleanly.

