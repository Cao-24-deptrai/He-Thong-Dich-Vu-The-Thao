// admin/src/components/GoogleSignInButton.tsx
'use client';

import React, { useState } from 'react';
import { api, User } from '@/lib/api';
import {
  isFirebaseConfigured,
  signInWithGooglePopup,
  translateFirebaseError,
} from '@/lib/firebase';

interface GoogleSignInButtonProps {
  label?: string;
  disabled?: boolean;
  onSuccess: (result: { user: User; requiresPhoneCompletion?: boolean }) => void;
  onError: (message: string) => void;
}

export default function GoogleSignInButton({
  label = 'Tiếp tục với Google',
  disabled = false,
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleClick = async () => {
    if (!isFirebaseConfigured()) {
      onError(
        'Đăng nhập Google chưa sẵn sàng vì hệ thống chưa cấu hình Firebase (NEXT_PUBLIC_FIREBASE_*).',
      );
      return;
    }

    setLoading(true);
    try {
      const idToken = await signInWithGooglePopup();
      const res = await api.loginWithGoogle(idToken);
      onSuccess({
        user: res.user,
        requiresPhoneCompletion: res.requiresPhoneCompletion,
      });
    } catch (err: any) {
      const message = err?.code
        ? translateFirebaseError(err)
        : err?.data?.message || err?.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.';
      onError(typeof message === 'string' ? message : JSON.stringify(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleClick}
      disabled={disabled || loading}
      className="w-full py-3 px-4 rounded-xl border border-[#E3E8E6] dark:border-white/15 bg-white dark:bg-[#191C14] hover:bg-[#F8F9FA] dark:hover:bg-[#22261E] text-[#171C1A] dark:text-white font-heading font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center space-x-3 transition disabled:opacity-50"
    >
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
        />
      </svg>
      <span>{loading ? 'Đang kết nối Google...' : label}</span>
    </button>
  );
}
