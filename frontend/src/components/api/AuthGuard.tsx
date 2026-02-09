'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Страница логина всегда доступна
    if (pathname === '/login') {
      setIsLoading(false)
      return
    }

    // Проверяем авторизацию
    const auth = localStorage.getItem('isAuthenticated')
    
    // Считаем авторизованным если есть флаг
    if (auth === 'true') {
      setIsAuthenticated(true)
      setIsLoading(false)
    } else {
      // Не авторизован - редиректим на логин
      setIsLoading(false)
      router.replace('/login')
    }
  }, [pathname, router])

  // Страница логина - показываем без проверок
  if (pathname === '/login') {
    return <>{children}</>
  }

  // Загрузка - показываем индикатор
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--foreground)]">Загрузка...</div>
      </div>
    )
  }

  // Не авторизован - ничего не показываем (идёт редирект)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--foreground)]">Перенаправление...</div>
      </div>
    )
  }

  return <>{children}</>
}