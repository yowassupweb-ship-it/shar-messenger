import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { initSchema, query } from '@/lib/db'

let kv: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const vercelKv = require('@vercel/kv')
  kv = vercelKv.kv
} catch (e) {
  console.warn('Vercel KV not available for AI settings, falling back to local file storage')
}

export interface AISettings {
  temperature: number
  maxTokens: number
  model: string
  systemPrompt?: string
}

const DEFAULT_SETTINGS: AISettings = {
  temperature: 0.7,
  maxTokens: 2000,
  model: 'deepseek-chat',
  systemPrompt: 'Ты - эксперт по контекстной рекламе и семантическому анализу ключевых слов для Яндекс.Директ. Твоя задача - анализировать ключевые слова и давать практические рекомендации.'
}

const SETTINGS_KEY = 'ai-analysis-settings'
function findProjectRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

const PROJECT_ROOT = findProjectRoot(process.cwd())
const FALLBACK_FILE = path.join(PROJECT_ROOT, '.vercel_kv_ai_settings.json')

async function readFallback(): Promise<AISettings> {
  try {
    if (!fs.existsSync(FALLBACK_FILE)) return DEFAULT_SETTINGS
    const raw = await fs.promises.readFile(FALLBACK_FILE, 'utf-8')
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw || '{}') }
  } catch (err) {
    console.error('Error reading fallback AI settings file:', err)
    return DEFAULT_SETTINGS
  }
}

async function writeFallback(settings: AISettings) {
  try {
    await fs.promises.writeFile(FALLBACK_FILE, JSON.stringify(settings, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error writing fallback AI settings file:', err)
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

async function setSettings(settings: AISettings) {
  if (kv) {
    try {
      await kv.set(SETTINGS_KEY, settings)
      return
    } catch (err) {
      console.error('Error writing AI settings to KV:', err)
    }
  }
  await writeFallback(settings)
}

export async function GET() {
  try {
    try {
      const settings = await getSettings()
      return NextResponse.json({ settings })
    } catch {
      await initSchema()
      const res = await query(`select temperature, max_tokens as "maxTokens", model, coalesce(system_prompt,'') as "systemPrompt" from ai_settings where id=1`)
      const row = res.rows[0]
      return NextResponse.json({ settings: row || DEFAULT_SETTINGS })
    }
  } catch (error) {
    console.error('Error fetching AI settings:', error)
    return NextResponse.json({ error: 'Failed to fetch AI settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: Partial<AISettings> = await request.json()

    const currentSettings = await getSettings()
    const updatedSettings: AISettings = {
      ...currentSettings,
      ...body
    }

    // Валидация
    if (updatedSettings.temperature < 0 || updatedSettings.temperature > 2) {
      return NextResponse.json({ error: 'Temperature must be between 0 and 2' }, { status: 400 })
    }
    if (updatedSettings.maxTokens < 1 || updatedSettings.maxTokens > 8000) {
      return NextResponse.json({ error: 'MaxTokens must be between 1 and 8000' }, { status: 400 })
    }

    try {
      await setSettings(updatedSettings)
      return NextResponse.json({ success: true, settings: updatedSettings })
    } catch {
      await initSchema()
      await query('update ai_settings set temperature=$1, max_tokens=$2, model=$3, system_prompt=$4 where id=1', [
        updatedSettings.temperature,
        updatedSettings.maxTokens,
        updatedSettings.model,
        updatedSettings.systemPrompt || null
      ])
      return NextResponse.json({ success: true, settings: updatedSettings })
    }
  } catch (error) {
    console.error('Error updating AI settings:', error)
    return NextResponse.json({ error: 'Failed to update AI settings' }, { status: 500 })
  }
}
