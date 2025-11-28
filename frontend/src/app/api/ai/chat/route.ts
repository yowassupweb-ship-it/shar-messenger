import { NextRequest, NextResponse } from 'next/server'
import { readDB } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages } = body

    // Читаем настройки из БД
    const db = await readDB()
    const apiKey = db.settings?.deepseekApiKey || process.env.DEEPSEEK_API_KEY
    const model = db.settings?.deepseekModel || 'deepseek-chat'
    const maxTokens = parseInt(db.settings?.deepseekMaxTokens || '4096')
    const temperature = parseFloat(db.settings?.deepseekTemperature || '0.7')

    if (!apiKey) {
      return NextResponse.json(
        { error: 'DeepSeek API ключ не настроен. Добавьте его в админ-панели.' },
        { status: 400 }
      )
    }

    // Отправляем запрос к DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'Ты - помощник по анализу ключевых слов для Яндекс Директ. Помогаешь анализировать данные из Yandex Wordstat и давать рекомендации по SEO и контекстной рекламе.'
          },
          ...messages
        ],
        temperature: temperature,
        max_tokens: maxTokens
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek API Error:', errorText)
      return NextResponse.json(
        { error: 'Ошибка при обращении к DeepSeek API' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message?.content || 'Нет ответа от AI'

    return NextResponse.json({ message })
  } catch (error) {
    console.error('AI Chat Error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
