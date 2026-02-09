// Утилитная функция для получения OAuth токена из переменных окружения
export function getYandexToken(): string | null {
  // Пробуем разные варианты названий переменных
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