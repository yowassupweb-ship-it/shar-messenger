import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface Message {
  content: string
  role: 'user' | 'assistant'
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, context, history } = body

    // Получаем API ключ из database.json
    const dbPath = path.join(process.cwd(), '..', 'backend', 'database.json')
    const dbContent = fs.readFileSync(dbPath, 'utf-8')
    const data = JSON.parse(dbContent)

    const apiKey = process.env.DEEPSEEK_API_KEY || data.settings?.deepseekApiKey
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API ключ Deepseek не настроен' },
        { status: 500 }
      )
    }

    // Получаем настройки AI
    const temperature = parseFloat(data.settings?.deepseekTemperature || '0.7')
    const maxTokens = parseInt(data.settings?.deepseekMaxTokens || '4096')
    const model = data.settings?.deepseekModel || 'deepseek-chat'

    // Формируем сообщения для API
    const messages: Array<{ role: string; content: string }> = [
      {
        role: 'system',
        content: 'Ты - AI-помощник для анализа ключевых слов и поисковых фраз. Твоя задача - помогать пользователям анализировать данные из Яндекс.Вордстат, предлагать стратегии подбора ключевых слов, объяснять динамику популярности запросов и давать советы по региональному таргетингу. Отвечай кратко, по делу, на русском языке. Используй markdown для форматирования.'
      }
    ]

    // Добавляем контекст если есть
    if (context) {
      messages.push({
        role: 'system',
        content: `Контекст текущей сессии: ${context}`
      })
    }

    // Добавляем историю сообщений
    if (Array.isArray(history) && history.length > 0) {
      history.forEach((msg: Message) => {
        messages.push({
          role: msg.role,
          content: msg.content
        })
      })
    }

    // Добавляем новое сообщение пользователя
    messages.push({
      role: 'user',
      content: message
    })

    // Вызываем Deepseek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Deepseek API error:', errorText)
      return NextResponse.json(
        { error: 'Ошибка при обращении к Deepseek API' },
        { status: response.status }
      )
    }

    const result = await response.json()
    const aiResponse = result.choices?.[0]?.message?.content || 'Не удалось получить ответ'

    return NextResponse.json({
      response: aiResponse
    })
  } catch (error) {
    console.error('Error in AI analysis:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
