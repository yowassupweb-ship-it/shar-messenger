'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

interface AnalyticsData {
  utm_term: string
  date: string
  visits: number
  users: number
  pageviews: number
  bounceRate: number
}

interface Settings {
  metricaCounterId?: string
  metricaToken?: string
  metricaGoalId?: string
  goals?: { id: string; name: string }[]
}

interface Feed {
  id: string
  name: string
  slug?: string
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData[]>([])
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<Settings>({})
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedFeed, setSelectedFeed] = useState<string>('all')
  const [utmTemplates, setUtmTemplates] = useState<any[]>([])

  useEffect(() => {
    loadSettings()
    loadFeeds()
    loadUtmTemplates()
  }, [])

  const loadUtmTemplates = async () => {
    try {
      const response = await apiFetch('/api/utm-templates')
      if (response.ok) {
        const data = await response.json()
        setUtmTemplates(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки UTM шаблонов:', error)
    }
  }

  const loadFeeds = async () => {
    try {
      const response = await apiFetch('/api/feeds')
      if (response.ok) {
        const data = await response.json()
        setFeeds(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки фидов:', error)
    }
  }

  const loadSettings = async () => {
    try {
      const response = await apiFetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error)
    }
  }

  const saveSettings = async () => {
    try {
      const response = await apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      if (response.ok) {
        alert('Настройки сохранены')
        setShowSettings(false)
      }
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error)
    }
  }

  const loadAnalytics = async () => {
    if (!settings.metricaCounterId || !settings.metricaToken) {
      alert('Настройте Яндекс.Метрику в настройках')
      setShowSettings(true)
      return
    }

    try {
      setLoading(true)
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo
      })
      
      const response = await apiFetch(`/api/analytics/metrica?${params}`)
      if (response.ok) {
        let rawData = await response.json()
        
        // Функция для определения UTM параметров фида
        // ВАЖНО: Работает ТОЛЬКО если в фиде явно указан utmTemplateId
        // Никаких автоопределений по названию - это приводит к смешиванию трафика!
        const getFeedUtmTerms = (feed: any) => {
          const terms = new Set<string>()
          
          const templateId = feed.settings?.utmTemplateId
          if (templateId) {
            const template = utmTemplates.find(t => t.id === templateId)
            if (template) {
              terms.add(template.source)
              terms.add(template.medium)
              terms.add(template.campaign)
              if (template.term) terms.add(template.term)
              if (template.content) terms.add(template.content)
            }
          }
          
          return terms
        }
        
        // ЭТАП 1: ВХОДНОЙ ФИЛЬТР - собираем все UTM метки из всех фидов
        const allFeedUtmTerms = new Set<string>()
        
        feeds.forEach(feed => {
          const feedTerms = getFeedUtmTerms(feed)
          feedTerms.forEach(term => allFeedUtmTerms.add(term))
        })
        
        // ВАЖНО: Если ни в одном фиде нет utmTemplateId - показываем ПУСТОЙ результат
        // Это предотвращает смешивание трафика из разных источников
        const filteredData = allFeedUtmTerms.size === 0 
          ? [] 
          : rawData.filter((item: AnalyticsData) => allFeedUtmTerms.has(item.utm_term))
        
        // ЭТАП 2: Фильтрация по выбранной вкладке фида
        if (selectedFeed !== 'all') {
          const currentFeed = feeds.find(f => (f.slug || f.id) === selectedFeed)
          if (currentFeed) {
            const feedUtmTerms = getFeedUtmTerms(currentFeed)
            
            // Фильтруем из "Все" только UTM метки этого фида
            const feedData = filteredData.filter((item: AnalyticsData) =>
              feedUtmTerms.has(item.utm_term)
            )
            
            setData(feedData)
          } else {
            setData(filteredData)
          }
        } else {
          // Показываем все отфильтрованные данные ("Все" фиды)
          setData(filteredData)
        }
      } else {
        alert('Ошибка загрузки данных из Метрики')
      }
    } catch (error) {
      console.error('Ошибка загрузки аналитики:', error)
      alert('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  // Автозагрузка при открытии вкладки и смене фида
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && settings.metricaCounterId && settings.metricaToken) {
        loadAnalytics()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Загружаем данные при изменении настроек, дат или выбранного фида
    if (settings.metricaCounterId && settings.metricaToken && feeds.length > 0 && utmTemplates.length > 0) {
      loadAnalytics()
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [settings, dateFrom, dateTo, selectedFeed, feeds, utmTemplates])

  const groupedData = data.reduce((acc, item) => {
    if (!acc[item.utm_term]) {
      acc[item.utm_term] = {
        utm_term: item.utm_term,
        visits: 0,
        users: 0,
        pageviews: 0,
        bounceRate: 0,
        count: 0
      }
    }
    acc[item.utm_term].visits += item.visits
    acc[item.utm_term].users += item.users
    acc[item.utm_term].pageviews += item.pageviews
    acc[item.utm_term].bounceRate += item.bounceRate
    acc[item.utm_term].count += 1
    return acc
  }, {} as Record<string, any>)

  const aggregatedData = Object.values(groupedData).map((item: any) => ({
    ...item,
    bounceRate: item.bounceRate / item.count
  }))

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link href="/" className="text-[var(--button)] hover:underline">
          Инструменты
        </Link>
        <span className="text-[var(--foreground)] opacity-50">/</span>
        <Link href="/feed-editor" className="text-[var(--button)] hover:underline">
          Редактор фидов
        </Link>
        <span className="text-[var(--foreground)] opacity-50">/</span>
        <span className="text-[var(--foreground)]">Аналитика</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-2">
            Аналитика фидов
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            Статистика переходов и конверсий из Яндекс.Метрики
          </p>
        </div>
        
        <button
          onClick={() => setShowSettings(true)}
          className="bg-[var(--card)] border-2 border-[var(--border)] text-[var(--foreground)] px-4 py-2 rounded-lg hover:border-[var(--button)] transition-colors flex items-center gap-2"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Настройки
        </button>
      </div>

      {/* Feed Tabs */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedFeed('all')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              selectedFeed === 'all'
                ? 'bg-[var(--button)] text-white'
                : 'bg-[var(--card)] border-2 border-[var(--border)] text-[var(--foreground)] hover:border-[var(--button)]'
            }`}
          >
            Все фиды
          </button>
          {feeds.map((feed) => (
            <button
              key={feed.id}
              onClick={() => setSelectedFeed(feed.slug || feed.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                selectedFeed === (feed.slug || feed.id)
                  ? 'bg-[var(--button)] text-white'
                  : 'bg-[var(--card)] border-2 border-[var(--border)] text-[var(--foreground)] hover:border-[var(--button)]'
              }`}
            >
              {feed.name}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Дата начала
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Дата окончания
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={loadAnalytics}
              disabled={loading}
              className="w-full bg-[var(--button)] text-white px-4 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Загрузка...' : 'Обновить данные'}
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {aggregatedData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="card">
            <div className="text-sm text-[var(--foreground)] opacity-70 mb-1">Визиты</div>
            <div className="text-3xl font-bold text-[var(--foreground)]">
              {aggregatedData.reduce((sum, item) => sum + item.visits, 0).toLocaleString()}
            </div>
          </div>
          
          <div className="card">
            <div className="text-sm text-[var(--foreground)] opacity-70 mb-1">Посетители</div>
            <div className="text-3xl font-bold text-[var(--foreground)]">
              {aggregatedData.reduce((sum, item) => sum + item.users, 0).toLocaleString()}
            </div>
          </div>
          
          <div className="card">
            <div className="text-sm text-[var(--foreground)] opacity-70 mb-1">Просмотры</div>
            <div className="text-3xl font-bold text-[var(--foreground)]">
              {aggregatedData.reduce((sum, item) => sum + item.pageviews, 0).toLocaleString()}
            </div>
          </div>
          
          <div className="card">
            <div className="text-sm text-[var(--foreground)] opacity-70 mb-1">Отказы</div>
            <div className="text-3xl font-bold text-[var(--foreground)]">
              {(aggregatedData.reduce((sum, item) => sum + item.bounceRate, 0) / aggregatedData.length).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            Статистика по UTM меткам
          </h2>
          
          <div className="flex gap-1 bg-[var(--background)] border border-[var(--border)] rounded-lg p-1">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-2 rounded transition-colors flex items-center gap-2 ${viewMode === 'chart' ? 'bg-[var(--button)] text-white' : 'text-[var(--foreground)] hover:bg-[var(--hover)]'}`}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              График
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded transition-colors flex items-center gap-2 ${viewMode === 'table' ? 'bg-[var(--button)] text-white' : 'text-[var(--foreground)] hover:bg-[var(--hover)]'}`}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
                <line x1="15" y1="3" x2="15" y2="21"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="3" y1="15" x2="21" y2="15"/>
              </svg>
              Таблица
            </button>
          </div>
        </div>
        
        {aggregatedData.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto mb-4 opacity-50" width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-[var(--foreground)] opacity-70">
              {!settings.metricaCounterId || !settings.metricaToken
                ? 'Настройте Яндекс.Метрику для просмотра аналитики'
                : 'Нажмите "Обновить данные" для загрузки статистики'}
            </p>
          </div>
        ) : viewMode === 'chart' ? (
          <div className="space-y-4">
            {aggregatedData.slice(0, 10).map((item, index) => {
              const maxVisits = Math.max(...aggregatedData.map(d => d.visits))
              const width = (item.visits / maxVisits) * 100
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--foreground)] font-medium">{item.utm_term}</span>
                    <span className="text-[var(--foreground)] opacity-70">{item.visits.toLocaleString()} визитов</span>
                  </div>
                  <div className="w-full bg-[var(--background)] rounded-full h-8 overflow-hidden">
                    <div 
                      className="bg-[var(--button)] h-full rounded-full transition-all duration-500 flex items-center justify-end px-3"
                      style={{ width: `${width}%` }}
                    >
                      <span className="text-white text-xs font-medium">
                        {item.users.toLocaleString()} польз.
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-4 font-medium text-[var(--foreground)]">UTM Term</th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--foreground)]">Визиты</th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--foreground)]">Посетители</th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--foreground)]">Просмотры</th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--foreground)]">Отказы %</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedData.map((item, index) => (
                  <tr key={index} className="border-b border-[var(--border)] hover:bg-[var(--background)] transition-colors">
                    <td className="py-3 px-4 text-[var(--foreground)]">{item.utm_term}</td>
                    <td className="py-3 px-4 text-right text-[var(--foreground)]">{item.visits.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-[var(--foreground)]">{item.users.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-[var(--foreground)]">{item.pageviews.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-[var(--foreground)]">{item.bounceRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowSettings(false)}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">
              Настройки Яндекс.Метрики
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  ID счетчика
                </label>
                <input
                  type="text"
                  value={settings.metricaCounterId || ''}
                  onChange={(e) => setSettings({ ...settings, metricaCounterId: e.target.value })}
                  placeholder="12345678"
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  OAuth токен
                </label>
                <input
                  type="password"
                  value={settings.metricaToken || ''}
                  onChange={(e) => setSettings({ ...settings, metricaToken: e.target.value })}
                  placeholder="y0_AgA..."
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Цели (для отслеживания конверсий)
                </label>
                <div className="space-y-2 mb-2">
                  {(settings.goals || []).map((goal, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={goal.id}
                        onChange={(e) => {
                          const newGoals = [...(settings.goals || [])]
                          newGoals[index] = { ...goal, id: e.target.value }
                          setSettings({ ...settings, goals: newGoals })
                        }}
                        placeholder="ID цели"
                        className="w-32 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm"
                      />
                      <input
                        type="text"
                        value={goal.name}
                        onChange={(e) => {
                          const newGoals = [...(settings.goals || [])]
                          newGoals[index] = { ...goal, name: e.target.value }
                          setSettings({ ...settings, goals: newGoals })
                        }}
                        placeholder="Название"
                        className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm"
                      />
                      <button
                        onClick={() => {
                          const newGoals = (settings.goals || []).filter((_, i) => i !== index)
                          setSettings({ ...settings, goals: newGoals })
                        }}
                        className="px-3 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const newGoals = [...(settings.goals || []), { id: '', name: '' }]
                    setSettings({ ...settings, goals: newGoals })
                  }}
                  className="w-full px-3 py-2 bg-[var(--background)] border-2 border-dashed border-[var(--border)] rounded-lg text-[var(--foreground)] hover:border-[var(--button)] transition-colors text-sm"
                >
                  + Добавить цель
                </button>
              </div>

              <div className="bg-[var(--background)] p-3 rounded-lg border border-[var(--border)]">
                <p className="text-xs text-[var(--foreground)] opacity-70">
                  Получите OAuth токен в настройках Яндекс.Метрики. 
                  Цели используются для отслеживания конверсий (звонки, заявки, покупки).
                </p>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={saveSettings}
                className="flex-1 bg-[var(--button)] text-white py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors"
              >
                Сохранить
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] py-2 rounded-lg hover:bg-[var(--hover)] transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
