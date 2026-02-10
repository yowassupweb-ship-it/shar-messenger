'use client'

import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  closeOnEsc?: boolean
  closeOnBackdrop?: boolean
}

// Единый модальный компонент с порталом и блокировкой скролла body
export default function Modal({
  isOpen,
  onClose,
  children,
  closeOnEsc = true,
  closeOnBackdrop = true,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return

    // Блокируем скролл body
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Закрытие по Escape
    const onKeyDown = (e: KeyboardEvent) => {
      if (closeOnEsc && (e.key === 'Escape' || e.key === 'Esc')) {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown, { capture: true } as any)
    }
  }, [isOpen, closeOnEsc, onClose])

  if (!isOpen) return null

  // Рендерим в body, чтобы избежать влияния transform/filters у родителей
  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[1110] w-full max-w-2xl max-h-[85vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
