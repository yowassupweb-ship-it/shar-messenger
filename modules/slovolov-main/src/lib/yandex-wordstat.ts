import {
  WordstatConfig,
  TopRequestsRequest,
  TopRequestsResponse,
  DynamicsRequest,
  DynamicsResponse,
  RegionsRequest,
  RegionsResponse,
  UserInfo,
  Region,
} from '@/types/yandex-wordstat'

export class YandexWordstatAPI {
  private config: WordstatConfig

  constructor(config: WordstatConfig) {
    this.config = config
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async makeRequest<T>(endpoint: string, data: any): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`
    
    console.log(`[WordstatAPI] POST ${url}`)
    console.log(`[WordstatAPI] Token: ${this.config.oauthToken.substring(0, 10)}...`)
    console.log(`[WordstatAPI] Token length: ${this.config.oauthToken.length}`)
    
    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'Authorization': `Bearer ${this.config.oauthToken}`,
      },
      body: JSON.stringify(data)
    }
    
    console.log(`[WordstatAPI] Request data:`, JSON.stringify(data, null, 2))

    const response = await fetch(url, requestOptions)

    console.log(`[WordstatAPI] Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[WordstatAPI] Error response:`, errorText)
      
      if (response.status === 503) {
        throw new Error('API недоступен. Попробуйте позже.')
      }
      if (response.status === 429) {
        throw new Error(`Превышена квота запросов: ${errorText}`)
      }
      if (response.status === 403) {
        throw new Error(`Доступ запрещен. Возможные причины:
1. Неверный OAuth токен
2. Не подана заявка на доступ к API Wordstat в поддержку Яндекс Директа
3. ClientID не соответствует токену
Подробности: ${errorText}`)
      }
      if (response.status === 401) {
        throw new Error(`Неверный токен авторизации: ${errorText}`)
      }
      throw new Error(`HTTP ошибка ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log(`[WordstatAPI] Response:`, result)
    
    return result
  }

  /**
   * Получить дерево регионов
   */
  async getRegionsTree(): Promise<Region[]> {
    return this.makeRequest<Region[]>('/v1/getRegionsTree', {})
  }

  /**
   * Получить топ запросы
   */
  async getTopRequests(request: TopRequestsRequest): Promise<TopRequestsResponse> {
    const params = {
      phrase: request.phrase,
      ...(request.numPhrases && { numPhrases: request.numPhrases }),
      ...(request.regions && request.regions.length > 0 && { regions: request.regions }),
      ...(request.devices && request.devices.length > 0 && { devices: request.devices }),
    }
    
    return this.makeRequest<TopRequestsResponse>('/v1/topRequests', params)
  }

  /**
   * Получить динамику запросов
   */
  async getDynamics(request: DynamicsRequest): Promise<DynamicsResponse> {
    const params = {
      phrase: request.phrase,
      period: request.period,
      fromDate: request.fromDate,
      ...(request.toDate && { toDate: request.toDate }),
      ...(request.regions && request.regions.length > 0 && { regions: request.regions }),
      ...(request.devices && request.devices.length > 0 && { devices: request.devices }),
    }
    
    return this.makeRequest<DynamicsResponse>('/v1/dynamics', params)
  }

  /**
   * Получить распределение по регионам
   */
  async getRegions(request: RegionsRequest): Promise<RegionsResponse> {
    const params = {
      phrase: request.phrase,
      ...(request.regionType && { regionType: request.regionType }),
      ...(request.devices && request.devices.length > 0 && { devices: request.devices }),
    }
    
    return this.makeRequest<RegionsResponse>('/v1/regions', params)
  }

  /**
   * Получить информацию о пользователе
   */
  async getUserInfo(): Promise<UserInfo> {
    return this.makeRequest<UserInfo>('/v1/userInfo', {})
  }
}

// Утилиты для работы с API
export class WordstatRateLimiter {
  private requestQueue: Array<() => void> = []
  private isProcessing = false
  private lastRequestTime = 0
  private requestsThisSecond = 0
  private currentSecond = 0

  constructor(
    private requestsPerSecond: number = 10,
    private requestsPerDay: number = 1000
  ) {}

  async addRequest<T>(apiCall: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await apiCall()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return
    }

    this.isProcessing = true

    while (this.requestQueue.length > 0) {
      const now = Date.now()
      const currentSecond = Math.floor(now / 1000)

      // Сброс счетчика если прошла секунда
      if (currentSecond !== this.currentSecond) {
        this.currentSecond = currentSecond
        this.requestsThisSecond = 0
      }

      // Проверка лимита запросов в секунду
      if (this.requestsThisSecond >= this.requestsPerSecond) {
        const waitTime = 1000 - (now % 1000)
        await this.sleep(waitTime)
        continue
      }

      // Выполнение запроса
      const request = this.requestQueue.shift()!
      this.requestsThisSecond++
      this.lastRequestTime = now

      await request()
      
      // Небольшая задержка между запросами
      await this.sleep(100)
    }

    this.isProcessing = false
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Функция для определения "горячести" ключевого слова
export function calculateHotness(count: number): 'cold' | 'warm' | 'hot' | 'very-hot' {
  if (!count || count <= 0) return 'cold'
  
  // Простой алгоритм на основе количества запросов
  if (count >= 100000) return 'very-hot'
  if (count >= 10000) return 'hot'
  if (count >= 1000) return 'warm'
  return 'cold'
}

// Цвета для отображения горячести
export const hotnessColors = {
  'cold': '#3b82f6',      // Синий
  'warm': '#f59e0b',      // Оранжевый
  'hot': '#ef4444',       // Красный
  'very-hot': '#dc2626'   // Темно-красный
}

export const hotnessLabels = {
  'cold': 'Холодный',
  'warm': 'Теплый',
  'hot': 'Горячий',
  'very-hot': 'Очень горячий'
}