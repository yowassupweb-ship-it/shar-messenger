'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function FeedsPage() {
  const [displayType, setDisplayType] = useState<'cards' | 'table' | 'list'>('cards')
  const [selectedSource, setSelectedSource] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Пример данных фидов
  const feeds = [
    {
      id: '1',
      name: 'Туры в Турцию',
      source: 'anex',
      status: 'active',
      lastUpdate: '2024-12-30T10:30:00Z',
      itemsCount: 1250,
      type: 'xml',
      url: 'https://api.anex-tour.com/feeds/turkey.xml'
    },
    {
      id: '2', 
      name: 'Европейские туры',
      source: 'tez',
      status: 'active',
      lastUpdate: '2024-12-30T09:15:00Z',
      itemsCount: 850,
      type: 'json',
      url: 'https://api.tez-tour.com/feeds/europe.json'
    },
    {
      id: '3',
      name: 'Экзотические направления',
      source: 'coral',
      status: 'error',
      lastUpdate: '2024-12-29T14:20:00Z',
      itemsCount: 0,
      type: 'xml',
      url: 'https://api.coral.ru/feeds/exotic.xml'
    },
    {
      id: '4',
      name: 'Горящие туры',
      source: 'pegas',
      status: 'active',
      lastUpdate: '2024-12-30T11:45:00Z',
      itemsCount: 320,
      type: 'csv',
      url: 'https://api.pegastouristik.com/feeds/hot.csv'
    }
  ]

  const sources = [
    { id: 'all', name: 'Все источники' },
    { id: 'anex', name: 'Anex Tour' },
    { id: 'tez', name: 'Tez Tour' },
    { id: 'coral', name: 'Coral Travel' },
    { id: 'pegas', name: 'Pegas Touristik' }
  ]

  const filteredFeeds = feeds.filter(feed => {
    const matchesSource = selectedSource === 'all' || feed.source === selectedSource
    const matchesSearch = feed.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSource && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-500 bg-green-100'
      case 'error':
        return 'text-red-500 bg-red-100'
      case 'pending':
        return 'text-yellow-500 bg-yellow-100'
      default:
        return 'text-gray-500 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Активен'
      case 'error':
        return 'Ошибка'
      case 'pending':
        return 'Ожидание'
      default:
        return 'Неизвестно'
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link href="/" className="text-[var(--button)] hover:underline">
          Инструменты
        </Link>
        <span className="text-[var(--foreground)] opacity-50">/</span>
        <Link href="/feed-editor" className="text-[var(--button)] hover:underline">
          Редактор фидов
        </Link>
        <span className="text-[var(--foreground)] opacity-50">/</span>
        <span className="text-[var(--foreground)]">Фиды</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-2">
            Фиды
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            Управление источниками данных и настройка отображения фидов
          </p>
        </div>
        
        <button className="bg-[var(--button)] text-white px-6 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors">
          Добавить фид
        </button>
      </div>

      {/* Controls */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--foreground)] opacity-40" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Поиск фидов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
              />
            </div>
          </div>

          {/* Source Filter */}
          <div className="flex gap-3">
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>

            {/* Display Type */}
            <div className="flex bg-[var(--card)] rounded-lg p-1 border">
              <button
                onClick={() => setDisplayType('cards')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  displayType === 'cards'
                    ? 'bg-[var(--button)] text-white'
                    : 'text-[var(--foreground)] hover:bg-[var(--background)]'
                }`}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                </svg>
              </button>
              <button
                onClick={() => setDisplayType('table')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  displayType === 'table'
                    ? 'bg-[var(--button)] text-white'
                    : 'text-[var(--foreground)] hover:bg-[var(--background)]'
                }`}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                  <line x1="15" y1="3" x2="15" y2="21"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="3" y1="15" x2="21" y2="15"/>
                </svg>
              </button>
              <button
                onClick={() => setDisplayType('list')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  displayType === 'list'
                    ? 'bg-[var(--button)] text-white'
                    : 'text-[var(--foreground)] hover:bg-[var(--background)]'
                }`}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>

      {/* Content */}
      {displayType === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFeeds.map((feed) => (
            <div key={feed.id} className="card hover:border-[var(--button)] transition-colors group">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-1 group-hover:text-[var(--button)] transition-colors">
                    {feed.name}
                  </h3>
                  <p className="text-sm text-[var(--foreground)] opacity-60">
                    Источник: {sources.find(s => s.id === feed.source)?.name || feed.source}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(feed.status)}`}>
                  {getStatusText(feed.status)}
                </span>
              </div>

              <div className="space-y-2 text-sm text-[var(--foreground)] opacity-70">
                <div className="flex justify-between">
                  <span>Элементов:</span>
                  <span className="font-medium">{feed.itemsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Тип:</span>
                  <span className="font-medium uppercase">{feed.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Обновлено:</span>
                  <span className="font-medium">
                    {new Date(feed.lastUpdate).toLocaleString('ru-RU')}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--border)] flex gap-2">
                <button className="flex-1 bg-[var(--button)] text-white py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors">
                  Открыть
                </button>
                <button className="px-3 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--background)] transition-colors">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3"/>
                    <circle cx="12" cy="5" r="1"/>
                    <circle cx="12" cy="19" r="1"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {displayType === 'table' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-4 font-medium text-[var(--foreground)]">Название</th>
                  <th className="text-left py-3 px-4 font-medium text-[var(--foreground)]">Источник</th>
                  <th className="text-left py-3 px-4 font-medium text-[var(--foreground)]">Статус</th>
                  <th className="text-left py-3 px-4 font-medium text-[var(--foreground)]">Элементов</th>
                  <th className="text-left py-3 px-4 font-medium text-[var(--foreground)]">Тип</th>
                  <th className="text-left py-3 px-4 font-medium text-[var(--foreground)]">Обновлено</th>
                  <th className="text-left py-3 px-4 font-medium text-[var(--foreground)]">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeeds.map((feed) => (
                  <tr key={feed.id} className="border-b border-[var(--border)] hover:bg-[var(--background)] transition-colors">
                    <td className="py-3 px-4 text-[var(--foreground)]">{feed.name}</td>
                    <td className="py-3 px-4 text-[var(--foreground)] opacity-70">
                      {sources.find(s => s.id === feed.source)?.name || feed.source}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(feed.status)}`}>
                        {getStatusText(feed.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--foreground)]">{feed.itemsCount}</td>
                    <td className="py-3 px-4 text-[var(--foreground)] uppercase text-sm">{feed.type}</td>
                    <td className="py-3 px-4 text-[var(--foreground)] opacity-70 text-sm">
                      {new Date(feed.lastUpdate).toLocaleString('ru-RU')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button className="text-[var(--button)] hover:text-[var(--button)]/80 transition-colors">
                          Открыть
                        </button>
                        <button className="text-[var(--foreground)] opacity-50 hover:opacity-100 transition-opacity">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="3"/>
                            <circle cx="12" cy="5" r="1"/>
                            <circle cx="12" cy="19" r="1"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {displayType === 'list' && (
        <div className="card">
          <div className="space-y-4">
            {filteredFeeds.map((feed) => (
              <div key={feed.id} className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg hover:border-[var(--button)] transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[var(--button)]/10 rounded-lg flex items-center justify-center">
                    <svg width="20" height="20" fill="none" stroke="var(--button)" viewBox="0 0 24 24">
                      <path d="M4 11a9 9 0 0 1 9 9"/>
                      <path d="M4 4a16 16 0 0 1 16 16"/>
                      <circle cx="5" cy="19" r="1"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-[var(--foreground)] group-hover:text-[var(--button)] transition-colors">
                      {feed.name}
                    </h3>
                    <p className="text-sm text-[var(--foreground)] opacity-60">
                      {sources.find(s => s.id === feed.source)?.name || feed.source} • {feed.itemsCount} элементов • {feed.type.toUpperCase()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(feed.status)}`}>
                    {getStatusText(feed.status)}
                  </span>
                  <span className="text-sm text-[var(--foreground)] opacity-60">
                    {new Date(feed.lastUpdate).toLocaleString('ru-RU')}
                  </span>
                  <button className="bg-[var(--button)] text-white px-4 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors">
                    Открыть
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}