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
  Globe,
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
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  React.useEffect(() => {
    if (searchQuery) {
      setIsSearchOpen(true);
    }
  }, [searchQuery]);

  return (
    <>
      {/* View Mode Toggle */}
      <div className="flex items-center p-1 h-10 bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border border-[var(--border-light)] rounded-[20px] shadow-[var(--shadow-card)] backdrop-blur-xl mr-2 sm:mr-3">
        <button
          onClick={() => setViewMode('columns')}
          className={`w-8 h-8 rounded-[14px] flex items-center justify-center transition-all ${
            viewMode === 'columns' 
              ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' 
              : 'text-[var(--text-muted)] hover:bg-[var(--bg-glass-hover)]'
          }`}
          title="Колонки"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`w-8 h-8 rounded-[14px] flex items-center justify-center transition-all ${
            viewMode === 'calendar' 
              ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' 
              : 'text-[var(--text-muted)] hover:bg-[var(--bg-glass-hover)]'
          }`}
          title="Календарь"
        >
          <CalendarDays className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation - depends on view mode */}
      {viewMode === 'columns' ? (
        <>
          <div className="hidden sm:flex items-center gap-2 mr-3 p-1 h-10 bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border border-[var(--border-light)] rounded-[20px] shadow-[var(--shadow-card)] backdrop-blur-xl">
            <button
              onClick={handleGoToPreviousWeek}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border border-[var(--border-light)] shadow-[var(--shadow-card)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoToCurrentWeek}
              className="px-3 h-8 text-xs font-medium rounded-[14px] bg-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500/30 transition-colors"
            >
              Сегодня
            </button>
            <button
              onClick={handleGoToNextWeek}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border border-[var(--border-light)] shadow-[var(--shadow-card)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="hidden lg:inline text-sm text-[var(--text-muted)]">
            {weekDays[0].toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} — {weekDays[6].toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </>
      ) : (
        <>
          <div className="hidden sm:flex items-center gap-2 mr-3 p-1 h-10 bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border border-[var(--border-light)] rounded-[20px] shadow-[var(--shadow-card)] backdrop-blur-xl">
            <button
              onClick={handleGoToPreviousMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border border-[var(--border-light)] shadow-[var(--shadow-card)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoToCurrentMonth}
              className="px-3 h-8 text-xs font-medium rounded-[14px] bg-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500/30 transition-colors"
            >
              Сегодня
            </button>
            <button
              onClick={handleGoToNextMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border border-[var(--border-light)] shadow-[var(--shadow-card)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="hidden lg:inline text-sm text-[var(--text-muted)]">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
        </>
      )}

      <div className="flex-1" />

      {/* Platform Filters */}
      <div className="relative mr-2 sm:mr-3" data-filter-menu>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 h-10 rounded-[20px] transition-all border backdrop-blur-xl ${
            selectedPlatformFilters.length > 0 
              ? 'bg-purple-500/20 border border-purple-500/30 text-purple-600 dark:text-purple-400' 
              : 'bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border-[var(--border-light)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] text-[var(--text-primary)] shadow-[var(--shadow-card)]'
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
                    {platform === 'mailing' ? (
                      <Mail className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    ) : platform === 'site' ? (
                      <Globe className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    ) : config.icon ? (
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
      <div className="relative mr-2 sm:mr-3 hidden sm:flex items-center">
        {isSearchOpen ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10 pointer-events-none text-[var(--text-primary)]" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={() => {
                if (!searchQuery.trim()) {
                  setIsSearchOpen(false);
                }
              }}
              className="pl-9 pr-4 h-10 bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border border-[var(--border-light)] rounded-[20px] w-40 text-sm focus:outline-none focus:border-[var(--border-primary)] transition-colors shadow-[var(--shadow-card)] backdrop-blur-xl"
              autoFocus
            />
          </div>
        ) : (
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-10 h-10 rounded-[20px] flex items-center justify-center bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border border-[var(--border-light)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] text-[var(--text-primary)] shadow-[var(--shadow-card)] backdrop-blur-xl transition-all"
            title="Поиск"
          >
            <Search className="w-4 h-4" />
          </button>
        )}
      </div>
    </>
  );
}
