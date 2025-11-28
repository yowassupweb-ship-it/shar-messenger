'use client'

import { useState, useEffect } from 'react'
import { showToast } from '@/components/Toast'
import { apiFetch } from '@/lib/api'

interface DataSource {
  id: string
  name: string
  url: string
  type: string
  enabled: boolean
  categories: Array<{url: string, name: string}>
  auth?: {username?: string, password?: string}
  autoSync: boolean
  syncInterval: number
  lastSync?: string
  lastSyncStatus?: 'success' | 'error'
  lastSyncError?: string
  itemsCount?: number
}

export default function DataSourcesPage() {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [parsing, setParsing] = useState<{[key: string]: boolean}>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    type: 'html',
    enabled: true,
    autoSync: false,
    syncInterval: 3600,
    categories: [] as Array<{url: string, name: string}>,
    auth: { username: '', password: '' }
  })

  useEffect(() => {
    loadDataSources()
  }, [])

  const loadDataSources = async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/api/data-sources')
      if (response.ok) {
        const data = await response.json()
        setDataSources(data)
      } else {
        showToast('Ошибка загрузки источников данных', 'error')
      }
    } catch (error) {
      console.error('Ошибка загрузки источников данных:', error)
      showToast('Ошибка подключения к серверу', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleParseSource = async (sourceId: string) => {
    try {
      setParsing(prev => ({...prev, [sourceId]: true}))
      showToast('Запуск парсинга...', 'info')
      
      const response = await fetch(`http://localhost:8000/api/data-sources/${sourceId}/parse`, {
        method: 'POST'
      })
      
      if (response.ok) {
        showToast('Парсинг запущен в фоновом режиме', 'success')
        // Обновляем список источников через несколько секунд
        setTimeout(loadDataSources, 3000)
      } else {
        showToast('Ошибка запуска парсинга', 'error')
      }
    } catch (error) {
      console.error('Ошибка парсинга:', error)
      showToast('Ошибка подключения к серверу', 'error')
    } finally {
      setParsing(prev => ({...prev, [sourceId]: false}))
    }
  }

  const handleAddSource = async () => {
    if (!newSource.name || !newSource.url) {
      showToast('Заполните название и URL', 'warning')
      return
    }

    try {
      const response = await fetch('http://localhost:8000/api/data-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSource)
      })

      if (response.ok) {
        showToast('Источник данных добавлен', 'success')
        setShowAddForm(false)
        setNewSource({
          name: '',
          url: '',
          type: 'html',
          enabled: true,
          autoSync: false,
          syncInterval: 3600,
          categories: [],
          auth: { username: '', password: '' }
        })
        loadDataSources()
      } else {
        showToast('Ошибка добавления источника', 'error')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      showToast('Ошибка подключения к серверу', 'error')
    }
  }

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Удалить этот источник данных?')) return

    try {
      const response = await fetch(`http://localhost:8000/api/data-sources/${sourceId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showToast('Источник данных удален', 'success')
        loadDataSources()
      } else {
        showToast('Ошибка удаления источника', 'error')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      showToast('Ошибка подключения к серверу', 'error')
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Никогда'
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU')
  }

  const getStatusColor = (status?: string) => {
    if (status === 'success') return 'text-green-500'
    if (status === 'error') return 'text-red-500'
    return 'text-gray-500'
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-2">
            Источники данных
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            Управление источниками для парсинга товаров
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-[var(--button)] text-white px-6 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors"
        >
          Добавить источник
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--button)]"></div>
          <p className="mt-4 text-[var(--foreground)] opacity-70">Загрузка источников...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dataSources.map((source) => (
            <div key={source.id} className="card hover:border-[var(--button)] transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[var(--foreground)] truncate">
                      {source.name}
                    </h3>
                    {source.type === 'magput' && (
                      <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-medium rounded flex-shrink-0">
                        API
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--foreground)] opacity-60 truncate">
                    {source.url}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                  source.enabled 
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-gray-500/10 text-gray-500'
                }`}>
                  {source.enabled ? 'Активен' : 'Отключен'}
                </span>
              </div>

              <div className="space-y-2 text-sm text-[var(--foreground)] opacity-70 mb-4">
                {source.lastSync && (
                  <>
                    <div className="flex justify-between">
                      <span>Последний парсинг:</span>
                      <span className="font-medium text-xs">
                        {formatDate(source.lastSync)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Статус:</span>
                      <span className={`font-medium ${getStatusColor(source.lastSyncStatus)}`}>
                        {source.lastSyncStatus === 'success' ? 'Успешно' : source.lastSyncStatus === 'error' ? 'Ошибка' : 'Неизвестно'}
                      </span>
                    </div>
                    {source.itemsCount !== undefined && (
                      <div className="flex justify-between">
                        <span>Товаров:</span>
                        <span className="font-medium">{source.itemsCount}</span>
                      </div>
                    )}
                  </>
                )}
                {source.lastSyncError && (
                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-500">
                    {source.lastSyncError}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleParseSource(source.id)}
                  disabled={parsing[source.id]}
                  className="flex-1 bg-[var(--button)] text-white py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {parsing[source.id] ? 'Парсинг...' : 'Запустить парсинг'}
                </button>
                <button
                  onClick={() => handleDeleteSource(source.id)}
                  className="px-3 py-2 border border-red-600/50 text-red-600 rounded-lg hover:bg-red-600/10 transition-colors"
                  title="Удалить"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {dataSources.length === 0 && (
            <div className="col-span-full card text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-[var(--foreground)] opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                Нет источников данных
              </h3>
              <p className="text-[var(--foreground)] opacity-70">
                Добавьте первый источник для парсинга товаров
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Source Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-[var(--border)]">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">
                Добавить источник данных
              </h2>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Название
                </label>
                <input
                  type="text"
                  value={newSource.name}
                  onChange={(e) => setNewSource({...newSource, name: e.target.value})}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                  placeholder="Название источника"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  URL
                </label>
                <input
                  type="url"
                  value={newSource.url}
                  onChange={(e) => setNewSource({...newSource, url: e.target.value})}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Имя пользователя (если требуется)
                </label>
                <input
                  type="text"
                  value={newSource.auth.username}
                  onChange={(e) => setNewSource({...newSource, auth: {...newSource.auth, username: e.target.value}})}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Пароль (если требуется)
                </label>
                <input
                  type="password"
                  value={newSource.auth.password}
                  onChange={(e) => setNewSource({...newSource, auth: {...newSource.auth, password: e.target.value}})}
                  className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddSource}
                  className="flex-1 bg-[var(--button)] text-white px-6 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors"
                >
                  Добавить
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 border border-[var(--border)] rounded-lg text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowAddForm(false)}
              className="absolute top-4 right-4 text-[var(--foreground)] opacity-50 hover:opacity-100 transition-opacity"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
