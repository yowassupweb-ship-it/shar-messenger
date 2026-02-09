'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to messages by default
    router.replace('/messages');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">Загрузка...</h1>
        <p className="text-gray-600">Перенаправление...</p>
      </div>
    </div>
  );
}
