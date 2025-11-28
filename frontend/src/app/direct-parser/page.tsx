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
  sitelinks?: Array<{ text: string; url: string }>
  session_id?: string
}

interface DirectSearch {
  id: string
  query: string
  pages_parsed: number
  ads_found: number
  timestamp: string
  status: string
}

interface DomainInfo {
  domain: string
  count: number
  queries: string[]
  titles: string[]
}

interface Stats {
  total_ads: number
  total_searches: number
  unique_domains: number
  domains_list: string[]
  top_queries: [string, number][]
  last_update: string | null
}

interface ParsingTask {
  id: string
  queries: string[]
  query?: string
  max_pages: number
  headless: boolean
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed'
  message: string
  progress: number
  priority?: number
  agent_id?: string
  error?: string
  created_at: string
  completed_at?: string
  results?: DirectAd[]
}

type Tab = 'ads' | 'domains' | 'history' | 'stats' | 'tasks'

export default function DirectParserPage() {
  const [activeTab, setActiveTab] = useState<Tab>('tasks')
  const [isLoading, setIsLoading] = useState(true)
  
  // Данные
  const [ads, setAds] = useState<DirectAd[]>([])
  const [totalAds, setTotalAds] = useState(0)
  const [domains, setDomains] = useState<DomainInfo[]>([])
  const [searches, setSearches] = useState<DirectSearch[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [tasks, setTasks] = useState<ParsingTask[]>([])
  
  // Форма создания задачи
  const [newTaskQueries, setNewTaskQueries] = useState('')
  const [newTaskMaxPages, setNewTaskMaxPages] = useState(2)
  const [newTaskHeadless, setNewTaskHeadless] = useState(false)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  
  // Фильтры
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [page, setPage] = useState(0)
  const limit = 50

  // Загрузка данных
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

  const loadDomains = useCallback(async () => {
    try {
      const response = await apiFetch('/api/direct-parser/domains')
      if (response.ok) {
        const data = await response.json()
        setDomains(data.domains || [])
      }
    } catch (error) {
      console.error('Ошибка загрузки доменов:', error)
    }
  }, [])

  const loadSearches = useCallback(async () => {
    try {
      const response = await apiFetch('/api/direct-parser/searches')
      if (response.ok) {
        const data = await response.json()
        setSearches(data.searches || [])
      }
    } catch (error) {
      console.error('Ошибка загрузки истории:', error)
    }
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const response = await apiFetch('/api/direct-parser/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error)
    }
  }, [])

  const loadTasks = useCallback(async () => {
    try {
      const response = await apiFetch('/api/direct-parser/tasks')
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Ошибка загрузки задач:', error)
    }
  }, [])

  // Создание задачи
  const createTask = async () => {
    const queries = newTaskQueries
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0)
    
    if (queries.length === 0) {
      showToast('Введите хотя бы один запрос', 'error')
      return
    }

    setIsCreatingTask(true)
    try {
      const response = await apiFetch('/api/direct-parser/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries,
          max_pages: newTaskMaxPages,
          headless: newTaskHeadless
        })
      })
      
      if (response.ok) {
        showToast('Задача создана! Запустите агент на локальном компьютере.', 'success')
        setNewTaskQueries('')
        loadTasks()
      } else {
        showToast('Ошибка создания задачи', 'error')
      }
    } catch (error) {
      showToast('Ошибка создания задачи', 'error')
    } finally {
      setIsCreatingTask(false)
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Удалить эту задачу?')) return
    try {
      await apiFetch(`/api/direct-parser/tasks/${taskId}`, { method: 'DELETE' })
      showToast('Задача удалена', 'success')
      loadTasks()
    } catch (error) {
      showToast('Ошибка удаления', 'error')
    }
  }

  useEffect(() => {
    loadAds()
    loadStats()
    loadTasks()
  }, [loadAds, loadStats, loadTasks])

  useEffect(() => {
    if (activeTab === 'domains') loadDomains()
    if (activeTab === 'history') loadSearches()
    if (activeTab === 'stats') loadStats()
  }, [activeTab, loadDomains, loadSearches, loadStats])

  // Обработчики
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
        loadStats()
      }
    } catch (error) {
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
        loadStats()
        loadDomains()
      }
    } catch (error) {
      showToast('Ошибка очистки', 'error')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast('Скопировано', 'success')
    } catch {
      showToast('Ошибка копирования', 'error')
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
    <div>
      {/* Заголовок */}
      <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] mb-1">
              Парсер Я.Директ
            </h1>
            <p className="text-sm opacity-70">
              Анализ и извлечение данных из рекламы конкурентов
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => { loadAds(); loadStats(); }}
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

        {/* Статистика карточки */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card !p-4">
            <div className="text-2xl font-bold text-[var(--button)]">{stats?.total_ads || 0}</div>
            <div className="text-xs opacity-70">Объявлений</div>
          </div>
          <div className="card !p-4">
            <div className="text-2xl font-bold text-[var(--button)]">{stats?.unique_domains || 0}</div>
            <div className="text-xs opacity-70">Доменов</div>
          </div>
          <div className="card !p-4">
            <div className="text-2xl font-bold text-[var(--button)]">{stats?.total_searches || 0}</div>
            <div className="text-xs opacity-70">Запросов</div>
          </div>
          <div className="card !p-4">
            <div className="text-xs opacity-70 mb-1">Последнее обновление</div>
            <div className="text-sm font-medium">
              {stats?.last_update ? formatDate(stats.last_update) : '—'}
            </div>
          </div>
        </div>

        {/* Табы */}
        <div className="flex gap-1 mb-4 bg-[var(--card)] p-1 rounded-lg w-fit">
          {[
            { id: 'tasks', label: '🎯 Задачи', count: tasks.filter(t => t.status !== 'completed').length || undefined },
            { id: 'ads', label: 'Объявления', count: totalAds },
            { id: 'domains', label: 'Домены', count: stats?.unique_domains },
            { id: 'history', label: 'История' },
            { id: 'stats', label: 'Аналитика' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-[var(--button)] text-white'
                  : 'hover:bg-[var(--hover)]'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 opacity-70">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Контент табов */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {/* Форма создания задачи */}
            <div className="card !p-4">
              <h3 className="font-medium mb-3">Создать задачу на парсинг</h3>
              <div className="space-y-3">
                <textarea
                  value={newTaskQueries}
                  onChange={(e) => setNewTaskQueries(e.target.value)}
                  placeholder="Поисковые запросы (по одному на строку):&#10;туры в Карелию&#10;отдых на Байкале&#10;экскурсии в Санкт-Петербург"
                  className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)] text-sm min-h-[100px] resize-y"
                />
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <span className="opacity-70">Страниц:</span>
                    <input
                      type="number"
                      value={newTaskMaxPages}
                      onChange={(e) => setNewTaskMaxPages(parseInt(e.target.value) || 1)}
                      min="1"
                      max="10"
                      className="w-16 px-2 py-1 bg-[var(--background)] border border-[var(--border)] rounded text-center"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTaskHeadless}
                      onChange={(e) => setNewTaskHeadless(e.target.checked)}
                      className="w-4 h-4 accent-[var(--button)]"
                    />
                    <span className="opacity-70">Фоновый режим (без окна браузера)</span>
                  </label>
                  <button
                    onClick={createTask}
                    disabled={isCreatingTask || !newTaskQueries.trim()}
                    className="ml-auto px-4 py-2 bg-[var(--button)] text-white rounded-lg hover:bg-[var(--button)]/90 transition-colors text-sm disabled:opacity-50"
                  >
                    {isCreatingTask ? 'Создание...' : 'Создать задачу'}
                  </button>
                </div>
              </div>
            </div>

            {/* Действия */}
            <div className="flex gap-2">
              <button
                onClick={loadTasks}
                className="px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:bg-[var(--card-hover)] transition-colors text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Обновить
              </button>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Ожидает', count: tasks.filter(t => t.status === 'pending').length, color: 'text-yellow-500' },
                { label: 'В работе', count: tasks.filter(t => t.status === 'running' || t.status === 'assigned').length, color: 'text-blue-500' },
                { label: 'Завершено', count: tasks.filter(t => t.status === 'completed').length, color: 'text-green-500' },
                { label: 'Ошибки', count: tasks.filter(t => t.status === 'failed').length, color: 'text-red-500' },
              ].map((stat) => (
                <div key={stat.label} className="card !p-3 text-center">
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
                  <div className="text-xs opacity-70">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Список задач */}
            {tasks.length === 0 ? (
              <div className="text-center py-12 opacity-50">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>Нет задач в очереди</p>
                <p className="text-sm mt-1">Создайте задачу выше или запустите локальный агент</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="card !p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        task.status === 'pending' ? 'bg-yellow-500' :
                        task.status === 'running' || task.status === 'assigned' ? 'bg-blue-500 animate-pulse' :
                        task.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">
                          {task.query || task.queries?.join(', ') || 'Задача'}
                        </div>
                        <div className="text-xs opacity-50 flex flex-wrap gap-2">
                          <span>{new Date(task.created_at).toLocaleString('ru-RU')}</span>
                          <span>📄 {task.max_pages} стр.</span>
                          {task.priority && task.priority > 0 && (
                            <span className="text-orange-500">⚡ Приоритет: {task.priority}</span>
                          )}
                          {task.agent_id && (
                            <span className="text-blue-500">🤖 {task.agent_id}</span>
                          )}
                          {task.progress > 0 && task.progress < 100 && (
                            <span className="text-blue-400">⏳ {task.progress}%</span>
                          )}
                          {task.results && task.results.length > 0 && (
                            <span className="text-green-500">✓ {task.results.length} объявлений</span>
                          )}
                          {task.error && (
                            <span className="text-red-500">✗ {task.error}</span>
                          )}
                          {task.message && (
                            <span className="opacity-70">{task.message}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {(task.status === 'pending' || task.status === 'failed') && (
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="px-2 py-1 text-xs bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Инструкция */}
            <div className="card !p-4 bg-blue-500/5 border-blue-500/20">
              <h4 className="font-medium text-blue-400 mb-2">💡 Как работает очередь задач</h4>
              <ol className="text-sm opacity-70 space-y-1 list-decimal list-inside">
                <li>Создайте задачу с поисковыми запросами выше</li>
                <li>Запустите локальный агент: <code className="px-1 py-0.5 bg-[var(--background)] rounded text-xs">python direct_agent.py</code></li>
                <li>Агент автоматически возьмёт задачу и выполнит парсинг</li>
                <li>При капче - решите её вручную в открывшемся браузере</li>
                <li>Результаты появятся на вкладке "Объявления"</li>
              </ol>
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <p className="text-xs opacity-50">
                  Агент находится в папке <code className="px-1 py-0.5 bg-[var(--background)] rounded">direct-parser/</code>. 
                  Перед запуском установите зависимости: <code className="px-1 py-0.5 bg-[var(--background)] rounded">pip install -r requirements.txt</code>
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ads' && (
          <div>
            {/* Поиск */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по запросу..."
                  className="flex-1 px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)] text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--button)] text-white rounded-lg hover:bg-[var(--button)]/90 transition-colors text-sm"
                >
                  Найти
                </button>
              </div>
            </form>

            {/* Таблица объявлений */}
            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--button)] border-t-transparent"></div>
              </div>
            ) : ads.length === 0 ? (
              <div className="text-center py-20 opacity-50">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Нет объявлений</p>
                <p className="text-sm mt-1">Запустите локальный парсер для сбора данных</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {ads.map((ad) => (
                    <div key={ad.id} className="card !p-4 hover:border-[var(--button)]/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Заголовок */}
                          <a 
                            href={ad.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[var(--button)] font-medium hover:underline block truncate"
                          >
                            {ad.title || 'Без заголовка'}
                          </a>
                          
                          {/* URL */}
                          <div className="text-xs text-green-600 truncate mt-0.5">
                            {ad.display_url || ad.url}
                          </div>
                          
                          {/* Описание */}
                          {ad.description && (
                            <p className="text-sm opacity-70 mt-2 line-clamp-2">{ad.description}</p>
                          )}
                          
                          {/* Мета */}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className="text-xs px-2 py-0.5 bg-[var(--button)]/10 text-[var(--button)] rounded">
                              {ad.query}
                            </span>
                            <span className="text-xs opacity-50">{ad.type}</span>
                            {ad.is_premium && (
                              <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded">
                                Премиум
                              </span>
                            )}
                            <span className="text-xs opacity-40">{formatDate(ad.timestamp)}</span>
                          </div>
                        </div>
                        
                        {/* Действия */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => copyToClipboard(ad.url)}
                            className="p-1.5 hover:bg-[var(--hover)] rounded transition-colors"
                            title="Копировать URL"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteAd(ad.id)}
                            className="p-1.5 hover:bg-red-500/10 text-red-500 rounded transition-colors"
                            title="Удалить"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Пагинация */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg disabled:opacity-30"
                    >
                      ←
                    </button>
                    <span className="px-3 py-1.5 text-sm">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg disabled:opacity-30"
                    >
                      →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'domains' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {domains.length === 0 ? (
              <div className="col-span-full text-center py-20 opacity-50">
                Нет данных о доменах
              </div>
            ) : (
              domains.map((domain) => (
                <div key={domain.domain} className="card !p-4">
                  <div className="flex items-start justify-between mb-2">
                    <a 
                      href={`https://${domain.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[var(--button)] hover:underline truncate"
                    >
                      {domain.domain}
                    </a>
                    <span className="text-sm font-bold bg-[var(--button)]/10 text-[var(--button)] px-2 py-0.5 rounded">
                      {domain.count}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-2">
                    {domain.queries.slice(0, 3).map((q, i) => (
                      <span key={i} className="text-xs px-1.5 py-0.5 bg-[var(--background)] rounded">
                        {q}
                      </span>
                    ))}
                    {domain.queries.length > 3 && (
                      <span className="text-xs opacity-50">+{domain.queries.length - 3}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            {searches.length === 0 ? (
              <div className="text-center py-20 opacity-50">
                История запросов пуста
              </div>
            ) : (
              searches.map((search) => (
                <div key={search.id} className="card !p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{search.query}</div>
                    <div className="text-xs opacity-60 mt-1">
                      {search.pages_parsed} стр. • {search.ads_found} объявлений • {formatDate(search.timestamp)}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    search.status === 'completed' 
                      ? 'bg-green-500/20 text-green-500' 
                      : 'bg-yellow-500/20 text-yellow-500'
                  }`}>
                    {search.status === 'completed' ? 'Завершен' : search.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Топ запросов */}
            <div className="card !p-4">
              <h3 className="font-medium mb-4">Топ запросов</h3>
              {stats.top_queries.length === 0 ? (
                <p className="text-sm opacity-50">Нет данных</p>
              ) : (
                <div className="space-y-2">
                  {stats.top_queries.map(([query, count], i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm truncate">{query}</span>
                      <span className="text-sm font-medium text-[var(--button)]">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Топ доменов */}
            <div className="card !p-4">
              <h3 className="font-medium mb-4">Топ доменов</h3>
              {stats.domains_list.length === 0 ? (
                <p className="text-sm opacity-50">Нет данных</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {stats.domains_list.slice(0, 20).map((domain, i) => (
                    <a
                      key={i}
                      href={`https://${domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 bg-[var(--background)] border border-[var(--border)] rounded hover:border-[var(--button)] transition-colors"
                    >
                      {domain}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Инструкция */}
            <div className="card !p-4 lg:col-span-2 bg-[var(--button)]/5 border-[var(--button)]/20">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <span>📡</span> Как использовать
              </h3>
              <div className="text-sm space-y-2 opacity-80">
                <p>1. Запустите локальный парсер на вашем компьютере:</p>
                <code className="block bg-[var(--background)] p-2 rounded text-xs font-mono">
                  cd direct-parser && python app.py
                </code>
                <p>2. Откройте http://127.0.0.1:5000 и введите поисковые запросы</p>
                <p>3. После парсинга нажмите "Отправить на сервер" — данные появятся здесь</p>
                <p className="text-xs opacity-60 mt-3">
                  Примечание: Локальный парсер использует Selenium и требует Chrome/Chromium
                </p>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
