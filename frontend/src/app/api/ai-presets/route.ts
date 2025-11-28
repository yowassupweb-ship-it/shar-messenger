import { NextRequest, NextResponse } from 'next/server'
import { readDB, writeDB } from '@/lib/db'
import { AIPreset } from '@/types/chat'

export async function GET() {
  try {
    const db = await readDB()
    
    if (!db.aiPresets) {
      db.aiPresets = []
    }
    
    return NextResponse.json({ presets: db.aiPresets })
  } catch (error) {
    console.error('Error fetching presets:', error)
    return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, prompt }: { name: string; prompt: string } = await request.json()

    if (!name || !prompt) {
      return NextResponse.json({ error: 'Name and prompt are required' }, { status: 400 })
    }

    const db = await readDB()
    
    if (!db.aiPresets) {
      db.aiPresets = []
    }
    
    const newPreset: AIPreset = {
      id: Date.now().toString(),
      name: name.trim(),
      prompt: prompt.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    db.aiPresets.push(newPreset)
    await writeDB(db)
    
    return NextResponse.json({ success: true, preset: newPreset })
  } catch (error) {
    console.error('Error creating preset:', error)
    return NextResponse.json({ error: 'Failed to create preset' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Preset ID is required' }, { status: 400 })
    }

    const db = await readDB()
    
    if (!db.aiPresets) {
      db.aiPresets = []
    }
    
    db.aiPresets = db.aiPresets.filter((preset: AIPreset) => preset.id !== id)
    await writeDB(db)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting preset:', error)
    return NextResponse.json({ error: 'Failed to delete preset' }, { status: 500 })
  }
}
