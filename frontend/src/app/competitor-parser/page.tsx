'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CompetitorParserPage() {
  const router = useRouter();

  useEffect(() => {
    // Проверяем авторизацию
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Перенаправляем на новый URL
    router.push('/competitors/timeline');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-gray-600 dark:text-gray-400">
        Загрузка...
      </div>
    </div>
  );
}
