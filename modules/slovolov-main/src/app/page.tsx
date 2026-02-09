'use client'

import { useState, useCallback } from 'react'

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

type Tab = 'search' | 'dynamics' | 'regions' | 'settings'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('search')
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

  const tabs = [
    { 
      id: 'search', 
      label: 'Подбор',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    { 
      id: 'dynamics', 
      label: 'Динамика',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      )
    },
    { 
      id: 'regions', 
      label: 'Регионы',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )
    },
    { 
      id: 'settings', 
      label: 'Настройки',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col">
        {/* Compact Header */}
        <header className="p-4 mb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="w-1/4 flex items-center">
            {/* left slot (place for menu / back button later) */}
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <svg className="logo-svg" width="200" height="18" viewBox="0 0 86 11" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1.72852 7.27539C2.06055 7.46289 2.39648 7.63281 2.73633 7.78516C3.08008 7.93359 3.43555 8.06055 3.80273 8.16602C4.16992 8.26758 4.55469 8.3457 4.95703 8.40039C5.36328 8.45508 5.79492 8.48242 6.25195 8.48242C6.80273 8.48242 7.27148 8.44727 7.6582 8.37695C8.04492 8.30273 8.35938 8.20312 8.60156 8.07812C8.84766 7.94922 9.02539 7.79688 9.13477 7.62109C9.24805 7.44531 9.30469 7.25391 9.30469 7.04688C9.30469 6.71484 9.16602 6.45312 8.88867 6.26172C8.61133 6.06641 8.18359 5.96875 7.60547 5.96875C7.35156 5.96875 7.08398 5.98633 6.80273 6.02148C6.52148 6.05273 6.23633 6.08789 5.94727 6.12695C5.66211 6.16602 5.37891 6.20312 5.09766 6.23828C4.82031 6.26953 4.55859 6.28516 4.3125 6.28516C3.90234 6.28516 3.50781 6.23242 3.12891 6.12695C2.75391 6.02148 2.41992 5.86328 2.12695 5.65234C1.83789 5.44141 1.60742 5.17773 1.43555 4.86133C1.26367 4.54492 1.17773 4.17578 1.17773 3.75391C1.17773 3.50391 1.21094 3.25586 1.27734 3.00977C1.34766 2.76367 1.45703 2.5293 1.60547 2.30664C1.75781 2.08008 1.95312 1.87109 2.19141 1.67969C2.42969 1.48438 2.7168 1.31641 3.05273 1.17578C3.39258 1.03516 3.7832 0.925781 4.22461 0.847656C4.66992 0.765625 5.17578 0.724609 5.74219 0.724609C6.15234 0.724609 6.56445 0.748047 6.97852 0.794922C7.39258 0.837891 7.79492 0.900391 8.18555 0.982422C8.58008 1.06445 8.95898 1.16406 9.32227 1.28125C9.68555 1.39453 10.0234 1.52148 10.3359 1.66211L9.52148 3.16211C9.26367 3.04883 8.98633 2.94531 8.68945 2.85156C8.39258 2.75391 8.08203 2.66992 7.75781 2.59961C7.43359 2.5293 7.09766 2.47461 6.75 2.43555C6.40625 2.39258 6.05469 2.37109 5.69531 2.37109C5.18359 2.37109 4.76172 2.4082 4.42969 2.48242C4.10156 2.55664 3.83984 2.65234 3.64453 2.76953C3.44922 2.88281 3.3125 3.01172 3.23438 3.15625C3.16016 3.29688 3.12305 3.4375 3.12305 3.57812C3.12305 3.85156 3.24609 4.07617 3.49219 4.25195C3.73828 4.42383 4.11328 4.50977 4.61719 4.50977C4.82031 4.50977 5.05273 4.49609 5.31445 4.46875C5.58008 4.4375 5.85742 4.4043 6.14648 4.36914C6.43945 4.33398 6.73633 4.30273 7.03711 4.27539C7.3418 4.24414 7.63672 4.22852 7.92188 4.22852C8.46094 4.22852 8.9375 4.28906 9.35156 4.41016C9.76953 4.53125 10.1191 4.70508 10.4004 4.93164C10.6816 5.1543 10.8945 5.42578 11.0391 5.74609C11.1836 6.0625 11.2559 6.41797 11.2559 6.8125C11.2559 7.33984 11.1328 7.81055 10.8867 8.22461C10.6445 8.63477 10.2969 8.98242 9.84375 9.26758C9.39453 9.54883 8.85156 9.76367 8.21484 9.91211C7.57812 10.0566 6.86914 10.1289 6.08789 10.1289C5.57227 10.1289 5.06836 10.0957 4.57617 10.0293C4.08398 9.9668 3.61133 9.87695 3.1582 9.75977C2.70898 9.63867 2.2793 9.49609 1.86914 9.33203C1.46289 9.16406 1.08594 8.98047 0.738281 8.78125L1.72852 7.27539ZM13.3008 0.841797H15.1582V8.37109H20.4844V10H13.3008V0.841797ZM21.75 5.39453C21.75 4.70312 21.877 4.07031 22.1309 3.49609C22.3848 2.92188 22.7402 2.42969 23.1973 2.01953C23.6582 1.60547 24.209 1.28516 24.8496 1.05859C25.4941 0.832031 26.207 0.71875 26.9883 0.71875C27.7656 0.71875 28.4766 0.832031 29.1211 1.05859C29.7656 1.28516 30.3164 1.60547 30.7734 2.01953C31.2344 2.42969 31.5918 2.92188 31.8457 3.49609C32.0996 4.07031 32.2266 4.70312 32.2266 5.39453C32.2266 6.08984 32.0996 6.72852 31.8457 7.31055C31.5918 7.88867 31.2344 8.38672 30.7734 8.80469C30.3164 9.22266 29.7656 9.54883 29.1211 9.7832C28.4766 10.0137 27.7656 10.1289 26.9883 10.1289C26.207 10.1289 25.4941 10.0137 24.8496 9.7832C24.209 9.54883 23.6582 9.22266 23.1973 8.80469C22.7402 8.38672 22.3848 7.88867 22.1309 7.31055C21.877 6.72852 21.75 6.08984 21.75 5.39453ZM23.6074 5.39453C23.6074 5.86719 23.6914 6.29297 23.8594 6.67188C24.0312 7.05078 24.2676 7.375 24.5684 7.64453C24.873 7.91016 25.2305 8.11523 25.6406 8.25977C26.0547 8.4043 26.5039 8.47656 26.9883 8.47656C27.4727 8.47656 27.9199 8.4043 28.3301 8.25977C28.7441 8.11523 29.1016 7.91016 29.4023 7.64453C29.7031 7.375 29.9395 7.05078 30.1113 6.67188C30.2832 6.29297 30.3691 5.86719 30.3691 5.39453C30.3691 4.92188 30.2832 4.49805 30.1113 4.12305C29.9395 3.74805 29.7031 3.43164 29.4023 3.17383C29.1016 2.91211 28.7441 2.71289 28.3301 2.57617C27.9199 2.43945 27.4727 2.37109 26.9883 2.37109C26.5039 2.37109 26.0547 2.43945 25.6406 2.57617C25.2305 2.71289 24.873 2.91211 24.5684 3.17383C24.2676 3.43164 24.0312 3.74805 23.8594 4.12305C23.6914 4.49805 23.6074 4.92188 23.6074 5.39453ZM33.0645 0.841797H35.1211L37.998 7.82617L40.875 0.841797H42.9316L38.918 10H37.0781L33.0645 0.841797ZM43.7695 5.39453C43.7695 4.70312 43.8965 4.07031 44.1504 3.49609C44.4043 2.92188 44.7598 2.42969 45.2168 2.01953C45.6777 1.60547 46.2285 1.28516 46.8691 1.05859C47.5137 0.832031 48.2266 0.71875 49.0078 0.71875C49.7852 0.71875 50.4961 0.832031 51.1406 1.05859C51.7852 1.28516 52.3359 1.60547 52.793 2.01953C53.2539 2.42969 53.6113 2.92188 53.8652 3.49609C54.1191 4.07031 54.2461 4.70312 54.2461 5.39453C54.2461 6.08984 54.1191 6.72852 53.8652 7.31055C53.6113 7.88867 53.2539 8.38672 52.793 8.80469C52.3359 9.22266 51.7852 9.54883 51.1406 9.7832C50.4961 10.0137 49.7852 10.1289 49.0078 10.1289C48.2266 10.1289 47.5137 10.0137 46.8691 9.7832C46.2285 9.54883 45.6777 9.22266 45.2168 8.80469C44.7598 8.38672 44.4043 7.88867 44.1504 7.31055C43.8965 6.72852 43.7695 6.08984 43.7695 5.39453ZM45.627 5.39453C45.627 5.86719 45.7109 6.29297 45.8789 6.67188C46.0508 7.05078 46.2871 7.375 46.5879 7.64453C46.8926 7.91016 47.25 8.11523 47.6602 8.25977C48.0742 8.4043 48.5234 8.47656 49.0078 8.47656C49.4922 8.47656 49.9395 8.4043 50.3496 8.25977C50.7637 8.11523 51.1211 7.91016 51.4219 7.64453C51.7227 7.375 51.959 7.05078 52.1309 6.67188C52.3027 6.29297 52.3887 5.86719 52.3887 5.39453C52.3887 4.92188 52.3027 4.49805 52.1309 4.12305C51.959 3.74805 51.7227 3.43164 51.4219 3.17383C51.1211 2.91211 50.7637 2.71289 50.3496 2.57617C49.9395 2.43945 49.4922 2.37109 49.0078 2.37109C48.5234 2.37109 48.0742 2.43945 47.6602 2.57617C47.25 2.71289 46.8926 2.91211 46.5879 3.17383C46.2871 3.43164 46.0508 3.74805 45.8789 4.12305C45.7109 4.49805 45.627 4.92188 45.627 5.39453ZM56.3086 0.841797H58.166V8.37109H63.4922V10H56.3086V0.841797ZM64.7578 5.39453C64.7578 4.70312 64.8848 4.07031 65.1387 3.49609C65.3926 2.92188 65.748 2.42969 66.2051 2.01953C66.666 1.60547 67.2168 1.28516 67.8574 1.05859C68.502 0.832031 69.2148 0.71875 69.9961 0.71875C70.7734 0.71875 71.4844 0.832031 72.1289 1.05859C72.7734 1.28516 73.3242 1.60547 73.7812 2.01953C74.2422 2.42969 74.5996 2.92188 74.8535 3.49609C75.1074 4.07031 75.2344 4.70312 75.2344 5.39453C75.2344 6.08984 75.1074 6.72852 74.8535 7.31055C74.5996 7.88867 74.2422 8.38672 73.7812 8.80469C73.3242 9.22266 72.7734 9.54883 72.1289 9.7832C71.4844 10.0137 70.7734 10.1289 69.9961 10.1289C69.2148 10.1289 68.502 10.0137 67.8574 9.7832C67.2168 9.54883 66.666 9.22266 66.2051 8.80469C65.748 8.38672 65.3926 7.88867 65.1387 7.31055C64.8848 6.72852 64.7578 6.08984 64.7578 5.39453ZM66.6152 5.39453C66.6152 5.86719 66.6992 6.29297 66.8672 6.67188C67.0391 7.05078 67.2754 7.375 67.5762 7.64453C67.8809 7.91016 68.2383 8.11523 68.6484 8.25977C69.0625 8.4043 69.5117 8.47656 69.9961 8.47656C70.4805 8.47656 70.9277 8.4043 71.3379 8.25977C71.752 8.11523 72.1094 7.91016 72.4102 7.64453C72.7109 7.375 72.9473 7.05078 73.1191 6.67188C73.291 6.29297 73.377 5.86719 73.377 5.39453C73.377 4.92188 73.291 4.49805 73.1191 4.12305C72.9473 3.74805 72.7109 3.43164 72.4102 3.17383C72.1094 2.91211 71.752 2.71289 71.3379 2.57617C70.9277 2.43945 70.4805 2.37109 69.9961 2.37109C69.5117 2.37109 69.0625 2.43945 68.6484 2.57617C68.2383 2.71289 67.8809 2.91211 67.5762 3.17383C67.2754 3.43164 67.0391 3.74805 66.8672 4.12305C66.6992 4.49805 66.6152 4.92188 66.6152 5.39453ZM76.0723 0.841797H78.1289L81.0059 7.82617L83.8828 0.841797H85.9395L81.9258 10H80.0859L76.0723 0.841797Z" fill="white"/>
            </svg>
            </div>
          </div>

          <div className="w-1/4 flex items-center justify-end">
            {/* right slot (place for settings / user) */}
          </div>
        </div>
      </header>

      {/* Compact Navigation */}
      <nav className="flex-shrink-0">
        <div className="hidden md:flex justify-center space-x-1 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`glass-tab flex items-center space-x-2 ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        {/* Mobile: 2x2 grid */}
        <div className="grid grid-cols-2 gap-1 p-1 md:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`glass-tab flex items-center justify-center space-x-2 ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

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
      <footer className="flex-shrink-0 p-4 text-center space-y-1">
        <div className="text-xs" style={{ color: 'var(--glass-text-secondary)' }}>
          Разработчик: <span className="mystic-signature">MysticStyles&nbsp;</span>
        </div>
        <div className="text-xs" style={{ color: 'var(--glass-text-tertiary)' }}>
          Используется API Яндекс.Вордстат
        </div>
      </footer>
      </div>
    </div>
  )
}