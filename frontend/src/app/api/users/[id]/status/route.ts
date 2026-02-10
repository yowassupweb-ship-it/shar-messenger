import { NextRequest, NextResponse } from 'next/server'

// Отключаем кеширование
export const dynamic = 'force-dynamic'
export const revalidate = 0

// URL бэкенда
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000'

// POST - обновить статус пользователя (lastSeen) - проксирование к бэкенду
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    
    console.log('[User Status Proxy] POST status for user:', id)
    
    const response = await fetch(`${BACKEND_URL}/api/users/${id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[User Status Proxy] Error updating user status:', error)
    return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 })
  }
}

// GET - получить статус пользователя - проксирование к бэкенду
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    // Получаем пользователя через бэкенд
    const response = await fetch(`${BACKEND_URL}/api/users/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }
    
    const user = await response.json()
    
    // Вычисляем isOnline динамически
    const lastSeen = user.lastSeen
    let isOnline = false
    if (lastSeen) {
      const lastSeenDate = new Date(lastSeen)
      const now = new Date()
      const diffMs = now.getTime() - lastSeenDate.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)
      isOnline = diffMinutes < 2
    }
    
    return NextResponse.json({
      id: user.id,
      isOnline,
      lastSeen: lastSeen || user.createdAt || new Date().toISOString()
    })
  } catch (error) {
    console.error('[User Status Proxy] Error getting user status:', error)
    return NextResponse.json({ error: 'Ошибка получения статуса' }, { status: 500 })
  }
}
