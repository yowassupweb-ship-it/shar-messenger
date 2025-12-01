'use client'

import { useState, useCallback } from 'react'
import { TopRequestsResponse } from '@/types/yandex-wordstat'
import * as XLSX from 'xlsx'

interface ComboSearchProps {
  onBatchSearch: (keywords: string[], options: any) => Promise<Map<string, TopRequestsResponse>>
  loading: boolean
}

interface ComboResult {
  keyword: string
  results: TopRequestsResponse | null
  error?: string
  status: 'pending' | 'loading' | 'success' | 'error'
}

export function ComboSearch({ onBatchSearch, loading }: ComboSearchProps) {
  const [keywords, setKeywords] = useState('')
  const [results, setResults] = useState<ComboResult[]>([])
  const [activeKeywordIndex, setActiveKeywordIndex] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [numPhrases, setNumPhrases] = useState(100)

  const handleSearch = async () => {
    const keywordList = keywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0)

    if (keywordList.length === 0) return

    // Инициализируем результаты
    const initialResults: ComboResult[] = keywordList.map(keyword => ({
      keyword,
      results: null,
      status: 'pending'
    }))
    setResults(initialResults)
    setIsProcessing(true)
    setActiveKeywordIndex(0)

    // Обрабатываем последовательно с задержкой
    for (let i = 0; i < keywordList.length; i++) {
      setActiveKeywordIndex(i)
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: 'loading' } : r
      ))

      try {
        const batchResults = await onBatchSearch([keywordList[i]], { numPhrases })
        const result = batchResults.get(keywordList[i])
        
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, results: result || null, status: result ? 'success' : 'error' } : r
        ))
      } catch (error) {
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, error: (error as Error).message, status: 'error' } : r
        ))
      }

      // Задержка между запросами (1 секунда)
      if (i < keywordList.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    setIsProcessing(false)
  }

  const handleExportAll = () => {
    const successResults = results.filter(r => r.status === 'success' && r.results)
    if (successResults.length === 0) return

    // Создаем новую книгу Excel
    const workbook = XLSX.utils.book_new()

    for (const result of successResults) {
      if (!result.results) continue

      const rows: any[][] = []
      
      // Заголовок
      rows.push(['Фраза', 'Показы'])
      
      // Top запросы
      for (const item of result.results.topRequests || []) {
        rows.push([item.phrase, item.count])
      }
      
      // Пустая строка
      rows.push([])
      
      // Ассоциации
      if (result.results.associations && result.results.associations.length > 0) {
        rows.push(['Ассоциации', ''])
        for (const item of result.results.associations) {
          rows.push([item.phrase, item.count])
        }
      }

      // Создаем лист из данных
      const worksheet = XLSX.utils.aoa_to_sheet(rows)
      
      // Устанавливаем ширину колонок
      worksheet['!cols'] = [
        { wch: 50 }, // Фраза
        { wch: 15 }  // Показы
      ]
      
      // Очищаем имя листа от недопустимых символов и ограничиваем длину
      const sheetName = result.keyword
        .replace(/[\\/*?:\[\]]/g, '')
        .slice(0, 31)
      
      // Добавляем лист в книгу
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    }

    // Генерируем файл и скачиваем
    const filename = `combo_search_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, filename)
  }

  const successCount = results.filter(r => r.status === 'success').length
  const errorCount = results.filter(r => r.status === 'error').length
  const pendingCount = results.filter(r => r.status === 'pending' || r.status === 'loading').length

  return (
    <div className="space-y-6">
      {/* Input Area */}
      <div className="card">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-[var(--button)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Пакетный поиск
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Ключевые слова (по одному на строку)
            </label>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="туры в турцию&#10;отдых на море&#10;путевки в египет&#10;горящие туры"
              className="w-full h-48 px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)] resize-none text-[var(--foreground)]"
              disabled={isProcessing}
            />
            <p className="text-xs text-[var(--foreground)] opacity-60 mt-2">
              {keywords.split('\n').filter(k => k.trim()).length} ключевых слов
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Количество фраз на ключевое слово
              </label>
              <select
                value={numPhrases}
                onChange={(e) => setNumPhrases(Number(e.target.value))}
                className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)] text-[var(--foreground)]"
                disabled={isProcessing}
              >
                <option value={50}>50 фраз</option>
                <option value={100}>100 фраз</option>
                <option value={200}>200 фраз</option>
                <option value={500}>500 фраз</option>
              </select>
            </div>

            <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-4">
              <p className="text-sm text-[var(--foreground)] opacity-70">
                <strong>Расход квоты:</strong> {keywords.split('\n').filter(k => k.trim()).length} единиц
              </p>
              <p className="text-xs text-[var(--foreground)] opacity-50 mt-1">
                Каждый запрос расходует 1 единицу квоты API
              </p>
            </div>

            <button
              onClick={handleSearch}
              disabled={isProcessing || loading || !keywords.trim()}
              className="w-full bg-[var(--button)] text-white px-6 py-3 rounded-lg hover:bg-[var(--button)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Обработка {activeKeywordIndex + 1} из {results.length}...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Запустить пакетный поиск
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Progress */}
      {results.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Прогресс
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-500">✓ {successCount}</span>
              <span className="text-red-500">✗ {errorCount}</span>
              <span className="text-[var(--foreground)] opacity-60">⏳ {pendingCount}</span>
            </div>
          </div>

          <div className="w-full bg-[var(--border)] rounded-full h-2 mb-4">
            <div 
              className="bg-[var(--button)] h-2 rounded-full transition-all duration-300"
              style={{ width: `${((successCount + errorCount) / results.length) * 100}%` }}
            />
          </div>

          {/* Results Tabs */}
          <div className="border-b border-[var(--border)] mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {results.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveKeywordIndex(idx)}
                  className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                    activeKeywordIndex === idx 
                      ? 'bg-[var(--button)] text-white' 
                      : 'bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--hover)]'
                  }`}
                >
                  {result.status === 'loading' && (
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {result.status === 'success' && <span className="text-green-500">✓</span>}
                  {result.status === 'error' && <span className="text-red-500">✗</span>}
                  {result.keyword}
                </button>
              ))}
            </div>
          </div>

          {/* Active Result */}
          {results[activeKeywordIndex] && (
            <div>
              {results[activeKeywordIndex].status === 'loading' && (
                <div className="text-center py-8 text-[var(--foreground)] opacity-60">
                  Загрузка данных для "{results[activeKeywordIndex].keyword}"...
                </div>
              )}
              
              {results[activeKeywordIndex].status === 'error' && (
                <div className="text-center py-8 text-red-500">
                  Ошибка: {results[activeKeywordIndex].error || 'Неизвестная ошибка'}
                </div>
              )}
              
              {results[activeKeywordIndex].status === 'success' && results[activeKeywordIndex].results && (
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[var(--card)]">
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left py-2 px-3 text-[var(--foreground)]">Фраза</th>
                        <th className="text-right py-2 px-3 text-[var(--foreground)]">Показы</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results[activeKeywordIndex].results?.topRequests?.map((item, i) => (
                        <tr key={i} className="border-b border-[var(--border)]/50 hover:bg-[var(--hover)]">
                          <td className="py-2 px-3 text-[var(--foreground)]">{item.phrase}</td>
                          <td className="py-2 px-3 text-right text-[var(--foreground)] font-mono">
                            {item.count.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {results[activeKeywordIndex].status === 'pending' && (
                <div className="text-center py-8 text-[var(--foreground)] opacity-60">
                  Ожидание...
                </div>
              )}
            </div>
          )}

          {/* Export Button */}
          {successCount > 0 && !isProcessing && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <button
                onClick={handleExportAll}
                className="bg-[var(--button)] text-white px-6 py-2 rounded-lg hover:bg-[var(--button)]/90 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Экспортировать все ({successCount} ключей)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ComboSearch
