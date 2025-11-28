import { NextRequest, NextResponse } from 'next/server'
import { readDB, writeDB, Database } from '@/lib/db'

interface CacheEntry {
  key: string
  value: any
  expiresAt: string
}

function cleanExpiredCache(cache: CacheEntry[]): CacheEntry[] {
  const now = new Date()
  return cache.filter(entry => new Date(entry.expiresAt) > now)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value, ttlMinutes = 60 } = body

    const db = await readDB()
    if (!db.wordstatCache) {
      db.wordstatCache = []
    }

    // Очищаем истекший кеш
    db.wordstatCache = cleanExpiredCache(db.wordstatCache)

    // Удаляем старую запись с таким же ключом
    db.wordstatCache = db.wordstatCache.filter((entry: CacheEntry) => entry.key !== key)

    // Добавляем новую запись
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes)

    db.wordstatCache.push({
      key,
      value,
      expiresAt: expiresAt.toISOString()
    })

    await writeDB(db)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting cache:', error)
    return NextResponse.json({ error: 'Failed to set cache' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const db = await readDB()
    if (db.wordstatCache) {
      db.wordstatCache = cleanExpiredCache(db.wordstatCache)
      await writeDB(db)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing cache:', error)
    return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 })
  }
}
