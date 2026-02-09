'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

interface AIChatProps {
  currentPhrase?: string
}

export default function AIChat({ currentPhrase }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now() + '-user',
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phrase: currentPhrase,
          question: userMessage.content
        })
      })

      if (response.ok) {
        const data = await response.json()
        const aiMessage: Message = {
          id: Date.now() + '-ai',
          type: 'ai',
          content: data.analysis || 'Извините, не удалось получить ответ.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
      } else {
        throw new Error('Ошибка API')
      }
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now() + '-error',
        type: 'ai',
        content: 'Извините, произошла ошибка при обращении к AI.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="glass-card h-96 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-opacity-10">
        <Bot className="w-5 h-5" style={{ color: 'var(--glass-blue)' }} />
        <h3 className="font-medium text-sm" style={{ color: 'var(--glass-text-primary)' }}>
          AI Помощник
        </h3>
        {currentPhrase && (
          <span className="ml-auto text-xs px-2 py-1 rounded" style={{ 
            background: 'var(--glass-accent)', 
            color: 'var(--glass-blue)' 
          }}>
            {currentPhrase}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm opacity-70" style={{ color: 'var(--glass-text-secondary)' }}>
              Задайте вопрос о поисковых фразах
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'ai' && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" 
                     style={{ background: 'var(--glass-blue)' }}>
                  <Bot className="w-3 h-3 text-white" />
                </div>
              )}
              
              <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                message.type === 'user' 
                  ? 'bg-blue-600 text-white ml-auto' 
                  : 'border border-opacity-20'
              }`} style={message.type === 'ai' ? {
                background: 'var(--glass-bg-secondary)',
                borderColor: 'var(--glass-border)',
                color: 'var(--glass-text-primary)'
              } : {}}>
                <p className="whitespace-pre-wrap">{message.content}</p>
                <div className={`text-xs mt-1 opacity-70 ${
                  message.type === 'user' ? 'text-blue-100' : ''
                }`} style={message.type === 'ai' ? {
                  color: 'var(--glass-text-tertiary)'
                } : {}}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>

              {message.type === 'user' && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-600">
                  <User className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          ))
        )}
        
        {loading && (
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" 
                 style={{ background: 'var(--glass-blue)' }}>
              <Bot className="w-3 h-3 text-white" />
            </div>
            <div className="rounded-lg p-3 border border-opacity-20" style={{
              background: 'var(--glass-bg-secondary)',
              borderColor: 'var(--glass-border)'
            }}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--glass-blue)' }} />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-opacity-10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Задайте вопрос об анализе ключевых слов..."
            className="glass-input flex-1 text-sm"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="glass-button-primary p-2 disabled:opacity-50 rounded-lg"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}