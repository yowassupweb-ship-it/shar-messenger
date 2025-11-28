'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

interface Template {
  id: string
  name: string
  description?: string
  type: string
  content: string
  variables?: any[]
  isDefault?: boolean
  createdAt?: string
  updatedAt?: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  // Загрузка шаблонов из API
  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const response = await apiFetch('/api/templates')
      const data = await response.json()
      setTemplates(data)
    } catch (error) {
      console.error('Ошибка загрузки шаблонов:', error)
    } finally {
      setLoading(false)
    }
  }

  const [oldTemplates] = useState([
    {
      id: 'yandex_default',
      name: 'Яндекс.Директ (YML)',
      description: 'Официальный шаблон YML фида для Яндекс.Директ и Яндекс.Маркет',
      type: 'feed',
      content: `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="{{ current_date }}">
  <shop>
    <name>{{ shop_name }}</name>
    <company>{{ company_name }}</company>
    <url>{{ site_url }}</url>
    
    <currencies>
      <currency id="{{ currency }}" rate="1"/>
    </currencies>
    
    <categories>
      <category id="1">Многодневные туры</category>
    </categories>
    
    <offers>
      {% for product in products %}
      <offer id="{{ product.id }}" available="true">
        <url>{{ product.url }}</url>
        <price>{{ product.price }}</price>
        <currencyId>{{ currency }}</currencyId>
        <categoryId>1</categoryId>
        <picture>{{ product.image }}</picture>
        
        <name>{{ product.name }}</name>
        <vendor>{{ shop_name }}</vendor>
        <model>{{ product.model }}</model>
        
        <description>{{ product.description }}</description>
        
        {% if product.days %}
        <param name="Дней">{{ product.days }}</param>
        {% endif %}
        
        {% if product.route %}
        <param name="Маршрут">{{ product.route }}</param>
        {% endif %}
        
        {% for collection_id in product.collectionIds %}
        <collectionId>{{ collection_id }}</collectionId>
        {% endfor %}
      </offer>
      {% endfor %}
    </offers>
    
    {% if collections %}
    <collections>
      {% for collection in collections %}
      <collection id="{{ collection.id }}">
        <url>{{ collection.url }}</url>
        {% for picture in collection.pictures %}
        <picture>{{ picture }}</picture>
        {% endfor %}
        <name>{{ collection.name }}</name>
        <description>{{ collection.description }}</description>
      </collection>
      {% endfor %}
    </collections>
    {% endif %}
    
  </shop>
</yml_catalog>`
    }
  ])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isCopying, setIsCopying] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: ''
  })

  const handleCopyTemplate = (template: Template) => {
    setIsCopying(true)
    setSelectedTemplate(template)
    setFormData({
      name: `${template.name} (копия)`,
      description: template.description || '',
      content: template.content
    })
    setIsModalOpen(true)
  }

  const handleEditTemplate = (template: Template) => {
    if (template.isDefault) {
      handleCopyTemplate(template)
    } else {
      setIsCopying(false)
      setSelectedTemplate(template)
      setFormData({
        name: template.name,
        description: template.description || '',
        content: template.content
      })
      setIsModalOpen(true)
    }
  }

  const handleCreateNew = () => {
    setIsCopying(false)
    setSelectedTemplate(null)
    setFormData({
      name: '',
      description: '',
      content: ''
    })
    setIsModalOpen(true)
  }

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (selectedTemplate && !isCopying) {
        // Обновление существующего шаблона
        const response = await apiFetch(`/api/templates/${selectedTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            content: formData.content
          })
        })
        
        if (!response.ok) throw new Error('Ошибка обновления шаблона')
        
        alert('Шаблон успешно обновлен!')
      } else {
        // Создание нового шаблона
        const response = await apiFetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            type: 'feed',
            content: formData.content
          })
        })
        
        if (!response.ok) throw new Error('Ошибка создания шаблона')
        
        alert('Шаблон успешно создан!')
      }
      
      setIsModalOpen(false)
      loadTemplates() // Перезагрузка списка
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      alert('Ошибка при сохранении шаблона')
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот шаблон?')) return
    
    try {
      const response = await apiFetch(`/api/templates/${templateId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Ошибка удаления шаблона')
      
      alert('Шаблон удален!')
      loadTemplates()
    } catch (error) {
      console.error('Ошибка удаления:', error)
      alert('Ошибка при удалении шаблона')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Загрузка шаблонов...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            Шаблоны фидов
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            Создавайте и редактируйте шаблоны для генерации фидов
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowHelpModal(true)}
            className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            title="Помощь по требованиям Яндекса"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
              <circle cx="12" cy="18" r="1" fill="currentColor" />
            </svg>
            Помощь
          </button>
          <button 
            className="flex items-center gap-3 bg-[var(--button)] text-white px-6 py-3 rounded-xl hover:bg-[var(--button)]/90 transition-all shadow-lg hover:shadow-xl"
            onClick={handleCreateNew}
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <span className="font-semibold">Создать шаблон</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="card relative">
            {template.isDefault && (
              <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                ⭐ РЕКОМЕНДУЕМ
              </div>
            )}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 pr-4">
                <h3 className="text-lg font-semibold mb-1">{template.name}</h3>
                <p className="text-[var(--foreground)] opacity-70 text-sm">
                  {template.description}
                </p>
              </div>
              <div className="flex gap-2">
                {template.isDefault ? (
                  <button 
                    className="btn-secondary text-sm"
                    onClick={() => handleCopyTemplate(template)}
                    title="Скопировать шаблон"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  </button>
                ) : (
                  <>
                    <button 
                      className="btn-secondary text-sm"
                      onClick={() => handleEditTemplate(template)}
                      title="Редактировать"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button 
                      className="btn-secondary text-sm text-red-400 border-red-400" 
                      title="Удалить"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m3 6 3 0"/>
                        <path d="m19 6-1 0"/>
                        <path d="m8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <path d="m10 11 0 6"/>
                        <path d="m14 11 0 6"/>
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-medium mb-2">Переменные:</h4>
              <div className="flex flex-wrap gap-2">
                {template.variables && template.variables.length > 0 ? (
                  template.variables.map((variable: any, index: number) => (
                    <span 
                      key={index}
                      className="px-2 py-1 text-xs bg-[var(--button)] text-[var(--background)] rounded"
                    >
                      {variable.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">Mustache шаблон</span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button className="btn-primary flex-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                  <circle cx="12" cy="13" r="3"/>
                </svg>
                Использовать
              </button>
              <button className="btn-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h6v6"/>
                  <path d="M10 14 21 3"/>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Модальное окно для создания/редактирования */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                {isCopying ? 'Копировать шаблон' : selectedTemplate ? 'Редактировать шаблон' : 'Создать новый шаблон'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="btn-secondary"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSaveTemplate}>
              <div>
                <label className="block text-sm font-medium mb-2">Название шаблона</label>
                <input 
                  type="text" 
                  className="input-field w-full"
                  placeholder="Введите название шаблона"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Описание</label>
                <textarea 
                  className="input-field w-full h-20"
                  placeholder="Описание шаблона"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Шаблон (Mustache синтаксис)</label>
                <textarea 
                  className="input-field w-full h-64 font-mono text-sm"
                  placeholder="Введите шаблон фида (поддерживается Mustache синтаксис: {{variable}}, {{#loop}}...{{/loop}})"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                />
              </div>

              <div className="flex gap-3">
                <button type="submit" className="btn-primary">
                  {selectedTemplate && !isCopying ? 'Сохранить изменения' : 'Создать шаблон'}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно помощи */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setShowHelpModal(false)}>
          <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Требования к YML-фидам Яндекса</h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6 text-gray-300">
              {/* Основные требования */}
              <section>
                <h3 className="text-xl font-semibold text-white mb-3">📋 Основные требования</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Максимальный размер файла: <strong>1 ГБ</strong></li>
                  <li>Максимальное количество товарных предложений: <strong>1 миллион</strong></li>
                  <li>Кодировка: <strong>UTF-8</strong> или <strong>windows-1251</strong></li>
                  <li>Обновление фида: минимум <strong>раз в сутки</strong></li>
                  <li>Доступность по прямой ссылке для роботов Яндекса</li>
                </ul>
              </section>

              {/* Типы офферов */}
              <section>
                <h3 className="text-xl font-semibold text-white mb-3">🏷️ Типы товарных предложений</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-400 mb-2">simplified</h4>
                    <p className="text-sm">Упрощенный тип. Только название и цена. Подходит для уникальных товаров.</p>
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-400 mb-2">vendor.model</h4>
                    <p className="text-sm">Производитель + модель. Для техники, электроники.</p>
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-400 mb-2">combined</h4>
                    <p className="text-sm">Комбинированный. Название + производитель + модель. Универсальный вариант.</p>
                  </div>
                </div>
              </section>

              {/* Обязательные элементы */}
              <section>
                <h3 className="text-xl font-semibold text-white mb-3">✅ Обязательные элементы</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-900/20 border border-green-700/50 p-3 rounded">
                    <code className="text-green-400">id</code> - уникальный идентификатор
                  </div>
                  <div className="bg-green-900/20 border border-green-700/50 p-3 rounded">
                    <code className="text-green-400">available</code> - наличие (true/false)
                  </div>
                  <div className="bg-green-900/20 border border-green-700/50 p-3 rounded">
                    <code className="text-green-400">url</code> - ссылка на товар
                  </div>
                  <div className="bg-green-900/20 border border-green-700/50 p-3 rounded">
                    <code className="text-green-400">price</code> - цена
                  </div>
                  <div className="bg-green-900/20 border border-green-700/50 p-3 rounded">
                    <code className="text-green-400">currencyId</code> - валюта (RUR, USD, EUR)
                  </div>
                  <div className="bg-green-900/20 border border-green-700/50 p-3 rounded">
                    <code className="text-green-400">categoryId</code> - ID категории
                  </div>
                  <div className="bg-green-900/20 border border-green-700/50 p-3 rounded">
                    <code className="text-green-400">name</code> - название товара
                  </div>
                  <div className="bg-green-900/20 border border-green-700/50 p-3 rounded">
                    <code className="text-green-400">vendor</code> - производитель
                  </div>
                </div>
              </section>

              {/* Рекомендуемые элементы */}
              <section>
                <h3 className="text-xl font-semibold text-white mb-3">⭐ Рекомендуемые элементы</h3>
                <div className="bg-blue-900/20 border border-blue-700/50 p-4 rounded space-y-2">
                  <p><code className="text-blue-400">picture</code> - URL изображения (до 10 штук)</p>
                  <p><code className="text-blue-400">description</code> - описание товара</p>
                  <p><code className="text-blue-400">vendor</code> - производитель/бренд</p>
                  <p><code className="text-blue-400">model</code> - модель товара</p>
                  <p><code className="text-blue-400">oldprice</code> - старая цена (для скидок)</p>
                  <p><code className="text-blue-400">barcode</code> - штрихкод</p>
                  <p><code className="text-blue-400">param</code> - характеристики товара</p>
                </div>
              </section>

              {/* Коллекции */}
              <section>
                <h3 className="text-xl font-semibold text-white mb-3">📦 Коллекции (Collections)</h3>
                <p className="mb-3">Группы товаров для таргетинга в Яндекс.Директ. Позволяют показывать объявления по наборам товаров.</p>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto"><code className="text-green-400">{`<collections>
  <collection id="summer_sale">
    <name>Летняя распродажа</name>
    <offer-id>12345</offer-id>
    <offer-id>67890</offer-id>
  </collection>
</collections>`}</code></pre>
                </div>
              </section>

              {/* Полезные ссылки */}
              <section>
                <h3 className="text-xl font-semibold text-white mb-3">🔗 Полезные ссылки</h3>
                <ul className="space-y-2">
                  <li>
                    <a href="https://yandex.ru/support/partnermarket/export/yml.html" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                      Официальная документация YML для Яндекс.Маркета
                    </a>
                  </li>
                  <li>
                    <a href="https://yandex.ru/support/direct/dynamic-text-ads/feed.html" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                      Требования к фидам для Яндекс.Директа
                    </a>
                  </li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}