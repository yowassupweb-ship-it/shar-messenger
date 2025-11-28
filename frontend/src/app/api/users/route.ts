import { NextRequest, NextResponse } from 'next/server'

// Mock API - в будущем заменить на реальную систему пользователей
export async function GET() {
  // Возвращаем пустой массив, так как система пользователей еще не реализована
  return NextResponse.json([])
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  // Mock - просто возвращаем успех
  return NextResponse.json({ 
    success: true,
    message: 'Функция создания пользователей в разработке' 
  })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  
  return NextResponse.json({ 
    success: true,
    message: 'Функция обновления пользователей в разработке' 
  })
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ 
    success: true,
    message: 'Функция удаления пользователей в разработке' 
  })
}
