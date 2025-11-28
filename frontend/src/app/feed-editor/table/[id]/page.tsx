'use client'

import { useState } from 'react'
import Link from 'next/link'

const mockFeedData = [
  {
    id: '1',
    name: 'iPhone 15 Pro',
    price: 89990,
    category: 'Смартфоны',
    availability: 'В наличии',
    brand: 'Apple',
    description: 'Флагманский смартфон Apple с камерой Pro',
    gtin: '194253433620',
    condition: 'new'
  },
  {
    id: '2',
    name: 'Samsung Galaxy S24',
    price: 79990,
    category: 'Смартфоны',
    availability: 'Под заказ',
    brand: 'Samsung',
    description: 'Премиальный смартфон Samsung',
    gtin: '887276788398',
    condition: 'new'
  },
  {
    id: '3',
    name: 'MacBook Air M2',
    price: 129990,
    category: 'Ноутбуки',
    availability: 'В наличии',
    brand: 'Apple',
    description: 'Ноутбук Apple MacBook Air с чипом M2',
    gtin: '194253081234',
    condition: 'new'
  }
]

export default function FeedTablePage({ params }: { params: { id: string } }) {
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const feedId = params.id

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const selectAll = () => {
    setSelectedItems(
      selectedItems.length === mockFeedData.length 
        ? [] 
        : mockFeedData.map(item => item.id)
    )
  }

  const filteredData = mockFeedData.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.brand.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'В наличии': return 'text-green-400 bg-green-400/10'
      case 'Под заказ': return 'text-yellow-400 bg-yellow-400/10'
      case 'Нет в наличии': return 'text-red-400 bg-red-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  return (
    <div>
      {/* Заголовок и навигация */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/feed-editor" className="text-[var(--button)] hover:underline">
          Редактор фидов
        </Link>
        <span className="text-[var(--foreground)] opacity-50">/</span>
        <span className="text-[var(--foreground)]">Таблица</span>
        <span className="text-[var(--foreground)] opacity-50">/</span>
        <span className="text-[var(--foreground)] opacity-70">Фид #{feedId}</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            Табличное представление фида
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            Управление товарами фида #{feedId} в табличном виде
          </p>
        </div>

        <div className="flex gap-3">
          <Link href={`/feed-editor/cards/${feedId}`} className="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Карточки
          </Link>
          <button className="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Экспорт
          </button>
        </div>
      </div>

      {/* Поиск и фильтры */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              className="input-field w-full"
              placeholder="Поиск по названию, категории или бренду..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <select className="input-field">
              <option>Все категории</option>
              <option>Смартфоны</option>
              <option>Ноутбуки</option>
              <option>Планшеты</option>
            </select>
            <select className="input-field">
              <option>Все бренды</option>
              <option>Apple</option>
              <option>Samsung</option>
              <option>Xiaomi</option>
            </select>
          </div>
        </div>

        {selectedItems.length > 0 && (
          <div className="mt-4 p-3 bg-[var(--button)]/10 border border-[var(--button)]/30 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-[var(--button)]">
                Выбрано {selectedItems.length} товаров
              </span>
              <div className="flex gap-2">
                <button className="btn-secondary text-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Редактировать
                </button>
                <button className="btn-secondary text-sm text-red-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
                    <path d="m3 6 3 0"/>
                    <path d="m19 6-1 0"/>
                  </svg>
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Таблица */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === mockFeedData.length && mockFeedData.length > 0}
                    onChange={selectAll}
                    className="rounded border-[var(--border)]"
                  />
                </th>
                <th className="text-left p-4 font-medium">ID</th>
                <th className="text-left p-4 font-medium">Название</th>
                <th className="text-left p-4 font-medium">Цена</th>
                <th className="text-left p-4 font-medium">Категория</th>
                <th className="text-left p-4 font-medium">Бренд</th>
                <th className="text-left p-4 font-medium">Наличие</th>
                <th className="text-left p-4 font-medium">GTIN</th>
                <th className="text-left p-4 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr 
                  key={item.id} 
                  className="border-b border-[var(--border)] hover:bg-[var(--hover)] transition-colors"
                >
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleSelectItem(item.id)}
                      className="rounded border-[var(--border)]"
                    />
                  </td>
                  <td className="p-4 font-mono text-sm">{item.id}</td>
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm opacity-70 mt-1">{item.description}</div>
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-[var(--button)]">
                    {item.price.toLocaleString('ru-RU')} ₽
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 text-xs bg-[var(--button)]/10 text-[var(--button)] rounded">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-4">{item.brand}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs rounded ${getAvailabilityColor(item.availability)}`}>
                      {item.availability}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-xs">{item.gtin}</td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <button className="btn-secondary text-sm p-2" title="Редактировать">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button className="btn-secondary text-sm p-2" title="Просмотр">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[var(--button)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--button)" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Товары не найдены</h3>
            <p className="text-[var(--foreground)] opacity-70">
              Попробуйте изменить параметры поиска
            </p>
          </div>
        )}
      </div>

      {/* Пагинация */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm opacity-70">
          Показано {filteredData.length} из {mockFeedData.length} товаров
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15,18 9,12 15,6"/>
            </svg>
            Назад
          </button>
          <button className="btn-secondary text-sm" disabled>
            Далее
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}