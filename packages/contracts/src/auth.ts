import { z } from 'zod';
import { Role } from '@sports/shared';

// Chuẩn hóa số điện thoại Việt Nam (10 số, bắt đầu bằng 0, vd: 0901234567)
export const VietnamPhoneSchema = z
  .string()
  .trim()
  .regex(/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/, 'Số điện thoại không hợp lệ theo định dạng Việt Nam');

export const PasswordSchema = z
  .string()
  .min(8, 'Mật khẩu phải có tối thiểu 8 ký tự')
  .max(100, 'Mật khẩu không được vượt quá 100 ký tự');

export const UserConsentsSchema = z.object({
  personalData: z.boolean().default(true),
  biometric: z.boolean().optional().default(false),
  marketing: z.boolean().optional().default(false),
  termsVersion: z.string().default('1.0'),
  consentedAt: z.string().datetime().optional(),
});

export const InvoiceInfoSchema = z.object({
  taxId: z.string().optional(),
  companyName: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email().optional(),
});

export const RegisterRequestSchema = z.object({
  phone: VietnamPhoneSchema,
  fullName: z.string().trim().min(2, 'Họ tên tối thiểu 2 ký tự').max(100),
  password: PasswordSchema,
  email: z.string().email('Email không đúng định dạng').optional(),
  consents: UserConsentsSchema.optional(),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const VerifyOtpRequestSchema = z.object({
  challengeId: z.string().min(1, 'Mã challenge không được để trống'),
  code: z.string().length(6, 'Mã OTP gồm 6 chữ số').regex(/^[0-9]{6}$/, 'Mã OTP chỉ chứa chữ số'),
});

export type VerifyOtpRequest = z.infer<typeof VerifyOtpRequestSchema>;

export const SendOtpRequestSchema = z.object({
  phone: VietnamPhoneSchema,
  purpose: z.enum(['REGISTER', 'LOGIN', 'RESET_PASSWORD', 'VERIFY_PHONE']).default('LOGIN'),
});

export type SendOtpRequest = z.infer<typeof SendOtpRequestSchema>;

export const LoginRequestSchema = z.object({
  phone: VietnamPhoneSchema,
  password: z.string().min(1, 'Mật khẩu không được để trống'),
  deviceId: z.string().min(1, 'Thiết bị không xác định').default('web-browser'),
  deviceName: z.string().optional().default('Web Browser'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token không được để trống'),
});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

export const UpdateProfileRequestSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  email: z.string().email().optional(),
  invoiceInfo: InvoiceInfoSchema.optional(),
  consents: UserConsentsSchema.optional(),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export const QuickCreateUserRequestSchema = z.object({
  phone: VietnamPhoneSchema,
  fullName: z.string().trim().min(2, 'Họ tên tối thiểu 2 ký tự').max(100),
});

export type QuickCreateUserRequest = z.infer<typeof QuickCreateUserRequestSchema>;

export const AssignRoleRequestSchema = z.object({
  role: z.nativeEnum(Role),
  permissions: z.array(z.string()).optional(),
});

export type AssignRoleRequest = z.infer<typeof AssignRoleRequestSchema>;

export const LockUserRequestSchema = z.object({
  reason: z.string().min(3, 'Lý do khóa tối thiểu 3 ký tự'),
  durationMinutes: z.number().int().positive().optional().default(15),
});

export type LockUserRequest = z.infer<typeof LockUserRequestSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  type: z.enum(['CUSTOMER', 'STAFF']),
  phone: z.string(),
  fullName: z.string(),
  email: z.string().optional(),
  role: z.nativeEnum(Role),
  permissions: z.array(z.string()),
  status: z.enum(['ACTIVE', 'LOCKED', 'PENDING_ACTIVATION', 'ANONYMIZED']),
  invoiceInfo: InvoiceInfoSchema.optional(),
  consents: UserConsentsSchema.optional(),
  createdAt: z.string().datetime(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().describe('Thời gian hết hạn của access token tính bằng giây'),
});

export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const AuthSuccessResponseSchema = z.object({
  user: UserProfileSchema,
  tokens: AuthTokensSchema,
});

export type AuthSuccessResponse = z.infer<typeof AuthSuccessResponseSchema>;

export const LoginOtpRequiredResponseSchema = z.object({
  requiresOtp: z.literal(true),
  challengeId: z.string(),
  phone: z.string(),
  waitSeconds: z.number().default(60),
});

export type LoginOtpRequiredResponse = z.infer<typeof LoginOtpRequiredResponseSchema>;
