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

// GET - получить пользователя по ID
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
    
    // Возвращаем пользователя с динамическим isOnline
    return NextResponse.json({
      ...user,
      isOnline: calculateIsOnline(user.lastSeen)
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Ошибка получения пользователя' }, { status: 500 })
  }
}

// PUT - обновить пользователя
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    console.log('[Users API] PUT request for user:', id)
    
    const body = await request.json()
    console.log('[Users API] Update body:', JSON.stringify(body))
    
    const db = await readDB()
    console.log('[Users API] DB read successfully, users count:', (db.users || []).length)
    
    const users = db.users || []
    
    const userIndex = users.findIndex((u: any) => u.id === id)
    console.log('[Users API] User index found:', userIndex)
    
    if (userIndex === -1) {
      console.log('[Users API] User not found:', id)
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }
    
    // Сохраняем важные поля которые не должны затираться
    const existingUser = users[userIndex];
    const preservedAvatar = existingUser.avatar;
    
    // Обновляем поля
    users[userIndex] = {
      ...existingUser,
      ...body,
      id: id, // ID не меняется
      // Если avatar не передан в body, сохраняем существующий
      avatar: body.avatar !== undefined ? body.avatar : preservedAvatar
    }
    
    db.users = users
    await writeDB(db)
    console.log('[Users API] User updated successfully:', id, 'avatar:', users[userIndex].avatar)
    
    return NextResponse.json({ success: true, user: users[userIndex] })
  } catch (error) {
    console.error('[Users API] Error updating user:', error)
    return NextResponse.json({ 
      error: 'Ошибка обновления пользователя', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - удалить пользователя
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const db = await readDB()
    const users = db.users || []
    
    const userIndex = users.findIndex((u: any) => u.id === id)
    
    if (userIndex === -1) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }
    
    // Не удаляем админов
    if (users[userIndex].role === 'admin') {
      return NextResponse.json({ error: 'Нельзя удалить администратора' }, { status: 403 })
    }
    
    users.splice(userIndex, 1)
    db.users = users
    await writeDB(db)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Ошибка удаления пользователя' }, { status: 500 })
  }
}
