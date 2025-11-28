'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { showToast } from '@/components/Toast'

interface DirectAd {
  id: string
  platform: string
  type: string
  query: string
  title: string
  description: string
  url: string
  display_url: string
  timestamp: string
  position?: number
  is_premium?: boolean
}

export default function AdsPage() {
  const [ads, setAds] = useState<DirectAd[]>([])
  const [totalAds, setTotalAds] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const limit = 50

  const loadAds = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('query', searchQuery)
      params.set('limit', limit.toString())
      params.set('offset', (page * limit).toString())
      
      const response = await apiFetch(`/api/direct-parser/ads?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAds(data.ads || [])
        setTotalAds(data.total || 0)
      }
    } catch (error) {
      console.error('Ошибка загрузки объявлений:', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, page])

  useEffect(() => {
    loadAds()
  }, [loadAds])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(0)
    loadAds()
  }

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Удалить это объявление?')) return
    try {
      const response = await apiFetch(`/api/direct-parser/ads/${adId}`, { method: 'DELETE' })
      if (response.ok) {
        showToast('Объявление удалено', 'success')
        loadAds()
      }
    } catch {
      showToast('Ошибка удаления', 'error')
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Удалить ВСЕ объявления? Это действие нельзя отменить.')) return
    try {
      const response = await apiFetch('/api/direct-parser/ads', { method: 'DELETE' })
      if (response.ok) {
        showToast('Все объявления удалены', 'success')
        loadAds()
      }
    } catch {
      showToast('Ошибка очистки', 'error')
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('ru-RU', { 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } catch {
      return dateStr
    }
  }

  const totalPages = Math.ceil(totalAds / limit)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Объявления</h1>
          <p className="text-sm opacity-60 mt-1">Собранные рекламные объявления из Яндекс.Директа</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadAds}
            className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-[var(--button)] transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Обновить
          </button>
          {totalAds > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors text-sm"
            >
              Очистить всё
            </button>
          )}
        </div>
      </div>

      {/* Поиск */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по объявлениям..."
          className="flex-1 px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:border-[var(--button)] focus:outline-none"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-[var(--button)] text-white rounded-lg hover:opacity-90"
        >
          Найти
        </button>
      </form>

      {/* Список объявлений */}
      {isLoading ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--button)] border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm opacity-60">Загрузка...</p>
        </div>
      ) : ads.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center opacity-50">
          {searchQuery ? 'Ничего не найдено' : 'Объявлений пока нет. Создайте задачу и запустите парсер.'}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm opacity-60">Найдено: {totalAds}</div>
          {ads.map((ad) => (
            <div key={ad.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <a
                    href={ad.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--button)] hover:underline font-medium block truncate"
                  >
                    {ad.title}
                  </a>
                  <p className="text-sm opacity-70 mt-1 line-clamp-2">{ad.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs opacity-50">
                    <span>{ad.display_url}</span>
                    <span>•</span>
                    <span className="bg-[var(--border)] px-2 py-0.5 rounded">{ad.query}</span>
                    <span>•</span>
                    <span>{formatDate(ad.timestamp)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteAd(ad.id)}
                  className="p-2 hover:bg-red-500/10 rounded text-red-400 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg disabled:opacity-50"
              >
                ←
              </button>
              <span className="px-4 py-2">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg disabled:opacity-50"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
