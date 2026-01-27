import { NextRequest, NextResponse } from 'next/server'

// Отключаем кеширование
export const dynamic = 'force-dynamic'
export const revalidate = 0

// URL бэкенда - используем переменную окружения или localhost
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000'

// GET - получить пользователя по ID (проксирование к бэкенду)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    console.log('[Users API Proxy] GET user:', id)
    
    const response = await fetch(`${BACKEND_URL}/api/users/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Users API Proxy] Error fetching user:', error)
    return NextResponse.json({ error: 'Ошибка получения пользователя' }, { status: 500 })
  }
}

// PUT - обновить пользователя (проксирование к бэкенду)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    console.log('[Users API Proxy] PUT user:', id, 'body:', JSON.stringify(body))
    
    const response = await fetch(`${BACKEND_URL}/api/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    const data = await response.json()
    console.log('[Users API Proxy] PUT response:', response.status, JSON.stringify(data))
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Users API Proxy] Error updating user:', error)
    return NextResponse.json({ 
      error: 'Ошибка обновления пользователя', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - удалить пользователя (проксирование к бэкенду)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    console.log('[Users API Proxy] DELETE user:', id)
    
    const response = await fetch(`${BACKEND_URL}/api/users/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Users API Proxy] Error deleting user:', error)
    return NextResponse.json({ error: 'Ошибка удаления пользователя' }, { status: 500 })
  }
}
