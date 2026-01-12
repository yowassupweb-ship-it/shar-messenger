'use client';

import React, { useMemo } from 'react';

interface PositionSparklineProps {
  positions: { date: string; position: number | null }[];
  width?: number;
  height?: number;
  showDots?: boolean;
  className?: string;
}

/**
 * Мини-график динамики позиций
 * Чем ниже позиция (лучше) - тем выше точка на графике
 */
export default function PositionSparkline({
  positions,
  width = 80,
  height = 24,
  showDots = true,
  className = ''
}: PositionSparklineProps) {
  // Фильтруем null позиции и сортируем по дате (от старых к новым)
  const validPositions = useMemo(() => 
    positions
      .filter(p => p.position !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [positions]
  );
  
  // Уникальный ID для градиента
  const gradientId = useMemo(() => 
    `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`,
    []
  );
  
  if (validPositions.length < 2) {
    return (
      <div 
        className={`flex items-center justify-center text-white/15 text-[10px] ${className}`}
        style={{ width, height }}
      >
        —
      </div>
    );
  }
  
  // Находим min/max для масштабирования
  const posValues = validPositions.map(p => p.position as number);
  const minPos = Math.min(...posValues);
  const maxPos = Math.max(...posValues);
  const range = maxPos - minPos || 1; // Избегаем деления на 0
  
  // Паддинг для точек
  const padding = 5;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  // Генерируем точки
  const points = validPositions.map((p, i) => {
    const x = padding + (i / (validPositions.length - 1)) * chartWidth;
    // Инвертируем Y, т.к. позиция 1 должна быть вверху
    const y = padding + ((p.position as number - minPos) / range) * chartHeight;
    return { x, y, position: p.position as number, date: p.date };
  });
  
  // Генерируем SVG path
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
  
  // Определяем цвет линии на основе тренда
  const firstPos = validPositions[0].position as number;
  const lastPos = validPositions[validPositions.length - 1].position as number;
  const trend = firstPos - lastPos; // Положительный = улучшение
  
  // Более насыщенные цвета
  const lineColor = trend > 0 
    ? '#34d399' // emerald-400
    : trend < 0 
      ? '#f87171' // red-400
      : '#64748b'; // slate-500
  
  const glowColor = trend > 0 
    ? 'rgba(52, 211, 153, 0.4)' 
    : trend < 0 
      ? 'rgba(248, 113, 113, 0.4)' 
      : 'rgba(100, 116, 139, 0.3)';
  
  return (
    <svg 
      width={width} 
      height={height} 
      className={`${className}`}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.4" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.05" />
        </linearGradient>
        <filter id={`glow-${gradientId}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Заливка под графиком */}
      <path
        d={`${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`}
        fill={`url(#${gradientId})`}
      />
      
      {/* Линия графика */}
      <path
        d={pathD}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Точки */}
      {showDots && points.length <= 14 && (
        <>
          {/* Первая точка */}
          <circle
            cx={points[0].x}
            cy={points[0].y}
            r="2"
            fill={lineColor}
            opacity="0.4"
          />
          {/* Последняя точка (текущая позиция) - с glow эффектом */}
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="4"
            fill={glowColor}
          />
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="2.5"
            fill={lineColor}
          />
        </>
      )}
    </svg>
  );
}
