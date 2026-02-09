import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

let kv: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const vercelKv = require('@vercel/kv')
  kv = vercelKv.kv
} catch (e) {
  console.warn('Vercel KV not available for AI analysis settings')
}

interface AnalysisRequest {
  keywords: string[]
  prompt: string
  temperature?: number
  maxTokens?: number
  model?: string
  systemPrompt?: string
}

// Chat-style request (used by AiChatModal)
interface ChatRequest {
  message: string
  context?: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  temperature?: number
  maxTokens?: number
  model?: string
  systemPrompt?: string
}

interface AISettings {
  temperature: number
  maxTokens: number
  model: string
  systemPrompt: string
}

const DEFAULT_SETTINGS: AISettings = {
  temperature: 0.7,
  maxTokens: 2000,
  model: 'deepseek-chat',
  systemPrompt: 'Ты - эксперт по контекстной рекламе и семантическому анализу ключевых слов для Яндекс.Директ. Твоя задача - анализировать ключевые слова и давать практические рекомендации.'
}

const SETTINGS_KEY = 'ai-analysis-settings'
const FALLBACK_FILE = path.join(process.cwd(), '.vercel_kv_ai_settings.json')

async function readFallback(): Promise<AISettings> {
  try {
    if (!fs.existsSync(FALLBACK_FILE)) return DEFAULT_SETTINGS
    const raw = await fs.promises.readFile(FALLBACK_FILE, 'utf-8')
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw || '{}') }
  } catch (err) {
    return DEFAULT_SETTINGS
  }
}

async function getSettings(): Promise<AISettings> {
  if (kv) {
    try {
      const data = await kv.get(SETTINGS_KEY)
      return { ...DEFAULT_SETTINGS, ...(data || {}) }
    } catch (err) {
      console.error('Error reading AI settings from KV:', err)
    }
  }
  return readFallback()
}

function getDeepseekApiKey(): string {
  const apiKey = process.env.DEEPSEEK_API_KEY || 
                 process.env.DEEPSEEK_KEY || 
                 process.env.AI_API_KEY ||
                 process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY

  if (!apiKey) {
    throw new Error('Deepseek API key not found in environment variables. Please set DEEPSEEK_API_KEY in Vercel environment.')
  }
  
  return apiKey
}

export async function POST(request: NextRequest) {
  try {
    const body: any = await request.json()

    // Получаем сохранённые настройки и объединяем с переданными
    const savedSettings = await getSettings()
    const finalSettings: AISettings = {
      temperature: (body.temperature as number) ?? savedSettings.temperature,
      maxTokens: (body.maxTokens as number) ?? savedSettings.maxTokens,
      model: (body.model as string) ?? savedSettings.model,
      systemPrompt: (body.systemPrompt as string) ?? savedSettings.systemPrompt
    }

    const apiKey = getDeepseekApiKey()

    // Ветка для чат-запроса из AiChatModal
    if (typeof body.message === 'string') {
      const chatReq = body as ChatRequest
      const history = Array.isArray(chatReq.history) ? chatReq.history : []

      const messages = [
        { role: 'system', content: finalSettings.systemPrompt },
        ...(chatReq.context ? [{ role: 'system' as const, content: `Контекст: ${chatReq.context}` }] : []),
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user' as const, content: chatReq.message }
      ]

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: finalSettings.model,
          messages,
          max_tokens: finalSettings.maxTokens,
          temperature: finalSettings.temperature,
          stream: false
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Deepseek API error (chat):', response.status, errorText)
        
        if (response.status === 401) {
          return NextResponse.json(
            { error: 'Invalid Deepseek API key. Please check your DEEPSEEK_API_KEY environment variable.' },
            { status: 401 }
          )
        }
        
        return NextResponse.json(
          { error: `Deepseek API error: ${response.status}`, details: errorText },
          { status: response.status }
        )
      }

      const data = await response.json()
      if (!data.choices?.[0]?.message?.content) {
        return NextResponse.json(
          { error: 'Invalid response format from Deepseek API' },
          { status: 500 }
        )
      }

      const responseText = data.choices[0].message.content
      return NextResponse.json({ response: responseText, usage: data.usage, settings: finalSettings })
    }

    // Ветка анализа ключевых слов (используется компонентом AIAnalysis)
    const { keywords, prompt } = body as AnalysisRequest

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Keywords array is required' },
        { status: 400 }
      )
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const keywordsText = keywords.join(', ')
    const userPrompt = `${prompt}\n\nКлючевые слова для анализа: ${keywordsText}`

    console.log('[AI Analysis] Using settings:', {
      model: finalSettings.model,
      temperature: finalSettings.temperature,
      maxTokens: finalSettings.maxTokens,
      keywordsCount: keywords.length
    })

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: finalSettings.model,
        messages: [
          {
            role: 'system',
            content: finalSettings.systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: finalSettings.maxTokens,
        temperature: finalSettings.temperature,
        stream: false
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Deepseek API error:', response.status, errorText)
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid Deepseek API key. Please check your DEEPSEEK_API_KEY environment variable.' },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { error: `Deepseek API error: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        { error: 'Invalid response format from Deepseek API' },
        { status: 500 }
      )
    }

    const analysis = data.choices[0].message.content

    return NextResponse.json({
      success: true,
      analysis,
      usage: data.usage,
      settings: finalSettings
    })

  } catch (error) {
    console.error('AI Analysis error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Failed to analyze keywords with AI'
      },
      { status: 500 }
    )
  }
}