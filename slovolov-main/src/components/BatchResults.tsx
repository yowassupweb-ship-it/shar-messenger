'use client'

import { useState } from 'react'
import { KeywordData } from '@/types/yandex-wordstat'
import { hotnessColors, hotnessLabels } from '@/lib/yandex-wordstat'
import { AIAnalysis } from './AIAnalysis'

interface BatchResultsProps {
  results: KeywordData[]
  errors: Array<{ phrase: string; error: string }>
  onExport?: () => void
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('ru-RU').format(num)
}

export function BatchResults({ results, errors, onExport }: BatchResultsProps) {
  const [showAIAnalysis, setShowAIAnalysis] = useState(false)
  
  if (results.length === 0 && errors.length === 0) {
    return null
  }

  const totalProcessed = results.length + errors.length
  const successRate = (results.length / totalProcessed * 100).toFixed(1)

  // Группировка по горячести
  const hotnessStats = results.reduce((acc, result) => {
    const hotness = result.hotness || 'cold'
    acc[hotness] = (acc[hotness] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Суммарная статистика
  const totalShows = results.reduce((sum, result) => sum + (result.count || 0), 0)
  const avgShows = results.length > 0 ? Math.round(totalShows / results.length) : 0
  const maxShows = results.reduce((max, result) => Math.max(max, result.count || 0), 0)
  const minShows = results.reduce((min, result) => Math.min(min, result.count || 0), Infinity)
  const finalMinShows = minShows === Infinity ? 0 : minShows

  // Топ-10 фраз по показам
  const topPhrases = [...results]
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 10)

  return (
    <div className="glass-card p-6">
      <div className="flex justify-between items-center mb-4">
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
          {onExport && results.length > 0 && (
            <button
              onClick={onExport}
              className="glass-button-primary px-3 py-2 text-sm flex items-center space-x-2"
              style={{
                borderRadius: '8px'
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Экспорт</span>
            </button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--glass-text-primary)' }}>Результаты пакетной обработки</h2>
        <div className="flex items-center space-x-4 text-sm mt-1" style={{ color: 'var(--glass-text-secondary)' }}>
          <span>Успешно: {results.length}</span>
          <span>Ошибок: {errors.length}</span>
          <span>Успешность: {successRate}%</span>
        </div>
      </div>

      {/* Суммарная статистика */}
      {results.length > 0 && (
        <div className="glass-card mb-6 p-4">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--glass-text-primary)' }}>
            Общая статистика по всем фразам
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--glass-blue)' }}>
                {formatNumber(totalShows)}
              </div>
              <div className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                Общие показы
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--glass-green)' }}>
                {formatNumber(avgShows)}
              </div>
              <div className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                Средние показы
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--glass-orange)' }}>
                {formatNumber(maxShows)}
              </div>
              <div className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                Максимум
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--glass-text-primary)' }}>
                {formatNumber(finalMinShows)}
              </div>
              <div className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                Минимум
              </div>
            </div>
          </div>

          {/* Топ-10 фраз */}
          <div>
            <h4 className="text-md font-medium mb-3" style={{ color: 'var(--glass-text-primary)' }}>
              Топ-10 фраз по показам
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {topPhrases.map((phrase, index) => (
                <div key={index} className="flex justify-between items-center py-2 px-3 rounded" 
                     style={{ background: 'rgba(49, 50, 68, 0.3)' }}>
                  <span className="text-sm truncate flex-1" style={{ color: 'var(--glass-text-primary)' }}>
                    {index + 1}. {phrase.phrase}
                  </span>
                  <span className="text-sm font-medium ml-2" style={{ color: 'var(--glass-blue)' }}>
                    {formatNumber(phrase.count)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Суммарная статистика */}
      {results.length > 0 && (
        <div className="glass-card mb-6">
          <h3 className="text-md font-semibold mb-3" style={{ color: 'var(--glass-text-primary)' }}>
            Суммарная статистика по всем фразам
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg" style={{ background: 'var(--glass-bg-tertiary)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--glass-text-tertiary)' }}>
                Общее количество показов
              </div>
              <div className="text-2xl font-bold" style={{ color: 'var(--glass-blue)' }}>
                {formatNumber(results.reduce((sum, item) => sum + item.count, 0))}
              </div>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ background: 'var(--glass-bg-tertiary)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--glass-text-tertiary)' }}>
                Среднее количество показов
              </div>
              <div className="text-2xl font-bold" style={{ color: 'var(--glass-green)' }}>
                {formatNumber(Math.round(results.reduce((sum, item) => sum + item.count, 0) / results.length))}
              </div>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ background: 'var(--glass-bg-tertiary)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--glass-text-tertiary)' }}>
                Всего проанализировано фраз
              </div>
              <div className="text-2xl font-bold" style={{ color: 'var(--glass-purple)' }}>
                {results.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Статистика по горячести */}
      {results.length > 0 && (
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-3" style={{ color: 'var(--glass-text-primary)' }}>Распределение по популярности</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(hotnessColors).map(([hotness, color]) => {
              const count = hotnessStats[hotness] || 0
              const percentage = results.length > 0 ? (count / results.length * 100).toFixed(1) : '0'
              
              return (
                <div 
                  key={hotness}
                  className="p-3 rounded-md text-center border"
                  style={{ 
                    backgroundColor: 'var(--glass-bg-tertiary)',
                    borderColor: 'var(--glass-border)'
                  }}
                >
                  <div className={`font-semibold text-lg hotness-${hotness}`}>{count}</div>
                  <div className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>{hotnessLabels[hotness as keyof typeof hotnessLabels]}</div>
                  <div className="text-xs" style={{ color: 'var(--glass-text-tertiary)' }}>{percentage}%</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Успешные результаты */}
      {results.length > 0 && (
          <div className="mb-3">
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--glass-text-primary)' }}>Результаты</h3>
            <div className="overflow-x-auto rounded-md border" style={{ borderColor: 'var(--glass-border)' }}>
              <table className="min-w-full divide-y" style={{ backgroundColor: 'var(--glass-bg-secondary)' }}>
                <thead style={{ backgroundColor: 'var(--glass-bg-tertiary)' }}>
                  <tr>
                    <th className="px-2 py-1 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--glass-text-secondary)' }}>
                      №
                    </th>
                    <th className="px-3 py-1 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--glass-text-secondary)' }}>
                      Фраза
                    </th>
                    <th className="px-3 py-1 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--glass-text-secondary)' }}>
                      Запросов
                    </th>
                    <th className="px-3 py-1 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--glass-text-secondary)' }}>
                      Популярность
                    </th>
                  </tr>
                </thead>
                <tbody style={{ backgroundColor: 'var(--glass-bg-secondary)' }}>
                  {results
                    .sort((a, b) => b.count - a.count)
                    .map((result, index) => {
                      const hotness = result.hotness || 'cold'
                      return (
                        <tr key={index} className="border-t" style={{ borderColor: 'var(--glass-border)' }}>
                          <td className="px-2 py-1 whitespace-nowrap">
                            <div className="text-xs font-mono" style={{ color: 'var(--glass-text-tertiary)' }}>
                              {index + 1}.
                            </div>
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap">
                            <div className="text-xs font-medium" style={{ color: 'var(--glass-text-primary)' }}>
                              {result.phrase}
                            </div>
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap">
                            <div className={`text-xs font-semibold hotness-${hotness}`}>
                              {formatNumber(result.count)}
                            </div>
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap">
                            <span 
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full hotness-${hotness}`}
                            >
                              {hotnessLabels[hotness]}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
      )}

      {/* Ошибки */}
      {errors.length > 0 && (
        <div>
          <h3 className="text-md font-semibold mb-3 hotness-very-hot">Ошибки обработки</h3>
          <div className="rounded-md p-4 border" style={{ 
            backgroundColor: 'var(--glass-bg-tertiary)',
            borderColor: 'var(--glass-border)'
          }}>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {errors.map((error, index) => (
                <div key={index} className="text-sm">
                  <span className="font-medium hotness-very-hot">{error.phrase}:</span>{' '}
                  <span className="hotness-hot">{error.error}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <AIAnalysis
        keywords={results.map(result => result.phrase)}
        visible={showAIAnalysis}
        onClose={() => setShowAIAnalysis(false)}
      />
    </div>
  )
}