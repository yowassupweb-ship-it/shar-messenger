import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), '..', 'backend', 'database.json')
    const dbContent = fs.readFileSync(dbPath, 'utf-8')
    const db = JSON.parse(dbContent)

    const settings = db.settings || {}

    // Проверяем наличие токенов
    const hasWordstatToken = !!(
      process.env.YANDEX_WORDSTAT_OAUTH_TOKEN || 
      process.env.YANDEX_WORDSTAT_TOKEN ||
      settings.wordstatToken
    )

    const hasDeepseekKey = !!(
      process.env.DEEPSEEK_API_KEY ||
      settings.deepseekApiKey
    )

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Вокруг света',
      environment: {
        wordstatToken: {
          present: hasWordstatToken,
          length: (settings.wordstatToken || '').length
        },
        deepseekKey: {
          present: hasDeepseekKey,
          length: (settings.deepseekApiKey || '').length
        }
      }
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      status: 'error',
      error: 'Failed to check health status',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
