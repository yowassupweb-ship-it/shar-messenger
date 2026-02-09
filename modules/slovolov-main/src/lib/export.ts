import { TopRequestsResponse, KeywordData } from '@/types/yandex-wordstat'
import { hotnessLabels } from '@/lib/yandex-wordstat'

// Утилиты для экспорта данных

export function exportTopRequestsToCSV(data: TopRequestsResponse): void {
  const headers = ['Запрос', 'Запросов', 'Оценка']
  
  const rows: string[][] = []

  // Топ-запросы без нумерации
  rows.push(
    ...data.topRequests.map((item) => [
      `"${item.phrase}"`,
      item.count.toString(),
      `"${getHotnessLabel(item.count)}"`
    ])
  )

  // Ассоциации (если нужны в общем выгрузе) также без нумерации и пометок
  if (Array.isArray(data.associations) && data.associations.length > 0) {
    rows.push(
      ...data.associations.map((item) => [
        `"${item.phrase}"`,
        item.count.toString(),
        `"${getHotnessLabel(item.count)}"`
      ])
    )
  }

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  downloadCSV(csvContent, `wordstat_${data.requestPhrase}_${getCurrentDate()}.csv`)
}

export function exportBatchResultsToCSV(results: KeywordData[]): void {
  const headers = [
    'Запрос', 
    'Запросов', 
    'Оценка'
  ]
  
  // Добавляем дополнительные колонки если есть региональные данные
  const hasRegionData = results.some(r => r.regions && r.regions.length > 0)
  const hasDynamicsData = results.some(r => r.dynamics && r.dynamics.length > 0)
  
  console.log('Export debug:', {
    totalResults: results.length,
    hasRegionData,
    hasDynamicsData,
    sampleResult: results[0]
  })
  
  if (hasRegionData) {
    headers.push('Топ регионы', 'Индекс интереса')
  }
  
  if (hasDynamicsData) {
    headers.push('Динамика (последние точки)')
  }

  const rows = results.map((result) => {
    const row = [
      `"${result.phrase}"`,
      result.count.toString(),
      `"${result.hotness ? hotnessLabels[result.hotness] : 'Неопределено'}"`
    ]
    
    if (hasRegionData) {
      const topRegions = result.regions
        ?.sort((a, b) => b.affinityIndex - a.affinityIndex)
        .slice(0, 3)
        .map(r => `${r.regionId}(${r.affinityIndex.toFixed(1)}%)`)
        .join('; ') || ''
      
      const avgAffinityIndex = result.regions?.length 
        ? (result.regions.reduce((sum, r) => sum + r.affinityIndex, 0) / result.regions.length).toFixed(1)
        : ''
      
      row.push(`"${topRegions}"`, avgAffinityIndex)
    }
    
    if (hasDynamicsData) {
      const recentDynamics = result.dynamics
        ?.slice(-3)
        .map(d => `${d.date}:${d.count}`)
        .join('; ') || ''
      
      row.push(`"${recentDynamics}"`)
    }
    
    return row
  })

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  downloadCSV(csvContent, `wordstat_batch_${getCurrentDate()}.csv`)
}

function downloadCSV(csvContent: string, filename: string): void {
  // Добавляем BOM для правильного отображения в Excel
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  })
  
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

function getHotnessLabel(count: number): string {
  if (count >= 100000) return hotnessLabels['very-hot']
  if (count >= 10000) return hotnessLabels['hot']
  if (count >= 1000) return hotnessLabels['warm']
  return hotnessLabels['cold']
}

function getHotnessColor(hotness: keyof typeof hotnessLabels): string {
  const colors = {
    'cold': '#3b82f6',
    'warm': '#f59e0b', 
    'hot': '#ef4444',
    'very-hot': '#dc2626'
  }
  return colors[hotness]
}

function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0]
}

// Экспорт в JSON для более детального анализа
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportToJSON(data: any, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json' })
  
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${getCurrentDate()}.json`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}