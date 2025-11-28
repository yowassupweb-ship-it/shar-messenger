import { NextRequest, NextResponse } from 'next/server'
import { YandexWordstatAPI, WordstatRateLimiter, calculateHotness } from '@/lib/yandex-wordstat'
import { KeywordData, BatchProcessingOptions } from '@/types/yandex-wordstat'
import { getYandexToken } from '@/lib/token-utils'

const API_URL = process.env.YANDEX_WORDSTAT_API_URL || 'https://api.wordstat.yandex.net'

function createAPI(token: string) {
  return new YandexWordstatAPI({
    apiUrl: API_URL,
    oauthToken: token
  })
}

export async function POST(request: NextRequest) {
  try {
    const options: BatchProcessingOptions = await request.json()
    
    const token = await getYandexToken()
    if (!token) {
      return NextResponse.json(
        { error: 'Отсутствует OAuth токен' }, 
        { status: 401 }
      )
    }

    const api = createAPI(token)
    
    // Создаем ограничитель запросов
    const rateLimiter = new WordstatRateLimiter(10, 1000)
    
    const results: KeywordData[] = []
    const errors: Array<{ phrase: string; error: string }> = []
    
    // Обрабатываем каждую фразу
    for (let i = 0; i < options.phrases.length; i++) {
      const phrase = options.phrases[i].trim()
      
      if (!phrase) continue
      
      try {
        // Получаем топ запросы для каждой фразы
        const topRequestsData = await rateLimiter.addRequest(() => 
          api.getTopRequests({
            phrase,
            numPhrases: parseInt(process.env.DEFAULT_RESULTS_LIMIT || '50'),
            regions: options.regions,
            devices: options.devices
          })
        )
        
        let regionsData = undefined
        let dynamicsData = undefined
        
        // Получаем данные по регионам если нужно
        if (options.includeRegions) {
          try {
            const regionsResponse = await rateLimiter.addRequest(() =>
              api.getRegions({
                phrase,
                regionType: 'all',
                devices: options.devices
              })
            )
            regionsData = regionsResponse.regions
          } catch (regionsError) {
            console.warn(`Не удалось получить данные по регионам для "${phrase}":`, regionsError)
          }
        }
        
        // Получаем динамику если нужно
        if (options.includeDynamics) {
          try {
            // Используем период за последние 30 дней для monthly
            const fromDate = new Date()
            fromDate.setDate(fromDate.getDate() - 30)
            
            const dynamicsResponse = await rateLimiter.addRequest(() =>
              api.getDynamics({
                phrase,
                period: options.dynamicsPeriod || 'monthly',
                fromDate: fromDate.toISOString().split('T')[0],
                regions: options.regions,
                devices: options.devices
              })
            )
            dynamicsData = dynamicsResponse.dynamics
          } catch (dynamicsError) {
            console.warn(`Не удалось получить динамику для "${phrase}":`, dynamicsError)
          }
        }
        
        const keywordData: KeywordData = {
          phrase,
          count: topRequestsData.totalCount,
          hotness: calculateHotness(topRequestsData.totalCount),
          regions: regionsData,
          dynamics: dynamicsData
        }
        
        results.push(keywordData)
        
      } catch (error) {
        console.error(`Ошибка обработки фразы "${phrase}":`, error)
        errors.push({
          phrase,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка'
        })
      }
    }
    
    return NextResponse.json({
      results,
      errors,
      processed: results.length,
      total: options.phrases.length
    })
    
  } catch (error) {
    console.error('Ошибка в API batch-process:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message }, 
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' }, 
      { status: 500 }
    )
  }
}