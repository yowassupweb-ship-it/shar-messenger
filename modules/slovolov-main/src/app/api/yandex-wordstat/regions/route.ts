import { NextRequest, NextResponse } from 'next/server'
import { YandexWordstatAPI } from '@/lib/yandex-wordstat'
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
    const { phrase, regionType, devices } = await request.json()
    
    const token = getYandexToken()
    if (!token) {
      return NextResponse.json(
        { error: 'Отсутствует OAuth токен' }, 
        { status: 401 }
      )
    }

    const api = createAPI(token)

    const result = await api.getRegions({
      phrase,
      regionType: regionType || 'all',
      devices
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Ошибка в API regions:', error)
    
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