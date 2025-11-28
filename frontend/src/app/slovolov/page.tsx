'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { KeywordSearch, SearchOptions } from '@/components/KeywordSearch'
import type { DeviceType } from '@/types/yandex-wordstat'
import { KeywordResults } from '@/components/KeywordResults'
import RegionsPanel from '@/components/RegionsPanel'
import AiChatModal from '@/components/AiChatModal'
import ApiWarning from '@/components/ApiWarning'
import ErrorDisplay from '@/components/ErrorDisplay'
import { useWordstat } from '@/hooks/useWordstat'
import SettingsPanel from '@/components/SettingsPanel'
import DynamicsPanel from '@/components/DynamicsPanel'
import { exportTopRequestsToCSV } from '@/lib/export'
import { TopRequestsResponse, KeywordData } from '@/types/yandex-wordstat'
import { loadRegionsTree, getRegionNameById } from '@/lib/regions-utils'
import '../slovolov-styles.css'

type Tab = 'search' | 'dynamics' | 'regions' | 'settings'

function WordcatcherContent() {
  const searchParams = useSearchParams()
  
  // Синхронизируем activeTab с URL параметром
  const tabFromUrl = searchParams.get('tab') as Tab | null
  const activeTab: Tab = tabFromUrl && ['dynamics', 'regions', 'settings'].includes(tabFromUrl) 
    ? tabFromUrl 
    : 'search'

  const [currentPhrase, setCurrentPhrase] = useState('')
  const [currentDynamicsPeriod, setCurrentDynamicsPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [singleResults, setSingleResults] = useState<TopRequestsResponse | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [lastDevices, setLastDevices] = useState<DeviceType[]>(['all'])
  const [lastRegions, setLastRegions] = useState<number[]>([])
  const [lastRegionsRequest, setLastRegionsRequest] = useState<string>('')

  const { loading, error, clearError, getTopRequests, getDynamics, getRegions } = useWordstat()

  const handleSingleSearch = async (phrase: string, options: SearchOptions) => {
    try {
      setApiError(null)
      setCurrentPhrase(phrase)
      setLastDevices(options.devices)
      setLastRegions(options.regions)
      if (options.dynamicsPeriod) setCurrentDynamicsPeriod(options.dynamicsPeriod)
      const results = await getTopRequests(phrase, {
        numPhrases: options.numPhrases,
        regions: options.regions,
        devices: options.devices,
        includeDynamics: options.includeDynamics,
        dynamicsPeriod: options.dynamicsPeriod,
        fromDate: options.fromDate,
        toDate: options.toDate
      })
      setSingleResults(results)
    } catch (err) {
      console.error('Ошибка поиска:', err)
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setApiError(errorMessage)
    }
  }

  const handleExportSingle = (selectedItems: Array<{phrase: string, count: number, type: 'top' | 'association'}>) => {
    if (singleResults && selectedItems.length > 0) {
      // Создаем объект в формате TopRequestsResponse только с выбранными элементами
      const exportData = {
        ...singleResults,
        topRequests: selectedItems.filter(item => item.type === 'top').map(item => ({ phrase: item.phrase, count: item.count })),
        associations: selectedItems.filter(item => item.type === 'association').map(item => ({ phrase: item.phrase, count: item.count }))
      }
      exportTopRequestsToCSV(exportData)
    }
  }

  const handleDynamicsPeriodChange = (period: 'daily' | 'weekly' | 'monthly') => {
    setCurrentDynamicsPeriod(period)
  }

  const handleLoadDynamics = useCallback(async (phrase: string, fromDate?: string, toDate?: string, period?: 'daily' | 'weekly' | 'monthly') => {
    try {
      setApiError(null)
      const results = await getDynamics(phrase, {
        period: period || currentDynamicsPeriod,
        fromDate: fromDate!,
        toDate,
        devices: ['all'],
        regions: []
      })
      
      // Обновляем результаты с динамикой
      if (singleResults) {
        setSingleResults({
          ...singleResults,
          dynamics: results.dynamics
        })
      }
    } catch (err) {
      console.error('Ошибка загрузки динамики:', err)
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setApiError(errorMessage)
    }
  }, [getDynamics, currentDynamicsPeriod, singleResults])

  const handleLoadRegions = useCallback(async (phrase: string) => {
    // Защита от дубликатов
    const requestKey = `${phrase}`
    if (requestKey === lastRegionsRequest) {
      console.log('Skipping duplicate regions request for:', phrase)
      return
    }
    setLastRegionsRequest(requestKey)
    
    try {
      setApiError(null)
      
      // Загружаем дерево регионов сначала (без квоты)
      console.log('Загрузка дерева регионов...')
      const regionsTree = await loadRegionsTree()
      console.log('Regions tree загружен:', regionsTree.length, 'регионов')
      
      // Затем загружаем данные по регионам для фразы (использует 2 единицы квоты)
      console.log('Загрузка данных по регионам для фразы:', phrase)
      const results = await getRegions(phrase, {
        devices: ['all']
      })
      
      console.log('Regions API результат:', results)
      
      // Преобразуем формат RegionsResponse в формат TopRequestsResponse.regions с правильными названиями
      const convertedRegions = results.regions.map(region => {
        const regionName = getRegionNameById(region.regionId, regionsTree) || `Регион ${region.regionId}`
        console.log(`Регион ${region.regionId} -> ${regionName}`)
        return {
          region_id: region.regionId,
          region_name: regionName,
          search_volume: region.count,
          competition: region.affinityIndex / 100 // Преобразуем в долю от 0 до 1
        }
      })
      
      console.log('Конвертированные регионы:', convertedRegions)
      
      // Обновляем результаты с регионами
      setSingleResults(prev => prev ? {
        ...prev,
        regions: convertedRegions
      } : null)
    } catch (err) {
      console.error('Ошибка загрузки регионов:', err)
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setApiError(errorMessage)
      setLastRegionsRequest('') // Сбрасываем при ошибке, чтобы можно было повторить
    }
  }, [getRegions, lastRegionsRequest])

  return (
    <div className="min-h-screen flex flex-col">
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 text-sm pt-4">
          <Link href="/" className="text-[var(--button)] hover:underline">
            Инструменты
          </Link>
          <span className="text-[var(--foreground)] opacity-50">/</span>
          <span className="text-[var(--foreground)]">Словолов</span>
        </div>

        {/* Compact Header */}
        <header className="p-4 mb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="w-1/4 flex items-center">
            {/* left slot (place for menu / back button later) */}
          </div>

          <div className="flex-1 flex items-center justify-center">
            {/* Header space */}
          </div>

          <div className="w-1/4 flex items-center justify-end">
            {/* right slot (place for settings / user) */}
          </div>
        </div>
      </header>

      {/* Main Content with Scroll */}
      <div className="flex-1 px-3 pb-3" style={{ overflow: 'visible' }}>
        <div className="space-y-6 min-h-full">
          {/* API Warning */}
          <ApiWarning />
          
          {/* Error Display */}
          <ErrorDisplay 
            error={error || apiError} 
            onClose={() => {
              setApiError(null)
              clearError()
            }}
          />

          {/* Content based on active tab */}
          {activeTab === 'settings' ? (
            <div className="space-y-6">
              <div className="max-w-4xl mx-auto">
                <SettingsPanel />
              </div>
            </div>
          ) : activeTab === 'dynamics' ? (
            <div className="space-y-6">
              <div className="max-w-4xl mx-auto space-y-6">
                <DynamicsPanel 
                  currentPhrase={currentPhrase}
                  onLoadDynamics={handleLoadDynamics}
                  onSearch={handleSingleSearch}
                  onDynamicsPeriodChange={handleDynamicsPeriodChange}
                  dynamicsData={singleResults?.dynamics}
                  searchResults={singleResults}
                  loading={loading}
                />
              </div>
            </div>
          ) : activeTab === 'regions' ? (
            <div className="space-y-6">
              <div className="max-w-4xl mx-auto space-y-6">
                <RegionsPanel 
                  currentPhrase={currentPhrase}
                  onSearch={handleSingleSearch}
                  onLoadRegions={handleLoadRegions}
                  loading={loading}
                  regionsData={singleResults?.regions}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Search/Processing */}
                <div>
                  {activeTab === 'search' ? (
                    <KeywordSearch 
                      onSearch={handleSingleSearch} 
                      onDynamicsPeriodChange={handleDynamicsPeriodChange}
                      loading={loading} 
                    />
                  ) : null}
                </div>

                {/* Results */}
                <div>
                  {activeTab === 'search' ? (
                    <KeywordResults 
                      results={singleResults} 
                      dynamicsPeriod={currentDynamicsPeriod}
                      onExport={singleResults ? handleExportSingle : undefined}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* AI Chat Modal */}
          <AiChatModal 
            currentPhrase={currentPhrase} 
            searchResults={activeTab === 'search' ? singleResults : undefined}
            currentPage={activeTab}
            selectedDevices={lastDevices}
            selectedRegions={lastRegions}
            dynamicsPeriod={currentDynamicsPeriod}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 p-3 text-center">
        <div className="text-xs" style={{ color: 'var(--glass-text-tertiary)' }}>
          Используется API Яндекс.Вордстат
        </div>
      </footer>
      </div>
    </div>
  )
}

export default function WordcatcherPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}>
      <WordcatcherContent />
    </Suspense>
  )
}