import { NextRequest, NextResponse } from 'next/server'
import { readDB, writeDB } from '@/lib/db'

export async function GET() {
  try {
    const db = await readDB()
    const settings = db.settings || {}

    // Возвращаем только ENV настройки (без паролей пользователей и т.д.)
    return NextResponse.json({
      metricaCounterId: settings.metricaCounterId,
      metricaToken: settings.metricaToken,
      wordstatToken: settings.wordstatToken,
      wordstatClientId: settings.wordstatClientId,
      deepseekApiKey: settings.deepseekApiKey,
      deepseekModel: settings.deepseekModel || 'deepseek-chat',
      deepseekMaxTokens: settings.deepseekMaxTokens || '4096',
      deepseekTemperature: settings.deepseekTemperature || '0.7',
      telegramBotToken: settings.telegramBotToken,
      telegramChatId: settings.telegramChatId,
      telegramNotifications: settings.telegramNotifications || false
    })
  } catch (error) {
    console.error('Error reading settings:', error)
    return NextResponse.json({ error: 'Failed to read settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const db = await readDB()
    if (!db.settings) {
      db.settings = {}
    }

    // Обновляем только ENV настройки
    db.settings = {
      ...db.settings,
      metricaCounterId: body.metricaCounterId,
      metricaToken: body.metricaToken,
      wordstatToken: body.wordstatToken,
      wordstatClientId: body.wordstatClientId,
      deepseekApiKey: body.deepseekApiKey,
      deepseekModel: body.deepseekModel || 'deepseek-chat',
      deepseekMaxTokens: body.deepseekMaxTokens || '4096',
      deepseekTemperature: body.deepseekTemperature || '0.7',
      telegramBotToken: body.telegramBotToken,
      telegramChatId: body.telegramChatId,
      telegramNotifications: body.telegramNotifications,
      updatedAt: new Date().toISOString()
    }

    await writeDB(db)

    // Добавляем лог
    if (!db.logs) {
      db.logs = []
    }
    db.logs.unshift({
      id: `log_${Date.now()}`,
      type: 'settings',
      message: 'Обновлены глобальные настройки ENV',
      status: 'success',
      timestamp: new Date().toISOString()
    })
    
    // Ограничиваем размер логов
    if (db.logs.length > 1000) {
      db.logs = db.logs.slice(0, 1000)
    }

    await writeDB(db)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
