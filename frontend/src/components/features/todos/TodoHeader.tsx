'use client';

import { Search, ChevronLeft, ChevronRight, MoreVertical, Filter, User, ChevronDown, Archive } from 'lucide-react';
import { Mobileheadermenu, Statusdropdown, Executordropdown } from '@/components/features/todos-auto';

interface Person {
  id: string;
  name: string;
  role: 'executor' | 'customer' | 'universal';
}

interface TodoHeaderProps {
  // Mobile navigation
  selectedColumnIndex: number;
  nonArchivedListsLength: number;
  setSelectedColumnIndex: (index: number) => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Mobile menu
  mobileHeaderMenuOpen: boolean;
  setMobileHeaderMenuOpen: (open: boolean) => void;
  setShowMobileFiltersModal: (show: boolean) => void;
  setShowMobileArchiveModal: (show: boolean) => void;
  setShowAddList: (show: boolean) => void;
  
  // Filters
  filterStatus: 'all' | 'todo' | 'pending' | 'in-progress' | 'review' | 'stuck';
  setFilterStatus: React.Dispatch<React.SetStateAction<'all' | 'todo' | 'pending' | 'in-progress' | 'review' | 'stuck'>>;
  statusDropdownOpen: boolean;
  setStatusDropdownOpen: (open: boolean) => void;
  
  filterExecutor: string | null;
  setFilterExecutor: (id: string | null) => void;
  executorDropdownOpen: boolean;
  setExecutorDropdownOpen: (open: boolean) => void;
  people: Person[];
  
  // Archive
  showArchive: boolean;
  setShowArchive: (show: boolean) => void;
}

export default function TodoHeader({
  selectedColumnIndex,
  nonArchivedListsLength,
  setSelectedColumnIndex,
  searchQuery,
  setSearchQuery,
  mobileHeaderMenuOpen,
  setMobileHeaderMenuOpen,
  setShowMobileFiltersModal,
  setShowMobileArchiveModal,
  setShowAddList,
  filterStatus,
  setFilterStatus,
  statusDropdownOpen,
  setStatusDropdownOpen,
  filterExecutor,
  setFilterExecutor,
  executorDropdownOpen,
  setExecutorDropdownOpen,
  people,
  showArchive,
  setShowArchive,
}: TodoHeaderProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 w-full px-3 py-2 flex-shrink-0">
      {/* Mobile header - all in one line */}
      <div className="flex items-center gap-2 w-full md:hidden">
        {/* Левая стрелка */}
        <button
          onClick={() => {
            if (selectedColumnIndex > 0) {
              setSelectedColumnIndex(selectedColumnIndex - 1);
            }
          }}
          disabled={selectedColumnIndex === 0}
          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            selectedColumnIndex === 0
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed bg-gray-200/10 dark:bg-white/5 border border-white/10'
              : 'text-[var(--text-primary)] bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_3px_8px_rgba(0,0,0,0.15)] active:scale-95 backdrop-blur-xl'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-primary)] flex items-center justify-center z-10 pointer-events-none">
            <Search className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 border border-white/20 rounded-[20px] text-xs focus:outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-white/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-xl"
          />
        </div>

        {/* More menu dropdown */}
        <div className="relative">
          <button
            onClick={() => setMobileHeaderMenuOpen(!mobileHeaderMenuOpen)}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 rounded-[20px] transition-all duration-200 border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-xl"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          <Mobileheadermenu
            isOpen={mobileHeaderMenuOpen}
            onClose={() => setMobileHeaderMenuOpen(false)}
            setShowMobileFiltersModal={setShowMobileFiltersModal}
            setShowMobileArchiveModal={setShowMobileArchiveModal}
            setShowAddList={setShowAddList}
          />
        </div>

        {/* Правая стрелка */}
        <button
          onClick={() => {
            if (selectedColumnIndex < nonArchivedListsLength - 1) {
              setSelectedColumnIndex(selectedColumnIndex + 1);
            }
          }}
          disabled={selectedColumnIndex >= nonArchivedListsLength - 1}
          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            selectedColumnIndex >= nonArchivedListsLength - 1
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed bg-gray-200/10 dark:bg-white/5 border border-white/10'
              : 'text-[var(--text-primary)] bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_3px_8px_rgba(0,0,0,0.15)] active:scale-95 backdrop-blur-xl'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex items-center justify-center gap-2 whitespace-nowrap">
        {/* Search */}
        <div className="relative flex-none">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-primary)] flex items-center justify-center z-10 pointer-events-none">
            <Search className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[200px] h-10 pl-10 pr-3 bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 border border-white/20 rounded-[20px] text-sm focus:outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-white/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-xl"
          />
        </div>

        {/* Status Filter */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            className="flex items-center gap-1.5 px-3 h-10 bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 rounded-[20px] transition-all duration-200 text-sm border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_3px_8px_rgba(0,0,0,0.15)] backdrop-blur-xl"
          >
            <Filter className="w-4 h-4 flex-shrink-0" />
            <span className="truncate max-w-[120px]">{filterStatus === 'all' ? 'Все' : filterStatus === 'todo' ? 'К выполнению' : filterStatus === 'pending' ? 'В ожидании' : filterStatus === 'in-progress' ? 'В работе' : filterStatus === 'review' ? 'Готово к проверке' : 'Застряла'}</span>
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
          </button>
          <Statusdropdown
            isOpen={statusDropdownOpen}
            onClose={() => setStatusDropdownOpen(false)}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
          />
        </div>

        {/* Executor Filter */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setExecutorDropdownOpen(!executorDropdownOpen)}
            className="flex items-center gap-1.5 px-3 h-10 bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 rounded-[20px] transition-all duration-200 text-sm border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_3px_8px_rgba(0,0,0,0.15)] backdrop-blur-xl"
          >
            <User className="w-4 h-4 flex-shrink-0" />
            <span className="truncate max-w-[100px]">{filterExecutor ? people.find(p => p.id === filterExecutor)?.name || 'Все' : 'Все'}</span>
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
          </button>
          <Executordropdown
            isOpen={executorDropdownOpen}
            onClose={() => setExecutorDropdownOpen(false)}
            people={people}
            filterExecutor={filterExecutor}
            setFilterExecutor={setFilterExecutor}
          />
        </div>

        {/* Archive Toggle */}
        <button
          onClick={() => setShowArchive(!showArchive)}
          className={`hidden md:flex w-10 h-10 items-center justify-center rounded-[20px] transition-all duration-200 border flex-shrink-0 backdrop-blur-xl ${
            showArchive
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[inset_0_1px_2px_rgba(96,165,250,0.4),0_3px_8px_rgba(59,130,246,0.2)]'
              : 'bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_3px_8px_rgba(0,0,0,0.15)]'
          }`}
          title={showArchive ? 'Скрыть архив' : 'Показать архив'}
        >
          <Archive className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
