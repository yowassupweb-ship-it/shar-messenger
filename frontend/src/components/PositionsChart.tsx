'use client';

import React, { useMemo } from 'react';

interface DayStats {
  date: string;
  top3: number;
  top10: number;
  top30: number;
  top100: number;
  notRanked: number;
  total: number;
}

interface PositionsChartProps {
  positions: {
    keyword_id: number;
    positions: { date: string; position: number | null }[];
  }[];
  height?: number;
  className?: string;
}

/**
 * Улучшенный график распределения позиций по датам
 */
export default function PositionsChart({
  positions,
  height = 160,
  className = ''
}: PositionsChartProps) {
  // Агрегируем данные по датам
  const chartData = useMemo(() => {
    const dateMap = new Map<string, DayStats>();
    
    positions.forEach(keyword => {
      keyword.positions.forEach(pos => {
        if (!dateMap.has(pos.date)) {
          dateMap.set(pos.date, {
            date: pos.date,
            top3: 0,
            top10: 0,
            top30: 0,
            top100: 0,
            notRanked: 0,
            total: 0
          });
        }
        
        const stats = dateMap.get(pos.date)!;
        stats.total++;
        
        if (pos.position === null) {
          stats.notRanked++;
        } else if (pos.position <= 3) {
          stats.top3++;
        } else if (pos.position <= 10) {
          stats.top10++;
        } else if (pos.position <= 30) {
          stats.top30++;
        } else if (pos.position <= 100) {
          stats.top100++;
        } else {
          stats.notRanked++;
        }
      });
    });
    
    return Array.from(dateMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [positions]);
  
  if (chartData.length < 2) {
    return (
      <div className={`flex items-center justify-center text-white/30 text-sm ${className}`} style={{ height }}>
        Недостаточно данных для графика (нужно минимум 2 даты)
      </div>
    );
  }

  const colors = {
    top3: '#34d399',
    top10: '#22d3ee',
    top30: '#fbbf24',
    top100: '#fb923c',
  };

  const maxValue = Math.max(...chartData.map(d => d.total));
  const padding = { top: 20, right: 16, bottom: 32, left: 40 };
  const chartWidth = 400;
  const chartHeight = height;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const getX = (i: number) => padding.left + (i / (chartData.length - 1)) * innerWidth;
  const getY = (value: number) => padding.top + innerHeight - (value / maxValue) * innerHeight;

  // Создаём линии для каждой метрики
  const createLine = (getValue: (d: DayStats) => number) => {
    return chartData.map((d, i) => {
      const x = getX(i);
      const y = getY(getValue(d));
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  // Создаём area для заливки под линией
  const createArea = (getValue: (d: DayStats) => number) => {
    const line = chartData.map((d, i) => {
      const x = getX(i);
      const y = getY(getValue(d));
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    const lastX = getX(chartData.length - 1);
    const firstX = getX(0);
    const bottomY = padding.top + innerHeight;
    
    return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  // Накопительные значения для stacked view
  const lines = {
    top3: createLine(d => d.top3),
    top10Stacked: createLine(d => d.top3 + d.top10),
    top30Stacked: createLine(d => d.top3 + d.top10 + d.top30),
    top100Stacked: createLine(d => d.top3 + d.top10 + d.top30 + d.top100),
  };

  return (
    <div className={className}>
      {/* Легенда */}
      <div className="flex items-center justify-center gap-4 mb-2 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.top3 }} />
          <span className="text-white/50">TOP-3</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.top10 }} />
          <span className="text-white/50">TOP-10</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.top30 }} />
          <span className="text-white/50">TOP-30</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.top100 }} />
          <span className="text-white/50">TOP-100</span>
        </span>
      </div>

      <svg 
        width="100%" 
        height={height}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="grad-top3" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.top3} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.top3} stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="grad-top10" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.top10} stopOpacity="0.25" />
            <stop offset="100%" stopColor={colors.top10} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Горизонтальные линии сетки */}
        {[0.25, 0.5, 0.75].map((ratio, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={padding.top + innerHeight * ratio}
            x2={padding.left + innerWidth}
            y2={padding.top + innerHeight * ratio}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="3,5"
          />
        ))}

        {/* Заливка TOP-10 (суммарная) */}
        <path
          d={createArea(d => d.top3 + d.top10)}
          fill="url(#grad-top10)"
        />

        {/* Заливка TOP-3 */}
        <path
          d={createArea(d => d.top3)}
          fill="url(#grad-top3)"
        />

        {/* Линия TOP-100 (накопительная) */}
        <path
          d={lines.top100Stacked}
          fill="none"
          stroke={colors.top100}
          strokeWidth="1.5"
          strokeOpacity="0.5"
        />

        {/* Линия TOP-30 (накопительная) */}
        <path
          d={lines.top30Stacked}
          fill="none"
          stroke={colors.top30}
          strokeWidth="1.5"
          strokeOpacity="0.6"
        />

        {/* Линия TOP-10 (накопительная) */}
        <path
          d={lines.top10Stacked}
          fill="none"
          stroke={colors.top10}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Линия TOP-3 */}
        <path
          d={lines.top3}
          fill="none"
          stroke={colors.top3}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Точки данных */}
        {chartData.map((d, i) => (
          <g key={d.date}>
            {/* TOP-3 точка */}
            <circle
              cx={getX(i)}
              cy={getY(d.top3)}
              r="3"
              fill={colors.top3}
            />
            {/* TOP-10 точка */}
            <circle
              cx={getX(i)}
              cy={getY(d.top3 + d.top10)}
              r="2.5"
              fill={colors.top10}
            />
          </g>
        ))}

        {/* Ось Y - значения */}
        <text
          x={padding.left - 6}
          y={padding.top + 4}
          textAnchor="end"
          className="fill-white/30 text-[9px]"
        >
          {maxValue}
        </text>
        <text
          x={padding.left - 6}
          y={padding.top + innerHeight / 2 + 3}
          textAnchor="end"
          className="fill-white/20 text-[9px]"
        >
          {Math.round(maxValue / 2)}
        </text>
        <text
          x={padding.left - 6}
          y={padding.top + innerHeight + 3}
          textAnchor="end"
          className="fill-white/20 text-[9px]"
        >
          0
        </text>

        {/* Ось X - даты */}
        {chartData.map((d, i) => {
          // Показываем каждую дату если их мало, иначе прореживаем
          const showEvery = chartData.length <= 7 ? 1 : Math.ceil(chartData.length / 5);
          if (i % showEvery !== 0 && i !== chartData.length - 1) return null;
          
          return (
            <text
              key={d.date}
              x={getX(i)}
              y={chartHeight - 8}
              textAnchor="middle"
              className="fill-white/40 text-[9px]"
            >
              {new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </text>
          );
        })}
      </svg>

      {/* Статистика под графиком */}
      <div className="flex items-center justify-center gap-6 mt-2 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="text-white/40">Всего дат:</span>
          <span className="text-white/70 font-medium">{chartData.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-white/40">Сейчас TOP-10:</span>
          <span className="text-cyan-400 font-medium">
            {chartData.length > 0 ? chartData[chartData.length - 1].top3 + chartData[chartData.length - 1].top10 : 0}
          </span>
        </div>
        {chartData.length >= 2 && (
          <div className="flex items-center gap-1.5">
            <span className="text-white/40">Было:</span>
            <span className="text-white/50 font-medium">
              {chartData[0].top3 + chartData[0].top10}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
