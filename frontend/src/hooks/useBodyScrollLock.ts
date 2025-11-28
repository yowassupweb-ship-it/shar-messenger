'use client'

import { useEffect } from 'react'

/**
 * Хук для блокировки скролла body при открытии модального окна
 * Предотвращает лаги и двойную прокрутку
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return

    // Сохраняем текущую позицию скролла
    const scrollY = window.scrollY
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    // Блокируем скролл и компенсируем ширину скроллбара
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.paddingRight = `${scrollbarWidth}px`
    document.body.style.overflow = 'hidden'

    return () => {
      // Восстанавливаем скролл
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.paddingRight = ''
      document.body.style.overflow = ''
      
      // Восстанавливаем позицию скролла
      window.scrollTo(0, scrollY)
    }
  }, [isLocked])
}
