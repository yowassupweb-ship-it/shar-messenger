'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { showToast } from '@/components/Toast'
import { Copy, ExternalLink, Trash2, History, Link2, Sparkles, Check, RotateCcw, Download, Star, Clock } from 'lucide-react'

interface UTMTemplate {
  id: string
  name: string
  source: string
  medium: string
  campaign: string
  term?: string
  content?: string
  baseUrl: string
  createdAt: string
  status: 'active' | 'draft'
}

interface HistoryItem {
  id: string
  url: string
  source: string
  medium: string
  campaign: string
  term?: string
  content?: string
  createdAt: string
  copiedCount: number
}

interface Preset {
  id: string
  name: string
  icon: string
  source: string
  medium: string
  color: string
  description: string
}

const PRESETS: Preset[] = [
  { id: 'yandex', name: 'Яндекс', icon: 'Y', source: 'yandex', medium: 'cpc', color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300', description: 'Яндекс.Директ' },
  { id: 'google', name: 'Google', icon: 'G', source: 'google', medium: 'cpc', color: 'bg-blue-500/20 border-blue-500/50 text-blue-300', description: 'Google Ads' },
  { id: 'vk', name: 'VK', icon: 'VK', source: 'vk', medium: 'social', color: 'bg-sky-500/20 border-sky-500/50 text-sky-300', description: 'ВКонтакте' },
  { id: 'tg', name: 'Telegram', icon: 'TG', source: 'telegram', medium: 'social', color: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300', description: 'Telegram' },
  { id: 'email', name: 'Email', icon: '@', source: 'email', medium: 'email', color: 'bg-purple-500/20 border-purple-500/50 text-purple-300', description: 'Email' },
  { id: 'qr', name: 'QR', icon: 'QR', source: 'qr', medium: 'offline', color: 'bg-green-500/20 border-green-500/50 text-green-300', description: 'Оффлайн' },
]

export default function UTMGeneratorPage() {
  // Состояния формы
  const [baseUrl, setBaseUrl] = useState('')
  const [source, setSource] = useState('')
  const [medium, setMedium] = useState('')
  const [campaign, setCampaign] = useState('')
  const [term, setTerm] = useState('')
  const [content, setContent] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  
  // Данные
  const [templates, setTemplates] = useState<UTMTemplate[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  
  // UI
  const [activeTab, setActiveTab] = useState<'generator' | 'templates' | 'history'>('generator')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCopied, setIsCopied] = useState(false)

  // Загрузка данных
  useEffect(() => {
    loadTemplates()
    loadHistory()
    loadFavorites()
  }, [])

  const loadTemplates = async () => {
    try {
      const response = await apiFetch('/api/utm-templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки шаблонов:', error)
    }
  }

  const loadHistory = () => {
    const saved = localStorage.getItem('utm-history')
    if (saved) {
      try {
        setHistory(JSON.parse(saved))
      } catch {
        setHistory([])
      }
    }
  }

  const loadFavorites = () => {
    const saved = localStorage.getItem('utm-favorites')
    if (saved) {
      try {
        setFavorites(JSON.parse(saved))
      } catch {
        setFavorites([])
      }
    }
  }

  // Live генерация URL
  const generatedUrl = useMemo(() => {
    if (!baseUrl) return ''
    
    const params = new URLSearchParams()
    if (source) params.append('utm_source', source)
    if (medium) params.append('utm_medium', medium)
    if (campaign) params.append('utm_campaign', campaign)
    if (term) params.append('utm_term', term)
    if (content) params.append('utm_content', content)
    
    if (params.toString() === '') return baseUrl
    
    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}${params.toString()}`
  }, [baseUrl, source, medium, campaign, term, content])

  // Применение пресета
  const applyPreset = useCallback((preset: Preset) => {
    setSource(preset.source)
    setMedium(preset.medium)
    setSelectedPreset(preset.id)
    showToast(`Применён шаблон: ${preset.name}`, 'success')
  }, [])

  // Копирование
  const copyUrl = useCallback(async (url?: string) => {
    const urlToCopy = url || generatedUrl
    if (!urlToCopy) {
      showToast('Нет URL для копирования', 'error')
      return
    }

    try {
      await navigator.clipboard.writeText(urlToCopy)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      
      // Сохраняем в историю
      if (!url) {
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          url: urlToCopy,
          source,
          medium,
          campaign,
          term: term || undefined,
          content: content || undefined,
          createdAt: new Date().toISOString(),
          copiedCount: 1
        }
        
        const updatedHistory = [newItem, ...history.filter(h => h.url !== urlToCopy)].slice(0, 50)
        setHistory(updatedHistory)
        localStorage.setItem('utm-history', JSON.stringify(updatedHistory))
      }
      
      showToast('Скопировано!', 'success')
    } catch {
      showToast('Ошибка копирования', 'error')
    }
  }, [generatedUrl, source, medium, campaign, term, content, history])

  // Очистка формы
  const clearForm = useCallback(() => {
    setBaseUrl('')
    setSource('')
    setMedium('')
    setCampaign('')
    setTerm('')
    setContent('')
    setSelectedPreset(null)
  }, [])

  // Сохранение как шаблон
  const saveAsTemplate = async () => {
    if (!source || !medium || !campaign) {
      showToast('Заполните обязательные поля', 'error')
      return
    }

    const name = prompt('Название шаблона:')
    if (!name) return

    try {
      const response = await apiFetch('/api/utm-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          baseUrl,
          source,
          medium,
          campaign,
          term: term || undefined,
          content: content || undefined,
          status: 'active',
          createdAt: new Date().toISOString()
        })
      })

      if (response.ok) {
        await loadTemplates()
        showToast('Шаблон сохранён!', 'success')
      }
    } catch (error) {
      showToast('Ошибка сохранения', 'error')
    }
  }

  // Удаление шаблона
  const deleteTemplate = async (id: string) => {
    if (!confirm('Удалить шаблон?')) return

    try {
      const response = await apiFetch(`/api/utm-templates/${id}`, { method: 'DELETE' })
      if (response.ok) {
        await loadTemplates()
        showToast('Шаблон удалён', 'success')
      }
    } catch (error) {
      showToast('Ошибка удаления', 'error')
    }
  }

  // Загрузка из шаблона
  const loadFromTemplate = (template: UTMTemplate) => {
    setBaseUrl(template.baseUrl || '')
    setSource(template.source)
    setMedium(template.medium)
    setCampaign(template.campaign)
    setTerm(template.term || '')
    setContent(template.content || '')
    setSelectedPreset(null)
    setActiveTab('generator')
    showToast(`Загружен: ${template.name}`, 'success')
  }

  // Загрузка из истории
  const loadFromHistory = (item: HistoryItem) => {
    setSource(item.source)
    setMedium(item.medium)
    setCampaign(item.campaign)
    setTerm(item.term || '')
    setContent(item.content || '')
    setSelectedPreset(null)
    setActiveTab('generator')
    showToast('Загружено из истории', 'success')
  }

  // Очистка истории
  const clearHistory = () => {
    if (!confirm('Очистить всю историю?')) return
    setHistory([])
    localStorage.removeItem('utm-history')
    showToast('История очищена', 'success')
  }

  // Избранное
  const toggleFavorite = (id: string) => {
    const updated = favorites.includes(id) 
      ? favorites.filter(f => f !== id)
      : [...favorites, id]
    setFavorites(updated)
    localStorage.setItem('utm-favorites', JSON.stringify(updated))
  }

  // Фильтрованные шаблоны
  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.campaign.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Сортировка: избранные первыми
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    const aFav = favorites.includes(a.id)
    const bFav = favorites.includes(b.id)
    if (aFav && !bFav) return -1
    if (!aFav && bFav) return 1
    return 0
  })

  return (
    <div className="min-h-screen p-6">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[var(--card)] p-1 rounded-lg border border-[var(--border)] w-fit">
        {[
          { id: 'generator', label: 'Генератор', icon: Sparkles },
          { id: 'templates', label: 'Шаблоны', icon: Copy, count: templates.length },
          { id: 'history', label: 'История', icon: History, count: history.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'generator' | 'templates' | 'history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id 
                ? 'bg-[var(--button)] text-[var(--background)]' 
                : 'hover:bg-[var(--border)]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                activeTab === tab.id ? 'bg-black/20' : 'bg-[var(--border)]'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Generator Tab */}
      {activeTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Presets */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <div className="flex gap-2 flex-wrap">
                {PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      selectedPreset === preset.id 
                        ? preset.color + ' ring-1 ring-offset-1 ring-offset-[var(--background)]'
                        : 'border-[var(--border)] hover:border-[var(--button)] hover:bg-[var(--border)]/30'
                    }`}
                    title={preset.description}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 opacity-70">URL</label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://example.com/page"
                  className="input-field w-full text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 opacity-70">source *</label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => { setSource(e.target.value); setSelectedPreset(null) }}
                    placeholder="yandex"
                    className="input-field w-full text-sm"
                    maxLength={30}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 opacity-70">medium *</label>
                  <input
                    type="text"
                    value={medium}
                    onChange={(e) => { setMedium(e.target.value); setSelectedPreset(null) }}
                    placeholder="cpc"
                    className="input-field w-full text-sm"
                    maxLength={30}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 opacity-70">campaign *</label>
                  <input
                    type="text"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    placeholder="sale_2025"
                    className="input-field w-full text-sm"
                    maxLength={30}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 opacity-50">term</label>
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="keyword"
                    className="input-field w-full text-sm"
                    maxLength={30}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 opacity-50">content</label>
                  <input
                    type="text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="banner_1"
                    className="input-field w-full text-sm"
                    maxLength={30}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={clearForm} className="btn-secondary flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Очистить
                </button>
                <button onClick={saveAsTemplate} className="btn-secondary flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Сохранить шаблон
                </button>
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="space-y-4">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sticky top-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[var(--button)]" />
                Сгенерированная ссылка
              </h3>
              
              {generatedUrl ? (
                <>
                  <div className="bg-[var(--background)] rounded-lg p-3 mb-3 border border-[var(--border)]">
                    <p className="text-sm font-mono break-all text-[var(--button)]">
                      {generatedUrl}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => copyUrl()}
                      className={`btn-primary flex-1 flex items-center justify-center gap-2 ${isCopied ? 'bg-green-600' : ''}`}
                    >
                      {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {isCopied ? 'Скопировано!' : 'Копировать'}
                    </button>
                    <button 
                      onClick={() => window.open(generatedUrl, '_blank')}
                      className="btn-secondary p-2"
                      title="Открыть в новой вкладке"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>

                  {/* UTM Breakdown */}
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <h4 className="text-xs font-medium mb-2 opacity-60">Параметры:</h4>
                    <div className="space-y-1 text-xs">
                      {source && (
                        <div className="flex justify-between">
                          <span className="opacity-60">utm_source</span>
                          <span className="font-mono text-yellow-400">{source}</span>
                        </div>
                      )}
                      {medium && (
                        <div className="flex justify-between">
                          <span className="opacity-60">utm_medium</span>
                          <span className="font-mono text-blue-400">{medium}</span>
                        </div>
                      )}
                      {campaign && (
                        <div className="flex justify-between">
                          <span className="opacity-60">utm_campaign</span>
                          <span className="font-mono text-green-400">{campaign}</span>
                        </div>
                      )}
                      {term && (
                        <div className="flex justify-between">
                          <span className="opacity-60">utm_term</span>
                          <span className="font-mono text-purple-400">{term}</span>
                        </div>
                      )}
                      {content && (
                        <div className="flex justify-between">
                          <span className="opacity-60">utm_content</span>
                          <span className="font-mono text-pink-400">{content}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 opacity-50">
                  <Link2 className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Заполните поля для генерации ссылки</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск шаблонов..."
              className="input-field flex-1"
            />
          </div>

          {sortedTemplates.length === 0 ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
              <Copy className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">Нет шаблонов</h3>
              <p className="text-sm opacity-60 mb-4">Создайте первый шаблон в генераторе</p>
              <button onClick={() => setActiveTab('generator')} className="btn-primary">
                Создать шаблон
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedTemplates.map(template => (
                <div 
                  key={template.id} 
                  className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--button)] transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium flex items-center gap-2">
                        {favorites.includes(template.id) && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                        {template.name}
                      </h3>
                      <p className="text-xs opacity-60 mt-1">
                        {template.source} / {template.medium} / {template.campaign}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleFavorite(template.id)}
                        className="p-1.5 rounded hover:bg-[var(--border)] transition-colors"
                        title={favorites.includes(template.id) ? 'Убрать из избранного' : 'В избранное'}
                      >
                        <Star className={`w-4 h-4 ${favorites.includes(template.id) ? 'text-yellow-400 fill-yellow-400' : 'opacity-50'}`} />
                      </button>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => loadFromTemplate(template)}
                    className="btn-secondary w-full text-sm"
                  >
                    Использовать
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm opacity-60">Последние {history.length} ссылок</p>
            {history.length > 0 && (
              <button onClick={clearHistory} className="btn-secondary text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Очистить
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">История пуста</h3>
              <p className="text-sm opacity-60">Созданные UTM-ссылки появятся здесь</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(item => (
                <div 
                  key={item.id}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 hover:border-[var(--button)] transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono truncate text-[var(--button)]">{item.url}</p>
                      <p className="text-xs opacity-50 mt-1">
                        {item.source} / {item.medium} / {item.campaign}
                        {' • '}
                        {new Date(item.createdAt).toLocaleString('ru')}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => loadFromHistory(item)}
                        className="p-1.5 rounded hover:bg-[var(--border)] transition-colors"
                        title="Загрузить"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => copyUrl(item.url)}
                        className="p-1.5 rounded hover:bg-[var(--border)] transition-colors"
                        title="Копировать"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
