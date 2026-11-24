// admin/src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const isCustomerDomain =
      typeof window !== 'undefined' &&
      !window.location.hostname.startsWith('admin.');

    const user = api.getUser();

    if (isCustomerDomain) {
      // Domain khách hàng: phanta.id.vn
      router.replace('/home');
      return;
    }

    // Domain quản trị: admin.phanta.id.vn
    if (user) {
      if (user.role === 'CUSTOMER') {
        // Tài khoản khách truy cập nhầm trang admin -> chuyển về cổng khách hàng
        window.location.href = 'https://phanta.id.vn/home';
      } else if (user.role === 'STAFF') {
        router.replace('/walk-in');
      } else {
        router.replace('/facilities');
      }
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

