'use client'

import { useState, useEffect } from 'react'
import { showToast } from '@/components/Toast'
import { formatDaysLabel } from '@/utils/formatDays'
import { apiFetch } from '@/lib/api'

interface Product {
  id: string
  name: string
  price: string | number
  oldPrice?: string | number  // Старая цена (для скидок)
  category?: string
  image: string
  inStock?: boolean
  sku?: string
  days?: string
  route?: string
  url?: string
  hidden?: boolean
  active?: boolean
  description?: string
  sourceId?: string
  sourceIds?: string[]  // Массив ID источников для объединенных товаров
  sources?: string[]     // Alias для обратной совместимости
}

interface Collection {
  id: string
  name: string
  url?: string
  description?: string
}

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSource, setSelectedSource] = useState('all')
  const [selectedDays, setSelectedDays] = useState('all')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [pauseFilter, setPauseFilter] = useState<'all' | 'active' | 'paused' | 'hidden'>('all')
  const [sources, setSources] = useState<Array<{id: string, name: string}>>([])
  const [feeds, setFeeds] = useState<Array<{id: string, name: string, sourceId?: string, settings?: {productIds?: string[]}}>>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false)

  // Функция склонения слова "день"
  const getDaysWord = (days: number): string => {
    const lastDigit = days % 10
    const lastTwoDigits = days % 100
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'дней'
    if (lastDigit === 1) return 'день'
    if (lastDigit >= 2 && lastDigit <= 4) return 'дня'
    return 'дней'
  }

  useEffect(() => {
    loadProducts()
    loadSources()
    loadFeeds()
    loadCollections()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      } else {
        showToast('Ошибка загрузки товаров', 'error')
      }
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error)
      showToast('Ошибка подключения к серверу', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadSources = async () => {
    try {
      const response = await apiFetch('/api/data-sources')
      if (response.ok) {
        const data = await response.json()
        setSources([
          { id: 'all', name: 'Все источники' },
          ...data.map((s: any) => ({ id: s.id, name: s.name }))
        ])
      }
    } catch (error) {
      console.error('Ошибка загрузки источников:', error)
      showToast('Не удалось подключиться к серверу. Проверьте, что бэкенд запущен.', 'error')
    }
  }

  const loadFeeds = async () => {
    try {
      const response = await apiFetch('/api/feeds')
      if (response.ok) {
        const data = await response.json()
        console.log('Loaded feeds:', data)
        setFeeds(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки фидов:', error)
    }
  }

  const loadCollections = async () => {
    try {
      const response = await apiFetch('/api/collections')
      if (response.ok) {
        const data = await response.json()
        setCollections(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки каталогов:', error)
    }
  }

  const getProductFeeds = (productId: string) => {
    // Проверяем как по productIds, так и по sourceId
    const productFeeds = feeds.filter(feed => {
      // Если у фида есть список конкретных товаров
      if (feed.settings?.productIds?.includes(productId)) {
        return true
      }
      // Если фид привязан к источнику товара
      const product = products.find(p => p.id === productId)
      if (product && feed.sourceId === product.sourceId && feed.sourceId !== 'manual') {
        return true
      }
      return false
    })
    
    if (productFeeds.length > 0) {
      console.log(`Product ${productId} is in feeds:`, productFeeds.map(f => f.name))
    }
    
    return productFeeds
  }

  const toggleProductVisibility = async (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    try {
      const response = await apiFetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: !product.hidden })
      })

      if (response.ok) {
        showToast(product.hidden ? 'Товар показан' : 'Товар скрыт', 'success')
        loadProducts()
      } else {
        showToast('Ошибка обновления товара', 'error')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      showToast('Ошибка обновления товара', 'error')
    }
  }

  const toggleProductActive = async (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    try {
      const response = await apiFetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: product.active === false ? true : false })
      })

      if (response.ok) {
        showToast(product.active === false ? 'Товар активирован' : 'Товар приостановлен', 'success')
        loadProducts()
      } else {
        showToast('Ошибка обновления товара', 'error')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      showToast('Ошибка обновления товара', 'error')
    }
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setShowEditModal(true)
  }

  const saveProductChanges = async () => {
    if (!editingProduct) return

    // Проверка дублей
    const isDuplicate = products.some(p => {
      if (p.id === editingProduct.id) return false // Пропускаем сам товар при редактировании
      return p.name === editingProduct.name || (editingProduct.id && p.id === editingProduct.id)
    })

    if (isDuplicate) {
      showToast('Товар с таким названием или ID уже существует', 'error')
      return
    }

    try {
      const isNewProduct = !editingProduct.id || editingProduct.id === ''
      const url = isNewProduct 
        ? '/api/products'
        : `/api/products/${editingProduct.id}`
      
      const method = isNewProduct ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct)
      })

      if (response.ok) {
        showToast(isNewProduct ? 'Товар создан' : 'Товар обновлен', 'success')
        setShowEditModal(false)
        setEditingProduct(null)
        loadProducts()
      } else {
        showToast('Ошибка сохранения товара', 'error')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      showToast('Ошибка сохранения товара', 'error')
    }
  }

  const checkProductAvailability = async () => {
    try {
      showToast('Проверка доступности товаров...', 'info')
      const response = await apiFetch('/api/products/check-availability', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        showToast(`Проверено ${data.checked} товаров. Приостановлено: ${data.paused}`, 'success')
        loadProducts()
      } else {
        showToast('Ошибка проверки доступности', 'error')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      showToast('Ошибка проверки доступности', 'error')
    }
  }

  const filteredProducts = products.filter(product => {
    // Проверяем как одиночный sourceId, так и массив sourceIds
    const matchesSource = selectedSource === 'all' || 
      product.sourceId === selectedSource ||
      product.sourceIds?.includes(selectedSource) ||
      product.sources?.includes(selectedSource)
    
    // Улучшенный поиск по всем полям
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = !searchQuery || (
      product.name?.toLowerCase().includes(searchLower) ||
      product.description?.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower) ||
      product.category?.toLowerCase().includes(searchLower) ||
      product.price?.toString().includes(searchLower) ||
      product.route?.toLowerCase().includes(searchLower)
    )
    
    const matchesDays = selectedDays === 'all' || product.days === selectedDays
    
    // Фильтр по статусу
    const matchesStatus = pauseFilter === 'all' || 
      (pauseFilter === 'active' && product.active !== false && !product.hidden) ||
      (pauseFilter === 'paused' && product.active === false) ||
      (pauseFilter === 'hidden' && product.hidden === true)
    
    return matchesSource && matchesSearch && matchesDays && matchesStatus
  })

  // Получаем уникальные значения дней для фильтра
  const uniqueDays = Array.from(new Set(products.map(p => p.days).filter(Boolean))).sort((a, b) => {
    const numA = parseInt(a || '0')
    const numB = parseInt(b || '0')
    return numA - numB
  })

  // Статистика по товарам
  const pausedCount = products.filter(p => p.active === false).length
  const hiddenCount = products.filter(p => p.hidden === true).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-2">
            Товары
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            Управление товарами для добавления в фиды
          </p>
          <p className="text-[var(--foreground)] opacity-60 text-sm mt-1">
            Всего: {products.length} · Показано: {filteredProducts.length}
            {pausedCount > 0 && ` · На паузе: ${pausedCount}`}
            {hiddenCount > 0 && ` · Скрыто: ${hiddenCount}`}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={checkProductAvailability}
            className="px-4 py-2 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--hover)] transition-colors flex items-center gap-2"
            title="Проверить доступность товаров"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Проверить 404
          </button>
          
          <button 
            onClick={() => {
              setEditingProduct({
                id: '',
                name: '',
                price: 0,
                image: '',
                days: '1',
                route: '',
                url: '',
                description: ''
              })
              setShowEditModal(true)
            }}
            className="bg-[var(--button)] text-white px-4 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить товар
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="card mb-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--foreground)] opacity-40" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)] text-[var(--foreground)]"
              />
            </div>
          </div>

          {/* Filters Group */}
          <div className="flex gap-3 items-center flex-wrap">
            <span className="text-sm text-[var(--foreground)] opacity-70 font-medium whitespace-nowrap">Фильтры:</span>
            
            {/* Source Filter */}
            <div className="relative">
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="appearance-none pl-4 pr-10 py-2 bg-[var(--background)] border-2 border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--button)] text-[var(--foreground)] font-medium cursor-pointer hover:border-[var(--button)]/50 transition-colors min-w-[180px]"
              >
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--foreground)] opacity-50 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Days Filter */}
            <div className="relative">
              <select
                value={selectedDays}
                onChange={(e) => setSelectedDays(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="appearance-none pl-4 pr-10 py-2 bg-[var(--background)] border-2 border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--button)] text-[var(--foreground)] font-medium cursor-pointer hover:border-[var(--button)]/50 transition-colors min-w-[140px]"
              >
                <option value="all">Все</option>
                {uniqueDays.map((days) => (
                  <option key={days} value={days}>
                    {days === '1' ? 'Экскурсия' : `${days} ${getDaysWord(parseInt(days || '1'))}`}
                  </option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--foreground)] opacity-50 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Pause Filter */}
            <div className="relative">
              <select
                value={pauseFilter}
                onChange={(e) => setPauseFilter(e.target.value as 'all' | 'active' | 'paused' | 'hidden')}
                style={{ colorScheme: 'dark' }}
                className="appearance-none pl-4 pr-10 py-2 bg-[var(--background)] border-2 border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--button)] text-[var(--foreground)] font-medium cursor-pointer hover:border-[var(--button)]/50 transition-colors min-w-[140px]"
              >
                <option value="all">Все статусы</option>
                <option value="active">Активные</option>
                <option value="paused">На паузе</option>
                <option value="hidden">Скрыто</option>
              </select>
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--foreground)] opacity-50 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-1 bg-[var(--background)] border-2 border-[var(--border)] rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded transition-colors ${viewMode === 'cards' ? 'bg-[var(--button)] text-white' : 'text-[var(--foreground)] opacity-70 hover:opacity-100'}`}
                title="Карточки"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" strokeWidth={2} />
                  <rect x="14" y="3" width="7" height="7" strokeWidth={2} />
                  <rect x="3" y="14" width="7" height="7" strokeWidth={2} />
                  <rect x="14" y="14" width="7" height="7" strokeWidth={2} />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded transition-colors ${viewMode === 'table' ? 'bg-[var(--button)] text-white' : 'text-[var(--foreground)] opacity-70 hover:opacity-100'}`}
                title="Таблица"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                  <line x1="15" y1="3" x2="15" y2="21"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="3" y1="15" x2="21" y2="15"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--button)]"></div>
          <p className="mt-4 text-[var(--foreground)] opacity-70">Загрузка товаров...</p>
        </div>
      )}

      {/* Products Grid or Table */}
      {!loading && viewMode === 'cards' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div 
                key={product.id} 
                className="card hover:border-[var(--button)] transition-all relative"
              >
                {/* Image */}
                <div className="w-full h-40 bg-[var(--background)] rounded-lg mb-4 flex items-center justify-center overflow-hidden relative">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-16 h-16 text-[var(--foreground)] opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  {/* Feed badges and source count */}
                  {(() => {
                    const productFeeds = getProductFeeds(product.id)
                    const sourcesCount = product.sourceIds?.length || 1
                    return (
                      <div className="absolute top-0 left-0 right-0 p-1.5 bg-gradient-to-b from-black/50 to-transparent">
                        <div className="flex justify-between items-start gap-1">
                          <div className="flex-1 min-w-0">
                            {productFeeds.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {productFeeds.slice(0, 3).map(feed => (
                                  <div 
                                    key={feed.id}
                                    className="bg-[var(--button)]/80 text-[var(--background)] text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-md backdrop-blur-sm"
                                    title={`Используется в фиде: ${feed.name}`}
                                  >
                                    {feed.name.length > 10 ? feed.name.substring(0, 10) + '...' : feed.name}
                                  </div>
                                ))}
                                {productFeeds.length > 3 && (
                                  <div className="bg-[var(--button)]/80 text-[var(--background)] text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-md backdrop-blur-sm">
                                    +{productFeeds.length - 3}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-white/50 text-[10px] italic">Не в фидах</div>
                            )}
                          </div>
                          {sourcesCount > 1 && (
                            <div 
                              className="bg-green-500/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md backdrop-blur-sm flex items-center gap-0.5 shrink-0"
                              title={`Товар из ${sourcesCount} источников`}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              {sourcesCount}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* Product Info */}
                <div className="mb-3 min-w-0">
                  <h3 className="font-semibold text-[var(--foreground)] line-clamp-2 min-h-[3rem] mb-2">
                    {product.name}
                  </h3>
                  {product.days && (
                    <p className="text-xs text-[var(--foreground)] opacity-50 mb-1">
                      {formatDaysLabel(parseInt(product.days))} · {
                        product.sourceIds && product.sourceIds.length > 1 
                          ? `${product.sourceIds.length} источника`
                          : sources.find(s => s.id === product.sourceId)?.name || 'Без источника'
                      }
                    </p>
                  )}
                  <div className="h-[2.5rem] mb-1">
                    {product.route && (
                      <p className="text-sm text-[var(--foreground)] opacity-60 line-clamp-2">
                        {product.route}
                      </p>
                    )}
                  </div>
                </div>

                {/* Price & Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[var(--button)]">
                      {typeof product.price === 'string' ? parseInt(product.price).toLocaleString('ru-RU') : product.price.toLocaleString('ru-RU')} ₽
                    </span>
                    {product.oldPrice && Number(product.oldPrice) > Number(product.price) && (
                      <span className="text-sm text-gray-400 line-through">
                        {typeof product.oldPrice === 'string' ? parseInt(product.oldPrice).toLocaleString('ru-RU') : product.oldPrice.toLocaleString('ru-RU')} ₽
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(product)}
                      className="text-sm px-3 py-1 rounded border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
                      title="Редактировать товар"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  <button
                    onClick={() => toggleProductActive(product.id)}
                    className="text-sm px-3 py-1 rounded border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
                    title={product.active === false ? 'Активировать товар' : 'Приостановить товар'}
                  >
                    {product.active === false ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => product.url && window.open(product.url, '_blank')}
                    className="text-sm px-3 py-1 rounded border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
                    title="Посмотреть на сайте"
                    disabled={!product.url}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="card text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-[var(--foreground)] opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                Товары не найдены
              </h3>
              <p className="text-[var(--foreground)] opacity-70">
                {products.length === 0 ? 'Добавьте источник данных и запустите парсинг' : 'Попробуйте изменить параметры поиска'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Table View */}
      {!loading && viewMode === 'table' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-4 text-[var(--foreground)] font-semibold">Изображение</th>
                <th className="text-left p-4 text-[var(--foreground)] font-semibold">Название</th>
                <th className="text-left p-4 text-[var(--foreground)] font-semibold">Цена</th>
                <th className="text-left p-4 text-[var(--foreground)] font-semibold">Дни</th>
                <th className="text-left p-4 text-[var(--foreground)] font-semibold">Источник</th>
                <th className="text-left p-4 text-[var(--foreground)] font-semibold">Фиды</th>
                <th className="text-left p-4 text-[var(--foreground)] font-semibold">Статус</th>
                <th className="text-right p-4 text-[var(--foreground)] font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-[var(--border)] hover:bg-[var(--hover)] transition-colors">
                  <td className="p-4">
                    <div className="w-16 h-16 bg-[var(--background)] rounded overflow-hidden flex items-center justify-center">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-8 h-8 text-[var(--foreground)] opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-[var(--foreground)]">{product.name}</div>
                    {product.route && <div className="text-sm text-[var(--foreground)] opacity-60 mt-1">{product.route}</div>}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--button)]">{product.price} ₽</span>
                      {product.oldPrice && Number(product.oldPrice) > Number(product.price) && (
                        <span className="text-sm text-gray-400 line-through">{product.oldPrice} ₽</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {product.days && (
                      <span className="text-sm bg-[var(--hover)] px-2 py-1 rounded">
                        {product.days} {formatDaysLabel(parseInt(product.days))}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {product.sourceIds && product.sourceIds.length > 1 ? (
                      <div className="flex flex-wrap gap-1">
                        {product.sourceIds.map(srcId => (
                          <span key={srcId} className="text-xs bg-[var(--hover)] px-2 py-1 rounded">
                            {sources.find(s => s.id === srcId)?.name?.substring(0, 10) || srcId.substring(0, 10)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-[var(--foreground)] opacity-70">
                        {sources.find(s => s.id === product.sourceId)?.name || 'Неизвестно'}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {(() => {
                      const productFeeds = getProductFeeds(product.id)
                      return productFeeds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {productFeeds.slice(0, 2).map(feed => (
                            <span key={feed.id} className="text-xs bg-[var(--button)]/20 text-[var(--button)] px-2 py-1 rounded">
                              {feed.name.length > 15 ? feed.name.substring(0, 15) + '...' : feed.name}
                            </span>
                          ))}
                          {productFeeds.length > 2 && (
                            <span className="text-xs bg-[var(--button)]/20 text-[var(--button)] px-2 py-1 rounded">
                              +{productFeeds.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--foreground)] opacity-40 italic">Не в фидах</span>
                      )
                    })()}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleProductActive(product.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        product.active === false
                          ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                    >
                      {product.active === false ? 'На паузе' : 'Активен'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setEditingProduct(product)
                          setShowEditModal(true)
                        }}
                        className="p-2 hover:bg-[var(--hover)] rounded transition-colors"
                        title="Редактировать"
                      >
                        <svg className="w-5 h-5 text-[var(--foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => toggleProductVisibility(product.id)}
                        className="p-2 hover:bg-[var(--hover)] rounded transition-colors"
                        title={product.hidden ? "Показать" : "Скрыть"}
                      >
                        <svg className="w-5 h-5 text-[var(--foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {product.hidden ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          )}
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-[var(--foreground)] opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                Товары не найдены
              </h3>
              <p className="text-[var(--foreground)] opacity-70">
                {products.length === 0 ? 'Добавьте источник данных и запустите парсинг' : 'Попробуйте изменить параметры поиска'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-[var(--border)]">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">
                Редактировать товар
              </h2>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Название
                  </label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Маршрут
                  </label>
                  <input
                    type="text"
                    value={editingProduct.route || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, route: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Цена
                    </label>
                    <input
                      type="number"
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                      className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Старая цена (для скидки)
                    </label>
                    <input
                      type="number"
                      value={editingProduct.oldPrice || ''}
                      onChange={(e) => setEditingProduct({...editingProduct, oldPrice: e.target.value || undefined})}
                      placeholder="Если есть скидка"
                      className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                    />
                  </div>
                </div>

                <div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Дней
                    </label>
                    <input
                      type="text"
                      value={editingProduct.days || ''}
                      onChange={(e) => setEditingProduct({...editingProduct, days: e.target.value})}
                      className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    URL изображения
                  </label>
                  <input
                    type="text"
                    value={editingProduct.image}
                    onChange={(e) => setEditingProduct({...editingProduct, image: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    URL товара
                  </label>
                  <input
                    type="text"
                    value={editingProduct.url || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, url: e.target.value})}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2 flex items-center justify-between">
                    <span>Описание</span>
                    <button
                      onClick={() => showToast('В разработке', 'info')}
                      className="text-xs px-2 py-1 bg-[var(--button)] text-white rounded hover:bg-[var(--button)]/90 transition-colors"
                    >
                      Генерировать с AI
                    </button>
                  </label>
                  <textarea
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)] resize-none"
                    placeholder="Введите описание товара..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveProductChanges}
                    className="flex-1 bg-[var(--button)] text-white px-6 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingProduct(null)
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
                setEditingProduct(null)
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
    </div>
  )
}
