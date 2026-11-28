// client/src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const isDomainAdmin =
      typeof window !== 'undefined' && window.location.hostname.startsWith('admin.');

    if (isDomainAdmin) {
      const user = api.getUser();
      if (!user) {
        router.replace('/login');
      } else if (user.role === 'STAFF') {
        router.replace('/pos/checkin-walkin');
      } else if (user.role === 'CUSTOMER') {
        window.location.href = 'https://phanta.id.vn/home';
      } else {
        router.replace('/facilities');
      }
    } else {
      router.replace('/home');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
    </div>
  );
}


