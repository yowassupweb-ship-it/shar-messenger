import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { initSchema, query } from '@/lib/db'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  phrase?: string
  page?: string
}

export interface ChatHistory {
  messages: ChatMessage[]
  lastUpdated: number
}

// Получить историю чата
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId') || 'default'
    
    try {
      const history = await kv.get<ChatHistory>(`chat:${sessionId}`)
      return NextResponse.json({ history: history || { messages: [], lastUpdated: Date.now() } })
    } catch {
      // Fallback: Postgres
      await initSchema()
      const sess = await query<{ id: string; last_updated: string }>(`select id, extract(epoch from last_updated)*1000 as last_updated from chat_sessions where id=$1`, [sessionId])
      const msgs = await query<ChatMessage>(`select id, role, content, extract(epoch from timestamp)*1000 as timestamp, phrase, page from chat_messages where session_id=$1 order by timestamp asc`, [sessionId])
      const lastUpdated = sess.rows[0]?.last_updated ? Number(sess.rows[0].last_updated) : Date.now()
      return NextResponse.json({ history: { messages: msgs.rows, lastUpdated } })
    }
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
    try {
      // KV path
      const currentHistory = await kv.get<ChatHistory>(`chat:${sessionId}`) || { messages: [], lastUpdated: Date.now() }
      const updatedHistory: ChatHistory = {
        messages: [...currentHistory.messages, newMessage].slice(-100),
        lastUpdated: Date.now()
      }
      await kv.set(`chat:${sessionId}`, updatedHistory, { ex: 30 * 24 * 60 * 60 })
      return NextResponse.json({ success: true, message: newMessage, totalMessages: updatedHistory.messages.length })
    } catch {
      // Postgres fallback
      await initSchema()
      await query('insert into chat_sessions (id, last_updated) values ($1, now()) on conflict (id) do update set last_updated=excluded.last_updated', [sessionId])
      await query('insert into chat_messages (id, session_id, role, content, timestamp, phrase, page) values ($1,$2,$3,$4, to_timestamp($5/1000.0), $6, $7)', [
        newMessage.id,
        sessionId,
        newMessage.role,
        newMessage.content,
        newMessage.timestamp,
        newMessage.phrase || null,
        newMessage.page || null
      ])
      const countRes = await query<{ count: string }>('select count(*)::int as count from chat_messages where session_id=$1', [sessionId])
      return NextResponse.json({ success: true, message: newMessage, totalMessages: Number(countRes.rows[0].count) })
    }
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
    try {
      await kv.del(`chat:${sessionId}`)
      return NextResponse.json({ success: true, message: 'История чата очищена' })
    } catch {
      await initSchema()
      await query('delete from chat_messages where session_id=$1', [sessionId])
      await query('delete from chat_sessions where id=$1', [sessionId])
      return NextResponse.json({ success: true, message: 'История чата очищена' })
    }
  } catch (error) {
    console.error('Ошибка очистки истории чата:', error)
    return NextResponse.json(
      { error: 'Ошибка очистки истории чата' },
      { status: 500 }
    )
  }
}