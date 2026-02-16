import { NextResponse } from 'next/server'

// Отключаем кеширование
export const dynamic = 'force-dynamic'
export const revalidate = 0

const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || 'http://127.0.0.1:8000'

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/database/size`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Database Size API Proxy] Error:', error)
    return NextResponse.json({ error: 'Ошибка получения размера базы' }, { status: 500 })
  }
}
