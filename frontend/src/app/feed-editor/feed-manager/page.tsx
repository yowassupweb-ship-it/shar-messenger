'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

interface Tour {
  id: string
  name: string
  route: string
  price: number
  oldPrice?: number
  duration: number
  imageUrl: string
  description: string
  category: string
}

interface Folder {
  id: string
  name: string
  tours: Tour[]
}

interface Collection {
  id: string
  name: string
  description?: string
  pictures?: string[]
  createdAt?: string
  updatedAt?: string
}

export default function FeedManagerPage() {
  const [folders, setFolders] = useState<Folder[]>([
    {
      id: '1',
      name: 'Турция',
      tours: [
        {
          id: '1',
          name: 'Тур в Стамбул',
          route: 'Стамбул - Каппадокия',
          price: 50000,
          oldPrice: 60000,
          duration: 7,
          imageUrl: 'https://example.com/istanbul.jpg',
          description: 'Незабываемое путешествие по Турции',
          category: 'Пляжный отдых'
        }
      ]
    },
    {
      id: '2',
      name: 'Европа',
      tours: []
    }
  ])

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [editingTour, setEditingTour] = useState<Tour | null>(null)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreatingCatalog, setIsCreatingCatalog] = useState(false)
  const [newCatalog, setNewCatalog] = useState({ name: '', description: '' })
  const [activeTab, setActiveTab] = useState<string>('all')
  const [catalogs, setCatalogs] = useState<Collection[]>([])
  const [showUtmSelector, setShowUtmSelector] = useState(false)
  const [showXmlSelector, setShowXmlSelector] = useState(false)

  const categories = [
    'Пляжный отдых',
    'Экскурсионный тур',
    'Горнолыжный тур',
    'Круиз',
    'Автобусный тур',
    'Комбинированный тур'
  ]

  useEffect(() => {
    loadCatalogs()
  }, [])

  const loadCatalogs = async () => {
    try {
      const response = await apiFetch('/api/collections')
      if (response.ok) {
        const data = await response.json()
        setCatalogs(data)
      }
    } catch (error) {
      console.error('Error loading catalogs:', error)
    }
  }

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      const newFolder: Folder = {
        id: Date.now().toString(),
        name: newFolderName,
        tours: []
      }
      setFolders([...folders, newFolder])
      setNewFolderName('')
      setIsCreatingFolder(false)
    }
  }

  const handleDeleteFolder = (folderId: string) => {
    if (confirm('Удалить папку и все туры в ней?')) {
      setFolders(folders.filter(f => f.id !== folderId))
      if (selectedFolder === folderId) {
        setSelectedFolder(null)
      }
    }
  }

  const handleEditTour = (tour: Tour) => {
    setEditingTour({ ...tour })
  }

  const handleSaveTour = () => {
    if (!editingTour || !selectedFolder) return

    setFolders(folders.map(folder => {
      if (folder.id === selectedFolder) {
        const existingIndex = folder.tours.findIndex(t => t.id === editingTour.id)
        if (existingIndex >= 0) {
          // Update existing tour
          const updatedTours = [...folder.tours]
          updatedTours[existingIndex] = editingTour
          return { ...folder, tours: updatedTours }
        } else {
          // Add new tour
          return { ...folder, tours: [...folder.tours, editingTour] }
        }
      }
      return folder
    }))
    setEditingTour(null)
  }

  const handleDeleteTour = (tourId: string) => {
    if (!selectedFolder) return
    if (confirm('Удалить тур?')) {
      setFolders(folders.map(folder => {
        if (folder.id === selectedFolder) {
          return { ...folder, tours: folder.tours.filter(t => t.id !== tourId) }
        }
        return folder
      }))
    }
  }

  const handleAddNewTour = () => {
    const newTour: Tour = {
      id: Date.now().toString(),
      name: '',
      route: '',
      price: 0,
      duration: 1,
      imageUrl: '',
      description: '',
      category: categories[0]
    }
    setEditingTour(newTour)
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
          description: newCatalog.description
        })
      })

      if (response.ok) {
        const newCatalogData = await response.json()
        setCatalogs([...catalogs, newCatalogData])
        setNewCatalog({ name: '', description: '' })
        setIsCreatingCatalog(false)
        alert('Каталог успешно создан!')
        // Переключаемся на новый каталог
        setActiveTab(newCatalogData.id)
      } else {
        alert('Ошибка при создании каталога')
      }
    } catch (error) {
      console.error('Error creating catalog:', error)
      alert('Ошибка при создании каталога')
    }
  }

  const handleAIGeneration = () => {
    alert('AI генерация шаблона - функция в разработке')
  }

  const handleSelectUtmTemplate = () => {
    setShowUtmSelector(true)
  }

  const handleSelectXmlTemplate = () => {
    setShowXmlSelector(true)
  }

  const currentFolder = folders.find(f => f.id === selectedFolder)

  // Enhanced search across all tour fields
  const filteredTours = currentFolder?.tours.filter(tour => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      tour.name?.toLowerCase().includes(searchLower) ||
      tour.route?.toLowerCase().includes(searchLower) ||
      tour.description?.toLowerCase().includes(searchLower) ||
      tour.category?.toLowerCase().includes(searchLower) ||
      tour.price?.toString().includes(searchLower) ||
      tour.oldPrice?.toString().includes(searchLower) ||
      tour.duration?.toString().includes(searchLower)
    )
  }) || []

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link href="/" className="text-[var(--button)] hover:underline">
          Все инструменты
        </Link>
        <span className="text-[var(--foreground)] opacity-50">/</span>
        <Link href="/feed-editor" className="text-[var(--button)] hover:underline">
          Редактор фидов
        </Link>
        <span className="text-[var(--foreground)] opacity-50">/</span>
        <span className="text-[var(--foreground)]">Управление фидами</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-2">
            Управление фидами
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            Работа с категориями, папками и редактирование позиций
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3">
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
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Folders Sidebar */}
        <div className="col-span-3">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--foreground)]">Папки</h3>
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="text-[var(--button)] hover:text-[var(--button)]/80"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>

            {isCreatingFolder && (
              <div className="mb-4 p-3 bg-[var(--background)] rounded-lg">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Название папки"
                  className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded mb-2 text-[var(--foreground)]"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateFolder}
                    className="flex-1 bg-[var(--button)] text-white px-3 py-1 rounded text-sm"
                  >
                    Создать
                  </button>
                  <button
                    onClick={() => { setIsCreatingFolder(false); setNewFolderName('') }}
                    className="flex-1 bg-gray-500 text-white px-3 py-1 rounded text-sm"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {folders.map(folder => (
                <div
                  key={folder.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedFolder === folder.id
                      ? 'bg-[var(--button)] text-white'
                      : 'bg-[var(--background)] hover:bg-[var(--background)]/80'
                  }`}
                  onClick={() => setSelectedFolder(folder.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                      </svg>
                      <span className="font-medium">{folder.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs opacity-70">({folder.tours.length})</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteFolder(folder.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-500"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-span-9">
          {!selectedFolder ? (
            <div className="card text-center py-12">
              <svg className="mx-auto mb-4 opacity-50" width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <p className="text-[var(--foreground)] opacity-70">
                Выберите папку для просмотра туров
              </p>
            </div>
          ) : (
            <>
              {/* Catalog Tabs */}
              <div className="mb-6 flex items-center gap-4 overflow-x-auto pb-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === 'all'
                      ? 'bg-[var(--button)] text-white'
                      : 'bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--button)]'
                  }`}
                >
                  Все
                </button>
                {catalogs.map((catalog) => (
                  <button
                    key={catalog.id}
                    onClick={() => setActiveTab(catalog.id)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      activeTab === catalog.id
                        ? 'bg-[var(--button)] text-white'
                        : 'bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--button)]'
                    }`}
                  >
                    {catalog.name}
                  </button>
                ))}
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

              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[var(--foreground)]">
                  {currentFolder?.name}
                </h2>
                <button
                  onClick={handleAddNewTour}
                  className="bg-[var(--button)] text-white px-4 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors"
                >
                  Добавить тур
                </button>
              </div>

              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <svg 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--foreground)] opacity-50" 
                    width="20" 
                    height="20" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Поиск по названию, маршруту, описанию, категории, цене..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--foreground)] opacity-50 hover:opacity-100"
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {currentFolder && filteredTours.length === 0 && searchTerm ? (
                <div className="card text-center py-12">
                  <p className="text-[var(--foreground)] opacity-70">
                    Ничего не найдено по запросу "{searchTerm}"
                  </p>
                </div>
              ) : currentFolder && filteredTours.length === 0 ? (
                <div className="card text-center py-12">
                  <p className="text-[var(--foreground)] opacity-70">
                    В этой папке пока нет туров
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTours.map(tour => (
                    <div key={tour.id} className="card hover:border-[var(--button)] transition-colors group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-[var(--foreground)] mb-1">
                            {tour.name || 'Без названия'}
                          </h3>
                          <p className="text-sm text-[var(--foreground)] opacity-60">
                            {tour.route}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-[var(--button)]/10 text-[var(--button)] text-xs rounded">
                          {tour.category}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-[var(--foreground)] opacity-70">Цена:</span>
                          <span className="font-medium text-[var(--foreground)]">
                            {tour.price.toLocaleString()} ₽
                            {tour.oldPrice && (
                              <span className="ml-2 line-through opacity-50">
                                {tour.oldPrice.toLocaleString()} ₽
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--foreground)] opacity-70">Длительность:</span>
                          <span className="font-medium text-[var(--foreground)]">{tour.duration} дней</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditTour(tour)}
                          className="flex-1 bg-[var(--button)] text-white py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDeleteTour(tour.id)}
                          className="px-3 py-2 border border-[var(--border)] rounded-lg hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingTour && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--card)] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">
              {editingTour.id && folders.find(f => f.id === selectedFolder)?.tours.find(t => t.id === editingTour.id)
                ? 'Редактирование тура'
                : 'Новый тур'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Название тура
                </label>
                <input
                  type="text"
                  value={editingTour.name}
                  onChange={(e) => setEditingTour({ ...editingTour, name: e.target.value })}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Категория
                </label>
                <select
                  value={editingTour.category}
                  onChange={(e) => setEditingTour({ ...editingTour, category: e.target.value })}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Маршрут
                </label>
                <input
                  type="text"
                  value={editingTour.route}
                  onChange={(e) => setEditingTour({ ...editingTour, route: e.target.value })}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Цена (₽)
                  </label>
                  <input
                    type="number"
                    value={editingTour.price}
                    onChange={(e) => setEditingTour({ ...editingTour, price: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Старая цена (₽)
                  </label>
                  <input
                    type="number"
                    value={editingTour.oldPrice || ''}
                    onChange={(e) => setEditingTour({ ...editingTour, oldPrice: Number(e.target.value) || undefined })}
                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Продолжительность (дни)
                </label>
                <input
                  type="number"
                  value={editingTour.duration}
                  onChange={(e) => setEditingTour({ ...editingTour, duration: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  URL изображения
                </label>
                <input
                  type="text"
                  value={editingTour.imageUrl}
                  onChange={(e) => setEditingTour({ ...editingTour, imageUrl: e.target.value })}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Описание
                </label>
                <textarea
                  value={editingTour.description}
                  onChange={(e) => setEditingTour({ ...editingTour, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleSaveTour}
                className="flex-1 bg-[var(--button)] text-white py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors"
              >
                Сохранить
              </button>
              <button
                onClick={() => setEditingTour(null)}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
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
              <div className="p-4 border-2 border-[var(--border)] rounded-lg hover:border-[var(--button)] cursor-pointer transition-colors">
                <h3 className="font-semibold text-[var(--foreground)] mb-1">Яндекс.Метрика</h3>
                <p className="text-sm text-[var(--foreground)] opacity-70">utm_source, utm_medium, utm_campaign, yclid</p>
              </div>
              <div className="p-4 border-2 border-[var(--border)] rounded-lg hover:border-[var(--button)] cursor-pointer transition-colors">
                <h3 className="font-semibold text-[var(--foreground)] mb-1">Яндекс.Директ</h3>
                <p className="text-sm text-[var(--foreground)] opacity-70">utm_source=yandex, utm_medium=cpc, utm_campaign</p>
              </div>
              <div className="p-4 border-2 border-[var(--border)] rounded-lg hover:border-[var(--button)] cursor-pointer transition-colors">
                <h3 className="font-semibold text-[var(--foreground)] mb-1">Google Ads</h3>
                <p className="text-sm text-[var(--foreground)] opacity-70">utm_source=google, utm_medium=cpc, utm_campaign, gclid</p>
              </div>
              <div className="p-4 border-2 border-[var(--border)] rounded-lg hover:border-[var(--button)] cursor-pointer transition-colors">
                <h3 className="font-semibold text-[var(--foreground)] mb-1">Facebook Ads</h3>
                <p className="text-sm text-[var(--foreground)] opacity-70">utm_source=facebook, utm_medium=cpc, utm_campaign, fbclid</p>
              </div>
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
              <div className="p-4 border-2 border-[var(--border)] rounded-lg hover:border-[var(--button)] cursor-pointer transition-colors">
                <h3 className="font-semibold text-[var(--foreground)] mb-2">Яндекс.Директ (базовый)</h3>
                <p className="text-sm text-[var(--foreground)] opacity-70 mb-2">
                  Готовый YML шаблон для Яндекс.Директ с обязательными полями
                </p>
                <div className="bg-[var(--background)] p-2 rounded text-xs font-mono text-[var(--foreground)] opacity-70">
                  &lt;yml_catalog&gt;&lt;shop&gt;...&lt;/shop&gt;&lt;/yml_catalog&gt;
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowXmlSelector(false)
                  // Здесь будет логика применения шаблона
                }}
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
    </div>
  )
}