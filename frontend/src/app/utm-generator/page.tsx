'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { showToast } from '@/components/Toast'
import { Copy, ExternalLink, Link2, Check, RotateCcw, TrendingUp, History, Layers, Trash2, RefreshCw } from 'lucide-react'

interface Preset {
  id: string
  name: string
  source: string
  medium: string
  color: string
  description: string
}

interface TrackedPost {
  id: string
  platform: string
  postUrl: string
  title: string
  utmUrl: string
  createdAt: string
  clicks: number
  views: number
  conversions: number
}

const PRESETS: Preset[] = [
  { id: 'yandex', name: 'Яндекс', source: 'yandex', medium: 'cpc', color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300', description: 'Яндекс.Директ' },
  { id: 'google', name: 'Google', source: 'google', medium: 'cpc', color: 'bg-blue-500/20 border-blue-500/50 text-blue-300', description: 'Google Ads' },
  { id: 'vk', name: 'VK', source: 'vk', medium: 'social', color: 'bg-sky-500/20 border-sky-500/50 text-sky-300', description: 'ВКонтакте' },
  { id: 'tg', name: 'Telegram', source: 'telegram', medium: 'social', color: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300', description: 'Telegram' },
  { id: 'dzen', name: 'Дзен', source: 'dzen', medium: 'social', color: 'bg-orange-500/20 border-orange-500/50 text-orange-300', description: 'Яндекс.Дзен' },
  { id: 'email', name: 'Email', source: 'email', medium: 'email', color: 'bg-purple-500/20 border-purple-500/50 text-purple-300', description: 'Email-рассылка' },
  { id: 'qr', name: 'QR', source: 'qr', medium: 'offline', color: 'bg-green-500/20 border-green-500/50 text-green-300', description: 'Оффлайн (QR-код)' },
]

const PLATFORMS = [
  { id: 'vk', name: 'ВКонтакте' },
  { id: 'telegram', name: 'Telegram' },
  { id: 'dzen', name: 'Дзен' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'yandex', name: 'Яндекс.Директ' },
  { id: 'google', name: 'Google Ads' },
  { id: 'email', name: 'Email' },
  { id: 'other', name: 'Другое' },
]

type TabType = 'single' | 'bulk' | 'history'

export default function UTMGeneratorPage() {
  const [activeTab, setActiveTab] = useState<TabType>('single')
  
  // Состояния формы (одиночная генерация)
  const [baseUrl, setBaseUrl] = useState('')
  const [source, setSource] = useState('')
  const [medium, setMedium] = useState('')
  const [campaign, setCampaign] = useState('')
  const [term, setTerm] = useState('')
  const [content, setContent] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  
  // Отслеживание
  const [enableTracking, setEnableTracking] = useState(false)
  const [trackingTitle, setTrackingTitle] = useState('')
  const [trackingPlatform, setTrackingPlatform] = useState('vk')
  
  // UI
  const [isCopied, setIsCopied] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Массовая генерация
  const [bulkUrls, setBulkUrls] = useState('')
  const [bulkResults, setBulkResults] = useState<string[]>([])
  const [bulkCopied, setBulkCopied] = useState(false)

  // История
  const [history, setHistory] = useState<TrackedPost[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Загрузка истории при переключении на вкладку
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab])

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const response = await apiFetch('/api/tracked-posts')
      if (response.ok) {
        const data = await response.json()
        setHistory(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Ошибка загрузки истории:', error)
      setHistory([])
    } finally {
      setHistoryLoading(false)
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
    setTrackingPlatform(preset.id === 'tg' ? 'telegram' : preset.id)
    showToast(`Применён: ${preset.name}`, 'success')
  }, [])

  // Копирование и создание поста
  const copyAndTrack = useCallback(async () => {
    if (!generatedUrl) {
      showToast('Нет URL для копирования', 'error')
      return
    }

    try {
      await navigator.clipboard.writeText(generatedUrl)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      
      // Если включено отслеживание - создаём пост
      if (enableTracking && trackingTitle) {
        setIsCreating(true)
        try {
          const response = await apiFetch('/api/tracked-posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              platform: trackingPlatform,
              postUrl: baseUrl,
              title: trackingTitle,
              utmUrl: generatedUrl,
              clicks: 0,
              views: 0,
              conversions: 0
            })
          })
          
          if (response.ok) {
            showToast('Ссылка скопирована и добавлена в историю!', 'success')
            setTrackingTitle('')
          } else {
            showToast('Ссылка скопирована, но ошибка сохранения', 'error')
          }
        } catch {
          showToast('Ссылка скопирована, но ошибка сохранения', 'error')
        } finally {
          setIsCreating(false)
        }
      } else {
        showToast('Скопировано!', 'success')
      }
    } catch {
      showToast('Ошибка копирования', 'error')
    }
  }, [generatedUrl, enableTracking, trackingTitle, trackingPlatform, baseUrl])

  // Очистка формы
  const clearForm = useCallback(() => {
    setBaseUrl('')
    setSource('')
    setMedium('')
    setCampaign('')
    setTerm('')
    setContent('')
    setSelectedPreset(null)
    setTrackingTitle('')
  }, [])

  // Массовая генерация
  const generateBulkUrls = useCallback(() => {
    const urls = bulkUrls.split('\n').filter(url => url.trim())
    if (urls.length === 0) {
      showToast('Введите хотя бы одну ссылку', 'error')
      return
    }

    const params = new URLSearchParams()
    if (source) params.append('utm_source', source)
    if (medium) params.append('utm_medium', medium)
    if (campaign) params.append('utm_campaign', campaign)
    if (term) params.append('utm_term', term)
    if (content) params.append('utm_content', content)

    const paramsStr = params.toString()
    if (!paramsStr) {
      showToast('Укажите хотя бы один UTM параметр', 'error')
      return
    }

    const results = urls.map(url => {
      const trimmedUrl = url.trim()
      const separator = trimmedUrl.includes('?') ? '&' : '?'
      return `${trimmedUrl}${separator}${paramsStr}`
    })

    setBulkResults(results)
    showToast(`Сгенерировано ${results.length} ссылок`, 'success')
  }, [bulkUrls, source, medium, campaign, term, content])

  const copyBulkResults = async () => {
    const text = bulkResults.join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setBulkCopied(true)
      setTimeout(() => setBulkCopied(false), 2000)
      showToast('Все ссылки скопированы!', 'success')
    } catch {
      showToast('Ошибка копирования', 'error')
    }
  }

  // Удаление из истории
  const deleteFromHistory = async (id: string) => {
    if (!confirm('Удалить эту запись?')) return
    
    try {
      const response = await apiFetch(`/api/tracked-posts/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setHistory(prev => prev.filter(p => p.id !== id))
        showToast('Запись удалена', 'success')
      }
    } catch {
      showToast('Ошибка удаления', 'error')
    }
  }

  // Фильтрованная история
  const filteredHistory = history.filter(post => 
    post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.utmUrl?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">UTM Генератор</h1>
        <p className="text-sm opacity-60 mt-1">Создавайте UTM-ссылки для рекламных кампаний</p>
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 mb-6 bg-[var(--card)] border border-[var(--border)] rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('single')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'single' 
              ? 'bg-[var(--button)] text-[#1b1b2b]' 
              : 'hover:bg-[var(--border)]'
          }`}
        >
          <Link2 className="w-4 h-4" />
          Генератор
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'bulk' 
              ? 'bg-[var(--button)] text-[#1b1b2b]' 
              : 'hover:bg-[var(--border)]'
          }`}
        >
          <Layers className="w-4 h-4" />
          Массовая
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'history' 
              ? 'bg-[var(--button)] text-[#1b1b2b]' 
              : 'hover:bg-[var(--border)]'
          }`}
        >
          <History className="w-4 h-4" />
          История
          {history.length > 0 && (
            <span className="text-xs bg-[var(--background)] px-1.5 py-0.5 rounded">{history.length}</span>
          )}
        </button>
      </div>

      {/* Одиночная генерация */}
      {activeTab === 'single' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="xl:col-span-2 space-y-4">
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
                <label className="block text-xs font-medium mb-1 opacity-70">URL страницы</label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://vs-travel.ru/tour/123"
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
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 opacity-70">campaign *</label>
                  <input
                    type="text"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    placeholder="summer_sale"
                    className="input-field w-full text-sm"
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
                  />
                </div>
              </div>

              {/* Отслеживание */}
              <div className="pt-3 border-t border-[var(--border)]">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={enableTracking}
                    onChange={(e) => setEnableTracking(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border)] bg-[var(--background)] text-[var(--button)] focus:ring-[var(--button)]"
                  />
                  <span className="text-sm font-medium">Сохранить в историю</span>
                  <TrendingUp className="w-4 h-4 opacity-50" />
                </label>
                
                {enableTracking && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 opacity-70">Название публикации</label>
                      <input
                        type="text"
                        value={trackingTitle}
                        onChange={(e) => setTrackingTitle(e.target.value)}
                        placeholder="Пост про летние туры"
                        className="input-field w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 opacity-70">Платформа</label>
                      <select
                        value={trackingPlatform}
                        onChange={(e) => setTrackingPlatform(e.target.value)}
                        className="input-field w-full text-sm"
                      >
                        {PLATFORMS.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={clearForm} className="btn-secondary flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Очистить
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
                      onClick={copyAndTrack}
                      disabled={isCreating || (enableTracking && !trackingTitle)}
                      className={`btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 ${isCopied ? 'bg-green-600' : ''}`}
                    >
                      {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {isCreating ? 'Сохранение...' : isCopied ? 'Скопировано!' : enableTracking ? 'Копировать и сохранить' : 'Копировать'}
                    </button>
                    <button 
                      onClick={() => window.open(generatedUrl, '_blank')}
                      className="btn-secondary p-2"
                      title="Открыть в новой вкладке"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>

                  {enableTracking && !trackingTitle && (
                    <p className="text-xs text-yellow-400 mt-2">
                      Укажите название публикации для сохранения
                    </p>
                  )}

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
                <div className="text-center py-6 text-sm opacity-50">
                  Введите URL и UTM параметры
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Массовая генерация */}
      {activeTab === 'bulk' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left: Input */}
          <div className="space-y-4">
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

            {/* UTM параметры */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
              <h3 className="font-medium text-sm">UTM параметры (для всех ссылок)</h3>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 opacity-70">source *</label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => { setSource(e.target.value); setSelectedPreset(null) }}
                    placeholder="yandex"
                    className="input-field w-full text-sm"
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
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 opacity-70">campaign *</label>
                  <input
                    type="text"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    placeholder="summer_sale"
                    className="input-field w-full text-sm"
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
                  />
                </div>
              </div>
            </div>

            {/* Список ссылок */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
              <h3 className="font-medium text-sm">Ссылки (по одной на строку)</h3>
              <textarea
                value={bulkUrls}
                onChange={(e) => setBulkUrls(e.target.value)}
                placeholder="https://vs-travel.ru/tour/1&#10;https://vs-travel.ru/tour/2&#10;https://vs-travel.ru/tour/3"
                className="input-field w-full text-sm font-mono h-48 resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs opacity-50">
                  {bulkUrls.split('\n').filter(u => u.trim()).length} ссылок
                </span>
                <button 
                  onClick={generateBulkUrls}
                  className="btn-primary flex items-center gap-2"
                >
                  <Layers className="w-4 h-4" />
                  Сгенерировать
                </button>
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Результат</h3>
              {bulkResults.length > 0 && (
                <button 
                  onClick={copyBulkResults}
                  className={`btn-primary flex items-center gap-2 text-sm ${bulkCopied ? 'bg-green-600' : ''}`}
                >
                  {bulkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {bulkCopied ? 'Скопировано!' : 'Копировать все'}
                </button>
              )}
            </div>
            
            {bulkResults.length > 0 ? (
              <div className="bg-[var(--background)] rounded-lg p-3 border border-[var(--border)] max-h-[500px] overflow-auto">
                <div className="space-y-2">
                  {bulkResults.map((url, i) => (
                    <div key={i} className="flex items-start gap-2 group">
                      <span className="text-xs opacity-30 mt-1 w-6">{i + 1}.</span>
                      <p className="text-sm font-mono break-all text-[var(--button)] flex-1">{url}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(url)
                          showToast('Скопировано!', 'success')
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--border)] rounded transition-all"
                        title="Копировать"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-sm opacity-50">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Введите ссылки и нажмите &quot;Сгенерировать&quot;</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* История */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Поиск и обновление */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Поиск по названию или ссылке..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <button 
              onClick={loadHistory}
              disabled={historyLoading}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>

          {/* Таблица */}
          {historyLoading ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-[var(--button)] border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm opacity-60">Загрузка...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm opacity-60">
                {searchQuery ? 'Ничего не найдено' : 'История пуста'}
              </p>
              <p className="text-xs opacity-40 mt-1">
                {searchQuery ? 'Попробуйте другой запрос' : 'Создайте ссылку и сохраните её в историю'}
              </p>
            </div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--background)]">
                  <tr>
                    <th className="text-left p-3 font-medium opacity-70">Название</th>
                    <th className="text-left p-3 font-medium opacity-70">Платформа</th>
                    <th className="text-left p-3 font-medium opacity-70">Ссылка</th>
                    <th className="text-center p-3 font-medium opacity-70">Визиты</th>
                    <th className="text-center p-3 font-medium opacity-70">Дата</th>
                    <th className="text-right p-3 font-medium opacity-70">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((post) => (
                    <tr key={post.id} className="border-t border-[var(--border)] hover:bg-[var(--background)]/50">
                      <td className="p-3">
                        <div className="font-medium">{post.title || 'Без названия'}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded bg-[var(--border)] text-xs">
                          {PLATFORMS.find(p => p.id === post.platform)?.name || post.platform || 'Другое'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-xs opacity-60 truncate max-w-xs font-mono" title={post.utmUrl}>
                          {post.utmUrl}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-xs">{post.views || 0}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-xs opacity-60">
                          {post.createdAt ? new Date(post.createdAt).toLocaleDateString('ru-RU') : '-'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(post.utmUrl)
                              showToast('Скопировано!', 'success')
                            }}
                            className="btn-secondary p-1.5 text-xs"
                            title="Копировать ссылку"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => window.open(post.utmUrl, '_blank')}
                            className="btn-secondary p-1.5 text-xs"
                            title="Открыть"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteFromHistory(post.id)}
                            className="btn-secondary p-1.5 text-xs text-red-400 hover:text-red-300"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <p className="text-xs opacity-40">
            💡 Для получения данных из Яндекс.Метрики настройте токен и ID счётчика в Настройках
          </p>
        </div>
      )}
    </div>
  )
}
