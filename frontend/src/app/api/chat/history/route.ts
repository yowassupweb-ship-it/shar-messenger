import { NextRequest, NextResponse } from 'next/server'
import { readDB, writeDB } from '@/lib/db'
import { ChatMessage, ChatHistory } from '@/types/chat'

// Получить историю чата
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId') || 'default'
    
    const db = await readDB()
    
    if (!db.chatSessions) {
      db.chatSessions = {}
    }
    
    const history = db.chatSessions[sessionId] || { messages: [], lastUpdated: Date.now() }
    
    return NextResponse.json({ history })
  } catch (error) {
    console.error('Ошибка получения истории чата:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки истории чата' },
      { status: 500 }
    )
  }
}

// Сохранить сообщение в историю
export async function POST(request: NextRequest) {
  try {
    const { message, sessionId = 'default' } = await request.json()
    
    if (!message || !message.content) {
      return NextResponse.json(
        { error: 'Отсутствует сообщение' },
        { status: 400 }
      )
    }

    // Добавляем новое сообщение
    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: message.role,
      content: message.content,
      timestamp: Date.now(),
      phrase: message.phrase,
      page: message.page
    }
    
    const db = await readDB()
    
    if (!db.chatSessions) {
      db.chatSessions = {}
    }
    
    const currentHistory = db.chatSessions[sessionId] || { messages: [], lastUpdated: Date.now() }
    
    const updatedHistory: ChatHistory = {
      messages: [...currentHistory.messages, newMessage].slice(-100), // Храним последние 100 сообщений
      lastUpdated: Date.now()
    }
    
    db.chatSessions[sessionId] = updatedHistory
    
    await writeDB(db)
    
    return NextResponse.json({ 
      success: true, 
      message: newMessage, 
      totalMessages: updatedHistory.messages.length 
    })
  } catch (error) {
    console.error('Ошибка сохранения сообщения:', error)
    return NextResponse.json(
      { error: 'Ошибка сохранения сообщения' },
      { status: 500 }
    )
  }
}

// Очистить историю чата
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId') || 'default'
    
    const db = await readDB()
    
    if (!db.chatSessions) {
      db.chatSessions = {}
    }
    
    delete db.chatSessions[sessionId]
    
    await writeDB(db)
    
    return NextResponse.json({ success: true, message: 'История чата очищена' })
  } catch (error) {
    console.error('Ошибка очистки истории чата:', error)
    return NextResponse.json(
      { error: 'Ошибка очистки истории чата' },
      { status: 500 }
    )
  }
}
