import { NextRequest, NextResponse } from 'next/server'
import { readDB } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body

    const db = await readDB()
    const botToken = db.settings?.telegramBotToken
    const chatId = db.settings?.telegramChatId
    const enabled = db.settings?.telegramNotifications

    if (!enabled || !botToken || !chatId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Telegram не настроен или отключен' 
      })
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Telegram API Error:', errorText)
      return NextResponse.json({ 
        success: false, 
        error: 'Ошибка при отправке в Telegram' 
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Telegram notification error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 })
  }
}
