import { NextRequest, NextResponse } from 'next/server'
import { readDB } from '@/lib/db'

// Вычисление статуса онлайн на основе lastSeen
function calculateIsOnline(lastSeen?: string): boolean {
  if (!lastSeen) return false;
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  return diffMinutes < 2; // Онлайн если активность менее 2 минут назад
}

// GET - получить статусы всех пользователей (isOnline, lastSeen)
export async function GET(request: NextRequest) {
  try {
    const db = await readDB()
    const users = db.users || []
    
    // Возвращаем только id, isOnline (вычисленный динамически) и lastSeen для каждого пользователя
    const statuses = users.map((user: any) => ({
      id: user.id,
      isOnline: calculateIsOnline(user.lastSeen),
      lastSeen: user.lastSeen || user.createdAt || new Date().toISOString()
    }))
    
    return NextResponse.json(statuses)
  } catch (error) {
    console.error('Error fetching user statuses:', error)
    return NextResponse.json({ error: 'Ошибка получения статусов' }, { status: 500 })
  }
}
