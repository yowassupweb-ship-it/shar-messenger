'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { showToast } from '@/components/Toast'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  Search, RefreshCw, Copy, ExternalLink, Trash2, 
  History, ArrowLeft, Hash
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

export default function UTMHistoryPage() {
  const { theme } = useTheme()
  const [chatSettings, setChatSettings] = useState({
    chatBackgroundDark: '#0f172a',
    chatBackgroundLight: '#f8fafc',
    chatBackgroundImageDark: '',
    chatBackgroundImageLight: '',
    chatOverlayImageDark: '',
    chatOverlayImageLight: '',
    chatOverlayScale: 100,
    chatOverlayOpacity: 1,
  })
  const [history, setHistory] = useState<TrackedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [filterSource, setFilterSource] = useState<string>('')
  const [filterMedium, setFilterMedium] = useState<string>('')
  const [filterCampaign, setFilterCampaign] = useState<string>('')
  const [filterPlatform, setFilterPlatform] = useState<string>('')

  useEffect(() => {
    const loadChatSettings = () => {
      const raw = localStorage.getItem('chatSettings')
      if (!raw) return
      try {
        const parsed = JSON.parse(raw)
        setChatSettings((prev) => ({ ...prev, ...parsed }))
      } catch {
        return
      }
    }

    const handleChatSettingsChanged = (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail) {
        setChatSettings((prev) => ({ ...prev, ...(customEvent.detail || {}) }))
      } else {
        loadChatSettings()
      }
    }

    loadChatSettings()
    window.addEventListener('chatSettingsChanged', handleChatSettingsChanged as EventListener)
    return () => window.removeEventListener('chatSettingsChanged', handleChatSettingsChanged as EventListener)
  }, [])

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

  const pageBackgroundColor = theme === 'dark'
    ? (chatSettings?.chatBackgroundDark || '#0f172a')
    : (chatSettings?.chatBackgroundLight || '#f8fafc')
  const pageBackgroundImage = theme === 'dark'
    ? String(chatSettings?.chatBackgroundImageDark || '').trim()
    : String(chatSettings?.chatBackgroundImageLight || '').trim()
  const pageOverlayImage = theme === 'dark'
    ? String(chatSettings?.chatOverlayImageDark || '').trim()
    : String(chatSettings?.chatOverlayImageLight || '').trim()
  const pageOverlayScale = Math.max(20, Math.min(200, Number(chatSettings?.chatOverlayScale ?? 100) || 100))
  const pageOverlayOpacity = Math.max(0, Math.min(1, Number(chatSettings?.chatOverlayOpacity ?? 1) || 1))

  return (
    <div
      className="h-full min-h-0 flex flex-col pb-24 md:pb-20 theme-text relative overflow-hidden"
      style={{
        backgroundColor: pageBackgroundColor,
        ...(pageBackgroundImage
          ? {
              backgroundImage: `url('${pageBackgroundImage}')`,
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center center'
            }
          : {})
      }}
    >
      {pageOverlayImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url('${pageOverlayImage}')`,
            backgroundSize: `${pageOverlayScale * 3}px`,
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center center',
            opacity: pageOverlayOpacity,
            zIndex: 1,
          }}
        />
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-40 w-full px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] border border-[var(--border-light)] shadow-[var(--shadow-card)] backdrop-blur-xl text-[var(--text-primary)] transition-all"
            title="На главную"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          </Link>
          <div className="relative flex-none">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-primary)] flex items-center justify-center z-10 pointer-events-none">
              <Hash className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="w-full sm:w-[200px] h-10 pl-10 pr-3 bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border border-[var(--border-light)] rounded-[20px] text-sm shadow-[var(--shadow-card)] backdrop-blur-xl flex items-center justify-center font-medium text-[var(--text-primary)]">
              <Link href="/utm-generator" className="hover:opacity-80 transition-opacity">Генератор</Link>
              <span className="mx-2 text-[var(--text-muted)]">/</span>
              <Link href="/utm-generator/history" className="hover:opacity-80 transition-opacity">История</Link>
            </div>
          </div>
        </div>
      </div>

    <div className="flex-1 min-h-0 grid grid-cols-1 min-[780px]:grid-cols-[280px_minmax(0,1fr)] gap-4 relative z-10 px-3 pt-[60px]">
      {/* Левая панель - Фильтры */}
      <div 
        className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-[var(--shadow-card)] overflow-hidden flex flex-col min-h-0"
      >
        <div className="p-3 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Фильтры UTM</span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline"
              >
                Сбросить
              </button>
            )}
          </div>

          {/* Поиск */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Название, ссылка..."
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
            />
          </div>

          {/* utm_source */}
          <div className="space-y-1 mb-3">
            <label className="block text-[10px] text-[var(--text-muted)]">utm_source</label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-[var(--text-primary)]"
            >
              <option value="">Все источники</option>
              {uniqueSources.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* utm_medium */}
          <div className="space-y-1 mb-3">
            <label className="block text-[10px] text-[var(--text-muted)]">utm_medium</label>
            <select
              value={filterMedium}
              onChange={(e) => setFilterMedium(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-[var(--text-primary)]"
            >
              <option value="">Все типы</option>
              {uniqueMediums.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* utm_campaign */}
          <div className="space-y-1 mb-3">
            <label className="block text-[10px] text-[var(--text-muted)]">utm_campaign</label>
            <select
              value={filterCampaign}
              onChange={(e) => setFilterCampaign(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-[var(--text-primary)]"
            >
              <option value="">Все кампании</option>
              {uniqueCampaigns.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Платформа */}
          <div className="space-y-1">
            <label className="block text-[10px] text-[var(--text-muted)]">Платформа</label>
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-[var(--text-primary)]"
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
            <p className="text-[10px] text-[var(--text-muted)]">Найдено ссылок</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{filteredHistory.length}</p>
          </div>
        </div>
      </div>

      {/* Правая панель */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Список истории */}
        <div 
          className="flex-1 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-[var(--shadow-card)] overflow-hidden flex flex-col"
        >
          <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">История UTM-ссылок</h3>
            <button
              onClick={loadHistory}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-glass-hover)] text-[var(--text-secondary)] text-xs border border-[var(--border-color)] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <History className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)] opacity-40" />
                  <h3 className="font-medium text-[var(--text-secondary)] mb-2">История пуста</h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    {hasFilters ? 'Попробуйте изменить фильтры' : 'Сгенерируйте первую UTM-ссылку'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {filteredHistory.map(post => {
                  const platform = PLATFORMS.find(p => p.id === post.platform)
                  const utm = parseUTM(post.utmUrl)
                  
                  return (
                    <div
                      key={post.id}
                      className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-medium border ${platform?.color || 'bg-gray-500/20 text-gray-400'}`}>
                          {platform?.name || 'Другое'}
                        </span>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium truncate text-[var(--text-primary)]">{post.title || 'Без названия'}</p>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {formatDate(post.createdAt)}
                            </span>
                          </div>
                          
                          <p className="text-xs text-[var(--text-muted)] truncate mb-2">{post.utmUrl}</p>
                          
                          <div className="flex flex-wrap gap-2">
                            {utm.source && (
                              <span className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[9px] text-[var(--text-muted)]">
                                source: {utm.source}
                              </span>
                            )}
                            {utm.medium && (
                              <span className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[9px] text-[var(--text-muted)]">
                                medium: {utm.medium}
                              </span>
                            )}
                            {utm.campaign && (
                              <span className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[9px] text-[var(--text-muted)]">
                                campaign: {utm.campaign}
                              </span>
                            )}
                            {utm.term && (
                              <span className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[9px] text-[var(--text-muted)]">
                                term: {utm.term}
                              </span>
                            )}
                            {utm.content && (
                              <span className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[9px] text-[var(--text-muted)]">
                                content: {utm.content}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-500 dark:text-green-400">{post.views || 0}</p>
                            <p className="text-[9px] text-[var(--text-muted)]">визитов</p>
                          </div>
                          
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => copyUrl(post.utmUrl)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass)] transition-colors"
                              title="Копировать"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <a
                              href={post.utmUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass)] transition-colors"
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
    </div>
  )
}
