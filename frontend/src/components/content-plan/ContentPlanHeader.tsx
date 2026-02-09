'use client';

import React from 'react';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  CalendarDays,
  Filter,
  ChevronDown,
  Check,
  Mail,
  Search
} from 'lucide-react';
import { PLATFORM_CONFIG, MONTHS } from '@/constants/contentPlanConfig';
import type { Platform, ViewMode } from '@/types/contentPlan';

interface ContentPlanHeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  currentWeekStart: Date;
  weekDays: Date[];
  currentMonth: Date;
  selectedPlatformFilters: Platform[];
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  platforms: Platform[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  togglePlatformFilter: (platform: Platform) => void;
  setSelectedPlatformFilters: (filters: Platform[]) => void;
  handleGoToPreviousWeek: () => void;
  handleGoToCurrentWeek: () => void;
  handleGoToNextWeek: () => void;
  handleGoToPreviousMonth: () => void;
  handleGoToCurrentMonth: () => void;
  handleGoToNextMonth: () => void;
}

const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function ContentPlanHeader({
  viewMode,
  setViewMode,
  currentWeekStart,
  weekDays,
  currentMonth,
  selectedPlatformFilters,
  showFilters,
  setShowFilters,
  platforms,
  searchQuery,
  setSearchQuery,
  togglePlatformFilter,
  setSelectedPlatformFilters,
  handleGoToPreviousWeek,
  handleGoToCurrentWeek,
  handleGoToNextWeek,
  handleGoToPreviousMonth,
  handleGoToCurrentMonth,
  handleGoToNextMonth
}: ContentPlanHeaderProps) {
  return (
    <>
      {/* View Mode Toggle */}
      <div className="flex items-center bg-gray-200 dark:bg-white/5 rounded-lg p-0.5 mr-2 sm:mr-4">
        <button
          onClick={() => setViewMode('columns')}
          className={`p-1.5 sm:p-2 rounded-md transition-all ${
            viewMode === 'columns' 
              ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' 
              : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70'
          }`}
          title="Колонки"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`p-1.5 sm:p-2 rounded-md transition-all ${
            viewMode === 'calendar' 
              ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' 
              : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70'
          }`}
          title="Календарь"
        >
          <CalendarDays className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation - depends on view mode */}
      {viewMode === 'columns' ? (
        <>
          <div className="hidden sm:flex items-center gap-2 mr-4 bg-gray-200 dark:bg-white/5 rounded-xl p-1">
            <button
              onClick={handleGoToPreviousWeek}
              className="p-2 hover:bg-gray-300 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoToCurrentWeek}
              className="px-4 py-1.5 text-xs font-medium bg-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500/30 rounded-lg transition-colors"
            >
              Сегодня
            </button>
            <button
              onClick={handleGoToNextWeek}
              className="p-2 hover:bg-gray-300 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="hidden lg:inline text-sm text-gray-500 dark:text-white/60">
            {weekDays[0].toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} — {weekDays[6].toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </>
      ) : (
        <>
          <div className="hidden sm:flex items-center gap-2 mr-4 bg-gray-200 dark:bg-white/5 rounded-xl p-1">
            <button
              onClick={handleGoToPreviousMonth}
              className="p-2 hover:bg-gray-300 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoToCurrentMonth}
              className="px-4 py-1.5 text-xs font-medium bg-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500/30 rounded-lg transition-colors"
            >
              Сегодня
            </button>
            <button
              onClick={handleGoToNextMonth}
              className="p-2 hover:bg-gray-300 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="hidden lg:inline text-sm text-gray-500 dark:text-white/60">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
        </>
      )}

      <div className="flex-1" />

      {/* Platform Filters */}
      <div className="relative mr-2 sm:mr-3" data-filter-menu>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg transition-all ${
            selectedPlatformFilters.length > 0 
              ? 'bg-purple-500/20 border border-purple-500/30 text-purple-600 dark:text-purple-400' 
              : 'bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-600 dark:text-white/70'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span className="text-xs font-medium hidden sm:inline">Каналы</span>
          {selectedPlatformFilters.length > 0 && (
            <span className="text-[10px] bg-purple-500 text-white px-1.5 rounded-full">
              {selectedPlatformFilters.length}
            </span>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform hidden sm:block ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        
        {showFilters && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-50 py-1">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-white/50">Фильтр по каналам</span>
              {selectedPlatformFilters.length > 0 && (
                <button
                  onClick={() => setSelectedPlatformFilters([])}
                  className="text-[10px] text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300"
                >
                  Сбросить
                </button>
              )}
            </div>
            {platforms.map(platform => {
              const config = PLATFORM_CONFIG[platform];
              const isSelected = selectedPlatformFilters.includes(platform);
              return (
                <button
                  key={platform}
                  onClick={() => togglePlatformFilter(platform)}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors ${
                    isSelected ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-white/5' : 'text-gray-600 dark:text-white/70'
                  }`}
                >
                  <div className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${config.iconBg ? 'bg-white rounded-full p-0.5' : ''}`}>
                    {config.icon ? (
                      <Image src={config.icon} alt={config.name} width={16} height={16} className="w-4 h-4 object-contain" />
                    ) : (
                      <Mail className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    )}
                  </div>
                  <span className="flex-1">{config.name}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative mr-2 sm:mr-3 hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/30" />
        <input
          type="text"
          placeholder="Поиск..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-4 py-1.5 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg w-40 text-sm focus:outline-none focus:border-gray-400 dark:focus:border-white/20 transition-colors"
        />
      </div>
    </>
  );
}
