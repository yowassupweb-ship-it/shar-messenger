'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

interface Tour {
  id: string
  tour_name: string
  route: string
  price: number
  old_price?: number
  duration: number
  description: string
  image_url: string
}

export default function CardsViewPage() {
  const [tours, setTours] = useState<Tour[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'duration'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [gridView, setGridView] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    loadTours()
  }, [])

  const loadTours = async () => {
    setIsLoading(true)
    try {
      const response = await apiFetch('/api/tours')
      if (response.ok) {
        const data = await response.json()
        setTours(data)
      }
    } catch (error) {
      console.error('Ошибка при загрузке туров:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredAndSortedTours = tours
    .filter(tour => 
      tour.tour_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue, bValue
      
      switch (sortBy) {
        case 'price':
          aValue = a.price
          bValue = b.price
          break
        case 'duration':
          aValue = a.duration
          bValue = b.duration
          break
        default:
          aValue = a.tour_name.toLowerCase()
          bValue = b.tour_name.toLowerCase()
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

  const TourCard = ({ tour }: { tour: Tour }) => (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Изображение */}
      <div className="relative h-48 bg-[var(--muted)] bg-opacity-20">
        {tour.image_url ? (
          <img 
            src={tour.image_url} 
            alt={tour.tour_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-[var(--muted)]">Нет изображения</div>'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--muted)]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
          </div>
        )}
        
        {/* Продолжительность */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
          {tour.duration} {tour.duration === 1 ? 'день' : tour.duration < 5 ? 'дня' : 'дней'}
        </div>
      </div>

      {/* Содержимое карточки */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2 line-clamp-2">
          {tour.tour_name}
        </h3>
        
        <p className="text-[var(--muted)] text-sm mb-2">
          {tour.route}
        </p>
        
        <p className="text-[var(--muted)] text-sm mb-4 line-clamp-3">
          {tour.description}
        </p>
        
        {/* Цена */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold text-[var(--foreground)]">
              ₽{tour.price.toLocaleString()}
            </div>
            {tour.old_price && (
              <div className="text-sm text-[var(--muted)] line-through">
                ₽{tour.old_price.toLocaleString()}
              </div>
            )}
          </div>
          
          {tour.old_price && (
            <div className="bg-red-500 text-white px-2 py-1 rounded text-sm">
              -{Math.round((1 - tour.price / tour.old_price) * 100)}%
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const TourListItem = ({ tour }: { tour: Tour }) => (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex space-x-4">
        {/* Изображение */}
        <div className="w-24 h-24 bg-[var(--muted)] bg-opacity-20 rounded-lg overflow-hidden flex-shrink-0">
          {tour.image_url ? (
            <img 
              src={tour.image_url} 
              alt={tour.tour_name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-[var(--muted)] text-xs">Нет фото</div>'
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--muted)] text-xs">
              Нет фото
            </div>
          )}
        </div>
        
        {/* Информация */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
            {tour.tour_name}
          </h3>
          
          <p className="text-[var(--muted)] text-sm mb-2">
            {tour.route} • {tour.duration} {tour.duration === 1 ? 'день' : tour.duration < 5 ? 'дня' : 'дней'}
          </p>
          
          <p className="text-[var(--muted)] text-sm line-clamp-2">
            {tour.description}
          </p>
        </div>
        
        {/* Цена */}
        <div className="text-right flex-shrink-0">
          <div className="text-xl font-bold text-[var(--foreground)]">
            ₽{tour.price.toLocaleString()}
          </div>
          {tour.old_price && (
            <div className="text-sm text-[var(--muted)] line-through">
              ₽{tour.old_price.toLocaleString()}
            </div>
          )}
          {tour.old_price && (
            <div className="bg-red-500 text-white px-2 py-1 rounded text-xs mt-1">
              -{Math.round((1 - tour.price / tour.old_price) * 100)}%
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Просмотр карточками</h1>
          <p className="text-[var(--muted)] mt-2">
            Отображение товаров из фида в виде карточек
          </p>
        </div>
        <button
          onClick={loadTours}
          disabled={isLoading}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isLoading ? 'Обновление...' : 'Обновить'}
        </button>
      </div>

      {/* Фильтры и управление */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        {/* Поиск */}
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Поиск туров..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        <div className="flex items-center space-x-4">
          {/* Сортировка */}
          <select
            value={`${sortBy}-${sortDirection}`}
            onChange={(e) => {
              const [field, direction] = e.target.value.split('-') as [typeof sortBy, typeof sortDirection]
              setSortBy(field)
              setSortDirection(direction)
            }}
            className="px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="name-asc">По названию ↑</option>
            <option value="name-desc">По названию ↓</option>
            <option value="price-asc">По цене ↑</option>
            <option value="price-desc">По цене ↓</option>
            <option value="duration-asc">По продолжительности ↑</option>
            <option value="duration-desc">По продолжительности ↓</option>
          </select>

          {/* Переключатель вида */}
          <div className="flex border border-[var(--border)] rounded-md overflow-hidden">
            <button
              onClick={() => setGridView('grid')}
              className={`px-3 py-2 ${gridView === 'grid' ? 'bg-[var(--primary)] text-white' : 'text-[var(--foreground)] hover:bg-[var(--muted)] hover:bg-opacity-20'} transition-colors`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
            </button>
            <button
              onClick={() => setGridView('list')}
              className={`px-3 py-2 ${gridView === 'list' ? 'bg-[var(--primary)] text-white' : 'text-[var(--foreground)] hover:bg-[var(--muted)] hover:bg-opacity-20'} transition-colors`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="text-sm text-[var(--muted)]">
        Найдено {filteredAndSortedTours.length} туров
      </div>

      {/* Туры */}
      {isLoading ? (
        <div className="text-center py-12 text-[var(--muted)]">
          Загрузка туров...
        </div>
      ) : filteredAndSortedTours.length === 0 ? (
        <div className="text-center py-12 text-[var(--muted)]">
          Туры не найдены
        </div>
      ) : (
        <div className={gridView === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          : "space-y-4"
        }>
          {filteredAndSortedTours.map(tour => 
            gridView === 'grid' ? (
              <TourCard key={tour.id} tour={tour} />
            ) : (
              <TourListItem key={tour.id} tour={tour} />
            )
          )}
        </div>
      )}
    </div>
  )
}