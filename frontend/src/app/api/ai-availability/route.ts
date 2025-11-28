import { NextResponse } from 'next/server'
import fs from 'fs'
import { getDbPath } from '@/lib/db'

export async function GET() {
  try {
    const dbPath = getDbPath()
    const dbContent = fs.readFileSync(dbPath, 'utf-8')
    const data = JSON.parse(dbContent)

    const hasKey = !!(
      process.env.DEEPSEEK_API_KEY ||
      data.settings?.deepseekApiKey
    )

    return NextResponse.json({
      available: hasKey
    })
  } catch (error) {
    console.error('Error checking AI availability:', error)
    return NextResponse.json({
      available: false
    })
  }
}
