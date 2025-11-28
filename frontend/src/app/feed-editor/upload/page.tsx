'use client'

import { useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api'

interface FeedData {
  id: string
  tour_name: string
  route: string
  price: number
  old_price?: number
  duration: number
  description: string
  image_url: string
}

export default function FeedUploadPage() {
  const [feedData, setFeedData] = useState<FeedData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setUploadStatus('Загрузка файла...')

    try {
      const text = await file.text()
      
      if (file.type === 'application/json') {
        const data = JSON.parse(text)
        setFeedData(Array.isArray(data) ? data : [data])
      } else if (file.name.endsWith('.csv')) {
        // Простой парсер CSV
        const lines = text.split('\n')
        const headers = lines[0].split(',').map(h => h.trim())
        const data = lines.slice(1).map(line => {
          const values = line.split(',')
          const item: any = {}
          headers.forEach((header, index) => {
            item[header] = values[index]?.trim()
          })
          return item
        }).filter(item => item.tour_name || item.name)
        
        setFeedData(data)
      }

      setUploadStatus('Файл успешно загружен!')
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error)
      setUploadStatus('Ошибка при загрузке файла')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleApiLoad = async () => {
    setIsLoading(true)
    setUploadStatus('Загрузка из API...')

    try {
      const response = await apiFetch('/api/tours')
      if (response.ok) {
        const data = await response.json()
        setFeedData(data)
        setUploadStatus('Данные успешно загружены из API!')
      } else {
        setUploadStatus('Ошибка при загрузке из API')
      }
    } catch (error) {
      console.error('Ошибка API:', error)
      setUploadStatus('Ошибка подключения к API')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveFeed = async () => {
    setIsLoading(true)
    setUploadStatus('Сохранение фида...')

    try {
      // Сохраняем каждый тур
      for (const tour of feedData) {
        await apiFetch('/api/tours', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tour)
        })
      }
      
      setUploadStatus('Фид успешно сохранен!')
    } catch (error) {
      console.error('Ошибка при сохранении:', error)
      setUploadStatus('Ошибка при сохранении фида')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Заливка фида</h1>
        <p className="text-[var(--muted)] mt-2">
          Загрузите фид из файла или получите данные через API
        </p>
      </div>

      {/* Варианты загрузки */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Загрузка файла */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            Загрузка из файла
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Выберите файл (JSON, CSV)
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".json,.csv"
                onChange={handleFileUpload}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            
            <p className="text-xs text-[var(--muted)]">
              Поддерживаются форматы JSON и CSV. Файл должен содержать поля: tour_name, route, price, duration, description, image_url
            </p>
          </div>
        </div>

        {/* Загрузка из API */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            Загрузка из API
          </h2>
          
          <div className="space-y-4">
            <button
              onClick={handleApiLoad}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-[var(--primary)] text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? 'Загрузка...' : 'Загрузить данные туров'}
            </button>
            
            <p className="text-xs text-[var(--muted)]">
              Получить данные из локального API (/api/tours)
            </p>
          </div>
        </div>
      </div>

      {/* Статус загрузки */}
      {uploadStatus && (
        <div className={`p-4 rounded-lg ${uploadStatus.includes('Ошибка') ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
          <p className={`${uploadStatus.includes('Ошибка') ? 'text-red-400' : 'text-green-400'}`}>
            {uploadStatus}
          </p>
        </div>
      )}

      {/* Превью данных */}
      {feedData.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              Превью данных ({feedData.length} записей)
            </h2>
            <button
              onClick={handleSaveFeed}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Сохранение...' : 'Сохранить фид'}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 px-3 text-[var(--foreground)]">Название тура</th>
                  <th className="text-left py-2 px-3 text-[var(--foreground)]">Маршрут</th>
                  <th className="text-left py-2 px-3 text-[var(--foreground)]">Цена</th>
                  <th className="text-left py-2 px-3 text-[var(--foreground)]">Дни</th>
                  <th className="text-left py-2 px-3 text-[var(--foreground)]">Описание</th>
                </tr>
              </thead>
              <tbody>
                {feedData.slice(0, 5).map((item, index) => (
                  <tr key={index} className="border-b border-[var(--border)]">
                    <td className="py-2 px-3 text-[var(--foreground)]">{item.tour_name || 'Не указано'}</td>
                    <td className="py-2 px-3 text-[var(--muted)]">{item.route || 'Не указан'}</td>
                    <td className="py-2 px-3 text-[var(--foreground)]">₽{item.price?.toLocaleString() || '0'}</td>
                    <td className="py-2 px-3 text-[var(--muted)]">{item.duration || 0}</td>
                    <td className="py-2 px-3 text-[var(--muted)] max-w-xs truncate">{item.description || 'Нет описания'}</td>
                  </tr>
                ))}
                {feedData.length > 5 && (
                  <tr>
                    <td colSpan={5} className="py-2 px-3 text-center text-[var(--muted)]">
                      И ещё {feedData.length - 5} записей...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}