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

type Section = 'tasks' | 'ads' | 'instruction' | 'api-keys'

export default function DirectParserPage() {
  const [activeSection, setActiveSection] = useState<Section>('tasks')
  const [isLoading, setIsLoading] = useState(true)
  
  // Данные
  const [ads, setAds] = useState<DirectAd[]>([])
  const [totalAds, setTotalAds] = useState(0)
  const [domains, setDomains] = useState<DomainInfo[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [tasks, setTasks] = useState<ParsingTask[]>([])
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [apiKeyCreated, setApiKeyCreated] = useState<string | null>(null)
  
  // Форма создания задачи
  const [newTaskQueries, setNewTaskQueries] = useState('')
  const [newTaskMaxPages, setNewTaskMaxPages] = useState(2)
  const [newTaskHeadless, setNewTaskHeadless] = useState(false)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  
  // Фильтры
  const [searchQuery, setSearchQuery] = useState('')
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

  const loadApiKey = useCallback(async () => {
    try {
      const response = await apiFetch('/api/direct-parser/api-key')
      if (response.ok) {
        const data = await response.json()
        setApiKey(data.api_key)
        setApiKeyCreated(data.created)
      }
    } catch (error) {
      console.error('Ошибка загрузки API ключа:', error)
    }
  }, [])

  const generateApiKey = async () => {
    try {
      const response = await apiFetch('/api/direct-parser/api-key/generate', { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        setApiKey(data.api_key)
        setApiKeyCreated(new Date().toISOString())
        showToast('API ключ сгенерирован', 'success')
      }
    } catch (error) {
      showToast('Ошибка генерации ключа', 'error')
    }
  }

  const revokeApiKey = async () => {
    if (!confirm('Отозвать API ключ? Все подключённые агенты перестанут работать.')) return
    try {
      await apiFetch('/api/direct-parser/api-key', { method: 'DELETE' })
      setApiKey(null)
      setApiKeyCreated(null)
      showToast('API ключ отозван', 'success')
    } catch (error) {
      showToast('Ошибка отзыва ключа', 'error')
    }
  }

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
    loadApiKey()
  }, [loadAds, loadStats, loadTasks, loadApiKey])

  useEffect(() => {
    if (activeSection === 'ads') {
      loadAds()
      loadDomains()
    }
    if (activeSection === 'api-keys') loadApiKey()
  }, [activeSection, loadAds, loadDomains, loadApiKey])

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

  const menuItems = [
    { id: 'tasks', label: 'Задачи', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ), badge: tasks.filter(t => t.status !== 'completed').length || undefined },
    { id: 'ads', label: 'Объявления', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ), badge: totalAds || undefined },
    { id: 'instruction', label: 'Инструкция', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ) },
    { id: 'api-keys', label: 'API ключи', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ) },
  ]

  return (
    <div className="flex min-h-screen">
      {/* Боковое меню */}
      <div className="w-64 bg-[var(--card)] border-r border-[var(--border)] p-4 flex-shrink-0">
        <h2 className="text-lg font-bold mb-4 px-3">Парсер Директа</h2>
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as Section)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                activeSection === item.id
                  ? 'bg-[var(--button)] text-white'
                  : 'hover:bg-[var(--hover)] text-[var(--foreground)]'
              }`}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  activeSection === item.id ? 'bg-white/20' : 'bg-[var(--button)]/20 text-[var(--button)]'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Статистика внизу */}
        <div className="mt-8 p-3 bg-[var(--background)] rounded-lg">
          <div className="text-xs opacity-60 mb-2">Статистика</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="font-bold text-[var(--button)]">{stats?.total_ads || 0}</div>
              <div className="text-xs opacity-60">Объявлений</div>
            </div>
            <div>
              <div className="font-bold text-[var(--button)]">{stats?.unique_domains || 0}</div>
              <div className="text-xs opacity-60">Доменов</div>
            </div>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="flex-1 p-6">
        {/* Задачи */}
        {activeSection === 'tasks' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Задачи на парсинг</h1>
              <button
                onClick={loadTasks}
                className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-[var(--button)] transition-colors flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Обновить
              </button>
            </div>

            {/* Создание задачи */}
            <div className="card !p-6">
              <h3 className="font-medium mb-4">Создать задачу</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm opacity-70 mb-2">Запросы (каждый с новой строки)</label>
                  <textarea
                    value={newTaskQueries}
                    onChange={(e) => setNewTaskQueries(e.target.value)}
                    placeholder="туры в турцию&#10;горящие путевки&#10;отдых на море"
                    className="w-full h-32 px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:border-[var(--button)] focus:outline-none resize-none"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm opacity-70 mb-2">Страниц на запрос</label>
                    <select
                      value={newTaskMaxPages}
                      onChange={(e) => setNewTaskMaxPages(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
                    >
                      {[1, 2, 3, 5, 10].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="headless"
                      checked={newTaskHeadless}
                      onChange={(e) => setNewTaskHeadless(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="headless" className="text-sm">Скрытый режим</label>
                  </div>
                  <button
                    onClick={createTask}
                    disabled={isCreatingTask || !newTaskQueries.trim()}
                    className="w-full px-4 py-2.5 bg-[var(--button)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
                  >
                    {isCreatingTask ? 'Создание...' : 'Создать задачу'}
                  </button>
                </div>
              </div>
            </div>

            {/* Список задач */}
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="card !p-12 text-center opacity-50">
                  Нет активных задач. Создайте задачу выше.
                </div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="card !p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`w-2 h-2 rounded-full ${
                            task.status === 'completed' ? 'bg-green-500' :
                            task.status === 'running' ? 'bg-blue-500 animate-pulse' :
                            task.status === 'failed' ? 'bg-red-500' :
                            task.status === 'assigned' ? 'bg-yellow-500' :
                            'bg-gray-500'
                          }`} />
                          <span className="font-medium">
                            {task.queries?.length || 1} {(task.queries?.length || 1) === 1 ? 'запрос' : 'запросов'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            task.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                            task.status === 'running' ? 'bg-blue-500/20 text-blue-500' :
                            task.status === 'failed' ? 'bg-red-500/20 text-red-500' :
                            task.status === 'assigned' ? 'bg-yellow-500/20 text-yellow-500' :
                            'bg-gray-500/20 text-gray-500'
                          }`}>
                            {task.status === 'completed' ? 'Завершена' :
                             task.status === 'running' ? 'Выполняется' :
                             task.status === 'failed' ? 'Ошибка' :
                             task.status === 'assigned' ? 'Назначена' :
                             'Ожидает'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(task.queries || [task.query]).filter(Boolean).slice(0, 5).map((q, i) => (
                            <span key={i} className="text-xs px-2 py-1 bg-[var(--background)] rounded">
                              {q}
                            </span>
                          ))}
                          {(task.queries?.length || 0) > 5 && (
                            <span className="text-xs px-2 py-1 opacity-50">
                              +{task.queries!.length - 5}
                            </span>
                          )}
                        </div>
                        <div className="text-xs opacity-50">
                          {formatDate(task.created_at)} • {task.max_pages} стр. • {task.headless ? 'Скрытый' : 'Видимый'}
                        </div>
                        {task.status === 'running' && task.progress > 0 && (
                          <div className="mt-2 h-1 bg-[var(--border)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--button)] transition-all"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        )}
                        {task.error && (
                          <div className="mt-2 text-xs text-red-400">{task.error}</div>
                        )}
                      </div>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Объявления */}
        {activeSection === 'ads' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Объявления</h1>
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
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--button)]"></div>
              </div>
            ) : ads.length === 0 ? (
              <div className="card !p-12 text-center opacity-50">
                {searchQuery ? 'Ничего не найдено' : 'Объявлений пока нет. Создайте задачу и запустите парсер.'}
              </div>
            ) : (
              <div className="space-y-3">
                {ads.map((ad) => (
                  <div key={ad.id} className="card !p-4">
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
                          <span>{ad.query}</span>
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
        )}

        {/* Инструкция */}
        {activeSection === 'instruction' && (
          <div className="space-y-6 max-w-3xl">
            <h1 className="text-2xl font-bold">Инструкция по установке</h1>

            {/* Скачивание */}
            <div className="card !p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-[var(--button)] text-white rounded-full flex items-center justify-center text-sm">1</span>
                Скачайте файлы парсера
              </h3>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/api/direct-parser/download/agent"
                  className="px-4 py-2.5 bg-[var(--button)] text-white rounded-lg hover:opacity-90 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  direct_agent.py
                </a>
                <a
                  href="/api/direct-parser/download/parser"
                  className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-[var(--button)] flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  ad_parser.py
                </a>
                <a
                  href="/api/direct-parser/download/requirements"
                  className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-[var(--button)] flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  requirements.txt
                </a>
              </div>
            </div>

            {/* Установка зависимостей */}
            <div className="card !p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-[var(--button)] text-white rounded-full flex items-center justify-center text-sm">2</span>
                Установите зависимости
              </h3>
              <div className="bg-[var(--background)] p-4 rounded-lg">
                <code className="text-sm font-mono">pip install -r requirements.txt</code>
              </div>
              <p className="text-sm opacity-60 mt-3">
                Убедитесь, что у вас установлен Python 3.8+ и Google Chrome
              </p>
            </div>

            {/* Получение API ключа */}
            <div className="card !p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-[var(--button)] text-white rounded-full flex items-center justify-center text-sm">3</span>
                Получите API ключ
              </h3>
              <p className="text-sm opacity-70 mb-4">
                Перейдите в раздел "API ключи" и сгенерируйте ключ для подключения парсера.
              </p>
              <button
                onClick={() => setActiveSection('api-keys')}
                className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-[var(--button)]"
              >
                Перейти к API ключам →
              </button>
            </div>

            {/* Запуск */}
            <div className="card !p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-[var(--button)] text-white rounded-full flex items-center justify-center text-sm">4</span>
                Запустите агент
              </h3>
              <div className="bg-[var(--background)] p-4 rounded-lg mb-4">
                <code className="text-sm font-mono break-all">
                  python direct_agent.py --api-url {typeof window !== 'undefined' ? window.location.origin : 'https://tools.connecting-server.ru'} --api-key ВАШ_API_КЛЮЧ
                </code>
              </div>
              <p className="text-sm opacity-60">
                Агент подключится к серверу и будет ожидать задачи на парсинг.
              </p>
            </div>

            {/* Использование */}
            <div className="card !p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-[var(--button)] text-white rounded-full flex items-center justify-center text-sm">5</span>
                Создайте задачу
              </h3>
              <p className="text-sm opacity-70 mb-4">
                В разделе "Задачи" создайте задачу с запросами для парсинга. Агент автоматически выполнит её.
              </p>
              <button
                onClick={() => setActiveSection('tasks')}
                className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-[var(--button)]"
              >
                Перейти к задачам →
              </button>
            </div>

            {/* Требования */}
            <div className="card !p-6 bg-yellow-500/5 border-yellow-500/20">
              <h3 className="font-medium mb-3 text-yellow-400">Системные требования</h3>
              <ul className="text-sm space-y-2 opacity-80">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Python 3.8 или новее
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Google Chrome (последняя версия)
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  ChromeDriver (устанавливается автоматически)
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Стабильное интернет-соединение
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* API ключи */}
        {activeSection === 'api-keys' && (
          <div className="space-y-6 max-w-2xl">
            <h1 className="text-2xl font-bold">API ключи</h1>

            <div className="card !p-6">
              <h3 className="font-medium mb-2">Ключ для подключения парсера</h3>
              <p className="text-sm opacity-60 mb-6">
                Этот ключ используется агентом для аутентификации при подключении к серверу.
              </p>
              
              {apiKey ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs opacity-50 mb-2">API ключ</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={apiKey}
                        readOnly
                        className="flex-1 px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg font-mono text-sm"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(apiKey)
                          showToast('Скопировано', 'success')
                        }}
                        className="px-4 py-3 bg-[var(--button)] text-white rounded-lg hover:opacity-90"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="opacity-50">
                      Создан: {apiKeyCreated ? new Date(apiKeyCreated).toLocaleString('ru-RU') : '—'}
                    </span>
                    <button
                      onClick={revokeApiKey}
                      className="text-red-400 hover:text-red-300"
                    >
                      Отозвать ключ
                    </button>
                  </div>

                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-400">API ключ активен</span>
                  </div>

                  {/* Команда для запуска */}
                  <div className="mt-6 p-4 bg-[var(--background)] rounded-lg">
                    <label className="block text-xs opacity-50 mb-2">Команда для запуска агента</label>
                    <code className="text-sm font-mono break-all">
                      python direct_agent.py --api-url {typeof window !== 'undefined' ? window.location.origin : 'https://tools.connecting-server.ru'} --api-key {apiKey}
                    </code>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="opacity-60 mb-4">API ключ не создан</p>
                  <button
                    onClick={generateApiKey}
                    className="px-6 py-3 bg-[var(--button)] text-white rounded-lg hover:opacity-90 font-medium"
                  >
                    Сгенерировать API ключ
                  </button>
                </div>
              )}
            </div>

            {/* Безопасность */}
            <div className="card !p-6 bg-red-500/5 border-red-500/20">
              <h3 className="font-medium mb-2 text-red-400">Безопасность</h3>
              <ul className="text-sm space-y-2 opacity-80">
                <li>• Никому не передавайте ваш API ключ</li>
                <li>• При компрометации немедленно отзовите ключ</li>
                <li>• Один ключ = один агент</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
