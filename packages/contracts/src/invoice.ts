import { z } from 'zod';
import {
  InvoiceStatus,
  InvoiceProvider,
  BuyerType,
  PaymentOrderType,
} from '@sports/shared';

export { InvoiceStatus, InvoiceProvider, BuyerType, PaymentOrderType };

// --- 1. Thông tin người mua hàng (Buyer Info) ---
export const buyerInfoSchema = z.object({
  name: z.string().trim().min(1).describe('Tên khách hàng hoặc người đại diện'),
  buyerType: z.nativeEnum(BuyerType).default(BuyerType.INDIVIDUAL),
  companyName: z.string().trim().max(250).optional().describe('Tên pháp nhân công ty nếu lấy hóa đơn VAT'),
  taxCode: z.string().trim().max(20).optional().describe('Mã số thuế doanh nghiệp'),
  address: z.string().trim().max(300).optional().describe('Địa chỉ xuất hóa đơn'),
  email: z.string().trim().email().optional().describe('Email nhận hóa đơn điện tử'),
  phone: z.string().trim().optional(),
});

export type BuyerInfoDto = z.input<typeof buyerInfoSchema>;
export type BuyerInfo = z.infer<typeof buyerInfoSchema>;

// --- 2. Dòng hàng hóa / dịch vụ trên hóa đơn (Invoice Item) ---
export const invoiceItemSchema = z.object({
  name: z.string().trim().min(1).describe('Tên hàng hóa, dịch vụ'),
  unit: z.string().trim().default('Lượt').describe('Đơn vị tính (Lượt, Giờ, Chai, Suất...)'),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().int().nonnegative().describe('Đơn giá (VND nguyên)'),
  amount: z.number().int().nonnegative().describe('Thành tiền trước thuế = qty * price'),
  vatRate: z.number().int().nonnegative().default(8).describe('Thuế suất VAT (%)'),
  vatAmount: z.number().int().nonnegative().default(0).describe('Tiền thuế VAT'),
});

export type InvoiceItemDto = z.input<typeof invoiceItemSchema>;
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;

// --- 3. Khởi tạo hóa đơn (Create Invoice Request) ---
export const createInvoiceSchema = z.object({
  paymentId: z.string().trim().min(1),
  orderId: z.string().trim().min(1),
  orderType: z.nativeEnum(PaymentOrderType),
  buyerInfo: buyerInfoSchema.optional(),
  items: z.array(invoiceItemSchema).min(1),
  subtotal: z.number().int().nonnegative(),
  vatAmount: z.number().int().nonnegative(),
  totalAmount: z.number().int().positive(),
  idempotencyKey: z.string().trim().min(8).max(64),
});

export type CreateInvoiceDto = z.input<typeof createInvoiceSchema>;
export type CreateInvoiceRequest = CreateInvoiceDto;

// --- 4. Chi tiết hóa đơn điện tử (Invoice Detail) ---
export const invoiceDetailSchema = z.object({
  id: z.string(),
  invoiceCode: z.string(),
  invoiceNumber: z.string().optional().describe('Số hóa đơn chính thức (cơ quan thuế cấp)'),
  invoiceSeries: z.string().optional().describe('Ký hiệu mẫu hóa đơn (vd: 1C26TAA)'),
  lookupCode: z.string().optional().describe('Mã tra cứu hóa đơn trực tuyến'),
  paymentId: z.string(),
  orderId: z.string(),
  orderType: z.nativeEnum(PaymentOrderType),
  userId: z.string(),
  buyerInfo: buyerInfoSchema,
  items: z.array(invoiceItemSchema),
  subtotal: z.number().int(),
  vatAmount: z.number().int(),
  totalAmount: z.number().int(),
  status: z.nativeEnum(InvoiceStatus),
  provider: z.nativeEnum(InvoiceProvider),
  retryCount: z.number().int(),
  lastError: z.string().optional(),
  pdfUrl: z.string().optional().describe('Link tải bản thể hiện PDF'),
  xmlUrl: z.string().optional().describe('Link tải file dữ liệu gốc XML'),
  issuedAt: z.string().datetime().optional(),
  idempotencyKey: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type InvoiceDetail = z.infer<typeof invoiceDetailSchema>;

// --- 5. Danh sách hóa đơn phân trang ---
export const invoiceListSchema = z.object({
  items: z.array(invoiceDetailSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export type InvoiceList = z.infer<typeof invoiceListSchema>;

// --- 6. Báo cáo đối soát đơn chưa có hóa đơn ---
export const uninvoicedReportSchema = z.object({
  uninvoicedCount: z.number().int(),
  uninvoicedTotal: z.number().int(),
  payments: z.array(
    z.object({
      paymentId: z.string(),
      paymentCode: z.string(),
      orderId: z.string(),
      orderType: z.nativeEnum(PaymentOrderType),
      amount: z.number().int(),
      createdAt: z.string().datetime(),
    }),
  ),
});

export type UninvoicedReport = z.infer<typeof uninvoicedReportSchema>;
