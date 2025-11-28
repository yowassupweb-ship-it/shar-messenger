'use client'

import { useState } from 'react'

export default function FeedsPage() {
  const [feeds, setFeeds] = useState([
    {
      id: '1',
      name: 'Фид для Google Shopping',
      template: 'XML Feed для Google',
      status: 'active',
      lastGenerated: new Date('2024-01-15T10:30:00'),
      itemsCount: 150
    },
    {
      id: '2',
      name: 'Фид для Яндекс.Маркет',
      template: 'YML Feed для Яндекс',
      status: 'draft',
      lastGenerated: new Date('2024-01-14T15:20:00'),
      itemsCount: 120
    }
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 border-green-400'
      case 'draft': return 'text-yellow-400 border-yellow-400'
      case 'error': return 'text-red-400 border-red-400'
      default: return 'text-gray-400 border-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Активный'
      case 'draft': return 'Черновик'
      case 'error': return 'Ошибка'
      default: return 'Неизвестно'
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            Фиды
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            Управление созданными фидами товаров
          </p>
        </div>
        <button className="btn-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Создать фид
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <input 
              type="text" 
              className="input-field w-full"
              placeholder="Поиск фидов..."
            />
          </div>
          <select className="input-field">
            <option>Все статусы</option>
            <option>Активные</option>
            <option>Черновики</option>
            <option>С ошибками</option>
          </select>
          <button className="btn-secondary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {feeds.map((feed) => (
          <div key={feed.id} className="card">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{feed.name}</h3>
                  <span className={`px-2 py-1 text-xs border rounded ${getStatusColor(feed.status)}`}>
                    {getStatusText(feed.status)}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm opacity-70">
                  <div>
                    <span className="font-medium">Шаблон:</span> {feed.template}
                  </div>
                  <div>
                    <span className="font-medium">Товаров:</span> {feed.itemsCount}
                  </div>
                  <div>
                    <span className="font-medium">Обновлен:</span> {feed.lastGenerated.toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <button className="btn-secondary text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Скачать
                </button>
                
                <button className="btn-primary text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  Просмотр
                </button>

                <button className="btn-secondary text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Редактировать
                </button>

                <button className="btn-secondary text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6"/>
                    <path d="M1 20v-6h6"/>
                    <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                  Обновить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {feeds.length === 0 && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-[var(--button)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--background)" strokeWidth="2">
              <path d="M4 11a9 9 0 0 1 9 9"/>
              <path d="M4 4a16 16 0 0 1 16 16"/>
              <circle cx="5" cy="19" r="1"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Нет созданных фидов</h3>
          <p className="text-[var(--foreground)] opacity-70 mb-6">
            Создайте ваш первый фид на основе шаблона
          </p>
          <button className="btn-primary">
            Создать первый фид
          </button>
        </div>
      )}
    </div>
  )
}