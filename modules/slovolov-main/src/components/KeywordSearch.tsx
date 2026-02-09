'use client'

import { useState, useEffect } from 'react'
import { DeviceType, Region } from '@/types/yandex-wordstat'
import RegionFilter from './RegionFilter'
import DeviceDropdown from './DeviceDropdown'
import SearchPresets from './SearchPresets'
import ResultsLimitDropdown from './ResultsLimitDropdown'
import DynamicsPeriodDropdown from './DynamicsPeriodDropdown'
import { fallbackRegions } from '@/lib/fallback-regions'
import Modal from './Modal'

interface KeywordSearchProps {
  onSearch: (phrase: string, options: SearchOptions) => void
  onDynamicsPeriodChange?: (period: 'daily' | 'weekly' | 'monthly') => void
  loading?: boolean
}

export interface SearchOptions {
  numPhrases: number
  devices: DeviceType[]
  regions: number[]
  includeDynamics?: boolean
  dynamicsPeriod?: 'monthly' | 'weekly' | 'daily'
  fromDate?: string
  toDate?: string
}

export function KeywordSearch({ onSearch, onDynamicsPeriodChange, loading = false }: KeywordSearchProps) {
  const [phrase, setPhrase] = useState('')
  const [numPhrases, setNumPhrases] = useState(500)
  const [selectedDevices, setSelectedDevices] = useState<DeviceType[]>(['all'])
  const [selectedRegionIds, setSelectedRegionIds] = useState<number[]>([])
  const [allRegions, setAllRegions] = useState<Region[]>([])
  const [showOperatorsModal, setShowOperatorsModal] = useState(false)
  
  // Состояние для динамики (отключено по умолчанию)
  const [includeDynamics, setIncludeDynamics] = useState(false)
  const [dynamicsPeriod, setDynamicsPeriod] = useState<'monthly' | 'weekly' | 'daily'>('monthly')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const regions = selectedRegionIds

  // Больше не управляем body классами вручную — делает общий Modal

  // Загружаем сохранённую фразу поиска при монтировании
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPhrase = sessionStorage.getItem('search-phrase')
      if (savedPhrase) {
        setPhrase(savedPhrase)
      }
    }
  }, [])

  // Сохраняем фразу поиска при изменении
  const handlePhraseChange = (value: string) => {
    setPhrase(value)
    if (typeof window !== 'undefined') {
      if (value.trim()) {
        sessionStorage.setItem('search-phrase', value)
      } else {
        sessionStorage.removeItem('search-phrase')
      }
    }
  }

  // Загружаем конфигурацию и список регионов при монтировании компонента
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const configResponse = await fetch('/api/config')
        if (configResponse.ok) {
          const config = await configResponse.json()
          setNumPhrases(config.defaultResultsLimit)
        }
      } catch (error) {
        console.error('Ошибка загрузки конфигурации:', error)
      }
    }
    
    const loadRegions = async () => {
      try {
        const response = await fetch('/api/yandex-wordstat/regions-tree', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        if (response.ok) {
          const data = await response.json()
          console.log('Loaded regions from API:', data.regions?.length || 0)
          console.log('Sample regions:', (data.regions || fallbackRegions).slice(0, 3))

          // Нормализуем возможные формы ответа (regionId / id / region_id) и (regionName / name / region_name)
          const rawRegions = data.regions || fallbackRegions
          const normalized = (rawRegions as any[]).map((r) => ({
            regionId: Number(r?.regionId ?? r?.id ?? r?.region_id),
            regionName: r?.regionName ?? r?.name ?? r?.region_name ?? '',
            parentId: r?.parentId ?? r?.parent_id ?? undefined
          }))

          // Валидируем данные регионов
          const validRegions = normalized.filter((region) => 
            region && 
            typeof region.regionId === 'number' && !Number.isNaN(region.regionId) &&
            typeof region.regionName === 'string' &&
            region.regionName.trim().length > 0
          )

          console.log('Valid regions after filtering:', validRegions.length)
          setAllRegions(validRegions as Region[])
        } else {
          console.log('API регионов недоступен (статус:', response.status, '), используем fallback список')
          console.log('Fallback регионов:', fallbackRegions.length)
          setAllRegions(fallbackRegions)
        }
      } catch (error) {
        console.error('Ошибка загрузки регионов, используем fallback:', error)
        setAllRegions(fallbackRegions)
      }
    }
    
    loadConfig()
    loadRegions()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (phrase.trim()) {
      onSearch(phrase.trim(), {
        numPhrases,
        devices: selectedDevices,
        regions,
        includeDynamics: false, // Отключаем график динамики в разделе "Подбор"
        dynamicsPeriod,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Settings panel */}
      <div className="glass-card p-4">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Results limit */}
          <div className="min-w-0">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--glass-text-secondary)' }}>
              Результатов
            </label>
            <ResultsLimitDropdown 
              value={numPhrases}
              onChange={setNumPhrases}
              disabled={loading}
            />
          </div>

          {/* Device dropdown */}
          <div className="min-w-0">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--glass-text-secondary)' }}>
              Устройства
            </label>
            <DeviceDropdown 
              selectedDevices={selectedDevices}
              onDeviceChange={setSelectedDevices}
              disabled={loading}
            />
          </div>

          {/* Region dropdown */}
          <div className="min-w-0">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--glass-text-secondary)' }}>
              Регионы
            </label>
            <RegionFilter 
              regions={allRegions}
              selectedRegions={selectedRegionIds}
              onRegionChange={setSelectedRegionIds}
              loading={loading}
            />
          </div>

          {/* Period dropdown */}
          <div className="min-w-0">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--glass-text-secondary)' }}>
              Период
            </label>
            <DynamicsPeriodDropdown
              value={dynamicsPeriod}
              onChange={(newPeriod) => {
                setDynamicsPeriod(newPeriod)
                onDynamicsPeriodChange?.(newPeriod)
                if (!includeDynamics) setIncludeDynamics(true)
              }}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Search Presets */}
      <SearchPresets 
        currentPhrase={phrase}
        onApplyPreset={handlePhraseChange}
      />

      {/* Yandex-style search input */}
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="relative">
          <input
            type="text"
            value={phrase}
            onChange={(e) => handlePhraseChange(e.target.value)}
            className="yandex-search w-full pr-16"
            placeholder="Введите слово для поиска"
            required
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !phrase.trim()}
            className="search-button absolute right-2 top-1/2 transform -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-[#141a29] border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span style={{ color: '#141a29' }}>Найти</span>
            )}
          </button>
        </div>
      </form>
      
      {/* Help tooltip - центрировано под поисковой строкой */}
      <div className="flex justify-center mt-3">
        <button 
          type="button"
          onClick={() => setShowOperatorsModal(true)}
          className="text-xs px-3 py-2 rounded-lg hover:opacity-80 transition-all border"
          style={{ 
            color: 'var(--glass-text-secondary)', 
            backgroundColor: 'var(--glass-bg-tertiary)',
            borderColor: 'var(--glass-border)'
          }}
        >
          <svg className="w-3 h-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Операторы поиска Яндекс.Вордстат
        </button>
      </div>

      {/* Operators Modal */}
    <Modal isOpen={showOperatorsModal} onClose={() => setShowOperatorsModal(false)}>
      <div className="glass-card p-6 max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--glass-text-primary)' }}>
                Операторы поиска Яндекс Вордстат
              </h3>
              <button 
                onClick={() => setShowOperatorsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto dark-scrollbar" style={{ color: 'var(--glass-text-secondary)' }}>
              <div>
                <strong style={{ color: 'var(--glass-text-primary)' }}>!</strong> - Фиксирует форму слова
                <div className="text-xs mt-1 pl-4" style={{ color: 'var(--glass-text-tertiary)' }}>
                  Пример: <code>!купить телефон</code> - ищет именно "купить", а не "покупать"
                </div>
              </div>
              
              <div>
                <strong style={{ color: 'var(--glass-text-primary)' }}>+</strong> - Фиксирует стоп-слова
                <div className="text-xs mt-1 pl-4" style={{ color: 'var(--glass-text-tertiary)' }}>
                  Пример: <code>купить +в москве</code> - включает предлог "в"
                </div>
              </div>
              
              <div>
                <strong style={{ color: 'var(--glass-text-primary)' }}>" "</strong> - Фиксирует количество слов
                <div className="text-xs mt-1 pl-4" style={{ color: 'var(--glass-text-tertiary)' }}>
                  Пример: <code>"купить телефон"</code> - ищет фразы из двух слов
                </div>
              </div>
              
              <div>
                <strong style={{ color: 'var(--glass-text-primary)' }}>[ ]</strong> - Фиксирует порядок слов
                <div className="text-xs mt-1 pl-4" style={{ color: 'var(--glass-text-tertiary)' }}>
                  Пример: <code>[купить телефон]</code> - только в таком порядке
                </div>
              </div>
              
              <div>
                <strong style={{ color: 'var(--glass-text-primary)' }}>( )</strong> - Группировка
                <div className="text-xs mt-1 pl-4" style={{ color: 'var(--glass-text-tertiary)' }}>
                  Пример: <code>(купить | заказать) телефон</code>
                </div>
              </div>
              
              <div>
                <strong style={{ color: 'var(--glass-text-primary)' }}>|</strong> - Логическое ИЛИ
                <div className="text-xs mt-1 pl-4" style={{ color: 'var(--glass-text-tertiary)' }}>
                  Пример: <code>телефон | смартфон</code> - любое из слов
                </div>
              </div>
              
              <div>
                <strong style={{ color: 'var(--glass-text-primary)' }}>-</strong> - Исключение слова
                <div className="text-xs mt-1 pl-4" style={{ color: 'var(--glass-text-tertiary)' }}>
                  Пример: <code>телефон -чехол</code> - исключает запросы с "чехол"
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--glass-border)' }}>
              <p className="text-xs" style={{ color: 'var(--glass-text-tertiary)' }}>
                Операторы можно комбинировать для более точного поиска. Например: <code>![купить | заказать] "телефон samsung"</code>
              </p>
            </div>
          </div>
      </Modal>
    </div>
  )
}