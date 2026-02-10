'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/store';
import MainLayout from '@/components/MainLayout';

type FrequencyCategory = 'all' | 'high' | 'medium' | 'low';

// ВЧ: 10000+, СЧ: 2000-10000, НЧ: до 2000
const getCategory = (impressions: number | undefined): 'high' | 'medium' | 'low' => {
  if (!impressions) return 'low';
  if (impressions >= 10000) return 'high';
  if (impressions >= 2000) return 'medium';
  return 'low';
};

const getCategoryColor = (category: 'high' | 'medium' | 'low'): string => {
  switch (category) {
    case 'high': return 'text-orange-400'; // ВЧ - оранжевый
    case 'medium': return 'text-yellow-400'; // СЧ - желтый
    case 'low': return 'text-blue-400'; // НЧ - синий (холодный)
  }
};

const getCategoryBg = (category: 'high' | 'medium' | 'low'): string => {
  switch (category) {
    case 'high': return 'bg-orange-500/20';
    case 'medium': return 'bg-yellow-500/20';
    case 'low': return 'bg-blue-500/20';
  }
};

const getCategoryLabel = (category: 'high' | 'medium' | 'low'): string => {
  switch (category) {
    case 'high': return 'ВЧ';
    case 'medium': return 'СЧ';
    case 'low': return 'НЧ';
  }
};

export default function QueriesPage() {
  const { 
    queries, 
    selectedQueries, 
    toggleQuerySelection, 
    selectAllQueries,
    clearQuerySelection,
    removeQueries
  } = useStore();

  const [sortField, setSortField] = useState<'text' | 'impressions'>('impressions');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterText, setFilterText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FrequencyCategory>('all');
  const [minImpressions, setMinImpressions] = useState<number | ''>('');

  const filteredAndSorted = useMemo(() => {
    let filtered = queries;
    
    // Текстовый фильтр
    if (filterText) {
      const lower = filterText.toLowerCase();
      filtered = filtered.filter((q) => q.text.toLowerCase().includes(lower));
    }

    // Фильтр по минимальным показам
    if (minImpressions !== '') {
      filtered = filtered.filter((q) => (q.impressions || 0) >= minImpressions);
    }

    // Фильтр по категории частотности
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((q) => getCategory(q.impressions) === categoryFilter);
    }

    // Сортировка
    return [...filtered].sort((a, b) => {
      if (sortField === 'text') {
        return sortDir === 'asc' 
          ? a.text.localeCompare(b.text)
          : b.text.localeCompare(a.text);
      } else {
        const aVal = a.impressions || 0;
        const bVal = b.impressions || 0;
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });
  }, [queries, sortField, sortDir, filterText, categoryFilter, minImpressions]);

  // Статистика по категориям
  const stats = useMemo(() => {
    const high = queries.filter((q) => getCategory(q.impressions) === 'high').length;
    const medium = queries.filter((q) => getCategory(q.impressions) === 'medium').length;
    const low = queries.filter((q) => getCategory(q.impressions) === 'low').length;
    return { high, medium, low };
  }, [queries]);

  const handleSort = (field: 'text' | 'impressions') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const handleDeleteSelected = () => {
    if (selectedQueries.length > 0) {
      removeQueries(selectedQueries);
    }
  };

  const allSelected = filteredAndSorted.length > 0 && 
    filteredAndSorted.every((q) => selectedQueries.includes(q.id));

  const handleSelectAllFiltered = () => {
    if (allSelected) {
      clearQuerySelection();
    } else {
      filteredAndSorted.forEach((q) => {
        if (!selectedQueries.includes(q.id)) {
          toggleQuerySelection(q.id);
        }
      });
    }
  };

  return (
    <MainLayout>
      <div className="h-full flex flex-col p-4">
        <div className="flex-1 flex flex-col bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden">
          {/* Toolbar */}
          <div className="p-3 border-b border-white/5 space-y-2">
            {/* Row 1: Search and stats */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Поиск..."
                className="w-48 bg-white/5 border-0 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-white/30"
              />
              
              <div className="flex items-center gap-1.5 bg-white/5 rounded-xl px-3 py-1.5">
                <span className="text-xs text-white/40">от</span>
                <input
                  type="number"
                  value={minImpressions}
                  onChange={(e) => setMinImpressions(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="0"
                  className="w-16 bg-transparent border-0 text-xs focus:outline-none"
                />
              </div>

              <div className="flex-1" />

              <span className="text-xs text-white/40">
                {filteredAndSorted.length} / {queries.length}
              </span>
            </div>

            {/* Row 2: Category filters */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 mr-2">Частотность:</span>
              
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                  categoryFilter === 'all' 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                Все
              </button>
              
              <button
                onClick={() => setCategoryFilter('high')}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                  categoryFilter === 'high' 
                    ? 'bg-orange-500/20 text-orange-400' 
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                ВЧ
              </button>
              
              <button
                onClick={() => setCategoryFilter('medium')}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                  categoryFilter === 'medium' 
                    ? 'bg-yellow-500/20 text-yellow-400' 
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                СЧ
              </button>
              
              <button
                onClick={() => setCategoryFilter('low')}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                  categoryFilter === 'low' 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                НЧ
              </button>

              <div className="flex-1" />

              {selectedQueries.length > 0 && (
                <>
                  <span className="text-xs text-blue-400">
                    Выбрано: {selectedQueries.length}
                  </span>
                  <button
                    onClick={handleDeleteSelected}
                    className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-xs hover:bg-red-500/30"
                  >
                    Удалить
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#1a1a1a] z-10">
                <tr className="border-b border-white/5">
                  <th className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAllFiltered}
                      className="accent-blue-500"
                    />
                  </th>
                  <th className="text-left px-3 py-2 text-[10px] font-medium text-white/30 w-10">#</th>
                  <th className="text-center px-3 py-2 text-[10px] font-medium text-white/30 w-14">Тип</th>
                  <th 
                    className="text-left px-3 py-2 text-[10px] font-medium text-white/30 cursor-pointer hover:text-white/60"
                    onClick={() => handleSort('text')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Запрос
                      {sortField === 'text' && (
                        <svg className={`w-2 h-2 ${sortDir === 'asc' ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-8 8h16l-8-8z"/></svg>
                      )}
                    </span>
                  </th>
                  <th 
                    className="text-right px-3 py-2 text-[10px] font-medium text-white/30 w-24 cursor-pointer hover:text-white/60"
                    onClick={() => handleSort('impressions')}
                  >
                    <span className="inline-flex items-center justify-end gap-1 w-full">
                      Показы
                      {sortField === 'impressions' && (
                        <svg className={`w-2 h-2 ${sortDir === 'asc' ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-8 8h16l-8-8z"/></svg>
                      )}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((query, index) => {
                  const category = getCategory(query.impressions);
                  return (
                    <tr 
                      key={query.id} 
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                        selectedQueries.includes(query.id) ? 'bg-blue-500/10' : ''
                      }`}
                    >
                      <td className="px-3 py-1.5">
                        <input
                          type="checkbox"
                          checked={selectedQueries.includes(query.id)}
                          onChange={() => toggleQuerySelection(query.id)}
                          className="accent-blue-500"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-[10px] text-white/30">{index + 1}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded-lg text-[10px] font-medium ${getCategoryBg(category)} ${getCategoryColor(category)}`}>
                          {getCategoryLabel(category)}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-xs">{query.text}</td>
                      <td className={`px-3 py-1.5 text-xs text-right font-medium ${getCategoryColor(category)}`}>
                        {query.impressions?.toLocaleString('ru-RU') || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredAndSorted.length === 0 && (
              <div className="flex items-center justify-center h-32 text-white/30 text-xs">
                Нет запросов
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}