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

type SortField = keyof Tour
type SortDirection = 'asc' | 'desc'

export default function TableViewPage() {
  const [tours, setTours] = useState<Tour[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('tour_name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const filteredAndSortedTours = tours
    .filter(tour => 
      tour.tour_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]
      
      // Обработка undefined значений
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = (bValue as string).toLowerCase()
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

  const totalPages = Math.ceil(filteredAndSortedTours.length / itemsPerPage)
  const paginatedTours = filteredAndSortedTours.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
        </svg>
      )
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/>
      </svg>
    ) : (
      <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
      </svg>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Просмотр в таблице</h1>
          <p className="text-[var(--muted)] mt-2">
            Отображение фида в виде таблицы с сортировкой и поиском
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

      {/* Поиск и статистика */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Поиск по названию, маршруту или описанию..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full px-4 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <div className="text-sm text-[var(--muted)]">
          Показано {paginatedTours.length} из {filteredAndSortedTours.length} туров
        </div>
      </div>

      {/* Таблица */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] bg-opacity-10">
              <tr>
                <th 
                  className="text-left py-3 px-4 font-semibold text-[var(--foreground)] cursor-pointer hover:bg-[var(--muted)] hover:bg-opacity-20 transition-colors"
                  onClick={() => handleSort('tour_name')}
                >
                  <div className="flex items-center space-x-2">
                    <span>Название</span>
                    <SortIcon field="tour_name" />
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 font-semibold text-[var(--foreground)] cursor-pointer hover:bg-[var(--muted)] hover:bg-opacity-20 transition-colors"
                  onClick={() => handleSort('route')}
                >
                  <div className="flex items-center space-x-2">
                    <span>Маршрут</span>
                    <SortIcon field="route" />
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 font-semibold text-[var(--foreground)] cursor-pointer hover:bg-[var(--muted)] hover:bg-opacity-20 transition-colors"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center space-x-2">
                    <span>Цена</span>
                    <SortIcon field="price" />
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 font-semibold text-[var(--foreground)] cursor-pointer hover:bg-[var(--muted)] hover:bg-opacity-20 transition-colors"
                  onClick={() => handleSort('duration')}
                >
                  <div className="flex items-center space-x-2">
                    <span>Дни</span>
                    <SortIcon field="duration" />
                  </div>
                </th>
                <th className="text-left py-3 px-4 font-semibold text-[var(--foreground)]">
                  Описание
                </th>
                <th className="text-left py-3 px-4 font-semibold text-[var(--foreground)]">
                  Изображение
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedTours.map((tour, index) => (
                <tr 
                  key={tour.id} 
                  className={`border-t border-[var(--border)] hover:bg-[var(--muted)] hover:bg-opacity-5 transition-colors ${
                    index % 2 === 0 ? 'bg-transparent' : 'bg-[var(--muted)] bg-opacity-5'
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="font-medium text-[var(--foreground)]">
                      {tour.tour_name}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[var(--muted)]">
                    {tour.route}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-[var(--foreground)] font-semibold">
                      ₽{tour.price.toLocaleString()}
                    </div>
                    {tour.old_price && (
                      <div className="text-[var(--muted)] text-xs line-through">
                        ₽{tour.old_price.toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[var(--foreground)]">
                    {tour.duration}
                  </td>
                  <td className="py-3 px-4 text-[var(--muted)] max-w-xs">
                    <div className="truncate" title={tour.description}>
                      {tour.description}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {tour.image_url ? (
                      <div className="w-12 h-12 bg-[var(--muted)] bg-opacity-20 rounded-lg overflow-hidden">
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
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-[var(--muted)] bg-opacity-20 rounded-lg flex items-center justify-center text-[var(--muted)] text-xs">
                        Нет фото
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-[var(--border)] rounded text-[var(--foreground)] disabled:opacity-50 hover:bg-[var(--muted)] hover:bg-opacity-20 transition-colors"
          >
            Назад
          </button>
          
          <div className="flex space-x-1">
            {[...Array(totalPages)].map((_, index) => (
              <button
                key={index + 1}
                onClick={() => setCurrentPage(index + 1)}
                className={`px-3 py-1 rounded transition-colors ${
                  currentPage === index + 1
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--foreground)] hover:bg-[var(--muted)] hover:bg-opacity-20'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-[var(--border)] rounded text-[var(--foreground)] disabled:opacity-50 hover:bg-[var(--muted)] hover:bg-opacity-20 transition-colors"
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  )
}