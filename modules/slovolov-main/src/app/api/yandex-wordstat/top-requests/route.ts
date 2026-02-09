import { NextRequest, NextResponse } from 'next/server'
import { YandexWordstatAPI } from '@/lib/yandex-wordstat'
import { getYandexToken } from '@/lib/token-utils'

// Правильный API URL для Яндекс.Вордстат
const API_URL = process.env.YANDEX_WORDSTAT_API_URL || 'https://api.wordstat.yandex.net'

function createAPI(token: string) {
  return new YandexWordstatAPI({
    apiUrl: API_URL,
    oauthToken: token
  })
}

export async function POST(request: NextRequest) {
  try {
    const { 
      phrase, 
      numPhrases, 
      regions, 
      devices, 
      includeDynamics, 
      dynamicsPeriod, 
      fromDate, 
      toDate 
    } = await request.json()
    
    const token = getYandexToken()
    if (!token) {
      return NextResponse.json(
        { error: 'Отсутствует OAuth токен' }, 
        { status: 401 }
      )
    }

    const api = createAPI(token)

    // Получаем основные данные
    const result = await api.getTopRequests({
      phrase,
      numPhrases,
      regions,
      devices
    })

    // Если включена динамика и указаны даты, получаем динамику
    if (includeDynamics && fromDate) {
      try {
        const finalPeriod = (dynamicsPeriod || 'monthly') as 'monthly' | 'weekly' | 'daily'
        let normalizedFrom = fromDate as string | undefined
        let normalizedTo = toDate as string | undefined

        if (finalPeriod === 'monthly' && fromDate) {
          const d = new Date(fromDate + 'T00:00:00')
          if (!isNaN(d.getTime())) {
            normalizedFrom = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
          }
          if (toDate) {
            const t = new Date(toDate + 'T00:00:00')
            if (!isNaN(t.getTime())) {
              normalizedTo = new Date(t.getFullYear(), t.getMonth() + 1, 0).toISOString().split('T')[0]
            }
          }
        }

        const dynamicsResult = await api.getDynamics({
          phrase,
          period: finalPeriod,
          fromDate: normalizedFrom || fromDate,
          toDate: normalizedTo,
          regions,
          devices
        })
        
        // Добавляем динамику к результату
        result.dynamics = dynamicsResult.dynamics || []
      } catch (dynamicsError) {
        console.warn('Ошибка получения динамики:', dynamicsError)
        // Не прерываем выполнение, просто добавляем пустую динамику
        result.dynamics = []
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Ошибка в API top-requests:', error)
    
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