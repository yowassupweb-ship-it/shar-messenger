'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

interface UTMTemplate {
  id: string
  name: string
  description: string
  template?: string  // Для обратной совместимости
  variables?: string[]  // Для обратной совместимости
  content?: {
    template: string
    variables: string[]
  }
  isDefault?: boolean
}

export default function UTMBuilderPage() {
  const [templates, setTemplates] = useState<UTMTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<UTMTemplate | null>(null)
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: ''
  })

  // Загрузка шаблонов из API
  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const response = await apiFetch('/api/templates?type=utm')
      const data = await response.json()
      setTemplates(data)
    } catch (error) {
      console.error('Ошибка загрузки шаблонов:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateURL = () => {
    return ''
  }

  const extractVariables = (template: string): string[] => {
    const matches = template.match(/{{([^}]+)}}/g)
    return matches ? matches.map(match => match.replace(/[{}]/g, '')) : []
  }

  const handleCreateTemplate = async () => {
    // Собираем UTM параметры в строку
    const utmParams = []
    if (newTemplate.utm_source) utmParams.push(`utm_source=${newTemplate.utm_source}`)
    if (newTemplate.utm_medium) utmParams.push(`utm_medium=${newTemplate.utm_medium}`)
    if (newTemplate.utm_campaign) utmParams.push(`utm_campaign=${newTemplate.utm_campaign}`)
    if (newTemplate.utm_term) utmParams.push(`utm_term=${newTemplate.utm_term}`)
    if (newTemplate.utm_content) utmParams.push(`utm_content=${newTemplate.utm_content}`)
    
    const template = utmParams.join('&')
    const variables = extractVariables(template)
    
    try {
      const response = await apiFetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplate.name,
          type: 'utm',
          description: newTemplate.description,
          content: {
            template,
            variables
          }
        })
      })
      
      if (response.ok) {
        await loadTemplates()
        setNewTemplate({ 
          name: '', 
          description: '', 
          utm_source: '',
          utm_medium: '',
          utm_campaign: '',
          utm_term: '',
          utm_content: ''
        })
        setShowCreateModal(false)
      }
    } catch (error) {
      console.error('Ошибка создания шаблона:', error)
    }
  }

  const handleEditTemplate = async () => {
    if (!editingTemplate || !editingTemplate.template) return
    
    const variables = extractVariables(editingTemplate.template)
    
    try {
      const response = await apiFetch(`/api/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingTemplate.name,
          description: editingTemplate.description,
          content: {
            template: editingTemplate.template,
            variables
          }
        })
      })
      
      if (response.ok) {
        await loadTemplates()
        setEditingTemplate(null)
        setShowEditModal(false)
      }
    } catch (error) {
      console.error('Ошибка обновления шаблона:', error)
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
      }
    } catch (error) {
      console.error('Ошибка удаления шаблона:', error)
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
        <span className="text-white">UTM шаблоны</span>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            UTM шаблоны
          </h1>
          <p className="text-white/70">
            Управление UTM шаблонами для автоматического добавления меток к ссылкам в фидах
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            className="bg-cyan-500 text-white px-6 py-2 rounded-lg hover:bg-cyan-500/90 transition-colors whitespace-nowrap flex items-center gap-2"
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
          Шаблоны ({templates?.length || 0})
        </h2>
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="text-white/70">Загрузка шаблонов...</div>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {templates.map((template) => (
          <div 
            key={template.id}
            className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6 hover:border-cyan-500 transition-colors relative"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-white text-lg flex-1 pr-2">
                {template.name}
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => openEditModal(template)}
                  className="p-1 hover:bg-[#0d0d0d] rounded transition-colors"
                  title="Редактировать"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template)}
                  className="p-1 hover:bg-red-500/10 text-red-500 rounded transition-colors"
                  title="Удалить"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            
            <p className="text-sm text-white/70 mb-3 line-clamp-1" title={template.description}>
              {template.description}
            </p>
            
            <div className="mb-3">
              <div className="text-xs font-medium text-white/60 mb-1">Шаблон:</div>
              <code className="text-xs bg-white/5 px-2 py-1 rounded block break-all">
                {template.content?.template || ''}
              </code>
            </div>
            
            <div>
              <div className="text-xs font-medium text-white/60 mb-1">Переменные:</div>
              <div className="flex flex-wrap gap-1">
                {(template.content?.variables || []).map((variable: string) => (
                  <span 
                    key={variable}
                    className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded"
                  >
                    {variable}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
      </div>

      {/* Модальное окно создания шаблона */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Создать шаблон UTM</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateTemplate(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Название шаблона *</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-cyan-500/50 focus:outline-none"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                  placeholder="Название шаблона"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Описание</label>
                <textarea 
                  className="w-full px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-cyan-500/50 focus:outline-none h-20"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                  placeholder="Описание шаблона UTM"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    UTM Source <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-cyan-500/50 focus:outline-none"
                    value={newTemplate.utm_source}
                    onChange={(e) => setNewTemplate({...newTemplate, utm_source: e.target.value})}
                    placeholder="google, yandex, facebook..."
                    required
                  />
                  <p className="text-xs text-white/60 mt-1">
                    Источник трафика
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    UTM Medium <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-cyan-500/50 focus:outline-none"
                    value={newTemplate.utm_medium}
                    onChange={(e) => setNewTemplate({...newTemplate, utm_medium: e.target.value})}
                    placeholder="cpc, banner, email..."
                    required
                  />
                  <p className="text-xs text-white/60 mt-1">
                    Канал трафика
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    UTM Campaign <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-cyan-500/50 focus:outline-none"
                    value={newTemplate.utm_campaign}
                    onChange={(e) => setNewTemplate({...newTemplate, utm_campaign: e.target.value})}
                    placeholder="{{campaign_name}}, summer_sale..."
                    required
                  />
                  <p className="text-xs text-white/60 mt-1">
                    Название кампании
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    UTM Term
                  </label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-cyan-500/50 focus:outline-none"
                    value={newTemplate.utm_term}
                    onChange={(e) => setNewTemplate({...newTemplate, utm_term: e.target.value})}
                    placeholder="{{keyword}}, купить обувь..."
                  />
                  <p className="text-xs text-white/60 mt-1">
                    Ключевое слово
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    UTM Content
                  </label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-cyan-500/50 focus:outline-none"
                    value={newTemplate.utm_content}
                    onChange={(e) => setNewTemplate({...newTemplate, utm_content: e.target.value})}
                    placeholder="{{product_id}}, banner1, link2..."
                  />
                  <p className="text-xs text-white/60 mt-1">
                    Идентификатор объявления/контента
                  </p>
                </div>
              </div>

              <div className="bg-[#0d0d0d] p-4 rounded-lg border border-white/10">
                <p className="text-sm font-medium mb-2">Предпросмотр:</p>
                <code className="text-xs text-cyan-400 break-all">
                  {[
                    newTemplate.utm_source && `utm_source=${newTemplate.utm_source}`,
                    newTemplate.utm_medium && `utm_medium=${newTemplate.utm_medium}`,
                    newTemplate.utm_campaign && `utm_campaign=${newTemplate.utm_campaign}`,
                    newTemplate.utm_term && `utm_term=${newTemplate.utm_term}`,
                    newTemplate.utm_content && `utm_content=${newTemplate.utm_content}`
                  ].filter(Boolean).join('&') || 'Заполните поля выше'}
                </code>
                <p className="text-xs text-white/60 mt-2">
                  💡 Используйте &#123;&#123;переменная&#125;&#125; для динамических значений
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="px-6 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 border border-cyan-500/30">
                  Создать шаблон
                </button>
                <button 
                  type="button" 
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10"
                  onClick={() => setShowCreateModal(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования шаблона */}
      {showEditModal && editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Редактировать шаблон UTM</h2>
              <button 
                onClick={() => setShowEditModal(false)}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleEditTemplate(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Название шаблона *</label>
                <input 
                  type="text" 
                  className="input-field w-full"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                  placeholder="Название шаблона"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Описание</label>
                <textarea 
                  className="input-field w-full h-20"
                  value={editingTemplate.description}
                  onChange={(e) => setEditingTemplate({...editingTemplate, description: e.target.value})}
                  placeholder="Описание шаблона UTM"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Шаблон UTM *</label>
                <textarea 
                  className="input-field w-full h-32"
                  value={editingTemplate.template}
                  onChange={(e) => setEditingTemplate({...editingTemplate, template: e.target.value})}
                  placeholder="utm_source=source&utm_medium=medium&utm_campaign={{campaign_name}}"
                  required
                />
                <p className="text-xs text-white/70 mt-1">
                  Используйте &#123;&#123;variable_name&#125;&#125; для переменных
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary">
                  Сохранить изменения
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}