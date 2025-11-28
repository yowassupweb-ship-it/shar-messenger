'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import Link from 'next/link'
import { showToast } from '@/components/Toast'

interface User {
  id: string
  name?: string
  username?: string
  email?: string
  password?: string
  role: 'admin' | 'user'
  enabledTools?: string[]
  createdAt: string
}

interface Tool {
  id: string
  name: string
  description: string
  path: string
}

const availableTools: Tool[] = [
  {
    id: 'feed-editor',
    name: 'Редактор фидов',
    description: 'Управление фидами для Яндекс.Директ',
    path: '/feed-editor'
  },
  {
    id: 'transliterator',
    name: 'Транслитератор',
    description: 'Транслитерация текста',
    path: '/transliterator'
  },
  {
    id: 'competitor-parser',
    name: 'Парсер Я.Директ',
    description: 'Анализ и извлечение данных из рекламы конкурентов',
    path: '/competitor-parser'
  },
  {
    id: 'slovolov',
    name: 'Словолов',
    description: 'Подбор поисковых слов и ключевых фраз для рекламных кампаний',
    path: '/slovolov'
  },
  {
    id: 'competitor-spy',
    name: 'Товары конкурентов',
    description: 'Парсинг и анализ ассортимента конкурентов по датам',
    path: '/competitor-parser'
  },
  {
    id: 'utm-creator',
    name: 'Генератор UTM',
    description: 'Создание и отслеживание UTM меток с помощью Я.Метрики',
    path: '/utm-generator'
  }
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'logs'>('settings')
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showToolsModal, setShowToolsModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [dbStats, setDbStats] = useState({
    size: '',
    lastModified: '',
    counts: {
      logs: 0,
      feeds: 0,
      products: 0,
      dataSources: 0,
      chatSessions: 0,
      aiPresets: 0
    }
  })
  const [settings, setSettings] = useState({
    metricaCounterId: '',
    metricaToken: '',
    wordstatToken: '',
    wordstatClientId: '',
    deepseekApiKey: '',
    deepseekModel: '',
    deepseekMaxTokens: '',
    deepseekTemperature: '',
    telegramBotToken: '',
    telegramChatId: '',
    telegramNotifications: false
  })
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user'
  })

  useEffect(() => {
    loadUsers()
    loadSettings()
    loadDbStats()
  }, [])

  const loadDbStats = async () => {
    try {
      const response = await fetch('/api/admin/database-stats')
      if (response.ok) {
        const data = await response.json()
        setDbStats(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики БД:', error)
    }
  }

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings({
          metricaCounterId: data.metricaCounterId || '',
          metricaToken: data.metricaToken || '',
          wordstatToken: data.wordstatToken || '',
          wordstatClientId: data.wordstatClientId || '',
          deepseekApiKey: data.deepseekApiKey || '',
          deepseekModel: data.deepseekModel || 'deepseek-chat',
          deepseekMaxTokens: data.deepseekMaxTokens || '4096',
          deepseekTemperature: data.deepseekTemperature || '0.7',
          telegramBotToken: data.telegramBotToken || '',
          telegramChatId: data.telegramChatId || '',
          telegramNotifications: data.telegramNotifications || false
        })
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error)
    }
  }

  const saveSettings = async () => {
    try {
      setSavingSettings(true)
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        showToast('Настройки сохранены', 'success')
      } else {
        showToast('Ошибка сохранения настроек', 'error')
      }
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error)
      showToast('Ошибка сохранения настроек', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        showToast('Ошибка загрузки пользователей', 'error')
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error)
      showToast('Ошибка подключения к серверу', 'error')
    } finally {
      setLoading(false)
    }
  }

  const createUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      showToast('Заполните все поля', 'warning')
      return
    }

    try {
      const response = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })

      if (response.ok) {
        showToast('Пользователь создан', 'success')
        setShowUserModal(false)
        setNewUser({ name: '', email: '', password: '', role: 'user' })
        loadUsers()
      } else {
        showToast('Ошибка создания пользователя', 'error')
      }
    } catch (error) {
      console.error('Ошибка создания пользователя:', error)
      showToast('Ошибка создания пользователя', 'error')
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Удалить пользователя?')) return

    try {
      const response = await apiFetch(`/api/users/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showToast('Пользователь удален', 'success')
        loadUsers()
      } else {
        showToast('Ошибка удаления пользователя', 'error')
      }
    } catch (error) {
      console.error('Ошибка удаления пользователя:', error)
      showToast('Ошибка удаления пользователя', 'error')
    }
  }

  const toggleTool = async (userId: string, toolId: string) => {
    try {
      const user = users.find(u => u.id === userId)
      if (!user) return

      const currentTools = user.enabledTools || []
      const enabledTools = currentTools.includes(toolId)
        ? currentTools.filter(t => t !== toolId)
        : [...currentTools, toolId]

      const response = await apiFetch(`/api/users/${userId}/tools`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledTools })
      })

      if (response.ok) {
        showToast('Доступ обновлен', 'success')
        loadUsers()
        setShowToolsModal(false)
        setSelectedUser(null)
      } else {
        showToast('Ошибка обновления доступа', 'error')
      }
    } catch (error) {
      console.error('Ошибка обновления доступа:', error)
      showToast('Ошибка обновления доступа', 'error')
    }
  }

  const openToolsModal = (user: User) => {
    setSelectedUser(user)
    setShowToolsModal(true)
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-[var(--button)] hover:underline mb-2 inline-flex items-center gap-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Назад на главную
            </Link>
            <h1 className="text-4xl font-bold text-[var(--foreground)] mb-2">
              Панель администратора
            </h1>
            <p className="text-[var(--foreground)] opacity-70">
              Управление системой и настройками
            </p>
            
            {/* Database Stats */}
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                <span className="text-[var(--foreground)] opacity-70">Размер БД:</span>
                <span className="font-semibold text-[var(--foreground)]">{dbStats.size || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-[var(--foreground)] opacity-70">Логов:</span>
                <span className="font-semibold text-[var(--foreground)]">{dbStats.counts.logs}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                <span className="text-[var(--foreground)] opacity-70">Фидов:</span>
                <span className="font-semibold text-[var(--foreground)]">{dbStats.counts.feeds}</span>
              </div>
            </div>
          </div>

          {activeTab === 'users' && (
            <button
              onClick={() => setShowUserModal(true)}
              className="px-6 py-3 bg-[var(--button)] text-white rounded-lg hover:bg-[var(--button)]/90 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Добавить пользователя
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-[var(--border)]">
            <nav className="flex gap-8">
              <button
                onClick={() => setActiveTab('settings')}
                className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'border-[var(--button)] text-[var(--button)]'
                    : 'border-transparent text-[var(--foreground)] opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Настройки ENV
                </div>
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                  activeTab === 'users'
                    ? 'border-[var(--button)] text-[var(--button)]'
                    : 'border-transparent text-[var(--foreground)] opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Пользователи
                </div>
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                  activeTab === 'logs'
                    ? 'border-[var(--button)] text-[var(--button)]'
                    : 'border-transparent text-[var(--foreground)] opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Все логи
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="card mb-8">
          <div className="p-6 border-b border-[var(--border)]">
            <h2 className="text-2xl font-bold text-[var(--foreground)]">Глобальные настройки ENV</h2>
            <p className="text-sm text-[var(--foreground)] opacity-70 mt-1">
              Настройки API ключей и интеграций
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Яндекс.Метрика */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Яндекс.Метрика
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    ID счетчика
                  </label>
                  <input
                    type="text"
                    value={settings.metricaCounterId}
                    onChange={(e) => setSettings({...settings, metricaCounterId: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                    placeholder="12345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    OAuth токен
                  </label>
                  <input
                    type="password"
                    value={settings.metricaToken}
                    onChange={(e) => setSettings({...settings, metricaToken: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                    placeholder="y0_..."
                  />
                </div>
              </div>
            </div>

            {/* Yandex Wordstat */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Yandex Wordstat API
              </h3>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  OAuth токен
                </label>
                <input
                  type="password"
                  value={settings.wordstatToken}
                  onChange={(e) => setSettings({...settings, wordstatToken: e.target.value})}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                  placeholder="AgA..."
                />
                <p className="text-xs text-[var(--foreground)] opacity-50 mt-1">
                  Получите токен в <a href="https://oauth.yandex.ru/" target="_blank" rel="noopener noreferrer" className="text-[var(--button)] hover:underline">Яндекс.OAuth</a>
                </p>
              </div>
            </div>

            {/* DeepSeek AI */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                DeepSeek AI
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    API ключ
                  </label>
                  <input
                    type="password"
                    value={settings.deepseekApiKey}
                    onChange={(e) => setSettings({...settings, deepseekApiKey: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                    placeholder="sk-..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Модель
                  </label>
                  <select
                    value={settings.deepseekModel}
                    onChange={(e) => setSettings({...settings, deepseekModel: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                  >
                    <option value="deepseek-chat">deepseek-chat</option>
                    <option value="deepseek-reasoner">deepseek-reasoner</option>
                  </select>
                  <p className="text-xs text-[var(--foreground)] opacity-50 mt-1">
                    Модель для генерации ответов
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Макс. токенов
                  </label>
                  <input
                    type="number"
                    value={settings.deepseekMaxTokens}
                    onChange={(e) => setSettings({...settings, deepseekMaxTokens: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                    placeholder="4096"
                    min="100"
                    max="32000"
                  />
                  <p className="text-xs text-[var(--foreground)] opacity-50 mt-1">
                    Максимальная длина ответа (100-32000)
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Температура: {settings.deepseekTemperature}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      value={settings.deepseekTemperature}
                      onChange={(e) => setSettings({...settings, deepseekTemperature: e.target.value})}
                      className="flex-1 h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer slider"
                      min="0"
                      max="2"
                      step="0.1"
                    />
                    <span className="text-sm font-mono text-[var(--foreground)] w-12 text-center">
                      {parseFloat(settings.deepseekTemperature).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--foreground)] opacity-50 mt-1">
                    <span>Точнее (0.0)</span>
                    <span>Креативнее (2.0)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Telegram Bot */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Telegram уведомления
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Bot Token
                  </label>
                  <input
                    type="password"
                    value={settings.telegramBotToken}
                    onChange={(e) => setSettings({...settings, telegramBotToken: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                    placeholder="123456789:ABC..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Chat ID
                  </label>
                  <input
                    type="text"
                    value={settings.telegramChatId}
                    onChange={(e) => setSettings({...settings, telegramChatId: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                    placeholder="-1001234567890"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.telegramNotifications}
                  onChange={(e) => setSettings({...settings, telegramNotifications: e.target.checked})}
                  className="w-5 h-5 text-[var(--button)] bg-[var(--background)] border-[var(--border)] rounded focus:ring-2 focus:ring-[var(--button)]"
                />
                <span className="text-sm text-[var(--foreground)]">
                  Включить отправку уведомлений в Telegram
                </span>
              </label>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-[var(--border)]">
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="px-6 py-3 bg-[var(--button)] text-white rounded-lg hover:bg-[var(--button)]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingSettings ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Сохранение...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Сохранить настройки
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">Управление пользователями</h2>
            </div>

            {/* Users Table */}
            {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--button)]"></div>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-[var(--background)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="px-6 py-4 text-left text-sm font-medium text-[var(--foreground)]">Пользователь</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[var(--foreground)]">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[var(--foreground)]">Роль</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[var(--foreground)]">Доступные инструменты</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[var(--foreground)]">Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const displayName = user.name || user.username || 'Без имени'
                  return (
                  <tr key={user.id} className="border-b border-[var(--border)] hover:bg-[var(--background)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--button)] flex items-center justify-center text-white font-semibold">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-[var(--foreground)]">{displayName}</div>
                          <div className="text-xs text-[var(--foreground)] opacity-50">
                            ID: {user.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--foreground)]">
                      {user.email || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-500/20 text-purple-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.enabledTools?.map(toolId => {
                          const tool = availableTools.find(t => t.id === toolId)
                          return tool ? (
                            <span key={toolId} className="px-2 py-1 bg-[var(--button)]/20 text-[var(--button)] text-xs rounded">
                              {tool.name}
                            </span>
                          ) : null
                        })}
                        {(!user.enabledTools || user.enabledTools.length === 0) && (
                          <span className="text-xs text-[var(--foreground)] opacity-50">Нет доступа</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openToolsModal(user)}
                          className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors"
                          title="Управление доступом"
                        >
                          <svg className="w-5 h-5 text-[var(--foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                          </svg>
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Удалить"
                          >
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
          </>
        )}

        {/* Create User Modal */}
        {showUserModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg max-w-md w-full shadow-2xl">
              <div className="p-6 border-b border-[var(--border)]">
                <h2 className="text-2xl font-bold text-[var(--foreground)]">
                  Создать пользователя
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Имя
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                    placeholder="Введите имя"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Пароль
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Роль
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value as 'admin' | 'user'})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                  >
                    <option value="user">Пользователь</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={createUser}
                    className="flex-1 bg-[var(--button)] text-white px-6 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors"
                  >
                    Создать
                  </button>
                  <button
                    onClick={() => {
                      setShowUserModal(false)
                      setNewUser({ name: '', email: '', password: '', role: 'user' })
                    }}
                    className="px-6 py-2 border border-[var(--border)] rounded-lg text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tools Access Modal */}
        {showToolsModal && selectedUser && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg max-w-lg w-full shadow-2xl">
              <div className="p-6 border-b border-[var(--border)]">
                <h2 className="text-2xl font-bold text-[var(--foreground)]">
                  Управление доступом
                </h2>
                <p className="text-sm text-[var(--foreground)] opacity-70 mt-1">
                  {selectedUser.name || selectedUser.username || 'Пользователь'}
                </p>
              </div>

              <div className="p-6 space-y-3">
                {availableTools.map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-center justify-between p-4 bg-[var(--background)] rounded-lg hover:border hover:border-[var(--button)] transition-all"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-[var(--foreground)]">{tool.name}</h3>
                      <p className="text-sm text-[var(--foreground)] opacity-60">{tool.description}</p>
                    </div>
                    <button
                      onClick={() => toggleTool(selectedUser.id, tool.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        selectedUser.enabledTools?.includes(tool.id)
                          ? 'bg-[var(--button)]'
                          : 'bg-[var(--border)]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          selectedUser.enabledTools?.includes(tool.id) ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => {
                    setShowToolsModal(false)
                    setSelectedUser(null)
                  }}
                  className="w-full mt-4 px-6 py-2 border border-[var(--border)] rounded-lg text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <LogsTab />
        )}
      </div>
    </div>
  )
}

interface Log {
  id: string
  timestamp: string
  type: string
  message: string
  details?: any
  status: 'success' | 'error' | 'warning' | 'info'
}

function LogsTab() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/logs')
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
      showToast('Ошибка при загрузке логов', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    if (filterType !== 'all' && log.type !== filterType) return false
    if (filterStatus !== 'all' && log.status !== filterStatus) return false
    return true
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="card">
      <div className="p-6 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[var(--foreground)]">Все логи</h2>
            <p className="text-sm text-[var(--foreground)] opacity-70 mt-1">
              Журнал событий системы
            </p>
          </div>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-[var(--button)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Обновить
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Тип
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
            >
              <option value="all">Все типы</option>
              <option value="collection">Коллекции</option>
              <option value="feed">Фиды</option>
              <option value="parser">Парсер</option>
              <option value="system">Система</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Статус
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
            >
              <option value="all">Все статусы</option>
              <option value="success">Успех</option>
              <option value="error">Ошибка</option>
              <option value="warning">Предупреждение</option>
              <option value="info">Информация</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[var(--button)] border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-[var(--foreground)] opacity-70">Загрузка логов...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--foreground)] opacity-70">Логи не найдены</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 p-4 bg-[var(--background)] rounded-lg border border-[var(--border)] hover:shadow-md transition-shadow"
              >
                {getStatusIcon(log.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {log.type}
                    </span>
                    <span className="text-xs text-[var(--foreground)] opacity-50">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--foreground)] opacity-80 mb-2">
                    {log.message}
                  </p>
                  {log.details && (
                    <details className="text-xs text-[var(--foreground)] opacity-60">
                      <summary className="cursor-pointer hover:opacity-100">Подробности</summary>
                      <pre className="mt-2 p-2 bg-[var(--card)] rounded overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

