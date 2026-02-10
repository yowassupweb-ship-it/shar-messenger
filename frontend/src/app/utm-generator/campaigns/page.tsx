'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { showToast } from '@/components/Toast'
import { StyledSelect } from '@/components/StyledSelect'
import { 
  RefreshCw, TrendingUp, Users, Eye, DollarSign,
  ChevronDown, ChevronRight, ExternalLink, Target, Search, Calendar
} from 'lucide-react'

interface Campaign {
  source: string
  medium: string
  campaign: string
  term?: string
  content?: string
  visits: number
  users: number
  pageviews: number
  bounceRate: number
  revenue?: number
  avgDuration: number
  conversions?: number
  goalsBreakdown?: Record<string, number>
}

interface SourceData {
  visits: number
  users: number
  conversions?: number
  goalsBreakdown?: Record<string, number>
  bounceRate?: number
  avgDuration?: number
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
  goalNames?: Record<string, string>
}

// Основные конверсионные цели для отображения
const GOAL_NAMES: Record<string, string> = {
  "301950976": "ЗАКАЗ (страница успеха)",
  "485406426": "Ecommerce: покупка",
  "484029889": "CRM: заявка получена",
  "484029963": "CRM: Внесена предоплата",
  "484009486": "CRM: Заказ создан",
  "484009487": "CRM: Заказ оплачен",
  "260679148": "Купить - в карточке",
  "260679473": "Купить - из прочих мест",
  "222378141": "On-line заявка: ОДН",
  "222378195": "On-line заявка: МНОГ",
  "222378242": "On-line заявка: ЖД",
  "484037544": "Нажал купить на странице тура",
  "484037649": "Перешел на создание заказа"
}

const panelStyle = {
  background: '#1a1a1a',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3), 0 0 0 0.5px rgba(255, 255, 255, 0.1) inset, 0 1px 0 0 rgba(255, 255, 255, 0.15) inset'
}

const buttonStyle = {
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset'
}

export default function CampaignsPage() {
  const [data, setData] = useState<CampaignsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [filterSource, setFilterSource] = useState<string>('')
  const [filterMedium, setFilterMedium] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const uniqueSources = data ? Object.keys(data.sources).sort() : []
  const uniqueMediums = data 
    ? [...new Set(data.campaigns.map(c => c.medium))].filter(Boolean).sort()
    : []

  const filteredCampaigns = data?.campaigns.filter(c => {
    const matchesSource = !filterSource || c.source === filterSource
    const matchesMedium = !filterMedium || c.medium === filterMedium
    const matchesSearch = !searchQuery || 
      c.campaign?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.source?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.term?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSource && matchesMedium && matchesSearch
  }) || []

  const campaignsBySource = filteredCampaigns.reduce((acc, c) => {
    if (!acc[c.source]) acc[c.source] = []
    acc[c.source].push(c)
    return acc
  }, {} as Record<string, Campaign[]>)

  return (
    <div className="h-full flex p-4 gap-4">
      {/* Левая панель - Фильтры */}
      <div 
        className="w-72 rounded-2xl border border-white/10 overflow-hidden flex flex-col"
        style={panelStyle}
      >
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/60">Фильтры</span>
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white/80 transition-colors"
              style={buttonStyle}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Поиск */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск кампаний..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-white/30"
            />
          </div>

          {/* Период */}
          <div className="space-y-2 mb-3">
            <label className="block text-[10px] text-white/40">Период</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50"
              />
            </div>
          </div>

          {/* Источник */}
          <div className="space-y-2 mb-3">
            <label className="block text-[10px] text-white/40">Источник</label>
            <StyledSelect
              value={filterSource}
              onChange={setFilterSource}
              options={[{ value: '', label: 'Все источники' }, ...uniqueSources.map(s => ({ value: s, label: s }))]}
              placeholder="Все источники"
            />
          </div>

          {/* Medium */}
          <div className="space-y-2 mb-3">
            <label className="block text-[10px] text-white/40">Тип трафика</label>
            <StyledSelect
              value={filterMedium}
              onChange={setFilterMedium}
              options={[{ value: '', label: 'Все типы' }, ...uniqueMediums.map(m => ({ value: m, label: m }))]}
              placeholder="Все типы"
            />
          </div>

          <button
            onClick={loadData}
            className="w-full px-4 py-2 rounded-lg bg-white/10 text-white text-xs hover:bg-white/15 transition-colors border border-white/10"
            style={buttonStyle}
          >
            Применить
          </button>
        </div>

        {/* Список источников */}
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-[10px] text-white/40 px-2 mb-2">Источники</p>
          {uniqueSources.map(source => {
            const sourceData = data?.sources[source]
            return (
              <button
                key={source}
                onClick={() => setFilterSource(filterSource === source ? '' : source)}
                className={`w-full px-3 py-2 rounded-lg text-left text-xs transition-colors mb-1 ${
                  filterSource === source 
                    ? 'bg-white/10 text-white border border-white/10' 
                    : 'text-white/70 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{source}</span>
                  <span className="text-[10px] text-white/40">
                    {sourceData?.visits.toLocaleString() || 0}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Правая панель - Данные */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Статистика */}
        {data && (
          <div className="grid grid-cols-5 gap-3">
            <div className="rounded-2xl border border-white/10 p-4" style={panelStyle}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredCampaigns.length}</p>
                  <p className="text-[10px] text-white/50">Кампаний</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 p-4" style={panelStyle}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.totals.visits.toLocaleString()}</p>
                  <p className="text-[10px] text-white/50">Визитов</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 p-4" style={panelStyle}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.totals.users.toLocaleString()}</p>
                  <p className="text-[10px] text-white/50">Посетителей</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 p-4" style={panelStyle}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Object.keys(data.sources).length}</p>
                  <p className="text-[10px] text-white/50">Источников</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 p-4" style={panelStyle}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{(data.totals.conversions || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-white/50">Конверсий</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Таблица кампаний */}
        <div 
          className="flex-1 rounded-2xl border border-white/10 overflow-hidden flex flex-col"
          style={panelStyle}
        >
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#4a9eff] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <Target className="w-12 h-12 mx-auto mb-4 text-red-400/50" />
                <p className="text-red-400 mb-2">{error}</p>
                <p className="text-sm text-white/40 mb-4">
                  Убедитесь, что Яндекс.Метрика настроена
                </p>
                <button 
                  onClick={loadData} 
                  className="px-4 py-2 rounded-lg bg-white/5 text-white/70 text-sm hover:bg-white/10 transition-colors"
                  style={buttonStyle}
                >
                  Попробовать снова
                </button>
              </div>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <Target className="w-12 h-12 mx-auto mb-4 text-white/20" />
                <h3 className="font-medium mb-2 text-white/70">Нет данных о кампаниях</h3>
                <p className="text-sm text-white/40">Попробуйте изменить период или фильтры</p>
              </div>
            </div>
          ) : (
            <>
              {/* Заголовок таблицы */}
              <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1.5fr] gap-2 px-4 py-3 border-b border-white/10 text-[10px] text-white/50 font-medium sticky top-0 bg-[#1a1a1a] z-20">
                <div>Кампания</div>
                <div>Source / Medium</div>
                <div className="text-right">Визиты</div>
                <div className="text-right">Юзеры</div>
                <div className="text-right">Просм.</div>
                <div className="text-right">Отказы</div>
                <div className="text-right">Время</div>
                <div className="text-right">Конверсии</div>
                <div className="text-right">Доход</div>
                <div>Term</div>
              </div>

              {/* Данные */}
              <div className="flex-1 overflow-y-auto">
                {Object.entries(campaignsBySource).map(([source, campaigns]) => (
                  <div key={source}>
                    {/* Группа источника */}
                    <button
                      onClick={() => toggleSource(source)}
                      className="w-full grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1.5fr] gap-2 px-4 py-2.5 bg-white/5 border-b border-white/5 text-xs hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {expandedSources.has(source) ? (
                          <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                        )}
                        <span className="font-medium text-[#4a9eff]">{source}</span>
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] text-white/50">
                          {campaigns.length}
                        </span>
                      </div>
                      <div></div>
                      <div className="text-right text-white/70">
                        {campaigns.reduce((s, c) => s + c.visits, 0).toLocaleString()}
                      </div>
                      <div className="text-right text-white/70">
                        {campaigns.reduce((s, c) => s + c.users, 0).toLocaleString()}
                      </div>
                      <div className="text-right text-white/70">
                        {campaigns.reduce((s, c) => s + c.pageviews, 0).toLocaleString()}
                      </div>
                      <div className="text-right">
                        {(() => {
                          const sourceData = data?.sources?.[source];
                          const br = sourceData?.bounceRate || 0;
                          return (
                            <span className={br > 50 ? 'text-orange-400' : 'text-green-400'}>
                              {br.toFixed(1)}%
                            </span>
                          );
                        })()}
                      </div>
                      <div className="text-right text-white/50">
                        {(() => {
                          const sourceData = data?.sources?.[source];
                          return formatDuration(sourceData?.avgDuration || 0);
                        })()}
                      </div>
                      <div className="text-right flex justify-end">
                        {(() => {
                          const sourceData = data?.sources?.[source];
                          const goalsBreakdown = sourceData?.goalsBreakdown || {};
                          // Считаем сумму только отображаемых целей (которые есть в GOAL_NAMES)
                          const displayedGoals = Object.entries(goalsBreakdown).filter(([goalId, count]) => GOAL_NAMES[goalId] && (count as number) > 0);
                          const totalDisplayed = displayedGoals.reduce((s, [, count]) => s + (count as number), 0);
                          return totalDisplayed > 0 ? (
                            <div 
                              className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center cursor-help group relative"
                            >
                              <span className="text-[10px] text-green-400 font-bold">{totalDisplayed > 99 ? '99+' : totalDisplayed}</span>
                              <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-[#1a1a1a] border border-white/20 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[200] whitespace-nowrap max-h-[400px] overflow-y-auto" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                                <p className="text-xs font-medium text-white mb-2">Конверсии по целям</p>
                                {displayedGoals.map(([goalId, count]) => {
                                  const goalName = GOAL_NAMES[goalId];
                                  return (
                                    <p key={goalId} className="text-[11px] text-white/70">
                                      {goalName}: <span className="text-green-400 font-medium">{(count as number).toLocaleString()}</span>
                                    </p>
                                  );
                                })}
                                <div className="border-t border-white/10 mt-2 pt-2">
                                  <p className="text-[11px] text-white/70">Всего: <span className="text-green-400 font-medium">{totalDisplayed.toLocaleString()}</span></p>
                                </div>
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <div className="text-right">
                        {(() => {
                          const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
                          return totalRevenue > 0 ? (
                            <span className="text-yellow-400 font-medium">{totalRevenue.toLocaleString()} ₽</span>
                          ) : <span className="text-white/30">-</span>;
                        })()}
                      </div>
                      <div></div>
                    </button>

                    {/* Кампании источника */}
                    {expandedSources.has(source) && campaigns.map((campaign, idx) => (
                      <div
                        key={`${source}-${idx}`}
                        className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1.5fr] gap-2 px-4 py-2 border-b border-white/5 text-xs hover:bg-white/5 transition-colors"
                      >
                        <div className="pl-6">
                          <p className="text-white/90 truncate">{campaign.campaign || '(без названия)'}</p>
                        </div>
                        <div className="text-white/50">
                          {campaign.medium}
                        </div>
                        <div className="text-right text-white/70">{campaign.visits.toLocaleString()}</div>
                        <div className="text-right text-white/70">{campaign.users.toLocaleString()}</div>
                        <div className="text-right text-white/70">{campaign.pageviews.toLocaleString()}</div>
                        <div className="text-right">
                          <span className={campaign.bounceRate > 50 ? 'text-orange-400' : 'text-green-400'}>
                            {campaign.bounceRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-right text-white/50">
                          {formatDuration(campaign.avgDuration)}
                        </div>
                        <div className="text-right flex justify-end">
                          {(() => {
                            const goalsBreakdown = campaign.goalsBreakdown || {};
                            const displayedGoals = Object.entries(goalsBreakdown).filter(([goalId, count]) => GOAL_NAMES[goalId] && (count as number) > 0);
                            const totalDisplayed = displayedGoals.reduce((s, [, count]) => s + (count as number), 0);
                            return totalDisplayed > 0 ? (
                              <div 
                                className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center cursor-help group relative"
                              >
                                <span className="text-[9px] text-green-400 font-bold">
                                  {totalDisplayed > 99 ? '99+' : totalDisplayed}
                                </span>
                                <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-[#1a1a1a] border border-white/20 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[200] whitespace-nowrap max-h-[400px] overflow-y-auto" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                                  <p className="text-xs font-medium text-white mb-2">Конверсии по целям</p>
                                  {displayedGoals.map(([goalId, count]) => {
                                    const goalName = GOAL_NAMES[goalId];
                                    return (
                                      <p key={goalId} className="text-[11px] text-white/70">
                                        {goalName}: <span className="text-green-400 font-medium">{(count as number).toLocaleString()}</span>
                                      </p>
                                    );
                                  })}
                                  <div className="border-t border-white/10 mt-2 pt-2">
                                    <p className="text-[11px] text-white/70">Всего: <span className="text-green-400 font-medium">{totalDisplayed.toLocaleString()}</span></p>
                                  </div>
                                </div>
                              </div>
                            ) : null;
                          })()}
                        </div>
                        <div className="text-right">
                          {campaign.revenue !== undefined && campaign.revenue > 0 ? (
                            <span className="text-yellow-400 font-medium">{campaign.revenue.toLocaleString()} ₽</span>
                          ) : <span className="text-white/30">-</span>}
                        </div>
                        <div title={campaign.term}>
                          {campaign.term && (
                            <p className="text-[9px] text-white/40 truncate">
                              {campaign.term}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
