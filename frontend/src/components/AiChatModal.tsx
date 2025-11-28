'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Sparkles, Trash2, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useChatHistory } from '@/hooks'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

interface AiChatModalProps {
  currentPhrase?: string
  searchResults?: any
  currentPage?: 'search' | 'combo' | 'dynamics' | 'regions' | 'settings'
  selectedDevices?: Array<'all' | 'desktop' | 'phone' | 'tablet'>
  selectedRegions?: number[]
  dynamicsPeriod?: 'daily' | 'weekly' | 'monthly'
}

export default function AiChatModal({ currentPhrase, searchResults, currentPage, selectedDevices, selectedRegions, dynamicsPeriod }: AiChatModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isApiAvailable, setIsApiAvailable] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Используем историю чата
  const { history, loading: historyLoading, error: historyError, saveMessage, clearHistory } = useChatHistory()
  
  // Конвертируем историю в формат Message для совместимости
  const messages: Message[] = history.map(msg => ({
    id: msg.id,
    content: msg.content,
    role: msg.role,
    timestamp: new Date(msg.timestamp)
  }))

  // Проверка доступности API
  useEffect(() => {
    const checkApiAvailability = async () => {
      try {
        const resp = await fetch('/api/ai-availability')
        if (!resp.ok) {
          setIsApiAvailable(false)
          return
        }
        const data = await resp.json()
        setIsApiAvailable(Boolean(data?.available))
      } catch (err) {
        setIsApiAvailable(false)
      }
    }

    checkApiAvailability()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const initializeChat = async () => {
      if (isOpen && messages.length === 0) {
        try {
          // Формируем контекстуальное приветствие
          let contextMessage = 'Привет! Я AI-помощник для анализа ключевых слов.'
          
          if (currentPage === 'settings') {
            contextMessage += ' Вы находитесь в настройках системы. Могу помочь с настройкой API или объяснить функции.'
          } else if (currentPhrase) {
            contextMessage += ` Вижу, что вы работаете с фразой "${currentPhrase}".`
            
            if (searchResults) {
              const topCount = searchResults.topRequests?.length || 0
              const assocCount = searchResults.associations?.length || 0
              if (topCount > 0 || assocCount > 0) {
                contextMessage += ` Найдено ${topCount} популярных запросов и ${assocCount} похожих. Могу проанализировать результаты или предложить стратегии.`
              }
            }
          } else if (currentPage === 'search') {
            contextMessage += ' Вы в разделе поиска. Могу помочь с подбором ключевых слов или анализом конкурентов.'
          } else if (currentPage === 'dynamics') {
            contextMessage += ' Вы в разделе анализа динамики. Могу помочь интерпретировать изменения популярности запросов.'
          } else if (currentPage === 'regions') {
            contextMessage += ' Вы в разделе анализа по регионам. Могу помочь с географическим анализом популярности запросов.'
          }
          
          contextMessage += ' Чем могу помочь?'

          // Сохраняем приветственное сообщение
          await saveMessage({
            content: contextMessage,
            role: 'assistant',
            phrase: currentPhrase,
            page: currentPage
          })
        } catch (error) {
          console.error('Ошибка сохранения приветственного сообщения:', error)
        }
      }
    }
    
    initializeChat()
  }, [isOpen, currentPhrase, searchResults, currentPage, saveMessage, messages.length])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userContent = inputValue.trim()
    setInputValue('')
    
    // Сразу сохраняем сообщение пользователя ПЕРЕД установкой isLoading
    await saveMessage({
      content: userContent,
      role: 'user',
      phrase: currentPhrase,
      page: currentPage
    })
    
    setIsLoading(true)

    try {
      // Формируем расширенный контекст
      let contextInfo = ''
      
      if (currentPage) {
        const pageNames = {
          search: 'Поиск',
          combo: 'Комбо запрос',
          dynamics: 'Анализ динамики',
          regions: 'Анализ по регионам',
          settings: 'Настройки'
        }
        contextInfo += `Страница: ${pageNames[currentPage]}. `
      }
      
      if (currentPhrase) {
        contextInfo += `Текущая фраза: "${currentPhrase}". `
      }
      if (selectedDevices && selectedDevices.length > 0) {
        contextInfo += `Устройства: ${selectedDevices.join(', ')}. `
      }
      if (typeof dynamicsPeriod === 'string') {
        const map: any = { daily: 'по дням', weekly: 'по неделям', monthly: 'по месяцам' }
        contextInfo += `Период динамики: ${map[dynamicsPeriod] || dynamicsPeriod}. `
      }
      if (selectedRegions && selectedRegions.length > 0) {
        contextInfo += `Выбрано регионов: ${selectedRegions.length}. `
      }
      
      if (searchResults) {
        const topCount = searchResults.topRequests?.length || 0
        const assocCount = searchResults.associations?.length || 0
        
        if (topCount > 0) {
          contextInfo += `Найдено ${topCount} популярных запросов: ${
            searchResults.topRequests.slice(0, 5).map((r: any) => `"${r.phrase}" (${r.count})`).join(', ')
          }${topCount > 5 ? '...' : ''}. `
        }
        
        if (assocCount > 0) {
          contextInfo += `${assocCount} похожих запросов: ${
            searchResults.associations.slice(0, 3).map((r: any) => `"${r.phrase}" (${r.count})`).join(', ')
          }${assocCount > 3 ? '...' : ''}. `
        }
        
        if (searchResults.dynamics && searchResults.dynamics.length > 0) {
          contextInfo += `Есть данные динамики за ${searchResults.dynamics.length} периодов. `
        }
      }

      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userContent,
          context: contextInfo || undefined,
          history: messages.slice(-5) // Последние 5 сообщений для контекста
        }),
      })

      if (!response.ok) {
        throw new Error('Ошибка при получении ответа от AI')
      }

      const data = await response.json()
      
      // Сохраняем ответ AI
      await saveMessage({
        content: data.response || 'Извините, не удалось получить ответ.',
        role: 'assistant',
        phrase: currentPhrase,
        page: currentPage
      })
    } catch (error) {
      console.error('Ошибка AI чата:', error)
      
      // Сохраняем сообщение об ошибке
      await saveMessage({
        content: 'Извините, произошла ошибка при обращении к AI. Попробуйте еще раз.',
        role: 'assistant',
        phrase: currentPhrase,
        page: currentPage
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <>
      {/* Floating chat button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-300 z-40"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            animation: 'fadeIn 0.3s ease-out'
          }}
          title="AI Помощник"
        >
          <MessageCircle className="w-6 h-6" />
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full" style={{
            background: isApiAvailable ? '#10B981' : '#EF4444',
            animation: isApiAvailable ? 'pulse 2s infinite' : 'none'
          }}></div>
        </button>
      )}

      {/* Chat modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-3 md:p-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/20 transition-opacity duration-300 ease-out"
            style={{ animation: 'fadeIn 0.3s ease-out' }}
            onClick={() => setIsOpen(false)}
          />
          
          {/* Chat window */}
          <div 
            className="relative w-full md:w-96 h-[75vh] md:h-[500px] rounded-lg shadow-2xl flex flex-col transition-all duration-300 ease-out"
            style={{
              background: 'var(--glass-bg-card)',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(16px)',
              animation: 'slideInUp 0.3s ease-out'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--glass-border)' }}>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5" style={{ color: 'var(--glass-accent)' }} />
                <h3 className="font-medium" style={{ color: 'var(--glass-text-primary)' }}>
                  AI Помощник
                </h3>
                {messages.length > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full" style={{ 
                    background: 'rgba(137, 180, 250, 0.2)', 
                    color: 'var(--glass-blue)' 
                  }}>
                    {messages.length}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {/* Кнопка очистки истории */}
                <button
                  onClick={async () => {
                    if (confirm('Вы уверены, что хотите очистить историю чата?')) {
                      await clearHistory()
                    }
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
                  title="Очистить историю чата"
                  disabled={messages.length === 0}
                >
                  <Trash2 className="w-4 h-4" style={{ 
                    color: messages.length > 0 ? 'var(--glass-red)' : 'var(--glass-text-tertiary)' 
                  }} />
                </button>
                
                {/* Кнопка закрытия */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
                >
                  <X className="w-4 h-4" style={{ color: 'var(--glass-text-secondary)' }} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Индикатор загрузки истории */}
              {historyLoading && (
                <div className="flex justify-center">
                  <div className="text-xs" style={{ color: 'var(--glass-text-tertiary)' }}>
                    Загружается история чата...
                  </div>
                </div>
              )}
              
              {/* Ошибка истории */}
              {historyError && (
                <div className="p-3 rounded-lg" style={{ 
                  background: 'var(--glass-error)', 
                  color: 'var(--glass-red)' 
                }}>
                  <div className="text-xs">Ошибка загрузки истории: {historyError}</div>
                </div>
              )}
              
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg text-sm ${
                      message.role === 'user'
                        ? 'rounded-br-none'
                        : 'rounded-bl-none'
                    }`}
                    style={{
                      background: message.role === 'user' 
                        ? 'var(--glass-accent)' 
                        : 'rgba(0, 0, 0, 0.2)',
                      color: message.role === 'user'
                        ? 'var(--glass-blue)'
                        : 'var(--glass-text-primary)'
                    }}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none prose-invert">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div 
                    className="p-3 rounded-lg rounded-bl-none text-sm"
                    style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      color: 'var(--glass-text-primary)'
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--glass-accent)' }}></div>
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--glass-accent)', animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--glass-accent)', animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs" style={{ color: 'var(--glass-text-tertiary)' }}>
                        AI думает...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t" style={{ borderColor: 'var(--glass-border)' }}>
              <div className="flex space-x-2 items-center">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  onInput={(e) => {
                    const ta = e.currentTarget
                    ta.style.height = 'auto'
                    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
                  }}
                  disabled={isLoading}
                  placeholder="Спросите что-то об анализе ключевых слов..."
                  className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 min-h-[54px] max-h-[200px] resize-none"
                  style={{
                    background: 'rgba(0, 0, 0, 0.1)',
                    borderColor: 'var(--glass-border)',
                    color: 'var(--glass-text-primary)',
                    height: '54px',
                    overflow: 'hidden'
                  }}
                  rows={1}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="send-button flex items-center justify-center transition-all duration-200 disabled:opacity-50 flex-shrink-0"
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '8px',
                    background: inputValue.trim() && !isLoading 
                      ? 'linear-gradient(135deg, var(--glass-blue), var(--glass-purple))' 
                      : 'rgba(137, 180, 250, 0.3)',
                    color: 'white',
                    border: 'none',
                    cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
                    boxShadow: inputValue.trim() && !isLoading 
                      ? '0 4px 15px rgba(137, 180, 250, 0.4)' 
                      : 'none',
                    transform: inputValue.trim() && !isLoading ? 'scale(1)' : 'scale(0.95)'
                  }}
                >
                  <Send className="w-5 h-5" style={{ marginLeft: '2px' }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}