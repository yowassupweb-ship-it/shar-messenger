'use client'

import Link from 'next/link'
import { useState } from 'react'

interface Tour {
  id: string
  tour_name: string
  route: string
  price: number
  old_price?: number
  duration: number
  description: string
  image_url?: string
  category: string
  tags: string[]
}

interface Catalog {
  id: string
  name: string
  description: string
  tours: Tour[]
  createdAt: Date
  lastModified: Date
}

const sampleTours: Tour[] = [
  {
    id: '1',
    tour_name: 'Тур по Золотому кольцу России',
    route: 'Москва - Сергиев Посад - Переславль-Залесский - Ростов Великий - Ярославль - Кострома - Иваново - Суздаль - Владимир - Москва',
    price: 25000,
    old_price: 30000,
    duration: 5,
    description: 'Незабываемое путешествие по древним городам России с богатой историей и уникальными памятниками архитектуры.',
    image_url: 'https://example.com/golden-ring.jpg',
    category: 'Культурно-познавательный',
    tags: ['история', 'архитектура', 'православие', 'традиции']
  },
  {
    id: '2',
    tour_name: 'Отдых в Сочи',
    route: 'Сочи - Красная поляна - Роза Хутор - Адлер',
    price: 18000,
    duration: 7,
    description: 'Комфортный отдых на черноморском побережье с возможностью активного отдыха в горах.',
    image_url: 'https://example.com/sochi.jpg',
    category: 'Пляжный отдых',
    tags: ['море', 'горы', 'активный отдых', 'олимпийский парк']
  }
]

const defaultCatalogs: Catalog[] = [
  {
    id: '1',
    name: 'Внутренний туризм',
    description: 'Туры по России для российских туристов',
    tours: sampleTours,
    createdAt: new Date(2024, 0, 15),
    lastModified: new Date()
  },
  {
    id: '2',
    name: 'Зарубежные туры',
    description: 'Международные направления',
    tours: [],
    createdAt: new Date(2024, 1, 1),
    lastModified: new Date(2024, 1, 10)
  }
]

export default function CatalogsPage() {
  const [catalogs, setCatalogs] = useState<Catalog[]>(defaultCatalogs)
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null)
  const [showCreateCatalogModal, setShowCreateCatalogModal] = useState(false)
  const [showAddTourModal, setShowAddTourModal] = useState(false)
  const [newCatalog, setNewCatalog] = useState({ name: '', description: '' })
  const [newTour, setNewTour] = useState<Partial<Tour>>({
    tour_name: '',
    route: '',
    price: 0,
    old_price: undefined,
    duration: 1,
    description: '',
    image_url: '',
    category: '',
    tags: []
  })
  const [tagInput, setTagInput] = useState('')

  const handleCreateCatalog = () => {
    const catalog: Catalog = {
      id: Date.now().toString(),
      name: newCatalog.name,
      description: newCatalog.description,
      tours: [],
      createdAt: new Date(),
      lastModified: new Date()
    }
    
    setCatalogs([...catalogs, catalog])
    setNewCatalog({ name: '', description: '' })
    setShowCreateCatalogModal(false)
  }

  const handleAddTour = () => {
    if (!selectedCatalog) return
    
    const tour: Tour = {
      id: Date.now().toString(),
      tour_name: newTour.tour_name || '',
      route: newTour.route || '',
      price: newTour.price || 0,
      old_price: newTour.old_price,
      duration: newTour.duration || 1,
      description: newTour.description || '',
      image_url: newTour.image_url,
      category: newTour.category || '',
      tags: newTour.tags || []
    }
    
    const updatedCatalogs = catalogs.map(c => 
      c.id === selectedCatalog.id 
        ? { ...c, tours: [...c.tours, tour], lastModified: new Date() }
        : c
    )
    setCatalogs(updatedCatalogs)
    setSelectedCatalog({
      ...selectedCatalog,
      tours: [...selectedCatalog.tours, tour],
      lastModified: new Date()
    })
    
    setNewTour({
      tour_name: '',
      route: '',
      price: 0,
      old_price: undefined,
      duration: 1,
      description: '',
      image_url: '',
      category: '',
      tags: []
    })
    setTagInput('')
    setShowAddTourModal(false)
  }

  const deleteCatalog = (id: string) => {
    setCatalogs(catalogs.filter(c => c.id !== id))
    if (selectedCatalog?.id === id) {
      setSelectedCatalog(null)
    }
  }

  const deleteTour = (catalogId: string, tourId: string) => {
    const updatedCatalogs = catalogs.map(c => 
      c.id === catalogId 
        ? { ...c, tours: c.tours.filter(t => t.id !== tourId), lastModified: new Date() }
        : c
    )
    setCatalogs(updatedCatalogs)
    if (selectedCatalog?.id === catalogId) {
      setSelectedCatalog({
        ...selectedCatalog,
        tours: selectedCatalog.tours.filter(t => t.id !== tourId),
        lastModified: new Date()
      })
    }
  }

  const addTag = () => {
    if (tagInput.trim() && newTour.tags && !newTour.tags.includes(tagInput.trim())) {
      setNewTour({
        ...newTour,
        tags: [...newTour.tags, tagInput.trim()]
      })
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setNewTour({
      ...newTour,
      tags: newTour.tags?.filter(tag => tag !== tagToRemove) || []
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div>
      {/* Навигация */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/" className="text-[var(--button)] hover:underline">
          Инструменты
        </Link>
        <span className="text-[var(--foreground)] opacity-50">/</span>
        <Link href="/feed-editor" className="text-[var(--button)] hover:underline">
          Редактор фидов
        </Link>
        <span className="text-[var(--foreground)] opacity-50">/</span>
        <span className="text-[var(--foreground)]">Каталоги</span>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            Каталоги туров
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            Управление каталогами и турами для генерации фидов
          </p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateCatalogModal(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Создать каталог
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Список каталогов */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
              Каталоги
            </h2>
            <div className="space-y-3">
              {catalogs.map((catalog) => (
                <div 
                  key={catalog.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedCatalog?.id === catalog.id 
                      ? 'border-[var(--button)] bg-[var(--button)]/10' 
                      : 'border-[var(--border)] hover:bg-[var(--hover)]'
                  }`}
                  onClick={() => setSelectedCatalog(catalog)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[var(--foreground)]">{catalog.name}</h3>
                      <p className="text-sm text-[var(--foreground)] opacity-70 mb-2">{catalog.description}</p>
                      <div className="flex items-center gap-2 text-xs text-[var(--foreground)] opacity-50">
                        <span>{catalog.tours.length} туров</span>
                        <span>•</span>
                        <span>{formatDate(catalog.lastModified)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('Удалить каталог?')) {
                          deleteCatalog(catalog.id)
                        }
                      }}
                      className="p-1 hover:bg-red-500/20 text-red-500 rounded"
                      title="Удалить каталог"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Просмотр каталога */}
        <div className="lg:col-span-3">
          {selectedCatalog ? (
            <div className="card">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--foreground)]">{selectedCatalog.name}</h2>
                  <p className="text-[var(--foreground)] opacity-70">{selectedCatalog.description}</p>
                  <p className="text-sm text-[var(--foreground)] opacity-50 mt-1">
                    {selectedCatalog.tours.length} туров • Создан {formatDate(selectedCatalog.createdAt)}
                  </p>
                </div>
                <button 
                  className="btn-primary"
                  onClick={() => setShowAddTourModal(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Добавить тур
                </button>
              </div>

              {/* Туры */}
              {selectedCatalog.tours.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedCatalog.tours.map((tour) => (
                    <div key={tour.id} className="p-4 border border-[var(--border)] rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-[var(--foreground)]">{tour.tour_name}</h3>
                        <button
                          onClick={() => deleteTour(selectedCatalog.id, tour.id)}
                          className="p-1 hover:bg-red-500/20 text-red-500 rounded"
                          title="Удалить тур"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                      
                      <p className="text-sm text-[var(--foreground)] opacity-70 mb-3">{tour.route}</p>
                      <p className="text-sm mb-3">{tour.description}</p>
                      
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-[var(--button)]">
                            {tour.price.toLocaleString('ru-RU')} ₽
                          </span>
                          {tour.old_price && (
                            <span className="text-sm text-[var(--foreground)] opacity-50 line-through">
                              {tour.old_price.toLocaleString('ru-RU')} ₽
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-[var(--foreground)] opacity-70">
                          {tour.duration} дней
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-1 text-xs bg-[var(--button)]/20 text-[var(--button)] rounded">
                          {tour.category}
                        </span>
                      </div>

                      {tour.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tour.tags.map((tag, index) => (
                            <span 
                              key={index}
                              className="px-2 py-1 text-xs bg-[var(--hover)] rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-4 opacity-50">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  <p className="text-[var(--foreground)] opacity-70 mb-4">
                    В каталоге пока нет туров
                  </p>
                  <button 
                    className="btn-primary"
                    onClick={() => setShowAddTourModal(true)}
                  >
                    Добавить первый тур
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="text-center py-12">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-4 opacity-50">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <p className="text-[var(--foreground)] opacity-70">
                  Выберите каталог для просмотра
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно создания каталога */}
      {showCreateCatalogModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Создать каталог</h2>
              <button 
                onClick={() => setShowCreateCatalogModal(false)}
                className="btn-secondary"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateCatalog(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Название каталога *</label>
                <input 
                  type="text" 
                  className="input-field w-full"
                  value={newCatalog.name}
                  onChange={(e) => setNewCatalog({...newCatalog, name: e.target.value})}
                  placeholder="Название каталога"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Описание</label>
                <textarea 
                  className="input-field w-full h-20"
                  value={newCatalog.description}
                  onChange={(e) => setNewCatalog({...newCatalog, description: e.target.value})}
                  placeholder="Описание каталога"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary">
                  Создать каталог
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowCreateCatalogModal(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно добавления тура */}
      {showAddTourModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Добавить тур</h2>
              <button 
                onClick={() => setShowAddTourModal(false)}
                className="btn-secondary"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleAddTour(); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Название тура *</label>
                  <input 
                    type="text" 
                    className="input-field w-full"
                    value={newTour.tour_name}
                    onChange={(e) => setNewTour({...newTour, tour_name: e.target.value})}
                    placeholder="Название тура"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Категория</label>
                  <input 
                    type="text" 
                    className="input-field w-full"
                    value={newTour.category}
                    onChange={(e) => setNewTour({...newTour, category: e.target.value})}
                    placeholder="Категория тура"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Маршрут *</label>
                <input 
                  type="text" 
                  className="input-field w-full"
                  value={newTour.route}
                  onChange={(e) => setNewTour({...newTour, route: e.target.value})}
                  placeholder="Маршрут путешествия"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Цена *</label>
                  <input 
                    type="number" 
                    className="input-field w-full"
                    value={newTour.price}
                    onChange={(e) => setNewTour({...newTour, price: Number(e.target.value)})}
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Старая цена</label>
                  <input 
                    type="number" 
                    className="input-field w-full"
                    value={newTour.old_price || ''}
                    onChange={(e) => setNewTour({...newTour, old_price: e.target.value ? Number(e.target.value) : undefined})}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Количество дней *</label>
                  <input 
                    type="number" 
                    className="input-field w-full"
                    value={newTour.duration}
                    onChange={(e) => setNewTour({...newTour, duration: Number(e.target.value)})}
                    placeholder="1"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">URL фото</label>
                <input 
                  type="url" 
                  className="input-field w-full"
                  value={newTour.image_url}
                  onChange={(e) => setNewTour({...newTour, image_url: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Описание *</label>
                <textarea 
                  className="input-field w-full h-32"
                  value={newTour.description}
                  onChange={(e) => setNewTour({...newTour, description: e.target.value})}
                  placeholder="Описание тура"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Теги</label>
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text" 
                    className="input-field flex-1"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Введите тег"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <button 
                    type="button"
                    onClick={addTag}
                    className="btn-secondary"
                  >
                    Добавить
                  </button>
                </div>
                {newTour.tags && newTour.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {newTour.tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 text-xs bg-[var(--button)]/20 text-[var(--button)] rounded flex items-center gap-1"
                      >
                        #{tag}
                        <button 
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary">
                  Добавить тур
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowAddTourModal(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}