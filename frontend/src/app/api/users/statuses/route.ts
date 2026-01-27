import { NextRequest, NextResponse } from 'next/server'

// Отключаем кеширование
export const dynamic = 'force-dynamic'
export const revalidate = 0

// URL бэкенда
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000'

// GET - получить статусы всех пользователей (isOnline, lastSeen) - проксирование к бэкенду
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/users/statuses`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[User Statuses Proxy] Error fetching user statuses:', error)
    return NextResponse.json({ error: 'Ошибка получения статусов' }, { status: 500 })
  }
}
