'use client'

import { useState, useEffect } from 'react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface TokenStatus {
  isValid: boolean
  hasDeepseekKey: boolean
  error?: string
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>({ isValid: false, hasDeepseekKey: false })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      checkTokenStatus()
    }
  }, [isOpen])

  const checkTokenStatus = async () => {
    setLoading(true)
    try {
      // Проверяем статус токена через API health endpoint
      const response = await fetch('/api/health')
      const data = await response.json()
      
      // Проверяем наличие deepseek ключа в переменных окружения
      const hasDeepseekKey = !!process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || 
                            (typeof window !== 'undefined' && !!localStorage.getItem('deepseek_api_key'))
      
      setTokenStatus({
        isValid: response.ok && data.status === 'ok',
        hasDeepseekKey,
        error: response.ok ? undefined : data.error
      })
    } catch (error) {
      setTokenStatus({
        isValid: false,
        hasDeepseekKey: false,
        error: 'Ошибка проверки статуса'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 p-6 glass-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: 'var(--glass-text-primary)' }}>
            Настройки системы
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'var(--glass-text-secondary)' }}
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Статус токенов */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--glass-text-primary)' }}>
              Статус токенов
            </h3>
            
            <div className="space-y-3">
              {/* Yandex Wordstat API */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${tokenStatus.isValid ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span style={{ color: 'var(--glass-text-primary)' }}>
                    Yandex Wordstat API
                  </span>
                </div>
                <span className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                  {loading ? 'Проверка...' : tokenStatus.isValid ? 'Активен' : 'Недоступен'}
                </span>
              </div>

              {/* Deepseek API */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${tokenStatus.hasDeepseekKey ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span style={{ color: 'var(--glass-text-primary)' }}>
                    Deepseek API (AI Chat)
                  </span>
                </div>
                <span className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                  {tokenStatus.hasDeepseekKey ? 'Настроен' : 'Не настроен'}
                </span>
              </div>
            </div>

            {tokenStatus.error && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{tokenStatus.error}</p>
              </div>
            )}
          </div>

          {/* Лимиты API */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--glass-text-primary)' }}>
              Лимиты API
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-blue-400 mb-1">10/сек</div>
                <div className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                  Запросов в секунду
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-green-400 mb-1">1000/день</div>
                <div className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                  Запросов в день
                </div>
              </div>
            </div>
          </div>

          {/* Переменные окружения */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--glass-text-primary)' }}>
              Переменные окружения
            </h3>
            
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-white/5">
                <div className="font-mono text-sm mb-1" style={{ color: 'var(--glass-text-primary)' }}>
                  YANDEX_WORDSTAT_TOKEN
                </div>
                <div className="text-xs" style={{ color: 'var(--glass-text-secondary)' }}>
                  Токен для доступа к API Yandex Wordstat
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-white/5">
                <div className="font-mono text-sm mb-1" style={{ color: 'var(--glass-text-primary)' }}>
                  NEXT_PUBLIC_DEEPSEEK_API_KEY
                </div>
                <div className="text-xs" style={{ color: 'var(--glass-text-secondary)' }}>
                  API ключ для Deepseek AI (используется для чата)
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-white/5">
                <div className="font-mono text-sm mb-1" style={{ color: 'var(--glass-text-primary)' }}>
                  CLIENT_ID
                </div>
                <div className="text-xs" style={{ color: 'var(--glass-text-secondary)' }}>
                  ID клиента Yandex: 82a20235437d4a79a23d03760a20ca83
                </div>
              </div>
            </div>
          </div>

          {/* Кнопка обновления статуса */}
          <div className="pt-4 border-t border-white/10">
            <button
              onClick={checkTokenStatus}
              disabled={loading}
              className="glass-button px-4 py-2 disabled:opacity-50"
            >
              {loading ? 'Проверка...' : 'Обновить статус'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}