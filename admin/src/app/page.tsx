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
        router.replace('/booking');
      } else if (user.role === 'STAFF') {
        router.replace('/walk-in');
      } else {
        router.replace('/facilities');
      }
    } else {
      router.replace('/register');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
