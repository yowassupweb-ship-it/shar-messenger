'use client'

import { useState } from 'react'

export default function ProductsPage() {
  const [products, setProducts] = useState([
    {
      id: '1',
      name: 'Смартфон iPhone 15',
      price: 89990,
      category: 'Электроника',
      description: 'Последняя модель iPhone с улучшенной камерой',
      image_url: '',
      attributes: {
        brand: 'Apple',
        model: 'iPhone 15',
        color: 'Черный'
      }
    },
    {
      id: '2',
      name: 'Ноутбук MacBook Air M2',
      price: 129990,
      category: 'Компьютеры',
      description: 'Тонкий и легкий ноутбук для работы и учебы',
      image_url: '',
      attributes: {
        brand: 'Apple',
        model: 'MacBook Air M2',
        screen: '13.6"'
      }
    }
  ])

  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            Товары
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            Управление каталогом товаров для генерации фидов
          </p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Добавить товар
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <input 
              type="text" 
              className="input-field w-full"
              placeholder="Поиск товаров по названию, категории..."
            />
          </div>
          <select className="input-field">
            <option>Все категории</option>
            <option>Электроника</option>
            <option>Компьютеры</option>
            <option>Одежда</option>
          </select>
          <button className="btn-secondary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="card">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">{product.name}</h3>
                <p className="text-[var(--foreground)] opacity-70 text-sm mb-2">
                  {product.description}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="px-2 py-1 bg-[var(--button)] text-[var(--background)] rounded text-xs">
                    {product.category}
                  </span>
                  <span className="font-semibold text-[var(--button)]">
                    {product.price.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>
              
              <div className="flex gap-1 ml-4">
                <button className="btn-secondary text-sm p-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button className="btn-secondary text-sm p-2 text-red-400 border-red-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m3 6 3 0"/>
                    <path d="m19 6-1 0"/>
                    <path d="m8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <path d="m10 11 0 6"/>
                    <path d="m14 11 0 6"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-3">
              <h4 className="text-sm font-medium mb-2">Атрибуты:</h4>
              <div className="space-y-1 text-sm opacity-70">
                {Object.entries(product.attributes).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="capitalize">{key}:</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Модальное окно добавления товара */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Добавить новый товар</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="btn-secondary"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Название товара *</label>
                  <input 
                    type="text" 
                    className="input-field w-full"
                    placeholder="Название товара"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Цена *</label>
                  <input 
                    type="number" 
                    className="input-field w-full"
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Описание</label>
                <textarea 
                  className="input-field w-full h-20"
                  placeholder="Описание товара"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Категория</label>
                  <select className="input-field w-full">
                    <option>Выберите категорию</option>
                    <option>Электроника</option>
                    <option>Компьютеры</option>
                    <option>Одежда</option>
                    <option>Дом и сад</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">URL изображения</label>
                  <input 
                    type="url" 
                    className="input-field w-full"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Дополнительные атрибуты</label>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      className="input-field"
                      placeholder="Название атрибута"
                    />
                    <input 
                      type="text" 
                      className="input-field"
                      placeholder="Значение"
                    />
                  </div>
                  <button 
                    type="button" 
                    className="btn-secondary text-sm"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Добавить атрибут
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary">
                  Добавить товар
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {products.length === 0 && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-[var(--button)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--background)" strokeWidth="2">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Нет добавленных товаров</h3>
          <p className="text-[var(--foreground)] opacity-70 mb-6">
            Добавьте товары для создания фидов
          </p>
          <button className="btn-primary">
            Добавить первый товар
          </button>
        </div>
      )}
    </div>
  )
}