import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

let kv: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const vercelKv = require('@vercel/kv')
  kv = vercelKv.kv
  // Проверяем наличие необходимых переменных окружения
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.log('KV environment variables not set, using local file storage')
    kv = null
  }
} catch (e) {
  console.warn('Vercel KV not available for search presets, falling back to local file storage')
}

export interface SearchPreset {
  id: string
  name: string
  phrase: string
  description?: string
  createdAt: string
}

const PRESETS_KEY = 'search-presets'

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
const FALLBACK_FILE = path.join(PROJECT_ROOT, '.vercel_kv_search_presets.json')

async function readFallback(): Promise<SearchPreset[]> {
  try {
    if (!fs.existsSync(FALLBACK_FILE)) return []
    const raw = await fs.promises.readFile(FALLBACK_FILE, 'utf-8')
    return JSON.parse(raw || '[]') as SearchPreset[]
  } catch (err) {
    console.error('Error reading fallback search presets file:', err)
    return []
  }
}

async function writeFallback(presets: SearchPreset[]) {
  try {
    await fs.promises.writeFile(FALLBACK_FILE, JSON.stringify(presets, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error writing fallback search presets file:', err)
  }
}

async function getPresets(): Promise<SearchPreset[]> {
  if (kv) {
    try {
      const data = await kv.get(PRESETS_KEY)
      return (data as SearchPreset[]) || []
    } catch (err) {
      console.error('Error reading search presets from KV:', err)
      // fallback to file
    }
  }
  return readFallback()
}

async function setPresets(presets: SearchPreset[]) {
  if (kv) {
    try {
      await kv.set(PRESETS_KEY, presets)
      return
    } catch (err) {
      console.error('Error writing search presets to KV:', err)
      // fallback to file
    }
  }
  await writeFallback(presets)
}

export async function GET() {
  try {
    const presets = await getPresets()
    return NextResponse.json({ presets }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error fetching search presets:', error)
    return NextResponse.json({ error: 'Failed to fetch search presets' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, phrase, description }: { name: string; phrase: string; description?: string } = await request.json()

    if (!name || !phrase) {
      return NextResponse.json({ error: 'Name and phrase are required' }, { status: 400 })
    }

    const presets = await getPresets()

    const newPreset: SearchPreset = {
      id: Date.now().toString(),
      name: name.trim(),
      phrase: phrase.trim(),
      description: description?.trim(),
      createdAt: new Date().toISOString()
    }

    const updatedPresets = [...presets, newPreset]
    await setPresets(updatedPresets)

    return NextResponse.json({ success: true, preset: newPreset }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error creating search preset:', error)
    return NextResponse.json({ error: 'Failed to create search preset' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Preset ID is required' }, { status: 400 })
    }

    const presets = await getPresets()
    const updatedPresets = presets.filter((preset: SearchPreset) => preset.id !== id)

    await setPresets(updatedPresets)

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error deleting search preset:', error)
    return NextResponse.json({ error: 'Failed to delete search preset' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}