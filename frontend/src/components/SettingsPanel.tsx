'use client'

import { useEffect, useState } from 'react'

interface HealthEnv {
  status: string
  timestamp: string
  service: string
  environment: Record<string, any>
}

interface AISettings {
  temperature: number
  maxTokens: number
  model: string
  systemPrompt?: string
}

interface TokenStatus {
  isValid: boolean
  hasDeepseekKey: boolean
  error?: string
}

interface AdminSettings {
  wordstatToken?: string
  wordstatClientId?: string
  deepseekApiKey?: string
  deepseekModel?: string
  deepseekMaxTokens?: string
  deepseekTemperature?: string
}

export default function SettingsPanel() {
  const [health, setHealth] = useState<HealthEnv | null>(null)
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null)
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({})
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>({ isValid: false, hasDeepseekKey: false })
  const [saving, setSaving] = useState(false)
  const [savingAdmin, setSavingAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null)

  const checkTokenStatus = async () => {
    try {
      // Проверяем статус Yandex API через health endpoint
      const healthResponse = await fetch('/api/health')
      const healthData = await healthResponse.json()
      
      // Проверяем наличие deepseek ключа из environment объекта
      const hasDeepseekKey = !!(
        healthData.environment?.deepseekKey?.present
      )
      
      setTokenStatus({
        isValid: healthResponse.ok && healthData.status === 'ok',
        hasDeepseekKey,
        error: healthResponse.ok ? undefined : healthData.error
      })
    } catch (error) {
      setTokenStatus({
        isValid: false,
        hasDeepseekKey: false,
        error: 'Ошибка проверки статуса'
      })
    }
  }

  useEffect(() => {
    // Загружаем health информацию
    fetch('/api/health')
      .then(res => res.json())
      .then(setHealth)
      .catch((e) => {
        console.error('Failed to load /api/health', e)
        setError('Не удалось загрузить информацию об окружении')
      })

    // Загружаем AI настройки
    fetch('/api/ai-settings')
      .then(res => res.json())
      .then(data => setAiSettings(data.settings))
      .catch((e) => console.error('Failed to load ai settings', e))

    // Загружаем admin настройки (токены)
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => setAdminSettings(data))
      .catch((e) => console.error('Failed to load admin settings', e))

    // Проверяем статус токенов
    checkTokenStatus()
  }, [])

  const handleChange = (key: keyof AISettings, value: any) => {
    setAiSettings(prev => prev ? { ...prev, [key]: value } : prev)
  }

  const saveSettings = async () => {
    if (!aiSettings) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiSettings)
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Ошибка сохранения')
      }
      setAiSettings(data.settings)
    } catch (e: any) {
      console.error('Save error', e)
      setError(e.message || 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  const saveAdminSettings = async () => {
    setSavingAdmin(true)
    setAdminError(null)
    setAdminSuccess(null)

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminSettings)
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Ошибка сохранения')
      }
      setAdminSuccess('Настройки успешно сохранены')
      // Обновляем статус токенов после сохранения
      setTimeout(() => {
        checkTokenStatus()
        setAdminSuccess(null)
      }, 2000)
    } catch (e: any) {
      console.error('Save admin settings error', e)
      setAdminError(e.message || 'Ошибка сохранения')
    } finally {
      setSavingAdmin(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Конфигурация Yandex Wordstat */}
      <div className="glass-card p-4 border-l-4 border-blue-500">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          OAuth токен Яндекс.Вордстат
        </h3>
        
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-sm mb-3" style={{ color: 'var(--glass-text-primary)' }}>
              Для работы с API Яндекс.Вордстат необходимо:
            </p>
            <ol className="text-sm space-y-2 ml-4 list-decimal" style={{ color: 'var(--glass-text-secondary)' }}>
              <li>Получить OAuth токен из Яндекс OAuth (<a href="https://oauth.yandex.ru" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">oauth.yandex.ru</a>)</li>
              <li>Подать заявку на доступ к API Wordstat в поддержку Яндекс Директа</li>
              <li>Вставить токен в поле ниже и сохранить</li>
            </ol>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--glass-text-primary)' }}>
              OAuth токен
            </label>
            <input 
              type="password"
              className="glass-input w-full font-mono text-sm" 
              value={adminSettings.wordstatToken || ''} 
              onChange={(e) => setAdminSettings({...adminSettings, wordstatToken: e.target.value})}
              placeholder="y0_AgA...токен"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--glass-text-secondary)' }}>
              Токен сохраняется в database.json и имеет приоритет над переменными окружения
            </p>
          </div>

          {adminError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{adminError}</p>
            </div>
          )}

          {adminSuccess && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-400">{adminSuccess}</p>
            </div>
          )}

          <button 
            onClick={saveAdminSettings} 
            disabled={savingAdmin}
            className="glass-button-primary px-6 py-2"
          >
            {savingAdmin ? 'Сохранение...' : 'Сохранить токен'}
          </button>
        </div>
      </div>

      {/* Статус токенов */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Статус API токенов</h3>
          <button
            onClick={checkTokenStatus}
            className="glass-button px-3 py-1 text-sm"
          >
            Обновить
          </button>
        </div>
        
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
              {tokenStatus.isValid ? 'Активен' : 'Недоступен'}
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
      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold mb-4">Лимиты API</h3>
        
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

      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold">Переменные окружения</h3>
        {health ? (
          <div className="mt-3 space-y-3">
            {Object.entries(health.environment).map(([key, val]) => (
              <div key={key} className="p-3 rounded-lg bg-white/5">
                <div className="font-mono text-sm mb-1" style={{ color: 'var(--glass-text-primary)' }}>
                  {key}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--glass-text-secondary)' }}>
                    {val.name}
                  </span>
                  <span className={`px-2 py-1 rounded ${val.present ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {val.present ? 'Настроен' : 'Отсутствует'}
                  </span>
                </div>
                {val.fallback && (
                  <div className="text-xs mt-1" style={{ color: 'var(--glass-text-secondary)' }}>
                    Fallback: {String(val.fallback)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div>Загрузка...</div>
        )}
      </div>

      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold">AI настройки</h3>
        {aiSettings ? (
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <label className="block text-xs">Model</label>
              <input className="glass-input w-full" value={aiSettings.model} onChange={(e) => handleChange('model', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs">Temperature</label>
              <input className="glass-input w-full" type="number" step="0.1" min="0" max="2" value={aiSettings.temperature} onChange={(e) => handleChange('temperature', Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs">Max tokens</label>
              <input className="glass-input w-full" type="number" value={aiSettings.maxTokens} onChange={(e) => handleChange('maxTokens', Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs">System prompt</label>
              <textarea className="glass-input w-full" rows={4} value={aiSettings.systemPrompt} onChange={(e) => handleChange('systemPrompt', e.target.value)} />
            </div>

            {error && <div className="text-sm text-red-500">{error}</div>}

            <div className="flex gap-2">
              <button onClick={saveSettings} disabled={saving} className="glass-button-primary px-4 py-2">
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        ) : (
          <div>Загрузка AI настроек...</div>
        )}
      </div>
    </div>
  )
}
