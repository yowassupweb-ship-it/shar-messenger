'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiUrl } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [telegramCode, setTelegramCode] = useState<string | null>(null)
  const [telegramLoading, setTelegramLoading] = useState(false)
  const [checkingTelegram, setCheckingTelegram] = useState(false)

  // Генерация кода для Telegram авторизации
  const generateTelegramCode = async () => {
    setTelegramLoading(true)
    try {
      const res = await fetch('/api/auth/telegram/generate-code', {
        method: 'POST'
      })
      if (res.ok) {
        const data = await res.json()
        setTelegramCode(data.code)
      }
    } catch (error) {
      console.error('Error generating telegram code:', error)
    } finally {
      setTelegramLoading(false)
    }
  }

  // Проверка статуса авторизации через Telegram
  useEffect(() => {
    if (!telegramCode) return
    
    const checkAuth = async () => {
      setCheckingTelegram(true)
      try {
        const res = await fetch(`/api/auth/telegram/check?code=${telegramCode}`)
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated) {
            localStorage.setItem('isAuthenticated', 'true')
            localStorage.setItem('username', data.user.username)
            localStorage.setItem('userRole', data.user.role)
            // Сохраняем Telegram ID для использования при создании пользователя
            if (data.user.telegramId) {
              localStorage.setItem('telegramId', data.user.telegramId)
            }
            if (data.user.telegramUsername) {
              localStorage.setItem('telegramUsername', data.user.telegramUsername)
            }
            router.push('/')
          }
        }
      } catch (error) {
        console.error('Error checking telegram auth:', error)
      } finally {
        setCheckingTelegram(false)
      }
    }

    // Проверяем каждые 3 секунды
    const interval = setInterval(checkAuth, 3000)
    return () => clearInterval(interval)
  }, [telegramCode, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const loginUrl = await apiUrl('/api/auth/login')
      console.log('Attempting login to', loginUrl)
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      console.log('Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Login successful:', data)
        localStorage.setItem('isAuthenticated', 'true')
        localStorage.setItem('username', data.user.username)
        localStorage.setItem('userRole', data.user.role)
        router.push('/')
      } else {
        const errorText = await response.text()
        console.error('Login failed:', response.status, errorText)
        setError('Неверный логин или пароль')
        setTimeout(() => setError(''), 3000)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Ошибка подключения к серверу. Проверьте, что бэкенд запущен на порту 8000')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen h-screen flex items-center justify-center p-3 md:p-6 overflow-y-auto bg-[#09101d]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full blur-3xl opacity-35" style={{ background: 'radial-gradient(circle, #1e3a8a 0%, transparent 70%)' }} />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle, #0ea5e9 0%, transparent 72%)' }} />
      </div>

      <div className="w-full md:max-w-md h-full md:h-auto md:my-auto relative z-10">
        <div className="h-full md:h-auto rounded-3xl p-6 md:p-9 flex flex-col justify-center shadow-2xl" style={{
          background: 'linear-gradient(165deg, rgba(17, 24, 39, 0.95) 0%, rgba(10, 14, 25, 0.96) 100%)',
          border: '1px solid rgba(148, 163, 184, 0.24)'
        }}>
          <div className="text-center mb-6 md:mb-8 select-none">
            <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Shar OS</h1>
            <p className="mt-2 text-sm md:text-base text-slate-300/80">Вход в систему</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#e0e0e0] mb-2">
                Логин
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 md:py-3.5 rounded-xl text-[15px] md:text-base text-slate-100 placeholder-slate-400/60 transition-all"
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(148, 163, 184, 0.26)',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#38bdf8';
                  e.target.style.boxShadow = '0 0 0 3px rgba(56, 189, 248, 0.16)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(148, 163, 184, 0.26)';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Введите логин"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#e0e0e0] mb-2">
                Пароль
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 md:py-3.5 rounded-xl text-[15px] md:text-base text-slate-100 placeholder-slate-400/60 transition-all"
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(148, 163, 184, 0.26)',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#38bdf8';
                  e.target.style.boxShadow = '0 0 0 3px rgba(56, 189, 248, 0.16)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(148, 163, 184, 0.26)';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Введите пароль"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3.5 md:py-3 rounded-xl font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.32), 0 1px 0 rgba(255, 255, 255, 0.25) inset'
              }}
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>

            {/* Разделитель */}
            <div className="relative my-3 md:my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 text-slate-400" style={{ background: 'rgba(12, 18, 33, 0.94)' }}>или</span>
              </div>
            </div>

            {/* Telegram авторизация */}
            {!telegramCode ? (
              <button
                type="button"
                onClick={generateTelegramCode}
                disabled={telegramLoading}
                className="w-full py-3.5 md:py-3 rounded-xl font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
                  boxShadow: '0 8px 20px rgba(8, 145, 178, 0.32), 0 1px 0 rgba(255, 255, 255, 0.22) inset'
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                {telegramLoading ? 'Загрузка...' : 'Войти через Telegram'}
              </button>
            ) : (
              <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(0, 136, 204, 0.1)', border: '1px solid rgba(0, 136, 204, 0.3)' }}>
                <p className="text-[#0088cc] text-sm mb-3">Отправьте этот код боту:</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <code className="text-2xl font-mono font-bold text-white tracking-widest">{telegramCode}</code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(telegramCode)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Копировать код"
                  >
                    <svg className="w-4 h-4 text-[#0088cc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <a 
                  href={`https://t.me/vstools_bot?start=${telegramCode}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm transition-all hover:-translate-y-0.5"
                  style={{ background: '#0088cc' }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  Открыть бота @vstools_bot
                </a>
                {checkingTelegram && (
                  <p className="text-xs text-[#666] mt-3 animate-pulse">Ожидание подтверждения...</p>
                )}
                <button
                  type="button"
                  onClick={() => setTelegramCode(null)}
                  className="block w-full text-sm text-[#666] hover:text-white mt-4 py-2 transition-colors"
                >
                  Отмена
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}