'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'
import Modal from './Modal'

interface SearchPreset {
  id: string
  name: string
  phrase: string
  description?: string
  createdAt: string
}

interface SearchPresetsProps {
  currentPhrase: string
  onApplyPreset: (phrase: string) => void
}

export default function SearchPresets({ currentPhrase, onApplyPreset }: SearchPresetsProps) {
  const [presets, setPresets] = useState<SearchPreset[]>([])
  const [showPresetsModal, setShowPresetsModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [newPresetDescription, setNewPresetDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPresets()
  }, [])

  const loadPresets = async () => {
    try {
      const response = await fetch('/api/search-presets')
      const data = await response.json()
      setPresets(data.presets || [])
    } catch (error) {
      console.error('Failed to load presets:', error)
    }
  }

  const createPreset = async () => {
    if (!newPresetName.trim() || !currentPhrase.trim()) return

    setSaving(true)
    try {
      const response = await fetch('/api/search-presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newPresetName.trim(),
          phrase: currentPhrase.trim(),
          description: newPresetDescription.trim() || undefined
        })
      })

      if (response.ok) {
        setNewPresetName('')
        setNewPresetDescription('')
        setShowCreateModal(false)
        await loadPresets()
      }
    } catch (error) {
      console.error('Failed to create preset:', error)
    } finally {
      setSaving(false)
    }
  }

  const deletePreset = async (id: string) => {
    try {
      // optimistic update
      setPresets(prev => prev.filter(p => p.id !== id))
      const response = await fetch(`/api/search-presets?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        // rollback if failed
        await loadPresets()
      }
    } catch (error) {
      console.error('Failed to delete preset:', error)
      await loadPresets()
    }
  }

  const handleDeletePreset = async (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Удалить этот пресет?')) {
      await deletePreset(presetId)
    }
  }

  const handleApplyPreset = (preset: SearchPreset) => {
    onApplyPreset(preset.phrase)
    setShowPresetsModal(false)
  }

  return (
    <div className="mt-6">
      <div className="flex gap-3 items-center">
        {/* Button with presets - левая часть */}
        <button
          type="button"
          onClick={() => setShowPresetsModal(true)}
          className="glass-dropdown-button flex-1 justify-between"
        >
          <span className="text-sm">
            {presets.length === 0 ? 'Нет пресетов' : `Пресеты (${presets.length})`}
          </span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Save current button - правая часть */}
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!currentPhrase.trim()}
          className="glass-button-primary px-4 py-2 text-sm whitespace-nowrap disabled:opacity-50"
          title={!currentPhrase.trim() ? 'Введите фразу для создания пресета' : 'Создать пресет'}
        >
          Сохранить текущий
        </button>
      </div>

      {/* Presets Modal */}
      <Modal isOpen={showPresetsModal} onClose={() => setShowPresetsModal(false)}>
          <div className="glass-card p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--glass-text-primary)' }}>
                Сохранённые пресеты
              </h3>
              <button 
                onClick={() => setShowPresetsModal(false)}
                className="p-1 rounded hover:bg-gray-500/20 transition-colors"
                style={{ color: 'var(--glass-text-secondary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {presets.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm" style={{ color: 'var(--glass-text-tertiary)' }}>
                    Сохраните первый пресет
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {presets.map((preset) => (
                    <div 
                      key={preset.id} 
                      className="p-4 rounded-lg border hover:border-blue-400/50 transition-colors cursor-pointer"
                      style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--glass-bg-tertiary)' }}
                      onClick={() => handleApplyPreset(preset)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm mb-1" style={{ color: 'var(--glass-text-primary)' }}>
                            {preset.name}
                          </div>
                          <div className="text-xs font-mono p-2 rounded" style={{ 
                            backgroundColor: 'var(--glass-bg-secondary)', 
                            color: 'var(--glass-text-secondary)' 
                          }}>
                            {preset.phrase}
                          </div>
                          {preset.description && (
                            <div className="text-xs mt-1" style={{ color: 'var(--glass-text-tertiary)' }}>
                              {preset.description}
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={(e) => handleDeletePreset(preset.id, e)}
                          className="w-8 h-8 rounded flex items-center justify-center hover:bg-red-500/20 transition-colors flex-shrink-0"
                          style={{ color: 'var(--glass-red)' }}
                          title="Удалить пресет"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowPresetsModal(false)}
                className="glass-button px-4 py-2"
              >
                Закрыть
              </button>
            </div>
          </div>
      </Modal>

      {/* Create Preset Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
          <div className="glass-card p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--glass-text-primary)' }}>
                Создать пресет
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded hover:bg-gray-500/20 transition-colors"
                style={{ color: 'var(--glass-text-secondary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--glass-text-primary)' }}>
                  Название
                </label>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="glass-input w-full"
                  placeholder="Название пресета"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--glass-text-primary)' }}>
                  Фраза
                </label>
                <div className="glass-input w-full bg-gray-100 text-gray-600">
                  {currentPhrase}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--glass-text-primary)' }}>
                  Описание (необязательно)
                </label>
                <textarea
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                  className="glass-input w-full"
                  placeholder="Краткое описание"
                  rows={3}
                  maxLength={200}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={createPreset}
                disabled={!newPresetName.trim() || saving}
                className="glass-button-primary px-4 py-2 disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : 'Сохранить пресет'}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="glass-button px-4 py-2"
              >
                Отмена
              </button>
            </div>
          </div>
      </Modal>
    </div>
  )
}