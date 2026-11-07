import { z } from 'zod';

/**
 * Định nghĩa chuẩn lỗi RFC 7807 (Problem Details for HTTP APIs)
 * Mọi API của hệ thống khi trả lỗi 4xx, 5xx đều tuân thủ cấu trúc này.
 */
export const ProblemDetailsSchema = z.object({
  type: z.string().default('about:blank'),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  code: z.string().describe('Mã lỗi domain ổn định (ví dụ: SLOT_TAKEN, WALLET_INSUFFICIENT)'),
  detail: z.string().optional().describe('Mô tả lỗi chi tiết cho client/người dùng'),
  instance: z.string().optional().describe('URI của request gây ra lỗi'),
  invalidParams: z
    .array(
      z.object({
        name: z.string(),
        reason: z.string(),
      }),
    )
    .optional(),
  details: z.record(z.unknown()).optional(),
});

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
