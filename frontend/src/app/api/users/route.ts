import { NextRequest, NextResponse } from 'next/server'
import { readDB, writeDB } from '@/lib/db'

// Генерация уникального ID
function generateUserId(): string {
  return `user_${Date.now()}.${Math.random().toString(36).substr(2, 9)}`
}

// GET - получить всех пользователей
export async function GET(request: NextRequest) {
  try {
    const db = await readDB()
    const users = db.users || []
    
    // Проверяем, нужно ли включать пароли (для админки)
    const includePasswords = request.nextUrl.searchParams.get('includePasswords') === 'true'
    
    if (includePasswords) {
      return NextResponse.json(users)
    }
    
    // Возвращаем пользователей без паролей
    const usersWithoutPasswords = users.map((user: any) => {
      const { password, ...userWithoutPassword } = user
      return userWithoutPassword
    })
    
    return NextResponse.json(usersWithoutPasswords)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Ошибка получения пользователей' }, { status: 500 })
  }
}

// POST - создать нового пользователя
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, name, email, password, role = 'user', enabledTools = [] } = body
    
    if (!password) {
      return NextResponse.json({ error: 'Пароль обязателен' }, { status: 400 })
    }
    
    if (!username && !email) {
      return NextResponse.json({ error: 'Требуется username или email' }, { status: 400 })
    }
    
    const db = await readDB()
    const users = db.users || []
    
    // Проверяем, существует ли пользователь
    const existingUser = users.find((u: any) => 
      (username && u.username === username) || (email && u.email === email)
    )
    
    if (existingUser) {
      return NextResponse.json({ error: 'Пользователь уже существует' }, { status: 409 })
    }
    
    const newUser = {
      id: generateUserId(),
      username: username || email,
      name: name || '',
      email: email || '',
      password: password, // В реальном приложении нужно хешировать!
      role,
      enabledTools,
      createdAt: new Date().toISOString()
    }
    
    db.users = [...users, newUser]
    await writeDB(db)
    
    console.log('User created:', newUser.username)
    
    // Возвращаем без пароля
    const { password: _, ...userWithoutPassword } = newUser
    
    return NextResponse.json({ 
      success: true,
      user: userWithoutPassword
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Ошибка создания пользователя' }, { status: 500 })
  }
}

// PUT - обновить пользователя
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json({ error: 'ID пользователя обязателен' }, { status: 400 })
    }
    
    const db = await readDB()
    const users = db.users || []
    
    const userIndex = users.findIndex((u: any) => u.id === id)
    
    if (userIndex === -1) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }
    
    // Обновляем пользователя
    users[userIndex] = { ...users[userIndex], ...updates, updatedAt: new Date().toISOString() }
    db.users = users
    await writeDB(db)
    
    console.log('User updated:', id)
    
    const { password: _, ...userWithoutPassword } = users[userIndex]
    
    return NextResponse.json({ 
      success: true,
      user: userWithoutPassword
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Ошибка обновления пользователя' }, { status: 500 })
  }
}

// DELETE - удалить пользователя
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID пользователя обязателен' }, { status: 400 })
    }
    
    const db = await readDB()
    const users = db.users || []
    
    const userIndex = users.findIndex((u: any) => u.id === id)
    
    if (userIndex === -1) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }
    
    // Не даём удалить последнего админа
    const user = users[userIndex]
    if (user.role === 'admin') {
      const adminCount = users.filter((u: any) => u.role === 'admin').length
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Нельзя удалить последнего администратора' }, { status: 400 })
      }
    }
    
    users.splice(userIndex, 1)
    db.users = users
    await writeDB(db)
    
    console.log('User deleted:', id)
    
    return NextResponse.json({ 
      success: true,
      message: 'Пользователь удалён'
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Ошибка удаления пользователя' }, { status: 500 })
  }
}
