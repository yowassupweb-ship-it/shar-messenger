'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Редирект на страницу аккаунта с оригинальным интерфейсом
    router.replace('/account');
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="text-[var(--text-muted)]">Перенаправление...</div>
    </div>
  );
}
