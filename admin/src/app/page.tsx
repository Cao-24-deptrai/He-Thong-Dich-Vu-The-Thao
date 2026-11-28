// admin/src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const user = api.getUser();

    if (user) {
      if (user.role === 'CUSTOMER') {
        const clientHome =
          typeof window !== 'undefined' && window.location.hostname.includes('phanta.id.vn')
            ? 'https://phanta.id.vn/home'
            : 'http://localhost:3001/home';
        window.location.href = clientHome;
      } else if (user.role === 'STAFF') {
        router.replace('/pos/checkin-walkin');
      } else {
        router.replace('/facilities');
      }
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
    </div>
  );
}

