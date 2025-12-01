'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { showToast } from '@/components/Toast'
import { 
  Plus, RefreshCw, Copy, ExternalLink, Trash2, 
  FolderPlus, Folder, FolderOpen, ChevronRight, ChevronDown,
  BarChart3, Eye, TrendingUp, X, Users,
  Check, Star, Filter
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
  frequency: number
  avgTime: number
  bounceRate?: number
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

export default function TrackerPage() {
  const [activeTab, setActiveTab] = useState<'tracked' | 'metrika'>('tracked')
  
  const [posts, setPosts] = useState<TrackedPost[]>([])
  const [folders, setFolders] = useState<TrackedFolder[]>([])
  const [metrikaLinks, setMetrikaLinks] = useState<MetrikaLink[]>([])
  const [prevPeriodLinks, setPrevPeriodLinks] = useState<MetrikaLink[]>([])
  const [trackedUtmTerms, setTrackedUtmTerms] = useState<Set<string>>(new Set())
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMetrika, setLoadingMetrika] = useState(false)
  const [compareEnabled, setCompareEnabled] = useState(false)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  
  const [showAddLink, setShowAddLink] = useState(false)
  const [showAddFolder, setShowAddFolder] = useState(false)
  
  const [newLink, setNewLink] = useState({
    title: '',
    utmUrl: '',
    platform: 'vk',
    folderId: ''
  })
  
  const [newFolder, setNewFolder] = useState({
    name: '',
    color: 'blue'
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (activeTab === 'metrika' && metrikaLinks.length === 0) {
      loadMetrikaData()
    }
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      const [postsRes, foldersRes] = await Promise.all([
        apiFetch('/api/tracked-posts'),
        apiFetch('/api/tracked-folders')
      ])
      
      if (postsRes.ok) {
        const data = await postsRes.json()
        setPosts(Array.isArray(data) ? data : [])
        const tracked = new Set<string>()
        data.forEach((p: TrackedPost) => {
          const utm = parseUTM(p.utmUrl)
          if (utm.term) tracked.add(utm.term)
        })
        setTrackedUtmTerms(tracked)
      }
      
      if (foldersRes.ok) {
        const data = await foldersRes.json()
        setFolders(Array.isArray(data) ? data : [])
      }
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
      if (res.ok) {
        const data = await res.json()
        setMetrikaLinks(Array.isArray(data) ? data : [])
        
        // Загрузка предыдущего периода для сравнения
        if (compareEnabled) {
          const from1 = new Date(dateFrom)
          const to1 = new Date(dateTo)
          const days = Math.ceil((to1.getTime() - from1.getTime()) / (1000 * 60 * 60 * 24))
          const prevTo = new Date(from1)
          prevTo.setDate(prevTo.getDate() - 1)
          const prevFrom = new Date(prevTo)
          prevFrom.setDate(prevFrom.getDate() - days)
          
          const prevRes = await apiFetch(`/api/analytics/metrica?date_from=${prevFrom.toISOString().split('T')[0]}&date_to=${prevTo.toISOString().split('T')[0]}`)
          if (prevRes.ok) {
            const prevData = await prevRes.json()
            setPrevPeriodLinks(Array.isArray(prevData) ? prevData : [])
          }
        } else {
          setPrevPeriodLinks([])
        }
      } else {
        showToast('Ошибка загрузки данных Метрики', 'error')
      }
    } catch (error) {
      console.error('Ошибка Метрики:', error)
      showToast('Настройте Яндекс.Метрику в настройках', 'error')
    } finally {
      setLoadingMetrika(false)
    }
  }

  // Функция расчёта изменения между периодами
  const getComparison = (current: MetrikaLink) => {
    if (!compareEnabled || prevPeriodLinks.length === 0) return null
    
    const prev = prevPeriodLinks.find(p => 
      p.utm_term === current.utm_term && 
      p.utm_source === current.utm_source
    )
    
    if (!prev) return { visits: current.visits, users: current.users, isNew: true }
    
    const visitsDiff = current.visits - prev.visits
    const usersDiff = current.users - prev.users
    const visitsPercent = prev.visits > 0 ? Math.round((visitsDiff / prev.visits) * 100) : 0
    const usersPercent = prev.users > 0 ? Math.round((usersDiff / prev.users) * 100) : 0
    
    return { visitsDiff, usersDiff, visitsPercent, usersPercent, isNew: false }
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
          frequency: 0,
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
          folderId: newLink.folderId || null,
          postUrl: newLink.utmUrl,
          clicks: 0,
          views: 0,
          conversions: 0,
          users: 0,
          frequency: 0,
          avgTime: 0
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
        body: JSON.stringify({
          name: newFolder.name,
          color: newFolder.color
        })
      })

      if (response.ok) {
        await loadData()
        setNewFolder({ name: '', color: 'blue' })
        setShowAddFolder(false)
        showToast('Папка создана', 'success')
      }
    } catch {
      showToast('Ошибка создания папки', 'error')
    }
  }

  const deleteLink = async (id: string) => {
    if (!confirm('Удалить ссылку?')) return
    try {
      await apiFetch(`/api/tracked-posts/${id}`, { method: 'DELETE' })
      setPosts(prev => prev.filter(p => p.id !== id))
      showToast('Удалено', 'success')
    } catch {
      showToast('Ошибка удаления', 'error')
    }
  }

  const deleteFolder = async (id: string) => {
    if (!confirm('Удалить папку?')) return
    try {
      await apiFetch(`/api/tracked-folders/${id}`, { method: 'DELETE' })
      setFolders(prev => prev.filter(f => f.id !== id))
      setPosts(prev => prev.map(p => p.folderId === id ? { ...p, folderId: undefined } : p))
      showToast('Папка удалена', 'success')
    } catch {
      showToast('Ошибка удаления', 'error')
    }
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    showToast('Скопировано!', 'success')
  }

  const getPlatform = (id: string) => PLATFORMS.find(p => p.id === id) || PLATFORMS[PLATFORMS.length - 1]
  const getFolderColor = (colorId: string) => FOLDER_COLORS.find(c => c.id === colorId)?.color || FOLDER_COLORS[0].color

  const parseUTM = (url: string) => {
    try {
      const urlObj = new URL(url)
      return {
        source: urlObj.searchParams.get('utm_source') || '',
        medium: urlObj.searchParams.get('utm_medium') || '',
        campaign: urlObj.searchParams.get('utm_campaign') || '',
        term: urlObj.searchParams.get('utm_term') || '',
      }
    } catch {
      return { source: '', medium: '', campaign: '', term: '' }
    }
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchQuery || 
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.utmUrl?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const filteredMetrikaLinks = metrikaLinks.filter(link => {
    const matchesSearch = !searchQuery || 
      link.utm_term?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.utm_campaign?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.utm_source?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const rootPosts = filteredPosts.filter(p => !p.folderId)
  const postsByFolder = folders.reduce((acc, folder) => {
    acc[folder.id] = filteredPosts.filter(p => p.folderId === folder.id)
    return acc
  }, {} as Record<string, TrackedPost[]>)

  const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0)
  const totalConversions = posts.reduce((sum, p) => sum + (p.conversions || 0), 0)
  const totalUsers = posts.reduce((sum, p) => sum + (p.users || 0), 0)

  // Форматирование времени в MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Умный индикатор состояния: оцениваем по совокупности метрик
  const getHealthIndicator = (post: TrackedPost) => {
    const bounceRate = post.bounceRate || 0
    const users = post.users || 0
    const views = post.views || 0
    const conversions = post.conversions || 0
    const avgTime = post.avgTime || 0
    
    // Нет данных - серый
    if (users === 0 && views === 0) return { color: 'bg-gray-400', title: 'Нет данных' }
    
    // Оценка: отказы < 30% хорошо, > 60% плохо
    // Время на сайте > 60с хорошо, < 20с плохо
    // Конверсии > 0 хорошо
    let score = 0
    
    if (bounceRate < 30) score += 2
    else if (bounceRate < 50) score += 1
    else if (bounceRate > 60) score -= 1
    
    if (avgTime > 60) score += 2
    else if (avgTime > 30) score += 1
    else if (avgTime < 20 && avgTime > 0) score -= 1
    
    if (conversions > 0) score += 2
    if (users > 10) score += 1
    
    if (score >= 3) return { color: 'bg-green-500', title: 'Хорошие показатели' }
    if (score >= 1) return { color: 'bg-yellow-500', title: 'Средние показатели' }
    return { color: 'bg-red-500', title: 'Требует внимания' }
  }

  const renderPostCard = (post: TrackedPost) => {
    const platform = getPlatform(post.platform)
    const health = getHealthIndicator(post)
    
    return (
      <div key={post.id} className="flex items-center gap-2 p-2.5 hover:bg-[var(--background)]/50 border-b border-[var(--border)] last:border-b-0">
        {/* Умный индикатор */}
        <div 
          className={`w-2 h-2 rounded-full ${health.color} flex-shrink-0`} 
          title={health.title}
        />
        
        <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${platform.color}`}>
          {platform.name}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{post.title}</p>
          <p className="text-[10px] opacity-50 truncate">{post.utmUrl}</p>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <div className="text-center min-w-[40px]">
            <p className="font-bold text-sm">{post.users || 0}</p>
            <p className="opacity-50">польз.</p>
          </div>
          <div className="text-center min-w-[45px]">
            <p className="font-bold text-sm">{post.views || 0}</p>
            <p className="opacity-50">визитов</p>
          </div>
          <div className="text-center min-w-[35px]">
            <p className="font-bold text-sm">{post.conversions || 0}</p>
            <p className="opacity-50">конв.</p>
          </div>
          <div className="text-center min-w-[35px]">
            <p className="font-bold text-sm">{formatTime(post.avgTime || 0)}</p>
            <p className="opacity-50">время</p>
          </div>
          <div className="text-center min-w-[35px]">
            <p className="font-bold text-sm">{post.bounceRate?.toFixed(0) || 0}%</p>
            <p className="opacity-50">отказы</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => copyLink(post.utmUrl)} className="p-1 hover:bg-[var(--border)] rounded" title="Копировать">
            <Copy className="w-3.5 h-3.5 opacity-50" />
          </button>
          <a href={post.utmUrl} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-[var(--border)] rounded" title="Открыть">
            <ExternalLink className="w-3.5 h-3.5 opacity-50" />
          </a>
          <button onClick={() => deleteLink(post.id)} className="p-1 hover:bg-red-500/20 rounded text-red-400" title="Удалить">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h1 className="text-lg font-bold">Трекер ссылок</h1>
          <p className="text-[10px] opacity-60">Отслеживание UTM-ссылок</p>
        </div>
        <div className="flex gap-1.5">
          <button 
            onClick={refreshStats}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-1 text-xs px-2 py-1.5"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setShowAddFolder(true)}
            className="btn-secondary flex items-center gap-1 text-xs px-2 py-1.5"
          >
            <FolderPlus className="w-3 h-3" />
          </button>
          <button 
            onClick={() => setShowAddLink(true)}
            className="btn-primary flex items-center gap-1 text-xs px-2.5 py-1.5"
          >
            <Plus className="w-3 h-3" />
            Добавить
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-2 flex items-center gap-2">
          <div className="p-1 bg-blue-500/20 rounded">
            <BarChart3 className="w-3 h-3 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-bold">{posts.length}</p>
            <p className="text-[9px] opacity-60">Ссылок</p>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-2 flex items-center gap-2">
          <div className="p-1 bg-cyan-500/20 rounded">
            <Users className="w-3 h-3 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-bold">{totalUsers.toLocaleString()}</p>
            <p className="text-[9px] opacity-60">Польз.</p>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-2 flex items-center gap-2">
          <div className="p-1 bg-green-500/20 rounded">
            <Eye className="w-3 h-3 text-green-400" />
          </div>
          <div>
            <p className="text-sm font-bold">{totalViews.toLocaleString()}</p>
            <p className="text-[9px] opacity-60">Визитов</p>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-2 flex items-center gap-2">
          <div className="p-1 bg-orange-500/20 rounded">
            <TrendingUp className="w-3 h-3 text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-bold">{totalConversions}</p>
            <p className="text-[9px] opacity-60">Конв.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 p-0.5 bg-[var(--card)] border border-[var(--border)] rounded-lg mb-3 w-fit">
        <button
          onClick={() => setActiveTab('tracked')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            activeTab === 'tracked' ? 'bg-[var(--button)] text-white' : 'hover:bg-[var(--border)]'
          }`}
        >
          Мои ({posts.length})
        </button>
        <button
          onClick={() => setActiveTab('metrika')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            activeTab === 'metrika' ? 'bg-[var(--button)] text-white' : 'hover:bg-[var(--border)]'
          }`}
        >
          Метрика ({metrikaLinks.length})
        </button>
      </div>

      {/* Search */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-2 mb-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full py-1.5 text-sm"
            />
          </div>
          
          {activeTab === 'metrika' && (
            <>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-field py-1.5 text-xs w-[120px]"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-field py-1.5 text-xs w-[120px]"
              />
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={compareEnabled}
                  onChange={(e) => setCompareEnabled(e.target.checked)}
                  className="w-3.5 h-3.5 rounded"
                />
                <span className="opacity-70">Сравнить</span>
              </label>
              <button
                onClick={loadMetrikaData}
                disabled={loadingMetrika}
                className="btn-secondary px-2 py-1.5"
              >
                {loadingMetrika ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'tracked' ? (
        loading ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 text-center">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--button)] border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-xs opacity-60">Загрузка...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <h3 className="font-medium text-sm mb-1">Нет ссылок</h3>
            <p className="text-xs opacity-60 mb-2">Добавьте вручную или выберите из Метрики</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setShowAddLink(true)} className="btn-primary text-xs px-3 py-1.5">
                Добавить
              </button>
              <button onClick={() => setActiveTab('metrika')} className="btn-secondary text-xs px-3 py-1.5">
                Из Метрики
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
            {folders.map(folder => {
              const folderPosts = postsByFolder[folder.id] || []
              const isExpanded = expandedFolders.has(folder.id)
              
              return (
                <div key={folder.id} className="border-b border-[var(--border)] last:border-b-0">
                  <div 
                    className="flex items-center gap-2 p-2 hover:bg-[var(--background)]/50 cursor-pointer group"
                    onClick={() => toggleFolder(folder.id)}
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 opacity-50" /> : <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                    <div className={`p-1 rounded ${getFolderColor(folder.color)}`}>
                      {isExpanded ? <FolderOpen className="w-3 h-3" /> : <Folder className="w-3 h-3" />}
                    </div>
                    <span className="font-medium text-sm flex-1">{folder.name}</span>
                    <span className="text-[10px] opacity-50">{folderPosts.length}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id) }}
                      className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  
                  {isExpanded && folderPosts.length > 0 && (
                    <div className="border-t border-[var(--border)] bg-[var(--background)]/30">
                      {folderPosts.map(renderPostCard)}
                    </div>
                  )}
                </div>
              )
            })}
            {rootPosts.map(renderPostCard)}
          </div>
        )
      ) : (
        loadingMetrika ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 text-center">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--button)] border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-xs opacity-60">Загрузка из Метрики...</p>
          </div>
        ) : metrikaLinks.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <h3 className="font-medium text-sm mb-1">Нет данных</h3>
            <p className="text-xs opacity-60 mb-2">Проверьте настройки Метрики</p>
            <button onClick={loadMetrikaData} className="btn-primary text-xs px-3 py-1.5">
              Загрузить
            </button>
          </div>
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="p-2 border-b border-[var(--border)] bg-[var(--background)]/50">
              <p className="text-[10px] opacity-60">
                Найдено {filteredMetrikaLinks.length} ссылок. Нажмите ⭐ для добавления.
              </p>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {filteredMetrikaLinks.map((link, idx) => {
                const isTracked = trackedUtmTerms.has(link.utm_term)
                const platform = detectPlatform(link.utm_source || '')
                const platformInfo = getPlatform(platform)
                const comparison = getComparison(link)
                
                return (
                  <div 
                    key={idx} 
                    className={`flex items-center gap-2 p-2 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--background)]/50 ${
                      isTracked ? 'bg-green-500/5' : ''
                    }`}
                  >
                    <button
                      onClick={() => !isTracked && trackFromMetrika(link)}
                      disabled={isTracked}
                      className={`p-1 rounded transition-colors ${
                        isTracked ? 'bg-green-500/20 text-green-400' : 'hover:bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {isTracked ? <Check className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                    </button>
                    
                    <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${platformInfo.color}`}>
                      {platformInfo.name}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{link.utm_term || link.utm_campaign || '—'}</p>
                      <p className="text-[10px] opacity-50 truncate">
                        {link.utm_source} / {link.utm_medium}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3 text-[10px]">
                      <div className="text-center">
                        <div className="flex items-center gap-1">
                          <p className="font-bold text-sm">{link.users?.toLocaleString() || 0}</p>
                          {comparison && !comparison.isNew && typeof comparison.usersPercent === 'number' && comparison.usersPercent !== 0 && (
                            <span className={`text-[9px] ${comparison.usersPercent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {comparison.usersPercent > 0 ? '↑' : '↓'}{Math.abs(comparison.usersPercent)}%
                            </span>
                          )}
                          {comparison?.isNew && <span className="text-[9px] text-blue-400">new</span>}
                        </div>
                        <p className="opacity-50">польз.</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1">
                          <p className="font-bold text-sm">{link.visits?.toLocaleString() || 0}</p>
                          {comparison && !comparison.isNew && typeof comparison.visitsPercent === 'number' && comparison.visitsPercent !== 0 && (
                            <span className={`text-[9px] ${comparison.visitsPercent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {comparison.visitsPercent > 0 ? '↑' : '↓'}{Math.abs(comparison.visitsPercent)}%
                            </span>
                          )}
                        </div>
                        <p className="opacity-50">визиты</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-sm">{link.bounceRate?.toFixed(0) || 0}%</p>
                        <p className="opacity-50">отказы</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}

      {/* Add Link Modal */}
      {showAddLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] w-full max-w-sm">
            <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
              <h3 className="font-semibold text-sm">Добавить ссылку</h3>
              <button onClick={() => setShowAddLink(false)} className="p-1 hover:bg-[var(--border)] rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Название</label>
                <input
                  type="text"
                  placeholder="Пост VK о турах"
                  value={newLink.title}
                  onChange={(e) => setNewLink(prev => ({ ...prev, title: e.target.value }))}
                  className="input-field w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">URL с UTM</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newLink.utmUrl}
                  onChange={(e) => setNewLink(prev => ({ ...prev, utmUrl: e.target.value }))}
                  className="input-field w-full text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Платформа</label>
                  <select
                    value={newLink.platform}
                    onChange={(e) => setNewLink(prev => ({ ...prev, platform: e.target.value }))}
                    className="input-field w-full text-sm"
                  >
                    {PLATFORMS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                {folders.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Папка</label>
                    <select
                      value={newLink.folderId}
                      onChange={(e) => setNewLink(prev => ({ ...prev, folderId: e.target.value }))}
                      className="input-field w-full text-sm"
                    >
                      <option value="">—</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 p-3 border-t border-[var(--border)]">
              <button onClick={() => setShowAddLink(false)} className="btn-secondary flex-1 text-sm">
                Отмена
              </button>
              <button onClick={addLink} className="btn-primary flex-1 text-sm">
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Folder Modal */}
      {showAddFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] w-full max-w-xs">
            <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
              <h3 className="font-semibold text-sm">Создать папку</h3>
              <button onClick={() => setShowAddFolder(false)} className="p-1 hover:bg-[var(--border)] rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Название</label>
                <input
                  type="text"
                  placeholder="Название папки"
                  value={newFolder.name}
                  onChange={(e) => setNewFolder(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Цвет</label>
                <div className="flex gap-1.5">
                  {FOLDER_COLORS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setNewFolder(prev => ({ ...prev, color: c.id }))}
                      className={`w-6 h-6 rounded border-2 ${c.color} ${
                        newFolder.color === c.id ? 'ring-2 ring-offset-1 ring-offset-[var(--card)]' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-3 border-t border-[var(--border)]">
              <button onClick={() => setShowAddFolder(false)} className="btn-secondary flex-1 text-sm">
                Отмена
              </button>
              <button onClick={addFolder} className="btn-primary flex-1 text-sm">
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hint */}
      <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-[10px] text-blue-400">
          💡 Настройте токен Яндекс.Метрики в Настройках для загрузки данных
        </p>
      </div>
    </div>
  )
}
