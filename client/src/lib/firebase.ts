// admin/src/lib/firebase.ts
'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase chưa được cấu hình trên giao diện (thiếu NEXT_PUBLIC_FIREBASE_* trong .env.local).',
    );
  }
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  auth.languageCode = 'vi';
  return auth;
}

export function normalizePhoneToE164(rawPhone: string): string {
  const clean = rawPhone.replace(/\s+/g, '').trim();
  if (clean.startsWith('+')) return clean;
  if (clean.startsWith('0')) return `+84${clean.slice(1)}`;
  return `+84${clean}`;
}

export function translateFirebaseError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Bạn đã đóng cửa sổ đăng nhập Google trước khi hoàn tất.';
    case 'auth/popup-blocked':
      return 'Trình duyệt đã chặn cửa sổ popup Google. Vui lòng cho phép popup và thử lại.';
    case 'auth/cancelled-popup-request':
      return 'Yêu cầu đăng nhập trước đó đã bị hủy. Vui lòng thử lại.';
    case 'auth/unauthorized-domain':
      return 'Tên miền hiện tại chưa được cấp phép trong Firebase Console (Authorized domains).';
    case 'auth/invalid-phone-number':
      return 'Số điện thoại không hợp lệ. Vui lòng kiểm tra lại (vd: 0912345678).';
    case 'auth/too-many-requests':
      return 'Bạn đã gửi yêu cầu quá nhiều lần. Vui lòng đợi ít phút rồi thử lại.';
    case 'auth/invalid-verification-code':
      return 'Mã OTP 6 số không chính xác. Vui lòng kiểm tra lại.';
    case 'auth/code-expired':
      return 'Mã OTP đã hết hạn. Vui lòng bấm gửi lại mã mới.';
    case 'auth/expired-action-code':
      return 'Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng.';
    case 'auth/invalid-action-code':
      return 'Liên kết đặt lại mật khẩu không hợp lệ.';
    case 'auth/weak-password':
      return 'Mật khẩu mới quá yếu (tối thiểu 6 ký tự).';
    case 'auth/user-not-found':
      return 'Không tìm thấy tài khoản trên hệ thống Firebase.';
    default:
      return error?.message || 'Đã xảy ra lỗi xác thực Firebase. Vui lòng thử lại.';
  }
}

export async function signInWithGooglePopup(): Promise<string> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  await signOut(auth).catch(() => {});
  return idToken;
}

export function createInvisibleRecaptcha(containerId: string): RecaptchaVerifier {
  const auth = getFirebaseAuth();
  return new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  });
}

export async function sendPhoneOtp(
  phone: string,
  recaptchaVerifier: RecaptchaVerifier,
): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  const e164Phone = normalizePhoneToE164(phone);
  return signInWithPhoneNumber(auth, e164Phone, recaptchaVerifier);
}

export async function confirmPhoneOtpAndGetIdToken(
  confirmationResult: ConfirmationResult,
  otpCode: string,
): Promise<string> {
  const auth = getFirebaseAuth();
  const credential = await confirmationResult.confirm(otpCode.trim());
  const idToken = await credential.user.getIdToken();
  await signOut(auth).catch(() => {});
  return idToken;
}

export async function sendResetPasswordEmailLink(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  await sendPasswordResetEmail(auth, email.trim().toLowerCase(), {
    url: `${origin}/reset-password`,
    handleCodeInApp: true,
  });
}

export async function verifyResetCode(oobCode: string): Promise<string> {
  const auth = getFirebaseAuth();
  return verifyPasswordResetCode(auth, oobCode);
}

export async function confirmResetAndGetIdToken(
  oobCode: string,
  newPassword: string,
): Promise<string> {
  const auth = getFirebaseAuth();
  const email = await verifyPasswordResetCode(auth, oobCode);
  await confirmPasswordReset(auth, oobCode, newPassword);
  const credential = await signInWithEmailAndPassword(auth, email, newPassword);
  const idToken = await credential.user.getIdToken();
  await signOut(auth).catch(() => {});
  return idToken;
}
