/**
 * Форматирует количество дней для отображения в названии тура
 * 1 день = "Экскурсия"
 * 2+ дней = "Тур на X дней/дня/день"
 */
export function formatDaysLabel(days: string | number): string {
  const daysNum = typeof days === 'string' ? parseInt(days) : days

  if (isNaN(daysNum) || daysNum < 1) {
    return ''
  }

  // 1 день = Экскурсия
  if (daysNum === 1) {
    return 'Экскурсия'
  }

  // 2+ дней = Тур на X дней/дня/день
  const daysWord = getDaysWord(daysNum)
  return `Тур на ${daysNum} ${daysWord}`
}

/**
 * Возвращает правильное склонение слова "день"
 */
function getDaysWord(days: number): string {
  // Правила склонения:
  // 1, 21, 31, ... - день
  // 2-4, 22-24, 32-34, ... - дня
  // 5-20, 25-30, ... - дней

  const lastDigit = days % 10
  const lastTwoDigits = days % 100

  // Исключение для 11-14 (всегда "дней")
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'дней'
  }

  // 1, 21, 31... - день
  if (lastDigit === 1) {
    return 'день'
  }

  // 2-4, 22-24... - дня
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'дня'
  }

  // Остальное - дней
  return 'дней'
}

/**
 * Форматирует полное название тура с днями
 * Примеры:
 * 1 день: "Экскурсия · Владимирское княжество"
 * 3 дня: "Тур на 3 дня · Владимирское княжество"
 */
export function formatTourTitle(name: string, days: string | number): string {
  const daysLabel = formatDaysLabel(days)
  return daysLabel ? `${daysLabel} · ${name}` : name
}
