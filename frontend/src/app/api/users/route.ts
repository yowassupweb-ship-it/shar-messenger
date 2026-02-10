import { NextRequest, NextResponse } from 'next/server'

// Отключаем кеширование
export const dynamic = 'force-dynamic'
export const revalidate = 0

// URL бэкенда - используем переменную окружения или localhost
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000'

// GET - получить всех пользователей (проксирование к бэкенду)
export async function GET(request: NextRequest) {
  try {
    const includePasswords = request.nextUrl.searchParams.get('includePasswords') === 'true'
    const url = includePasswords 
      ? `${BACKEND_URL}/api/users?includePasswords=true`
      : `${BACKEND_URL}/api/users`
    
    console.log('[Users API Proxy] GET users, url:', url)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Users API Proxy] Error fetching users:', error)
    return NextResponse.json({ error: 'Ошибка получения пользователей' }, { status: 500 })
  }
}

// POST - создать нового пользователя (проксирование к бэкенду)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Users API Proxy] POST new user:', body.username || body.email)
    
    const response = await fetch(`${BACKEND_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    const data = await response.json()
    console.log('[Users API Proxy] POST response:', response.status)
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Users API Proxy] Error creating user:', error)
    return NextResponse.json({ error: 'Ошибка создания пользователя' }, { status: 500 })
  }
}

// PUT - обновить пользователя (проксирование к бэкенду)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json({ error: 'ID пользователя обязателен' }, { status: 400 })
    }
    
    console.log('[Users API Proxy] PUT user:', id)
    
    const response = await fetch(`${BACKEND_URL}/api/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Users API Proxy] Error updating user:', error)
    return NextResponse.json({ error: 'Ошибка обновления пользователя' }, { status: 500 })
  }
}

// DELETE - удалить пользователя (проксирование к бэкенду)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID пользователя обязателен' }, { status: 400 })
    }
    
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
