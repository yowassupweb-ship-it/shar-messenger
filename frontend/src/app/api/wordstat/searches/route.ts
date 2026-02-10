import { NextRequest, NextResponse } from 'next/server'
import { readDB, writeDB, Database } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')

    const db = await readDB()
    let searches = db.wordstatSearches || []

    if (userId) {
      searches = searches.filter((s: any) => s.userId === userId)
    }

    searches = searches.slice(0, limit)

    return NextResponse.json(searches)
  } catch (error) {
    console.error('Error reading searches:', error)
    return NextResponse.json({ error: 'Failed to read searches' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, results, userId } = body

    const db = await readDB()
    if (!db.wordstatSearches) {
      db.wordstatSearches = []
    }

    const search = {
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query,
      results,
      timestamp: new Date().toISOString(),
      userId
    }

    db.wordstatSearches.unshift(search)

    // Ограничиваем количество сохраненных поисков (последние 500)
    if (db.wordstatSearches.length > 500) {
      db.wordstatSearches = db.wordstatSearches.slice(0, 500)
    }

    await writeDB(db)

    return NextResponse.json({ success: true, id: search.id })
  } catch (error) {
    console.error('Error saving search:', error)
    return NextResponse.json({ error: 'Failed to save search' }, { status: 500 })
  }
}
