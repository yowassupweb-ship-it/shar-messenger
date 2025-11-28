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

export default function FeedEditPage() {
  const [tours, setTours] = useState<Tour[]>([])
  const [editingTour, setEditingTour] = useState<Tour | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

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

  const handleEdit = (tour: Tour) => {
    setEditingTour({ ...tour })
  }

  const handleSave = async () => {
    if (!editingTour) return

    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/api/tours/${editingTour.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingTour)
      })

      if (response.ok) {
        setTours(tours.map(tour => tour.id === editingTour.id ? editingTour : tour))
        setEditingTour(null)
      }
    } catch (error) {
      console.error('Ошибка при сохранении:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот тур?')) return

    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/api/tours/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setTours(tours.filter(tour => tour.id !== id))
      }
    } catch (error) {
      console.error('Ошибка при удалении:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTours = tours.filter(tour =>
    tour.tour_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tour.route.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Редактирование фида</h1>
          <p className="text-[var(--muted)] mt-2">
            Редактируйте туры и их характеристики
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

      {/* Поиск */}
      <div>
        <input
          type="text"
          placeholder="Поиск туров..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </div>

      {/* Список туров */}
      <div className="grid gap-4">
        {filteredTours.map((tour) => (
          <div key={tour.id} className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                  {tour.tour_name}
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[var(--muted)]">Маршрут: {tour.route}</p>
                    <p className="text-[var(--muted)]">Продолжительность: {tour.duration} дней</p>
                  </div>
                  <div>
                    <p className="text-[var(--foreground)] font-semibold">
                      Цена: ₽{tour.price.toLocaleString()}
                      {tour.old_price && (
                        <span className="text-[var(--muted)] line-through ml-2">
                          ₽{tour.old_price.toLocaleString()}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <p className="text-[var(--muted)] mt-2 max-w-2xl">
                  {tour.description}
                </p>
              </div>
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => handleEdit(tour)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Редактировать
                </button>
                <button
                  onClick={() => handleDelete(tour.id)}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Модальное окно редактирования */}
      {editingTour && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">
              Редактирование тура
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Название тура
                </label>
                <input
                  type="text"
                  value={editingTour.tour_name}
                  onChange={(e) => setEditingTour({ ...editingTour, tour_name: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Маршрут
                </label>
                <input
                  type="text"
                  value={editingTour.route}
                  onChange={(e) => setEditingTour({ ...editingTour, route: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Цена (₽)
                  </label>
                  <input
                    type="number"
                    value={editingTour.price}
                    onChange={(e) => setEditingTour({ ...editingTour, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Старая цена (₽)
                  </label>
                  <input
                    type="number"
                    value={editingTour.old_price || ''}
                    onChange={(e) => setEditingTour({ ...editingTour, old_price: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Продолжительность (дни)
                </label>
                <input
                  type="number"
                  value={editingTour.duration}
                  onChange={(e) => setEditingTour({ ...editingTour, duration: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  URL изображения
                </label>
                <input
                  type="url"
                  value={editingTour.image_url}
                  onChange={(e) => setEditingTour({ ...editingTour, image_url: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Описание
                </label>
                <textarea
                  rows={4}
                  value={editingTour.description}
                  onChange={(e) => setEditingTour({ ...editingTour, description: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setEditingTour(null)}
                className="px-4 py-2 border border-[var(--border)] rounded-md text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}