'use client'

import { useState, useEffect } from 'react'
import { AIPreset } from '@/app/api/ai-presets/route'

interface AIAnalysisProps {
  keywords: string[]
  visible: boolean
  onClose: () => void
}

interface AnalysisResult {
  analysis: string
  loading: boolean
  error: string | null
}

export function AIAnalysis({ keywords, visible, onClose }: AIAnalysisProps) {
  const [presets, setPresets] = useState<AIPreset[]>([])
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>({
    analysis: '',
    loading: false,
    error: null
  })
  const [showCreatePreset, setShowCreatePreset] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [newPresetPrompt, setNewPresetPrompt] = useState('')
  const [createPresetLoading, setCreatePresetLoading] = useState(false)

  useEffect(() => {
    if (visible) {
      loadPresets()
    }
  }, [visible])

  const loadPresets = async () => {
    try {
      const response = await fetch('/api/ai-presets')
      const data = await response.json()
      setPresets(data.presets || [])
    } catch (error) {
      console.error('Failed to load presets:', error)
    }
  }

  const runAnalysis = async (prompt: string) => {
    if (keywords.length === 0) {
      setAnalysisResult({
        analysis: '',
        loading: false,
        error: 'Нет ключевых слов для анализа'
      })
      return
    }

    setAnalysisResult({
      analysis: '',
      loading: true,
      error: null
    })

    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords,
          prompt
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка анализа')
      }

      setAnalysisResult({
        analysis: data.analysis,
        loading: false,
        error: null
      })
    } catch (error) {
      setAnalysisResult({
        analysis: '',
        loading: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      })
    }
  }

  const createPreset = async () => {
    if (!newPresetName.trim() || !newPresetPrompt.trim()) {
      return
    }

    setCreatePresetLoading(true)
    try {
      const response = await fetch('/api/ai-presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newPresetName,
          prompt: newPresetPrompt
        }),
      })

      if (response.ok) {
        setNewPresetName('')
        setNewPresetPrompt('')
        setShowCreatePreset(false)
        await loadPresets()
      }
    } catch (error) {
      console.error('Failed to create preset:', error)
    } finally {
      setCreatePresetLoading(false)
    }
  }

  const deletePreset = async (id: string) => {
    try {
      const response = await fetch(`/api/ai-presets?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadPresets()
      }
    } catch (error) {
      console.error('Failed to delete preset:', error)
    }
  }

  if (!visible) return null

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div 
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border"
        style={{
          background: 'var(--glass-bg-card)',
          borderColor: 'var(--glass-border)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--glass-text-primary)' }}>
              ИИ Анализ ключевых слов
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/20"
              style={{
                color: 'var(--glass-text-secondary)',
                border: '1px solid var(--glass-border)'
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6 p-3 rounded-lg" style={{ background: 'var(--glass-bg-tertiary)' }}>
            <p className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
              <span style={{ color: 'var(--glass-text-primary)', fontWeight: 500 }}>Анализируемые слова ({keywords.length}):</span> {keywords.slice(0, 5).join(', ')}
              {keywords.length > 5 && '...'}
            </p>
          </div>

        {/* Пресеты */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--glass-text-primary)' }}>
              Пресеты анализа
            </h3>
            <button
              onClick={() => setShowCreatePreset(!showCreatePreset)}
              className="glass-button px-3 py-2 text-sm"
            >
              + Создать пресет
            </button>
          </div>

          {showCreatePreset && (
            <div 
              className="mb-4 p-4 rounded-lg border"
              style={{
                background: 'var(--glass-bg-tertiary)',
                borderColor: 'var(--glass-border)'
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--glass-text-primary)' }}>
                    Название пресета
                  </label>
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="glass-input w-full"
                    placeholder="Например: Анализ конкурентности"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--glass-text-primary)' }}>
                    Промт для анализа
                  </label>
                  <textarea
                    value={newPresetPrompt}
                    onChange={(e) => setNewPresetPrompt(e.target.value)}
                    className="glass-input w-full"
                    rows={4}
                    placeholder="Опиши, как ИИ должен анализировать ключевые слова..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={createPreset}
                    disabled={createPresetLoading || !newPresetName.trim() || !newPresetPrompt.trim()}
                    className="glass-button-primary px-4 py-2"
                  >
                    {createPresetLoading ? 'Создание...' : 'Создать'}
                  </button>
                  <button
                    onClick={() => setShowCreatePreset(false)}
                    className="glass-button px-4 py-2"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {presets.map((preset) => (
              <div 
                key={preset.id} 
                className="p-4 rounded-lg border flex items-start justify-between gap-3"
                style={{
                  background: 'var(--glass-bg-tertiary)',
                  borderColor: 'var(--glass-border)'
                }}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--glass-text-primary)' }}>
                    {preset.name}
                  </h4>
                  <p className="text-xs line-clamp-2" style={{ color: 'var(--glass-text-tertiary)' }}>
                    {preset.prompt}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => runAnalysis(preset.prompt)}
                    disabled={analysisResult.loading}
                    className="glass-button-primary px-3 py-1 text-xs whitespace-nowrap"
                  >
                    Анализ
                  </button>
                  <button
                    onClick={() => deletePreset(preset.id)}
                    className="w-7 h-7 rounded flex items-center justify-center transition-all hover:bg-red-500/20"
                    style={{
                      color: 'var(--glass-red)',
                      border: '1px solid var(--glass-border)'
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {presets.length === 0 && !showCreatePreset && (
            <div 
              className="text-center py-8 rounded-lg border"
              style={{
                background: 'var(--glass-bg-tertiary)',
                borderColor: 'var(--glass-border)'
              }}
            >
              <p className="text-sm" style={{ color: 'var(--glass-text-tertiary)' }}>
                Нет сохранённых пресетов. Создайте первый пресет для быстрого анализа.
              </p>
            </div>
          )}
        </div>

        {/* Результат анализа */}
        {(analysisResult.analysis || analysisResult.loading || analysisResult.error) && (
          <div 
            className="p-4 rounded-lg border"
            style={{
              background: 'var(--glass-bg-tertiary)',
              borderColor: 'var(--glass-border)'
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--glass-text-primary)' }}>
              Результат анализа
            </h3>
            
            {analysisResult.loading && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div 
                    className="w-8 h-8 border-3 rounded-full animate-spin"
                    style={{ 
                      borderColor: 'var(--glass-blue)',
                      borderTopColor: 'transparent'
                    }}
                  ></div>
                  <span className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                    Анализируем ключевые слова...
                  </span>
                </div>
              </div>
            )}

            {analysisResult.error && (
              <div 
                className="p-4 rounded-lg border"
                style={{
                  background: 'var(--glass-error)',
                  borderColor: 'var(--glass-red)'
                }}
              >
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--glass-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-sm mb-1" style={{ color: 'var(--glass-red)' }}>Ошибка</p>
                    <p className="text-sm" style={{ color: 'var(--glass-text-primary)' }}>{analysisResult.error}</p>
                  </div>
                </div>
              </div>
            )}

            {analysisResult.analysis && (
              <div 
                className="p-4 rounded-lg"
                style={{ background: 'var(--glass-bg-secondary)' }}
              >
                <div 
                  className="whitespace-pre-wrap text-sm leading-relaxed"
                  style={{ color: 'var(--glass-text-primary)' }}
                >
                  {analysisResult.analysis}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

// NOTE: harmless noop comment to trigger rebuild - do not remove