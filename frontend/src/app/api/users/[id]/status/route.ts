import { NextRequest, NextResponse } from 'next/server'
import { readDB, writeDB } from '@/lib/db'

// POST - обновить статус пользователя (isOnline, lastSeen)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { isOnline, lastSeen } = body
    
    const db = await readDB()
    const users = db.users || []
    
    const userIndex = users.findIndex((u: any) => u.id === id)
    
    if (userIndex === -1) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }
    
    // Обновляем статус
    users[userIndex] = {
      ...users[userIndex],
      isOnline: isOnline !== undefined ? isOnline : users[userIndex].isOnline,
      lastSeen: lastSeen || users[userIndex].lastSeen || new Date().toISOString()
    }
    
    db.users = users
    await writeDB(db)
    
    return NextResponse.json({ 
      success: true,
      isOnline: users[userIndex].isOnline,
      lastSeen: users[userIndex].lastSeen
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
      isOnline: user.isOnline || false,
      lastSeen: user.lastSeen || user.createdAt || new Date().toISOString()
    })
  } catch (error) {
    console.error('Error getting user status:', error)
    return NextResponse.json({ error: 'Ошибка получения статуса' }, { status: 500 })
  }
}
