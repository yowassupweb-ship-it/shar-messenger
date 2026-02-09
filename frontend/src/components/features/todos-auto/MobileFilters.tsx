'use client';

import React, { memo, Dispatch, SetStateAction } from 'react';
import { Check, Filter, Search, X } from 'lucide-react';
interface Person {
  id: string;
  name: string;
  username?: string;
  role: 'executor' | 'customer' | 'universal';
}
interface MobileFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  filterStatus: 'all' | 'todo' | 'pending' | 'in-progress' | 'review' | 'stuck';
  setFilterStatus: Dispatch<SetStateAction<'all' | 'todo' | 'pending' | 'in-progress' | 'review' | 'stuck'>>;
  filterExecutor: string | null;
  setFilterExecutor: Dispatch<SetStateAction<string | null>>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const MobileFilters = memo(function MobileFilters({
  isOpen,
  onClose,
  people,
  filterStatus,
  setFilterStatus,
  filterExecutor,
  setFilterExecutor,
  searchQuery,
  setSearchQuery
}: MobileFiltersProps) {
  if (!isOpen) return null;

  const resetFilters = () => {
    setFilterStatus('all');
    setFilterExecutor('all');
    setSearchQuery('');
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="bg-[var(--bg-tertiary)] w-full h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h3 className="font-semibold flex items-center gap-2 text-[var(--text-primary)]">
            <Filter className="w-5 h-5 text-cyan-400" />
            Фильтры
          </h3>
          <div className="flex items-center gap-2">
            {(filterStatus !== 'all' || filterExecutor !== 'all' || searchQuery) && (
              <button 
                onClick={resetFilters}
                className="text-xs text-[var(--text-muted)] hover:text-white transition-colors"
              >
                Сбросить
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-[var(--bg-glass)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>
        </div>
            
            <div className="p-4 space-y-6 overflow-y-auto">
              {/* Поиск */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Поиск</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по задачам..."
                    className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Статус */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Статус</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'all', label: 'Все статусы' }, 
                    { value: 'todo', label: 'К выполнению' }, 
                    { value: 'pending', label: 'В ожидании' }, 
                    { value: 'in-progress', label: 'В работе' }, 
                    { value: 'review', label: 'На проверке' }
                  ].map(status => (
                    <button
                      key={status.value}
                      onClick={() => setFilterStatus(status.value as any)}
                      className={`px-3 py-2 rounded-lg text-sm text-center transition-all border ${
                        filterStatus === status.value
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                          : 'bg-[var(--bg-glass)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-light)]'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Исполнитель */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Исполнитель</label>
                <div className="space-y-1 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                  <button
                    onClick={() => setFilterExecutor('all')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                      filterExecutor === 'all'
                        ? 'bg-green-500/20 text-green-300'
                        : 'hover:bg-[var(--bg-glass)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <span>Все исполнители</span>
                    {filterExecutor === 'all' && <Check className="w-4 h-4" />}
                  </button>
                  {people.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-[var(--text-muted)] bg-[var(--bg-secondary)] rounded-lg border border-dashed border-[var(--border-color)]">
                      Нет доступных исполнителей
                    </div>
                  ) : (
                    people.map(person => (
                      <button
                        key={person.id}
                        onClick={() => setFilterExecutor(person.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                          filterExecutor === person.id
                            ? 'bg-green-500/20 text-green-300'
                            : 'hover:bg-[var(--bg-glass)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <span>{person.name || person.username}</span>
                        {filterExecutor === person.id && <Check className="w-4 h-4" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
});

export default MobileFilters;
