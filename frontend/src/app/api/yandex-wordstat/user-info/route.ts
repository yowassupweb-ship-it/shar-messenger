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

export async function POST() {
  try {
    const token = await getYandexToken()
    
    if (!token) {
      console.error('No OAuth token found in environment variables or database')
      return NextResponse.json(
        { error: 'Отсутствует OAuth токен. Настройте его в админ-панели.' }, 
        { status: 401 }
      )
    }

    const api = createAPI(token)

    const result = await api.getUserInfo()
    console.log('[UserInfo API] Ответ от Yandex API:', JSON.stringify(result, null, 2))
    return NextResponse.json(result)
  } catch (error) {
    console.error('Ошибка в API user-info:', error)
    
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