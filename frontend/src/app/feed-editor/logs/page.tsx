'use client'

import { useState, useEffect } from 'react'
import { showToast } from '@/components/Toast'
import { apiFetch } from '@/lib/api'

interface LogEntry {
  id: string
  type: 'parser' | 'product_update' | 'feed' | 'system' | 'availability_check'
  message: string
  details?: string
  status: 'success' | 'error' | 'warning' | 'info'
  timestamp: string
  sourceId?: string
  productId?: string
  feedId?: string
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<'all' | 'parser' | 'product_update' | 'feed' | 'system' | 'availability_check'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/api/logs')
      if (response.ok) {
        const data = await response.json()
        setLogs(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки логов:', error)
      showToast('Ошибка загрузки логов', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => filter === 'all' || log.type === filter)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-500'
      case 'error': return 'text-red-500'
      case 'warning': return 'text-yellow-500'
      case 'info': return 'text-blue-500'
      default: return 'text-[var(--foreground)]'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'parser':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'product_update':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        )
      case 'feed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 11a9 9 0 019 9M4 4a16 16 0 0116 16" />
            <circle cx="5" cy="19" r="1" fill="currentColor" />
          </svg>
        )
      case 'system':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      case 'availability_check':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-2">
            Журнал
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            История событий и логи системы
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="px-4 py-2 bg-[var(--button)] text-white rounded-lg hover:bg-[var(--button)]/90 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Обновить
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'Все' },
            { value: 'parser', label: 'Парсер' },
            { value: 'product_update', label: 'Товары' },
            { value: 'feed', label: 'Фиды' },
            { value: 'availability_check', label: 'Проверка наличия' },
            { value: 'system', label: 'Система' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value as any)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === value
                  ? 'bg-[var(--button)] text-white'
                  : 'bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--hover)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--button)]"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div key={log.id} className="card hover:border-[var(--button)] transition-all">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${getStatusColor(log.status)} bg-opacity-10`}>
                  {getTypeIcon(log.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-[var(--foreground)]">
                        {log.message}
                      </h3>
                      {log.details && (
                        <p className="text-sm text-[var(--foreground)] opacity-70 mt-1">
                          {log.details}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-medium ${getStatusColor(log.status)}`}>
                      {log.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[var(--foreground)] opacity-50">
                    <span>{new Date(log.timestamp).toLocaleString('ru-RU')}</span>
                    {log.sourceId && <span>Источник: {log.sourceId}</span>}
                    {log.productId && <span>Товар: {log.productId}</span>}
                    {log.feedId && <span>Фид: {log.feedId}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredLogs.length === 0 && (
            <div className="card text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-[var(--foreground)] opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                Логи не найдены
              </h3>
              <p className="text-[var(--foreground)] opacity-70">
                Нет событий в выбранной категории
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
