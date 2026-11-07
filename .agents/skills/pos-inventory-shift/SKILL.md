---
name: pos-inventory-shift
description: Triển khai POS tại quầy (bán canteen và hàng thể thao, đơn ghép nhiều dịch vụ, thanh toán hỗn hợp), kho (nhập, xuất, kiểm kê, giá vốn bình quân), cho thuê dụng cụ, ca thu ngân và đối soát tiền. Dùng khi làm module pos/M12, rental/M13, giao diện POS, chốt ca, hủy hoặc hoàn đơn.
---

# pos-inventory-shift

Đọc trước: spec **M12**, **M13**, **R4/R5** trong M17, **5.3** (`orders`, `products`, `stock_movements`, `shifts`, `rental_*`), skill `wallet-ledger`, `einvoice-adapter`.

## Đơn hàng
- Mỗi đơn là `orders` với `lines[]`: `{category, refType, refId, name, qty, unitPrice, amount, vatRate}`. `category` ∈ `COURT, GAME_TIME, GAME_ROOM, CANTEEN, RETAIL, RENTAL, GYM_MEMBERSHIP, CLASS, PT, PACKAGE, TOURNAMENT_FEE`.
- **Ví chỉ trả cho** `COURT, GAME_TIME, GAME_ROOM, CANTEEN, RENTAL`. Với `RETAIL`, thẻ gym, lớp, PT, gói, lệ phí giải: phải trả bằng tiền mặt/QR/ví điện tử. Đơn ghép: phần thuộc danh mục ví có thể trừ ví, phần còn lại phương thức khác (thanh toán hỗn hợp).
- Trả bằng ví bắt buộc chọn khách (tìm theo số điện thoại; tạo nhanh tài khoản nếu chưa có).
- Giảm giá thủ công theo **hạn mức quyền** của thu ngân; vượt hạn mức cần quản lý. Voucher: tối đa một mã/đơn (skill liên quan: M15).
- Giá bán đã gồm thuế; tách thuế khi xuất hóa đơn theo `vatRate` từng sản phẩm.
- In biên lai 80mm, mở ngăn kéo tiền, quét mã vạch đều qua **Bridge agent**; mất kết nối thiết bị không được chặn bán hàng (hiển thị cảnh báo).

## Hủy / hoàn
Hủy đơn, hoàn hàng: cần **mã PIN quản lý**, lý do bắt buộc, ghi `audit_logs`; hoàn tồn kho tương ứng; đơn đã có hóa đơn điện tử → quy trình hủy/điều chỉnh hóa đơn. Hoàn tiền về nguồn tương ứng (ví → ví; tiền mặt → trả tiền mặt trong ca và ghi nhận).

## Ca thu ngân
- Mỗi thu ngân chỉ **một ca mở** tại một thời điểm; không bán hàng khi chưa mở ca; **không đăng xuất cuối ngày khi chưa chốt ca**.
- Mở ca: nhập tiền đầu ca. Chốt ca: nhập tiền thực đếm; `expectedCash = tiền đầu ca + thu tiền mặt − chi/hoàn tiền mặt`; chênh lệch hiển thị rõ và lưu; sau chốt, các đơn của ca bị khóa (không sửa).
- Cảnh báo khi chốt ca nếu còn dụng cụ cho thuê chưa trả của ca đó.
- Báo cáo R5: ca, tiền hệ thống, tiền thực đếm, chênh lệch, đơn hủy/hoàn, theo thu ngân.

## Kho
- `products`: nhóm `CANTEEN` | `RETAIL`, SKU unique, mã vạch, giá bán, giá vốn, `vatRate`, `stock`, `minStock`.
- Mọi biến động tồn đi qua **`stock_movements`** (`IN`, `OUT_SALE`, `OUT_WASTE`, `ADJUST`) cùng transaction với đơn/phiếu; `stock` cập nhật nguyên tử bằng `$inc`.
- **Giá vốn bình quân gia quyền** khi nhập: `newCost = round((oldQty×oldCost + inQty×inCost) / (oldQty + inQty))` (số nguyên VND).
- Tồn kho không âm; bán âm tạm thời chỉ với quyền quản lý và có lý do.
- Nhập hàng: phiếu nhập (tùy chọn đơn đặt hàng nhà cung cấp); kiểm kê: phiếu kiểm → nhập số thực → sinh `ADJUST` có duyệt; cảnh báo tồn dưới `minStock`; lãi gộp theo sản phẩm.

## Cho thuê dụng cụ (M13)
- `rental_items`: theo **số lượng** hoặc theo **mã tài sản**; giá theo lượt/giờ; cọc cấu hình (mặc định không).
- Phiếu thuê gắn lượt đặt sân hoặc độc lập; **không vượt số lượng khả dụng** (cập nhật nguyên tử `availableQty`); trả đồ ghi tình trạng (tốt/hỏng/mất), tính phí hư hỏng/mất, hoàn cọc; hỏng/mất tự trừ khỏi khả dụng.
- Thanh toán thuê dụng cụ được dùng ví (danh mục `RENTAL`).

## Cạm bẫy
- Cập nhật tồn kho đọc-rồi-ghi (race) thay vì `$inc` có điều kiện.
- Cho ví trả hàng `RETAIL`.
- Sửa đơn sau khi chốt ca.
- Tính giá vốn bằng số thực.

## Kiểm thử bắt buộc
**T16** (bán hàng khi chưa mở ca bị chặn; chốt ca chênh lệch hiển thị đúng), bán đồng thời hai đơn cuối cùng một sản phẩm (tồn không âm), thanh toán hỗn hợp (ví + tiền mặt), hủy đơn hoàn tồn, thuê dụng cụ không vượt khả dụng. Giao diện POS: Playwright cho luồng bán hàng và chốt ca.
