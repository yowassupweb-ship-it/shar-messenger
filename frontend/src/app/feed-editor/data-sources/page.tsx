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
  lastSync?: string
  lastSyncStatus?: string
  lastSyncError?: string
  itemsCount?: number
  syncInterval?: number
  autoSync?: boolean
  isParsing?: boolean
  auth?: {
    username?: string
    password?: string
  }
}

export default function DataSourcesPage() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSource, setEditingSource] = useState<DataSource | null>(null)
  const [isParsingAll, setIsParsingAll] = useState(false)
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    username: '',
    password: '',
    syncInterval: 3600,
    autoSync: false
  })

  // Форматирование интервала обновления
  const formatInterval = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const days = Math.floor(hours / 24)
    
    if (days > 0) {
      return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`
    } else if (hours > 0) {
      return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`
    } else {
      const minutes = Math.floor(seconds / 60)
      return `${minutes} ${minutes === 1 ? 'минута' : minutes < 5 ? 'минуты' : 'минут'}`
    }
  }

  useEffect(() => {
    loadSources()
  }, [])

  const loadSources = async () => {
    try {
      const response = await apiFetch('/api/data-sources')
      const data = await response.json()
      setSources(data)
    } catch (error) {
      console.error('Ошибка загрузки источников:', error)
      showToast('Ошибка загрузки источников', 'error')
    }
  }

  const handleAddSource = async () => {
    if (!newSource.name || !newSource.url) {
      showToast('Заполните название и URL', 'warning')
      return
    }

    try {
      const payload: any = {
        name: newSource.name,
        url: newSource.url,
        type: 'html',
        enabled: true,
        autoSync: newSource.autoSync,
        syncInterval: newSource.syncInterval
      }

      // Добавляем auth только если есть username
      if (newSource.username) {
        payload.auth = {
          username: newSource.username,
          password: newSource.password
        }
      }

      console.log('Отправка данных:', payload)

      const response = await fetch('http://localhost:8000/api/data-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      console.log('Ответ сервера:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Источник создан:', data)
        showToast('Источник успешно добавлен', 'success')
        setShowAddModal(false)
        setNewSource({ name: '', url: '', username: '', password: '', syncInterval: 3600, autoSync: false })
        loadSources()
      } else {
        const error = await response.json()
        console.error('Ошибка от сервера:', error)
        showToast(`Ошибка: ${error.detail || 'Не удалось добавить источник'}`, 'error')
      }
    } catch (error) {
      console.error('Ошибка добавления источника:', error)
      showToast(`Ошибка подключения к серверу: ${error}`, 'error')
    }
  }

  const handleUpdateSource = async () => {
    if (!editingSource) return
    
    try {
      const updateData: any = {
        name: editingSource.name,
        url: editingSource.url,
        autoSync: editingSource.autoSync,
        syncInterval: editingSource.syncInterval
      }

      // Добавляем auth только если есть username
      if (editingSource.auth?.username) {
        updateData.auth = editingSource.auth
      }

      const response = await fetch(`http://localhost:8000/api/data-sources/${editingSource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      
      if (response.ok) {
        showToast('Источник обновлен', 'success')
        setEditingSource(null)
        loadSources()
      } else {
        showToast('Ошибка обновления источника', 'error')
      }
    } catch (error) {
      console.error('Ошибка обновления источника:', error)
      showToast('Ошибка обновления источника', 'error')
    }
  }

  const handleParse = async (sourceId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/data-sources/${sourceId}/parse`, {
        method: 'POST'
      })
      
      if (response.ok) {
        showToast('Парсинг запущен', 'info')
        // Обновляем источники чтобы получить isParsing = true
        loadSources()
        
        // Периодически обновляем источники пока парсинг не завершится
        const checkInterval = setInterval(async () => {
          await loadSources()
          const source = sources.find(s => s.id === sourceId)
          if (source && !source.isParsing) {
            clearInterval(checkInterval)
            if (source.lastSyncStatus === 'success') {
              showToast('Парсинг завершен успешно', 'success')
            } else if (source.lastSyncStatus === 'error') {
              showToast('Ошибка парсинга', 'error')
            } else if (source.lastSyncStatus === 'stopped') {
              showToast('Парсинг остановлен', 'info')
            }
          }
        }, 2000) // Проверяем каждые 2 секунды
        
        // Останавливаем проверку через 5 минут в любом случае
        setTimeout(() => clearInterval(checkInterval), 300000)
      } else {
        showToast('Ошибка запуска парсинга', 'error')
      }
    } catch (error) {
      console.error('Ошибка парсинга:', error)
      showToast('Ошибка парсинга', 'error')
    }
  }

  const handleStopParse = async (sourceId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/data-sources/${sourceId}/stop-parse`, {
        method: 'POST'
      })
      
      if (response.ok) {
        showToast('Остановка парсинга...', 'info')
        // Обновляем источники
        setTimeout(() => loadSources(), 1000)
      } else {
        showToast('Ошибка остановки парсинга', 'error')
      }
    } catch (error) {
      console.error('Ошибка остановки парсинга:', error)
      showToast('Ошибка остановки парсинга', 'error')
    }
  }

  const handleParseAll = async () => {
    setIsParsingAll(true)
    for (const source of sources.filter(s => s.enabled)) {
      await handleParse(source.id)
    }
    setIsParsingAll(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-2">
            Источники данных
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            Управление источниками для парсинга товаров
          </p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={handleParseAll}
            disabled={isParsingAll || sources.length === 0}
            className="bg-[var(--button)] text-white px-6 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Обновить все источники"
          >
            <svg className={`w-5 h-5 ${isParsingAll ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Обновить все
          </button>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-[var(--button)] text-white px-6 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить источник
          </button>
        </div>
      </div>

      {/* Sources List */}
      <div className="grid grid-cols-1 gap-6">
        {sources.map((source) => (
          <div key={source.id} className="card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-[var(--foreground)]">
                    {source.name}
                  </h3>
                  
                  {source.lastSyncStatus === 'success' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium text-green-600 bg-green-100">
                      Синхронизирован
                    </span>
                  )}
                  {source.lastSyncStatus === 'error' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium text-red-600 bg-red-100">
                      Ошибка
                    </span>
                  )}
                  
                  {source.itemsCount !== undefined && (
                    <span className="text-sm text-[var(--foreground)] opacity-60">
                      • {source.itemsCount} товаров
                    </span>
                  )}
                  
                  {source.autoSync && source.syncInterval && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400">
                      ↻ {formatInterval(source.syncInterval)}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-[var(--foreground)] opacity-60 mb-1">
                  {source.url}
                </p>
                {source.lastSync && (
                  <p className="text-xs text-[var(--foreground)] opacity-50">
                    Последнее обновление: {new Date(source.lastSync).toLocaleString('ru-RU')}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {source.lastSyncStatus === 'error' && source.lastSyncError && (
                  <button
                    onClick={() => showToast(source.lastSyncError || 'Неизвестная ошибка', 'error')}
                    className="text-red-500 opacity-70 hover:opacity-100 transition-opacity"
                    title={source.lastSyncError}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}
                
                <button
                  onClick={() => setEditingSource(source)}
                  className="text-[var(--foreground)] opacity-70 hover:opacity-100 transition-opacity"
                  title="Настройки"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                <button
                  onClick={async () => {
                    if (confirm(`Удалить источник "${source.name}" и все его товары?`)) {
                      try {
                        const response = await fetch(`http://localhost:8000/api/data-sources/${source.id}`, {
                          method: 'DELETE'
                        })
                        if (response.ok) {
                          showToast('Источник и товары удалены', 'success')
                          loadSources()
                        } else {
                          showToast('Ошибка удаления', 'error')
                        }
                      } catch (error) {
                        console.error('Ошибка:', error)
                        showToast('Ошибка удаления', 'error')
                      }
                    }
                  }}
                  className="text-red-500 opacity-70 hover:opacity-100 transition-opacity"
                  title="Удалить источник и товары"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                
                <button
                  onClick={() => source.isParsing ? handleStopParse(source.id) : handleParse(source.id)}
                  className="bg-[var(--button)] text-white px-4 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors flex items-center gap-2"
                >
                  {source.isParsing ? (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" />
                      </svg>
                      Остановить
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Запустить парсинг
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Progress Bar */}
            {source.isParsing && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--foreground)] opacity-70">Парсинг в процессе...</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-[var(--button)] rounded-full animate-pulse" style={{width: '100%'}}></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">
              Добавить источник данных
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Название
                </label>
                <input
                  type="text"
                  value={newSource.name}
                  onChange={(e) => setNewSource({...newSource, name: e.target.value})}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                  placeholder="Основной каталог"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  URL
                </label>
                <input
                  type="text"
                  value={newSource.url}
                  onChange={(e) => setNewSource({...newSource, url: e.target.value})}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                  placeholder="https://vssite.kroky.ru"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Логин (опционально)
                </label>
                <input
                  type="text"
                  value={newSource.username}
                  onChange={(e) => setNewSource({...newSource, username: e.target.value})}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Пароль (опционально)
                </label>
                <input
                  type="password"
                  value={newSource.password}
                  onChange={(e) => setNewSource({...newSource, password: e.target.value})}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoSync"
                  checked={newSource.autoSync}
                  onChange={(e) => setNewSource({...newSource, autoSync: e.target.checked})}
                  className="w-4 h-4 text-[var(--button)] focus:ring-[var(--button)]"
                />
                <label htmlFor="autoSync" className="text-sm text-[var(--foreground)]">
                  Включить автообновление
                </label>
              </div>

              {newSource.autoSync && (
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Интервал обновления
                  </label>
                  <select
                    value={newSource.syncInterval}
                    onChange={(e) => setNewSource({...newSource, syncInterval: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)] text-[var(--foreground)]"
                  >
                    <option value="3600">1 раз в час</option>
                    <option value="21600">1 раз в 6 часов</option>
                    <option value="86400">1 раз в день</option>
                    <option value="604800">1 раз в неделю</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddSource}
                className="flex-1 bg-[var(--button)] text-white px-4 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors"
              >
                Добавить
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 border border-[var(--border)] px-4 py-2 rounded-lg hover:bg-[var(--background)] transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {editingSource && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">
              Настройки: {editingSource.name}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Название
                </label>
                <input
                  type="text"
                  value={editingSource.name}
                  onChange={(e) => setEditingSource({...editingSource, name: e.target.value})}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)] text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  URL
                </label>
                <input
                  type="text"
                  value={editingSource.url}
                  onChange={(e) => setEditingSource({...editingSource, url: e.target.value})}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)] text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Логин (опционально)
                </label>
                <input
                  type="text"
                  value={editingSource.auth?.username || ''}
                  onChange={(e) => setEditingSource({
                    ...editingSource, 
                    auth: { ...editingSource.auth, username: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)] text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Пароль (опционально)
                </label>
                <input
                  type="password"
                  value={editingSource.auth?.password || ''}
                  onChange={(e) => setEditingSource({
                    ...editingSource,
                    auth: { ...editingSource.auth, password: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)] text-[var(--foreground)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editAutoSync"
                  checked={editingSource.autoSync || false}
                  onChange={(e) => setEditingSource({...editingSource, autoSync: e.target.checked})}
                  className="w-4 h-4 text-[var(--button)] focus:ring-[var(--button)]"
                />
                <label htmlFor="editAutoSync" className="text-sm text-[var(--foreground)]">
                  Включить автообновление
                </label>
              </div>

              {editingSource.autoSync && (
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Интервал обновления
                  </label>
                  <select
                    value={editingSource.syncInterval || 3600}
                    onChange={(e) => setEditingSource({...editingSource, syncInterval: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)] text-[var(--foreground)]"
                  >
                    <option value="3600">1 раз в час</option>
                    <option value="21600">1 раз в 6 часов</option>
                    <option value="86400">1 раз в день</option>
                    <option value="604800">1 раз в неделю</option>
                  </select>
                </div>
              )}

              <div className="pt-4 border-t border-[var(--border)]">
                <p className="text-sm text-[var(--foreground)] opacity-70">
                  При автообновлении товары, которые пропали из источника, будут автоматически скрыты из фида. Новые товары получат отметку "Новое".
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateSource}
                className="flex-1 bg-[var(--button)] text-white px-4 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors"
              >
                Сохранить
              </button>
              <button
                onClick={() => setEditingSource(null)}
                className="flex-1 border border-[var(--border)] px-4 py-2 rounded-lg hover:bg-[var(--background)] transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
