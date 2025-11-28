import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import { getDbPath } from '@/lib/db'

const dbPath = getDbPath()

function readDatabase() {
  try {
    const content = fs.readFileSync(dbPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Error reading database:', error)
    return { settings: {} }
  }
}

function writeDatabase(db: any) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error writing database:', error)
  }
}

export async function GET() {
  try {
    const db = readDatabase()
    const settings = db.settings || {}

    return NextResponse.json({
      temperature: parseFloat(settings.deepseekTemperature || '0.7'),
      maxTokens: parseInt(settings.deepseekMaxTokens || '4096'),
      model: settings.deepseekModel || 'deepseek-reasoner'
    })
  } catch (error) {
    console.error('Error fetching AI settings:', error)
    return NextResponse.json({ error: 'Failed to fetch AI settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const db = readDatabase()
    
    if (!db.settings) {
      db.settings = {}
    }

    if (body.temperature !== undefined) {
      db.settings.deepseekTemperature = body.temperature.toString()
    }
    if (body.maxTokens !== undefined) {
      db.settings.deepseekMaxTokens = body.maxTokens.toString()
    }
    if (body.model !== undefined) {
      db.settings.deepseekModel = body.model
    }

    writeDatabase(db)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving AI settings:', error)
    return NextResponse.json({ error: 'Failed to save AI settings' }, { status: 500 })
  }
}
