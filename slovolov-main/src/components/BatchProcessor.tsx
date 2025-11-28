'use client'

import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { DeviceType, Region } from '@/types/yandex-wordstat'
import RegionFilter from './RegionFilter'
import { TimePeriodPresets } from './TimePeriodPresets'
import { fallbackRegions } from '@/lib/fallback-regions'

interface BatchProcessorProps {
  onProcess: (phrases: string[], options: BatchOptions) => void
  loading?: boolean
}

export interface BatchOptions {
  devices: DeviceType[]
  regions: number[]
  includeRegions: boolean
  includeDynamics: boolean
  dynamicsPeriod: 'monthly' | 'weekly' | 'daily'
}

const deviceOptions = [
  { value: 'all' as DeviceType, label: 'Все устройства' },
  { value: 'desktop' as DeviceType, label: 'Компьютер' },
  { value: 'phone' as DeviceType, label: 'Мобильный' },
  { value: 'tablet' as DeviceType, label: 'Планшет' }
]

export function BatchProcessor({ onProcess, loading = false }: BatchProcessorProps) {
  const [phraseText, setPhraseText] = useState('')
  const [selectedDevices, setSelectedDevices] = useState<DeviceType[]>(['all'])
  const [selectedRegions, setSelectedRegions] = useState<number[]>([])
  const [allRegions, setAllRegions] = useState<Region[]>([])
  const [includeRegions, setIncludeRegions] = useState(false)
  const [includeDynamics, setIncludeDynamics] = useState(false)
  const [dynamicsPeriod, setDynamicsPeriod] = useState<'monthly' | 'weekly' | 'daily'>('monthly')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('')

  // Загружаем сохранённые фразы при монтировании
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPhrases = sessionStorage.getItem('batch-phrases')
      if (savedPhrases) {
        setPhraseText(savedPhrases)
      }
    }
  }, [])

  // Сохраняем фразы при изменении
  const handlePhraseTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setPhraseText(value)
    if (typeof window !== 'undefined') {
      if (value.trim()) {
        sessionStorage.setItem('batch-phrases', value)
      } else {
        sessionStorage.removeItem('batch-phrases')
      }
    }
  }

  const handlePresetSelect = (fromDate: string, toDate: string, label: string, period: 'monthly' | 'weekly' | 'daily') => {
    setFromDate(fromDate)
    setToDate(toDate)
    setSelectedPreset(label)
    setDynamicsPeriod(period) // Автоматически устанавливаем период
    setIncludeDynamics(true) // Автоматически включаем динамику при выборе периода
  }

  const phrases = phraseText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  // Загружаем регионы при монтировании компонента
  useEffect(() => {
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
    
    loadRegions()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (phrases.length > 0) {
      onProcess(phrases, {
        devices: selectedDevices,
        regions: selectedRegions,
        includeRegions,
        includeDynamics,
        dynamicsPeriod
      })
    }
  }

  const toggleDevice = (device: DeviceType) => {
    if (device === 'all') {
      setSelectedDevices(['all'])
    } else {
      const newDevices = selectedDevices.filter(d => d !== 'all')
      if (selectedDevices.includes(device)) {
        const filtered = newDevices.filter(d => d !== device)
        setSelectedDevices(filtered.length === 0 ? ['all'] : filtered)
      } else {
        setSelectedDevices([...newDevices, device])
      }
    }
  }

  return (
    <div className="glass-card p-6">
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phrases" className="block text-sm font-medium mb-2" style={{ color: 'var(--glass-text-primary)' }}>
              Ключевые фразы (каждая с новой строки)
            </label>
            <textarea
              id="phrases"
              value={phraseText}
              onChange={handlePhraseTextChange}
              className="glass-input w-full"
              placeholder={`купить телефон\nсмартфон цена\niphone 15\n...`}
              rows={8}
              required
              disabled={loading}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--glass-text-tertiary)' }}>
              Найдено фраз: {phrases.length}
            </p>
          </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--glass-text-primary)' }}>
            Типы устройств
          </label>
          <div className="grid grid-cols-2 gap-2">
            {deviceOptions.map((device) => (
              <label key={device.value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDevices.includes(device.value)}
                  onChange={() => toggleDevice(device.value)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                  disabled={loading}
                />
                <span className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>{device.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Time Period Presets */}
        <div className="glass-card p-4">
          <TimePeriodPresets onPresetSelect={handlePresetSelect} />
          
          {selectedPreset && (
            <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(137, 180, 250, 0.1)', border: '1px solid var(--glass-blue)' }}>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium" style={{ color: 'var(--glass-blue)' }}>
                  Выбран период: {selectedPreset}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPreset('')
                    setFromDate('')
                    setToDate('')
                    setIncludeDynamics(false)
                  }}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: 'rgba(137, 180, 250, 0.2)', color: 'var(--glass-blue)' }}
                >
                  Сбросить
                </button>
              </div>
              
              {fromDate && toDate && (
                <div className="mt-2">
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--glass-text-secondary)' }}>
                    <Calendar className="w-3.5 h-3.5 inline mr-1.5" style={{ color: 'white' }} />
                    Период
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="glass-input flex-1 text-sm"
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
                      className="glass-input flex-1 text-sm"
                      disabled={loading}
                      style={{
                        colorScheme: 'dark',
                        borderRadius: '8px'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Region selection */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--glass-text-primary)' }}>
            Регионы
          </label>
          <RegionFilter 
            regions={allRegions}
            selectedRegions={selectedRegions}
            onRegionChange={setSelectedRegions}
            loading={loading}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium" style={{ color: 'var(--glass-text-primary)' }}>
            Дополнительные данные
          </h3>
          
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeRegions}
              onChange={(e) => setIncludeRegions(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
              disabled={loading}
            />
            <span className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
              Включить данные по регионам
            </span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDynamics}
              onChange={(e) => setIncludeDynamics(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
              disabled={loading}
            />
            <span className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
              Включить динамику запросов
            </span>
          </label>

          {includeDynamics && (
            <div className="ml-6">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--glass-text-secondary)' }}>
                Период динамики
              </label>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setDynamicsPeriod('daily')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                    dynamicsPeriod === 'daily'
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'glass-button'
                  }`}
                  disabled={loading}
                >
                  По дням
                </button>
                <button
                  type="button"
                  onClick={() => setDynamicsPeriod('weekly')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                    dynamicsPeriod === 'weekly'
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'glass-button'
                  }`}
                  disabled={loading}
                >
                  По неделям
                </button>
                <button
                  type="button"
                  onClick={() => setDynamicsPeriod('monthly')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                    dynamicsPeriod === 'monthly'
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'glass-button'
                  }`}
                  disabled={loading}
                >
                  По месяцам
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="glass-alert glass-alert-warning">
          <div className="flex items-start space-x-3">
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'var(--glass-orange)' }}
            >
              <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: 'var(--glass-text-primary)' }}>
              <strong>Внимание!</strong> Пакетная обработка может занять много времени и расходовать квоту API.
              Рекомендуемый лимит: не более 50 фраз за раз.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || phrases.length === 0}
          className="search-button w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-[#141a29] border-t-transparent rounded-full animate-spin"></div>
              <span style={{ color: '#141a29' }}>Обработка...</span>
            </div>
          ) : (
            <span style={{ color: '#141a29' }}>
              Обработать {phrases.length > 0 ? `${phrases.length} фраз` : 'фразы'}
            </span>
          )}
        </button>
      </form>
      </div>
    </div>
  )
}