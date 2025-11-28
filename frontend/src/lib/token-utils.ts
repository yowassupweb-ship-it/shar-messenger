import { readDB } from './db'

// Утилитная функция для получения OAuth токена из базы данных или переменных окружения
export async function getYandexToken(): Promise<string | null> {
  try {
    // Сначала пробуем загрузить из базы данных
    const db = await readDB()
    if (db.settings?.wordstatToken) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✓ Wordstat token found in database')
      }
      return db.settings.wordstatToken
    }
  } catch (error) {
    console.error('Error reading token from database:', error)
  }

  // Если не нашли в БД, пробуем переменные окружения
  const token = process.env.YANDEX_WORDSTAT_OAUTH_TOKEN || 
                process.env.YANDEX_WORDSTAT_TOKEN || 
                process.env.YANDEX_OAUTH_TOKEN ||
                process.env.YANDEX_TOKEN ||
                process.env.OAUTH_TOKEN

  if (process.env.NODE_ENV === 'development') {
    console.log('Environment variables check:')
    console.log('YANDEX_WORDSTAT_OAUTH_TOKEN:', !!process.env.YANDEX_WORDSTAT_OAUTH_TOKEN)
    console.log('YANDEX_WORDSTAT_TOKEN:', !!process.env.YANDEX_WORDSTAT_TOKEN)
    console.log('YANDEX_OAUTH_TOKEN:', !!process.env.YANDEX_OAUTH_TOKEN)
    console.log('YANDEX_TOKEN:', !!process.env.YANDEX_TOKEN)
    console.log('OAUTH_TOKEN:', !!process.env.OAUTH_TOKEN)
    console.log('Final token found:', !!token)
  }

  return token || null
}