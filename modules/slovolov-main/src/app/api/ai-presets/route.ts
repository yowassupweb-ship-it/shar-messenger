import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { initSchema, query } from '@/lib/db'

let kv: any = null
try {
  // lazy require to avoid hard crash when @vercel/kv is not available in environment
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const vercelKv = require('@vercel/kv')
  kv = vercelKv.kv
} catch (e) {
  // kv will remain null in local / dev environments where @vercel/kv is not configured
  console.warn('Vercel KV not available, falling back to local file storage for ai-presets')
}

export interface AIPreset {
  id: string
  name: string
  prompt: string
  createdAt: string
  updatedAt: string
}

const PRESETS_KEY = 'ai-analysis-presets'
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
const FALLBACK_FILE = path.join(PROJECT_ROOT, '.vercel_kv_presets.json')

async function readFallback(): Promise<AIPreset[]> {
  try {
    if (!fs.existsSync(FALLBACK_FILE)) return []
    const raw = await fs.promises.readFile(FALLBACK_FILE, 'utf-8')
    return JSON.parse(raw || '[]') as AIPreset[]
  } catch (err) {
    console.error('Error reading fallback presets file:', err)
    return []
  }
}

async function writeFallback(presets: AIPreset[]) {
  try {
    await fs.promises.writeFile(FALLBACK_FILE, JSON.stringify(presets, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error writing fallback presets file:', err)
  }
}

async function getPresets(): Promise<AIPreset[]> {
  if (kv) {
    try {
      const data = await kv.get(PRESETS_KEY)
      return (data as AIPreset[]) || []
    } catch (err) {
      console.error('Error reading presets from KV:', err)
      // fallback to file
    }
  }
  return readFallback()
}

async function setPresets(presets: AIPreset[]) {
  if (kv) {
    try {
      await kv.set(PRESETS_KEY, presets)
      return
    } catch (err) {
      console.error('Error writing presets to KV:', err)
      // fallback to file
    }
  }
  await writeFallback(presets)
}

export async function GET() {
  try {
    try {
      const presets = await getPresets()
      return NextResponse.json({ presets })
    } catch {
      await initSchema()
      const res = await query(`select id, name, prompt, to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SSZ') as createdAt, to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SSZ') as updatedAt from ai_presets order by created_at asc`)
      return NextResponse.json({ presets: res.rows })
    }
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

    const presets = await getPresets()
    const newPreset: AIPreset = {
      id: Date.now().toString(),
      name: name.trim(),
      prompt: prompt.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    try {
      const updatedPresets = [...presets, newPreset]
      await setPresets(updatedPresets)
      return NextResponse.json({ success: true, preset: newPreset })
    } catch {
      await initSchema()
      await query('insert into ai_presets (id, name, prompt, created_at, updated_at) values ($1,$2,$3, now(), now())', [newPreset.id, newPreset.name, newPreset.prompt])
      return NextResponse.json({ success: true, preset: newPreset })
    }
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

    try {
      const presets = await getPresets()
      const updatedPresets = presets.filter((preset: AIPreset) => preset.id !== id)
      await setPresets(updatedPresets)
      return NextResponse.json({ success: true })
    } catch {
      await initSchema()
      await query('delete from ai_presets where id=$1', [id])
      return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error('Error deleting preset:', error)
    return NextResponse.json({ error: 'Failed to delete preset' }, { status: 500 })
  }
}