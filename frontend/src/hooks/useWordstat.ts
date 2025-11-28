'use client'

import { useState, useRef } from 'react'
import { 
  TopRequestsResponse, 
  DynamicsResponse, 
  RegionsResponse, 
  UserInfo,
  Region,
  KeywordData,
  BatchProcessingOptions
} from '@/types/yandex-wordstat'

export function useWordstat() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Простое кэширование и контроль запросов
  const activeRequests = useRef(new Set<string>())
  const cache = useRef(new Map<string, { data: any, timestamp: number }>())
  
  const CACHE_DURATION = 30 * 60 * 1000 // 30 минут для предотвращения частых запросов

  const makeRequest = async <T,>(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any
  ): Promise<T> => {
    // Создаем ключ для кэша
    const cacheKey = `${endpoint}-${JSON.stringify(data)}`
    
    // Проверяем кэш
    const cached = cache.current.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`Использован кэш для ${endpoint}`)
      return cached.data
    }
    
    // Предотвращаем множественные одинаковые запросы
    if (activeRequests.current.has(cacheKey)) {
      console.warn(`Запрос ${endpoint} уже выполняется, ожидаем завершения...`)
      // Ждём завершения активного запроса (максимум 5 попыток по 500ms)
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const cachedAfterWait = cache.current.get(cacheKey)
        if (cachedAfterWait) {
          console.log(`Получен результат после ожидания для ${endpoint}`)
          return cachedAfterWait.data
        }
        // Проверяем, завершился ли активный запрос
        if (!activeRequests.current.has(cacheKey)) {
          break
        }
      }
      // Если после ожидания запрос все еще активен или нет кеша, выполняем новый
      console.log(`Выполняем новый запрос для ${endpoint} после ожидания`)
    }
    
    activeRequests.current.add(cacheKey)
    console.log(`Выполняем запрос к ${endpoint}`)
    
    try {
      const response = await fetch(`/api/yandex-wordstat${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        ...(data && { body: JSON.stringify(data) }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ошибка ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Сохраняем в кэш только успешные результаты
      cache.current.set(cacheKey, { data: result, timestamp: Date.now() })
      console.log(`Результат сохранен в кэш для ${endpoint}`)
      
      return result
    } finally {
      activeRequests.current.delete(cacheKey)
    }
  }

  const getTopRequests = async (
    phrase: string,
    options: {
      numPhrases?: number
      regions?: number[]
      devices?: string[]
      includeDynamics?: boolean
      dynamicsPeriod?: 'monthly' | 'weekly' | 'daily'
      fromDate?: string
      toDate?: string
    } = {}
  ): Promise<TopRequestsResponse> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await makeRequest<TopRequestsResponse>('/top-requests', 'POST', {
        phrase,
        ...options,
      })
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getDynamics = async (
    phrase: string,
    options: {
      period?: 'monthly' | 'weekly' | 'daily'
      fromDate: string
      toDate?: string
      regions?: number[]
      devices?: string[]
    }
  ): Promise<DynamicsResponse> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await makeRequest<DynamicsResponse>('/dynamics', 'POST', {
        phrase,
        ...options,
      })
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getRegions = async (
    phrase: string,
    options: {
      regionType?: 'all' | 'cities' | 'regions'
      devices?: string[]
    } = {}
  ): Promise<RegionsResponse> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await makeRequest<RegionsResponse>('/regions', 'POST', {
        phrase,
        ...options,
      })
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getRegionsTree = async (): Promise<Region[]> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await makeRequest<{ regions: Region[] }>('/regions-tree', 'POST', {})
      return result.regions || []
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getUserInfo = async (): Promise<UserInfo> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await makeRequest<UserInfo>('/user-info', 'POST')
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const processBatch = async (
    options: BatchProcessingOptions
  ): Promise<{
    results: KeywordData[]
    errors: Array<{ phrase: string; error: string }>
    processed: number
    total: number
  }> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await makeRequest<{
        results: KeywordData[]
        errors: Array<{ phrase: string; error: string }>
        processed: number
        total: number
      }>('/batch-process', 'POST', options)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const clearCache = () => {
    cache.current.clear()
    console.log('Кэш очищен')
  }

  return {
    loading,
    error,
    clearError: () => setError(null),
    clearCache,
    getTopRequests,
    getDynamics,
    getRegions,
    getRegionsTree,
    getUserInfo,
    processBatch,
  }
}