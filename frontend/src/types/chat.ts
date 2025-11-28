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

export interface AIPreset {
  id: string
  name: string
  prompt: string
  createdAt: string
  updatedAt: string
}
