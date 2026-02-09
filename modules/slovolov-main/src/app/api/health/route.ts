import { NextResponse } from 'next/server'

export async function GET() {
  // Проверяем наличие важных переменных окружения
  const envVars = {
    yandexToken: {
      name: 'YANDEX_WORDSTAT_OAUTH_TOKEN / YANDEX_OAUTH_TOKEN / OAUTH_TOKEN',
      present: !!(process.env.YANDEX_WORDSTAT_OAUTH_TOKEN || process.env.YANDEX_OAUTH_TOKEN || process.env.OAUTH_TOKEN),
      fallback: 'Используется token-utils.ts для чтения из нескольких источников'
    },
    deepseekKey: {
      name: 'DEEPSEEK_API_KEY / DEEPSEEK_KEY / AI_API_KEY',
      present: !!(process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_KEY || process.env.AI_API_KEY),
      fallback: 'Требуется для AI-анализа через Deepseek'
    },
    vercelKV: {
      name: 'KV_URL / KV_REST_API_URL / KV_REST_API_TOKEN',
      present: !!(process.env.KV_URL || process.env.KV_REST_API_URL),
      fallback: process.env.DATABASE_URL ? 'База данных Neon Postgres' : 'Локальные файлы (.vercel_kv_presets.json, .vercel_kv_ai_settings.json)'
    },
    apiUrl: {
      name: 'YANDEX_WORDSTAT_API_URL',
      present: !!process.env.YANDEX_WORDSTAT_API_URL,
      value: process.env.YANDEX_WORDSTAT_API_URL || 'https://api.wordstat.yandex.net',
      fallback: 'https://api.wordstat.yandex.net'
    },
    nodeEnv: {
      name: 'NODE_ENV',
      present: true,
      value: process.env.NODE_ENV || 'development'
    }
  }

  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Словолов - Yandex Wordstat API Client',
    environment: envVars
  })
}