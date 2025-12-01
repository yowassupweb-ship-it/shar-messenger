'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { showToast } from '@/components/Toast'
import { 
  Plus, Search, RefreshCw, Copy, ExternalLink, Trash2, 
  FolderPlus, Folder, FolderOpen, ChevronRight, ChevronDown,
  BarChart3, Eye, MousePointer, TrendingUp, X, Users, Clock, Repeat
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
  folderId?: string
}

interface TrackedFolder {
  id: string
  name: string
  color: string
  createdAt: string
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

const FOLDER_COLORS = [
  { id: 'blue', color: 'bg-blue-500/20 border-blue-500/50 text-blue-400' },
  { id: 'green', color: 'bg-green-500/20 border-green-500/50 text-green-400' },
  { id: 'purple', color: 'bg-purple-500/20 border-purple-500/50 text-purple-400' },
  { id: 'orange', color: 'bg-orange-500/20 border-orange-500/50 text-orange-400' },
  { id: 'pink', color: 'bg-pink-500/20 border-pink-500/50 text-pink-400' },
  { id: 'cyan', color: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' },
]

export default function TrackerPage() {
  const [posts, setPosts] = useState<TrackedPost[]>([])
  const [folders, setFolders] = useState<TrackedFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  
  // UTM Filters
  const [filterSource, setFilterSource] = useState<string>('')
  const [filterMedium, setFilterMedium] = useState<string>('')
  const [filterCampaign, setFilterCampaign] = useState<string>('')
  
  // Modals
  const [showAddLink, setShowAddLink] = useState(false)
  const [showAddFolder, setShowAddFolder] = useState(false)
  
  // New link form
  const [newLink, setNewLink] = useState({
    title: '',
    utmUrl: '',
    platform: 'vk',
    folderId: ''
  })
  
  // New folder form
  const [newFolder, setNewFolder] = useState({
    name: '',
    color: 'blue'
  })

  useEffect(() => {
    loadData()
  }, [])

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

  const refreshStats = async () => {
    setRefreshing(true)
    showToast('Обновление статистики...', 'info')
    
    try {
      // Здесь будет логика обновления статистики из Метрики
      await loadData()
      showToast('Статистика обновлена', 'success')
    } catch {
      showToast('Ошибка обновления', 'error')
    } finally {
      setRefreshing(false)
    }
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
    if (!confirm('Удалить папку? Ссылки будут перемещены в корень.')) return
    
    try {
      await apiFetch(`/api/tracked-folders/${id}`, { method: 'DELETE' })
      setFolders(prev => prev.filter(f => f.id !== id))
      // Обновляем посты - убираем folderId
      setPosts(prev => prev.map(p => p.folderId === id ? { ...p, folderId: undefined } : p))
      showToast('Папка удалена', 'success')
    } catch {
      showToast('Ошибка удаления', 'error')
    }
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    showToast('Скопировано!', 'success')
  }

  const getPlatform = (id: string) => PLATFORMS.find(p => p.id === id) || PLATFORMS[PLATFORMS.length - 1]
  const getFolderColor = (colorId: string) => FOLDER_COLORS.find(c => c.id === colorId)?.color || FOLDER_COLORS[0].color

  // Извлечение UTM из URL
  const parseUTM = (url: string) => {
    try {
      const urlObj = new URL(url)
      return {
        source: urlObj.searchParams.get('utm_source') || '',
        medium: urlObj.searchParams.get('utm_medium') || '',
        campaign: urlObj.searchParams.get('utm_campaign') || '',
      }
    } catch {
      return { source: '', medium: '', campaign: '' }
    }
  }

  // Уникальные значения для фильтров
  const uniqueSources = [...new Set(posts.map(p => parseUTM(p.utmUrl).source).filter(Boolean))].sort()
  const uniqueMediums = [...new Set(posts.map(p => parseUTM(p.utmUrl).medium).filter(Boolean))].sort()
  const uniqueCampaigns = [...new Set(posts.map(p => parseUTM(p.utmUrl).campaign).filter(Boolean))].sort()

  const hasUTMFilters = filterSource || filterMedium || filterCampaign

  const clearUTMFilters = () => {
    setFilterSource('')
    setFilterMedium('')
    setFilterCampaign('')
  }

  // Фильтрация
  const filteredPosts = posts.filter(post => {
    const utm = parseUTM(post.utmUrl)
    const matchesSearch = !searchQuery || 
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.utmUrl?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFolder = !selectedFolder || post.folderId === selectedFolder
    const matchesSource = !filterSource || utm.source === filterSource
    const matchesMedium = !filterMedium || utm.medium === filterMedium
    const matchesCampaign = !filterCampaign || utm.campaign === filterCampaign
    return matchesSearch && matchesFolder && matchesSource && matchesMedium && matchesCampaign
  })

  // Группировка по папкам
  const rootPosts = filteredPosts.filter(p => !p.folderId)
  const postsByFolder = folders.reduce((acc, folder) => {
    acc[folder.id] = filteredPosts.filter(p => p.folderId === folder.id)
    return acc
  }, {} as Record<string, TrackedPost[]>)

  // Статистика
  const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0)
  const totalClicks = posts.reduce((sum, p) => sum + (p.clicks || 0), 0)
  const totalConversions = posts.reduce((sum, p) => sum + (p.conversions || 0), 0)
  const totalUsers = posts.reduce((sum, p) => sum + (p.users || 0), 0)
  const avgFrequency = posts.length > 0 
    ? posts.reduce((sum, p) => sum + (p.frequency || 0), 0) / posts.length 
    : 0
  const avgTime = posts.length > 0 
    ? posts.reduce((sum, p) => sum + (p.avgTime || 0), 0) / posts.length 
    : 0
  
  // Форматирование времени в минутах:секундах
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Трекер ссылок</h1>
          <p className="text-sm opacity-60 mt-1">Отслеживание эффективности UTM-ссылок</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={refreshStats}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Обновить
          </button>
          <button 
            onClick={() => setShowAddFolder(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <FolderPlus className="w-4 h-4" />
            Папка
          </button>
          <button 
            onClick={() => setShowAddLink(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Добавить
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-7 gap-3 mb-6">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 rounded-lg">
              <BarChart3 className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-lg font-bold">{posts.length}</p>
              <p className="text-[10px] opacity-60">Ссылок</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-500/20 rounded-lg">
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-lg font-bold">{totalUsers.toLocaleString()}</p>
              <p className="text-[10px] opacity-60">Посетителей</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-500/20 rounded-lg">
              <Eye className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-lg font-bold">{totalViews.toLocaleString()}</p>
              <p className="text-[10px] opacity-60">Визитов</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/20 rounded-lg">
              <MousePointer className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-lg font-bold">{totalClicks.toLocaleString()}</p>
              <p className="text-[10px] opacity-60">Кликов</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 group relative">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-500/20 rounded-lg">
              <TrendingUp className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <p className="text-lg font-bold">{totalConversions}</p>
              <p className="text-[10px] opacity-60">Конверсий</p>
            </div>
          </div>
          {/* Hover tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
            <p className="font-medium mb-1">Конверсии по типам:</p>
            <p className="opacity-70">• Заявки: —</p>
            <p className="opacity-70">• Звонки: —</p>
            <p className="opacity-70">• Чаты: —</p>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-yellow-500/20 rounded-lg">
              <Repeat className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-lg font-bold">{avgFrequency.toFixed(1)}</p>
              <p className="text-[10px] opacity-60">Частота</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-pink-500/20 rounded-lg">
              <Clock className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <p className="text-lg font-bold">{formatTime(avgTime)}</p>
              <p className="text-[10px] opacity-60">Ср. время</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and UTM Filters */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-4">
        <div className="grid grid-cols-5 gap-3">
          {/* Поиск */}
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1 opacity-70">Поиск</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
              <input
                type="text"
                placeholder="По названию или ссылке..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full pl-10 text-sm"
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
        </div>
        
        {hasUTMFilters && (
          <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
            <span className="text-xs opacity-60">
              Найдено: {filteredPosts.length} из {posts.length}
            </span>
            <button
              onClick={clearUTMFilters}
              className="text-xs text-[var(--button)] hover:underline"
            >
              Сбросить фильтры
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--button)] border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-sm opacity-60">Загрузка...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <h3 className="font-medium mb-2">Нет отслеживаемых ссылок</h3>
          <p className="text-sm opacity-60 mb-4">Добавьте первую ссылку для отслеживания</p>
          <button onClick={() => setShowAddLink(true)} className="btn-primary">
            Добавить ссылку
          </button>
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          {/* Folders */}
          {folders.map(folder => {
            const folderPosts = postsByFolder[folder.id] || []
            const isExpanded = expandedFolders.has(folder.id)
            
            return (
              <div key={folder.id} className="border-b border-[var(--border)] last:border-b-0">
                <div 
                  className="flex items-center gap-3 p-3 hover:bg-[var(--background)]/50 cursor-pointer"
                  onClick={() => toggleFolder(folder.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  ) : (
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  )}
                  <div className={`p-1.5 rounded ${getFolderColor(folder.color)}`}>
                    {isExpanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                  </div>
                  <span className="font-medium flex-1">{folder.name}</span>
                  <span className="text-xs opacity-50">{folderPosts.length} ссылок</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id) }}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:opacity-100 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {isExpanded && folderPosts.length > 0 && (
                  <div className="bg-[var(--background)]/30">
                    {folderPosts.map(post => (
                      <LinkRow key={post.id} post={post} onCopy={copyLink} onDelete={deleteLink} getPlatform={getPlatform} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          
          {/* Root posts */}
          {rootPosts.map(post => (
            <LinkRow key={post.id} post={post} onCopy={copyLink} onDelete={deleteLink} getPlatform={getPlatform} />
          ))}
        </div>
      )}

      {/* Add Link Modal */}
      {showAddLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Добавить ссылку</h3>
              <button onClick={() => setShowAddLink(false)} className="p-1 hover:bg-[var(--border)] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 opacity-70">Название *</label>
                <input
                  type="text"
                  value={newLink.title}
                  onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                  placeholder="Летняя распродажа VK"
                  className="input-field w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 opacity-70">UTM-ссылка *</label>
                <input
                  type="text"
                  value={newLink.utmUrl}
                  onChange={(e) => setNewLink({ ...newLink, utmUrl: e.target.value })}
                  placeholder="https://vs-travel.ru?utm_source=vk&utm_medium=social"
                  className="input-field w-full font-mono text-sm"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 opacity-70">Платформа</label>
                  <select
                    value={newLink.platform}
                    onChange={(e) => setNewLink({ ...newLink, platform: e.target.value })}
                    className="input-field w-full"
                  >
                    {PLATFORMS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 opacity-70">Папка</label>
                  <select
                    value={newLink.folderId}
                    onChange={(e) => setNewLink({ ...newLink, folderId: e.target.value })}
                    className="input-field w-full"
                  >
                    <option value="">Без папки</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button onClick={addLink} className="btn-primary flex-1">Добавить</button>
              <button onClick={() => setShowAddLink(false)} className="btn-secondary">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Folder Modal */}
      {showAddFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Создать папку</h3>
              <button onClick={() => setShowAddFolder(false)} className="p-1 hover:bg-[var(--border)] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 opacity-70">Название</label>
                <input
                  type="text"
                  value={newFolder.name}
                  onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                  placeholder="Рекламные кампании"
                  className="input-field w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 opacity-70">Цвет</label>
                <div className="flex gap-2">
                  {FOLDER_COLORS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setNewFolder({ ...newFolder, color: c.id })}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${c.color} ${
                        newFolder.color === c.id ? 'ring-2 ring-offset-2 ring-offset-[var(--card)]' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button onClick={addFolder} className="btn-primary flex-1">Создать</button>
              <button onClick={() => setShowAddFolder(false)} className="btn-secondary">Отмена</button>
            </div>
          </div>
        </div>
      )}
      
      <p className="text-xs opacity-40 mt-4">
        💡 Для получения данных из Яндекс.Метрики настройте токен и ID счётчика в Настройках
      </p>
    </div>
  )
}

// Компонент строки ссылки
function LinkRow({ 
  post, 
  onCopy, 
  onDelete, 
  getPlatform 
}: { 
  post: TrackedPost
  onCopy: (url: string) => void
  onDelete: (id: string) => void
  getPlatform: (id: string) => { id: string; name: string; color: string }
}) {
  const platform = getPlatform(post.platform)
  
  // Форматирование времени в минутах:секундах
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <div className="flex items-center gap-4 p-3 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--background)]/50 group">
      <span className={`px-2 py-1 text-xs rounded ${platform.color}`}>
        {platform.name}
      </span>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{post.title || 'Без названия'}</p>
        <p className="text-xs opacity-50 truncate font-mono">{post.utmUrl}</p>
      </div>
      
      <div className="flex items-center gap-3 text-xs">
        <div className="text-center" title="Уникальные посетители">
          <p className="font-medium">{post.users || 0}</p>
          <p className="opacity-50">польз.</p>
        </div>
        <div className="text-center" title="Всего визитов">
          <p className="font-medium">{post.views || 0}</p>
          <p className="opacity-50">визитов</p>
        </div>
        <div className="text-center relative group/conv" title="Конверсии">
          <p className="font-medium">{post.conversions || 0}</p>
          <p className="opacity-50">конв.</p>
          {/* Hover с деталями конверсий */}
          {(post.conversions || 0) > 0 && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[10px] opacity-0 group-hover/conv:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
              <p className="opacity-70">Заявки: —</p>
              <p className="opacity-70">Звонки: —</p>
            </div>
          )}
        </div>
        <div className="text-center" title="Среднее время на сайте">
          <p className="font-medium">{formatTime(post.avgTime || 0)}</p>
          <p className="opacity-50">время</p>
        </div>
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onCopy(post.utmUrl)}
          className="p-1.5 hover:bg-[var(--border)] rounded"
          title="Копировать"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={() => window.open(post.utmUrl, '_blank')}
          className="p-1.5 hover:bg-[var(--border)] rounded"
          title="Открыть"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(post.id)}
          className="p-1.5 hover:bg-[var(--border)] rounded text-red-400"
          title="Удалить"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
