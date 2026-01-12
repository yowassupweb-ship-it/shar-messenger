'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { showToast } from '@/components/Toast'
import { apiFetch } from '@/lib/api'

interface TourField {
  name: string
  label: string
  type: 'text' | 'number' | 'textarea' | 'url'
  required: boolean
  description: string
}

interface Template {
  id: string
  name: string
  description: string
  type: string
  content: any
  fields?: TourField[]
  createdAt?: string
  updatedAt?: string
}

const tourFields: TourField[] = [
  { name: 'price', label: 'Цена', type: 'number', required: true, description: 'Стоимость тура' },
  { name: 'old_price', label: 'Старая цена', type: 'number', required: false, description: 'Зачеркнутая цена для акций' },
  { name: 'tour_name', label: 'Название тура', type: 'text', required: true, description: 'Полное название тура' },
  { name: 'route', label: 'Маршрут', type: 'text', required: true, description: 'Маршрут путешествия' },
  { name: 'duration', label: 'Количество дней', type: 'number', required: true, description: 'Продолжительность тура в днях' },
  { name: 'description', label: 'Описание', type: 'textarea', required: true, description: 'Подробное описание тура' },
  { name: 'image_url', label: 'URL фото', type: 'url', required: false, description: 'Ссылка на основное фото тура' }
]

// Удалены дефолтные шаблоны - теперь загружаются с сервера

const defaultTemplates_removed: any[] = [
  {
    id: '1',
    name: 'XML для Google Travel',
    description: 'Шаблон XML фида для Google Travel Partner',
    format: 'XML',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<tours>
  <tour>
    <id>{{id}}</id>
    <name>{{tour_name}}</name>
    <description>{{description}}</description>
    <route>{{route}}</route>
    <duration>{{duration}}</duration>
    <price currency="RUB">{{price}}</price>
    {{#old_price}}<old_price currency="RUB">{{old_price}}</old_price>{{/old_price}}
    {{#image_url}}<image>{{image_url}}</image>{{/image_url}}
    <url>{{url}}</url>
  </tour>
</tours>`,
    fields: tourFields,
    lastModified: new Date()
  },
  {
    id: '2',
    name: 'JSON для API',
    description: 'JSON формат для REST API интеграций',
    format: 'JSON',
    content: `{
  "tours": [
    {
      "id": "{{id}}",
      "name": "{{tour_name}}",
      "description": "{{description}}",
      "route": "{{route}}",
      "duration": {{duration}},
      "price": {{price}},
      {{#old_price}}"old_price": {{old_price}},{{/old_price}}
      {{#image_url}}"image_url": "{{image_url}}",{{/image_url}}
      "url": "{{url}}"
    }
  ]
}`,
    fields: tourFields,
    lastModified: new Date()
  }
]

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    type: 'feed',
    content: ''
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const yandexDirectTemplate = {
    id: 'yandex-direct-default',
    name: 'Яндекс.Директ',
    description: 'Готовый YML шаблон для Яндекс.Директ с обязательными полями',
    type: 'feed',
    fields: [],
    content: `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="{{date}}">
  <shop>
    <name>{{shop_name}}</name>
    <company>{{company_name}}</company>
    <url>{{shop_url}}</url>
    <currencies>
      <currency id="RUB" rate="1"/>
    </currencies>
    <categories>
      {{#categories}}
      <category id="{{id}}">{{name}}</category>
      {{/categories}}
    </categories>
    <offers>
      {{#offers}}
      <offer id="{{id}}" available="true">
        <url>{{url}}</url>
        <price>{{price}}</price>
        <currencyId>RUB</currencyId>
        <categoryId>{{categoryId}}</categoryId>
        <picture>{{picture}}</picture>
        <name>{{name}}</name>
        <description>{{route}}</description>
      </offer>
      {{/offers}}
    </offers>
  </shop>
</yml_catalog>`,
    createdAt: new Date().toISOString(),
    isDefault: true
  }

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/api/templates?type=feed')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки шаблонов:', error)
      showToast('Ошибка загрузки шаблонов', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    try {
      const response = await apiFetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate)
      })

      if (response.ok) {
        await loadTemplates()
        setNewTemplate({ name: '', description: '', type: 'feed', content: '' })
        setShowCreateModal(false)
        showToast('Шаблон создан', 'success')
      }
    } catch (error) {
      console.error('Ошибка создания шаблона:', error)
      showToast('Ошибка создания шаблона', 'error')
    }
  }

  const handleEditTemplate = async () => {
    if (!selectedTemplate) return
    
    try {
      const response = await apiFetch(`/api/templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedTemplate.name,
          description: selectedTemplate.description,
          content: selectedTemplate.content
        })
      })

      if (response.ok) {
        await loadTemplates()
        setShowEditModal(false)
        showToast('Шаблон обновлен', 'success')
      }
    } catch (error) {
      console.error('Ошибка обновления шаблона:', error)
      showToast('Ошибка обновления шаблона', 'error')
    }
  }

  const deleteTemplate = async (id: string) => {
    try {
      const response = await apiFetch(`/api/templates/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadTemplates()
        if (selectedTemplate?.id === id) {
          setSelectedTemplate(null)
        }
        showToast('Шаблон удален', 'success')
      }
    } catch (error) {
      console.error('Ошибка удаления шаблона:', error)
      showToast('Ошибка удаления шаблона', 'error')
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div>
      {/* Навигация */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/" className="text-cyan-400 hover:underline">
          Инструменты
        </Link>
        <span className="text-white/50">/</span>
        <Link href="/feed-editor" className="text-cyan-400 hover:underline">
          Редактор фидов
        </Link>
        <span className="text-white/50">/</span>
        <span className="text-white">Шаблоны</span>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Шаблоны фидов
          </h1>
          <p className="text-white/50">
            Управление шаблонами для генерации фидов туров в разных форматах
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            className="p-3 bg-white/5 hover:bg-cyan-500/20 text-white rounded-lg transition-colors border border-white/10"
            onClick={() => setShowHelpModal(true)}
            title="Справка по требованиям Яндекса"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2 2-2.5 2.5"/>
              <circle cx="12" cy="17" r="0.5" fill="currentColor"/>
            </svg>
          </button>
          <button 
            className="bg-cyan-500/20 text-cyan-400 px-6 py-2 rounded-lg hover:bg-cyan-500/30 transition-colors whitespace-nowrap flex items-center gap-2 border border-cyan-500/30"
            onClick={() => setShowCreateModal(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Создать шаблон
          </button>
        </div>
      </div>

      {/* Горизонтальная галерея шаблонов */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-4">
          Шаблоны ({(templates?.length || 0) + 1})
        </h2>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {/* Yandex Direct Default Template */}
            <div 
              onClick={() => setSelectedTemplate(yandexDirectTemplate as any)}
              className={`flex-shrink-0 w-80 p-6 rounded-lg cursor-pointer transition-all bg-[#1a1a1a] ${
                selectedTemplate?.id === yandexDirectTemplate.id 
                  ? 'border-2 border-cyan-500/50 bg-cyan-500/10' 
                  : 'border-2 border-white/10 hover:border-cyan-500/30'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate mb-1">{yandexDirectTemplate.name}</h3>
                  <p className="text-sm text-white/50 mb-2 line-clamp-2">{yandexDirectTemplate.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>Базовый шаблон</span>
                <span className="px-2 py-1 bg-[#0d0d0d] rounded">YML</span>
              </div>
            </div>

            {(templates || []).map((template) => (
              <div 
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`flex-shrink-0 w-80 p-6 rounded-lg cursor-pointer transition-all bg-[#1a1a1a] ${
                  selectedTemplate?.id === template.id 
                    ? 'border-2 border-cyan-500/50 bg-cyan-500/10' 
                    : 'border-2 border-white/10 hover:border-cyan-500/30'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white mb-1 truncate">{template.name}</h3>
                    <p className="text-sm text-white/50 mb-2 line-clamp-2">{template.description}</p>
                  </div>
                  <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setSelectedTemplate(template)
                        setShowEditModal(true)
                      }}
                      className="p-1 hover:bg-white/10 rounded"
                      title="Редактировать"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Удалить шаблон?')) {
                          deleteTemplate(template.id)
                        }
                      }}
                      className="p-1 hover:bg-red-500/20 text-red-500 rounded"
                      title="Удалить"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded">
                    {template.type}
                  </span>
                  <span className="text-xs text-white/40">
                    {template.updatedAt ? new Date(template.updatedAt).toLocaleDateString('ru-RU') : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Редактор шаблона */}
      {selectedTemplate ? (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">{selectedTemplate.name}</h2>
              <p className="text-white/50">{selectedTemplate.description}</p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 text-sm bg-cyan-500/20 text-cyan-400 rounded">
                {selectedTemplate.type}
              </span>
              <button
                onClick={() => setShowEditModal(true)}
                className="px-3 py-1 text-sm bg-white/5 hover:bg-white/10 text-white rounded border border-white/10 transition-colors"
              >
                Редактировать
              </button>
            </div>
          </div>

          {/* Доступные поля */}
          {selectedTemplate.fields && selectedTemplate.fields.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-white">Доступные поля</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedTemplate.fields.map((field) => (
                <div key={field.name} className="p-3 bg-[#0d0d0d] rounded-lg border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-mono text-cyan-400">&#123;&#123;{field.name}&#125;&#125;</code>
                    {field.required && (
                      <span className="text-xs text-red-500">*</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-white">{field.label}</p>
                  <p className="text-xs text-white/50">{field.description}</p>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Содержимое шаблона */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-white">Содержимое шаблона</h3>
            <div className="bg-[#0d0d0d] p-4 rounded-lg border border-white/10">
              <pre className="text-sm font-mono whitespace-pre-wrap overflow-auto text-white/70">
                {typeof selectedTemplate.content === 'string' 
                  ? selectedTemplate.content 
                  : selectedTemplate.content?.template || ''}
              </pre>
            </div>
            <div className="flex gap-2 mt-3">
              <button 
                className="px-3 py-2 text-sm bg-white/5 hover:bg-white/10 text-white rounded border border-white/10 transition-colors"
                onClick={() => {
                  const contentText = typeof selectedTemplate.content === 'string' 
                    ? selectedTemplate.content 
                    : selectedTemplate.content?.template || '';
                  navigator.clipboard.writeText(contentText);
                }}
              >
                Скопировать
              </button>
              <button 
                className="px-3 py-2 text-sm bg-white/5 hover:bg-white/10 text-white rounded border border-white/10 transition-colors"
                onClick={() => {
                  const contentText = typeof selectedTemplate.content === 'string' 
                    ? selectedTemplate.content 
                    : selectedTemplate.content?.template || '';
                  const blob = new Blob([contentText], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${selectedTemplate.name}.txt`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                Скачать
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6">
          <div className="text-center py-12">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-4 text-white/30">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <p className="text-white/50">
              Выберите шаблон для просмотра
            </p>
          </div>
        </div>
      )}

      {/* Модальное окно создания шаблона */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Создать шаблон</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-white/10 text-white/50 hover:text-white rounded transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateTemplate(); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Название шаблона *</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                    placeholder="Название шаблона"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">Описание</label>
                <textarea 
                  className="w-full h-20 px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                  placeholder="Описание шаблона"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">Содержимое шаблона *</label>
                <textarea 
                  className="w-full h-64 px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
                  placeholder="Введите содержимое шаблона..."
                  required
                />
                <div className="mt-2 p-3 bg-[#0d0d0d] border border-white/10 rounded-lg">
                  <p className="text-xs font-medium text-white mb-2">Доступные переменные:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-white/50">
                    <code>{'{{id}}'}</code>
                    <code>{'{{name}}'}</code>
                    <code>{'{{price}}'}</code>
                    <code>{'{{oldPrice}}'}</code>
                    <code>{'{{url}}'}</code>
                    <code>{'{{picture}}'}</code>
                    <code>{'{{route}}'}</code>
                    <code>{'{{days}}'}</code>
                    <code>{'{{categoryId}}'}</code>
                    <code>{'{{utmSource}}'}</code>
                    <code>{'{{utmMedium}}'}</code>
                    <code>{'{{utmCampaign}}'}</code>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="px-6 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors border border-cyan-500/30">
                  Создать шаблон
                </button>
                <button 
                  type="button" 
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-colors"
                  onClick={() => setShowCreateModal(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования */}
      {showEditModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Редактировать шаблон</h2>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-white/10 text-white/50 hover:text-white rounded transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleEditTemplate(); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Название шаблона *</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
                    value={selectedTemplate.name}
                    onChange={(e) => setSelectedTemplate({...selectedTemplate, name: e.target.value})}
                    placeholder="Название шаблона"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">Описание</label>
                <textarea 
                  className="w-full h-20 px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
                  value={selectedTemplate.description}
                  onChange={(e) => setSelectedTemplate({...selectedTemplate, description: e.target.value})}
                  placeholder="Описание шаблона"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">Содержимое шаблона *</label>
                <textarea 
                  className="w-full h-64 px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
                  value={typeof selectedTemplate.content === 'string' 
                    ? selectedTemplate.content 
                    : selectedTemplate.content?.template || ''}
                  onChange={(e) => {
                    if (typeof selectedTemplate.content === 'string') {
                      setSelectedTemplate({...selectedTemplate, content: e.target.value})
                    } else {
                      setSelectedTemplate({
                        ...selectedTemplate, 
                        content: {
                          ...selectedTemplate.content,
                          template: e.target.value
                        }
                      })
                    }
                  }}
                  placeholder="Введите содержимое шаблона..."
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="px-6 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors border border-cyan-500/30">
                  Сохранить изменения
                </button>
                <button 
                  type="button" 
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-colors"
                  onClick={() => setShowEditModal(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Справка по YML фидам для Яндекс.Директ</h2>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="p-2 hover:bg-white/10 text-white/50 hover:text-white rounded transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Основная информация */}
              <div>
                <h3 className="text-xl font-semibold mb-3 text-cyan-400">Основные требования</h3>
                <ul className="list-disc list-inside space-y-2 text-white/70">
                  <li>Каждый товар должен иметь уникальный ID</li>
                  <li>ID товаров должны совпадать во всех фидах (YML, Google Shopping и т.д.)</li>
                  <li>Дата генерации фида должна быть в формате YYYY-MM-DD hh:mm</li>
                  <li>Корневой элемент: <code className="bg-[#0d0d0d] px-2 py-1 rounded">&lt;yml_catalog&gt;</code></li>
                </ul>
              </div>

              {/* Типы описания */}
              <div>
                <h3 className="text-xl font-semibold mb-3 text-cyan-400">Типы описания товара</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#0d0d0d] border border-white/10 rounded-lg p-4">
                    <h4 className="font-semibold mb-2 text-white">Упрощенный</h4>
                    <code className="text-sm text-cyan-400">&lt;name&gt;</code>
                    <p className="text-xs mt-2 text-white/50">Только название товара</p>
                  </div>
                  <div className="bg-[#0d0d0d] border border-white/10 rounded-lg p-4">
                    <h4 className="font-semibold mb-2 text-white">Произвольный</h4>
                    <code className="text-sm text-cyan-400">&lt;vendor&gt; + &lt;model&gt;</code>
                    <p className="text-xs mt-2 text-white/50">Производитель и модель</p>
                  </div>
                  <div className="bg-[#0d0d0d] border border-white/10 rounded-lg p-4">
                    <h4 className="font-semibold mb-2 text-white">Комбинированный ⭐</h4>
                    <code className="text-sm text-cyan-400">name + vendor + model</code>
                    <p className="text-xs mt-2 text-white/50">Рекомендуется для лучшей релевантности</p>
                  </div>
                </div>
              </div>

              {/* Обязательные элементы */}
              <div>
                <h3 className="text-xl font-semibold mb-3 text-cyan-400">Обязательные элементы offer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <div>
                      <code className="text-sm text-cyan-400">id</code>
                      <p className="text-xs text-white/50">Уникальный идентификатор (до 100 символов)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <div>
                      <code className="text-sm text-cyan-400">url</code>
                      <p className="text-xs text-white/50">Ссылка на страницу товара (до 2048 символов)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <div>
                      <code className="text-sm text-cyan-400">price</code>
                      <p className="text-xs text-white/50">Цена товара</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <div>
                      <code className="text-sm text-cyan-400">currencyId</code>
                      <p className="text-xs text-white/50">Валюта (RUB, USD, EUR и т.д.)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <div>
                      <code className="text-sm text-cyan-400">categoryId</code>
                      <p className="text-xs text-white/50">ID категории товара</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <div>
                      <code className="text-sm text-cyan-400">picture</code>
                      <p className="text-xs text-white/50">Изображение (от 450px, до 5 шт)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Рекомендуемые элементы */}
              <div>
                <h3 className="text-xl font-semibold mb-3 text-cyan-400">Рекомендуемые элементы</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400">★</span>
                    <div>
                      <code className="text-sm text-cyan-400">oldprice</code>
                      <p className="text-xs text-white/50">Старая цена (для показа скидки от 5%)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400">★</span>
                    <div>
                      <code className="text-sm text-cyan-400">description</code>
                      <p className="text-xs text-white/50">Описание товара (до 512 символов)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400">★</span>
                    <div>
                      <code className="text-sm text-cyan-400">vendorCode</code>
                      <p className="text-xs text-white/50">Код производителя/артикул</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400">★</span>
                    <div>
                      <code className="text-sm text-cyan-400">param</code>
                      <p className="text-xs text-white/50">Параметры: материал, цвет, пол, размер</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Коллекции */}
              <div>
                <h3 className="text-xl font-semibold mb-3 text-cyan-400">Коллекции (Collections)</h3>
                <p className="text-sm text-white/70 mb-3">
                  Используются для комбинированного формата объявлений в Единой перфоманс-кампании
                </p>
                <div className="bg-[#0d0d0d] border border-white/10 p-4 rounded-lg">
                  <code className="text-sm block whitespace-pre">{`<collections>
  <collection id="catalog_001">
    <url>https://site.ru/catalog/tours</url>
    <picture>https://site.ru/img/1.jpg</picture>
    <name>Туры по Крыму</name>
    <description>Лучшие туры</description>
  </collection>
</collections>

<!-- В офере указываем связь -->
<offer id="tour_001">
  ...
  <collectionId>catalog_001</collectionId>
</offer>`}</code>
                </div>
              </div>

              {/* Полезные ссылки */}
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-lg font-semibold mb-3 text-white">Полезные ссылки</h3>
                <div className="space-y-2">
                  <a 
                    href="https://yandex.ru/support/direct/feeds/requirements.html" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-cyan-400 hover:underline"
                  >
                    📖 Официальная документация Яндекс.Директ по YML
                  </a>
                  <a 
                    href="https://yandex.ru/support/partnermarket/export/yml.html" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-cyan-400 hover:underline"
                  >
                    📖 Формат YML на Яндекс.Маркет
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <button 
                className="w-full px-6 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors border border-cyan-500/30"
                onClick={() => setShowHelpModal(false)}
              >
                Понятно, спасибо!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}