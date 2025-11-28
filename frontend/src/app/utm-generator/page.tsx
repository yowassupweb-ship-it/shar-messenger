'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { showToast } from '@/components/Toast'
import { Copy, ExternalLink, Link2, Check, RotateCcw, Eye, TrendingUp, Users, MousePointer } from 'lucide-react'

interface TrackedPost {
  id: string
  platform: string
  postUrl: string
  title: string
  utmUrl: string
  clicks: number
  views: number
  conversions: number
  createdAt: string
}

interface Preset {
  id: string
  name: string
  source: string
  medium: string
  color: string
  description: string
}

const PRESETS: Preset[] = [
  { id: 'yandex', name: 'Яндекс', source: 'yandex', medium: 'cpc', color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300', description: 'Яндекс.Директ' },
  { id: 'google', name: 'Google', source: 'google', medium: 'cpc', color: 'bg-blue-500/20 border-blue-500/50 text-blue-300', description: 'Google Ads' },
  { id: 'vk', name: 'VK', source: 'vk', medium: 'social', color: 'bg-sky-500/20 border-sky-500/50 text-sky-300', description: 'ВКонтакте' },
  { id: 'tg', name: 'Telegram', source: 'telegram', medium: 'social', color: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300', description: 'Telegram' },
  { id: 'email', name: 'Email', source: 'email', medium: 'email', color: 'bg-purple-500/20 border-purple-500/50 text-purple-300', description: 'Email-рассылка' },
  { id: 'qr', name: 'QR', source: 'qr', medium: 'offline', color: 'bg-green-500/20 border-green-500/50 text-green-300', description: 'Оффлайн (QR-код)' },
]

const PLATFORMS = [
  { id: 'vk', name: 'ВКонтакте' },
  { id: 'telegram', name: 'Telegram' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'yandex', name: 'Яндекс.Директ' },
  { id: 'google', name: 'Google Ads' },
  { id: 'email', name: 'Email' },
  { id: 'other', name: 'Другое' },
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
  
  // Отслеживание
  const [enableTracking, setEnableTracking] = useState(false)
  const [trackingTitle, setTrackingTitle] = useState('')
  const [trackingPlatform, setTrackingPlatform] = useState('vk')
  
  // Отслеживаемые посты
  const [trackedPosts, setTrackedPosts] = useState<TrackedPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [loadingAnalytics, setLoadingAnalytics] = useState<string | null>(null)
  
  // UI
  const [isCopied, setIsCopied] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Загрузка отслеживаемых постов
  useEffect(() => {
    loadTrackedPosts()
  }, [])

  const loadTrackedPosts = async () => {
    setLoadingPosts(true)
    try {
      const response = await apiFetch('/api/tracked-posts')
      if (response.ok) {
        const data = await response.json()
        setTrackedPosts(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки постов:', error)
    } finally {
      setLoadingPosts(false)
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
            await loadTrackedPosts()
            showToast('Ссылка скопирована и добавлена в отслеживание!', 'success')
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

  // Загрузка аналитики для поста
  const loadPostAnalytics = async (postId: string, utmUrl: string) => {
    setLoadingAnalytics(postId)
    try {
      // Извлекаем utm_term из URL
      const url = new URL(utmUrl)
      const utmTerm = url.searchParams.get('utm_term') || url.searchParams.get('utm_campaign')
      
      if (!utmTerm) {
        showToast('UTM метки не найдены в ссылке', 'error')
        return
      }

      const response = await apiFetch(`/api/analytics/metrica?utm_term=${encodeURIComponent(utmTerm)}`)
      if (response.ok) {
        const data = await response.json()
        
        // Суммируем статистику
        let totalVisits = 0
        let totalUsers = 0
        
        if (Array.isArray(data)) {
          data.forEach((row: { visits?: number; users?: number }) => {
            totalVisits += row.visits || 0
            totalUsers += row.users || 0
          })
        }
        
        // Обновляем пост
        await apiFetch(`/api/tracked-posts/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            views: totalVisits,
            clicks: totalUsers
          })
        })
        
        await loadTrackedPosts()
        showToast(`Аналитика обновлена: ${totalVisits} визитов`, 'success')
      } else {
        const error = await response.json()
        showToast(error.detail || 'Ошибка загрузки аналитики', 'error')
      }
    } catch {
      showToast('Настройте Яндекс.Метрику в настройках', 'error')
    } finally {
      setLoadingAnalytics(null)
    }
  }

  // Удаление поста
  const deletePost = async (postId: string) => {
    if (!confirm('Удалить запись?')) return
    
    try {
      const response = await apiFetch(`/api/tracked-posts/${postId}`, { method: 'DELETE' })
      if (response.ok) {
        await loadTrackedPosts()
        showToast('Запись удалена', 'success')
      }
    } catch {
      showToast('Ошибка удаления', 'error')
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">UTM Генератор</h1>
        <p className="text-sm opacity-60 mt-1">Создавайте UTM-ссылки и отслеживайте их эффективность</p>
      </div>

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
                <span className="text-sm font-medium">Отслеживать эту ссылку</span>
                <Eye className="w-4 h-4 opacity-50" />
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
                    {isCreating ? 'Сохранение...' : isCopied ? 'Скопировано!' : enableTracking ? 'Копировать и отслеживать' : 'Копировать'}
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
                    Укажите название публикации для отслеживания
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

      {/* Отслеживаемые ссылки */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--button)]" />
            Отслеживаемые ссылки
            {trackedPosts.length > 0 && (
              <span className="text-xs bg-[var(--border)] px-2 py-0.5 rounded">{trackedPosts.length}</span>
            )}
          </h2>
        </div>

        {loadingPosts ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--button)] border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm opacity-60">Загрузка...</p>
          </div>
        ) : trackedPosts.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
            <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm opacity-60">Нет отслеживаемых ссылок</p>
            <p className="text-xs opacity-40 mt-1">Включите чекбокс &quot;Отслеживать&quot; при создании ссылки</p>
          </div>
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--background)]">
                <tr>
                  <th className="text-left p-3 font-medium opacity-70">Публикация</th>
                  <th className="text-left p-3 font-medium opacity-70">Платформа</th>
                  <th className="text-center p-3 font-medium opacity-70">Визиты</th>
                  <th className="text-center p-3 font-medium opacity-70">Пользователи</th>
                  <th className="text-center p-3 font-medium opacity-70">Конверсии</th>
                  <th className="text-right p-3 font-medium opacity-70">Действия</th>
                </tr>
              </thead>
              <tbody>
                {trackedPosts.map((post) => (
                  <tr key={post.id} className="border-t border-[var(--border)] hover:bg-[var(--background)]/50">
                    <td className="p-3">
                      <div className="font-medium">{post.title}</div>
                      <div className="text-xs opacity-50 truncate max-w-xs" title={post.utmUrl}>
                        {post.utmUrl}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded bg-[var(--border)] text-xs">
                        {PLATFORMS.find(p => p.id === post.platform)?.name || post.platform}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Eye className="w-3 h-3 opacity-50" />
                        {post.views || 0}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-3 h-3 opacity-50" />
                        {post.clicks || 0}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <MousePointer className="w-3 h-3 opacity-50" />
                        {post.conversions || 0}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => loadPostAnalytics(post.id, post.utmUrl)}
                          disabled={loadingAnalytics === post.id}
                          className="btn-secondary p-1.5 text-xs"
                          title="Обновить из Метрики"
                        >
                          {loadingAnalytics === post.id ? (
                            <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <TrendingUp className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(post.utmUrl).then(() => showToast('Скопировано!', 'success'))}
                          className="btn-secondary p-1.5 text-xs"
                          title="Копировать ссылку"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePost(post.id)}
                          className="btn-secondary p-1.5 text-xs text-red-400 hover:text-red-300"
                          title="Удалить"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <p className="text-xs opacity-40 mt-3">
          💡 Для получения данных из Яндекс.Метрики настройте токен и ID счётчика в Настройках
        </p>
      </div>
    </div>
  )
}
