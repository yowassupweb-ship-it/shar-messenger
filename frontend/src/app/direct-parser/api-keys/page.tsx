'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

interface ApiKey {
  id: string
  name: string
  key: string
  createdAt: string
  lastUsed: string | null
  requestCount: number
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    try {
      const res = await apiFetch('/api/direct-parser/api-keys')
      if (res.ok) {
        const data = await res.json()
        setApiKeys(data)
      }
    } catch (error) {
      console.error('Error loading API keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const createApiKey = async () => {
    if (!newKeyName.trim()) return
    setCreating(true)
    
    try {
      const res = await apiFetch('/api/direct-parser/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName })
      })
      
      if (res.ok) {
        const data = await res.json()
        setNewlyCreatedKey(data.key)
        setApiKeys(prev => [data, ...prev])
        setNewKeyName('')
        setShowCreateForm(false)
      }
    } catch (error) {
      console.error('Error creating API key:', error)
    } finally {
      setCreating(false)
    }
  }

  const deleteApiKey = async (id: string) => {
    if (!confirm('Удалить этот API ключ? Все агенты с этим ключом перестанут работать.')) return
    
    try {
      const res = await apiFetch(`/api/direct-parser/api-keys/${id}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        setApiKeys(prev => prev.filter(k => k.id !== id))
      }
    } catch (error) {
      console.error('Error deleting API key:', error)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const maskKey = (key: string) => {
    if (key.length <= 8) return '••••••••'
    return key.slice(0, 4) + '••••••••' + key.slice(-4)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API ключи</h1>
          <p className="text-sm opacity-60 mt-1">Управление ключами для парсер-агентов</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2.5 bg-[var(--button)] text-white rounded-lg hover:opacity-90 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Создать ключ
        </button>
      </div>

      {/* Новый ключ (показывается один раз) */}
      {newlyCreatedKey && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-medium text-green-400">Ключ создан!</h3>
              <p className="text-sm opacity-70 mt-1 mb-3">
                Скопируйте ключ сейчас. Вы больше не сможете увидеть его полностью.
              </p>
              <div className="flex items-center gap-2 bg-[var(--background)] p-3 rounded-lg">
                <code className="flex-1 text-sm font-mono break-all">{newlyCreatedKey}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(newlyCreatedKey)
                    setNewlyCreatedKey(null)
                  }}
                  className="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                >
                  Скопировать
                </button>
              </div>
            </div>
            <button
              onClick={() => setNewlyCreatedKey(null)}
              className="opacity-60 hover:opacity-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Форма создания */}
      {showCreateForm && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="font-medium mb-4">Новый API ключ</h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Название ключа (например: Рабочий ПК)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--button)]"
              autoFocus
            />
            <button
              onClick={createApiKey}
              disabled={creating || !newKeyName.trim()}
              className="px-6 py-2.5 bg-[var(--button)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {creating ? 'Создание...' : 'Создать'}
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setNewKeyName('') }}
              className="px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg hover:border-[var(--button)]"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Список ключей */}
      {loading ? (
        <div className="text-center py-12 opacity-60">Загрузка...</div>
      ) : apiKeys.length === 0 ? (
        <div className="text-center py-12 bg-[var(--card)] border border-[var(--border)] rounded-xl">
          <svg className="w-12 h-12 mx-auto opacity-30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <p className="opacity-60 mb-4">Нет API ключей</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="text-[var(--button)] hover:underline"
          >
            Создать первый ключ
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {apiKeys.map(apiKey => (
            <div
              key={apiKey.id}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{apiKey.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-[var(--background)] rounded opacity-60">
                      {apiKey.requestCount} запросов
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="text-sm font-mono opacity-70">{maskKey(apiKey.key)}</code>
                    <button
                      onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                      className="p-1 opacity-50 hover:opacity-100"
                      title="Скопировать ключ"
                    >
                      {copiedId === apiKey.id ? (
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right text-sm">
                    <div className="opacity-60">Создан</div>
                    <div>{new Date(apiKey.createdAt).toLocaleDateString('ru-RU')}</div>
                  </div>
                  {apiKey.lastUsed && (
                    <div className="text-right text-sm">
                      <div className="opacity-60">Использован</div>
                      <div>{new Date(apiKey.lastUsed).toLocaleDateString('ru-RU')}</div>
                    </div>
                  )}
                  <button
                    onClick={() => deleteApiKey(apiKey.id)}
                    className="p-2 text-red-400 opacity-60 hover:opacity-100"
                    title="Удалить"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Предупреждение */}
      <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-6">
        <h3 className="font-medium mb-2 text-orange-400 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Безопасность
        </h3>
        <ul className="text-sm space-y-1 opacity-70">
          <li>• Не передавайте API ключи третьим лицам</li>
          <li>• Каждый агент должен использовать свой уникальный ключ</li>
          <li>• При компрометации ключа немедленно удалите его</li>
          <li>• Ключи хранятся в зашифрованном виде</li>
        </ul>
      </div>
    </div>
  )
}
