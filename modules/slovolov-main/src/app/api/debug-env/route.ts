import { NextResponse } from 'next/server'

export async function GET() {
  // Проверяем все возможные переменные окружения связанные с Yandex
  const envVars = {
    YANDEX_WORDSTAT_TOKEN: !!process.env.YANDEX_WORDSTAT_TOKEN,
    YANDEX_WORDSTAT_OAUTH_TOKEN: !!process.env.YANDEX_WORDSTAT_OAUTH_TOKEN,
    YANDEX_OAUTH_TOKEN: !!process.env.YANDEX_OAUTH_TOKEN,
    YANDEX_TOKEN: !!process.env.YANDEX_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
    // Показываем длину токенов (но не сами токены для безопасности)
    tokenLengths: {
      YANDEX_WORDSTAT_TOKEN: process.env.YANDEX_WORDSTAT_TOKEN?.length || 0,
      YANDEX_WORDSTAT_OAUTH_TOKEN: process.env.YANDEX_WORDSTAT_OAUTH_TOKEN?.length || 0,
      YANDEX_OAUTH_TOKEN: process.env.YANDEX_OAUTH_TOKEN?.length || 0,
      YANDEX_TOKEN: process.env.YANDEX_TOKEN?.length || 0
    }
  }

  return NextResponse.json(envVars)
}