// Типы для Яндекс Вордстат API

// Базовые типы
export interface WordstatConfig {
  apiUrl: string
  oauthToken: string
}

// Типы устройств (согласно документации Yandex API)
export type DeviceType = 'all' | 'desktop' | 'phone' | 'tablet'

// Регион
export interface Region {
  regionId: number
  regionName: string
  parentId?: number
}

// Запрос для получения топ запросов (согласно документации Yandex API)
export interface TopRequestsRequest {
  phrase: string
  numPhrases?: number  // От 1 до 2000, по умолчанию 50
  regions?: number[]
  devices?: DeviceType[]
}

// Ответ для топ запросов
export interface TopRequestsResponse {
  requestPhrase: string
  totalCount: number
  topRequests: Array<{
    phrase: string
    count: number
  }>
  associations: Array<{
    phrase: string
    count: number
  }>
  dynamics?: Array<{
    date: string
    count: number
  }>
  regions?: Array<{
    region_id: number
    region_name: string
    search_volume: number
    competition?: number
  }>
}

// Запрос для динамики
export interface DynamicsRequest {
  phrase: string
  period: 'monthly' | 'weekly' | 'daily'
  fromDate: string // YYYY-MM-DD
  toDate?: string // YYYY-MM-DD
  regions?: number[]
  devices?: DeviceType[]
}

// Ответ для динамики
export interface DynamicsResponse {
  dynamics: Array<{
    date: string
    count: number
    share?: number
  }>
}

// Запрос для регионов
export interface RegionsRequest {
  phrase: string
  regionType?: 'all' | 'cities' | 'regions'
  devices?: DeviceType[]
}

// Ответ для регионов
export interface RegionsResponse {
  regions: Array<{
    regionId: number
    count: number
    share: number
    affinityIndex: number
  }>
}

// Информация о пользователе - реальная структура от Yandex API
export interface UserInfo {
  userInfo: {
    login: string
    limitPerSecond: number
    dailyLimit: number
    dailyLimitRemaining: number
  }
}

// Обобщенные типы для компонентов
export interface KeywordData {
  phrase: string
  count: number
  hotness?: 'cold' | 'warm' | 'hot' | 'very-hot'
  regions?: RegionsResponse['regions']
  dynamics?: DynamicsResponse['dynamics']
}

export interface BatchProcessingOptions {
  phrases: string[]
  regions?: number[]
  devices?: DeviceType[]
  includeRegions?: boolean
  includeDynamics?: boolean
  dynamicsPeriod?: DynamicsRequest['period']
}

export interface ProcessingProgress {
  current: number
  total: number
  processed: KeywordData[]
  errors: Array<{
    phrase: string
    error: string
  }>
}