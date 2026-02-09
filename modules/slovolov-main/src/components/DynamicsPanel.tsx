'use client'

import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import DynamicsChart from './DynamicsChart'
import { KeywordSearch, SearchOptions } from './KeywordSearch'
import { TopRequestsResponse } from '@/types/yandex-wordstat'

interface DynamicsPanelProps {
  currentPhrase?: string
  searchResults?: TopRequestsResponse | null
  currentDynamicsPeriod?: 'daily' | 'weekly' | 'monthly'
  onDynamicsPeriodChange?: (period: 'daily' | 'weekly' | 'monthly') => void
  onLoadDynamics?: (phrase: string, fromDate?: string, toDate?: string, period?: 'daily' | 'weekly' | 'monthly') => void
  onSearch?: (phrase: string, options: SearchOptions) => void
  dynamicsData?: Array<{ date: string; count: number }>
  loading?: boolean
}

export default function DynamicsPanel({ 
  currentPhrase, 
  searchResults, 
  currentDynamicsPeriod = 'monthly',
  onDynamicsPeriodChange,
  onLoadDynamics,
  onSearch,
  dynamicsData,
  loading = false 
}: DynamicsPanelProps) {
  // Устанавливаем правильные даты по умолчанию
  const today = new Date()
  const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), 1) // Первое число месяца
  const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0) // Последнее число текущего месяца
  
  const [fromDate, setFromDate] = useState(lastYear.toISOString().split('T')[0])
  const [toDate, setToDate] = useState(thisMonthEnd.toISOString().split('T')[0])
  const [localPeriod, setLocalPeriod] = useState<'daily' | 'weekly' | 'monthly'>(currentDynamicsPeriod)

  // Автоматически загружаем динамику если есть фраза и результаты, но нет данных динамики
  useEffect(() => {
    // Проверяем что есть фраза, результаты поиска, но еще нет данных динамики
    if (currentPhrase && 
        searchResults && 
        searchResults.topRequests && 
        searchResults.topRequests.length > 0 &&
        !searchResults.dynamics && 
        !loading &&
        onLoadDynamics) {
      console.log('Автозагрузка динамики для фразы:', currentPhrase)
      onLoadDynamics(currentPhrase, fromDate || undefined, toDate || undefined, localPeriod)
    }
  }, [currentPhrase, searchResults?.topRequests?.length, searchResults?.dynamics])

  const handleLoadDynamics = () => {
    if (currentPhrase && onLoadDynamics) {
      // Корректируем даты в зависимости от периода
      let correctedFromDate = fromDate
      let correctedToDate = toDate

      if (localPeriod === 'monthly') {
        // Для месячного периода - первое число месяца для fromDate
        // Если fromDate пустой или некорректный, используем начало lastYear
        let fromDateObj = new Date(fromDate + 'T00:00:00')
        if (isNaN(fromDateObj.getTime())) {
          fromDateObj = new Date(lastYear.getFullYear(), lastYear.getMonth(), 1)
        }
        correctedFromDate = new Date(fromDateObj.getFullYear(), fromDateObj.getMonth(), 1).toISOString().split('T')[0]
        
        // Последнее число месяца для toDate
        if (toDate) {
          const toDateObj = new Date(toDate + 'T00:00:00')
          if (!isNaN(toDateObj.getTime())) {
            correctedToDate = new Date(toDateObj.getFullYear(), toDateObj.getMonth() + 1, 0).toISOString().split('T')[0]
          }
        }
      } else if (localPeriod === 'weekly') {
        // Для недельного периода - понедельник для fromDate
        const fromDateObj = new Date(fromDate + 'T00:00:00')
        const dayOfWeek = fromDateObj.getDay()
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const correctedFromDateObj = new Date(fromDateObj)
        correctedFromDateObj.setDate(fromDateObj.getDate() + mondayOffset)
        correctedFromDate = correctedFromDateObj.toISOString().split('T')[0]
        
        // Воскресенье для toDate
        if (toDate) {
          const toDateObj = new Date(toDate + 'T00:00:00')
          const toDateDayOfWeek = toDateObj.getDay()
          const sundayOffset = toDateDayOfWeek === 0 ? 0 : 7 - toDateDayOfWeek
          const correctedToDateObj = new Date(toDateObj)
          correctedToDateObj.setDate(toDateObj.getDate() + sundayOffset)
          correctedToDate = correctedToDateObj.toISOString().split('T')[0]
        }
      }

      onLoadDynamics(currentPhrase, correctedFromDate, correctedToDate, localPeriod)
    }
  }

  const handlePeriodChange = (period: 'daily' | 'weekly' | 'monthly') => {
    setLocalPeriod(period)
    onDynamicsPeriodChange?.(period)
  }

  return (
    <div className="space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Search Interface */}
        {onSearch && (
          <KeywordSearch 
            onSearch={onSearch} 
            onDynamicsPeriodChange={onDynamicsPeriodChange}
            loading={loading} 
          />
        )}
        
        {/* Настройки динамики */}
        <div className="glass-card p-4">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--glass-text-primary)' }}>
            Анализ динамики запросов
          </h2>
          
          <div className="dynamics-controls">
            <div className="dynamics-control-group">
              <label className="dynamics-control-label">
                <Calendar className="w-3.5 h-3.5 inline mr-1.5" style={{ color: 'white' }} />
                Период
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="dynamics-compact-input"
                  disabled={loading}
                  style={{
                    colorScheme: 'dark',
                    borderRadius: '8px'
                  }}
                />
                <span style={{ color: 'var(--glass-text-tertiary)' }}>—</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="dynamics-compact-input"
                  disabled={loading}
                  style={{
                    colorScheme: 'dark',
                    borderRadius: '8px'
                  }}
                />
              </div>
            </div>

            <div className="dynamics-control-group">
              <label className="dynamics-control-label">
                Детализация
              </label>
              <select
                value={localPeriod}
                onChange={(e) => handlePeriodChange(e.target.value as 'monthly' | 'weekly' | 'daily')}
                className="dynamics-compact-select"
                disabled={loading}
              >
                <option value="monthly">По месяцам</option>
                <option value="weekly">По неделям</option>
                <option value="daily">По дням</option>
              </select>
            </div>

            <div className="dynamics-control-group">
              <button
                onClick={handleLoadDynamics}
                disabled={loading || !currentPhrase}
                className="dynamics-compact-button"
              >
                {loading ? 'Загрузка...' : 'Обновить'}
              </button>
            </div>
          </div>

          {currentPhrase && (
            <div className="text-xs mt-3 px-2 py-1 rounded" style={{ 
              color: 'var(--glass-text-secondary)',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--glass-border)'
            }}>
              Фраза: <span style={{ color: 'var(--glass-text-primary)' }}>"{currentPhrase}"</span>
            </div>
          )}
        </div>
        
        {/* График динамики */}
        <div className="glass-card p-6">
          {(dynamicsData && dynamicsData.length > 0) || (searchResults?.dynamics && searchResults.dynamics.length > 0) ? (
            <DynamicsChart 
              data={(dynamicsData || searchResults?.dynamics) as Array<{ date: string; count: number }>}
              period={localPeriod}
              phrase={currentPhrase || ''}
            />
          ) : currentPhrase ? (
            <div className="text-center py-12" style={{ color: 'var(--glass-text-secondary)' }}>
              {loading ? (
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p>Загружаем данные динамики...</p>
                </div>
              ) : (
                <div>
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4" />
                  </svg>
                  <p>Нажмите "Обновить данные" для загрузки динамики</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12" style={{ color: 'var(--glass-text-secondary)' }}>
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>Сначала выполните поиск в разделе "Подбор"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}