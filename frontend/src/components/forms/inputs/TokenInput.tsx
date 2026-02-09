'use client'

import { useState } from 'react'

interface TokenInputProps {
  onTokenChange: (token: string) => void
  token?: string
}

export function TokenInput({ onTokenChange, token: initialToken = '' }: TokenInputProps) {
  const [token, setToken] = useState(initialToken)
  const [showToken, setShowToken] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (token.trim()) {
      onTokenChange(token.trim())
    }
  }

  return (
    <div className="glass-card p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--glass-text-primary)' }}>
          OAuth токен Яндекс Вордстат
        </h2>
      </div>
      
      <div className="mb-4" style={{ color: 'var(--glass-text-secondary)' }}>
        <p className="mb-3 text-sm">
          Для работы с API Yandex Wordstat необходим OAuth токен.
        </p>
        <div className="text-xs space-y-1">
          <p>1. <a 
            href="https://oauth.yandex.ru/authorize?response_type=token&client_id=82a20235437d4a79a23d03760a20ca83" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="glass-button px-2 py-1 ml-1"
          >
            Получить токен
          </a></p>
          <p>2. Скопируйте access_token из URL</p>
          <p>3. Вставьте токен в поле ниже</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="token" className="block text-sm font-medium mb-2" style={{ color: 'var(--glass-text-primary)' }}>
            OAuth токен
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="glass-input w-full pr-10"
              placeholder="Введите OAuth токен..."
              required
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              style={{ color: 'var(--glass-text-tertiary)' }}
            >
              {showToken ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464m1.414 1.414L8.464 8.464m0 0L7.05 7.05M9.88 9.88l4.24 4.24" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          className="glass-button-primary w-full"
        >
          Установить токен
        </button>
      </form>
    </div>
  )
}