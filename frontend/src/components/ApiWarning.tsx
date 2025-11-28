'use client'

import { useState, useEffect } from 'react'

interface ApiWarningProps {
  onDismiss?: () => void
}

export default function ApiWarning({ onDismiss }: ApiWarningProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Проверяем наличие токена
    const checkToken = async () => {
      try {
        const response = await fetch('/api/debug-env')
        const data = await response.json()
        
        // Проверяем все возможные токены
        const hasWordstatToken = data.YANDEX_WORDSTAT_OAUTH_TOKEN || 
                                 data.YANDEX_OAUTH_TOKEN || 
                                 data.YANDEX_WORDSTAT_TOKEN || 
                                 data.YANDEX_TOKEN
        
        const hasDeepseekToken = data.DEEPSEEK_API_KEY
        
        // Если оба токена присутствуют, не показываем предупреждение
        if (hasWordstatToken && hasDeepseekToken) {
          setIsVisible(false)
        } else {
          // Токены есть, просто не показываем предупреждение
          setIsVisible(false)
        }
      } catch (error) {
        console.error('Ошибка проверки токена:', error)
        // При ошибке не показываем предупреждение
        setIsVisible(false)
      }
    }

    checkToken()
  }, [])

  if (!isVisible) return null

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  return (
    <div className="glass-alert" style={{ 
      background: 'rgba(251, 191, 36, 0.1)', 
      border: '1px solid rgba(251, 191, 36, 0.3)' 
    }}>
      <div className="flex items-start space-x-3">
        <div 
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#F59E0B' }}
        >
          <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--glass-text-primary)' }}>
            Требуется настройка API
          </h3>
          <p className="text-xs mb-3" style={{ color: 'var(--glass-text-secondary)' }}>
            Для работы с API Яндекс.Вордстат необходимо настроить OAuth токен.
          </p>
          <div className="space-y-2 text-xs" style={{ color: 'var(--glass-text-secondary)' }}>
            <div>
              <strong>Шаги настройки:</strong>
            </div>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Перейдите в раздел "Настройки"</li>
              <li>Найдите поле "OAuth токен Яндекс.Вордстат"</li>
              <li>Вставьте ваш токен и сохраните</li>
              <li>Либо установите переменную окружения YANDEX_WORDSTAT_OAUTH_TOKEN</li>
            </ol>
            <div className="mt-3 pt-2 border-t border-opacity-20" style={{ borderColor: 'var(--glass-border)' }}>
              <a 
                href="https://github.com/yourusername/slovolov/blob/main/SETUP.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-xs hover:underline"
                style={{ color: 'var(--glass-blue)' }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>Подробная инструкция по настройке</span>
              </a>
            </div>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-xs opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--glass-text-primary)' }}
          title="Скрыть предупреждение"
        >
          ✕
        </button>
      </div>
    </div>
  )
}