'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

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

interface PredefinedTemplate {
  name: string
  source: string
  medium: string
  category: 'social' | 'ads' | 'email'
  description?: string
  additionalParams?: string[]
}

export default function UTMGeneratorPage() {
  const [templates, setTemplates] = useState<UTMTemplate[]>([])
  const [predefinedTemplates] = useState<PredefinedTemplate[]>([
    // Яндекс платформы
    { 
      name: 'Яндекс.Метрика', 
      source: 'yandex', 
      medium: 'metrica', 
      category: 'ads',
      description: 'utm_source, utm_medium, utm_campaign, yclid',
      additionalParams: ['yclid']
    },
    { 
      name: 'Яндекс.Директ', 
      source: 'yandex', 
      medium: 'cpc', 
      category: 'ads',
      description: 'utm_source=yandex, utm_medium=cpc, utm_campaign'
    },
    { 
      name: 'Яндекс Бизнес', 
      source: 'yandex_business', 
      medium: 'cpc', 
      category: 'ads' 
    },
    { 
      name: 'Яндекс.Дзен', 
      source: 'dzen', 
      medium: 'social', 
      category: 'social' 
    },
    
    // Google платформы
    { 
      name: 'Google Ads', 
      source: 'google', 
      medium: 'cpc', 
      category: 'ads',
      description: 'utm_source=google, utm_medium=cpc, utm_campaign, gclid',
      additionalParams: ['gclid']
    },
    
    // Facebook/Meta
    { 
      name: 'Facebook Ads', 
      source: 'facebook', 
      medium: 'cpc', 
      category: 'ads',
      description: 'utm_source=facebook, utm_medium=cpc, utm_campaign, fbclid',
      additionalParams: ['fbclid']
    },
    
    // Социальные сети
    { 
      name: 'ВКонтакте', 
      source: 'vk', 
      medium: 'social', 
      category: 'social' 
    },
    { 
      name: 'Telegram', 
      source: 'telegram', 
      medium: 'social', 
      category: 'social' 
    },
    
    // Email
    { 
      name: 'Email рассылка', 
      source: 'email', 
      medium: 'email', 
      category: 'email' 
    },
  ])
  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    source: '',
    medium: '',
    campaign: '',
    term: '',
    content: '',
    status: 'active' as 'active' | 'draft',
    enableTracking: false,
    trackingFolder: 'social' as 'social' | 'ads' | 'email' | 'other'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all')

  useEffect(() => {
    loadTemplates()
    
    // Проверяем URL параметры для предзаполнения формы
    const params = new URLSearchParams(window.location.search)
    const source = params.get('source')
    const medium = params.get('medium')
    const name = params.get('name')
    
    if (source || medium || name) {
      setFormData(prev => ({
        ...prev,
        source: source || prev.source,
        medium: medium || prev.medium,
        name: name || prev.name
      }))
    }
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

  const createTemplate = async () => {
    if (!formData.name || !formData.baseUrl || !formData.source || !formData.medium || !formData.campaign) {
      alert('Заполните обязательные поля!')
      return
    }

    try {
      const response = await apiFetch('/api/utm-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          createdAt: new Date().toISOString()
        })
      })

      if (response.ok) {
        const createdTemplate = await response.json()
        
        // Сохраняем в историю
        const username = localStorage.getItem('username') || 'Unknown'
        const generatedUrl = generateUTMUrl(createdTemplate)
        
        try {
          await apiFetch('/api/utm-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: generatedUrl,
              source: formData.source,
              medium: formData.medium,
              campaign: formData.campaign,
              term: formData.term || null,
              content: formData.content || null,
              username: username
            })
          })
        } catch (historyError) {
          console.error('Ошибка сохранения в историю:', historyError)
        }
        
        // Если включено отслеживание, добавляем в трекер
        if (formData.enableTracking) {
          await apiFetch('/api/tracked-posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              platform: formData.source,
              postUrl: formData.baseUrl,
              title: formData.name,
              utmTemplate: createdTemplate.id,
              createdAt: new Date().toISOString(),
              clicks: 0,
              views: 0,
              conversions: 0
            })
          })
        }
        
        await loadTemplates()
        setFormData({
          name: '',
          baseUrl: '',
          source: '',
          medium: '',
          campaign: '',
          term: '',
          content: '',
          status: 'active',
          enableTracking: false,
          trackingFolder: 'social'
        })
        alert('UTM метка успешно создана' + (formData.enableTracking ? ' и добавлена в трекер' : ''))
      }
    } catch (error) {
      console.error('Ошибка создания шаблона:', error)
      alert('Ошибка создания шаблона')
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Удалить этот UTM шаблон?')) return

    try {
      const response = await apiFetch(`/api/utm-templates/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadTemplates()
      }
    } catch (error) {
      console.error('Ошибка удаления шаблона:', error)
    }
  }

  const generateUTMUrl = (template: UTMTemplate): string => {
    const params = new URLSearchParams()
    params.append('utm_source', template.source)
    params.append('utm_medium', template.medium)
    params.append('utm_campaign', template.campaign)
    if (template.term) params.append('utm_term', template.term)
    if (template.content) params.append('utm_content', template.content)

    const baseUrl = template.baseUrl || ''
    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}${params.toString()}`
  }

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Скопировано в буфер обмена!')
      }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea')
        textarea.value = text
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        alert('Скопировано в буфер обмена!')
      })
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      alert('Скопировано в буфер обмена!')
    }
  }

  const handleTemplateChange = (templateName: string) => {
    if (templateName === '') {
      setFormData(prev => ({ ...prev, source: '', medium: '', name: '' }))
      return
    }
    
    const template = predefinedTemplates.find(t => t.name === templateName)
    if (template) {
      let additionalInfo = ''
      if (template.additionalParams && template.additionalParams.length > 0) {
        additionalInfo = ` (автоматически добавляется: ${template.additionalParams.join(', ')})`
      }
      
      setFormData(prev => ({
        ...prev,
        source: template.source,
        medium: template.medium,
        trackingFolder: template.category,
        name: prev.name || `${template.name}${additionalInfo}`
      }))
    }
  }

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.campaign.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 border-green-400'
      case 'draft': return 'text-yellow-400 border-yellow-400'
      default: return 'text-gray-400 border-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Активный'
      case 'draft': return 'Черновик'
      default: return 'Неизвестно'
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            Генератор UTM меток
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            Создавайте и управляйте UTM метками для отслеживания рекламных кампаний
          </p>
        </div>
      </div>

      {/* Форма создания */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Создание UTM метки</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Шаблон</label>
              <select
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="input-field w-full"
              >
                <option value="">Без шаблона</option>
                <optgroup label="Реклама">
                  {predefinedTemplates.filter(t => t.category === 'ads').map(t => (
                    <option key={t.source + t.medium} value={t.name}>
                      {t.name} {t.description ? `— ${t.description}` : ''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Социальные сети">
                  {predefinedTemplates.filter(t => t.category === 'social').map(t => (
                    <option key={t.source + t.medium} value={t.name}>
                      {t.name} {t.description ? `— ${t.description}` : ''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Email">
                  {predefinedTemplates.filter(t => t.category === 'email').map(t => (
                    <option key={t.source + t.medium} value={t.name}>
                      {t.name} {t.description ? `— ${t.description}` : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Название *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: ВК осенняя кампания"
                className="input-field w-full"
              />
            </div>
          </div>

          {/* Информация о выбранном шаблоне */}
          {formData.source && formData.medium && (
            <div className="mb-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-start gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400 flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <div className="text-sm">
                  <p className="font-medium mb-1">Параметры шаблона:</p>
                  <p className="opacity-70">
                    <span className="font-mono">utm_source={formData.source}</span>
                    {', '}
                    <span className="font-mono">utm_medium={formData.medium}</span>
                    {', '}
                    <span className="font-mono">utm_campaign=(ваша кампания)</span>
                  </p>
                  {predefinedTemplates.find(t => t.source === formData.source && t.medium === formData.medium)?.additionalParams && (
                    <p className="opacity-70 mt-1">
                      <span className="text-yellow-400">Автоматически добавляется: </span>
                      {predefinedTemplates.find(t => t.source === formData.source && t.medium === formData.medium)?.additionalParams?.map(param => (
                        <span key={param} className="font-mono">{param} </span>
                      ))}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Статус</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'draft' })}
                className="input-field w-full"
              >
                <option value="active">Активный</option>
                <option value="draft">Черновик</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Базовый URL *</label>
              <input
                type="text"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                placeholder="https://example.com/page"
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">utm_source *</label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="vk, google, yandex"
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">utm_medium *</label>
              <input
                type="text"
                value={formData.medium}
                onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
                placeholder="cpc, social, email"
                className="input-field w-full"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">utm_campaign *</label>
              <input
                type="text"
                value={formData.campaign}
                onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                placeholder="autumn_sale_2025"
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">utm_term (опционально)</label>
              <input
                type="text"
                value={formData.term}
                onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                placeholder="ключевое слово"
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">utm_content (опционально)</label>
              <input
                type="text"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="вариант объявления"
                className="input-field w-full"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.enableTracking}
                  onChange={(e) => setFormData({ ...formData, enableTracking: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Включить отслеживание</span>
              </label>
            </div>

            {formData.enableTracking && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Папка для отслеживания</label>
                <select
                  value={formData.trackingFolder}
                  onChange={(e) => setFormData({ ...formData, trackingFolder: e.target.value as 'social' | 'ads' | 'email' | 'other' })}
                  className="input-field w-full"
                >
                  <option value="social">Социальные сети</option>
                  <option value="ads">Реклама</option>
                  <option value="email">Email рассылки</option>
                  <option value="other">Другое</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={createTemplate} className="btn-primary">
              Создать UTM метку
            </button>
          </div>
        </div>

      {/* Поиск и фильтры */}
      <div className="card mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <input
              type="text"
              className="input-field w-full"
              placeholder="Поиск UTM меток..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'draft')}
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="draft">Черновики</option>
          </select>
        </div>
      </div>

      {/* Список шаблонов */}
      <div className="space-y-4">
        {filteredTemplates.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-[var(--button)] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--background)" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Нет UTM меток</h3>
            <p className="text-[var(--foreground)] opacity-70 mb-6">
              Создайте первую UTM метку или используйте готовый шаблон
            </p>
          </div>
        ) : (
          filteredTemplates.map(template => {
            const generatedUrl = generateUTMUrl(template)

            return (
              <div key={template.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{template.name}</h3>
                      <span className={`px-2 py-1 text-xs border rounded ${getStatusColor(template.status)}`}>
                        {getStatusText(template.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm opacity-70 mb-4">
                      <div>
                        <span className="font-medium">Source:</span> {template.source}
                      </div>
                      <div>
                        <span className="font-medium">Medium:</span> {template.medium}
                      </div>
                      <div>
                        <span className="font-medium">Campaign:</span> {template.campaign}
                      </div>
                    </div>

                    <div className="card mb-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                      <p className="text-xs opacity-70 mb-1">Сгенерированная ссылка:</p>
                      <p className="text-sm font-mono break-all">{generatedUrl}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => copyToClipboard(generatedUrl)}
                      className="btn-primary text-sm flex items-center"
                      title="Копировать"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      Копировать
                    </button>

                    <button
                      onClick={() => window.open(generatedUrl, '_blank')}
                      className="btn-secondary text-sm flex items-center"
                      title="Открыть"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                      Открыть
                    </button>

                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="btn-secondary text-sm flex items-center"
                      title="Удалить"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
