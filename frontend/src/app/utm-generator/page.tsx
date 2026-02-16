'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { showToast } from '@/components/Toast'
import { Copy, ExternalLink, Link2, Check, RotateCcw, TrendingUp, Layers, Settings, Plus, Pencil, Trash2, X, Save } from 'lucide-react'

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

const panelStyle = {
  // Стили будут применены через CSS классы для поддержки тем
}

const buttonStyle = {
  // Стили будут применены через CSS классы для поддержки тем
}

type TabType = 'single' | 'bulk' | 'settings'

export default function UTMGeneratorPage() {
  const router = useRouter()

  // Проверка авторизации
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated || isAuthenticated !== 'true') {
      router.push('/login');
    }
  }, [router]);

  const [activeTab, setActiveTab] = useState<TabType>('single')
  
  const [baseUrl, setBaseUrl] = useState('')
  const [source, setSource] = useState('')
  const [medium, setMedium] = useState('')
  const [campaign, setCampaign] = useState('')
  const [term, setTerm] = useState('')
  const [content, setContent] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  
  const [enableTracking, setEnableTracking] = useState(false)
  const [trackingTitle, setTrackingTitle] = useState('')
  const [trackingPlatform, setTrackingPlatform] = useState('vk')
  
  const [isCopied, setIsCopied] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const [bulkUrls, setBulkUrls] = useState('')
  const [bulkResults, setBulkResults] = useState<string[]>([])
  const [bulkCopied, setBulkCopied] = useState(false)

  // Presets management
  const [presets, setPresets] = useState<Preset[]>([])
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null)
  const [isAddingPreset, setIsAddingPreset] = useState(false)
  const [presetsLoading, setPresetsLoading] = useState(true)
  const [newPreset, setNewPreset] = useState<Partial<Preset>>({
    name: '',
    source: '',
    medium: '',
    campaign: '',
    term: '',
    content: '',
    description: '',
    color: PRESET_COLORS[0].color
  })

  // Load presets from server
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
      } catch (error) {
        console.error('Error loading presets:', error)
        setPresets(DEFAULT_PRESETS)
      } finally {
        setPresetsLoading(false)
      }
    }
    loadPresets()
  }, [])

  // Save presets to server
  const savePresets = useCallback(async (newPresets: Preset[]) => {
    setPresets(newPresets)
    try {
      await fetch('/api/utm-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPresets)
      })
    } catch (error) {
      console.error('Error saving presets:', error)
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
      color: newPreset.color || PRESET_COLORS[0].color
    }
    
    savePresets([...presets, preset])
    setNewPreset({ name: '', source: '', medium: '', campaign: '', term: '', content: '', description: '', color: PRESET_COLORS[0].color })
    setIsAddingPreset(false)
    showToast('Пресет добавлен', 'success')
  }, [newPreset, presets, savePresets])

  const handleUpdatePreset = useCallback(() => {
    if (!editingPreset) return
    
    const updated = presets.map(p => p.id === editingPreset.id ? editingPreset : p)
    savePresets(updated)
    setEditingPreset(null)
    showToast('Пресет обновлён', 'success')
  }, [editingPreset, presets, savePresets])

  const handleDeletePreset = useCallback((id: string) => {
    if (!confirm('Удалить этот пресет?')) return
    savePresets(presets.filter(p => p.id !== id))
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
    } catch (error) {
      setPresets(DEFAULT_PRESETS)
      showToast('Пресеты сброшены', 'success')
    }
  }, [])

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

  const applyPreset = useCallback((preset: Preset) => {
    setSource(preset.source)
    setMedium(preset.medium)
    if (preset.campaign) setCampaign(preset.campaign)
    if (preset.term) setTerm(preset.term)
    if (preset.content) setContent(preset.content)
    setSelectedPreset(preset.id)
    setTrackingPlatform(preset.id === 'tg' ? 'telegram' : preset.source)
    showToast(`Применён: ${preset.name}`, 'success')
  }, [])

  const copyAndTrack = useCallback(async () => {
    if (!generatedUrl) {
      showToast('Нет URL для копирования', 'error')
      return
    }

    try {
      await navigator.clipboard.writeText(generatedUrl)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      
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

  return (
    <div className="h-full flex p-4 gap-4">
      {/* Левая панель - Форма */}
      <div 
        className="w-96 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-lg dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden flex flex-col"
      >
        <div className="p-3 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-[#4a9eff]" />
            <span className="text-xs font-medium text-gray-500 dark:text-white/60">UTM Генератор</span>
          </div>

          {/* Табы */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-lg">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'single' 
                  ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 shadow-sm' 
                  : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70'
              }`}
            >
              <Link2 className="w-3 h-3" />
              Одна
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'bulk' 
                  ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 shadow-sm' 
                  : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70'
              }`}
            >
              <Layers className="w-3 h-3" />
              Много
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'settings' 
                  ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 shadow-sm' 
                  : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70'
              }`}
            >
              <Settings className="w-3 h-3" />
              Пресеты
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {activeTab === 'settings' ? (
            /* Вкладка настроек пресетов */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-gray-600 dark:text-white/70">Управление пресетами</h4>
                <div className="flex gap-2">
                  <button
                    onClick={resetToDefaults}
                    className="px-2 py-1 text-[10px] text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60 transition-colors"
                  >
                    Сбросить
                  </button>
                  <button
                    onClick={() => setIsAddingPreset(true)}
                    className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-lg text-[10px] font-medium hover:bg-cyan-500/30 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Добавить
                  </button>
                </div>
              </div>

              {/* Форма добавления пресета */}
              {isAddingPreset && (
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-900 dark:text-white">Новый пресет</span>
                    <button onClick={() => setIsAddingPreset(false)} className="text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newPreset.name || ''}
                    onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
                    placeholder="Название *"
                    className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newPreset.source || ''}
                      onChange={(e) => setNewPreset({ ...newPreset, source: e.target.value })}
                      placeholder="source *"
                      className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                    />
                    <input
                      type="text"
                      value={newPreset.medium || ''}
                      onChange={(e) => setNewPreset({ ...newPreset, medium: e.target.value })}
                      placeholder="medium *"
                      className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                    />
                  </div>
                  <input
                    type="text"
                    value={newPreset.campaign || ''}
                    onChange={(e) => setNewPreset({ ...newPreset, campaign: e.target.value })}
                    placeholder="campaign"
                    className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newPreset.term || ''}
                      onChange={(e) => setNewPreset({ ...newPreset, term: e.target.value })}
                      placeholder="term"
                      className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                    />
                    <input
                      type="text"
                      value={newPreset.content || ''}
                      onChange={(e) => setNewPreset({ ...newPreset, content: e.target.value })}
                      placeholder="content"
                      className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                    />
                  </div>
                  <input
                    type="text"
                    value={newPreset.description || ''}
                    onChange={(e) => setNewPreset({ ...newPreset, description: e.target.value })}
                    placeholder="Описание"
                    className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                  />
                  <div>
                    <label className="block text-[10px] text-gray-400 dark:text-white/40 mb-1">Цвет</label>
                    <div className="flex flex-wrap gap-1">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setNewPreset({ ...newPreset, color: c.color })}
                          className={`w-6 h-6 rounded-lg border ${c.color} ${newPreset.color === c.color ? 'ring-2 ring-white/50' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleAddPreset}
                    className="w-full px-3 py-1.5 bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-lg text-xs font-medium hover:bg-cyan-500/30 transition-colors"
                  >
                    Добавить пресет
                  </button>
                </div>
              )}

              {/* Список пресетов */}
              <div className="space-y-2">
                {presets.map(preset => (
                  <div key={preset.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                    {editingPreset?.id === preset.id ? (
                      /* Режим редактирования */
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={editingPreset.name}
                          onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })}
                          className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                        />
                        <div className="grid grid-cols-2 gap-1">
                          <input
                            type="text"
                            value={editingPreset.source}
                            onChange={(e) => setEditingPreset({ ...editingPreset, source: e.target.value })}
                            placeholder="source"
                            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                          />
                          <input
                            type="text"
                            value={editingPreset.medium}
                            onChange={(e) => setEditingPreset({ ...editingPreset, medium: e.target.value })}
                            placeholder="medium"
                            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                          />
                        </div>
                        <input
                          type="text"
                          value={editingPreset.campaign || ''}
                          onChange={(e) => setEditingPreset({ ...editingPreset, campaign: e.target.value })}
                          placeholder="campaign"
                          className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                        />
                        <div className="grid grid-cols-2 gap-1">
                          <input
                            type="text"
                            value={editingPreset.term || ''}
                            onChange={(e) => setEditingPreset({ ...editingPreset, term: e.target.value })}
                            placeholder="term"
                            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                          />
                          <input
                            type="text"
                            value={editingPreset.content || ''}
                            onChange={(e) => setEditingPreset({ ...editingPreset, content: e.target.value })}
                            placeholder="content"
                            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                          />
                        </div>
                        <input
                          type="text"
                          value={editingPreset.description}
                          onChange={(e) => setEditingPreset({ ...editingPreset, description: e.target.value })}
                          placeholder="Описание"
                          className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                        />
                        <div className="flex flex-wrap gap-1 mb-2">
                          {PRESET_COLORS.map(c => (
                            <button
                              key={c.id}
                              onClick={() => setEditingPreset({ ...editingPreset, color: c.color })}
                              className={`w-5 h-5 rounded border ${c.color} ${editingPreset.color === c.color ? 'ring-2 ring-white/50' : ''}`}
                            />
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingPreset(null)}
                            className="flex-1 px-2 py-1 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60 rounded-lg text-[10px] hover:bg-gray-200 dark:hover:bg-white/10"
                          >
                            Отмена
                          </button>
                          <button
                            onClick={handleUpdatePreset}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-lg text-[10px] hover:bg-cyan-500/30"
                          >
                            <Save className="w-3 h-3" />
                            Сохранить
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Режим просмотра */
                      <>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${preset.color}`}>
                          {preset.name}
                        </span>
                        <span className="flex-1 text-[10px] text-gray-400 dark:text-white/40 truncate">
                          {preset.source} / {preset.medium}
                        </span>
                        <button
                          onClick={() => setEditingPreset(preset)}
                          className="p-1.5 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeletePreset(preset.id)}
                          className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
          <>
          {/* Пресеты */}
          <div>
            <label className="block text-[10px] text-gray-400 dark:text-white/40 mb-2">Быстрые пресеты</label>
            <div className="flex flex-wrap gap-1">
              {presets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                    selectedPreset === preset.id 
                      ? preset.color
                      : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                  title={preset.description}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'single' && (
            <>
              {/* URL */}
              <div>
                <label className="block text-[10px] text-gray-400 dark:text-white/40 mb-1">URL страницы</label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://vs-travel.ru/tour/123"
                  className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                />
              </div>

              {/* UTM параметры */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 dark:text-white/40 mb-1">source *</label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => { setSource(e.target.value); setSelectedPreset(null) }}
                    placeholder="yandex"
                    className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 dark:text-white/40 mb-1">medium *</label>
                  <input
                    type="text"
                    value={medium}
                    onChange={(e) => { setMedium(e.target.value); setSelectedPreset(null) }}
                    placeholder="cpc"
                    className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 dark:text-white/40 mb-1">campaign *</label>
                <input
                  type="text"
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                  placeholder="summer_sale"
                  className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400/70 dark:text-white/30 mb-1">term</label>
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="keyword"
                    className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400/70 dark:text-white/30 mb-1">content</label>
                  <input
                    type="text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="banner_1"
                    className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                  />
                </div>
              </div>

              {/* Отслеживание */}
              <div className="pt-3 border-t border-gray-200 dark:border-white/10">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={enableTracking}
                    onChange={(e) => setEnableTracking(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#22D3EE]"
                  />
                  <span className="text-xs font-medium text-gray-700 dark:text-white">Отслеживать</span>
                  <TrendingUp className="w-3.5 h-3.5 text-[#22D3EE]" />
                </label>
                
                {enableTracking && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 dark:text-white/40 mb-1">Название</label>
                      <input
                        type="text"
                        value={trackingTitle}
                        onChange={(e) => setTrackingTitle(e.target.value)}
                        placeholder="Пост про летние туры"
                        className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 dark:text-white/40 mb-1">Платформа</label>
                      <select
                        value={trackingPlatform}
                        onChange={(e) => setTrackingPlatform(e.target.value)}
                        className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50"
                      >
                        {PLATFORMS.map(p => (
                          <option key={p.id} value={p.id} className="bg-white dark:bg-[#1a1a1a]">{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          
          {activeTab === 'bulk' && (
            <>
              {/* Массовая генерация */}
              <div>
                <label className="block text-[10px] text-gray-400 dark:text-white/40 mb-1">URL страниц (по одному на строку)</label>
                <textarea
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  placeholder={`https://vs-travel.ru/tour/123\nhttps://vs-travel.ru/tour/456\nhttps://vs-travel.ru/tour/789`}
                  rows={6}
                  className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-gray-400 dark:placeholder:text-white/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 dark:text-white/40 mb-1">source *</label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="yandex"
                    className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 dark:text-white/40 mb-1">medium *</label>
                  <input
                    type="text"
                    value={medium}
                    onChange={(e) => setMedium(e.target.value)}
                    placeholder="cpc"
                    className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 dark:text-white/40 mb-1">campaign *</label>
                <input
                  type="text"
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                  placeholder="summer_sale"
                  className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400/70 dark:text-white/30 mb-1">term</label>
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="keyword"
                    className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400/70 dark:text-white/30 mb-1">content</label>
                  <input
                    type="text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="banner_1"
                    className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-gray-400 dark:placeholder:text-white/30"
                  />
                </div>
              </div>

              <button
                onClick={generateBulkUrls}
                className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/15 transition-colors shadow-sm dark:shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
              >
                Сгенерировать
              </button>
            </>
          )}

          {(activeTab === 'single' || activeTab === 'bulk') && (
          <button
            onClick={clearForm}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/60 text-xs hover:bg-gray-200 dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Очистить
          </button>
          )}
          </>
          )}
        </div>
      </div>

      {/* Правая панель - Результат */}
      <div className="flex-1 flex flex-col gap-4">
        <div 
          className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-lg dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden flex flex-col"
          style={{ maxHeight: activeTab === 'single' ? '320px' : undefined, flex: activeTab === 'single' ? '0 0 auto' : '1' }}
        >
          <div className="p-3 border-b border-gray-200 dark:border-white/10">
            <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
              <Link2 className="w-4 h-4 text-[#22D3EE]" />
              {activeTab === 'single' ? 'Сгенерированная ссылка' : activeTab === 'bulk' ? 'Результат массовой генерации' : 'Настройки пресетов'}
            </h3>
          </div>

          <div className="flex-1 p-4 flex flex-col overflow-hidden">
            {activeTab === 'settings' ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Settings className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-white/10" />
                  <h3 className="text-lg font-medium text-gray-500 dark:text-white/50 mb-2">Настройки пресетов</h3>
                  <p className="text-sm text-gray-400 dark:text-white/30 max-w-md">
                    Управляйте пресетами в панели слева
                  </p>
                </div>
              </div>
            ) : activeTab === 'single' ? (
              generatedUrl ? (
                <div className="flex flex-col">
                  <div className="rounded-xl p-3 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/5 mb-3 overflow-auto max-h-32">
                    <p className="text-sm font-mono break-all text-cyan-600 dark:text-[#22D3EE]">
                      {generatedUrl}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={copyAndTrack}
                      disabled={isCreating || (enableTracking && !trackingTitle)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm dark:shadow-[0_1px_2px_rgba(0,0,0,0.3)] ${
                        isCopied 
                          ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30' 
                          : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/10'
                      }`}
                    >
                      {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {isCreating ? 'Сохранение...' : isCopied ? 'Скопировано!' : enableTracking ? 'Копировать и сохранить' : 'Копировать'}
                    </button>
                    <button 
                      onClick={() => window.open(generatedUrl, '_blank')}
                      className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                      title="Открыть в новой вкладке"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Link2 className="w-12 h-12 mx-auto mb-3 text-gray-200 dark:text-white/10" />
                    <h3 className="text-sm font-medium text-gray-500 dark:text-white/50 mb-1">Введите URL</h3>
                    <p className="text-xs text-gray-400 dark:text-white/30 max-w-xs">
                      Заполните URL и UTM-параметры слева
                    </p>
                  </div>
                </div>
              )
            ) : (
              bulkResults.length > 0 ? (
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 rounded-xl p-4 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/5 mb-4 overflow-auto">
                    {bulkResults.map((url, idx) => (
                      <p key={idx} className="text-xs font-mono break-all text-cyan-600 dark:text-[#22D3EE] mb-1">
                        {url}
                      </p>
                    ))}
                  </div>
                  
                  <button 
                    onClick={copyBulkResults}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm dark:shadow-[0_1px_2px_rgba(0,0,0,0.3)] ${
                      bulkCopied 
                        ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30' 
                        : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/10'
                    }`}
                  >
                    {bulkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {bulkCopied ? 'Скопировано!' : `Копировать все (${bulkResults.length})`}
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Layers className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-white/10" />
                    <h3 className="text-lg font-medium text-gray-500 dark:text-white/50 mb-2">Массовая генерация</h3>
                    <p className="text-sm text-gray-400 dark:text-white/30 max-w-md">
                      Введите несколько URL и UTM-параметры, затем нажмите "Сгенерировать"
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
