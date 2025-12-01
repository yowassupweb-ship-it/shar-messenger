'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { showToast } from '@/components/Toast'

interface Settings {
  general: {
    language: string
    theme: string
    autoSave: boolean
    notifications: boolean
  }
  api: {
    apiKey: string
    timeout: number
    retries: number
  }
  feeds: {
    defaultFormat: string
    autoUpdate: boolean
    updateInterval: number
  }
  export: {
    defaultFormat: string
    includeImages: boolean
    compression: boolean
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    general: {
      language: 'ru',
      theme: 'dark',
      autoSave: true,
      notifications: true
    },
    api: {
      apiKey: '',
      timeout: 30,
      retries: 3
    },
    feeds: {
      defaultFormat: 'xml',
      autoUpdate: false,
      updateInterval: 60
    },
    export: {
      defaultFormat: 'xlsx',
      includeImages: true,
      compression: true
    }
  })

  const [activeTab, setActiveTab] = useState<'general' | 'api' | 'feeds' | 'export'>('general')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const response = await apiFetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        // Merge server settings with defaults
        setSettings(prev => ({
          general: { ...prev.general, ...data.general },
          api: { ...prev.api, ...data.api },
          feeds: { ...prev.feeds, ...data.feeds },
          export: { ...prev.export, ...data.export }
        }))
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error)
      showToast('Ошибка загрузки настроек', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        showToast('Настройки сохранены', 'success')
      } else {
        showToast('Ошибка сохранения', 'error')
      }
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error)
      showToast('Ошибка сохранения', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = (section: keyof Settings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
  }

  const tabs = [
    { key: 'general', label: 'Общие', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    )},
    { key: 'api', label: 'API', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14,2 14,8 20,8"/>
        <path d="M12 18v-6"/>
        <path d="M9 15h6"/>
      </svg>
    )},
    { key: 'feeds', label: 'Фиды', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 11a9 9 0 0 1 9 9"/>
        <path d="M4 4a16 16 0 0 1 16 16"/>
        <circle cx="5" cy="19" r="1"/>
      </svg>
    )},
    { key: 'export', label: 'Экспорт', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7,10 12,15 17,10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    )}
  ]

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            Настройки
          </h1>
          <p className="text-[var(--muted)]">
            Конфигурация системы и настройки приложения
          </p>
        </div>

        <div className="flex space-x-6">
          {/* Боковое меню */}
          <div className="w-64 bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                    activeTab === tab.key
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--foreground)] hover:bg-[var(--muted)] hover:bg-opacity-20'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Содержимое */}
          <div className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                  Общие настройки
                </h2>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Язык интерфейса
                  </label>
                  <select
                    value={settings.general.language}
                    onChange={(e) => updateSetting('general', 'language', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Тема
                  </label>
                  <select
                    value={settings.general.theme}
                    onChange={(e) => updateSetting('general', 'theme', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="dark">Темная</option>
                    <option value="light">Светлая</option>
                    <option value="auto">Автоматически</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[var(--foreground)]">Автосохранение</div>
                    <div className="text-sm text-[var(--muted)]">Автоматически сохранять изменения</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.general.autoSave}
                    onChange={(e) => updateSetting('general', 'autoSave', e.target.checked)}
                    className="w-4 h-4 text-[var(--primary)] bg-[var(--background)] border-[var(--border)] rounded focus:ring-[var(--primary)]"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[var(--foreground)]">Уведомления</div>
                    <div className="text-sm text-[var(--muted)]">Получать уведомления о событиях</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.general.notifications}
                    onChange={(e) => updateSetting('general', 'notifications', e.target.checked)}
                    className="w-4 h-4 text-[var(--primary)] bg-[var(--background)] border-[var(--border)] rounded focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                  Настройки API
                </h2>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    API ключ
                  </label>
                  <input
                    type="password"
                    value={settings.api.apiKey}
                    onChange={(e) => updateSetting('api', 'apiKey', e.target.value)}
                    placeholder="Введите ваш API ключ"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Таймаут (секунды)
                  </label>
                  <input
                    type="number"
                    value={settings.api.timeout}
                    onChange={(e) => updateSetting('api', 'timeout', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Количество повторов
                  </label>
                  <input
                    type="number"
                    value={settings.api.retries}
                    onChange={(e) => updateSetting('api', 'retries', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
            )}

            {activeTab === 'feeds' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                  Настройки фидов
                </h2>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Формат по умолчанию
                  </label>
                  <select
                    value={settings.feeds.defaultFormat}
                    onChange={(e) => updateSetting('feeds', 'defaultFormat', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="xml">XML</option>
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[var(--foreground)]">Автообновление</div>
                    <div className="text-sm text-[var(--muted)]">Автоматически обновлять фиды</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.feeds.autoUpdate}
                    onChange={(e) => updateSetting('feeds', 'autoUpdate', e.target.checked)}
                    className="w-4 h-4 text-[var(--primary)] bg-[var(--background)] border-[var(--border)] rounded focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Интервал обновления (минуты)
                  </label>
                  <input
                    type="number"
                    value={settings.feeds.updateInterval}
                    onChange={(e) => updateSetting('feeds', 'updateInterval', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                  Настройки экспорта
                </h2>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Формат экспорта по умолчанию
                  </label>
                  <select
                    value={settings.export.defaultFormat}
                    onChange={(e) => updateSetting('export', 'defaultFormat', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="xlsx">Excel (XLSX)</option>
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                    <option value="xml">XML</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[var(--foreground)]">Включать изображения</div>
                    <div className="text-sm text-[var(--muted)]">Экспортировать ссылки на изображения</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.export.includeImages}
                    onChange={(e) => updateSetting('export', 'includeImages', e.target.checked)}
                    className="w-4 h-4 text-[var(--primary)] bg-[var(--background)] border-[var(--border)] rounded focus:ring-[var(--primary)]"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[var(--foreground)]">Сжатие файлов</div>
                    <div className="text-sm text-[var(--muted)]">Архивировать экспортированные файлы</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.export.compression}
                    onChange={(e) => updateSetting('export', 'compression', e.target.checked)}
                    className="w-4 h-4 text-[var(--primary)] bg-[var(--background)] border-[var(--border)] rounded focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
            )}

            {/* Кнопка сохранения */}
            <div className="mt-8 pt-6 border-t border-[var(--border)]">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-[var(--primary)] text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}