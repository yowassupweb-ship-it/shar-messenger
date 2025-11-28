'use client'

import { useState } from 'react'
import { hotnessColors, hotnessLabels } from '@/lib/yandex-wordstat'
import { TopRequestsResponse } from '@/types/yandex-wordstat'
import { AIAnalysis } from './AIAnalysis'
import DynamicsChart from './DynamicsChart'
import { Download, X } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks'
import { Portal } from './Portal'

interface KeywordResultsProps {
  results: TopRequestsResponse | null
  onExport?: (selectedItems: Array<{phrase: string, count: number, type: 'top' | 'association'}>) => void
  dynamicsPeriod?: 'daily' | 'weekly' | 'monthly'
}

type Hotness = 'cold' | 'warm' | 'hot' | 'very-hot'

function calculateHotness(count: number): Hotness {
  if (count >= 100000) return 'very-hot'
  if (count >= 10000) return 'hot'
  if (count >= 1000) return 'warm'
  return 'cold'
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('ru-RU').format(num)
}

function KeywordRow({ phrase, count, isAssociation = false }: { 
  phrase: string; 
  count: number; 
  isAssociation?: boolean;
}) {
  const hotness = calculateHotness(count)

  return (
    <div 
      className={`flex justify-between items-center p-2 rounded border ${isAssociation ? 'opacity-75' : ''}`}
      style={{ 
        backgroundColor: 'var(--glass-bg-tertiary)',
        borderColor: 'var(--glass-border)'
      }}
    >
      <div className="flex items-center space-x-2">
        <span className={`hotness-${hotness} font-medium text-sm`}>
          {isAssociation && <span className="text-xs opacity-75 mr-1" style={{ color: 'var(--glass-text-tertiary)' }}>АССОЦ:</span>}
          {phrase}
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-xs" style={{ color: 'var(--glass-text-secondary)' }}>
          {hotnessLabels[hotness]}
        </span>
        <span className={`hotness-${hotness} font-semibold text-sm`}>
          {formatNumber(count)}
        </span>
      </div>
    </div>
  )
}

export function KeywordResults({ results, onExport, dynamicsPeriod }: KeywordResultsProps) {
  const [showAIAnalysis, setShowAIAnalysis] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [exportHotness, setExportHotness] = useState<'all' | 'cold' | 'warm' | 'hot'>('all')
  
  // Блокируем скролл body при открытой модалке экспорта
  useBodyScrollLock(showExportModal)
  
  if (!results) {
    return (
      <div className="glass-card p-6">
        <div className="text-center" style={{ color: 'var(--glass-text-secondary)' }}>
          <p>Введите запрос для поиска ключевых слов</p>
        </div>
      </div>
    )
  }

  const { requestPhrase, totalCount, topRequests, associations, dynamics } = results

  // Создаем список всех элементов для экспорта
  const allItems = [
    ...topRequests.map(item => ({ ...item, type: 'top' as const, id: `top-${item.phrase}` })),
    ...associations.map(item => ({ ...item, type: 'association' as const, id: `assoc-${item.phrase}` }))
  ]

  const matchesExportHotness = (count: number) => {
    if (exportHotness === 'all') return true
    const h = calculateHotness(count)
    if (exportHotness === 'hot') return h === 'hot' || h === 'very-hot'
    return h === exportHotness
  }

  const filteredTopRequests = topRequests.filter(item => matchesExportHotness(item.count))
  const filteredAssociations = associations.filter(item => matchesExportHotness(item.count))

  const filteredAllItems = [
    ...filteredTopRequests.map(item => ({ ...item, type: 'top' as const, id: `top-${item.phrase}` })),
    ...filteredAssociations.map(item => ({ ...item, type: 'association' as const, id: `assoc-${item.phrase}` }))
  ]

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const selectAll = () => {
    setSelectedItems(new Set(filteredAllItems.map(item => item.id)))
  }

  const selectNone = () => {
    setSelectedItems(new Set())
  }

  const handleExport = () => {
    if (!onExport) return
    const selectedData = allItems.filter(item => selectedItems.has(item.id))
    const exportData = selectedData.map(item => ({
      phrase: item.phrase,
      count: item.count,
      type: item.type
    }))
    onExport(exportData)
    setShowExportModal(false)
  }

  return (
    <div className="space-y-6">
      {/* График динамики убран - он показывается на отдельной вкладке Динамика */}

      <div className="glass-card p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setShowAIAnalysis(true)}
            className="glass-button px-3 py-2 text-sm flex items-center space-x-2"
            style={{
              border: '1px solid var(--glass-purple)',
              background: 'rgba(203, 166, 247, 0.15)',
              color: 'var(--glass-purple)',
              borderRadius: '8px'
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>ИИ Анализ</span>
          </button>
          {onExport && (
            <button
              onClick={() => setShowExportModal(true)}
              className="glass-button-primary px-3 py-2 text-sm flex items-center space-x-2"
              style={{
                borderRadius: '8px'
              }}
            >
              <Download className="w-4 h-4" />
              <span>Экспорт</span>
            </button>
          )}
        </div>
      </div>
      
      <div className="mb-3">
        <p className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
          Общее количество запросов за 30 дней: <span className="font-medium">{formatNumber(totalCount)}</span>
        </p>
      </div>

      {/* Топ запросы */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--glass-text-primary)' }}>
          Популярные запросы ({topRequests.length})
        </h3>
        <div className="space-y-1 max-h-80 overflow-y-auto results-container">
          {topRequests.map((item, index) => (
            <KeywordRow 
              key={index} 
              phrase={item.phrase} 
              count={item.count} 
            />
          ))}
        </div>
      </div>

      {/* Ассоциации */}
      {associations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--glass-text-primary)' }}>
            Похожие запросы ({associations.length})
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto results-container">
            {associations.map((item, index) => (
              <KeywordRow 
                key={index} 
                phrase={item.phrase} 
                count={item.count} 
                isAssociation={true}
              />
            ))}
          </div>
        </div>
      )}
      
      <AIAnalysis
        keywords={[...topRequests.map(item => item.phrase), ...associations.map(item => item.phrase)]}
        visible={showAIAnalysis}
        onClose={() => setShowAIAnalysis(false)}
      />

      {/* Export Modal */}
      {showExportModal && (
        <Portal>
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(8px)'
            }}
            onClick={(e) => e.target === e.currentTarget && setShowExportModal(false)}
          >
            <div 
              className="w-full h-full md:w-[90vw] md:h-[90vh] md:max-w-4xl md:rounded-xl border overflow-hidden flex flex-col"
              style={{
                background: 'var(--glass-bg-card, #1a1a2e)',
                borderColor: 'var(--glass-border, #333)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
              }}
            >
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-opacity-10">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--glass-text-primary)' }}>
                  Выберите данные для экспорта
                </h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-opacity-10 transition-colors"
                  style={{ color: 'var(--glass-text-secondary)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Controls */}
              <div className="flex-shrink-0 p-4 border-b border-opacity-10">
                <div className="flex items-center justify-between">
                  <div className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                    Выбрано: {selectedItems.size} из {allItems.length}
                  </div>
                  <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="glass-button px-3 py-1 text-sm"
                  >
                    Выбрать все
                  </button>
                  <button
                    onClick={selectNone}
                    className="glass-button px-3 py-1 text-sm"
                  >
                    Снять все
                  </button>
                </div>
              </div>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto p-4 results-container">
              <div className="space-y-2">
                {topRequests.length > 0 && (
                  <>
                    <h4 className="font-medium text-sm mb-2" style={{ color: 'var(--glass-text-primary)' }}>
                      Популярные запросы ({topRequests.length})
                    </h4>
                    {topRequests.map((item, index) => {
                      const itemId = `top-${item.phrase}`
                      const isSelected = selectedItems.has(itemId)
                      return (
                        <div
                          key={itemId}
                          className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${
                            isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-opacity-20 hover:bg-opacity-5'
                          }`}
                          style={{ borderColor: isSelected ? 'var(--glass-blue)' : 'var(--glass-border)' }}
                          onClick={() => toggleSelectItem(itemId)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectItem(itemId)}
                            className="w-4 h-4"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-sm" style={{ color: 'var(--glass-text-primary)' }}>
                                {index + 1}. {item.phrase}
                              </span>
                              <span className="font-semibold text-sm" style={{ color: 'var(--glass-blue)' }}>
                                {formatNumber(item.count)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}

                {associations.length > 0 && (
                  <>
                    <h4 className="font-medium text-sm mb-2 mt-4" style={{ color: 'var(--glass-text-primary)' }}>
                      Похожие запросы ({associations.length})
                    </h4>
                    {associations.map((item, index) => {
                      const itemId = `assoc-${item.phrase}`
                      const isSelected = selectedItems.has(itemId)
                      return (
                        <div
                          key={itemId}
                          className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${
                            isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-opacity-20 hover:bg-opacity-5'
                          }`}
                          style={{ borderColor: isSelected ? 'var(--glass-blue)' : 'var(--glass-border)' }}
                          onClick={() => toggleSelectItem(itemId)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectItem(itemId)}
                            className="w-4 h-4"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-sm opacity-75" style={{ color: 'var(--glass-text-primary)' }}>
                                <span className="text-xs opacity-75 mr-1">АССОЦ:</span>
                                {item.phrase}
                              </span>
                              <span className="font-semibold text-sm" style={{ color: 'var(--glass-blue)' }}>
                                {formatNumber(item.count)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-6 border-t border-opacity-10">
              <div className="flex gap-3">
                <button
                  onClick={handleExport}
                  disabled={selectedItems.size === 0}
                  className="glass-button-primary px-4 py-2 flex-1 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Экспортировать ({selectedItems.size})
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="glass-button px-4 py-2"
                >
                  Отмена
                </button>
              </div>
            </div>
            </div>
          </div>
        </Portal>
      )}
      </div>
    </div>
  )
}