import { NextRequest, NextResponse } from 'next/server'

// Отключаем кеширование
export const dynamic = 'force-dynamic'
export const revalidate = 0

// URL бэкенда
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000'

// PUT - обновить инструменты пользователя - проксирование к бэкенду
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { enabledTools } = body
    
    if (!Array.isArray(enabledTools)) {
      return NextResponse.json({ error: 'enabledTools должен быть массивом' }, { status: 400 })
    }
    
    console.log('[User Tools Proxy] PUT tools for user:', id, 'tools:', enabledTools)
    
    const response = await fetch(`${BACKEND_URL}/api/users/${id}/tools`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabledTools }),
    })
    
    const data = await response.json()
    console.log('[User Tools Proxy] PUT response:', response.status)
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[User Tools Proxy] Error updating user tools:', error)
    return NextResponse.json({ error: 'Ошибка обновления инструментов' }, { status: 500 })
  }
}

// GET - получить инструменты пользователя - проксирование к бэкенду
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
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
    
    return NextResponse.json({ 
      enabledTools: user.enabledTools || []
    })
  } catch (error) {
    console.error('[User Tools Proxy] Error fetching user tools:', error)
    return NextResponse.json({ error: 'Ошибка получения инструментов' }, { status: 500 })
  }
}
