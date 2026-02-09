'use client'

interface TimePeriodPresetsProps {
  onPresetSelect: (fromDate: string, toDate: string, label: string, period: 'monthly' | 'weekly' | 'daily') => void
  className?: string
}

export function TimePeriodPresets({ onPresetSelect, className = '' }: TimePeriodPresetsProps) {
  const getDatePresets = () => {
    const today = new Date()
    const formatDate = (date: Date) => date.toISOString().split('T')[0]
    
    // Функция для получения понедельника недели
    const getMonday = (date: Date) => {
      const day = date.getDay()
      const diff = date.getDate() - day + (day === 0 ? -6 : 1)
      return new Date(date.setDate(diff))
    }
    
    // Функция для получения воскресенья недели
    const getSunday = (date: Date) => {
      const monday = getMonday(new Date(date))
      return new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000)
    }
    
    // Функция для получения первого дня месяца
    const getFirstDayOfMonth = (date: Date) => {
      return new Date(date.getFullYear(), date.getMonth(), 1)
    }
    
    // Функция для получения последнего дня месяца
    const getLastDayOfMonth = (date: Date) => {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0)
    }
    
    // Вчерашний день для daily
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    // Последние 60 дней (максимум для daily)
    const last60Days = new Date(today)
    last60Days.setDate(last60Days.getDate() - 60)
    
    // Прошлый понедельник и воскресенье для weekly
    const lastWeekStart = getMonday(new Date())
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const lastWeekEnd = getSunday(new Date(lastWeekStart))
    
    // Последнее воскресенье
    const lastSunday = getSunday(new Date())
    if (lastSunday > today) {
      lastSunday.setDate(lastSunday.getDate() - 7)
    }
    
    // Первая неделя месяца
    const firstMondayOfMonth = getMonday(getFirstDayOfMonth(today))
    
    // Прошлый месяц
    const lastMonthStart = getFirstDayOfMonth(new Date(today.getFullYear(), today.getMonth() - 1))
    const lastMonthEnd = getLastDayOfMonth(new Date(today.getFullYear(), today.getMonth() - 1))
    
    // Текущий месяц
    const currentMonthStart = getFirstDayOfMonth(today)
    const currentMonthEnd = getLastDayOfMonth(today)
    
    // 3 месяца назад
    const threeMonthsAgo = getFirstDayOfMonth(new Date(today.getFullYear(), today.getMonth() - 3))
    
    return [
      // Daily periods (последние 60 дней максимум)
      {
        label: 'Последние 30 дней',
        fromDate: formatDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)),
        toDate: formatDate(yesterday),
        period: 'daily' as const,
        icon: '📅'
      },
      {
        label: 'Последние 7 дней',
        fromDate: formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)),
        toDate: formatDate(yesterday),
        period: 'daily' as const,
        icon: '�'
      },
      {
        label: 'Последние 60 дней',
        fromDate: formatDate(last60Days),
        toDate: formatDate(yesterday),
        period: 'daily' as const,
        icon: '📈'
      },
      
      // Weekly periods (понедельник-воскресенье)
      {
        label: 'Прошлая неделя',
        fromDate: formatDate(lastWeekStart),
        toDate: formatDate(lastWeekEnd),
        period: 'weekly' as const,
        icon: '�'
      },
      {
        label: 'Последние 4 недели',
        fromDate: formatDate(new Date(lastWeekStart.getTime() - 3 * 7 * 24 * 60 * 60 * 1000)),
        toDate: formatDate(lastSunday),
        period: 'weekly' as const,
        icon: '🗓️'
      },
      
      // Monthly periods (первое-последнее число месяца)
      {
        label: 'Прошлый месяц',
        fromDate: formatDate(lastMonthStart),
        toDate: formatDate(lastMonthEnd),
        period: 'monthly' as const,
        icon: '⏪'
      },
      {
        label: 'Последние 3 месяца',
        fromDate: formatDate(threeMonthsAgo),
        toDate: formatDate(currentMonthEnd),
        period: 'monthly' as const,
        icon: '🏃'
      },
      {
        label: 'Последние 6 месяцев',
        fromDate: formatDate(getFirstDayOfMonth(new Date(today.getFullYear(), today.getMonth() - 6))),
        toDate: formatDate(currentMonthEnd),
        period: 'monthly' as const,
        icon: '📊'
      }
    ]
  }

  const presets = getDatePresets()

  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="text-sm font-medium" style={{ color: 'var(--glass-text-primary)' }}>
        Быстрый выбор периода
      </h4>
      
      <div className="space-y-3">
        {/* Daily presets */}
        <div>
          <h5 className="text-xs font-medium mb-2" style={{ color: 'var(--glass-text-secondary)' }}>
            По дням (последние 60 дней)
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {presets.filter(p => p.period === 'daily').map((preset, index) => (
              <button
                key={`daily-${index}`}
                onClick={() => onPresetSelect(preset.fromDate, preset.toDate, preset.label, preset.period)}
                className="glass-button text-left p-3 hover:scale-[1.02] transition-transform"
                style={{
                  background: 'rgba(49, 50, 68, 0.4)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px'
                }}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{preset.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--glass-text-primary)' }}>
                      {preset.label}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--glass-text-tertiary)' }}>
                      {preset.fromDate} → {preset.toDate}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Weekly presets */}
        <div>
          <h5 className="text-xs font-medium mb-2" style={{ color: 'var(--glass-text-secondary)' }}>
            По неделям (пн-вс)
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {presets.filter(p => p.period === 'weekly').map((preset, index) => (
              <button
                key={`weekly-${index}`}
                onClick={() => onPresetSelect(preset.fromDate, preset.toDate, preset.label, preset.period)}
                className="glass-button text-left p-3 hover:scale-[1.02] transition-transform"
                style={{
                  background: 'rgba(49, 50, 68, 0.4)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px'
                }}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{preset.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--glass-text-primary)' }}>
                      {preset.label}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--glass-text-tertiary)' }}>
                      {preset.fromDate} → {preset.toDate}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Monthly presets */}
        <div>
          <h5 className="text-xs font-medium mb-2" style={{ color: 'var(--glass-text-secondary)' }}>
            По месяцам
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {presets.filter(p => p.period === 'monthly').map((preset, index) => (
              <button
                key={`monthly-${index}`}
                onClick={() => onPresetSelect(preset.fromDate, preset.toDate, preset.label, preset.period)}
                className="glass-button text-left p-3 hover:scale-[1.02] transition-transform"
                style={{
                  background: 'rgba(49, 50, 68, 0.4)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px'
                }}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{preset.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--glass-text-primary)' }}>
                      {preset.label}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--glass-text-tertiary)' }}>
                      {preset.fromDate} → {preset.toDate}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="text-xs text-center mt-3 p-2 rounded" style={{ 
        color: 'var(--glass-text-tertiary)', 
        background: 'rgba(59, 130, 246, 0.1)' 
      }}>
        💡 Нажмите на пресет для автоматического заполнения дат и периода
      </div>
    </div>
  )
}