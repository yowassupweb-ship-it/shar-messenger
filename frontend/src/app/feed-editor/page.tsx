'use client'

import { useState, useEffect, useRef } from 'react'
import { showToast } from '@/components/Toast'
import GlassModal from '@/components/GlassModal'
import GlassButton from '@/components/GlassButton'
import LoadingOverlay from '@/components/LoadingOverlay'
import { apiFetch } from '@/lib/api'

interface Feed {
  id: string
  name: string
  sourceId: string
  sourceIds?: string[]
  status: string
  lastUpdate?: string
  itemsCount?: number
  format: string
  folderId?: string
  isProduction?: boolean
  utmTemplateId?: string
  slug?: string
  settings?: {
    requireAuth?: boolean
    username?: string
    password?: string
    productIds?: string[]
    feedTemplateId?: string
  }
}

interface DataSource {
  id: string
  name: string
  itemsCount?: number
}

interface Product {
  id: string
  name: string
  days: string
  route: string
  image: string
  price: string
  hidden?: boolean
  sourceId?: string
}

interface Folder {
  id: string
  name: string
  createdAt: string
}

interface UTMTemplate {
  id: string
  name: string
  description: string
  template: string
  variables: string[]
}

interface FeedTemplate {
  id: string
  name: string
  type: string
  content: any
  description?: string
}

export default function FeedEditorPage() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [sources, setSources] = useState<DataSource[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [utmTemplates, setUtmTemplates] = useState<UTMTemplate[]>([])
  const [feedTemplates, setFeedTemplates] = useState<FeedTemplate[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('all')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false)
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false)
  const [showXmlEditorModal, setShowXmlEditorModal] = useState(false)
  const [xmlEditorContent, setXmlEditorContent] = useState('')
  const [editingFeedId, setEditingFeedId] = useState<string | null>(null)
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null)
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null)
  const [renameFolderInput, setRenameFolderInput] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [selectedFeed, setSelectedFeed] = useState<Feed | null>(null)
  const [createMethod, setCreateMethod] = useState<'source' | 'file' | 'url' | 'manual' | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Drag scroll for folders slider
  const sliderRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  
  const [newFeed, setNewFeed] = useState({
    name: '',
    sourceId: '',
    sourceIds: [] as string[],
    format: 'xml',
    requireAuth: false,
    username: '',
    password: '',
    folderId: '',
    utmTemplateId: '',
    feedTemplateId: ''
  })

  const resetNewFeedForm = () => {
    setNewFeed({
      name: '',
      sourceId: '',
      sourceIds: [],
      format: 'xml',
      requireAuth: false,
      username: '',
      password: '',
      folderId: '',
      utmTemplateId: '',
      feedTemplateId: ''
    })
  }

  useEffect(() => {
    loadFeeds()
    loadSources()
    loadProducts()
    loadFolders()
    loadUtmTemplates()
    loadFeedTemplates()
  }, [])

  const loadFeedTemplates = async () => {
    try {
      const response = await apiFetch('/api/templates?type=feed')
      if (response.ok) {
        const data = await response.json()
        setFeedTemplates(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки шаблонов фидов:', error)
    }
  }

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

  const loadFolders = () => {
    // Загружаем папки из localStorage
    const savedFolders = localStorage.getItem('feedFolders')
    if (savedFolders) {
      setFolders(JSON.parse(savedFolders))
    }
  }

  // Drag scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sliderRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - sliderRef.current.offsetLeft)
    setScrollLeft(sliderRef.current.scrollLeft)
    sliderRef.current.style.cursor = 'grabbing'
    sliderRef.current.style.userSelect = 'none'
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
    if (sliderRef.current) {
      sliderRef.current.style.cursor = 'grab'
      sliderRef.current.style.userSelect = 'auto'
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    if (sliderRef.current) {
      sliderRef.current.style.cursor = 'grab'
      sliderRef.current.style.userSelect = 'auto'
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !sliderRef.current) return
    e.preventDefault()
    const x = e.pageX - sliderRef.current.offsetLeft
    const walk = (x - startX) * 2 // Скорость прокрутки
    sliderRef.current.scrollLeft = scrollLeft - walk
  }

  const createFolder = () => {
    if (!newFolderName.trim()) {
      showToast('Введите название папки', 'warning')
      return
    }

    const newFolder: Folder = {
      id: `folder_${Date.now()}`,
      name: newFolderName,
      createdAt: new Date().toISOString()
    }

    const updatedFolders = [...folders, newFolder]
    setFolders(updatedFolders)
    localStorage.setItem('feedFolders', JSON.stringify(updatedFolders))
    
    showToast('Папка создана', 'success')
    setShowFolderModal(false)
    setNewFolderName('')
  }

  const deleteFolder = (folderId: string) => {
    if (!confirm('Удалить папку? Фиды останутся без папки.')) return

    const updatedFolders = folders.filter(f => f.id !== folderId)
    setFolders(updatedFolders)
    localStorage.setItem('feedFolders', JSON.stringify(updatedFolders))
    
    showToast('Папка удалена', 'success')
  }

  const handleUpdateFeedFolder = async (feedId: string, folderId: string) => {
    try {
      const response = await apiFetch(`/api/feeds/${feedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId })
      })

      if (response.ok) {
        loadFeeds(true)
      }
    } catch (error) {
      console.error('Ошибка обновления папки фида:', error)
    }
  }

  const loadProducts = async () => {
    try {
      const response = await apiFetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data.filter((p: Product) => !p.hidden))
      }
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error)
    }
  }

  const loadFeeds = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setLoading(true)
      }
      const response = await apiFetch('/api/feeds')
      if (response.ok) {
        const data = await response.json()
        setFeeds(data)
      } else {
        console.error('Ошибка загрузки фидов, статус:', response.status)
        showToast('Ошибка загрузки фидов', 'error')
      }
    } catch (error) {
      console.error('Ошибка загрузки фидов:', error)
      showToast('Ошибка подключения к серверу', 'error')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const loadSources = async () => {
    try {
      const response = await apiFetch('/api/data-sources')
      if (response.ok) {
        const data = await response.json()
        // Загружаем товары БЕЗ объединения для правильного подсчета
        const productsResponse = await apiFetch('/api/products?merged=false')
        if (productsResponse.ok) {
          const products = await productsResponse.json()
          // Подсчитываем товары для каждого источника
          const sourcesWithCounts = data.map((source: DataSource) => ({
            ...source,
            itemsCount: products.filter((p: Product) => p.sourceId === source.id && !p.hidden).length
          }))
          setSources(sourcesWithCounts)
        } else {
          setSources(data)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки источников:', error)
    }
  }

  const handleCreateFeed = async () => {
    // Защита от множественных кликов
    if (isSaving) {
      showToast('Фид уже сохраняется, подождите...', 'warning')
      return
    }

    if (!newFeed.name) {
      showToast('Введите название фида', 'warning')
      return
    }

    // Проверка на дубликаты имен
    const duplicateFeed = feeds.find(f => f.name.toLowerCase() === newFeed.name.toLowerCase())
    if (duplicateFeed) {
      showToast(`Фид с именем "${newFeed.name}" уже существует!`, 'error')
      return
    }

    if (createMethod === 'source' && newFeed.sourceIds.length === 0) {
      showToast('Выберите хотя бы один источник данных', 'warning')
      return
    }

    if (createMethod === 'manual' && selectedProducts.length === 0) {
      showToast('Выберите хотя бы один товар', 'warning')
      return
    }

    setIsSaving(true)
    try {
      const payload: any = {
        name: newFeed.name,
        sourceId: createMethod === 'source' ? newFeed.sourceIds[0] : 'manual',
        sourceIds: createMethod === 'source' ? newFeed.sourceIds : ['manual'],
        format: newFeed.format,
        folderId: newFeed.folderId || null,
        utmTemplateId: newFeed.utmTemplateId || null,
        settings: {
          autoUpdate: createMethod === 'source',
          requireAuth: newFeed.requireAuth,
          feedTemplateId: newFeed.feedTemplateId || ''
        }
      }

      if (createMethod === 'manual') {
        payload.settings.productIds = selectedProducts
      }

      if (newFeed.requireAuth) {
        payload.settings.username = newFeed.username
        payload.settings.password = newFeed.password
      }

      const response = await apiFetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        showToast('Фид успешно создан! ✓', 'success')
        setShowAddModal(false)
        setCreateMethod(null)
        setSelectedProducts([])
        resetNewFeedForm()
        loadFeeds(true)
      } else {
        const errorData = await response.json()
        console.error('Ошибка создания фида:', errorData)
        console.error('Отправленный payload:', payload)
        showToast(`Ошибка создания фида: ${JSON.stringify(errorData)}`, 'error')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      showToast('Ошибка создания фида', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const getFeedUrl = (feedId: string) => {
    const feed = feeds.find(f => f.id === feedId)
    if (!feed) return ''
    
    const baseUrl = window.location.origin.replace(':3000', ':8000')
    if (feed.settings?.requireAuth && feed.settings.username) {
      return `${baseUrl.replace('://', `://${feed.settings.username}:${feed.settings.password}@`)}/feed/${feedId}`
    }
    return `${baseUrl}/feed/${feedId}`
  }

  const copyFeedUrl = (feedId: string) => {
    const url = getFeedUrl(feedId)
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('Ссылка скопирована', 'success')
      }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea')
        textarea.value = url
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        showToast('Ссылка скопирована', 'success')
      })
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = url
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      showToast('Ссылка скопирована', 'success')
    }
  }

  const handleDeleteFeed = async (feedId: string) => {
    if (!confirm('Удалить этот фид?')) return

    try {
      const response = await apiFetch(`/api/feeds/${feedId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showToast('Фид удален', 'success')
        loadFeeds(true)
      } else {
        showToast('Ошибка удаления фида', 'error')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      showToast('Ошибка удаления фида', 'error')
    }
  }

  const handleEditFeed = (feed: Feed) => {
    setSelectedFeed(feed)
    // Используем sourceIds если есть, иначе преобразуем sourceId в массив
    const sourceIds = feed.sourceIds && feed.sourceIds.length > 0 
      ? feed.sourceIds 
      : (feed.sourceId ? [feed.sourceId] : [])
    setNewFeed({
      name: feed.name,
      sourceId: feed.sourceId,
      sourceIds: sourceIds,
      format: feed.format,
      requireAuth: feed.settings?.requireAuth || false,
      username: feed.settings?.username || '',
      password: feed.settings?.password || '',
      folderId: feed.folderId || '',
      utmTemplateId: feed.utmTemplateId || '',
      feedTemplateId: feed.settings?.feedTemplateId || ''
    })
    setShowEditModal(true)
  }

  const handleUpdateFeed = async () => {
    if (!selectedFeed || !newFeed.name) {
      showToast('Введите название фида', 'warning')
      return
    }

    try {
      const payload: any = {
        name: newFeed.name,
        sourceId: newFeed.sourceIds.length > 0 ? newFeed.sourceIds[0] : selectedFeed.sourceId,
        sourceIds: newFeed.sourceIds.length > 0 ? newFeed.sourceIds : [selectedFeed.sourceId],
        format: newFeed.format,
        folderId: newFeed.folderId || null,
        isProduction: selectedFeed.isProduction,
        settings: {
          autoUpdate: true,
          requireAuth: newFeed.requireAuth,
          feedTemplateId: newFeed.feedTemplateId || ''
        }
      }

      if (newFeed.requireAuth) {
        payload.settings.username = newFeed.username
        payload.settings.password = newFeed.password
      }

      const response = await apiFetch(`/api/feeds/${selectedFeed.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        showToast('Фид обновлен', 'success')
        setShowEditModal(false)
        setSelectedFeed(null)
        resetNewFeedForm()
        loadFeeds(true)
      } else {
        showToast('Ошибка обновления фида', 'error')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      showToast('Ошибка обновления фида', 'error')
    }
  }

  const toggleProduction = async (feedId: string) => {
    const feed = feeds.find(f => f.id === feedId)
    if (!feed) return

    try {
      const response = await apiFetch(`/api/feeds/${feedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isProduction: !feed.isProduction })
      })

      if (response.ok) {
        showToast(feed.isProduction ? 'Фид снят с продвижения' : 'Фид переведен в продвижение', 'success')
        loadFeeds(true)
      } else {
        showToast('Ошибка обновления статуса', 'error')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      showToast('Ошибка обновления статуса', 'error')
    }
  }

  const filteredFeeds = feeds.filter(feed => {
    const matchesSearch = feed.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFolder = selectedFolder === 'all' || feed.folderId === selectedFolder
    return matchesSearch && matchesFolder
  })

  return (
    <div>
      <LoadingOverlay isLoading={isRefreshing} message="Обновление данных..." />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-2">
            Фиды
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            Управление фидами для Яндекс.Директ
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setShowFolderModal(true)}
            className="bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] px-6 py-2 rounded-lg hover:bg-[var(--hover)] transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Создать папку
          </button>
          <button 
            onClick={() => alert('AI генерация фида - в разработке')}
            className="bg-[var(--button)] text-white px-6 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors flex items-center gap-2"
            title="AI генерация фида"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Генерация
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-[var(--button)] text-white px-6 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить фид
          </button>
        </div>
      </div>

      {/* Folders Gallery */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Папки ({folders.length})
          </h2>
        </div>
        <div 
          ref={sliderRef}
          className="overflow-x-auto pb-4 cursor-grab"
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--button) var(--background)'
          }}
        >
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {/* Все папки */}
            <div
              onClick={() => setSelectedFolder('all')}
              className={`flex-shrink-0 w-64 p-4 rounded-lg cursor-pointer transition-all ${
                selectedFolder === 'all'
                  ? 'border-2 border-[var(--button)] bg-[var(--button)]/10'
                  : 'border-2 border-[var(--border)] hover:border-[var(--button)]/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-[var(--button)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <div>
                  <div className="font-semibold text-[var(--foreground)]">Все папки</div>
                  <div className="text-sm text-[var(--foreground)] opacity-60">
                    {feeds.length} {feeds.length === 1 ? 'фид' : 'фидов'}
                  </div>
                </div>
              </div>
            </div>

            {/* Без папки - only shown when folders exist */}
            {folders.length > 0 && (
              <div
                onClick={() => setSelectedFolder('')}
                className={`flex-shrink-0 w-64 p-4 rounded-lg cursor-pointer transition-all ${
                  selectedFolder === ''
                    ? 'border-2 border-[var(--button)] bg-[var(--button)]/10'
                    : 'border-2 border-[var(--border)] hover:border-[var(--button)]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-[var(--foreground)] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <div>
                    <div className="font-semibold text-[var(--foreground)]">Без папки</div>
                    <div className="text-sm text-[var(--foreground)] opacity-60">
                      {feeds.filter(f => !f.folderId).length} {feeds.filter(f => !f.folderId).length === 1 ? 'фид' : 'фидов'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User folders */}
            {folders.map((folder) => {
              const folderFeedsCount = feeds.filter(f => f.folderId === folder.id).length
              return (
                <div
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`flex-shrink-0 w-64 p-4 rounded-lg cursor-pointer transition-all relative ${
                    selectedFolder === folder.id
                      ? 'border-2 border-[var(--button)] bg-[var(--button)]/10'
                      : 'border-2 border-[var(--border)] hover:border-[var(--button)]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-8 h-8 text-[var(--button)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[var(--foreground)] truncate">{folder.name}</div>
                      <div className="text-sm text-[var(--foreground)] opacity-60">
                        {folderFeedsCount} {folderFeedsCount === 1 ? 'фид' : 'фидов'}
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setFolderToRename(folder)
                        setRenameFolderInput(folder.name)
                        setShowRenameFolderModal(true)
                      }}
                      className="p-1 rounded hover:bg-[var(--background)] transition-colors"
                      title="Переименовать"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setFolderToDelete(folder)
                        setShowDeleteFolderModal(true)
                      }}
                      className="p-1 rounded hover:bg-red-600/10 text-red-600 transition-colors"
                      title="Удалить"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--foreground)] opacity-40" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Поиск фидов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
          />
        </div>
      </div>

      {/* Feeds Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--button)]"></div>
          <p className="mt-4 text-[var(--foreground)] opacity-70">Загрузка фидов...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFeeds.map((feed) => (
            <div key={feed.id} className="card hover:border-[var(--button)] transition-colors relative w-full">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 pr-6">
                  <h3 className="font-semibold text-[var(--foreground)] mb-1 line-clamp-2 min-h-[2.5rem]">
                    <span className="inline-flex items-center gap-2">
                      {feed.name}
                      {feed.isProduction && (
                        <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" title="В продвижении"></span>
                      )}
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-[var(--foreground)] opacity-60">
                    <span className="truncate">
                      {sources.find(s => s.id === feed.sourceId)?.name || 'Ручной'}
                    </span>
                    {feed.folderId && (
                      <>
                        <span>•</span>
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span className="truncate text-xs">
                          {folders.find(f => f.id === feed.folderId)?.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {(() => {
                  // Определяем количество товаров с учетом источника
                  let itemsCount = 0
                  
                  if (feed.settings?.productIds?.length) {
                    // Если фид создан вручную с выбранными товарами
                    itemsCount = feed.settings.productIds.length
                  } else if (feed.sourceIds && feed.sourceIds.length > 0) {
                    // Multi-source фид - суммируем товары из всех источников
                    itemsCount = feed.sourceIds.reduce((total, srcId) => {
                      const source = sources.find(s => s.id === srcId)
                      return total + (source?.itemsCount || 0)
                    }, 0)
                  } else if (feed.sourceId) {
                    // Legacy single-source фид
                    const source = sources.find(s => s.id === feed.sourceId)
                    itemsCount = source?.itemsCount || 0
                  } else if (feed.itemsCount) {
                    // Иначе используем сохраненное значение из фида
                    itemsCount = feed.itemsCount
                  }
                  
                  const hasItems = itemsCount > 0
                  return (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      hasItems
                        ? 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400'
                        : 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}>
                      {hasItems ? 'Активен' : 'Пустой'}
                    </span>
                  )
                })()}
              </div>

              <div className="space-y-2 text-sm text-[var(--foreground)] opacity-70 mb-4">
                <div className="flex justify-between">
                  <span>Товаров:</span>
                  <span className="font-medium">
                    {(() => {
                      // Если manual фид с выбранными продуктами
                      if (feed.settings?.productIds?.length) {
                        return feed.settings.productIds.length
                      }
                      
                      // Если multi-source фид
                      if (feed.sourceIds && feed.sourceIds.length > 0) {
                        return feed.sourceIds.reduce((total, srcId) => {
                          const source = sources.find(s => s.id === srcId)
                          return total + (source?.itemsCount || 0)
                        }, 0)
                      }
                      
                      // Fallback для legacy single-source фидов
                      const source = sources.find(s => s.id === feed.sourceId)
                      if (source && source.itemsCount !== undefined) {
                        return source.itemsCount
                      }
                      
                      return feed.itemsCount || 0
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Формат:</span>
                  <span className="font-medium uppercase">{feed.format}</span>
                </div>
                {feed.lastUpdate && (
                  <div className="flex justify-between">
                    <span>Обновлено:</span>
                    <span className="font-medium text-xs">
                      {new Date(feed.lastUpdate).toLocaleString('ru-RU')}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-center">
                <button 
                  onClick={() => window.location.href = `/feed-editor/preview/${feed.id}`}
                  className="p-2 bg-[var(--button)] text-white rounded-lg hover:bg-[var(--button)]/90 transition-colors"
                  title="Редактировать"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button 
                  onClick={async () => {
                    try {
                      showToast('Обновление XML фида...', 'info')
                      // Запрос на перегенерацию XML (сервер уже генерирует XML на лету)
                      const response = await apiFetch(`/api/feeds/${feed.id}/xml`)
                      if (response.ok) {
                        showToast('XML фид обновлен!', 'success')
                      } else {
                        throw new Error('Ошибка обновления')
                      }
                    } catch (error) {
                      showToast('Ошибка обновления XML', 'error')
                    }
                  }}
                  className="p-2 border border-[var(--border)] rounded-lg hover:bg-[var(--background)] transition-colors"
                  title="Обновить XML"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button 
                  onClick={async () => {
                    try {
                      const response = await apiFetch(`/api/feeds/${feed.id}/xml`)
                      if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`)
                      }
                      const contentType = response.headers.get('content-type')
                      let data
                      if (contentType && contentType.includes('application/json')) {
                        const json = await response.json()
                        data = JSON.stringify(json, null, 2)
                      } else {
                        data = await response.text()
                      }
                      console.log('Loaded XML data:', data)
                      setXmlEditorContent(data)
                      setEditingFeedId(feed.id)
                      setShowXmlEditorModal(true)
                    } catch (error) {
                      console.error('Error loading XML:', error)
                      showToast('Ошибка загрузки XML: ' + (error as Error).message, 'error')
                    }
                  }}
                  className="p-2 border border-[var(--border)] rounded-lg hover:bg-[var(--background)] transition-colors"
                  title="Редактировать XML"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </button>
                <button 
                  onClick={() => toggleProduction(feed.id)}
                  className={`p-2 border rounded-lg transition-colors ${
                    feed.isProduction 
                      ? 'border-green-500 bg-green-500/10 hover:bg-green-500/20' 
                      : 'border-[var(--border)] hover:bg-[var(--background)]'
                  }`}
                  title={feed.isProduction ? 'Снять с продвижения' : 'Перевести в продвижение'}
                >
                  <svg className={`w-4 h-4 ${feed.isProduction ? 'text-green-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </button>
                <button 
                  onClick={() => copyFeedUrl(feed.id)}
                  className="p-2 border border-[var(--border)] rounded-lg hover:bg-[var(--background)] transition-colors"
                  title="Скопировать ссылку"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button 
                  onClick={() => handleEditFeed(feed)}
                  className="p-2 border border-[var(--border)] rounded-lg hover:bg-[var(--background)] transition-colors"
                  title="Настройки"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button 
                  onClick={() => handleDeleteFeed(feed.id)}
                  className="p-2 border border-red-600/50 text-red-600 rounded-lg hover:bg-red-600/10 transition-colors flex-shrink-0"
                  title="Удалить"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {filteredFeeds.length === 0 && !loading && (
            <div className="col-span-full card text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-[var(--foreground)] opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                {feeds.length === 0 ? 'Фидов пока нет' : 'Фиды не найдены'}
              </h3>
              <p className="text-[var(--foreground)] opacity-70 mb-4">
                {feeds.length === 0 ? 'Создайте первый фид для начала работы' : ''}
              </p>
              {feeds.length === 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-[var(--button)] text-white px-6 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Создать фид
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-[var(--border)]">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">
                {createMethod ? 'Создать фид' : 'Выберите способ создания'}
              </h2>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">

            {!createMethod ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCreateMethod('source')}
                  className="p-4 border-2 border-[var(--border)] rounded-lg hover:border-[var(--button)] transition-colors text-center"
                >
                  <svg className="w-8 h-8 mx-auto mb-2 text-[var(--button)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  <div className="font-medium text-[var(--foreground)]">Источник данных</div>
                  <div className="text-xs text-[var(--foreground)] opacity-60 mt-1">Данные с сайта</div>
                </button>

                <button
                  onClick={() => setCreateMethod('file')}
                  className="p-4 border-2 border-[var(--border)] rounded-lg hover:border-[var(--button)] transition-colors text-center"
                >
                  <svg className="w-8 h-8 mx-auto mb-2 text-[var(--button)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div className="font-medium text-[var(--foreground)]">Импорт файла</div>
                  <div className="text-xs text-[var(--foreground)] opacity-60 mt-1">Загрузить XML/CSV файл</div>
                </button>

                <button
                  onClick={() => setCreateMethod('url')}
                  className="p-4 border-2 border-[var(--border)] rounded-lg hover:border-[var(--button)] transition-colors text-center"
                >
                  <svg className="w-8 h-8 mx-auto mb-2 text-[var(--button)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <div className="font-medium text-[var(--foreground)]">По ссылке</div>
                  <div className="text-xs text-[var(--foreground)] opacity-60 mt-1">Подключить внешний фид</div>
                </button>

                <button
                  onClick={() => setCreateMethod('manual')}
                  className="p-4 border-2 border-[var(--border)] rounded-lg hover:border-[var(--button)] transition-colors text-center"
                >
                  <svg className="w-8 h-8 mx-auto mb-2 text-[var(--button)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <div className="font-medium text-[var(--foreground)]">Вручную</div>
                  <div className="text-xs text-[var(--foreground)] opacity-60 mt-1">Создать пустой фид</div>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Название фида
                  </label>
                  <input
                    type="text"
                    value={newFeed.name}
                    onChange={(e) => setNewFeed({...newFeed, name: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                    placeholder="Название фида"
                  />
                </div>

                {createMethod === 'source' && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Источники данных ({newFeed.sourceIds.length} выбрано)
                    </label>
                    <div className="max-h-60 overflow-y-auto border border-[var(--border)] rounded-lg">
                      {sources.map(source => (
                        <label 
                          key={source.id}
                          className="flex items-center gap-3 p-3 hover:bg-[var(--background)] cursor-pointer border-b border-[var(--border)] last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={newFeed.sourceIds.includes(source.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewFeed({...newFeed, sourceIds: [...newFeed.sourceIds, source.id]})
                              } else {
                                setNewFeed({...newFeed, sourceIds: newFeed.sourceIds.filter(id => id !== source.id)})
                              }
                            }}
                            className="w-4 h-4 flex-shrink-0"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-[var(--foreground)] text-sm">
                              {source.name}
                            </div>
                            <div className="text-xs text-[var(--foreground)] opacity-60">
                              {source.itemsCount || 0} товаров
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--foreground)] opacity-60 mt-2">
                      💡 Каждый источник будет отдельной категорией в фиде
                    </p>
                  </div>
                )}

                {createMethod === 'manual' && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Выберите товары ({selectedProducts.length} выбрано)
                    </label>
                    <div className="max-h-96 overflow-y-auto border border-[var(--border)] rounded-lg">
                      {products.map(product => (
                        <label 
                          key={product.id}
                          className="flex items-center gap-3 p-3 hover:bg-[var(--background)] cursor-pointer border-b border-[var(--border)] last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProducts([...selectedProducts, product.id])
                              } else {
                                setSelectedProducts(selectedProducts.filter(id => id !== product.id))
                              }
                            }}
                            className="w-4 h-4 flex-shrink-0"
                          />
                          {product.image && (
                            <img 
                              src={product.image} 
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-[var(--foreground)] text-sm truncate">
                              {product.name}
                            </div>
                            <div className="text-xs text-[var(--foreground)] opacity-60 truncate">
                              {product.route} • {product.days} {product.days === '1' ? 'день' : 'дня'}
                            </div>
                          </div>
                          <div className="text-sm font-medium text-[var(--button)] flex-shrink-0">
                            {parseInt(product.price).toLocaleString('ru-RU')} ₽
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Папка (необязательно)
                  </label>
                  <select
                    value={newFeed.folderId}
                    onChange={(e) => setNewFeed({...newFeed, folderId: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                  >
                    <option value="">Без папки</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Формат
                  </label>
                  <select
                    value={newFeed.format}
                    onChange={(e) => setNewFeed({...newFeed, format: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                  >
                    <option value="xml">XML (YML)</option>
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>

                {newFeed.format === 'xml' && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      XML шаблон
                    </label>
                    <select
                      value={newFeed.feedTemplateId}
                      onChange={(e) => setNewFeed({...newFeed, feedTemplateId: e.target.value})}
                      className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                    >
                      <option value="">Базовый шаблон (Яндекс.Директ)</option>
                      {feedTemplates.map(template => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    UTM шаблон
                  </label>
                  <select
                    value={newFeed.utmTemplateId}
                    onChange={(e) => setNewFeed({...newFeed, utmTemplateId: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                  >
                    <option value="">Без UTM меток</option>
                    {utmTemplates.map(template => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newFeed.requireAuth}
                      onChange={(e) => setNewFeed({...newFeed, requireAuth: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-[var(--foreground)]">Требовать авторизацию</span>
                  </label>
                </div>

                {newFeed.requireAuth && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                        Имя пользователя
                      </label>
                      <input
                        type="text"
                        value={newFeed.username}
                        onChange={(e) => setNewFeed({...newFeed, username: e.target.value})}
                        className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                        Пароль
                      </label>
                      <input
                        type="password"
                        value={newFeed.password}
                        onChange={(e) => setNewFeed({...newFeed, password: e.target.value})}
                        className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleCreateFeed}
                    disabled={isSaving}
                    className="flex-1 bg-[var(--button)] text-white px-6 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Сохранение...</span>
                      </>
                    ) : (
                      'Создать'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setCreateMethod(null)
                      resetNewFeedForm()
                    }}
                    className="px-6 py-2 border border-[var(--border)] rounded-lg text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
                  >
                    Назад
                  </button>
                </div>
              </div>
            )}
            </div>

            <button
              onClick={() => {
                setShowAddModal(false)
                setCreateMethod(null)
              }}
              className="absolute top-4 right-4 text-[var(--foreground)] opacity-50 hover:opacity-100 transition-opacity"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedFeed && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-[var(--border)]">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">
                Настройки фида
              </h2>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Название фида
                </label>
                <input
                  type="text"
                  value={newFeed.name}
                  onChange={(e) => setNewFeed({...newFeed, name: e.target.value})}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                  placeholder="Название фида"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Источники данных ({newFeed.sourceIds.length} выбрано)
                </label>
                <div className="max-h-48 overflow-y-auto border border-[var(--border)] rounded-lg p-3 bg-[var(--background)]">
                  {sources.map(source => (
                    <label key={source.id} className="flex items-center gap-2 mb-2 cursor-pointer hover:bg-[var(--card)] p-2 rounded">
                      <input
                        type="checkbox"
                        checked={newFeed.sourceIds.includes(source.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewFeed({...newFeed, sourceIds: [...newFeed.sourceIds, source.id]})
                          } else {
                            setNewFeed({...newFeed, sourceIds: newFeed.sourceIds.filter(id => id !== source.id)})
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-[var(--foreground)]">
                        {source.name} - {source.itemsCount || 0} товаров
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-[var(--foreground)] opacity-50 mt-2">
                  💡 Каждый источник будет отдельной категорией в фиде
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Формат
                </label>
                <select
                  value={newFeed.format}
                  onChange={(e) => setNewFeed({...newFeed, format: e.target.value})}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                >
                  <option value="xml">XML (YML)</option>
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                </select>
              </div>

              {newFeed.format === 'xml' && (
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    XML шаблон
                  </label>
                  <select
                    value={newFeed.feedTemplateId}
                    onChange={(e) => setNewFeed({...newFeed, feedTemplateId: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                  >
                    <option value="">Базовый шаблон (Яндекс.Директ)</option>
                    {feedTemplates.map(template => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Папка
                </label>
                <select
                  value={newFeed.folderId}
                  onChange={(e) => setNewFeed({...newFeed, folderId: e.target.value})}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                >
                  <option value="">Без папки</option>
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFeed.requireAuth}
                    onChange={(e) => setNewFeed({...newFeed, requireAuth: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-[var(--foreground)]">Требовать авторизацию</span>
                </label>
              </div>

              {newFeed.requireAuth && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Имя пользователя
                    </label>
                    <input
                      type="text"
                      value={newFeed.username}
                      onChange={(e) => setNewFeed({...newFeed, username: e.target.value})}
                      className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Пароль
                    </label>
                    <input
                      type="password"
                      value={newFeed.password}
                      onChange={(e) => setNewFeed({...newFeed, password: e.target.value})}
                      className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleUpdateFeed}
                  className="flex-1 bg-[var(--button)] text-white px-6 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedFeed(null)
                    resetNewFeedForm()
                  }}
                  className="px-6 py-2 border border-[var(--border)] rounded-lg text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
            </div>

            <button
              onClick={() => {
                setShowEditModal(false)
                setSelectedFeed(null)
              }}
              className="absolute top-4 right-4 text-[var(--foreground)] opacity-50 hover:opacity-100 transition-opacity"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      <GlassModal
        isOpen={showFolderModal}
        onClose={() => {
          setShowFolderModal(false)
          setNewFolderName('')
        }}
        title="Создать папку"
        footer={
          <>
            <GlassButton variant="secondary" onClick={() => {
              setShowFolderModal(false)
              setNewFolderName('')
            }}>
              Отмена
            </GlassButton>
            <GlassButton 
              variant="primary" 
              onClick={createFolder}
              disabled={!newFolderName.trim()}
            >
              Создать
            </GlassButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label 
              className="block mb-2 font-medium"
              style={{ color: 'var(--glass-text-primary, #cdd6f4)' }}
            >
              Название папки
            </label>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && newFolderName.trim() && createFolder()}
              className="w-full px-4 py-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[rgba(137,180,250,0.5)]"
              style={{
                background: 'rgba(17, 25, 40, 0.5)',
                border: '1px solid rgba(137, 180, 250, 0.2)',
                color: 'var(--glass-text-primary, #cdd6f4)'
              }}
              placeholder="Например: Горящие туры"
              autoFocus
            />
          </div>
        </div>
      </GlassModal>

      {/* Rename Folder Modal */}
      <GlassModal
        isOpen={showRenameFolderModal}
        onClose={() => {
          setShowRenameFolderModal(false)
          setFolderToRename(null)
          setRenameFolderInput('')
        }}
        title="Переименовать папку"
        footer={
          <>
            <GlassButton variant="secondary" onClick={() => {
              setShowRenameFolderModal(false)
              setFolderToRename(null)
              setRenameFolderInput('')
            }}>
              Отмена
            </GlassButton>
            <GlassButton 
              variant="primary"
              onClick={() => {
                if (folderToRename && renameFolderInput.trim()) {
                  const updated = folders.map(f => 
                    f.id === folderToRename.id ? { ...f, name: renameFolderInput.trim() } : f
                  )
                  setFolders(updated)
                  localStorage.setItem('feedFolders', JSON.stringify(updated))
                  showToast('Папка переименована', 'success')
                  setShowRenameFolderModal(false)
                  setFolderToRename(null)
                  setRenameFolderInput('')
                }
              }}
              disabled={!renameFolderInput.trim()}
            >
              Сохранить
            </GlassButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label 
              className="block mb-2 font-medium"
              style={{ color: 'var(--glass-text-primary, #cdd6f4)' }}
            >
              Новое название
            </label>
            <input
              type="text"
              value={renameFolderInput}
              onChange={(e) => setRenameFolderInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && renameFolderInput.trim() && folderToRename) {
                  const updated = folders.map(f => 
                    f.id === folderToRename.id ? { ...f, name: renameFolderInput.trim() } : f
                  )
                  setFolders(updated)
                  localStorage.setItem('feedFolders', JSON.stringify(updated))
                  showToast('Папка переименована', 'success')
                  setShowRenameFolderModal(false)
                  setFolderToRename(null)
                  setRenameFolderInput('')
                }
              }}
              className="w-full px-4 py-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[rgba(137,180,250,0.5)]"
              style={{
                background: 'rgba(17, 25, 40, 0.5)',
                border: '1px solid rgba(137, 180, 250, 0.2)',
                color: 'var(--glass-text-primary, #cdd6f4)'
              }}
              placeholder="Введите новое название"
              autoFocus
            />
          </div>
        </div>
      </GlassModal>

      {/* Delete Folder Modal */}
      <GlassModal
        isOpen={showDeleteFolderModal}
        onClose={() => {
          setShowDeleteFolderModal(false)
          setFolderToDelete(null)
        }}
        title="Удалить папку?"
        footer={
          <>
            <GlassButton variant="secondary" onClick={() => {
              setShowDeleteFolderModal(false)
              setFolderToDelete(null)
            }}>
              Отмена
            </GlassButton>
            <GlassButton 
              variant="danger"
              onClick={() => {
                if (folderToDelete) {
                  const updated = folders.filter(f => f.id !== folderToDelete.id)
                  setFolders(updated)
                  localStorage.setItem('feedFolders', JSON.stringify(updated))
                  if (selectedFolder === folderToDelete.id) {
                    setSelectedFolder('all')
                  }
                  showToast('Папка удалена', 'success')
                  setShowDeleteFolderModal(false)
                  setFolderToDelete(null)
                }
              }}
            >
              Удалить
            </GlassButton>
          </>
        }
      >
        <div className="space-y-4">
          <p style={{ color: 'var(--glass-text-secondary, #bac2de)' }}>
            Папка <strong style={{ color: 'var(--glass-text-primary, #cdd6f4)' }}>
              &quot;{folderToDelete?.name}&quot;
            </strong> будет удалена. Фиды останутся без папки.
          </p>
        </div>
      </GlassModal>

      {/* XML Editor Modal */}
      <GlassModal
        isOpen={showXmlEditorModal}
        onClose={() => {
          setShowXmlEditorModal(false)
          setXmlEditorContent('')
          setEditingFeedId(null)
        }}
        title="Редактор XML"
        footer={
          <>
            <GlassButton variant="secondary" onClick={() => {
              setShowXmlEditorModal(false)
              setXmlEditorContent('')
              setEditingFeedId(null)
            }}>
              Отмена
            </GlassButton>
            <GlassButton 
              onClick={async () => {
                if (editingFeedId) {
                  try {
                    const response = await apiFetch(`/api/feeds/${editingFeedId}/xml`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/xml',
                      },
                      body: xmlEditorContent
                    })
                    if (response.ok) {
                      showToast('XML обновлен', 'success')
                      setShowXmlEditorModal(false)
                      setXmlEditorContent('')
                      setEditingFeedId(null)
                    } else {
                      showToast('Ошибка при обновлении XML', 'error')
                    }
                  } catch (error) {
                    showToast('Ошибка при обновлении XML', 'error')
                  }
                }
              }}
            >
              Сохранить
            </GlassButton>
          </>
        }
      >
        <div className="space-y-4">
          <textarea
            value={xmlEditorContent}
            onChange={(e) => setXmlEditorContent(e.target.value)}
            className="w-full h-96 px-4 py-2 rounded-lg font-mono text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[rgba(137,180,250,0.5)]"
            style={{
              background: 'rgba(17, 25, 40, 0.5)',
              border: '1px solid rgba(137, 180, 250, 0.2)',
              color: 'var(--glass-text-primary, #cdd6f4)'
            }}
            placeholder="XML содержимое..."
            spellCheck={false}
          />
        </div>
      </GlassModal>
    </div>
  )
}


