'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { showToast } from '@/components/Toast'
import { 
  Plus, RefreshCw, Copy, ExternalLink, Trash2, 
  FolderPlus, Folder, FolderOpen, ChevronRight, ChevronDown,
  BarChart3, Eye, TrendingUp, X, Users, Check, Star, Calendar, Search, Target, DollarSign
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
  users: number
  avgTime: number
  bounceRate?: number
  revenue?: number
  goalsBreakdown?: Record<string, number>
  folderId?: string
}

interface TrackedFolder {
  id: string
  name: string
  color: string
  createdAt: string
}

interface MetrikaLink {
  utm_term: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  visits: number
  users: number
  pageviews: number
  bounceRate: number
  avgTime?: number
  revenue?: number
  conversions?: number
  goalsBreakdown?: Record<string, number>
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

const PLATFORMS = [
  { id: 'vk', name: 'VK', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'telegram', name: 'TG', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  { id: 'yandex', name: 'Я.Директ', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { id: 'google', name: 'Google', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { id: 'email', name: 'Email', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'dzen', name: 'Дзен', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { id: 'other', name: 'Другое', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
]

const FOLDER_COLORS = [
  { id: 'blue', color: 'bg-blue-500/20 border-blue-500/50 text-blue-400' },
  { id: 'green', color: 'bg-green-500/20 border-green-500/50 text-green-400' },
  { id: 'purple', color: 'bg-purple-500/20 border-purple-500/50 text-purple-400' },
  { id: 'orange', color: 'bg-orange-500/20 border-orange-500/50 text-orange-400' },
  { id: 'pink', color: 'bg-pink-500/20 border-pink-500/50 text-pink-400' },
  { id: 'cyan', color: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' },
]

const QUICK_PERIODS = [
  { id: 'today', label: 'Сегодня', days: 0 },
  { id: 'yesterday', label: 'Вчера', days: 1, isYesterday: true },
  { id: '7d', label: '7 дней', days: 7 },
  { id: '14d', label: '14 дней', days: 14 },
  { id: '30d', label: '30 дней', days: 30 },
]

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

const panelStyle = {
  background: '#1a1a1a',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3), 0 0 0 0.5px rgba(255, 255, 255, 0.1) inset, 0 1px 0 0 rgba(255, 255, 255, 0.15) inset'
}

const buttonStyle = {
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset'
}

export default function TrackerPage() {
  const [activeTab, setActiveTab] = useState<'tracked' | 'metrika'>('tracked')
  
  const [posts, setPosts] = useState<TrackedPost[]>([])
  const [folders, setFolders] = useState<TrackedFolder[]>([])
  const [metrikaLinks, setMetrikaLinks] = useState<MetrikaLink[]>([])
  const [trackedUtmTerms, setTrackedUtmTerms] = useState<Set<string>>(new Set())
  const [trackedUtmCampaigns, setTrackedUtmCampaigns] = useState<Set<string>>(new Set())
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMetrika, setLoadingMetrika] = useState(false)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [selectedPeriod, setSelectedPeriod] = useState('7d')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  
  const [showAddLink, setShowAddLink] = useState(false)
  const [showAddFolder, setShowAddFolder] = useState(false)
  
  const [newLink, setNewLink] = useState({ title: '', utmUrl: '', platform: 'vk', folderId: '' })
  const [newFolder, setNewFolder] = useState({ name: '', color: 'blue' })

  useEffect(() => {
    loadData()
  }, [dateFrom, dateTo])

  useEffect(() => {
    if (activeTab === 'metrika') {
      loadMetrikaData()
    }
  }, [activeTab, dateFrom, dateTo])

  const applyPeriod = (periodId: string) => {
    const period = QUICK_PERIODS.find(p => p.id === periodId)
    if (!period) return
    
    const now = new Date()
    const from = new Date()
    const to = new Date()
    
    if (period.isYesterday) {
      from.setDate(now.getDate() - 1)
      to.setDate(now.getDate() - 1)
    } else if (period.days === 0) {
      // Сегодня
    } else {
      from.setDate(now.getDate() - period.days)
    }
    
    setDateFrom(from.toISOString().split('T')[0])
    setDateTo(to.toISOString().split('T')[0])
    setSelectedPeriod(periodId)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      let postsData: TrackedPost[] = []
      let metrikaData: MetrikaLink[] = []
      let foldersData: TrackedFolder[] = []
      
      const results = await Promise.allSettled([
        apiFetch('/api/tracked-posts'),
        apiFetch('/api/tracked-folders'),
        apiFetch(`/api/analytics/metrica?date_from=${dateFrom}&date_to=${dateTo}`)
      ])
      
      if (results[0].status === 'fulfilled') {
        const postsRes = results[0].value
        if (postsRes.ok) {
          postsData = await postsRes.json()
          postsData = Array.isArray(postsData) ? postsData : []
        }
      }
      
      if (results[1].status === 'fulfilled') {
        const foldersRes = results[1].value
        if (foldersRes.ok) {
          foldersData = await foldersRes.json()
          foldersData = Array.isArray(foldersData) ? foldersData : []
        }
      }
      
      if (results[2].status === 'fulfilled') {
        const metrikaRes = results[2].value
        if (metrikaRes.ok) {
          metrikaData = await metrikaRes.json()
          metrikaData = Array.isArray(metrikaData) ? metrikaData : []
        }
      }
      
      const enrichedPosts = postsData.map(post => {
        const utm = parseUTM(post.utmUrl)
        const metrikaMatch = metrikaData.find(m => 
          (utm.term && m.utm_term === utm.term) ||
          (utm.campaign && m.utm_campaign === utm.campaign)
        )
        
        if (metrikaMatch) {
          return {
            ...post,
            views: metrikaMatch.visits || post.views || 0,
            users: metrikaMatch.users || post.users || 0,
            bounceRate: metrikaMatch.bounceRate || post.bounceRate || 0,
          }
        }
        return post
      })
      
      setPosts(enrichedPosts)
      setMetrikaLinks(metrikaData)
      setFolders(foldersData)
      
      const tracked = new Set<string>()
      const trackedCampaigns = new Set<string>()
      enrichedPosts.forEach((p: TrackedPost) => {
        const utm = parseUTM(p.utmUrl)
        if (utm.term) tracked.add(utm.term)
        if (utm.campaign) trackedCampaigns.add(utm.campaign)
      })
      setTrackedUtmTerms(tracked)
      setTrackedUtmCampaigns(trackedCampaigns)
    } catch (error) {
      console.error('Ошибка загрузки:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMetrikaData = async () => {
    setLoadingMetrika(true)
    try {
      const res = await apiFetch(`/api/analytics/metrica?date_from=${dateFrom}&date_to=${dateTo}`)
      if (res && res.ok) {
        const data = await res.json()
        setMetrikaLinks(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Ошибка Метрики:', error)
    } finally {
      setLoadingMetrika(false)
    }
  }

  const refreshStats = async () => {
    setRefreshing(true)
    showToast('Обновление статистики...', 'info')
    try {
      if (activeTab === 'metrika') {
        await loadMetrikaData()
      }
      await loadData()
      showToast('Статистика обновлена', 'success')
    } catch {
      showToast('Ошибка обновления', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  const trackFromMetrika = async (link: MetrikaLink) => {
    try {
      const platform = detectPlatform(link.utm_source)
      const response = await apiFetch('/api/tracked-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: link.utm_term || link.utm_campaign || 'Без названия',
          utmUrl: buildUtmUrl(link),
          platform: platform,
          postUrl: buildUtmUrl(link),
          clicks: 0,
          views: link.visits || 0,
          users: link.users || 0,
          conversions: 0,
          avgTime: 0
        })
      })

      if (response.ok) {
        setTrackedUtmTerms(prev => new Set([...prev, link.utm_term]))
        await loadData()
        showToast('Добавлено в отслеживание', 'success')
      }
    } catch {
      showToast('Ошибка добавления', 'error')
    }
  }

  const detectPlatform = (source: string): string => {
    const s = source.toLowerCase()
    if (s.includes('vk') || s.includes('вк')) return 'vk'
    if (s.includes('telegram') || s.includes('tg')) return 'telegram'
    if (s.includes('yandex') || s.includes('яндекс') || s.includes('direct')) return 'yandex'
    if (s.includes('google')) return 'google'
    if (s.includes('email') || s.includes('mail')) return 'email'
    if (s.includes('dzen') || s.includes('дзен') || s.includes('zen')) return 'dzen'
    return 'other'
  }

  const buildUtmUrl = (link: MetrikaLink): string => {
    const params = new URLSearchParams()
    if (link.utm_source) params.set('utm_source', link.utm_source)
    if (link.utm_medium) params.set('utm_medium', link.utm_medium)
    if (link.utm_campaign) params.set('utm_campaign', link.utm_campaign)
    if (link.utm_term) params.set('utm_term', link.utm_term)
    return `https://vs-travel.ru/?${params.toString()}`
  }

  const addLink = async () => {
    if (!newLink.title || !newLink.utmUrl) {
      showToast('Заполните название и ссылку', 'error')
      return
    }

    try {
      const response = await apiFetch('/api/tracked-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newLink.title,
          utmUrl: newLink.utmUrl,
          platform: newLink.platform,
          postUrl: newLink.utmUrl,
          folderId: newLink.folderId || undefined,
          clicks: 0,
          views: 0,
          conversions: 0
        })
      })

      if (response.ok) {
        await loadData()
        setNewLink({ title: '', utmUrl: '', platform: 'vk', folderId: '' })
        setShowAddLink(false)
        showToast('Ссылка добавлена', 'success')
      }
    } catch {
      showToast('Ошибка добавления', 'error')
    }
  }

  const addFolder = async () => {
    if (!newFolder.name) {
      showToast('Введите название папки', 'error')
      return
    }

    try {
      const response = await apiFetch('/api/tracked-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFolder)
      })

      if (response.ok) {
        await loadData()
        setNewFolder({ name: '', color: 'blue' })
        setShowAddFolder(false)
        showToast('Папка создана', 'success')
      }
    } catch {
      showToast('Ошибка создания', 'error')
    }
  }

  const deletePost = async (id: string) => {
    if (!confirm('Удалить ссылку?')) return
    
    try {
      const response = await apiFetch(`/api/tracked-posts/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setPosts(prev => prev.filter(p => p.id !== id))
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

  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return post.title?.toLowerCase().includes(q) || post.utmUrl?.toLowerCase().includes(q)
  })

  // Фильтрация для левой панели (все ссылки из метрики для выбора)
  const allMetrikaFiltered = metrikaLinks.filter(link => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return link.utm_term?.toLowerCase().includes(q) || 
           link.utm_campaign?.toLowerCase().includes(q) ||
           link.utm_source?.toLowerCase().includes(q)
  })

  // Фильтрация для правой таблицы (только отслеживаемые)
  const filteredMetrika = metrikaLinks.filter(link => {
    // Фильтруем только отслеживаемые ссылки (по utm_term или utm_campaign)
    const isTracked = trackedUtmTerms.has(link.utm_term) || 
      trackedUtmCampaigns.has(link.utm_campaign)
    
    if (!isTracked) return false
    
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return link.utm_term?.toLowerCase().includes(q) || 
           link.utm_campaign?.toLowerCase().includes(q) ||
           link.utm_source?.toLowerCase().includes(q)
  })

  // Статистика только по отслеживаемым ссылкам
  const totalVisits = filteredMetrika.reduce((sum, l) => sum + (l.visits || 0), 0)
  const totalUsers = filteredMetrika.reduce((sum, l) => sum + (l.users || 0), 0)
  const totalRevenue = filteredMetrika.reduce((sum, l) => sum + (l.revenue || 0), 0)
  const totalConversions = filteredMetrika.reduce((sum, l) => sum + (l.conversions || 0), 0)

  return (
    <div className="h-full flex p-4 gap-4">
      {/* Левая панель - Список */}
      <div 
        className="w-80 rounded-2xl border border-white/10 overflow-hidden flex flex-col"
        style={panelStyle}
      >
        {/* Заголовок */}
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/60">Отслеживание</span>
            <div className="flex gap-1">
              <button
                onClick={() => setShowAddFolder(true)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white/80 transition-colors"
                style={buttonStyle}
                title="Создать папку"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowAddLink(true)}
                className="w-7 h-7 rounded-lg bg-green-500/20 hover:bg-green-500/30 flex items-center justify-center text-green-400 transition-colors"
                style={buttonStyle}
                title="Добавить ссылку"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          {/* Табы */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg mb-3">
            <button
              onClick={() => setActiveTab('tracked')}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'tracked' 
                  ? 'bg-white/10 text-white border border-white/10' 
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              Мои ссылки
            </button>
            <button
              onClick={() => setActiveTab('metrika')}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'metrika' 
                  ? 'bg-white/10 text-white border border-white/10' 
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              Из Метрики
            </button>
          </div>

          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-white/30"
            />
          </div>
        </div>

        {/* Периоды */}
        <div className="px-3 py-2 border-b border-white/10 flex gap-1 overflow-x-auto">
          {QUICK_PERIODS.map(period => (
            <button
              key={period.id}
              onClick={() => applyPeriod(period.id)}
              className={`px-2 py-1 rounded text-[10px] whitespace-nowrap transition-colors ${
                selectedPeriod === period.id
                  ? 'bg-white/10 text-white border border-white/10'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Список */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#4a9eff] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === 'tracked' ? (
            filteredPosts.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 text-white/20" />
                <p className="text-white/40 text-xs">Нет отслеживаемых ссылок</p>
                <p className="text-white/30 text-[10px] mt-1">Добавьте ссылку или импортируйте из Метрики</p>
              </div>
            ) : (
              filteredPosts.map(post => {
                const platform = PLATFORMS.find(p => p.id === post.platform)
                return (
                  <div
                    key={post.id}
                    className="px-3 py-2.5 border-b border-white/5 hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${platform?.color || 'bg-gray-500/20 text-gray-400'}`}>
                        {platform?.name || 'Другое'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white/90 truncate">{post.title}</p>
                        <p className="text-[10px] text-white/40 truncate mt-0.5">{post.utmUrl}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyUrl(post.utmUrl)}
                          className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deletePost(post.id)}
                          className="w-6 h-6 rounded flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2 text-[10px]">
                      <span className="flex items-center gap-1 text-white/40">
                        <Eye className="w-3 h-3" /> {post.views || 0}
                      </span>
                      <span className="flex items-center gap-1 text-white/40">
                        <Users className="w-3 h-3" /> {post.users || 0}
                      </span>
                      {post.bounceRate !== undefined && (
                        <span className="flex items-center gap-1 text-white/40">
                          <TrendingUp className="w-3 h-3" /> {post.bounceRate.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )
          ) : (
            loadingMetrika ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-[#4a9eff] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : allMetrikaFiltered.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 text-white/20" />
                <p className="text-white/40 text-xs">Нет данных из Метрики</p>
              </div>
            ) : (
              allMetrikaFiltered.map((link, idx) => {
                const isTracked = trackedUtmTerms.has(link.utm_term) || trackedUtmCampaigns.has(link.utm_campaign)
                return (
                  <div
                    key={idx}
                    className="px-3 py-2.5 border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white/90 truncate">
                          {link.utm_term || link.utm_campaign || 'Без метки'}
                        </p>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          {link.utm_source} / {link.utm_medium}
                        </p>
                      </div>
                      {isTracked ? (
                        <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px]">
                          <Check className="w-3 h-3 inline" /> Отслеживается
                        </span>
                      ) : (
                        <button
                          onClick={() => trackFromMetrika(link)}
                          className="px-2 py-0.5 rounded bg-white/10 text-white/70 text-[9px] hover:bg-white/15 transition-colors border border-white/10"
                        >
                          <Plus className="w-3 h-3 inline" /> Отслеживать
                        </button>
                      )}
                    </div>
                    <div className="flex gap-3 mt-2 text-[10px]">
                      <span className="flex items-center gap-1 text-white/40">
                        <Eye className="w-3 h-3" /> {link.visits}
                      </span>
                      <span className="flex items-center gap-1 text-white/40">
                        <Users className="w-3 h-3" /> {link.users}
                      </span>
                      <span className="flex items-center gap-1 text-white/40">
                        <TrendingUp className="w-3 h-3" /> {link.bounceRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )
              })
            )
          )}
        </div>
      </div>

      {/* Правая панель - Статистика */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Верхняя строка - Статистика */}
        <div className="grid grid-cols-5 gap-3">
          <div 
            className="rounded-2xl border border-white/10 p-4"
            style={panelStyle}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{posts.length}</p>
                <p className="text-[10px] text-white/50">Отслеживается</p>
              </div>
            </div>
          </div>
          <div 
            className="rounded-2xl border border-white/10 p-4"
            style={panelStyle}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalVisits.toLocaleString()}</p>
                <p className="text-[10px] text-white/50">Визитов</p>
              </div>
            </div>
          </div>
          <div 
            className="rounded-2xl border border-white/10 p-4"
            style={panelStyle}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsers.toLocaleString()}</p>
                <p className="text-[10px] text-white/50">Посетителей</p>
              </div>
            </div>
          </div>
          <div 
            className="rounded-2xl border border-white/10 p-4"
            style={panelStyle}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalConversions.toLocaleString()}</p>
                <p className="text-[10px] text-white/50">Конверсий</p>
              </div>
            </div>
          </div>
          <div 
            className="rounded-2xl border border-white/10 p-4"
            style={panelStyle}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRevenue.toLocaleString()} ₽</p>
                <p className="text-[10px] text-white/50">Доход</p>
              </div>
            </div>
          </div>
        </div>

        {/* Основная панель */}
        <div 
          className="flex-1 rounded-2xl border border-white/10 overflow-hidden flex flex-col"
          style={panelStyle}
        >
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-white/40" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50"
              />
              <span className="text-white/30 text-xs">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50"
              />
            </div>
            <button
              onClick={refreshStats}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs border border-white/10 transition-colors disabled:opacity-50"
              style={buttonStyle}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>
          
          <div className="flex-1 overflow-auto">
            {filteredMetrika.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-white/10" />
                  <h3 className="text-lg font-medium text-white/60 mb-2">
                    {posts.length === 0 ? 'Начните отслеживание' : 'Нет данных по отслеживаемым ссылкам'}
                  </h3>
                  <p className="text-sm text-white/40 max-w-md">
                    {posts.length === 0 
                      ? 'Добавьте ссылки с UTM-метками для отслеживания их эффективности. Статистика будет загружена из Яндекс.Метрики.'
                      : 'Добавьте UTM-ссылки в отслеживание через вкладку "Из Метрики" или создайте новую ссылку.'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Заголовок таблицы */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-white/10 text-[10px] text-white/40 uppercase tracking-wider sticky top-0 bg-[#1a1a1a] z-20">
                  <div className="col-span-2">Source / Medium</div>
                  <div className="col-span-2">Campaign / Term</div>
                  <div className="text-right">Визиты</div>
                  <div className="text-right">Юзеры</div>
                  <div className="text-right">Отказы</div>
                  <div className="text-right">Время</div>
                  <div className="text-right">Конверсии</div>
                  <div className="text-right">Доход</div>
                  <div className="col-span-2"></div>
                </div>
                
                {/* Данные */}
                <div className="divide-y divide-white/5">
                  {filteredMetrika.map((link, idx) => {
                    const isTracked = trackedUtmTerms.has(link.utm_term) || trackedUtmCampaigns.has(link.utm_campaign)
                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs hover:bg-white/5 transition-colors"
                      >
                        <div className="col-span-2">
                          <p className="text-white/90 font-medium truncate">{link.utm_source || '(not set)'}</p>
                          <p className="text-[10px] text-white/40 truncate">{link.utm_medium || '-'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-white/70 truncate">{link.utm_campaign || '(not set)'}</p>
                          <p className="text-[10px] text-white/40 truncate">{link.utm_term || '-'}</p>
                        </div>
                        <div className="text-right text-white/70">{link.visits.toLocaleString()}</div>
                        <div className="text-right text-white/70">{link.users.toLocaleString()}</div>
                        <div className="text-right">
                          <span className={link.bounceRate > 50 ? 'text-orange-400' : 'text-green-400'}>
                            {link.bounceRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-right text-white/50">
                          {link.avgTime ? `${link.avgTime.toFixed(1)} мин` : '-'}
                        </div>
                        <div className="text-right flex justify-end">
                          {(() => {
                            const goalsBreakdown = link.goalsBreakdown || {};
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
                          {link.revenue !== undefined && link.revenue > 0 ? (
                            <span className="text-yellow-400 font-medium">
                              {link.revenue.toLocaleString()} ₽
                            </span>
                          ) : (
                            <span className="text-white/30">-</span>
                          )}
                        </div>
                        <div className="col-span-2 flex justify-end gap-1">
                          {isTracked ? (
                            <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px]">
                              <Check className="w-3 h-3 inline" />
                            </span>
                          ) : (
                            <button
                              onClick={() => trackFromMetrika(link)}
                              className="px-2 py-0.5 rounded bg-white/10 text-white/70 text-[9px] hover:bg-white/15 transition-colors border border-white/10"
                            >
                              <Plus className="w-3 h-3 inline" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Модал добавления ссылки */}
      {showAddLink && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div 
            className="w-full max-w-md rounded-2xl border border-white/10 p-5"
            style={panelStyle}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Добавить ссылку</h3>
              <button
                onClick={() => setShowAddLink(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">Название</label>
                <input
                  type="text"
                  value={newLink.title}
                  onChange={(e) => setNewLink(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Название ссылки..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-white/30"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">UTM-ссылка</label>
                <input
                  type="text"
                  value={newLink.utmUrl}
                  onChange={(e) => setNewLink(prev => ({ ...prev, utmUrl: e.target.value }))}
                  placeholder="https://site.ru/?utm_source=..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-white/30"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Платформа</label>
                <div className="flex flex-wrap gap-1">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setNewLink(prev => ({ ...prev, platform: p.id }))}
                      className={`px-2 py-1 rounded text-xs border transition-colors ${
                        newLink.platform === p.id ? p.color : 'bg-white/5 border-white/10 text-white/50'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowAddLink(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-white/70 text-sm hover:bg-white/10 transition-colors"
                style={buttonStyle}
              >
                Отмена
              </button>
              <button
                onClick={addLink}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/15 transition-colors border border-white/10"
                style={buttonStyle}
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модал создания папки */}
      {showAddFolder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div 
            className="w-full max-w-sm rounded-2xl border border-white/10 p-5"
            style={panelStyle}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Создать папку</h3>
              <button
                onClick={() => setShowAddFolder(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">Название</label>
                <input
                  type="text"
                  value={newFolder.name}
                  onChange={(e) => setNewFolder(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Название папки..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-white/30"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Цвет</label>
                <div className="flex gap-2">
                  {FOLDER_COLORS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setNewFolder(prev => ({ ...prev, color: c.id }))}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${c.color} ${
                        newFolder.color === c.id ? 'scale-110 ring-2 ring-white/30' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowAddFolder(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-white/70 text-sm hover:bg-white/10 transition-colors"
                style={buttonStyle}
              >
                Отмена
              </button>
              <button
                onClick={addFolder}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/15 transition-colors border border-white/10"
                style={buttonStyle}
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


