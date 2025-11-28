import { NextResponse } from 'next/server'
import fs from 'fs'
import { getDbPath } from '@/lib/db'

interface Message {
  content: string
  role: 'user' | 'assistant'
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // Поддерживаем оба формата: {message, context, history} и {keywords, prompt}
    const { message, context, history, keywords, prompt } = body

    // Получаем API ключ из database.json
    const dbPath = getDbPath()
    let dbContent: string
    let data: any
    
    try {
      dbContent = fs.readFileSync(dbPath, 'utf-8')
      data = JSON.parse(dbContent)
    } catch (err) {
      console.error('Error reading database:', err, 'Path:', dbPath)
      return NextResponse.json(
        { error: 'Не удалось прочитать настройки' },
        { status: 500 }
      )
    }

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

    // Если передан keywords+prompt формат (из AIAnalysis компонента)
    if (keywords && prompt) {
      const keywordsList = Array.isArray(keywords) ? keywords.join(', ') : keywords
      messages.push({
        role: 'user',
        content: `${prompt}\n\nКлючевые слова для анализа:\n${keywordsList}`
      })
    } else {
      // Стандартный формат с message, context, history
      
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
      if (message) {
        messages.push({
          role: 'user',
          content: message
        })
      }
    }

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

    // Возвращаем в обоих форматах для совместимости
    return NextResponse.json({
      response: aiResponse,
      analysis: aiResponse
    })
  } catch (error) {
    console.error('Error in AI analysis:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
