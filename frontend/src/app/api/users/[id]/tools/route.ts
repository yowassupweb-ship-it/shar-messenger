import { NextRequest, NextResponse } from 'next/server'
import { readDB, writeDB } from '@/lib/db'

// PUT - обновить инструменты пользователя
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
    
    const db = await readDB()
    const users = db.users || []
    
    const userIndex = users.findIndex((u: any) => u.id === id)
    
    if (userIndex === -1) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }
    
    users[userIndex].enabledTools = enabledTools
    
    db.users = users
    await writeDB(db)
    
    console.log(`Updated tools for user ${id}:`, enabledTools)
    
    return NextResponse.json({ 
      success: true, 
      user: users[userIndex]
    })
  } catch (error) {
    console.error('Error updating user tools:', error)
    return NextResponse.json({ error: 'Ошибка обновления инструментов' }, { status: 500 })
  }
}

// GET - получить инструменты пользователя
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
      enabledTools: user.enabledTools || []
    })
  } catch (error) {
    console.error('Error fetching user tools:', error)
    return NextResponse.json({ error: 'Ошибка получения инструментов' }, { status: 500 })
  }
}
