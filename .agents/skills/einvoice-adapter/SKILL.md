---
name: einvoice-adapter
description: Tích hợp hóa đơn điện tử tự động cho mọi giao dịch qua adapter nhà cung cấp (MISA meInvoice, Viettel S-Invoice, VNPT), hàng đợi có thử lại, hủy/điều chỉnh khi hoàn tiền, báo cáo đối soát hóa đơn. Dùng khi làm module invoice/M08, in hoặc gửi hóa đơn, xử lý đơn chưa có hóa đơn.
---

# einvoice-adapter

Đọc trước: spec **M08**, giả định **A06**, báo cáo **R8**, và rule `00-invariants`.

## Nguyên tắc
- **Mỗi đơn đã thanh toán → một hóa đơn điện tử** (tự động). Cần xử lý được số lượng rất lớn (mỗi đơn canteen đều có hóa đơn).
- Thiết kế **adapter** (`InvoiceProvider`: `issue`, `cancel`, `adjust/replace`, `getPdf`), chọn nhà cung cấp qua cấu hình. **Không đoán API**: đọc tài liệu chính thức, dùng sandbox; thiếu khóa/tài khoản sandbox → hỏi người dùng.
- Phát hành **bất đồng bộ**: sự kiện `order.paid` (outbox) → worker BullMQ → adapter. Không phát hành trong request thanh toán.

## Khi nào phát hành (A06 — chờ kế toán xác nhận, đang dùng mặc định)
| Sự kiện | Hóa đơn |
|---|---|
| Đặt sân thanh toán xong | Có |
| Mua thẻ gym, lớp, PT, gói, lệ phí giải | Có |
| Bán hàng POS (canteen, bán lẻ), thuê dụng cụ | Có |
| Kết thúc phiên gaming (quyết toán) | Có, **một hóa đơn khi phiên kết thúc** |
| **Nạp ví** | **Không** (xuất khi khách tiêu dùng dịch vụ). Giữ ở dạng cấu hình để đổi nếu kế toán yêu cầu |
| Thanh toán bằng ví cho dịch vụ | Có, tại thời điểm tiêu dùng |

## Dữ liệu và trạng thái
- `invoices { orderId (unique), provider, invoiceNo, status, buyer, pdfUrl }`, trạng thái: `PENDING → ISSUED`; `FAILED`; `CANCELLED | ADJUSTED | REPLACED`.
- **Người mua**: mặc định "khách lẻ"; nếu hồ sơ khách có thông tin công ty (tên, MST, địa chỉ, email) thì dùng thông tin đó. Dòng hóa đơn lấy từ `orders.lines[]` (`vatRate`); giá đã gồm thuế — tách thuế theo thuế suất sản phẩm.
- **Idempotency**: `orderId` unique; thử lại không tạo hóa đơn thứ hai. Nếu nhà cung cấp hỗ trợ khóa idempotency/mã tham chiếu, truyền `orderCode`.

## Thử lại và cảnh báo
- Backoff tăng dần; quá số lần thử → `FAILED` + cảnh báo kế toán và T2. Có nút "thử lại" thủ công (`POST /invoices/{id}/retry`, quyền riêng) và màn hình danh sách đơn chưa có hóa đơn (`GET /invoices/unissued`).
- Mất kết nối nhà cung cấp không được chặn thanh toán hay bán hàng.

## Hoàn tiền / hủy đơn
Hoàn tiền hoặc hủy đơn đã có hóa đơn → chạy quy trình hủy/điều chỉnh/thay thế của nhà cung cấp (luôn ghi `audit_logs`, lý do bắt buộc). Không xóa bản ghi hóa đơn.

## Gửi cho khách
Email hóa đơn kèm PDF (qua outbox → thông báo), xem/tải PDF trong app/web, in tại POS qua Bridge agent.

## Kiểm thử
Dùng **provider giả** (fake) trong test: phát hành thành công, lỗi tạm thời rồi thành công, lỗi vĩnh viễn → `FAILED`, phát hành lặp cùng `orderId` → một hóa đơn, hoàn tiền → hủy/điều chỉnh. Báo cáo R8 không còn đơn thiếu hóa đơn (T20).
