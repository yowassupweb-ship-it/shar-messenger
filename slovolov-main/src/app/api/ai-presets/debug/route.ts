import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const FALLBACK_FILE = path.join(process.cwd(), '.vercel_kv_presets.json')

export async function GET() {
  try {
    let kvAvailable = false
    let kvError = null
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const vercelKv = require('@vercel/kv')
      if (vercelKv.kv) {
        kvAvailable = true
      }
    } catch (e) {
      kvError = e instanceof Error ? e.message : 'Unknown error'
    }

    // Читаем fallback файл
    let fallbackExists = false
    let fallbackContent = null
    let fallbackError = null

    try {
      if (fs.existsSync(FALLBACK_FILE)) {
        fallbackExists = true
        const raw = await fs.promises.readFile(FALLBACK_FILE, 'utf-8')
        fallbackContent = JSON.parse(raw || '[]')
      }
    } catch (e) {
      fallbackError = e instanceof Error ? e.message : 'Unknown error'
    }

    return NextResponse.json({
      storage: {
        kvAvailable,
        kvError,
        usingFallback: !kvAvailable,
        fallbackPath: FALLBACK_FILE
      },
      fallbackFile: {
        exists: fallbackExists,
        presetsCount: Array.isArray(fallbackContent) ? fallbackContent.length : 0,
        presets: fallbackContent,
        error: fallbackError
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasKvUrl: !!process.env.KV_URL,
        hasKvRestApiUrl: !!process.env.KV_REST_API_URL,
        hasKvRestApiToken: !!process.env.KV_REST_API_TOKEN
      }
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
