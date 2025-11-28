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
    description: 'Флагманский смартфон Apple с тройной камерой Pro и чипом A17 Pro',
    gtin: '194253433620',
    condition: 'new',
    image_url: '',
    rating: 4.8,
    reviews: 324
  },
  {
    id: '2',
    name: 'Samsung Galaxy S24',
    price: 79990,
    category: 'Смартфоны',
    availability: 'Под заказ',
    brand: 'Samsung',
    description: 'Премиальный смартфон Samsung с улучшенным ИИ и камерой',
    gtin: '887276788398',
    condition: 'new',
    image_url: '',
    rating: 4.6,
    reviews: 256
  },
  {
    id: '3',
    name: 'MacBook Air M2',
    price: 129990,
    category: 'Ноутбуки',
    availability: 'В наличии',
    brand: 'Apple',
    description: 'Ноутбук Apple MacBook Air с чипом M2, 13.6" Liquid Retina дисплей',
    gtin: '194253081234',
    condition: 'new',
    image_url: '',
    rating: 4.9,
    reviews: 158
  },
  {
    id: '4',
    name: 'iPad Pro 12.9"',
    price: 99990,
    category: 'Планшеты',
    availability: 'В наличии',
    brand: 'Apple',
    description: 'Профессиональный планшет с M2 чипом и Liquid Retina XDR дисплеем',
    gtin: '194253081567',
    condition: 'new',
    image_url: '',
    rating: 4.7,
    reviews: 89
  },
  {
    id: '5',
    name: 'AirPods Pro 2',
    price: 24990,
    category: 'Аудио',
    availability: 'В наличии',
    brand: 'Apple',
    description: 'Беспроводные наушники с активным шумоподавлением',
    gtin: '194253234567',
    condition: 'new',
    image_url: '',
    rating: 4.5,
    reviews: 412
  },
  {
    id: '6',
    name: 'Dell XPS 13',
    price: 89990,
    category: 'Ноутбуки',
    availability: 'Под заказ',
    brand: 'Dell',
    description: 'Ультрабук Dell XPS 13 с процессором Intel Core i7 и 16GB RAM',
    gtin: '884116234567',
    condition: 'new',
    image_url: '',
    rating: 4.4,
    reviews: 127
  }
]

export default function FeedCardsPage({ params }: { params: { id: string } }) {
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterBrand, setFilterBrand] = useState('all')

  const feedId = params.id

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const filteredData = mockFeedData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory
    const matchesBrand = filterBrand === 'all' || item.brand === filterBrand
    
    return matchesSearch && matchesCategory && matchesBrand
  })

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'В наличии': return 'text-green-400 bg-green-400/10 border-green-400/30'
      case 'Под заказ': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
      case 'Нет в наличии': return 'text-red-400 bg-red-400/10 border-red-400/30'
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30'
    }
  }

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg 
            key={star} 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill={star <= rating ? 'var(--button)' : 'none'} 
            stroke="var(--button)" 
            strokeWidth="2"
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
          </svg>
        ))}
        <span className="text-xs opacity-70 ml-1">({rating})</span>
      </div>
    )
  }

  return (
    <div>
      {/* Заголовок и навигация */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/feed-editor" className="text-[var(--button)] hover:underline">
          Редактор фидов
        </Link>
        <span className="text-[var(--foreground)] opacity-50">/</span>
        <span className="text-[var(--foreground)]">Карточки</span>
        <span className="text-[var(--foreground)] opacity-50">/</span>
        <span className="text-[var(--foreground)] opacity-70">Фид #{feedId}</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            Просмотр фида в виде карточек
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            Управление товарами фида #{feedId} в формате карточек
          </p>
        </div>

        <div className="flex gap-3">
          <Link href={`/feed-editor/table/${feedId}`} className="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="15" x2="21" y2="15"/>
            </svg>
            Таблица
          </Link>
          <button className="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Добавить товар
          </button>
        </div>
      </div>

      {/* Поиск и фильтры */}
      <div className="card mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              className="input-field w-full"
              placeholder="Поиск по названию, описанию или категории..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <select 
              className="input-field"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">Все категории</option>
              <option value="Смартфоны">Смартфоны</option>
              <option value="Ноутбуки">Ноутбуки</option>
              <option value="Планшеты">Планшеты</option>
              <option value="Аудио">Аудио</option>
            </select>
            <select 
              className="input-field"
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
            >
              <option value="all">Все бренды</option>
              <option value="Apple">Apple</option>
              <option value="Samsung">Samsung</option>
              <option value="Dell">Dell</option>
            </select>
            <select 
              className="input-field"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name">По названию</option>
              <option value="price">По цене</option>
              <option value="rating">По рейтингу</option>
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
                  Групповое редактирование
                </button>
                <button className="btn-secondary text-sm text-red-400">
                  Удалить выбранные
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Карточки товаров */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredData.map((item) => (
          <div 
            key={item.id} 
            className={`card relative transition-all duration-200 ${
              selectedItems.includes(item.id) 
                ? 'border-[var(--button)] bg-[var(--button)]/5' 
                : 'hover:border-[var(--button)]/50'
            }`}
          >
            {/* Чекбокс для выбора */}
            <div className="absolute top-4 right-4 z-10">
              <input
                type="checkbox"
                checked={selectedItems.includes(item.id)}
                onChange={() => toggleSelectItem(item.id)}
                className="w-4 h-4 rounded border-[var(--border)] bg-[var(--background)]"
              />
            </div>

            {/* Изображение товара */}
            <div className="w-full h-48 bg-[var(--hover)] rounded-lg mb-4 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--foreground)" strokeWidth="1" className="opacity-30">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
            </div>

            {/* Информация о товаре */}
            <div className="mb-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg leading-tight">{item.name}</h3>
              </div>
              
              <p className="text-sm opacity-70 mb-3 line-clamp-2">{item.description}</p>
              
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl font-bold text-[var(--button)]">
                  {item.price.toLocaleString('ru-RU')} ₽
                </span>
                {renderStarRating(item.rating)}
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2 py-1 text-xs bg-[var(--button)]/10 text-[var(--button)] rounded">
                  {item.category}
                </span>
                <span className="px-2 py-1 text-xs bg-[var(--background)] border border-[var(--border)] rounded">
                  {item.brand}
                </span>
              </div>

              <div className="mb-4">
                <span className={`px-3 py-1 text-xs rounded-full border ${getAvailabilityColor(item.availability)}`}>
                  {item.availability}
                </span>
              </div>
            </div>

            {/* Действия */}
            <div className="flex gap-2">
              <button className="btn-primary flex-1 text-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Редактировать
              </button>
              <button className="btn-secondary text-sm p-3" title="Просмотр">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <button className="btn-secondary text-sm p-3 text-red-400 border-red-400" title="Удалить">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m3 6 3 0"/>
                  <path d="m19 6-1 0"/>
                  <path d="m8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>

            {/* Дополнительная информация */}
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <div className="flex justify-between text-xs opacity-70">
                <span>ID: {item.id}</span>
                <span>{item.reviews} отзывов</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-[var(--button)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--button)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Товары не найдены</h3>
          <p className="text-[var(--foreground)] opacity-70 mb-6">
            Попробуйте изменить параметры поиска или добавить новые товары
          </p>
          <button className="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Добавить товар
          </button>
        </div>
      )}

      {/* Статистика и пагинация */}
      <div className="flex flex-col md:flex-row justify-between items-center mt-8 gap-4">
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
          <span className="px-3 py-2 text-sm">Страница 1 из 1</span>
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