'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'

export default function FeedDetailsPage() {
  const params = useParams()
  const feedId = params?.id as string

  const [feed, setFeed] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [collections, setCollections] = useState<any[]>([])
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false)
  const [newCollection, setNewCollection] = useState({
    name: '',
    url: '',
    description: '',
    pictures: ['']
  })

  useEffect(() => {
    loadFeedData()
  }, [feedId])

  const loadFeedData = async () => {
    try {
      // Загрузка данных фида
      const feedRes = await apiFetch(`/api/feeds/${feedId}`)
      if (feedRes.ok) {
        const feedData = await feedRes.json()
        setFeed(feedData)

        // Загрузка товаров фида - поддержка множественных источников
        const sourceIds = feedData.sourceIds || (feedData.sourceId ? [feedData.sourceId] : [])
        
        console.log('[Feed Details] Feed:', feedData.name)
        console.log('[Feed Details] sourceIds:', sourceIds)
        
        if (sourceIds.length > 0) {
          // Загружаем все продукты и фильтруем по sourceIds
          const productsRes = await apiFetch(`/api/products?merged=false`)
          if (productsRes.ok) {
            const allProducts = await productsRes.json()
            console.log('[Feed Details] Total products from API:', allProducts.length)
            
            const feedProducts = allProducts.filter((p: any) => 
              sourceIds.includes(p.sourceId) && !p.hidden
            )
            console.log('[Feed Details] Filtered products:', feedProducts.length)
            console.log('[Feed Details] First 3 products:', feedProducts.slice(0, 3).map((p: any) => ({ id: p.id, name: p.name })))
            
            setProducts(feedProducts)
          }
        }
      }

      // Загрузка коллекций
      const collectionsRes = await apiFetch('/api/collections')
      if (collectionsRes.ok) {
        const collectionsData = await collectionsRes.json()
        setCollections(collectionsData)
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    }
  }

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('http://localhost:8000/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCollection),
      })

      if (response.ok) {
        await loadFeedData()
        setIsCollectionModalOpen(false)
        setNewCollection({ name: '', url: '', description: '', pictures: [''] })
      }
    } catch (error) {
      console.error('Ошибка создания коллекции:', error)
    }
  }

  const handleAddPictureField = () => {
    setNewCollection({
      ...newCollection,
      pictures: [...newCollection.pictures, '']
    })
  }

  const handlePictureChange = (index: number, value: string) => {
    const updatedPictures = [...newCollection.pictures]
    updatedPictures[index] = value
    setNewCollection({
      ...newCollection,
      pictures: updatedPictures
    })
  }

  const handleRemovePicture = (index: number) => {
    const updatedPictures = newCollection.pictures.filter((_, i) => i !== index)
    setNewCollection({
      ...newCollection,
      pictures: updatedPictures.length > 0 ? updatedPictures : ['']
    })
  }

  const handleAddProductToCollection = async (collectionId: string, productId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/collections/${collectionId}/products/${productId}`, {
        method: 'POST'
      })
      if (response.ok) {
        await loadFeedData()
      }
    } catch (error) {
      console.error('Ошибка добавления товара в коллекцию:', error)
    }
  }

  if (!feed) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--button)] mx-auto mb-4"></div>
          <p className="text-[var(--foreground)] opacity-70">Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link href="/feed-editor" className="text-[var(--button)] hover:underline">
          Редактор фидов
        </Link>
        <span className="text-[var(--foreground)] opacity-50">/</span>
        <Link href="/feed-editor/feeds" className="text-[var(--button)] hover:underline">
          Фиды
        </Link>
        <span className="text-[var(--foreground)] opacity-50">/</span>
        <span className="text-[var(--foreground)]">{feed.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-2">
            {feed.name}
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            Управление товарами и коллекциями фида
          </p>
        </div>
        
        <div className="flex gap-3">
          <button 
            className="flex items-center gap-2 bg-[var(--button)] text-white px-6 py-3 rounded-xl hover:bg-[var(--button)]/90 transition-all shadow-lg"
            onClick={() => setIsCollectionModalOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span className="font-semibold">Создать коллекцию</span>
          </button>

          <Link 
            href={`http://localhost:8000/feed/${feedId}`}
            target="_blank"
            className="flex items-center gap-2 btn-secondary px-6 py-3"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            Открыть XML
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="text-sm text-[var(--foreground)] opacity-70 mb-2">Товаров</div>
          <div className="text-3xl font-bold text-[var(--foreground)]">{products.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-[var(--foreground)] opacity-70 mb-2">Коллекций</div>
          <div className="text-3xl font-bold text-[var(--foreground)]">{collections.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-[var(--foreground)] opacity-70 mb-2">Формат</div>
          <div className="text-3xl font-bold text-[var(--foreground)] uppercase">{feed.format || 'XML'}</div>
        </div>
        <div className="card">
          <div className="text-sm text-[var(--foreground)] opacity-70 mb-2">Последнее обновление</div>
          <div className="text-lg font-medium text-[var(--foreground)]">
            {feed.lastUpdate ? new Date(feed.lastUpdate).toLocaleDateString('ru-RU') : 'Никогда'}
          </div>
        </div>
      </div>

      {/* Collections */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">Коллекции</h2>
        {collections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => {
              const collectionProducts = products.filter(p => 
                p.collectionIds && p.collectionIds.includes(collection.id)
              )
              
              return (
                <div key={collection.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold">{collection.name}</h3>
                    <span className="text-sm text-[var(--foreground)] opacity-70 bg-[var(--background)] px-2 py-1 rounded">
                      {collectionProducts.length} товаров
                    </span>
                  </div>
                  
                  <p className="text-sm text-[var(--foreground)] opacity-70 mb-3">
                    {collection.description}
                  </p>

                  {collection.pictures && collection.pictures.length > 0 && (
                    <div className="mb-3">
                      <img 
                        src={collection.pictures[0]} 
                        alt={collection.name}
                        className="w-full h-32 object-cover rounded-lg"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link 
                      href={collection.url}
                      target="_blank"
                      className="flex-1 btn-secondary text-center text-sm"
                    >
                      Открыть страницу
                    </Link>
                    <button className="btn-secondary text-sm">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-[var(--foreground)] opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-[var(--foreground)] opacity-70 mb-4">
              Коллекции не созданы
            </p>
            <button 
              className="btn-primary"
              onClick={() => setIsCollectionModalOpen(true)}
            >
              Создать первую коллекцию
            </button>
          </div>
        )}
      </div>

      {/* Products Preview */}
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">Товары ({products.length})</h2>
        <div className="card">
          <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto">
            {products.slice(0, 10).map((product) => (
              <div key={product.id} className="flex items-center gap-4 p-3 border border-[var(--border)] rounded-lg hover:border-[var(--button)] transition-colors">
                {product.image && (
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-medium text-[var(--foreground)]">{product.name}</h4>
                  <p className="text-sm text-[var(--foreground)] opacity-60">{product.route}</p>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-[var(--button)]">{product.price} ₽</div>
                  <div className="text-sm text-[var(--foreground)] opacity-60">{product.days} дней</div>
                </div>
              </div>
            ))}
          </div>
          {products.length > 10 && (
            <div className="mt-4 text-center">
              <Link href={`/feed-editor/products`} className="btn-secondary">
                Показать все товары
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Collection Creation Modal */}
      {isCollectionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Создать коллекцию</h2>
              <button 
                onClick={() => setIsCollectionModalOpen(false)}
                className="btn-secondary"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateCollection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Название коллекции*</label>
                <input 
                  type="text" 
                  className="input-field w-full"
                  placeholder="Например: Туры в Турцию"
                  value={newCollection.name}
                  onChange={(e) => setNewCollection({...newCollection, name: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">URL страницы каталога*</label>
                <input 
                  type="url" 
                  className="input-field w-full"
                  placeholder="https://example.com/catalog/turkey"
                  value={newCollection.url}
                  onChange={(e) => setNewCollection({...newCollection, url: e.target.value})}
                  required
                />
                <p className="text-xs text-[var(--foreground)] opacity-60 mt-1">
                  Ссылка на страницу каталога на вашем сайте
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Описание</label>
                <textarea 
                  className="input-field w-full h-20"
                  placeholder="Краткое описание коллекции"
                  value={newCollection.description}
                  onChange={(e) => setNewCollection({...newCollection, description: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Изображения</label>
                {newCollection.pictures.map((picture, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input 
                      type="url" 
                      className="input-field flex-1"
                      placeholder="https://example.com/image.jpg"
                      value={picture}
                      onChange={(e) => handlePictureChange(index, e.target.value)}
                    />
                    {newCollection.pictures.length > 1 && (
                      <button 
                        type="button"
                        className="btn-secondary text-red-400"
                        onClick={() => handleRemovePicture(index)}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button"
                  className="btn-secondary text-sm mt-2"
                  onClick={handleAddPictureField}
                >
                  + Добавить изображение
                </button>
                <p className="text-xs text-[var(--foreground)] opacity-60 mt-1">
                  Можно добавить несколько изображений
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary">
                  Создать коллекцию
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setIsCollectionModalOpen(false)}
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
