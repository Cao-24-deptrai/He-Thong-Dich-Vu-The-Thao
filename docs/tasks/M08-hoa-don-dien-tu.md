# Kế hoạch triển khai: M08 Hóa đơn điện tử (E-Invoicing & Provider Adapters)

Người phụ trách: T2 (Backend Hóa đơn) · Giai đoạn: GĐ2 · Ngày công ước lượng (spec 8.2): 25 ngày công

## 1. Phạm vi
- **Làm:**
  - `F08.1`: Tự động tạo và phát hành hóa đơn điện tử cho mọi giao dịch đã thanh toán thành công (M04 Booking, M06 Canteen/POS).
  - `F08.2`: Phân loại thông tin người mua: Mặc định "Khách lẻ không lấy hóa đơn"; nếu khách có lưu thông tin công ty thì tự động xuất đúng MST, tên công ty và địa chỉ pháp nhân.
  - `F08.3`: Kiến trúc Adapter cắm rút cho nhà cung cấp hóa đơn (`InvoiceAdapter`): Hỗ trợ Mock cho dev/test, và các adapter cho MISA meInvoice, Viettel S-Invoice, VNPT e-Invoice cấu hình qua API keys.
  - `F08.4`: Hàng đợi có cơ chế thử lại (Retry Queue): Trạng thái `PENDING → ISSUED | FAILED`, tự động thử lại khi lỗi mạng/timeout (tối đa 3 lần).
  - `F08.5`: Xem và tải bản thể hiện PDF hoặc file XML gốc của hóa đơn.
  - `F08.6`: Hủy, điều chỉnh hóa đơn khi giao dịch thanh toán bị hoàn tiền (`payment.refunded`).
  - `F08.7`: Báo cáo đối soát hóa đơn và đơn hàng: Phát hiện các đơn đã thanh toán thành công nhưng chưa xuất hóa đơn để kế toán xử lý.

## 2. Bất biến liên quan (từ rule 00-invariants)
1. **Số nguyên an toàn VND**: Đơn giá, thành tiền trước thuế, thuế VAT và tổng tiền thanh toán luôn là số nguyên VND (`Number.isSafeInteger`).
2. **1-1 Mapping giữa Thanh toán thành công và Hóa đơn**: Mỗi giao dịch thanh toán thành công chỉ gắn với duy nhất 1 hóa đơn gốc (`paymentId` Unique index).
3. **Quy tắc thời điểm xuất hóa đơn**:
   - Tiền sân M04 và Canteen M06: Xuất ngay khi thanh toán.
   - Giờ chơi net M14: Xuất sau khi quyết toán `SETTLE` phiên chơi.
   - Nạp ví M05: Không xuất hóa đơn khi nạp, chỉ xuất khi tiêu dùng dịch vụ thực tế.
4. **Idempotency tuyệt đối**: Mỗi hóa đơn có `idempotencyKey` duy nhất, không xuất trùng lặp hóa đơn cho cùng một giao dịch.

## 3. Hợp đồng API (packages/contracts)
| Method | Path | Request | Response | Lỗi (`code`) |
|---|---|---|---|---|
| GET | `/api/v1/invoices/me` | `{ page, limit }` | `InvoiceList` | None |
| GET | `/api/v1/invoices/:id` | None | `InvoiceDetail` | `NOT_FOUND` |
| GET | `/api/v1/invoices/:id/pdf` | None | `{ pdfUrl: string }` | `NOT_FOUND` |
| GET | `/api/v1/admin/invoices` | `{ status, provider, date, page, limit }` | `InvoiceList` | None |
| POST | `/api/v1/admin/invoices/:id/retry` | None | `InvoiceDetail` | `INVALID_STATUS` |
| POST | `/api/v1/admin/invoices/:id/cancel` | `{ reason: string }` | `InvoiceDetail` | `CANNOT_CANCEL` |
| GET | `/api/v1/admin/invoices/uninvoiced-report` | None | `UninvoicedReport` | None |

## 4. Cấu trúc CSDL
- **Collection `invoices`:**
  - `_id`: ObjectId
  - `invoiceCode`: string (Unique index, `INV-YYYYMMDD-XXXXXX`)
  - `invoiceNumber`?: string (Số HĐ thuế cấp)
  - `invoiceSeries`?: string (Ký hiệu HĐ)
  - `lookupCode`?: string (Mã tra cứu)
  - `paymentId`: ObjectId (Unique index)
  - `orderId`: ObjectId (index)
  - `orderType`: PaymentOrderType
  - `userId`: ObjectId (index)
  - `buyerInfo`: BuyerInfo (`name`, `buyerType`, `companyName`, `taxCode`, `address`, `email`, `phone`)
  - `items`: InvoiceItem[] (`name`, `unit`, `quantity`, `unitPrice`, `amount`, `vatRate`, `vatAmount`)
  - `subtotal`: number (Integer VND)
  - `vatAmount`: number (Integer VND)
  - `totalAmount`: number (Integer VND)
  - `status`: InvoiceStatus (`PENDING`, `ISSUED`, `FAILED`, `CANCELLED`)
  - `provider`: InvoiceProvider (`MOCK`, `MISA`, `VIETTEL`, `VNPT`)
  - `retryCount`: number (default: 0)
  - `lastError`?: string
  - `pdfUrl`?: string
  - `xmlUrl`?: string
  - `issuedAt`?: Date
  - `idempotencyKey`: string (Unique index)
  - `createdAt`: Date
  - `updatedAt`: Date

## 5. Kế hoạch thực hiện (thứ tự từng bước)
- [x] 1. Thêm Zod schemas & hợp đồng API cho Invoice trong `packages/contracts/src/invoice.ts`.
- [x] 2. Tạo Mongoose schemas và Unique indexes: `InvoiceSchema`.
- [x] 3. Xây dựng Interface Adapter `InvoiceAdapter` & `MockInvoiceAdapterService`.
- [x] 4. Xây dựng `InvoiceService`:
  - `createInvoice(dto)`
  - `issueInvoiceWithRetry(invoiceId)`
  - `cancelInvoice(invoiceId, reason, actorId)`
  - `getInvoicePdf(invoiceId)`
  - `findUninvoicedPayments()`
  - Tự động xuất hóa đơn khi thanh toán thành công (lắng nghe Outbox hoặc gọi trực tiếp từ Payment).
- [x] 5. Xây dựng Controllers: `InvoicesController`, `AdminInvoicesController`.
- [x] 6. Đăng ký `InvoiceModule` vào `app.module.ts`.
- [x] 7. Viết Unit & Retry Tests:
  - Tạo hóa đơn khách lẻ và hóa đơn doanh nghiệp (có MST, tên cty).
  - Phát hành hóa đơn qua Adapter thành công cập nhật `ISSUED`, `invoiceNumber`, `lookupCode`.
  - Cơ chế retry khi Adapter lỗi, tăng `retryCount`.
  - Hủy hóa đơn khi giao dịch hoàn tiền.
  - Báo cáo đối soát phát hiện đúng các khoản thanh toán chưa có hóa đơn.
- [x] 8. Chạy kiểm thử toàn bộ monorepo (`typecheck`, `test`, `build`).
