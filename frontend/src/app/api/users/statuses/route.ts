import { NextRequest, NextResponse } from 'next/server'
import { readDB } from '@/lib/db'

// GET - получить статусы всех пользователей (isOnline, lastSeen)
export async function GET(request: NextRequest) {
  try {
    const db = await readDB()
    const users = db.users || []
    
    // Возвращаем только id, isOnline и lastSeen для каждого пользователя
    const statuses = users.map((user: any) => ({
      id: user.id,
      isOnline: user.isOnline || false,
      lastSeen: user.lastSeen || user.createdAt || new Date().toISOString()
    }))
    
    return NextResponse.json(statuses)
  } catch (error) {
    console.error('Error fetching user statuses:', error)
    return NextResponse.json({ error: 'Ошибка получения статусов' }, { status: 500 })
  }
}
