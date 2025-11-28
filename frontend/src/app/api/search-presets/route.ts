import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export interface SearchPreset {
  id: string
  name: string
  phrase: string
  description?: string
  createdAt: string
}

const dbPath = path.join(process.cwd(), '..', 'backend', 'database.json')

function readDatabase() {
  try {
    const content = fs.readFileSync(dbPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Error reading database:', error)
    return { searchPresets: [] }
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
    const presets = db.searchPresets || []
    return NextResponse.json({ presets }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error fetching search presets:', error)
    return NextResponse.json({ error: 'Failed to fetch search presets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, phrase, description } = await request.json()

    if (!name || !phrase) {
      return NextResponse.json({ error: 'Name and phrase are required' }, { status: 400 })
    }

    const db = readDatabase()
    if (!db.searchPresets) {
      db.searchPresets = []
    }

    const newPreset: SearchPreset = {
      id: Date.now().toString(),
      name: name.trim(),
      phrase: phrase.trim(),
      description: description?.trim(),
      createdAt: new Date().toISOString()
    }

    db.searchPresets.push(newPreset)
    writeDatabase(db)

    return NextResponse.json({ success: true, preset: newPreset }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error creating search preset:', error)
    return NextResponse.json({ error: 'Failed to create search preset' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Preset ID is required' }, { status: 400 })
    }

    const db = readDatabase()
    if (!db.searchPresets) {
      db.searchPresets = []
    }

    db.searchPresets = db.searchPresets.filter((preset: SearchPreset) => preset.id !== id)
    writeDatabase(db)

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error deleting search preset:', error)
    return NextResponse.json({ error: 'Failed to delete search preset' }, { status: 500 })
  }
}
