'use client'

import { useState, useEffect, useMemo } from 'react'
import { apiFetch } from '@/lib/api'
import { showToast } from '@/components/Toast'
import { 
  Search, RefreshCw, Copy, ExternalLink, Trash2, 
  History, Filter, Calendar, TrendingUp
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
  { id: 'vk', name: 'VK', color: 'bg-blue-500/20 text-blue-400' },
  { id: 'telegram', name: 'TG', color: 'bg-sky-500/20 text-sky-400' },
  { id: 'yandex', name: 'Я.Директ', color: 'bg-yellow-500/20 text-yellow-400' },
  { id: 'google', name: 'Google', color: 'bg-green-500/20 text-green-400' },
  { id: 'email', name: 'Email', color: 'bg-purple-500/20 text-purple-400' },
  { id: 'dzen', name: 'Дзен', color: 'bg-orange-500/20 text-orange-400' },
  { id: 'other', name: 'Другое', color: 'bg-gray-500/20 text-gray-400' },
]

export default function UTMHistoryPage() {
  const [history, setHistory] = useState<TrackedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Фильтры (как в редакторе фидов)
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
    try {
      const response = await apiFetch(`/api/tracked-posts/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setHistory(prev => prev.filter(p => p.id !== id))
        showToast('Удалено', 'success')
      }
    } catch (error) {
      showToast('Ошибка удаления', 'error')
    }
  }

  // Извлечение UTM из URL
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

  // Уникальные значения для фильтров
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

  // Фильтрация
  const filteredHistory = useMemo(() => {
    return history.filter(post => {
      const utm = parseUTM(post.utmUrl)
      
      // Текстовый поиск
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          post.title?.toLowerCase().includes(query) ||
          post.utmUrl?.toLowerCase().includes(query) ||
          utm.campaign?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }
      
      // Фильтр по UTM Source
      if (filterSource && utm.source !== filterSource) return false
      
      // Фильтр по UTM Medium
      if (filterMedium && utm.medium !== filterMedium) return false
      
      // Фильтр по UTM Campaign
      if (filterCampaign && utm.campaign !== filterCampaign) return false
      
      // Фильтр по платформе
      if (filterPlatform && post.platform !== filterPlatform) return false
      
      return true
    })
  }, [history, searchQuery, filterSource, filterMedium, filterCampaign, filterPlatform])

  // Статистика
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

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">История UTM-ссылок</h1>
          <p className="text-sm opacity-60 mt-1">
            Все сгенерированные ссылки с отслеживанием
          </p>
        </div>
        <button 
          onClick={loadHistory}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <History className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.count}</p>
              <p className="text-xs opacity-60">Всего ссылок</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalViews}</p>
              <p className="text-xs opacity-60">Визитов</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalClicks}</p>
              <p className="text-xs opacity-60">Кликов</p>
            </div>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 opacity-60" />
          <h3 className="font-medium text-sm">Фильтры по UTM</h3>
          {hasFilters && (
            <button 
              onClick={clearFilters}
              className="ml-auto text-xs text-[var(--button)] hover:underline"
            >
              Сбросить
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-5 gap-3">
          {/* Поиск */}
          <div className="col-span-1">
            <label className="block text-xs font-medium mb-1 opacity-70">Поиск</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
              <input
                type="text"
                placeholder="Название, ссылка..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full pl-9 text-sm"
              />
            </div>
          </div>

          {/* UTM Source */}
          <div>
            <label className="block text-xs font-medium mb-1 opacity-70">utm_source</label>
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

          {/* UTM Medium */}
          <div>
            <label className="block text-xs font-medium mb-1 opacity-70">utm_medium</label>
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

          {/* UTM Campaign */}
          <div>
            <label className="block text-xs font-medium mb-1 opacity-70">utm_campaign</label>
            <select
              value={filterCampaign}
              onChange={(e) => setFilterCampaign(e.target.value)}
              className="input-field w-full text-sm"
            >
              <option value="">Все кампании</option>
              {uniqueCampaigns.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Платформа */}
          <div>
            <label className="block text-xs font-medium mb-1 opacity-70">Платформа</label>
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="input-field w-full text-sm"
            >
              <option value="">Все платформы</option>
              {PLATFORMS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Таблица */}
      {loading ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--button)] border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm opacity-60">Загрузка...</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm opacity-60">
            {hasFilters ? 'Ничего не найдено по фильтрам' : 'История пуста'}
          </p>
          <p className="text-xs opacity-40 mt-1">
            {hasFilters ? 'Попробуйте изменить параметры фильтрации' : 'Создайте ссылку в Генераторе и сохраните её'}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--background)]">
              <tr>
                <th className="text-left p-3 font-medium opacity-70">Название</th>
                <th className="text-left p-3 font-medium opacity-70">UTM Source</th>
                <th className="text-left p-3 font-medium opacity-70">UTM Medium</th>
                <th className="text-left p-3 font-medium opacity-70">UTM Campaign</th>
                <th className="text-left p-3 font-medium opacity-70">Платформа</th>
                <th className="text-center p-3 font-medium opacity-70">Визиты</th>
                <th className="text-center p-3 font-medium opacity-70">Дата</th>
                <th className="text-right p-3 font-medium opacity-70">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((post) => {
                const utm = parseUTM(post.utmUrl)
                const platform = PLATFORMS.find(p => p.id === post.platform)
                
                return (
                  <tr key={post.id} className="border-t border-[var(--border)] hover:bg-[var(--background)]/50">
                    <td className="p-3">
                      <div className="font-medium">{post.title || 'Без названия'}</div>
                      <div className="text-xs opacity-40 truncate max-w-[200px]" title={post.utmUrl}>
                        {post.utmUrl}
                      </div>
                    </td>
                    <td className="p-3">
                      {utm.source && (
                        <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs">
                          {utm.source}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {utm.medium && (
                        <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs">
                          {utm.medium}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {utm.campaign && (
                        <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs">
                          {utm.campaign}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {platform && (
                        <span className={`px-2 py-1 rounded text-xs ${platform.color}`}>
                          {platform.name}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-xs">{post.views || 0}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-xs opacity-60 flex items-center justify-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {post.createdAt ? new Date(post.createdAt).toLocaleDateString('ru-RU') : '-'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(post.utmUrl)
                            showToast('Скопировано!', 'success')
                          }}
                          className="btn-secondary p-1.5 text-xs"
                          title="Копировать ссылку"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => window.open(post.utmUrl, '_blank')}
                          className="btn-secondary p-1.5 text-xs"
                          title="Открыть"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteFromHistory(post.id)}
                          className="btn-secondary p-1.5 text-xs text-red-400 hover:text-red-300"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      
      <p className="text-xs opacity-40">
        💡 Для получения данных из Яндекс.Метрики настройте токен и ID счётчика в Настройках
      </p>
    </div>
  )
}
