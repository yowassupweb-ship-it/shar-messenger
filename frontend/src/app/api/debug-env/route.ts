import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    // Читаем database.json
    const dbPath = path.join(process.cwd(), '..', 'backend', 'database.json')
    const dbContent = fs.readFileSync(dbPath, 'utf-8')
    const db = JSON.parse(dbContent)

    const settings = db.settings || {}

    // Проверяем все возможные переменные окружения и database.json
    const envVars = {
      YANDEX_WORDSTAT_TOKEN: !!process.env.YANDEX_WORDSTAT_TOKEN || !!settings.wordstatToken,
      YANDEX_WORDSTAT_OAUTH_TOKEN: !!process.env.YANDEX_WORDSTAT_OAUTH_TOKEN || !!settings.wordstatToken,
      YANDEX_OAUTH_TOKEN: !!process.env.YANDEX_OAUTH_TOKEN || !!settings.wordstatToken,
      YANDEX_TOKEN: !!process.env.YANDEX_TOKEN || !!settings.wordstatToken,
      DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY || !!settings.deepseekApiKey,
      NODE_ENV: process.env.NODE_ENV,
      // Показываем длину токенов (но не сами токены для безопасности)
      tokenLengths: {
        YANDEX_WORDSTAT_TOKEN: (process.env.YANDEX_WORDSTAT_TOKEN || settings.wordstatToken || '').length,
        YANDEX_WORDSTAT_OAUTH_TOKEN: (process.env.YANDEX_WORDSTAT_OAUTH_TOKEN || settings.wordstatToken || '').length,
        DEEPSEEK_API_KEY: (process.env.DEEPSEEK_API_KEY || settings.deepseekApiKey || '').length
      }
    }

    return NextResponse.json(envVars)
  } catch (error) {
    console.error('Error reading database:', error)
    // Fallback к только env переменным
    const envVars = {
      YANDEX_WORDSTAT_TOKEN: !!process.env.YANDEX_WORDSTAT_TOKEN,
      YANDEX_WORDSTAT_OAUTH_TOKEN: !!process.env.YANDEX_WORDSTAT_OAUTH_TOKEN,
      YANDEX_OAUTH_TOKEN: !!process.env.YANDEX_OAUTH_TOKEN,
      YANDEX_TOKEN: !!process.env.YANDEX_TOKEN,
      DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
      NODE_ENV: process.env.NODE_ENV,
      tokenLengths: {
        YANDEX_WORDSTAT_TOKEN: process.env.YANDEX_WORDSTAT_TOKEN?.length || 0,
        YANDEX_WORDSTAT_OAUTH_TOKEN: process.env.YANDEX_WORDSTAT_OAUTH_TOKEN?.length || 0,
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY?.length || 0
      }
    }

    return NextResponse.json(envVars)
  }
}
