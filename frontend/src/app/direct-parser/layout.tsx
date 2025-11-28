'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DirectParserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    // Проверяем авторизацию
    const isAuthenticated = localStorage.getItem('isAuthenticated')
    if (!isAuthenticated || isAuthenticated !== 'true') {
      router.push('/login')
    }
  }, [router])

  return <>{children}</>
}
