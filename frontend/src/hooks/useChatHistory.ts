'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChatMessage, ChatHistory } from '@/types/chat'

export function useChatHistory(sessionId: string = 'default') {
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Загрузить историю
  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/chat/history?sessionId=${sessionId}`)
      if (!response.ok) {
        throw new Error('Ошибка загрузки истории')
      }
      
      const data = await response.json()
      setHistory(data.history.messages || [])
    } catch (err) {
      console.error('Ошибка загрузки истории:', err)
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  // Сохранить сообщение
  const saveMessage = useCallback(async (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setError(null)
    
    try {
      const response = await fetch('/api/chat/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId
        })
      })
      
      if (!response.ok) {
        throw new Error('Ошибка сохранения сообщения')
      }
      
      const data = await response.json()
      
      // Обновляем локальную историю
      setHistory(prev => [...prev, data.message])
      
      return data.message
    } catch (err) {
      console.error('Ошибка сохранения сообщения:', err)
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
      throw err
    }
  }, [sessionId])

  // Очистить историю
  const clearHistory = useCallback(async () => {
    setError(null)
    
    try {
      const response = await fetch(`/api/chat/history?sessionId=${sessionId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Ошибка очистки истории')
      }
      
      setHistory([])
      return true
    } catch (err) {
      console.error('Ошибка очистки истории:', err)
      setError(err instanceof Error ? err.message : 'Ошибка очистки')
      return false
    }
  }, [sessionId])

  // Загружаем историю при монтировании
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  return {
    history,
    loading,
    error,
    saveMessage,
    clearHistory,
    reload: loadHistory
  }
}
