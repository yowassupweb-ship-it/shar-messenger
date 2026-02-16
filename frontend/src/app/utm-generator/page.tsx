'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { showToast } from '@/components/Toast'
import { Copy, Link2, Check, RotateCcw, Settings, Plus, Pencil, Trash2, X, Save } from 'lucide-react'

interface Preset {
  id: string
  name: string
  source: string
  medium: string
  campaign?: string
  term?: string
  content?: string
  color: string
  description: string
}

const DEFAULT_PRESETS: Preset[] = [
  { id: 'yandex', name: 'Яндекс', source: 'yandex', medium: 'cpc', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', description: 'Яндекс.Директ' },
  { id: 'google', name: 'Google', source: 'google', medium: 'cpc', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', description: 'Google Ads' },
  { id: 'vk', name: 'VK', source: 'vk', medium: 'social', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30', description: 'ВКонтакте' },
  { id: 'tg', name: 'Telegram', source: 'telegram', medium: 'social', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', description: 'Telegram' },
  { id: 'dzen', name: 'Дзен', source: 'dzen', medium: 'social', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', description: 'Яндекс.Дзен' },
  { id: 'email', name: 'Email', source: 'email', medium: 'email', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', description: 'Email-рассылка' },
  { id: 'qr', name: 'QR', source: 'qr', medium: 'offline', color: 'bg-green-500/20 text-green-400 border-green-500/30', description: 'Оффлайн (QR-код)' },
]

const PRESET_COLORS = [
  { id: 'yellow', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { id: 'blue', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'sky', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  { id: 'cyan', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { id: 'orange', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { id: 'purple', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'green', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { id: 'red', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { id: 'pink', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  { id: 'indigo', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
]

type TabType = 'generator' | 'settings'

export default function UTMGeneratorPage() {
  const router = useRouter()
  const glassInputClass = 'w-full bg-gradient-to-b from-white/12 to-white/5 backdrop-blur-xl border border-white/20 rounded-[35px] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-white/35 placeholder:text-[var(--text-muted)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
  const glassInputCompactClass = 'w-full bg-gradient-to-b from-white/12 to-white/5 backdrop-blur-xl border border-white/20 rounded-[35px] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-white/35 placeholder:text-[var(--text-muted)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated')
    if (!isAuthenticated || isAuthenticated !== 'true') {
      router.push('/login')
    }
  }, [router])

  const [activeTab, setActiveTab] = useState<TabType>('generator')

  const [inputUrls, setInputUrls] = useState('')
  const [source, setSource] = useState('')
  const [medium, setMedium] = useState('')
  const [campaign, setCampaign] = useState('')
  const [term, setTerm] = useState('')
  const [content, setContent] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const urlsTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const [isCopied, setIsCopied] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const [presets, setPresets] = useState<Preset[]>([])
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null)
  const [isAddingPreset, setIsAddingPreset] = useState(false)
  const [newPreset, setNewPreset] = useState<Partial<Preset>>({
    name: '',
    source: '',
    medium: '',
    campaign: '',
    term: '',
    content: '',
    description: '',
    color: PRESET_COLORS[0].color,
  })

  useEffect(() => {
    const loadPresets = async () => {
      try {
        const response = await fetch('/api/utm-presets')
        if (response.ok) {
          const data = await response.json()
          setPresets(data)
        } else {
          setPresets(DEFAULT_PRESETS)
        }
      } catch {
        setPresets(DEFAULT_PRESETS)
      }
    }
    loadPresets()
  }, [])

  useEffect(() => {
    const textarea = urlsTextareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'

    const computedStyles = window.getComputedStyle(textarea)
    const lineHeight = parseFloat(computedStyles.lineHeight || '20')
    const verticalPadding = parseFloat(computedStyles.paddingTop || '0') + parseFloat(computedStyles.paddingBottom || '0')
    const minHeight = Math.ceil(lineHeight + verticalPadding)
    const maxHeight = 240
    const targetHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)

    textarea.style.height = `${targetHeight}px`
  }, [inputUrls])

  const savePresets = useCallback(async (newPresets: Preset[]) => {
    setPresets(newPresets)
    try {
      await fetch('/api/utm-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPresets),
      })
    } catch {
      showToast('Ошибка сохранения пресетов', 'error')
    }
  }, [])

  const handleAddPreset = useCallback(() => {
    if (!newPreset.name || !newPreset.source || !newPreset.medium) {
      showToast('Заполните обязательные поля', 'error')
      return
    }

    const preset: Preset = {
      id: `custom-${Date.now()}`,
      name: newPreset.name,
      source: newPreset.source,
      medium: newPreset.medium,
      campaign: newPreset.campaign || undefined,
      term: newPreset.term || undefined,
      content: newPreset.content || undefined,
      description: newPreset.description || '',
      color: newPreset.color || PRESET_COLORS[0].color,
    }

    savePresets([...presets, preset])
    setNewPreset({ name: '', source: '', medium: '', campaign: '', term: '', content: '', description: '', color: PRESET_COLORS[0].color })
    setIsAddingPreset(false)
    showToast('Пресет добавлен', 'success')
  }, [newPreset, presets, savePresets])

  const handleUpdatePreset = useCallback(() => {
    if (!editingPreset) return
    const updated = presets.map((preset) => (preset.id === editingPreset.id ? editingPreset : preset))
    savePresets(updated)
    setEditingPreset(null)
    showToast('Пресет обновлён', 'success')
  }, [editingPreset, presets, savePresets])

  const handleDeletePreset = useCallback((id: string) => {
    if (!confirm('Удалить этот пресет?')) return
    savePresets(presets.filter((preset) => preset.id !== id))
    showToast('Пресет удалён', 'success')
  }, [presets, savePresets])

  const resetToDefaults = useCallback(async () => {
    if (!confirm('Сбросить все пресеты к значениям по умолчанию?')) return
    try {
      const response = await fetch('/api/utm-presets', { method: 'DELETE' })
      if (response.ok) {
        const data = await response.json()
        setPresets(data.presets)
        showToast('Пресеты сброшены', 'success')
      } else {
        showToast('Ошибка сброса', 'error')
      }
    } catch {
      setPresets(DEFAULT_PRESETS)
      showToast('Пресеты сброшены', 'success')
    }
  }, [])

  const parsedInputUrls = useMemo(() => {
    return inputUrls
      .split('\n')
      .map((url) => url.trim())
      .filter(Boolean)
  }, [inputUrls])

  const generatedUrls = useMemo(() => {
    const urls = parsedInputUrls

    if (urls.length === 0) return []

    const params = new URLSearchParams()
    if (source) params.append('utm_source', source)
    if (medium) params.append('utm_medium', medium)
    if (campaign) params.append('utm_campaign', campaign)
    if (term) params.append('utm_term', term)
    if (content) params.append('utm_content', content)

    const paramsStr = params.toString()

    return urls.map((url) => {
      if (!paramsStr) return url
      const separator = url.includes('?') ? '&' : '?'
      return `${url}${separator}${paramsStr}`
    })
  }, [parsedInputUrls, source, medium, campaign, term, content])

  const firstGeneratedUrl = generatedUrls[0] || ''
  const firstInputUrl = parsedInputUrls[0] || ''

  const applyPreset = useCallback((preset: Preset) => {
    setSource(preset.source)
    setMedium(preset.medium)
    if (preset.campaign) setCampaign(preset.campaign)
    if (preset.term) setTerm(preset.term)
    if (preset.content) setContent(preset.content)
    setSelectedPreset(preset.id)
    showToast(`Применён: ${preset.name}`, 'success')
  }, [])

  const detectPlatform = useCallback(() => {
    const sourceValue = (source || '').toLowerCase()
    const presetValue = (selectedPreset || '').toLowerCase()
    const combined = `${sourceValue} ${presetValue}`

    if (combined.includes('telegram') || combined.includes('tg')) return 'telegram'
    if (combined.includes('vk')) return 'vk'
    if (combined.includes('dzen')) return 'dzen'
    if (combined.includes('yandex')) return 'yandex'
    if (combined.includes('google')) return 'google'
    if (combined.includes('email') || combined.includes('mail')) return 'email'
    return 'other'
  }, [selectedPreset, source])

  const buildHistoryTitle = useCallback((originalUrl: string, index?: number) => {
    const campaignValue = campaign.trim()
    if (campaignValue) {
      return typeof index === 'number' ? `${campaignValue} #${index + 1}` : campaignValue
    }

    try {
      const parsed = new URL(originalUrl)
      const lastSegment = parsed.pathname.split('/').filter(Boolean).pop()
      if (lastSegment) {
        return decodeURIComponent(lastSegment)
      }
    } catch {
      // ignore parsing errors
    }

    return typeof index === 'number' ? `UTM ссылка #${index + 1}` : 'UTM ссылка'
  }, [campaign])

  const saveHistoryEntry = useCallback(async (originalUrl: string, utmUrl: string, index?: number) => {
    const response = await apiFetch('/api/tracked-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: detectPlatform(),
        postUrl: originalUrl,
        title: buildHistoryTitle(originalUrl, index),
        utmUrl,
        clicks: 0,
        views: 0,
        conversions: 0,
      }),
    })

    return response.ok
  }, [buildHistoryTitle, detectPlatform])

  const copyGenerated = useCallback(async () => {
    if (generatedUrls.length === 0) {
      showToast('Нет ссылки для копирования', 'error')
      return
    }

    const copyPayload = generatedUrls.join('\n')

    try {
      await navigator.clipboard.writeText(copyPayload)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)

      setIsCreating(true)
      try {
        const saveResults = await Promise.all(
          generatedUrls.map((utmUrl, index) => saveHistoryEntry(parsedInputUrls[index] || utmUrl, utmUrl, index))
        )
        const savedCount = saveResults.filter(Boolean).length
        if (savedCount === generatedUrls.length) {
          showToast(generatedUrls.length === 1 ? 'Ссылка скопирована и добавлена в историю' : `Ссылки скопированы и сохранены (${savedCount})`, 'success')
        } else {
          showToast(`Скопировано, но в историю сохранено ${savedCount} из ${generatedUrls.length}`, 'error')
        }
      } catch {
        showToast('Скопировано, но история не сохранена', 'error')
      } finally {
        setIsCreating(false)
      }
    } catch {
      showToast('Ошибка копирования', 'error')
    }
  }, [generatedUrls, parsedInputUrls, saveHistoryEntry])

  const clearForm = useCallback(() => {
    setInputUrls('')
    setSource('')
    setMedium('')
    setCampaign('')
    setTerm('')
    setContent('')
    setSelectedPreset(null)
  }, [])

  return (
    <div className="h-full min-h-0 flex flex-col p-4 pb-24 md:pb-20 gap-4 theme-text">
      <div className="flex-1 min-h-0 grid grid-cols-1 min-[780px]:grid-cols-[380px_minmax(0,1fr)] gap-4">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-[var(--shadow-card)] overflow-hidden flex flex-col min-h-0">
          <div className="p-3 border-b border-[var(--border-color)]">
            <div className="flex gap-1 p-1 bg-gradient-to-b from-white/12 to-white/5 backdrop-blur-xl border border-white/20 rounded-[35px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]">
              <button
                onClick={() => setActiveTab('generator')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[35px] text-xs font-medium transition-colors ${
                  activeTab === 'generator'
                    ? 'bg-gradient-to-b from-white/18 to-white/8 backdrop-blur-xl text-[var(--text-primary)] border border-white/25 rounded-[35px]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                Генерация
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[35px] text-xs font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-gradient-to-b from-white/18 to-white/8 backdrop-blur-xl text-[var(--text-primary)] border border-white/25 rounded-[35px]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                Пресеты
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
          {activeTab === 'settings' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-gray-600 dark:text-white/70">Управление пресетами</h4>
                <div className="flex gap-2">
                  <button
                    onClick={resetToDefaults}
                    className="px-2.5 py-1 rounded-[30px] text-[10px] text-[var(--text-secondary)] bg-gradient-to-b from-white/12 to-white/5 backdrop-blur-xl border border-white/20 hover:from-white/16 hover:to-white/8 transition-colors"
                  >
                    Сбросить
                  </button>
                  <button
                    onClick={() => setIsAddingPreset(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-[30px] text-[10px] font-medium text-[var(--text-primary)] bg-gradient-to-b from-white/16 to-white/8 backdrop-blur-xl border border-white/25 hover:from-white/20 hover:to-white/10 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Добавить
                  </button>
                </div>
              </div>

              {isAddingPreset && (
                <div className="p-3 bg-gradient-to-b from-white/12 to-white/5 backdrop-blur-xl rounded-xl border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)] space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-900 dark:text-white">Новый пресет</span>
                    <button onClick={() => setIsAddingPreset(false)} className="text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input type="text" value={newPreset.name || ''} onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })} placeholder="Название *" className={glassInputClass} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={newPreset.source || ''} onChange={(e) => setNewPreset({ ...newPreset, source: e.target.value })} placeholder="source *" className={glassInputClass} />
                    <input type="text" value={newPreset.medium || ''} onChange={(e) => setNewPreset({ ...newPreset, medium: e.target.value })} placeholder="medium *" className={glassInputClass} />
                  </div>
                  <input type="text" value={newPreset.campaign || ''} onChange={(e) => setNewPreset({ ...newPreset, campaign: e.target.value })} placeholder="campaign" className={glassInputClass} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={newPreset.term || ''} onChange={(e) => setNewPreset({ ...newPreset, term: e.target.value })} placeholder="term" className={glassInputClass} />
                    <input type="text" value={newPreset.content || ''} onChange={(e) => setNewPreset({ ...newPreset, content: e.target.value })} placeholder="content" className={glassInputClass} />
                  </div>
                  <input type="text" value={newPreset.description || ''} onChange={(e) => setNewPreset({ ...newPreset, description: e.target.value })} placeholder="Описание" className={glassInputClass} />
                  <div>
                    <label className="block text-[10px] text-gray-400 dark:text-white/40 mb-1">Цвет</label>
                    <div className="flex flex-wrap gap-1">
                      {PRESET_COLORS.map((presetColor) => (
                        <button key={presetColor.id} onClick={() => setNewPreset({ ...newPreset, color: presetColor.color })} className={`w-6 h-6 rounded-lg border ${presetColor.color} ${newPreset.color === presetColor.color ? 'ring-2 ring-white/50' : ''}`} />
                      ))}
                    </div>
                  </div>
                  <button onClick={handleAddPreset} className="w-full px-3 py-1.5 rounded-[30px] text-xs font-medium text-[var(--text-primary)] bg-gradient-to-b from-white/16 to-white/8 backdrop-blur-xl border border-white/25 hover:from-white/20 hover:to-white/10 transition-colors">Добавить пресет</button>
                </div>
              )}

              <div className="space-y-2">
                {presets.map((preset) => (
                  <div key={preset.id} className="flex items-center gap-2 p-2 bg-gradient-to-b from-white/12 to-white/5 backdrop-blur-xl rounded-xl border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_2px_8px_rgba(0,0,0,0.18)]">
                    {editingPreset?.id === preset.id ? (
                      <div className="flex-1 space-y-2">
                        <input type="text" value={editingPreset.name} onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })} className={glassInputCompactClass} />
                        <div className="grid grid-cols-2 gap-1">
                          <input type="text" value={editingPreset.source} onChange={(e) => setEditingPreset({ ...editingPreset, source: e.target.value })} placeholder="source" className={glassInputCompactClass} />
                          <input type="text" value={editingPreset.medium} onChange={(e) => setEditingPreset({ ...editingPreset, medium: e.target.value })} placeholder="medium" className={glassInputCompactClass} />
                        </div>
                        <input type="text" value={editingPreset.campaign || ''} onChange={(e) => setEditingPreset({ ...editingPreset, campaign: e.target.value })} placeholder="campaign" className={glassInputCompactClass} />
                        <div className="grid grid-cols-2 gap-1">
                          <input type="text" value={editingPreset.term || ''} onChange={(e) => setEditingPreset({ ...editingPreset, term: e.target.value })} placeholder="term" className={glassInputCompactClass} />
                          <input type="text" value={editingPreset.content || ''} onChange={(e) => setEditingPreset({ ...editingPreset, content: e.target.value })} placeholder="content" className={glassInputCompactClass} />
                        </div>
                        <input type="text" value={editingPreset.description} onChange={(e) => setEditingPreset({ ...editingPreset, description: e.target.value })} placeholder="Описание" className={glassInputCompactClass} />
                        <div className="flex flex-wrap gap-1 mb-2">
                          {PRESET_COLORS.map((presetColor) => (
                            <button key={presetColor.id} onClick={() => setEditingPreset({ ...editingPreset, color: presetColor.color })} className={`w-5 h-5 rounded border ${presetColor.color} ${editingPreset.color === presetColor.color ? 'ring-2 ring-white/50' : ''}`} />
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setEditingPreset(null)} className="flex-1 px-2 py-1 rounded-[30px] text-[10px] text-[var(--text-secondary)] bg-gradient-to-b from-white/12 to-white/5 backdrop-blur-xl border border-white/20 hover:from-white/16 hover:to-white/8">Отмена</button>
                          <button onClick={handleUpdatePreset} className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-[30px] text-[10px] text-[var(--text-primary)] bg-gradient-to-b from-white/16 to-white/8 backdrop-blur-xl border border-white/25 hover:from-white/20 hover:to-white/10">
                            <Save className="w-3 h-3" />
                            Сохранить
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className={`px-2 py-0.5 rounded-[30px] text-[10px] font-medium border backdrop-blur-xl ${preset.color}`}>{preset.name}</span>
                        <span className="flex-1 text-[10px] text-gray-400 dark:text-white/40 truncate">{preset.source} / {preset.medium}</span>
                        <button onClick={() => setEditingPreset(preset)} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-gradient-to-b from-white/12 to-white/5 border border-white/20 rounded-[30px] transition-colors"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => handleDeletePreset(preset.id)} className="p-1.5 text-red-400/70 hover:text-red-300 bg-gradient-to-b from-white/12 to-white/5 border border-white/20 rounded-[30px] transition-colors"><Trash2 className="w-3 h-3" /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-2">Быстрые пресеты</label>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                        selectedPreset === preset.id
                          ? `${preset.color} rounded-[30px] backdrop-blur-xl border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]`
                          : 'bg-gradient-to-b from-white/12 to-white/5 backdrop-blur-xl border border-white/20 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:from-white/16 hover:to-white/8 rounded-[30px]'
                      }`}
                      title={preset.description}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1.5">Ссылки (по одной на строку)</label>
                <textarea
                  ref={urlsTextareaRef}
                  value={inputUrls}
                  onChange={(e) => setInputUrls(e.target.value)}
                  placeholder="https://vs-travel.ru/tour/123"
                  rows={1}
                  className={`${glassInputClass} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">source</label>
                  <input type="text" value={source} onChange={(e) => { setSource(e.target.value); setSelectedPreset(null) }} placeholder="yandex" className={glassInputClass} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">medium</label>
                  <input type="text" value={medium} onChange={(e) => { setMedium(e.target.value); setSelectedPreset(null) }} placeholder="cpc" className={glassInputClass} />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">campaign</label>
                <input type="text" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="summer_sale" className={glassInputClass} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">term</label>
                  <input type="text" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="keyword" className={glassInputClass} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">content</label>
                  <input type="text" value={content} onChange={(e) => setContent(e.target.value)} placeholder="banner_1" className={glassInputClass} />
                </div>
              </div>

              <button onClick={clearForm} className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] text-xs hover:bg-[var(--bg-glass-hover)] transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />
                Очистить
              </button>
            </>
          )}
        </div>
      </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-[var(--shadow-card)] overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 min-h-0 p-4 flex flex-col overflow-hidden">
            {activeTab === 'settings' ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Settings className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-white/10" />
                  <h3 className="text-lg font-medium text-gray-500 dark:text-white/50 mb-2">Настройки пресетов</h3>
                  <p className="text-sm text-gray-400 dark:text-white/30 max-w-md">Управляйте пресетами в панели слева</p>
                </div>
              </div>
            ) : generatedUrls.length > 0 ? (
              <>
                <div className="rounded-xl p-3 min-[780px]:p-4 bg-[var(--bg-tertiary)] border border-[var(--border-color)] overflow-auto flex-1">
                  <div className="space-y-2">
                    {generatedUrls.map((url, index) => (
                      <div key={`${url}-${index}`} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5">
                        <div className="text-[10px] text-[var(--text-muted)] mb-1">Ссылка {index + 1}</div>
                        <p className="text-xs font-mono break-all text-cyan-600 dark:text-cyan-400">{url}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2">
                  <button
                    onClick={copyGenerated}
                    disabled={isCreating}
                    className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      isCopied
                        ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30'
                        : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)]'
                    }`}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {isCreating ? 'Сохранение...' : isCopied ? 'Скопировано' : 'Копировать'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center">
                    <Link2 className="w-7 h-7 text-[var(--text-muted)]" />
                  </div>
                  <h3 className="text-base font-medium text-[var(--text-primary)] mb-2">Генерация в реальном времени</h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    Добавьте ссылки и заполните UTM-поля слева — результат появится здесь автоматически.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
