'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { showToast } from '@/components/Toast'
import { formatDaysLabel } from '@/utils/formatDays'
import { apiFetch } from '@/lib/api'

interface Product {
  id: string
  name: string
  price: string | number
  image: string
  days?: string
  route?: string
  url?: string
  description?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
}

interface Feed {
  id: string
  name: string
  format: string
  sourceId?: string
  isProduction?: boolean
  settings?: {
    productIds?: string[]
    feedTemplateId?: string
  }
}

interface Collection {
  id: string
  name: string
  description?: string
  pictures?: string[]
  createdAt?: string
  updatedAt?: string
}

export default function FeedPreviewPage() {
  const params = useParams()
  const feedIdOrSlug = params.id as string
  
  const [feedId, setFeedId] = useState<string>('')
  const [feed, setFeed] = useState<Feed | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<string>('all')
  const [catalogs, setCatalogs] = useState<Collection[]>([])
  const [sourceCategories, setSourceCategories] = useState<{id: string, name: string, count: number}[]>([])
  const [isCreatingCatalog, setIsCreatingCatalog] = useState(false)
  const [newCatalog, setNewCatalog] = useState({ name: '', description: '' })
  const [showUtmSelector, setShowUtmSelector] = useState(false)
  const [showXmlSelector, setShowXmlSelector] = useState(false)
  const [showXmlEditor, setShowXmlEditor] = useState(false)
  const [xmlTemplate, setXmlTemplate] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false)
  const [xmlTemplates, setXmlTemplates] = useState<any[]>([])
  const [utmTemplates, setUtmTemplates] = useState<any[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [selectedUtmTemplateId, setSelectedUtmTemplateId] = useState<string>('')

  // Конвертируем slug в ID если нужно
  useEffect(() => {
    const resolveFeedId = async () => {
      try {
        // Сначала пробуем загрузить по ID/slug напрямую
        const response = await apiFetch(`/api/feeds/${feedIdOrSlug}`)
        if (response.ok) {
          const data = await response.json()
          setFeedId(data.id) // Используем ID из ответа
          setFeed(data)
          await loadProductsForFeed(data)
        } else {
          // Если не найдено, загружаем все feeds и ищем по slug
          const allFeedsResponse = await apiFetch('/api/feeds')
          if (allFeedsResponse.ok) {
            const allFeeds = await allFeedsResponse.json()
            const foundFeed = allFeeds.find((f: any) => f.slug === feedIdOrSlug || f.id === feedIdOrSlug)
            if (foundFeed) {
              setFeedId(foundFeed.id)
              setFeed(foundFeed)
              await loadProductsForFeed(foundFeed)
            }
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки фида:', error)
        showToast('Ошибка загрузки фида', 'error')
      }
    }
    
    resolveFeedId()
  }, [feedIdOrSlug])

  // Загружаем каталоги и создаем категории источников после загрузки товаров
  useEffect(() => {
    if (products.length > 0 && feed) {
      loadCatalogs()
      loadSourceCategories()
    }
  }, [products, feed])

  // Загружаем UTM и XML шаблоны
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const [utmResponse, xmlResponse] = await Promise.all([
          apiFetch('/api/templates?type=utm'),
          apiFetch('/api/templates?type=feed')
        ])
        
        if (utmResponse.ok) {
          const utmData = await utmResponse.json()
          setUtmTemplates(utmData)
        }
        
        if (xmlResponse.ok) {
          const xmlData = await xmlResponse.json()
          setXmlTemplates(xmlData)
        }
      } catch (error) {
        console.error('Ошибка загрузки шаблонов:', error)
      }
    }
    
    loadTemplates()
  }, [])

  const loadSourceCategories = async () => {
    try {
      // Получаем sourceIds из фида
      const sourceIds = (feed as any)?.sourceIds || []
      if (sourceIds.length === 0) return

      // Загружаем все источники данных
      const response = await apiFetch('/api/data-sources')
      if (response.ok) {
        const allSources = await response.json()
        
        // Создаем категории для каждого источника в фиде
        const categories = sourceIds.map((sourceId: string) => {
          const source = allSources.find((s: any) => s.id === sourceId)
          const productCount = products.filter(p => (p as any).sourceId === sourceId).length
          
          return {
            id: sourceId,
            name: source?.name || 'Неизвестный источник',
            count: productCount
          }
        }).filter((cat: any) => cat.count > 0) // Показываем только источники с товарами
        
        setSourceCategories(categories)
      }
    } catch (error) {
      console.error('Error loading source categories:', error)
    }
  }

  const loadCatalogs = async () => {
    try {
      const response = await apiFetch('/api/collections')
      if (response.ok) {
        const allCollections = await response.json()
        
        // Фильтруем каталоги - показываем только те, в которых есть товары из текущего фида
        const feedProductIds = new Set(products.map(p => p.id))
        const relevantCatalogs = allCollections.filter((collection: Collection) => {
          // Проверяем, есть ли хотя бы один товар из фида в этом каталоге
          const hasProductsFromFeed = products.some(p => {
            const productCollections = (p as any).collectionIds || []
            return productCollections.includes(collection.id)
          })
          return hasProductsFromFeed
        })
        
        setCatalogs(relevantCatalogs)
      }
    } catch (error) {
      console.error('Error loading catalogs:', error)
      setCatalogs([])
    }
  }

  const loadFeed = async () => {
    try {
      const response = await apiFetch(`/api/feeds/${feedId}`)
      if (response.ok) {
        const data = await response.json()
        setFeed(data)
        // Перезагружаем товары после получения данных фида
        await loadProductsForFeed(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки фида:', error)
      showToast('Ошибка загрузки фида', 'error')
    }
  }

  const loadProductsForFeed = async (feedData: Feed) => {
    try {
      setLoading(true)
      const response = await apiFetch(`/api/products?merged=false`)
      if (response.ok) {
        const allProducts = await response.json()
        
        // Для ручных фидов показываем только привязанные товары
        if (feedData.sourceId === 'manual') {
          const productIds = feedData.settings?.productIds || []
          const filteredProducts = allProducts.filter((p: Product) => productIds.includes(p.id))
          setProducts(filteredProducts)
        } else {
          // Проверяем наличие массива sourceIds (мультиисточник)
          const sourceIds = (feedData as any).sourceIds
          if (sourceIds && Array.isArray(sourceIds) && sourceIds.length > 0) {
            // Для фидов с несколькими источниками показываем товары всех источников
            const sourceProducts = allProducts.filter((p: any) => sourceIds.includes(p.sourceId) && !p.hidden)
            setProducts(sourceProducts)
          } else if (feedData.sourceId) {
            // Для фидов с одним источником показываем товары этого источника
            const sourceProducts = allProducts.filter((p: any) => p.sourceId === feedData.sourceId && !p.hidden)
            setProducts(sourceProducts)
          } else {
            setProducts([])
          }
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyFeedUrl = () => {
    const url = `${window.location.origin}/api/feeds/${feedId}/xml`
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('Ссылка скопирована', 'success')
      }).catch(() => {
        fallbackCopyToClipboard(url)
      })
    } else {
      fallbackCopyToClipboard(url)
    }
  }

  const copyPreviewUrl = () => {
    const url = `${window.location.origin}/feed-editor/preview/${feedId}`
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('Ссылка на предпросмотр скопирована', 'success')
      }).catch(() => {
        fallbackCopyToClipboard(url)
      })
    } else {
      fallbackCopyToClipboard(url)
    }
  }

  const fallbackCopyToClipboard = (text: string) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      showToast('Ссылка скопирована', 'success')
    } catch (err) {
      showToast('Ошибка копирования', 'error')
    }
    document.body.removeChild(textarea)
  }

  const addToCatalog = async (catalogId: string) => {
    try {
      const response = await apiFetch('/api/products/bulk-add-to-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: Array.from(selectedProducts),
          collection_id: catalogId
        })
      })

      if (response.ok) {
        const data = await response.json()
        showToast(`Добавлено ${data.added} товаров в каталог`, 'success')
        setSelectedProducts(new Set())
        setShowCatalogDropdown(false)
        loadFeed()
      } else {
        showToast('Ошибка добавления в каталог', 'error')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      showToast('Ошибка добавления в каталог', 'error')
    }
  }

  const exportFeed = async (format: 'xml' | 'json' | 'csv') => {
    try {
      const response = await apiFetch(`/api/feeds/${feedId}/export?format=${format}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `feed_${feedId}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        showToast(`Фид экспортирован в ${format.toUpperCase()}`, 'success')
      }
    } catch (error) {
      console.error('Ошибка экспорта:', error)
      showToast('Ошибка экспорта', 'error')
    }
  }

  const handleCreateCatalog = async () => {
    if (!newCatalog.name.trim()) {
      alert('Введите название каталога')
      return
    }

    try {
      const response = await apiFetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatalog.name,
          description: newCatalog.description,
          productIds: [] // Создаём пустой каталог
        })
      })

      if (response.ok) {
        const newCatalogData = await response.json()
        setCatalogs([...catalogs, newCatalogData])
        setNewCatalog({ name: '', description: '' })
        setIsCreatingCatalog(false)
        setActiveTab(newCatalogData.id)
        showToast('Пустой каталог успешно создан!', 'success')
      } else {
        showToast('Ошибка при создании каталога', 'error')
      }
    } catch (error) {
      console.error('Error creating catalog:', error)
      showToast('Ошибка при создании каталога', 'error')
    }
  }

  const handleDeleteCatalog = async (catalogId: string) => {
    if (!confirm('Удалить этот каталог? Товары не будут удалены.')) return

    try {
      const response = await apiFetch(`/api/collections/${catalogId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCatalogs(catalogs.filter(c => c.id !== catalogId))
        if (activeTab === catalogId) {
          setActiveTab('all')
        }
        showToast('Каталог успешно удалён!', 'success')
      } else {
        showToast('Ошибка при удалении каталога', 'error')
      }
    } catch (error) {
      console.error('Error deleting catalog:', error)
      showToast('Ошибка при удалении каталога', 'error')
    }
  }

  const handleAIGeneration = () => {
    showToast('AI генерация шаблона - функция в разработке', 'info')
  }

  const handleSelectUtmTemplate = () => {
    setShowUtmSelector(true)
  }

  const handleSelectXmlTemplate = async () => {
    try {
      const response = await apiFetch('/api/templates?type=feed')
      if (response.ok) {
        const templates = await response.json()
        setXmlTemplates(templates)
        setSelectedTemplateId(feed?.settings?.feedTemplateId || '')
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
    setShowXmlSelector(true)
  }

  const handleEditXml = async () => {
    try {
      // Загружаем готовый XML документ фида
      const response = await apiFetch(`/api/feeds/${feedId}/xml`)
      if (response.ok) {
        const xmlContent = await response.text()
        setXmlTemplate(xmlContent)
        setShowXmlEditor(true)
      } else {
        showToast('Ошибка загрузки XML фида', 'error')
      }
    } catch (error) {
      console.error('Error loading XML:', error)
      showToast('Ошибка загрузки XML фида', 'error')
    }
  }

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) {
      showToast('Выберите шаблон', 'warning')
      return
    }

    try {
      const response = await apiFetch(`/api/feeds/${feedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...feed?.settings,
            feedTemplateId: selectedTemplateId
          }
        })
      })

      if (response.ok) {
        await loadFeed()
        setShowXmlSelector(false)
        showToast('Шаблон успешно применен', 'success')
      } else {
        showToast('Ошибка применения шаблона', 'error')
      }
    } catch (error) {
      console.error('Error applying template:', error)
      showToast('Ошибка применения шаблона', 'error')
    }
  }

  const toggleProductSelection = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)))
    }
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.route?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase())
    
    // If activeTab is 'all', show all products from the feed
    if (activeTab === 'all') {
      return matchesSearch
    }
    
    // Check if activeTab is a source category (sourceId)
    const isSourceCategory = sourceCategories.some(cat => cat.id === activeTab)
    if (isSourceCategory) {
      const productSourceId = (p as any).sourceId
      return matchesSearch && productSourceId === activeTab
    }
    
    // Filter by catalog - check if product has this collectionId
    const productCollections = (p as any).collectionIds || []
    const matchesCatalog = productCollections.includes(activeTab)
    
    return matchesSearch && matchesCatalog
  })

  if (loading || !feed) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--button)]"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/feed-editor" className="text-[var(--button)] hover:underline flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад
          </Link>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            {feed.isProduction && (
              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" title="В продвижении"></div>
            )}
            <h1 className="font-bold text-[var(--foreground)]">{feed.name}</h1>
            <span className="text-[var(--foreground)] opacity-50">·</span>
            <span className="text-[var(--foreground)] opacity-70">Формат: {feed.format.toUpperCase()}</span>
            <span className="text-[var(--foreground)] opacity-50">·</span>
            <span className="text-[var(--foreground)] opacity-70">Товаров: {products.length}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={copyFeedUrl}
              className="px-4 py-2 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--hover)] transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Ссылка на фид
            </button>

            <button
              onClick={copyPreviewUrl}
              className="px-4 py-2 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--hover)] transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Предпросмотр
            </button>

            <div className="flex gap-1 bg-[var(--background)] border border-[var(--border)] rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded transition-colors ${viewMode === 'cards' ? 'bg-[var(--button)] text-white' : 'text-[var(--foreground)] hover:bg-[var(--hover)]'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded transition-colors ${viewMode === 'table' ? 'bg-[var(--button)] text-white' : 'text-[var(--foreground)] hover:bg-[var(--hover)]'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 12h18M3 20h18" />
                </svg>
              </button>
            </div>

            <div className="relative group">
              <button className="px-4 py-2 bg-[var(--button)] text-white rounded-lg hover:bg-[var(--button)]/90 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Экспорт
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => exportFeed('xml')}
                  className="w-full px-4 py-2 text-left text-[var(--foreground)] hover:bg-[var(--background)] transition-colors rounded-t-lg"
                >
                  Экспорт в XML
                </button>
                <button
                  onClick={() => exportFeed('json')}
                  className="w-full px-4 py-2 text-left text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
                >
                  Экспорт в JSON
                </button>
                <button
                  onClick={() => exportFeed('csv')}
                  className="w-full px-4 py-2 text-left text-[var(--foreground)] hover:bg-[var(--background)] transition-colors rounded-b-lg"
                >
                  Экспорт в CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={handleAIGeneration}
          className="bg-[var(--card)] border-2 border-[#60a5fa]/50 text-[var(--foreground)] px-4 py-2 rounded-lg hover:border-[#60a5fa] hover:bg-[#60a5fa]/10 transition-colors flex items-center gap-2"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          ИИ генерация
        </button>
        <button
          onClick={handleSelectUtmTemplate}
          className="bg-[var(--card)] border-2 border-[#60a5fa]/50 text-[var(--foreground)] px-4 py-2 rounded-lg hover:border-[#60a5fa] hover:bg-[#60a5fa]/10 transition-colors flex items-center gap-2"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          UTM шаблон
        </button>
        <button
          onClick={handleSelectXmlTemplate}
          className="bg-[var(--card)] border-2 border-[#60a5fa]/50 text-[var(--foreground)] px-4 py-2 rounded-lg hover:border-[#60a5fa] hover:bg-[#60a5fa]/10 transition-colors flex items-center gap-2"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          XML шаблон
        </button>
        <Link
          href="#"
          onClick={(e) => {
            e.preventDefault()
            handleEditXml()
          }}
          className="bg-[var(--card)] border-2 border-green-500/50 text-[var(--foreground)] px-4 py-2 rounded-lg hover:border-green-500 hover:bg-green-500/10 transition-colors flex items-center gap-2"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Редактировать XML
        </Link>
      </div>

      {/* Catalog Tabs */}
      <div className="mb-6 flex items-center gap-4 overflow-x-auto pb-2 cursor-grab active:cursor-grabbing scroll-smooth" 
        onMouseDown={(e) => {
          const slider = e.currentTarget
          const startX = e.pageX - slider.offsetLeft
          const scrollLeft = slider.scrollLeft
          
          const handleMouseMove = (e: MouseEvent) => {
            const x = e.pageX - slider.offsetLeft
            const walk = (x - startX) * 2
            slider.scrollLeft = scrollLeft - walk
          }
          
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
          }
          
          document.addEventListener('mousemove', handleMouseMove)
          document.addEventListener('mouseup', handleMouseUp)
        }}
      >
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'all'
              ? 'bg-[var(--button)] text-white'
              : 'bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--button)]'
          }`}
        >
          Все ({products.length})
        </button>
        
        {/* Source Categories (автоматические вкладки по источникам) */}
        {sourceCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveTab(category.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === category.id
                ? 'bg-[var(--button)] text-white'
                : 'bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--button)]'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.7">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            {category.name} ({category.count})
          </button>
        ))}
        
        {/* User Catalogs (ручные каталоги пользователя) */}
        {catalogs.filter(c => c.id !== 'all-products').map((catalog) => {
          const catalogProductCount = products.filter(p => {
            const productCollections = (p as any).collectionIds || []
            return productCollections.includes(catalog.id)
          }).length
          
          return (
            <div key={catalog.id} className="relative group pr-3">
              <button
                onClick={() => setActiveTab(catalog.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === catalog.id
                    ? 'bg-[var(--button)] text-white'
                    : 'bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--button)]'
                }`}
              >
                {catalog.name} ({catalogProductCount})
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteCatalog(catalog.id)
                }}
                className="absolute top-0 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
                title="Удалить каталог"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )
        })}
        <button
          onClick={() => setIsCreatingCatalog(true)}
          className="px-4 py-2 rounded-lg border-2 border-dashed border-[var(--border)] text-[var(--foreground)] hover:border-[var(--button)] hover:text-[var(--button)] transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Создать каталог
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="text-sm text-[var(--foreground)] opacity-70 mb-1">Всего товаров</div>
          <div className="text-2xl font-bold text-[var(--foreground)]">{products.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-[var(--foreground)] opacity-70 mb-1">Последнее обновление</div>
          <div className="text-2xl font-bold text-[var(--foreground)]">
            {new Date().toLocaleDateString('ru-RU')}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--foreground)] opacity-40" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Поиск товаров..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
            />
          </div>
          {activeTab === 'all' && selectedProducts.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--foreground)] opacity-70">
                Выбрано: {selectedProducts.size}
              </span>
              <button
                onClick={() => setSelectedProducts(new Set())}
                className="text-sm text-[var(--button)] hover:underline"
              >
                Снять выделение
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowCatalogDropdown(!showCatalogDropdown)}
                  className="bg-[var(--button)] text-white px-4 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Добавить в каталог
                </button>
                {showCatalogDropdown && (
                  <div className="absolute top-full mt-2 right-0 bg-[var(--background)] border-2 border-[var(--border)] rounded-lg shadow-2xl z-50 min-w-[250px] backdrop-blur-sm">
                    <div className="p-2">
                      {catalogs.filter(c => c.id !== 'all-products').length === 0 ? (
                        <div className="text-center py-4 px-3 text-sm text-[var(--foreground)] opacity-60">
                          Нет доступных каталогов
                        </div>
                      ) : (
                        catalogs.filter(c => c.id !== 'all-products').map((catalog) => (
                          <button
                            key={catalog.id}
                            onClick={() => addToCatalog(catalog.id)}
                            className="w-full text-left px-3 py-2 rounded hover:bg-[var(--hover)] transition-colors text-[var(--foreground)]"
                          >
                            <div className="font-medium">{catalog.name}</div>
                            {catalog.description && (
                              <div className="text-xs opacity-60 mt-0.5">{catalog.description}</div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'cards' ? (
        <>
          {activeTab === 'all' && filteredProducts.length > 0 && (
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-[var(--button)] border-[var(--border)] rounded focus:ring-[var(--button)]"
                />
                <span className="text-sm text-[var(--foreground)]">Выбрать все ({filteredProducts.length})</span>
              </label>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
            <div key={product.id} className={`card hover:border-[var(--button)] transition-all relative ${selectedProducts.has(product.id) ? 'ring-2 ring-[var(--button)]' : ''}`}>
              {activeTab === 'all' && (
                <div className="absolute top-3 right-3 z-10">
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product.id)}
                    onChange={() => toggleProductSelection(product.id)}
                    className="w-5 h-5 text-[var(--button)] border-[var(--border)] rounded focus:ring-[var(--button)] cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
              <div className="w-full h-40 bg-[var(--background)] rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-16 h-16 text-[var(--foreground)] opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>

              <div className="mb-3 min-w-0">
                <div className="text-xs text-[var(--foreground)] opacity-50 mb-1">
                  ID: {product.id}
                </div>
                <h3 className="font-semibold text-[var(--foreground)] line-clamp-2 min-h-[2.5rem] mb-2">
                  {product.name}
                </h3>
                {product.route && (
                  <p className="text-sm text-[var(--foreground)] opacity-60 mb-1 line-clamp-2 min-h-[2rem]">
                    {product.route}
                  </p>
                )}
                {product.days && (
                  <p className="text-xs text-[var(--foreground)] opacity-50">
                    {formatDaysLabel(parseInt(product.days))}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-[var(--border)]">
                <span className="text-lg font-bold text-[var(--button)]">
                  {typeof product.price === 'string' ? parseInt(product.price).toLocaleString('ru-RU') : product.price.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>
          ))}
        </div>
        </>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Фото</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Название</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Маршрут</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Дней</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Цена</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Описание</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">UTM Source</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">UTM Medium</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">UTM Campaign</th>
              </tr>
            </thead>
            <tbody>
              {products.filter(p => 
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.route?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.id.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((product) => (
                <tr key={product.id} className="border-b border-[var(--border)] hover:bg-[var(--background)]">
                  <td className="px-4 py-3 text-sm text-[var(--foreground)] opacity-70">
                    {product.id}
                  </td>
                  <td className="px-4 py-3">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-12 bg-[var(--background)] rounded flex items-center justify-center">
                        <svg className="w-6 h-6 text-[var(--foreground)] opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                    {product.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--foreground)] opacity-70">
                    {product.route || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                    {product.days ? formatDaysLabel(parseInt(product.days)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--button)]">
                    {typeof product.price === 'string' ? parseInt(product.price).toLocaleString('ru-RU') : product.price.toLocaleString('ru-RU')} ₽
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--foreground)] opacity-70 max-w-xs">
                    <div className="line-clamp-2">{product.description || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--foreground)] opacity-70">
                    {product.utmSource || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--foreground)] opacity-70">
                    {product.utmMedium || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--foreground)] opacity-70">
                    {product.utmCampaign || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Catalog Creation Modal */}
      {isCreatingCatalog && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setIsCreatingCatalog(false)}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">
              Создание каталога
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Название каталога *
                </label>
                <input
                  type="text"
                  value={newCatalog.name}
                  onChange={(e) => setNewCatalog({ ...newCatalog, name: e.target.value })}
                  placeholder="Например: Пляжный отдых"
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Описание
                </label>
                <textarea
                  value={newCatalog.description}
                  onChange={(e) => setNewCatalog({ ...newCatalog, description: e.target.value })}
                  placeholder="Краткое описание каталога"
                  rows={3}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                />
              </div>

              <div className="bg-[var(--background)] p-3 rounded-lg border border-[var(--border)]">
                <p className="text-xs text-[var(--foreground)] opacity-70">
                  Каталоги используются для группировки товаров в YML-фидах Яндекса. 
                  После создания вы сможете назначать товары в этот каталог.
                </p>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleCreateCatalog}
                className="flex-1 bg-[var(--button)] text-white py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors"
              >
                Создать
              </button>
              <button
                onClick={() => {
                  setIsCreatingCatalog(false)
                  setNewCatalog({ name: '', description: '' })
                }}
                className="flex-1 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] py-2 rounded-lg hover:bg-[var(--hover)] transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UTM Template Selector Modal */}
      {showUtmSelector && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowUtmSelector(false)}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">
              Выбор UTM шаблона
            </h2>
            
            <div className="space-y-3 mb-6">
              {utmTemplates.length > 0 ? (
                utmTemplates.map((template) => (
                  <div 
                    key={template.id}
                    onClick={() => {
                      setSelectedUtmTemplateId(template.id)
                      showToast(`Выбран шаблон: ${template.name}`, 'success')
                      setShowUtmSelector(false)
                    }}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedUtmTemplateId === template.id
                        ? 'border-[var(--button)] bg-[var(--button)]/10'
                        : 'border-[var(--border)] hover:border-[var(--button)]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-[var(--foreground)]">{template.name}</h3>
                      {selectedUtmTemplateId === template.id && (
                        <span className="px-2 py-1 text-xs bg-green-500 text-white rounded">Выбран</span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--foreground)] opacity-70">{template.description || template.content}</p>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-[var(--foreground)] opacity-50">
                  Шаблоны UTM меток не найдены
                </div>
              )}
            </div>

            <button
              onClick={() => setShowUtmSelector(false)}
              className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] py-2 rounded-lg hover:bg-[var(--hover)] transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* XML Template Selector Modal */}
      {showXmlSelector && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowXmlSelector(false)}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">
              Выбор XML шаблона
            </h2>
            
            <div className="space-y-3 mb-6">
              {/* Стандартный YML шаблон */}
              <div 
                onClick={() => setSelectedTemplateId('')}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedTemplateId === '' 
                    ? 'border-[var(--button)] bg-[var(--button)]/10' 
                    : 'border-[var(--border)] hover:border-[var(--button)]'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-[var(--foreground)]">Яндекс.Маркет (стандартный YML)</h3>
                  <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded">По умолчанию</span>
                </div>
                <p className="text-sm text-[var(--foreground)] opacity-70 mb-2">
                  Стандартный формат YML для Яндекс.Маркет и Яндекс.Директ
                </p>
                <div className="bg-[var(--background)] p-2 rounded text-xs font-mono text-[var(--foreground)] opacity-70">
                  &lt;yml_catalog&gt;&lt;shop&gt;...&lt;/shop&gt;&lt;/yml_catalog&gt;
                </div>
              </div>

              {/* Пользовательские шаблоны */}
              {xmlTemplates.map((template) => (
                <div 
                  key={template.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedTemplateId === template.id 
                      ? 'border-[var(--button)] bg-[var(--button)]/10' 
                      : 'border-[var(--border)] hover:border-[var(--button)]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-[var(--foreground)]">{template.name}</h3>
                    {feed?.settings?.feedTemplateId === template.id && (
                      <span className="px-2 py-1 text-xs bg-green-500 text-white rounded">Текущий</span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-[var(--foreground)] opacity-70 mb-2">
                      {template.description}
                    </p>
                  )}
                  <div className="bg-[var(--background)] p-2 rounded text-xs font-mono text-[var(--foreground)] opacity-70">
                    {template.content?.format || 'Пользовательский шаблон'}
                  </div>
                </div>
              ))}

              {xmlTemplates.length === 0 && (
                <div className="text-center py-8 text-[var(--foreground)] opacity-50">
                  <p>Нет дополнительных шаблонов</p>
                  <p className="text-sm mt-2">Создайте шаблоны в разделе "Шаблоны"</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleApplyTemplate}
                className="flex-1 bg-[var(--button)] text-white py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors"
              >
                Применить шаблон
              </button>
              <button
                onClick={() => setShowXmlSelector(false)}
                className="flex-1 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] py-2 rounded-lg hover:bg-[var(--hover)] transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* XML Viewer Modal */}
      {showXmlEditor && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">
                Просмотр XML фида
              </h2>
              <button
                onClick={() => setShowXmlEditor(false)}
                className="p-2 hover:bg-[var(--hover)] rounded-lg transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Сгенерированный XML документ
              </label>
              <textarea
                value={xmlTemplate}
                readOnly
                className="w-full h-96 p-4 bg-[var(--background)] border border-[var(--border)] rounded-lg font-mono text-sm text-[var(--foreground)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                placeholder="Загрузка XML..."
              />
              <p className="text-xs text-[var(--foreground)] opacity-60 mt-2">
                📄 Это готовый XML документ вашего фида. Для просмотра в браузере используйте ссылку на фид.
              </p>
            </div>

            <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Доступные переменные:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-[var(--foreground)] opacity-70">
                <code>&#123;&#123;id&#125;&#125;</code>
                <code>&#123;&#123;name&#125;&#125;</code>
                <code>&#123;&#123;price&#125;&#125;</code>
                <code>&#123;&#123;oldPrice&#125;&#125;</code>
                <code>&#123;&#123;url&#125;&#125;</code>
                <code>&#123;&#123;picture&#125;&#125;</code>
                <code>&#123;&#123;route&#125;&#125;</code>
                <code>&#123;&#123;days&#125;&#125;</code>
                <code>&#123;&#123;description&#125;&#125;</code>
                <code>&#123;&#123;categoryId&#125;&#125;</code>
                <code>&#123;&#123;utmSource&#125;&#125;</code>
                <code>&#123;&#123;utmMedium&#125;&#125;</code>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(xmlTemplate)
                  showToast('XML скопирован в буфер обмена', 'success')
                }}
                className="bg-[var(--button)] text-white px-6 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Копировать
              </button>
              <button
                onClick={() => setShowXmlEditor(false)}
                className="bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] px-6 py-2 rounded-lg hover:bg-[var(--hover)] transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
