'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

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

export default function TrackerPage() {
  const [posts, setPosts] = useState<TrackedPost[]>([])
  const [showAddPost, setShowAddPost] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  
  const [newPost, setNewPost] = useState({
    platform: '',
    postUrl: '',
    title: '',
    utmTemplate: '',
    utmUrl: ''
  })
  const [manualUtm, setManualUtm] = useState(false)

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    try {
      const response = await apiFetch('/api/tracked-posts')
      if (response.ok) {
        const data = await response.json()
        setPosts(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error)
    }
  }

  const addPost = async () => {
    if (!newPost.title) {
      alert('Заполните название!')
      return
    }

    // Проверка: если ручной ввод - требуем UTM, иначе - требуем URL
    if (manualUtm) {
      if (!newPost.utmUrl) {
        alert('Введите готовую UTM-ссылку!')
        return
      }
    } else {
      if (!newPost.postUrl) {
        alert('Введите URL!')
        return
      }
    }

    try {
      const response = await fetch('http://localhost:8000/api/tracked-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: newPost.platform,
          postUrl: newPost.postUrl,
          title: newPost.title,
          utmTemplate: manualUtm ? null : newPost.utmTemplate,
          utmUrl: manualUtm ? newPost.utmUrl : null,
          clicks: 0,
          views: 0,
          conversions: 0
        })
      })

      if (response.ok) {
        await loadPosts()
        setNewPost({
          platform: '',
          postUrl: '',
          title: '',
          utmTemplate: '',
          utmUrl: ''
        })
        setManualUtm(false)
        setShowAddPost(false)
      }
    } catch (error) {
      console.error('Ошибка добавления:', error)
      alert('Ошибка добавления ссылки')
    }
  }

  const deletePost = async (id: string) => {
    if (!confirm('Удалить эту ссылку из трекера?')) return

    try {
      const response = await fetch(`http://localhost:8000/api/tracked-posts/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadPosts()
      }
    } catch (error) {
      console.error('Ошибка удаления:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => alert('Скопировано в буфер обмена!'))
        .catch(() => alert('Ошибка копирования'))
    } else {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        alert('Скопировано в буфер обмена!')
      } catch (err) {
        alert('Ошибка копирования')
      }
      document.body.removeChild(textArea)
    }
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.postUrl.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPlatform = platformFilter === 'all' || post.platform === platformFilter
    return matchesSearch && matchesPlatform
  })

  const getPlatformName = (platform: string) => {
    const names: { [key: string]: string } = {
      'vk': 'ВКонтакте',
      'telegram': 'Telegram',
      'dzen': 'Яндекс.Дзен',
      'yandex_direct': 'Яндекс.Директ',
      'yandex_business': 'Яндекс Бизнес',
      'google': 'Google Ads',
      'email': 'Email'
    }
    return names[platform] || platform
  }

  const getPlatformColor = (platform: string) => {
    const colors: { [key: string]: string } = {
      'vk': 'text-blue-400 border-blue-400',
      'telegram': 'text-sky-400 border-sky-400',
      'dzen': 'text-orange-400 border-orange-400',
      'yandex_direct': 'text-red-400 border-red-400',
      'yandex_business': 'text-yellow-400 border-yellow-400',
      'google': 'text-green-400 border-green-400',
      'email': 'text-purple-400 border-purple-400'
    }
    return colors[platform] || 'text-gray-400 border-gray-400'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            Трекер ссылок
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            Отслеживайте эффективность UTM-ссылок и кампаний
          </p>
        </div>
        <button className="btn-primary flex items-center" onClick={() => setShowAddPost(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Добавить ссылку
        </button>
      </div>

      {/* Форма добавления */}
      {showAddPost && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">Добавить для отслеживания</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Платформа/Источник *</label>
              <input
                type="text"
                value={newPost.platform}
                onChange={(e) => setNewPost({ ...newPost, platform: e.target.value })}
                placeholder="vk, telegram, yandex_direct, email..."
                className="input-field w-full"
              />
              <p className="text-xs opacity-50 mt-1">Например: vk, telegram, dzen, yandex_direct, google, email</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Название *</label>
              <input
                type="text"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                placeholder="Название кампании или ссылки"
                className="input-field w-full"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Исходный URL {!manualUtm && '*'}</label>
              <input
                type="text"
                value={newPost.postUrl}
                onChange={(e) => setNewPost({ ...newPost, postUrl: e.target.value })}
                placeholder="https://vs-travel.ru/tours/europe или https://vk.com/wall-123_456"
                className="input-field w-full"
              />
              <p className="text-xs opacity-50 mt-1">URL страницы, куда будет вести ссылка{!manualUtm && ' (обязательно при использовании шаблона)'}</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Способ добавления UTM</label>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={!manualUtm}
                    onChange={() => setManualUtm(false)}
                    className="mr-2"
                  />
                  <span>Использовать шаблон</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={manualUtm}
                    onChange={() => setManualUtm(true)}
                    className="mr-2"
                  />
                  <span>Ввести готовую UTM-ссылку</span>
                </label>
              </div>

              {!manualUtm ? (
                <div>
                  <label className="block text-sm font-medium mb-2">UTM шаблон (опционально)</label>
                  <input
                    type="text"
                    value={newPost.utmTemplate}
                    onChange={(e) => setNewPost({ ...newPost, utmTemplate: e.target.value })}
                    placeholder="ID шаблона UTM метки"
                    className="input-field w-full"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-2">Готовая UTM-ссылка *</label>
                  <input
                    type="text"
                    value={newPost.utmUrl}
                    onChange={(e) => setNewPost({ ...newPost, utmUrl: e.target.value })}
                    placeholder="https://example.com?utm_source=vk&utm_medium=social&utm_campaign=summer"
                    className="input-field w-full"
                  />
                  <p className="text-xs opacity-50 mt-1">Вставьте готовую ссылку с UTM-параметрами</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={addPost} className="btn-primary">
              Добавить
            </button>
            <button onClick={() => setShowAddPost(false)} className="btn-secondary">
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Поиск и фильтры */}
      <div className="card mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <input
              type="text"
              className="input-field w-full"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="input-field"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option value="all">Все платформы</option>
            <option value="vk">ВКонтакте</option>
            <option value="telegram">Telegram</option>
            <option value="dzen">Яндекс.Дзен</option>
            <option value="yandex_direct">Яндекс.Директ</option>
            <option value="yandex_business">Яндекс Бизнес</option>
            <option value="google">Google Ads</option>
            <option value="email">Email</option>
          </select>
        </div>
      </div>

      {/* Список ссылок */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-[var(--button)] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--background)" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Нет отслеживаемых ссылок</h3>
            <p className="text-[var(--foreground)] opacity-70 mb-6">
              Добавьте первую ссылку для отслеживания эффективности
            </p>
            <button className="btn-primary" onClick={() => setShowAddPost(true)}>
              Добавить первую ссылку
            </button>
          </div>
        ) : (
          filteredPosts.map(post => (
            <div key={post.id} className="card">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{post.title}</h3>
                    <span className={`px-2 py-1 text-xs border rounded ${getPlatformColor(post.platform)}`}>
                      {getPlatformName(post.platform)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm opacity-70 mb-4">
                    <div>
                      <span className="font-medium">Просмотры:</span> {post.views}
                    </div>
                    <div>
                      <span className="font-medium">Клики:</span> {post.clicks}
                    </div>
                    <div>
                      <span className="font-medium">Конверсии:</span> {post.conversions}
                    </div>
                    <div>
                      <span className="font-medium">CTR:</span> {post.views > 0 ? ((post.clicks / post.views) * 100).toFixed(2) : 0}%
                    </div>
                  </div>

                  <div className="card mb-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                    <p className="text-xs opacity-70 mb-1">UTM-ссылка:</p>
                    <p className="text-sm font-mono break-all">{post.utmUrl}</p>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => copyToClipboard(post.utmUrl)}
                    className="btn-primary text-sm flex items-center"
                    title="Копировать UTM ссылку"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Копировать
                  </button>

                  <button
                    onClick={() => window.open(post.utmUrl, '_blank')}
                    className="btn-secondary text-sm flex items-center"
                    title="Открыть ссылку"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Открыть
                  </button>

                  <button
                    onClick={() => deletePost(post.id)}
                    className="btn-secondary text-sm flex items-center text-red-400 hover:text-red-300"
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
          ))
        )}
      </div>
    </div>
  )
}
