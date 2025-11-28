'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { showToast } from '@/components/Toast'

// ==================== ТИПЫ ====================

interface UTMTemplate {
  id: string
  name: string
  description: string
  content?: {
    template?: string
    variables?: string[]
  }
  template?: string
  variables?: string[]
}

interface UTMParams {
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_term: string
  utm_content: string
}

interface HistoryItem {
  id: string
  url: string
  params: UTMParams
  baseUrl: string
  timestamp: number
  label?: string
}

interface Preset {
  name: string
  icon: string
  params: Partial<UTMParams>
}

// ==================== ПРЕСЕТЫ ====================

const PRESETS: Preset[] = [
  { 
    name: 'Яндекс.Директ', 
    icon: '🟡',
    params: { utm_source: 'yandex', utm_medium: 'cpc', utm_campaign: '{campaign_name}', utm_term: '{keyword}', utm_content: '{ad_id}' }
  },
  { 
    name: 'Google Ads', 
    icon: '🔵',
    params: { utm_source: 'google', utm_medium: 'cpc', utm_campaign: '{campaignid}', utm_term: '{keyword}', utm_content: '{creative}' }
  },
  { 
    name: 'VK Реклама', 
    icon: '🔷',
    params: { utm_source: 'vk', utm_medium: 'cpc', utm_campaign: '{campaign_id}', utm_term: '', utm_content: '{ad_id}' }
  },
  { 
    name: 'Telegram', 
    icon: '✈️',
    params: { utm_source: 'telegram', utm_medium: 'social', utm_campaign: 'channel', utm_term: '', utm_content: '' }
  },
  { 
    name: 'Email', 
    icon: '📧',
    params: { utm_source: 'newsletter', utm_medium: 'email', utm_campaign: '', utm_term: '', utm_content: '' }
  },
  { 
    name: 'QR-код', 
    icon: '📱',
    params: { utm_source: 'qr', utm_medium: 'offline', utm_campaign: '', utm_term: '', utm_content: '' }
  },
]

// ==================== УТИЛИТЫ ====================

const HISTORY_KEY = 'utm_history'
const MAX_HISTORY = 50

function loadHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(HISTORY_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveHistory(history: HistoryItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - timestamp
  
  if (diff < 60000) return 'только что'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`
  if (diff < 172800000) return 'вчера'
  
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{([^}]+)\}\}/g) || []
  return matches.map(m => m.replace(/\{\{|\}\}/g, ''))
}

function isValidUrl(url: string): boolean {
  if (!url) return false
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`)
    return true
  } catch {
    return false
  }
}

// ==================== КОМПОНЕНТ ====================

export default function UTMBuilderPage() {
  // Состояния шаблонов
  const [templates, setTemplates] = useState<UTMTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<UTMTemplate & { template?: string; variables?: string[] } | null>(null)
  
  // Состояния генератора
  const [baseUrl, setBaseUrl] = useState('')
  const [params, setParams] = useState<UTMParams>({
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: ''
  })
  
  // История
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(true)
  
  // Новый шаблон
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: ''
  })

  // Активная вкладка: generator | templates
  const [activeTab, setActiveTab] = useState<'generator' | 'templates'>('generator')

  // ==================== ЭФФЕКТЫ ====================

  useEffect(() => {
    loadTemplates()
    setHistory(loadHistory())
  }, [])

  // ==================== ЗАГРУЗКА ШАБЛОНОВ ====================

  const loadTemplates = async () => {
    setIsLoading(true)
    try {
      const response = await apiFetch('/api/templates')
      if (response.ok) {
        const data = await response.json()
        const utmTemplates = (data || []).filter((t: UTMTemplate) => t.name?.includes('UTM') || t.content?.template)
        setTemplates(utmTemplates)
      }
    } catch (error) {
      console.error('Ошибка загрузки шаблонов:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // ==================== ГЕНЕРАЦИЯ URL ====================

  const generatedUrl = useMemo(() => {
    if (!baseUrl) return ''
    
    const urlParams = Object.entries(params)
      .filter(([, value]) => value.trim())
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&')
    
    if (!urlParams) return baseUrl
    
    const normalizedUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`
    const separator = normalizedUrl.includes('?') ? '&' : '?'
    return `${normalizedUrl}${separator}${urlParams}`
  }, [baseUrl, params])

  const isValidGeneration = useMemo(() => {
    return baseUrl.trim() && params.utm_source.trim() && params.utm_medium.trim()
  }, [baseUrl, params.utm_source, params.utm_medium])

  // ==================== ОБРАБОТЧИКИ ====================

  const handleCopy = useCallback(async () => {
    if (!generatedUrl) return
    
    try {
      await navigator.clipboard.writeText(generatedUrl)
      showToast('Ссылка скопирована', 'success')
      
      // Добавляем в историю
      const newItem: HistoryItem = {
        id: generateId(),
        url: generatedUrl,
        params: { ...params },
        baseUrl,
        timestamp: Date.now()
      }
      const newHistory = [newItem, ...history.filter(h => h.url !== generatedUrl)]
      setHistory(newHistory)
      saveHistory(newHistory)
    } catch {
      showToast('Ошибка копирования', 'error')
    }
  }, [generatedUrl, params, baseUrl, history])

  const handleApplyPreset = useCallback((preset: Preset) => {
    setParams(prev => ({
      ...prev,
      ...preset.params
    }))
    showToast(`Применен пресет: ${preset.name}`, 'info')
  }, [])

  const handleApplyFromHistory = useCallback((item: HistoryItem) => {
    setBaseUrl(item.baseUrl)
    setParams(item.params)
    showToast('Параметры восстановлены из истории', 'info')
  }, [])

  const handleCopyFromHistory = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      showToast('Ссылка скопирована', 'success')
    } catch {
      showToast('Ошибка копирования', 'error')
    }
  }, [])

  const handleDeleteFromHistory = useCallback((id: string) => {
    const newHistory = history.filter(h => h.id !== id)
    setHistory(newHistory)
    saveHistory(newHistory)
    showToast('Удалено из истории', 'info')
  }, [history])

  const handleClearHistory = useCallback(() => {
    if (!confirm('Очистить всю историю?')) return
    setHistory([])
    saveHistory([])
    showToast('История очищена', 'info')
  }, [])

  const handleClearForm = useCallback(() => {
    setBaseUrl('')
    setParams({
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_term: '',
      utm_content: ''
    })
  }, [])

  // ==================== CRUD ШАБЛОНОВ ====================

  const handleCreateTemplate = async () => {
    const templateStr = [
      newTemplate.utm_source && `utm_source=${newTemplate.utm_source}`,
      newTemplate.utm_medium && `utm_medium=${newTemplate.utm_medium}`,
      newTemplate.utm_campaign && `utm_campaign=${newTemplate.utm_campaign}`,
      newTemplate.utm_term && `utm_term=${newTemplate.utm_term}`,
      newTemplate.utm_content && `utm_content=${newTemplate.utm_content}`
    ].filter(Boolean).join('&')
    
    const variables = extractVariables(templateStr)
    
    try {
      const response = await apiFetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplate.name,
          description: newTemplate.description,
          type: 'utm',
          content: { template: templateStr, variables }
        })
      })
      
      if (response.ok) {
        await loadTemplates()
        setShowCreateModal(false)
        setNewTemplate({ name: '', description: '', utm_source: '', utm_medium: '', utm_campaign: '', utm_term: '', utm_content: '' })
        showToast('Шаблон создан', 'success')
      }
    } catch (error) {
      console.error('Ошибка создания шаблона:', error)
      showToast('Ошибка создания шаблона', 'error')
    }
  }

  const handleEditTemplate = async () => {
    if (!editingTemplate) return
    
    const variables = extractVariables(editingTemplate.template || '')
    
    try {
      const response = await apiFetch(`/api/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingTemplate.name,
          description: editingTemplate.description,
          content: { template: editingTemplate.template, variables }
        })
      })
      
      if (response.ok) {
        await loadTemplates()
        setEditingTemplate(null)
        setShowEditModal(false)
        showToast('Шаблон обновлен', 'success')
      }
    } catch (error) {
      console.error('Ошибка обновления шаблона:', error)
      showToast('Ошибка обновления шаблона', 'error')
    }
  }

  const handleDeleteTemplate = async (template: UTMTemplate) => {
    if (!confirm('Удалить этот шаблон?')) return
    
    try {
      const response = await apiFetch(`/api/templates/${template.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await loadTemplates()
        showToast('Шаблон удален', 'success')
      }
    } catch (error) {
      console.error('Ошибка удаления шаблона:', error)
      showToast('Ошибка удаления шаблона', 'error')
    }
  }

  const openEditModal = (template: UTMTemplate) => {
    setEditingTemplate({ 
      ...template,
      template: template.content?.template || '',
      variables: template.content?.variables || []
    })
    setShowEditModal(true)
  }

  const handleApplyTemplate = useCallback((template: UTMTemplate) => {
    const templateStr = template.content?.template || ''
    const pairs = templateStr.split('&')
    const newParams: Partial<UTMParams> = {}
    
    pairs.forEach(pair => {
      const [key, value] = pair.split('=')
      if (key && value) {
        newParams[key as keyof UTMParams] = decodeURIComponent(value)
      }
    })
    
    setParams(prev => ({ ...prev, ...newParams }))
    showToast(`Применен шаблон: ${template.name}`, 'info')
  }, [])

  // ==================== РЕНДЕР ====================

  return (
    <div className="max-w-7xl mx-auto">
      {/* Навигация */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link href="/" className="text-[var(--button)] hover:underline">Инструменты</Link>
        <span className="opacity-50">/</span>
        <Link href="/feed-editor" className="text-[var(--button)] hover:underline">Редактор фидов</Link>
        <span className="opacity-50">/</span>
        <span>UTM генератор</span>
      </div>

      {/* Заголовок и табы */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-1">UTM Генератор</h1>
          <p className="text-sm opacity-70">Создавайте UTM-ссылки для отслеживания рекламных кампаний</p>
        </div>
        <div className="flex gap-1 bg-[var(--card)] p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === 'generator' 
                ? 'bg-[var(--button)] text-white' 
                : 'hover:bg-[var(--hover)]'
            }`}
          >
            Генератор
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === 'templates' 
                ? 'bg-[var(--button)] text-white' 
                : 'hover:bg-[var(--hover)]'
            }`}
          >
            Шаблоны ({templates.length})
          </button>
        </div>
      </div>

      {activeTab === 'generator' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Левая колонка - Форма генератора */}
          <div className="lg:col-span-2 space-y-4">
            {/* Пресеты */}
            <div className="card !p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium opacity-70">Быстрые пресеты</span>
                <button 
                  onClick={handleClearForm}
                  className="text-xs text-[var(--button)] hover:underline"
                >
                  Очистить форму
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplyPreset(preset)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[var(--background)] border border-[var(--border)] rounded-md hover:border-[var(--button)] hover:text-[var(--button)] transition-all"
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Основная форма */}
            <div className="card !p-4">
              {/* URL */}
              <div className="mb-4">
                <label className="flex items-center gap-2 text-xs font-medium mb-1.5">
                  <span>Базовый URL</span>
                  {baseUrl && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      isValidUrl(baseUrl) ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                    }`}>
                      {isValidUrl(baseUrl) ? '✓ Валидный' : '✗ Невалидный'}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)] focus:border-transparent"
                  placeholder="https://vs-travel.ru/tour/123"
                />
              </div>

              {/* UTM параметры - компактная сетка */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">
                    utm_source <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={params.utm_source}
                    onChange={(e) => setParams({...params, utm_source: e.target.value})}
                    className="w-full px-2.5 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--button)]"
                    placeholder="yandex"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">
                    utm_medium <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={params.utm_medium}
                    onChange={(e) => setParams({...params, utm_medium: e.target.value})}
                    className="w-full px-2.5 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--button)]"
                    placeholder="cpc"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">utm_campaign</label>
                  <input
                    type="text"
                    value={params.utm_campaign}
                    onChange={(e) => setParams({...params, utm_campaign: e.target.value})}
                    className="w-full px-2.5 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--button)]"
                    placeholder="summer_2024"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">utm_term</label>
                  <input
                    type="text"
                    value={params.utm_term}
                    onChange={(e) => setParams({...params, utm_term: e.target.value})}
                    className="w-full px-2.5 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--button)]"
                    placeholder="{keyword}"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium mb-1 block">utm_content</label>
                  <input
                    type="text"
                    value={params.utm_content}
                    onChange={(e) => setParams({...params, utm_content: e.target.value})}
                    className="w-full px-2.5 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--button)]"
                    placeholder="{ad_id}"
                  />
                </div>
              </div>
            </div>

            {/* Результат - Live Preview */}
            <div className="card !p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium opacity-70">Готовая ссылка</span>
                <span className={`text-xs ${isValidGeneration ? 'text-green-500' : 'text-yellow-500'}`}>
                  {isValidGeneration ? '✓ Готово к копированию' : 'Заполните обязательные поля'}
                </span>
              </div>
              
              <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 mb-3 min-h-[60px] font-mono text-sm break-all">
                {generatedUrl ? (
                  <span className="text-[var(--button)]">{generatedUrl}</span>
                ) : (
                  <span className="opacity-40">Введите URL и параметры...</span>
                )}
              </div>
              
              <button
                onClick={handleCopy}
                disabled={!isValidGeneration}
                className="w-full bg-[var(--button)] text-white py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Копировать и сохранить в историю
              </button>
            </div>
          </div>

          {/* Правая колонка - История */}
          <div className="space-y-4">
            <div className="card !p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--button)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">История ({history.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-xs text-[var(--button)] hover:underline"
                  >
                    {showHistory ? 'Скрыть' : 'Показать'}
                  </button>
                  {history.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Очистить
                    </button>
                  )}
                </div>
              </div>

              {showHistory && (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {history.length === 0 ? (
                    <div className="text-center py-8 text-sm opacity-50">
                      <svg className="w-8 h-8 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p>История пуста</p>
                      <p className="text-xs mt-1">Скопируйте ссылку, чтобы она появилась здесь</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <div 
                        key={item.id}
                        className="group bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 hover:border-[var(--button)]/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="text-[10px] text-[var(--button)] opacity-70">
                            {item.params.utm_source}/{item.params.utm_medium}
                          </span>
                          <span className="text-[10px] opacity-50">{formatDate(item.timestamp)}</span>
                        </div>
                        
                        <p className="text-xs font-mono text-[var(--foreground)] break-all line-clamp-2 mb-2" title={item.url}>
                          {item.url}
                        </p>
                        
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopyFromHistory(item.url)}
                            className="flex-1 text-[10px] py-1 bg-[var(--button)] text-white rounded hover:bg-[var(--button)]/90 transition-colors"
                          >
                            Копировать
                          </button>
                          <button
                            onClick={() => handleApplyFromHistory(item)}
                            className="flex-1 text-[10px] py-1 border border-[var(--border)] rounded hover:border-[var(--button)] transition-colors"
                          >
                            Применить
                          </button>
                          <button
                            onClick={() => handleDeleteFromHistory(item.id)}
                            className="px-2 text-[10px] py-1 text-red-500 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Подсказки */}
            <div className="card !p-3 bg-[var(--button)]/5 border-[var(--button)]/20">
              <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5">
                <span>💡</span> Подсказки
              </h4>
              <ul className="text-xs space-y-1.5 opacity-70">
                <li>• <code className="bg-[var(--background)] px-1 rounded">{'{keyword}'}</code> — ключевое слово</li>
                <li>• <code className="bg-[var(--background)] px-1 rounded">{'{campaign_id}'}</code> — ID кампании</li>
                <li>• <code className="bg-[var(--background)] px-1 rounded">{'{ad_id}'}</code> — ID объявления</li>
                <li>• История хранится локально в браузере</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Вкладка шаблонов */
        <div>
          <div className="flex justify-end mb-4">
            <button 
              className="bg-[var(--button)] text-white px-4 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors flex items-center gap-2 text-sm"
              onClick={() => setShowCreateModal(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Создать шаблон
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--button)] border-t-transparent"></div>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-20 opacity-50">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Нет сохраненных шаблонов</p>
              <p className="text-sm mt-1">Создайте первый шаблон для быстрого применения UTM меток</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div 
                  key={template.id}
                  className="card hover:border-[var(--button)] transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-[var(--foreground)] flex-1 pr-2">{template.name}</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleApplyTemplate(template)}
                        className="p-1.5 hover:bg-[var(--button)]/10 text-[var(--button)] rounded transition-colors"
                        title="Применить в генератор"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openEditModal(template)}
                        className="p-1.5 hover:bg-[var(--background)] rounded transition-colors"
                        title="Редактировать"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template)}
                        className="p-1.5 hover:bg-red-500/10 text-red-500 rounded transition-colors"
                        title="Удалить"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {template.description && (
                    <p className="text-xs opacity-60 mb-2 line-clamp-1">{template.description}</p>
                  )}
                  
                  <div className="bg-[var(--background)] rounded-md p-2 mb-2">
                    <code className="text-xs text-[var(--button)] break-all line-clamp-2">
                      {template.content?.template || ''}
                    </code>
                  </div>
                  
                  {template.content?.variables && template.content.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.content.variables.map((variable: string) => (
                        <span 
                          key={variable}
                          className="text-[10px] px-1.5 py-0.5 bg-[var(--button)]/15 text-[var(--button)] rounded"
                        >
                          {variable}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Модальное окно создания шаблона */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Создать UTM шаблон</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-[var(--hover)] rounded">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateTemplate(); }} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Название *</label>
                <input 
                  type="text" 
                  className="input-field w-full text-sm"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                  placeholder="Мой шаблон UTM"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Описание</label>
                <input 
                  type="text" 
                  className="input-field w-full text-sm"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                  placeholder="Для рекламы в..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">utm_source *</label>
                  <input 
                    type="text" 
                    className="input-field w-full text-sm"
                    value={newTemplate.utm_source}
                    onChange={(e) => setNewTemplate({...newTemplate, utm_source: e.target.value})}
                    placeholder="yandex"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">utm_medium *</label>
                  <input 
                    type="text" 
                    className="input-field w-full text-sm"
                    value={newTemplate.utm_medium}
                    onChange={(e) => setNewTemplate({...newTemplate, utm_medium: e.target.value})}
                    placeholder="cpc"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">utm_campaign</label>
                  <input 
                    type="text" 
                    className="input-field w-full text-sm"
                    value={newTemplate.utm_campaign}
                    onChange={(e) => setNewTemplate({...newTemplate, utm_campaign: e.target.value})}
                    placeholder="{campaign_name}"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">utm_term</label>
                  <input 
                    type="text" 
                    className="input-field w-full text-sm"
                    value={newTemplate.utm_term}
                    onChange={(e) => setNewTemplate({...newTemplate, utm_term: e.target.value})}
                    placeholder="{keyword}"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">utm_content</label>
                  <input 
                    type="text" 
                    className="input-field w-full text-sm"
                    value={newTemplate.utm_content}
                    onChange={(e) => setNewTemplate({...newTemplate, utm_content: e.target.value})}
                    placeholder="{ad_id}"
                  />
                </div>
              </div>

              <div className="bg-[var(--background)] p-3 rounded-lg border border-[var(--border)]">
                <p className="text-xs font-medium mb-1">Предпросмотр:</p>
                <code className="text-xs text-[var(--button)] break-all">
                  {[
                    newTemplate.utm_source && `utm_source=${newTemplate.utm_source}`,
                    newTemplate.utm_medium && `utm_medium=${newTemplate.utm_medium}`,
                    newTemplate.utm_campaign && `utm_campaign=${newTemplate.utm_campaign}`,
                    newTemplate.utm_term && `utm_term=${newTemplate.utm_term}`,
                    newTemplate.utm_content && `utm_content=${newTemplate.utm_content}`
                  ].filter(Boolean).join('&') || 'Заполните поля выше'}
                </code>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary text-sm">Создать</button>
                <button type="button" className="btn-secondary text-sm" onClick={() => setShowCreateModal(false)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования */}
      {showEditModal && editingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Редактировать шаблон</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-[var(--hover)] rounded">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleEditTemplate(); }} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Название *</label>
                <input 
                  type="text" 
                  className="input-field w-full text-sm"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Описание</label>
                <input 
                  type="text" 
                  className="input-field w-full text-sm"
                  value={editingTemplate.description}
                  onChange={(e) => setEditingTemplate({...editingTemplate, description: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">UTM строка *</label>
                <textarea 
                  className="input-field w-full text-sm h-20 font-mono"
                  value={editingTemplate.template}
                  onChange={(e) => setEditingTemplate({...editingTemplate, template: e.target.value})}
                  placeholder="utm_source=...&utm_medium=..."
                  required
                />
                <p className="text-[10px] opacity-60 mt-1">
                  Используйте {'{{variable}}'} для динамических значений
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary text-sm">Сохранить</button>
                <button type="button" className="btn-secondary text-sm" onClick={() => setShowEditModal(false)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
