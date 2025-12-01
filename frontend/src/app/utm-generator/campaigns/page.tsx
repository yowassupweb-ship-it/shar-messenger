'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { showToast } from '@/components/Toast'
import { 
  RefreshCw, TrendingUp, Users, Eye, 
  ChevronDown, ChevronRight, ExternalLink, Target
} from 'lucide-react'

interface Campaign {
  source: string
  medium: string
  campaign: string
  visits: number
  users: number
  pageviews: number
  bounceRate: number
  avgDuration: number
  conversions?: number
}

interface SourceData {
  visits: number
  users: number
  campaigns: string[]
  campaignCount: number
}

interface CampaignsData {
  campaigns: Campaign[]
  sources: Record<string, SourceData>
  totals: {
    visits: number
    users: number
    pageviews: number
    conversions?: number
  }
}

export default function CampaignsPage() {
  const [data, setData] = useState<CampaignsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [filterSource, setFilterSource] = useState<string>('')
  const [filterMedium, setFilterMedium] = useState<string>('')
  
  // Expanded sources
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      
      const response = await apiFetch(`/api/analytics/campaigns?${params}`)
      
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Ошибка загрузки')
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки данных'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
    showToast('Данные обновлены', 'success')
  }

  const toggleSource = (source: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev)
      if (next.has(source)) {
        next.delete(source)
      } else {
        next.add(source)
      }
      return next
    })
  }

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get unique values
  const uniqueSources = data ? Object.keys(data.sources).sort() : []
  const uniqueMediums = data 
    ? [...new Set(data.campaigns.map(c => c.medium))].filter(Boolean).sort()
    : []

  // Filter campaigns
  const filteredCampaigns = data?.campaigns.filter(c => {
    const matchesSource = !filterSource || c.source === filterSource
    const matchesMedium = !filterMedium || c.medium === filterMedium
    return matchesSource && matchesMedium
  }) || []

  // Group by source
  const campaignsBySource = filteredCampaigns.reduce((acc, c) => {
    if (!acc[c.source]) acc[c.source] = []
    acc[c.source].push(c)
    return acc
  }, {} as Record<string, Campaign[]>)

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Кампании из Метрики</h1>
          <p className="text-sm opacity-60 mt-1">Статистика UTM-кампаний из Яндекс.Метрики</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={refreshData}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>
      </div>

      {/* Date Range & Filters */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1 opacity-70">Дата с</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-field w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 opacity-70">Дата по</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-field w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 opacity-70">Источник</label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="input-field w-full text-sm"
            >
              <option value="">Все источники</option>
              {uniqueSources.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 opacity-70">Тип трафика</label>
            <select
              value={filterMedium}
              onChange={(e) => setFilterMedium(e.target.value)}
              className="input-field w-full text-sm"
            >
              <option value="">Все типы</option>
              {uniqueMediums.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button 
            onClick={loadData}
            className="btn-primary text-sm"
          >
            Применить
          </button>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Target className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredCampaigns.length}</p>
                <p className="text-xs opacity-60">Кампаний</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Eye className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totals.visits.toLocaleString()}</p>
                <p className="text-xs opacity-60">Визитов</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totals.users.toLocaleString()}</p>
                <p className="text-xs opacity-60">Посетителей</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Object.keys(data.sources).length}</p>
                <p className="text-xs opacity-60">Источников</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--button)] border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-sm opacity-60">Загрузка данных из Метрики...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400 mb-3">{error}</p>
          <p className="text-sm opacity-60 mb-4">
            Убедитесь, что Яндекс.Метрика настроена в настройках приложения
          </p>
          <button onClick={loadData} className="btn-secondary">
            Попробовать снова
          </button>
        </div>
      ) : !data || filteredCampaigns.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <h3 className="font-medium mb-2">Нет данных о кампаниях</h3>
          <p className="text-sm opacity-60">Попробуйте изменить период или фильтры</p>
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          {/* Table Header - Sticky */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-[var(--card)] text-xs font-medium opacity-70 border-b border-[var(--border)] sticky top-0 z-10">
            <div className="col-span-4">Источник / Кампания</div>
            <div className="col-span-2">Medium</div>
            <div className="text-right">Визиты</div>
            <div className="text-right">Посетители</div>
            <div className="text-right">Просмотры</div>
            <div className="text-right">Отказы</div>
            <div className="text-right">Время</div>
          </div>

          {/* Sources & Campaigns - Scrollable */}
          <div className="max-h-[600px] overflow-y-auto">
          {Object.entries(campaignsBySource).map(([source, campaigns]) => {
            const isExpanded = expandedSources.has(source)
            const sourceData = data?.sources[source]
            const sourceTotals = campaigns.reduce(
              (acc, c) => ({
                visits: acc.visits + c.visits,
                users: acc.users + c.users,
                pageviews: acc.pageviews + c.pageviews
              }),
              { visits: 0, users: 0, pageviews: 0 }
            )

            return (
              <div key={source} className="border-b border-[var(--border)] last:border-b-0">
                {/* Source Row */}
                <div 
                  className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-[var(--background)]/30 cursor-pointer items-center"
                  onClick={() => toggleSource(source)}
                >
                  <div className="col-span-4 flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    ) : (
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    )}
                    <span className="font-medium">{source || '(не задано)'}</span>
                    <span className="text-xs opacity-50 bg-[var(--background)] px-2 py-0.5 rounded">
                      {campaigns.length} кампаний
                    </span>
                  </div>
                  <div className="col-span-2 text-sm opacity-60">—</div>
                  <div className="text-right font-medium">{sourceTotals.visits.toLocaleString()}</div>
                  <div className="text-right text-sm">{sourceTotals.users.toLocaleString()}</div>
                  <div className="text-right text-sm">{sourceTotals.pageviews.toLocaleString()}</div>
                  <div className="text-right text-sm">—</div>
                  <div className="text-right text-sm">—</div>
                </div>

                {/* Campaign Rows */}
                {isExpanded && campaigns.map((campaign, idx) => (
                  <div 
                    key={`${campaign.source}-${campaign.medium}-${campaign.campaign}-${idx}`}
                    className="grid grid-cols-12 gap-4 px-4 py-2 bg-[var(--background)]/20 border-t border-[var(--border)]/50 items-center"
                  >
                    <div className="col-span-4 pl-6 text-sm flex items-center gap-2">
                      {(campaign.conversions || 0) > 0 && (
                        <span 
                          className="w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-green-500/20 text-green-400 rounded-full cursor-help"
                          title={`Конверсий: ${campaign.conversions}`}
                        >
                          {campaign.conversions}
                        </span>
                      )}
                      <span className="opacity-80">{campaign.campaign || '(не задано)'}</span>
                    </div>
                    <div className="col-span-2 text-xs">
                      <span className="px-2 py-0.5 bg-[var(--background)] rounded opacity-70">
                        {campaign.medium || '(none)'}
                      </span>
                    </div>
                    <div className="text-right text-sm">{campaign.visits.toLocaleString()}</div>
                    <div className="text-right text-sm opacity-70">{campaign.users.toLocaleString()}</div>
                    <div className="text-right text-sm opacity-70">{campaign.pageviews.toLocaleString()}</div>
                    <div className="text-right text-sm opacity-70">{campaign.bounceRate}%</div>
                    <div className="text-right text-sm opacity-70">{formatDuration(campaign.avgDuration)}</div>
                  </div>
                ))}
              </div>
            )
          })}
          </div>
        </div>
      )}
    </div>
  )
}
