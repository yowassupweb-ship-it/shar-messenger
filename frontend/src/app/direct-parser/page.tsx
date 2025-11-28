'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { showToast } from '@/components/Toast'

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
}

interface Stats {
  total_ads: number
  total_searches: number
  unique_domains: number
  domains_list: string[]
  top_queries: [string, number][]
  last_update: string | null
}

export default function DirectParserPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [tasks, setTasks] = useState<ParsingTask[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  
  // Форма создания задачи
  const [newTaskQueries, setNewTaskQueries] = useState('')
  const [newTaskMaxPages, setNewTaskMaxPages] = useState(2)
  const [newTaskHeadless, setNewTaskHeadless] = useState(false)
  const [isCreatingTask, setIsCreatingTask] = useState(false)

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
    setIsLoading(true)
    try {
      const response = await apiFetch('/api/direct-parser/tasks')
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Ошибка загрузки задач:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

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
    loadTasks()
    loadStats()
    
    // Автообновление каждые 10 секунд
    const interval = setInterval(() => {
      loadTasks()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [loadTasks, loadStats])

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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400'
      case 'running': return 'bg-blue-500/20 text-blue-400'
      case 'failed': return 'bg-red-500/20 text-red-400'
      case 'assigned': return 'bg-yellow-500/20 text-yellow-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'running': return 'bg-blue-500 animate-pulse'
      case 'failed': return 'bg-red-500'
      case 'assigned': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Завершена'
      case 'running': return 'Выполняется'
      case 'failed': return 'Ошибка'
      case 'assigned': return 'Назначена'
      default: return 'Ожидает'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Задачи на парсинг</h1>
          <p className="text-sm opacity-60 mt-1">Создавайте задачи для сбора рекламных объявлений</p>
        </div>
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

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="text-2xl font-bold text-[var(--button)]">{stats?.total_ads || 0}</div>
          <div className="text-sm opacity-60">Объявлений собрано</div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="text-2xl font-bold text-[var(--button)]">{stats?.unique_domains || 0}</div>
          <div className="text-sm opacity-60">Уникальных доменов</div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="text-2xl font-bold text-[var(--button)]">{tasks.filter(t => t.status === 'pending' || t.status === 'assigned').length}</div>
          <div className="text-sm opacity-60">Задач в очереди</div>
        </div>
      </div>

      {/* Создание задачи */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
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
        {isLoading ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--button)] border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm opacity-60">Загрузка...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center opacity-50">
            Нет активных задач. Создайте задачу выше.
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusDot(task.status)}`} />
                    <span className="font-medium">
                      {task.queries?.length || 1} {(task.queries?.length || 1) === 1 ? 'запрос' : 'запросов'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${getStatusStyle(task.status)}`}>
                      {getStatusText(task.status)}
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
  )
}
