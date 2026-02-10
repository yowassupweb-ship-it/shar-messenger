import { NextRequest, NextResponse } from 'next/server'
import { readDB } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key: paramKey } = await params
    const key = decodeURIComponent(paramKey)
    const db = await readDB()
    
    if (!db.wordstatCache) {
      return NextResponse.json({ value: null })
    }

    const now = new Date()
    const entry = db.wordstatCache.find(
      (e: any) => e.key === key && new Date(e.expiresAt) > now
    )

    if (!entry) {
      return NextResponse.json({ value: null })
    }

    return NextResponse.json({ value: entry.value })
  } catch (error) {
    console.error('Error reading cache:', error)
    return NextResponse.json({ error: 'Failed to read cache' }, { status: 500 })
  }
}
