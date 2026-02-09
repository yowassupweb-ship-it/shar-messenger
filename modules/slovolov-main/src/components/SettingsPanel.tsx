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

export default function SettingsPanel() {
  const [health, setHealth] = useState<HealthEnv | null>(null)
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null)
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>({ isValid: false, hasDeepseekKey: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="space-y-4">
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
