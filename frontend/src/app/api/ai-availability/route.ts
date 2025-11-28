import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), '..', 'backend', 'database.json')
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
