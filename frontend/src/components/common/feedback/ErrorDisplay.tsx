'use client'

import { useState, useEffect } from 'react'

interface ErrorDisplayProps {
  error: string | null
  onClose?: () => void
  className?: string
}

export default function ErrorDisplay({ error, onClose, className = '' }: ErrorDisplayProps) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null)

  // Парсим время ожидания из сообщения об ошибке
  useEffect(() => {
    if (!error) {
      setTimeLeft(null)
      return
    }

    const timeMatch = error.match(/Time to refill: (\d+) seconds/)
    if (timeMatch) {
      const totalSeconds = parseInt(timeMatch[1])
      
      const updateTime = () => {
        const now = Date.now()
        const endTime = now + (totalSeconds * 1000)
        
        const interval = setInterval(() => {
          const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000))
          
          if (remaining <= 0) {
            setTimeLeft(null)
            clearInterval(interval)
            return
          }

          const hours = Math.floor(remaining / 3600)
          const minutes = Math.floor((remaining % 3600) / 60)
          const seconds = remaining % 60

          setTimeLeft({ hours, minutes, seconds })
        }, 1000)

        return interval
      }

      const interval = updateTime()
      return () => clearInterval(interval)
    }
  }, [error])

  const formatTime = () => {
    if (!timeLeft) return null
    
    const parts = []
    if (timeLeft.hours > 0) parts.push(`${timeLeft.hours}ч`)
    if (timeLeft.minutes > 0) parts.push(`${timeLeft.minutes}м`)
    if (timeLeft.seconds > 0 && timeLeft.hours === 0) parts.push(`${timeLeft.seconds}с`)
    
    return parts.join(' ')
  }

  const getErrorType = () => {
    if (!error) return 'error'
    
    if (error.includes('Quota limit exceeded')) return 'quota'
    if (error.includes('Unauthorized') || error.includes('токен')) return 'auth'
    if (error.includes('400')) return 'validation'
    if (error.includes('500')) return 'server'
    
    return 'error'
  }

  const getErrorIcon = () => {
    const type = getErrorType()
    
    switch (type) {
      case 'quota':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'auth':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      case 'validation':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
    }
  }

  const getErrorTitle = () => {
    const type = getErrorType()
    
    switch (type) {
      case 'quota':
        return 'Превышена квота запросов'
      case 'auth':
        return 'Проблема с авторизацией'
      case 'validation':
        return 'Ошибка валидации данных'
      case 'server':
        return 'Ошибка сервера'
      default:
        return 'Произошла ошибка'
    }
  }

  const getErrorMessage = () => {
    if (!error) return ''
    
    const type = getErrorType()
    
    if (type === 'quota') {
      return timeLeft 
        ? `Попробуйте снова через: ${formatTime()}`
        : 'Попробуйте выполнить запрос позже'
    }
    
    // Убираем технические детали из сообщения
    return error
      .replace(/Error: /g, '')
      .replace(/HTTP ошибка \d+: /g, '')
      .replace(/Time to refill: \d+ seconds/g, '')
      .trim()
  }

  if (!error) return null

  return (
    <div className={`error-display ${className}`}>
      <div className="error-header">
        <div className="error-icon">
          {getErrorIcon()}
        </div>
        <div className="error-content">
          <h3 className="error-title">{getErrorTitle()}</h3>
          <p className="error-message">{getErrorMessage()}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="error-close">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {timeLeft && (
        <div className="error-countdown">
          <div className="countdown-bar">
            <div 
              className="countdown-progress"
              style={{
                animation: `countdown ${(timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds)}s linear forwards`
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}