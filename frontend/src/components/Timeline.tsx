'use client';

import React from 'react';
import { Calendar, MapPin, Clock, Users, DollarSign, ExternalLink } from 'lucide-react';

export interface TimelineProgram {
  id: number;
  name: string;
  short?: string;
  priceMin: {
    brutto: number;
    currency: string;
  };
  duration: {
    days: number;
    hours: number;
  };
  route?: Array<{
    id: number;
    name: string;
  }>;
  dates?: Array<{
    date: string;
  }>;
  mainPhoto?: {
    url: string;
  };
  topicId?: number;
  source?: 'magput' | 'vs-travel' | 'own'; // Источник данных
  sourceUrl?: string; // URL источника для изображений
}

interface TimelineProps {
  programs: TimelineProgram[];
  title?: string;
  showSource?: boolean; // Показывать бейджи источников
}

export default function Timeline({ programs, title = 'Таймлайн туров', showSource = true }: TimelineProps) {
  // Группируем туры по количеству дней
  const groupedByDays = programs.reduce((acc, program) => {
    const days = program.duration.days;
    if (!acc[days]) {
      acc[days] = [];
    }
    acc[days].push(program);
    return acc;
  }, {} as Record<number, TimelineProgram[]>);

  const sortedDays = Object.keys(groupedByDays)
    .map(Number)
    .sort((a, b) => a - b);

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const formatPrice = (price: number, currency: string) => {
    return `${price.toLocaleString('ru-RU')} ${currency}`;
  };

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'magput':
        return { label: 'Magput.ru', color: 'bg-blue-500' };
      case 'vs-travel':
        return { label: 'VS-Travel', color: 'bg-purple-500' };
      case 'own':
        return { label: 'Наши туры', color: 'bg-green-500' };
      default:
        return { label: 'Неизвестно', color: 'bg-gray-500' };
    }
  };

  const getImageUrl = (program: TimelineProgram) => {
    if (!program.mainPhoto?.url) return null;
    
    if (program.source === 'magput') {
      return `https://magput.ru/${program.mainPhoto.url}`;
    } else if (program.source === 'vs-travel') {
      return program.mainPhoto.url; // Уже полный URL
    } else if (program.source === 'own') {
      return program.mainPhoto.url; // Локальный путь
    }
    return program.mainPhoto.url;
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-100">
        {title}
      </h2>
      
      <div className="relative">
        {/* Вертикальная линия timeline */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500"></div>

        {sortedDays.map((days, dayIndex) => (
          <div key={days} className="mb-12">
            {/* Заголовок группы (количество дней) */}
            <div className="flex items-center mb-6">
              <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <span className="text-white font-bold text-lg">{days}д</span>
              </div>
              <div className="ml-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                  {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  ({groupedByDays[days].length} {groupedByDays[days].length === 1 ? 'тур' : 'тура'})
                </span>
              </div>
            </div>

            {/* Туры в группе */}
            <div className="ml-16 space-y-4">
              {groupedByDays[days].map((program, programIndex) => (
                <div
                  key={program.id}
                  className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700"
                >
                  {/* Бейдж источника */}
                  {showSource && program.source && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className={`${getSourceBadge(program.source).color} text-white text-xs px-3 py-1 rounded-full font-medium shadow-md`}>
                        {getSourceBadge(program.source).label}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-4 p-6">
                    {/* Изображение */}
                    {program.mainPhoto?.url && (
                      <div className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden">
                        <img
                          src={getImageUrl(program) || '/placeholder-tour.jpg'}
                          alt={program.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-tour.jpg';
                          }}
                        />
                      </div>
                    )}

                    {/* Информация о туре */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 line-clamp-2">
                        {program.name}
                      </h3>

                      {program.short && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {stripHtml(program.short)}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm">
                        {/* Цена */}
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-semibold">
                            {formatPrice(program.priceMin.brutto, program.priceMin.currency)}
                          </span>
                        </div>

                        {/* Продолжительность */}
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>
                            {program.duration.days}д
                            {program.duration.hours > 0 && ` ${program.duration.hours}ч`}
                          </span>
                        </div>

                        {/* Маршрут */}
                        {program.route && program.route.length > 0 && (
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <MapPin className="w-4 h-4" />
                            <span className="line-clamp-1">
                              {program.route.map(r => r.name).join(' → ')}
                            </span>
                          </div>
                        )}

                        {/* Количество дат */}
                        {program.dates && program.dates.length > 0 && (
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>{program.dates.length} дат</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ID тура */}
                    <div className="flex-shrink-0 text-right">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        ID: {program.id}
                      </span>
                    </div>
                  </div>

                  {/* Индикатор при наведении */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Статистика */}
      <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {programs.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Всего туров
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {sortedDays.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Вариантов длительности
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">
              {Math.min(...programs.map(p => p.priceMin.brutto)).toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Минимальная цена
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
