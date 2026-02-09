'use client'

import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface DynamicsData {
  date: string
  count: number
}

interface DynamicsChartProps {
  data: DynamicsData[]
  phrase: string
  period: 'daily' | 'weekly' | 'monthly'
}

export default function DynamicsChart({ data, phrase, period }: DynamicsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📈</div>
          <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--glass-text-primary)' }}>
            Нет данных динамики
          </h3>
          <p className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
            Включите анализ динамики и укажите период для отображения графика
          </p>
        </div>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (period === 'daily') {
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    } else if (period === 'weekly') {
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    } else {
      return date.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' })
    }
  }

  const getPeriodLabel = () => {
    switch (period) {
      case 'daily': return 'по дням'
      case 'weekly': return 'по неделям'
      case 'monthly': return 'по месяцам'
      default: return ''
    }
  }

  const chartData = {
    labels: data.map(item => formatDate(item.date)),
    datasets: [
      {
        label: `Запросы ${getPeriodLabel()}`,
        data: data.map(item => item.count),
        borderColor: 'rgba(137, 180, 250, 1)',
        backgroundColor: (ctx: any) => {
          const { chart } = ctx
          const { ctx: c, chartArea } = chart
          if (!chartArea) return 'rgba(137, 180, 250, 0.1)'
          const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          gradient.addColorStop(0, 'rgba(137, 180, 250, 0.3)')
          gradient.addColorStop(1, 'rgba(137, 180, 250, 0.0)')
          return gradient
        },
        fill: true,
        tension: 0.35,
        pointBackgroundColor: 'rgba(137, 180, 250, 1)',
        pointBorderColor: 'rgba(255, 255, 255, 0.8)',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 2
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(137, 180, 250, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: function(context: any) {
            return `${context[0].label}`
          },
          label: function(context: any) {
            const val = context.parsed.y
            return `Запросов: ${val.toLocaleString('ru-RU')}`
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.06)',
          drawBorder: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 11
          },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.06)',
          drawBorder: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 11
          },
          callback: function(value: any) {
            return value.toLocaleString('ru-RU')
          }
        },
        beginAtZero: true
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const
    },
    elements: {
      line: {
        borderWidth: 2
      }
    }
  }

  const maxValue = Math.max(...data.map(item => item.count))
  const minValue = Math.min(...data.map(item => item.count))
  const avgValue = data.reduce((sum, item) => sum + item.count, 0) / data.length

  // Плагины для горизонтальных линий аннотаций
  const annotationPlugin = {
    id: 'horizontalLines',
    afterDatasetsDraw(chart: any) {
      const { ctx, chartArea, scales } = chart
      const yScale = scales.y
      const xScale = scales.x
      if (!chartArea || !yScale || !xScale) return

      const drawLine = (value: number, color: string, label: string) => {
        const y = yScale.getPixelForValue(value)
        ctx.save()
        ctx.strokeStyle = color
        ctx.setLineDash([6, 6])
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(chartArea.left, y)
        ctx.lineTo(chartArea.right, y)
        ctx.stroke()
        ctx.fillStyle = color
        ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto'
        ctx.textBaseline = 'bottom'
        ctx.fillText(`${label}: ${Math.round(value).toLocaleString('ru-RU')}`, chartArea.left + 6, y - 4)
        ctx.restore()
      }

      drawLine(maxValue, 'rgba(166, 227, 161, 0.9)', 'Макс')
      drawLine(avgValue, 'rgba(137, 180, 250, 0.9)', 'Среднее')
      drawLine(minValue, 'rgba(243, 139, 168, 0.9)', 'Мин')
    }
  }

  return (
    <div className="glass-card p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium" style={{ color: 'var(--glass-text-primary)' }}>
            Динамика запросов
          </h3>
          <div className="text-xs px-3 py-1 rounded-full" style={{ 
            background: 'rgba(102, 126, 234, 0.2)', 
            color: 'var(--glass-text-primary)' 
          }}>
            {getPeriodLabel()}
          </div>
        </div>
        <p className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
          «{phrase}» — {data.length} точек данных
        </p>
      </div>

      <div className="h-64 mb-4">
        <Line data={chartData} options={options} plugins={[annotationPlugin]} />
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 rounded-lg" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
          <div className="text-sm font-medium" style={{ color: 'var(--glass-text-primary)' }}>
            {maxValue.toLocaleString('ru-RU')}
          </div>
          <div className="text-xs" style={{ color: 'var(--glass-text-tertiary)' }}>
            Максимум
          </div>
        </div>
        <div className="p-3 rounded-lg" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
          <div className="text-sm font-medium" style={{ color: 'var(--glass-text-primary)' }}>
            {Math.round(avgValue).toLocaleString('ru-RU')}
          </div>
          <div className="text-xs" style={{ color: 'var(--glass-text-tertiary)' }}>
            Среднее
          </div>
        </div>
        <div className="p-3 rounded-lg" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
          <div className="text-sm font-medium" style={{ color: 'var(--glass-text-primary)' }}>
            {minValue.toLocaleString('ru-RU')}
          </div>
          <div className="text-xs" style={{ color: 'var(--glass-text-tertiary)' }}>
            Минимум
          </div>
        </div>
      </div>
    </div>
  )
}