'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, getHomeRouteByRole } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const user = api.getUser();
    if (user && user.role !== 'CUSTOMER') {
      router.replace(getHomeRouteByRole(user.role));
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center font-lexend text-sm text-[var(--pos-text-sub)]">
      <span>Đang kiểm tra phiên đăng nhập...</span>
    </div>
  );
}
