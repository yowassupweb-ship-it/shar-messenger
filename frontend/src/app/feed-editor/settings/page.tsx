'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'

interface UpdateSettings {
  updateAvailability: boolean
  updatePhotos: boolean
  updateRoutes: boolean
  updateLinks: boolean
  availabilityCheckIntervalHours: number
  yandexMetricaCounterId: string
  yandexMetricaToken: string
  conversionGoalIds: string[]
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UpdateSettings>({
    updateAvailability: true,
    updatePhotos: false,
    updateRoutes: false,
    updateLinks: false,
    availabilityCheckIntervalHours: 24,
    yandexMetricaCounterId: '',
    yandexMetricaToken: '',
    conversionGoalIds: []
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await apiFetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(prev => ({ ...prev, ...data }))
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error)
    }
  }

  const handleCheckboxChange = (field: keyof UpdateSettings) => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handleIntervalChange = (value: string) => {
    const hours = parseInt(value)
    if (!isNaN(hours) && hours > 0) {
      setSettings(prev => ({
        ...prev,
        availabilityCheckIntervalHours: hours
      }))
    }
  }

  const handleSave = async () => {
    try {
      const response = await apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error)
    }
  }

  const handleGoalIdsChange = (value: string) => {
    // Разделяем по запятым и убираем пробелы
    const ids = value.split(',').map(id => id.trim()).filter(id => id !== '')
    setSettings(prev => ({ ...prev, conversionGoalIds: ids }))
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href="/feed-editor" className="inline-flex items-center gap-1 text-[var(--button)] hover:text-[var(--button-hover)] transition-colors mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад
          </Link>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Настройки</h1>
        </div>

        {/* Правила обновления товаров */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            Правила обновления товаров
          </h2>
          <p className="text-sm text-[var(--foreground)] opacity-70 mb-6">
            Выберите, какие данные должны обновляться при синхронизации с источником
          </p>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.updateAvailability}
                onChange={() => handleCheckboxChange('updateAvailability')}
                className="w-5 h-5 rounded border-[var(--border)] text-[var(--button)] focus:ring-[var(--button)] focus:ring-offset-0"
              />
              <div>
                <div className="font-medium text-[var(--foreground)]">Наличие товара</div>
                <div className="text-sm text-[var(--foreground)] opacity-70">
                  Проверять доступность товаров (404 ошибки)
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.updatePhotos}
                onChange={() => handleCheckboxChange('updatePhotos')}
                className="w-5 h-5 rounded border-[var(--border)] text-[var(--button)] focus:ring-[var(--button)] focus:ring-offset-0"
              />
              <div>
                <div className="font-medium text-[var(--foreground)]">Фотографии</div>
                <div className="text-sm text-[var(--foreground)] opacity-70">
                  Обновлять ссылки на изображения товаров
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.updateRoutes}
                onChange={() => handleCheckboxChange('updateRoutes')}
                className="w-5 h-5 rounded border-[var(--border)] text-[var(--button)] focus:ring-[var(--button)] focus:ring-offset-0"
              />
              <div>
                <div className="font-medium text-[var(--foreground)]">Маршруты</div>
                <div className="text-sm text-[var(--foreground)] opacity-70">
                  Обновлять информацию о маршрутах туров
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.updateLinks}
                onChange={() => handleCheckboxChange('updateLinks')}
                className="w-5 h-5 rounded border-[var(--border)] text-[var(--button)] focus:ring-[var(--button)] focus:ring-offset-0"
              />
              <div>
                <div className="font-medium text-[var(--foreground)]">Ссылки</div>
                <div className="text-sm text-[var(--foreground)] opacity-70">
                  Обновлять ссылки на страницы товаров
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Интервал проверки наличия */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            Интервал проверки наличия
          </h2>
          <p className="text-sm text-[var(--foreground)] opacity-70 mb-6">
            Как часто проверять доступность товаров (если включено обновление наличия)
          </p>

          <div className="max-w-xs">
            <label className="block mb-2 text-sm font-medium text-[var(--foreground)]">
              Проверять каждые (часов)
            </label>
            <input
              type="number"
              min="1"
              value={settings.availabilityCheckIntervalHours}
              onChange={(e) => handleIntervalChange(e.target.value)}
              disabled={!settings.updateAvailability}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)] disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-2 text-sm text-[var(--foreground)] opacity-70">
              {settings.availabilityCheckIntervalHours === 24
                ? 'Ежедневная проверка'
                : settings.availabilityCheckIntervalHours < 24
                ? `Проверка ${settings.availabilityCheckIntervalHours} раз${settings.availabilityCheckIntervalHours === 1 ? '' : 'а'} в день`
                : `Проверка каждые ${Math.round(settings.availabilityCheckIntervalHours / 24)} ${settings.availabilityCheckIntervalHours / 24 === 1 ? 'день' : 'дня/дней'}`
              }
            </p>
          </div>
        </div>

        {/* Настройки Яндекс.Метрики */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            Яндекс.Метрика
          </h2>
          <p className="text-sm text-[var(--foreground)] opacity-70 mb-6">
            Настройка интеграции с Яндекс.Метрикой для сбора аналитики по UTM меткам
          </p>

          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-[var(--foreground)]">
                ID счётчика
              </label>
              <input
                type="text"
                value={settings.yandexMetricaCounterId}
                onChange={(e) => setSettings(prev => ({ ...prev, yandexMetricaCounterId: e.target.value }))}
                placeholder="488267"
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-[var(--foreground)]">
                OAuth токен
              </label>
              <input
                type="password"
                value={settings.yandexMetricaToken}
                onChange={(e) => setSettings(prev => ({ ...prev, yandexMetricaToken: e.target.value }))}
                placeholder="y0_..."
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
              />
              <p className="mt-1 text-xs text-[var(--foreground)] opacity-60">
                Получить токен можно на{' '}
                <a
                  href="https://oauth.yandex.ru/authorize?response_type=token&client_id=c35e94f5ad1d44f19a587ae76ce761d0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--button)] hover:underline"
                >
                  странице OAuth Яндекса
                </a>
              </p>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-[var(--foreground)]">
                ID целей для конверсий (через запятую)
              </label>
              <input
                type="text"
                value={settings.conversionGoalIds.join(', ')}
                onChange={(e) => handleGoalIdsChange(e.target.value)}
                placeholder="123456, 789012"
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
              />
              <p className="mt-1 text-xs text-[var(--foreground)] opacity-60">
                Укажите ID целей в Метрике для отслеживания звонков и других конверсий
              </p>
            </div>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-[var(--button)] text-white rounded-lg hover:bg-[var(--button-hover)] transition-colors"
          >
            Сохранить настройки
          </button>
          {saved && (
            <span className="text-green-600 text-sm flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Настройки сохранены
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
