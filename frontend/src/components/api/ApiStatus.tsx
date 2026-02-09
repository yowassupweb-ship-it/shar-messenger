'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'

export default function ApiStatus() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const checkAccess = async () => {
    setStatus('checking')
    try {
      const response = await fetch('/api/yandex-wordstat/user-info', {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        // Используем правильную структуру данных от Yandex API
        const userInfo = data.userInfo
        const rpsLimit = userInfo?.limitPerSecond || 'неизвестно'
        const dailyLimit = userInfo?.dailyLimit || 'неизвестно'
        const remaining = userInfo?.dailyLimitRemaining || 'неизвестно'
        
        setMessage(`Доступ к API подтвержден. Лимиты: ${rpsLimit}/сек, ${dailyLimit}/день. Осталось: ${remaining}`)
      } else {
        setStatus('error')
        setMessage(data.error || 'Неизвестная ошибка')
      }
    } catch (error) {
      setStatus('error')
      setMessage(`Ошибка запроса: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  return (
    <div className="space-y-6">
      <div 
        className="p-6 rounded-xl"
        style={{ backgroundColor: 'var(--apple-bg-tertiary)', border: '1px solid var(--apple-border)' }}
      >
        <div className="flex items-start space-x-4">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--apple-orange)' }}
          >
            <Info className="h-4 w-4 text-white" />
          </div>
          <div className="text-sm" style={{ color: 'var(--apple-text-secondary)' }}>
            <div className="flex items-center space-x-2 mb-3">
              <svg className="w-4 h-4" style={{ color: 'var(--apple-orange)' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="font-semibold" style={{ color: 'var(--apple-text-primary)' }}>
                Требуется новый токен
              </p>
            </div>
            <p className="mb-3">
              У вас новый ClientID: <code 
                className="px-2 py-1 rounded-md text-xs font-mono"
                style={{ backgroundColor: 'var(--apple-bg-secondary)', color: 'var(--apple-text-primary)' }}
              >
                82a20235437d4a79a23d03760a20ca83
              </code>
            </p>
            <p className="mb-4">Старый токен не будет работать с новым ClientID. Получите новый токен:</p>
            <ol className="space-y-2">
              <li className="flex items-center space-x-3">
                <span 
                  className="w-5 h-5 rounded-full text-xs flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: 'var(--apple-blue)' }}
                >
                  1
                </span>
                <a 
                  href="https://oauth.yandex.ru/authorize?response_type=token&client_id=82a20235437d4a79a23d03760a20ca83" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="apple-button inline-flex items-center px-3 py-1 text-sm space-x-2"
                >
                  <span>Получить новый токен</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </li>
              <li className="flex items-center space-x-3">
                <span 
                  className="w-5 h-5 rounded-full text-xs flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: 'var(--apple-blue)' }}
                >
                  2
                </span>
                <span>Авторизуйтесь через Яндекс ID</span>
              </li>
              <li className="flex items-center space-x-3">
                <span 
                  className="w-5 h-5 rounded-full text-xs flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: 'var(--apple-blue)' }}
                >
                  3
                </span>
                <span>Разрешите доступ к API Вордстата</span>
              </li>
              <li className="flex items-center space-x-3">
                <span 
                  className="w-5 h-5 rounded-full text-xs flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: 'var(--apple-blue)' }}
                >
                  4
                </span>
                <span>Скопируйте токен из URL (параметр access_token)</span>
              </li>
              <li className="flex items-center space-x-3">
                <span 
                  className="w-5 h-5 rounded-full text-xs flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: 'var(--apple-blue)' }}
                >
                  5
                </span>
                <span>Введите новый токен в поле выше</span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      <button
        onClick={checkAccess}
        disabled={status === 'checking'}
        className="apple-button w-full px-4 py-3 font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
      >
        {status === 'checking' ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Проверяем доступ...</span>
          </>
        ) : (
          <span>Проверить доступ к API</span>
        )}
      </button>

      {status !== 'idle' && (
        <div 
          className="p-6 rounded-xl flex items-start space-x-4"
          style={{ 
            backgroundColor: status === 'success' ? 'var(--apple-bg-green)' : 'var(--apple-bg-red)',
            border: `1px solid ${status === 'success' ? 'var(--apple-green)' : 'var(--apple-red)'}`
          }}
        >
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: status === 'success' ? 'var(--apple-green)' : 'var(--apple-red)' }}
          >
            {status === 'success' ? (
              <CheckCircle className="h-4 w-4 text-white" />
            ) : (
              <AlertCircle className="h-4 w-4 text-white" />
            )}
          </div>
          <div className="text-sm" style={{ color: 'var(--apple-text-primary)' }}>
            <p className="whitespace-pre-line">{message}</p>
          </div>
        </div>
      )}
    </div>
  )
}