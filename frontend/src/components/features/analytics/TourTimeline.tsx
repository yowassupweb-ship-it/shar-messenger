'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, DollarSign, Clock, Filter, Calendar, Search, X, Download, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api'

export interface TimelineTour {
  tourId: number;
  tourName: string;
  days: number;
  price: number;
  currency: string;
  date: string | null;
  dateFormatted: string;
  source: string;
  sourceId: string;
  sourceName: string;
  image?: string;
  route: string[];
}

interface TimelineData {
  items: TimelineTour[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface LoadingMode {
  type: 'range' | 'all' | null;
  dateFrom?: string;
  dateTo?: string;
}

interface TourTimelineProps {}

export default function TourTimeline({}: TourTimelineProps) {
  const [tours, setTours] = useState<TimelineTour[]>([]);
  const [allTours, setAllTours] = useState<TimelineTour[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<LoadingMode>({ type: null });
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [daysFilter, setDaysFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTour, setSelectedTour] = useState<TimelineTour | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  const loadTours = useCallback(async (mode: LoadingMode) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiFetch(`/api/competitors/timeline?limit=10000&offset=0`);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }
      
      const data = await response.json();
      
      // API returns { items: [...] } or { own: [...], competitors: [...] }
      let loadedTours: TimelineTour[] = [];
      
      if (data.items && Array.isArray(data.items)) {
        loadedTours = data.items;
      } else {
        // Handle alternative format
        const ownTours = Array.isArray(data.own) ? data.own : [];
        const competitorTours = Array.isArray(data.competitors) ? data.competitors : [];
        loadedTours = [...ownTours, ...competitorTours];
      }
      
      if (mode.type === 'range' && mode.dateFrom && mode.dateTo) {
        const fromDate = new Date(mode.dateFrom);
        const toDate = new Date(mode.dateTo);
        loadedTours = loadedTours.filter(tour => {
          if (!tour.date) return false;
          const tourDate = new Date(tour.date.split('T')[0]);
          return tourDate >= fromDate && tourDate <= toDate;
        });
      }
      
      setAllTours(loadedTours);
      setTours(loadedTours);
      setLoadingMode({ type: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let filtered = [...allTours];
    
    if (searchQuery) {
      filtered = filtered.filter(tour => 
        tour.tourName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tour.route.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(tour => tour.source === sourceFilter);
    }
    
    if (daysFilter !== 'all') {
      filtered = filtered.filter(tour => tour.days.toString() === daysFilter);
    }
    
    if (dateFromFilter && dateToFilter) {
      filtered = filtered.filter(tour => {
        if (!tour.date) return false;
        const tourDate = tour.date.split('T')[0];
        return tourDate >= dateFromFilter && tourDate <= dateToFilter;
      });
    }
    
    setTours(filtered);
  }, [allTours, searchQuery, sourceFilter, daysFilter, dateFromFilter, dateToFilter]);

  const uniqueSources = Array.from(new Set(allTours.map(t => t.source)));
  const uniqueDays = Array.from(new Set(allTours.map(t => t.days))).sort((a, b) => a - b);

  const handleLoadMode = (mode: 'range' | 'all', dateFrom?: string, dateTo?: string) => {
    setLoadingMode({ type: mode, dateFrom, dateTo });
    loadTours({ type: mode, dateFrom, dateTo });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSourceFilter('all');
    setDaysFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
  };

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'magput':
        return { label: 'Magput', color: 'bg-[#f15d22] text-[#0064b1]' };
      case 'vs-travel':
        return { label: 'VS-Travel', color: 'bg-[var(--secondary)] text-[var(--secondary-foreground)]' };
      case 'own':
        return { label: 'Наши', color: 'bg-[#32CD32] text-white' };
      default:
        return { label: 'Другое', color: 'bg-gray-500 text-white' };
    }
  };



  // Loading mode selection
  if (loadingMode.type === null && !allTours.length) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="space-y-4">
          {/* Date Range Option */}
          <div className="card">
            <h3 className="font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--button)]" />
              Загрузить ведомости за период
            </h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">Дата начала</label>
                <input
                  type="date"
                  value={loadingMode.dateFrom || ''}
                  onChange={(e) => setLoadingMode(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">Дата окончания</label>
                <input
                  type="date"
                  value={loadingMode.dateTo || ''}
                  onChange={(e) => setLoadingMode(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                />
              </div>
            </div>
            <button
              onClick={() => handleLoadMode('range', loadingMode.dateFrom, loadingMode.dateTo)}
              disabled={!loadingMode.dateFrom || !loadingMode.dateTo}
              className="w-full bg-[var(--button)] text-[var(--button-text)] py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-all"
            >
              Загрузить за период
            </button>
          </div>
          
          {/* All Data Option */}
          <div className="card">
            <h3 className="font-semibold text-[var(--foreground)] mb-2 flex items-center gap-2">
              <Download className="w-5 h-5 text-[var(--button)]" />
              Загрузить все ведомости
            </h3>
            <p className="text-sm text-[var(--muted)] mb-4">Загрузка всех данных может занять некоторое время</p>
            <button
              onClick={() => handleLoadMode('all')}
              className="w-full border border-[var(--button)] text-[var(--button)] py-2.5 rounded-lg font-medium hover:bg-[var(--button)] hover:text-[var(--button-text)] transition-all"
            >
              Загрузить все
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--button)] mb-4" />
        <div className="text-center">
          <div className="font-semibold text-[var(--foreground)]">Загружаем ведомости...</div>
          <div className="text-sm text-[var(--muted)] mt-1">Пожалуйста, подождите</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={() => setLoadingMode({ type: null })}
          className="px-6 py-2 bg-[var(--button)] text-[var(--button-text)] rounded-lg hover:opacity-80 transition-all"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  // Группируем туры по датам
  const groupedByDate = tours.reduce((acc: Record<string, TimelineTour[]>, tour: TimelineTour) => {
    const date = tour.date || 'no-date';
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(tour);
    return acc;
  }, {} as Record<string, TimelineTour[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    if (a === 'no-date') return 1;
    if (b === 'no-date') return -1;
    return a.localeCompare(b);
  });

  // Пагинация по датам
  const totalPages = Math.ceil(sortedDates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDates = sortedDates.slice(startIndex, endIndex);

  return (
    <div className="w-full">
      {/* Filters Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="text-lg font-semibold text-[var(--foreground)]">
            {tours.length} ведомостей
            {allTours.length > tours.length && (
              <span className="text-sm text-[var(--muted)] ml-2">
                из {allTours.length}
              </span>
            )}
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
              showFilters 
                ? 'bg-[var(--button)] text-[var(--button-text)] border-[var(--button)]' 
                : 'border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--hover)]'
            }`}
          >
            <Filter className="w-4 h-4" />
            Фильтры
          </button>
        </div>
        
        <button
          onClick={() => setLoadingMode({ type: null })}
          className="text-sm text-[var(--button)] hover:text-[var(--foreground)] transition-colors"
        >
          Изменить период
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-xs text-[var(--muted)] mb-1">Поиск по названию</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder="Название тура или город..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
                />
              </div>
            </div>

            {/* Source filter */}
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Источник</label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
              >
                <option value="all">Все источники</option>
                {uniqueSources.map(source => (
                  <option key={source} value={source}>
                    {source === 'magput' ? 'Magput.ru' : 
                     source === 'vs-travel' ? 'VS-Travel' : 
                     source === 'own' ? 'Наши туры' : source}
                  </option>
                ))}
              </select>
            </div>

            {/* Days filter */}
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Дни</label>
              <select
                value={daysFilter}
                onChange={(e) => setDaysFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
              >
                <option value="all">Все дни</option>
                {uniqueDays.map(days => (
                  <option key={days} value={days.toString()}>
                    {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded-lg hover:bg-[var(--hover)] transition-colors"
              >
                <X className="w-3 h-3" />
                Сбросить
              </button>
            </div>
          </div>

          {/* Date range filter */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Фильтр: с даты</label>
              <input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Фильтр: по дату</label>
              <input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--button)]"
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="relative">
        {/* Modern timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--border)]"></div>

        {paginatedDates.map((dateKey: string, index: number) => {
          const toursOnDate = groupedByDate[dateKey];
          const firstTour = toursOnDate[0];
          const dateDisplay = dateKey === 'no-date' ? 'Дата не указана' : firstTour.dateFormatted;

          return (
            <div key={dateKey} className="mb-8 relative">
              {/* Modern date marker */}
              <div className="flex items-center mb-4 relative">
                <div className="relative z-10 w-3 h-3 rounded-full bg-[var(--button)] ring-4 ring-[var(--background)]">
                </div>
                
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
                    {dateDisplay}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                    <span>{toursOnDate.length} {toursOnDate.length === 1 ? 'ведомость' : toursOnDate.length < 5 ? 'ведомости' : 'ведомостей'}</span>
                    <span>•</span>
                    <span>от {Math.min(...toursOnDate.map((t: TimelineTour) => t.price)).toLocaleString('ru-RU')} ₽</span>
                    <span>•</span>
                    <span>{Math.min(...toursOnDate.map((t: TimelineTour) => t.days))}-{Math.max(...toursOnDate.map((t: TimelineTour) => t.days))} дн.</span>
                  </div>
                </div>
              </div>

              {/* Tour cards - compact single row */}
              <div className="ml-6 space-y-1">
                {toursOnDate.map((tour: TimelineTour, tourIndex: number) => (
                  <div
                    key={`${tour.tourId}-${tourIndex}`}
                    className="relative card cursor-pointer p-2 hover:border-[var(--button)] transition-all"
                    onClick={() => setSelectedTour(tour)}
                  >
                    <div className="grid grid-cols-[50px_80px_0.9fr_1fr_100px] gap-2 text-xs items-center">
                      {/* Days */}
                      <div className="flex items-center gap-1 text-[var(--button)] font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{tour.days}д</span>
                      </div>

                      {/* Source */}
                      <div className={`px-1.5 py-0.5 rounded text-xs font-medium text-center ${getSourceBadge(tour.source).color}`}>
                        {getSourceBadge(tour.source).label}
                      </div>

                      {/* Tour name */}
                      <div className="font-medium text-[var(--foreground)] truncate pr-2">
                        {tour.tourName.length > 60 ? tour.tourName.substring(0, 60) + '...' : tour.tourName}
                      </div>

                      {/* Route */}
                      <div className="flex items-center gap-1 text-[var(--muted)]">
                        {tour.route && tour.route.length > 0 && (
                          <>
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">
                              {tour.route.slice(0, 2).join(' → ')}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Price */}
                      <div className="text-[var(--button)] font-semibold text-right">
                        {tour.price.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8 mb-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Назад
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-lg border transition-colors ${
                    currentPage === pageNum
                      ? 'bg-[var(--button)] text-[var(--button-text)] border-[var(--button)]'
                      : 'border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--hover)]'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Вперёд
          </button>
          
          <span className="ml-4 text-sm text-[var(--muted)]">
            Страница {currentPage} из {totalPages}
          </span>
        </div>
      )}
      
      {/* Tour Detail Modal */}
      {selectedTour && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedTour(null)}>
          <div className="card max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-[var(--foreground)]">{selectedTour.tourName}</h2>
              <button
                onClick={() => setSelectedTour(null)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--button)]" />
                  <span className="text-sm text-[var(--muted)]">Длительность:</span>
                  <span className="font-semibold">{selectedTour.days} {selectedTour.days === 1 ? 'день' : selectedTour.days < 5 ? 'дня' : 'дней'}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[var(--button)]" />
                  <span className="text-sm text-[var(--muted)]">Цена:</span>
                  <span className="font-semibold text-lg text-[var(--button)]">{selectedTour.price.toLocaleString('ru-RU')} ₽</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--muted)]">Источник:</span>
                  <div className={`px-2 py-1 rounded text-sm font-medium ${getSourceBadge(selectedTour.source).color}`}>
                    {getSourceBadge(selectedTour.source).label}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--button)]" />
                  <span className="text-sm text-[var(--muted)]">Дата:</span>
                  <span className="font-semibold">{selectedTour.dateFormatted}</span>
                </div>
              </div>
              
              {/* Route Info */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-[var(--button)]" />
                  <span className="text-sm text-[var(--muted)]">Маршрут:</span>
                </div>
                {selectedTour.route && selectedTour.route.length > 0 ? (
                  <div className="space-y-1">
                    {selectedTour.route.map((city, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <span className="w-6 h-6 bg-[var(--button)] text-[var(--button-text)] rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <span>{city}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[var(--muted)] text-sm">Маршрут не указан</span>
                )}
              </div>
            </div>
            
            {/* Additional Info */}
            <div className="mt-6 pt-4 border-t border-[var(--border)]">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[var(--muted)]">ID тура:</span>
                  <span className="ml-2 font-mono">{selectedTour.tourId}</span>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Валюта:</span>
                  <span className="ml-2">{selectedTour.currency}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedTour(null)}
                className="px-4 py-2 bg-[var(--button)] text-[var(--button-text)] rounded-lg hover:opacity-80 transition-opacity"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
