'use client'

import { useState, useEffect, useMemo } from 'react'
import { apiFetch } from '@/lib/api'
import { showToast } from '@/components/Toast'
import { 
  Search, RefreshCw, Copy, ExternalLink, Trash2, 
  History, Filter, Calendar, TrendingUp, Eye, X
} from 'lucide-react'

interface TrackedPost {
  id: string
  platform: string
  postUrl: string
  title: string
  utmUrl: string
  createdAt: string
  clicks: number
  views: number
  conversions: number
}

const PLATFORMS = [
  { id: 'vk', name: 'VK', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'telegram', name: 'TG', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  { id: 'yandex', name: 'Я.Директ', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { id: 'google', name: 'Google', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { id: 'email', name: 'Email', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'dzen', name: 'Дзен', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { id: 'other', name: 'Другое', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
]

const panelStyle = {
  background: '#1a1a1a',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3), 0 0 0 0.5px rgba(255, 255, 255, 0.1) inset, 0 1px 0 0 rgba(255, 255, 255, 0.15) inset'
}

const buttonStyle = {
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset'
}

export default function UTMHistoryPage() {
  const [history, setHistory] = useState<TrackedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [filterSource, setFilterSource] = useState<string>('')
  const [filterMedium, setFilterMedium] = useState<string>('')
  const [filterCampaign, setFilterCampaign] = useState<string>('')
  const [filterPlatform, setFilterPlatform] = useState<string>('')

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const response = await apiFetch('/api/tracked-posts')
      if (response.ok) {
        const data = await response.json()
        setHistory(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Ошибка загрузки истории:', error)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const deleteFromHistory = async (id: string) => {
    if (!confirm('Удалить ссылку из истории?')) return
    
    try {
      const response = await apiFetch(`/api/tracked-posts/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setHistory(prev => prev.filter(p => p.id !== id))
        showToast('Удалено', 'success')
      }
    } catch {
      showToast('Ошибка удаления', 'error')
    }
  }

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url)
    showToast('Скопировано', 'success')
  }

  const parseUTM = (url: string) => {
    try {
      const urlObj = new URL(url)
      return {
        source: urlObj.searchParams.get('utm_source') || '',
        medium: urlObj.searchParams.get('utm_medium') || '',
        campaign: urlObj.searchParams.get('utm_campaign') || '',
        term: urlObj.searchParams.get('utm_term') || '',
        content: urlObj.searchParams.get('utm_content') || '',
      }
    } catch {
      return { source: '', medium: '', campaign: '', term: '', content: '' }
    }
  }

  const uniqueSources = useMemo(() => {
    const sources = new Set<string>()
    history.forEach(post => {
      const utm = parseUTM(post.utmUrl)
      if (utm.source) sources.add(utm.source)
    })
    return Array.from(sources).sort()
  }, [history])

  const uniqueMediums = useMemo(() => {
    const mediums = new Set<string>()
    history.forEach(post => {
      const utm = parseUTM(post.utmUrl)
      if (utm.medium) mediums.add(utm.medium)
    })
    return Array.from(mediums).sort()
  }, [history])

  const uniqueCampaigns = useMemo(() => {
    const campaigns = new Set<string>()
    history.forEach(post => {
      const utm = parseUTM(post.utmUrl)
      if (utm.campaign) campaigns.add(utm.campaign)
    })
    return Array.from(campaigns).sort()
  }, [history])

  const filteredHistory = useMemo(() => {
    return history.filter(post => {
      const utm = parseUTM(post.utmUrl)
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          post.title?.toLowerCase().includes(query) ||
          post.utmUrl?.toLowerCase().includes(query) ||
          utm.campaign?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }
      
      if (filterSource && utm.source !== filterSource) return false
      if (filterMedium && utm.medium !== filterMedium) return false
      if (filterCampaign && utm.campaign !== filterCampaign) return false
      if (filterPlatform && post.platform !== filterPlatform) return false
      
      return true
    })
  }, [history, searchQuery, filterSource, filterMedium, filterCampaign, filterPlatform])

  const stats = useMemo(() => {
    const totalViews = filteredHistory.reduce((sum, p) => sum + (p.views || 0), 0)
    const totalClicks = filteredHistory.reduce((sum, p) => sum + (p.clicks || 0), 0)
    return { totalViews, totalClicks, count: filteredHistory.length }
  }, [filteredHistory])

  const clearFilters = () => {
    setSearchQuery('')
    setFilterSource('')
    setFilterMedium('')
    setFilterCampaign('')
    setFilterPlatform('')
  }

  const hasFilters = searchQuery || filterSource || filterMedium || filterCampaign || filterPlatform

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="h-full flex p-4 gap-4">
      {/* Левая панель - Фильтры */}
      <div 
        className="w-72 rounded-2xl border border-white/10 overflow-hidden flex flex-col"
        style={panelStyle}
      >
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/60">Фильтры UTM</span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-[10px] text-[#4a9eff] hover:underline"
              >
                Сбросить
              </button>
            )}
          </div>

          {/* Поиск */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Название, ссылка..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-white/30"
            />
          </div>

          {/* utm_source */}
          <div className="space-y-1 mb-3">
            <label className="block text-[10px] text-white/40">utm_source</label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50"
            >
              <option value="">Все источники</option>
              {uniqueSources.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* utm_medium */}
          <div className="space-y-1 mb-3">
            <label className="block text-[10px] text-white/40">utm_medium</label>
            <select
              value={filterMedium}
              onChange={(e) => setFilterMedium(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50"
            >
              <option value="">Все типы</option>
              {uniqueMediums.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* utm_campaign */}
          <div className="space-y-1 mb-3">
            <label className="block text-[10px] text-white/40">utm_campaign</label>
            <select
              value={filterCampaign}
              onChange={(e) => setFilterCampaign(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50"
            >
              <option value="">Все кампании</option>
              {uniqueCampaigns.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Платформа */}
          <div className="space-y-1">
            <label className="block text-[10px] text-white/40">Платформа</label>
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50"
            >
              <option value="">Все платформы</option>
              {PLATFORMS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Информация */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            <p className="text-[10px] text-white/40">Найдено ссылок</p>
            <p className="text-2xl font-bold">{filteredHistory.length}</p>
          </div>
        </div>
      </div>

      {/* Правая панель */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Статистика */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 p-4" style={panelStyle}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <History className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.count}</p>
                <p className="text-[10px] text-white/50">Всего ссылок</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 p-4" style={panelStyle}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
                <p className="text-[10px] text-white/50">Визитов</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 p-4" style={panelStyle}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalClicks.toLocaleString()}</p>
                <p className="text-[10px] text-white/50">Кликов</p>
              </div>
            </div>
          </div>
        </div>

        {/* Список истории */}
        <div 
          className="flex-1 rounded-2xl border border-white/10 overflow-hidden flex flex-col"
          style={panelStyle}
        >
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-medium">История UTM-ссылок</h3>
            <button
              onClick={loadHistory}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs border border-white/10 transition-colors disabled:opacity-50"
              style={buttonStyle}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#4a9eff] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <History className="w-12 h-12 mx-auto mb-4 text-white/20" />
                  <h3 className="font-medium text-white/60 mb-2">История пуста</h3>
                  <p className="text-sm text-white/40">
                    {hasFilters ? 'Попробуйте изменить фильтры' : 'Сгенерируйте первую UTM-ссылку'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredHistory.map(post => {
                  const platform = PLATFORMS.find(p => p.id === post.platform)
                  const utm = parseUTM(post.utmUrl)
                  
                  return (
                    <div
                      key={post.id}
                      className="p-4 hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-medium border ${platform?.color || 'bg-gray-500/20 text-gray-400'}`}>
                          {platform?.name || 'Другое'}
                        </span>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium truncate">{post.title || 'Без названия'}</p>
                            <span className="text-[10px] text-white/30">
                              {formatDate(post.createdAt)}
                            </span>
                          </div>
                          
                          <p className="text-xs text-white/40 truncate mb-2">{post.utmUrl}</p>
                          
                          <div className="flex flex-wrap gap-2">
                            {utm.source && (
                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-white/50">
                                source: {utm.source}
                              </span>
                            )}
                            {utm.medium && (
                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-white/50">
                                medium: {utm.medium}
                              </span>
                            )}
                            {utm.campaign && (
                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-white/50">
                                campaign: {utm.campaign}
                              </span>
                            )}
                            {utm.term && (
                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-white/50">
                                term: {utm.term}
                              </span>
                            )}
                            {utm.content && (
                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-white/50">
                                content: {utm.content}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-400">{post.views || 0}</p>
                            <p className="text-[9px] text-white/40">визитов</p>
                          </div>
                          
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => copyUrl(post.utmUrl)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
                              title="Копировать"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <a
                              href={post.utmUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
                              title="Открыть"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => deleteFromHistory(post.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
