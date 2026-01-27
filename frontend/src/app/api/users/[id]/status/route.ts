import { NextRequest, NextResponse } from 'next/server'
import { readDB, writeDB } from '@/lib/db'

// Вычисление статуса онлайн на основе lastSeen
function calculateIsOnline(lastSeen?: string): boolean {
  if (!lastSeen) return false;
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  return diffMinutes < 2; // Онлайн если активность менее 2 минут назад
}

// POST - обновить статус пользователя (lastSeen)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { lastSeen } = body
    
    const db = await readDB()
    const users = db.users || []
    
    const userIndex = users.findIndex((u: any) => u.id === id)
    
    if (userIndex === -1) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }
    
    // Обновляем lastSeen (isOnline вычисляется динамически)
    const newLastSeen = lastSeen || new Date().toISOString();
    users[userIndex] = {
      ...users[userIndex],
      lastSeen: newLastSeen
    }
    
    db.users = users
    await writeDB(db)
    
    return NextResponse.json({ 
      success: true,
      isOnline: calculateIsOnline(newLastSeen),
      lastSeen: newLastSeen
    })
  } catch (error) {
    console.error('Error updating user status:', error)
    return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 })
  }
}

// GET - получить статус пользователя
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const db = await readDB()
    const users = db.users || []
    
    const user = users.find((u: any) => u.id === id)
    
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }
    
    return NextResponse.json({
      id: user.id,
      isOnline: calculateIsOnline(user.lastSeen),
      lastSeen: user.lastSeen || user.createdAt || new Date().toISOString()
    })
  } catch (error) {
    console.error('Error getting user status:', error)
    return NextResponse.json({ error: 'Ошибка получения статуса' }, { status: 500 })
  }
}
