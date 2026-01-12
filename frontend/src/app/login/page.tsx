'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiUrl } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0f0f0f' }}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl p-8" style={{
          background: '#1a1a1a',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div className="text-center mb-8">
            <p className="text-[#e0e0e0] opacity-70">
              Вход в систему
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#e0e0e0] mb-2">
                Логин
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-[#e0e0e0] placeholder-[#666] transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4a9eff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(74, 158, 255, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
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
                className="w-full px-4 py-3 rounded-xl text-[#e0e0e0] placeholder-[#666] transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4a9eff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(74, 158, 255, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
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
              className="w-full text-white py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #4a9eff 0%, #3b82f6 100%)',
                boxShadow: '0 2px 8px rgba(74, 158, 255, 0.3), 0 1px 0 rgba(255, 255, 255, 0.2) inset'
              }}
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}