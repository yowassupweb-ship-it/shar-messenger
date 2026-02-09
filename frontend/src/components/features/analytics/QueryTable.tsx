'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/store';

export default function QueryTable() {
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

  const sortedQueries = useMemo(() => {
    let filtered = queries;
    
    if (filterText) {
      const lower = filterText.toLowerCase();
      filtered = queries.filter((q) => q.text.toLowerCase().includes(lower));
    }

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
  }, [queries, sortField, sortDir, filterText]);

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

  const allSelected = queries.length > 0 && selectedQueries.length === queries.length;

  return (
    <div className="h-full flex flex-col bg-dark-surface rounded border border-dark-border overflow-hidden">
      {/* Filter bar */}
      <div className="p-2 border-b border-dark-border flex items-center gap-4">
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Поиск по запросам..."
          className="flex-1 max-w-xs bg-dark-bg border border-dark-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-dark-accent"
        />
        <span className="text-sm text-dark-muted">
          Найдено: {sortedQueries.length} из {queries.length}
        </span>
        {selectedQueries.length > 0 && (
          <>
            <span className="text-sm text-dark-accent">
              Выбрано: {selectedQueries.length}
            </span>
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-500"
            >
              Удалить выбранные
            </button>
          </>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-dark-surface z-10">
            <tr className="border-b border-dark-border">
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => allSelected ? clearQuerySelection() : selectAllQueries()}
                  className="accent-dark-accent"
                />
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-dark-muted w-12">#</th>
              <th 
                className="text-left px-3 py-2 text-xs font-medium text-dark-muted cursor-pointer hover:text-dark-text"
                onClick={() => handleSort('text')}
              >
                Запрос {sortField === 'text' && (sortDir === 'asc' ? '[A-Z]' : '[Z-A]')}
              </th>
              <th 
                className="text-right px-3 py-2 text-xs font-medium text-dark-muted w-32 cursor-pointer hover:text-dark-text"
                onClick={() => handleSort('impressions')}
              >
                Показы {sortField === 'impressions' && (sortDir === 'asc' ? '[0-9]' : '[9-0]')}
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-dark-muted w-32">Источник</th>
            </tr>
          </thead>
          <tbody>
            {sortedQueries.map((query, index) => (
              <tr 
                key={query.id} 
                className={`border-b border-dark-border hover:bg-dark-hover ${
                  selectedQueries.includes(query.id) ? 'bg-dark-highlight' : ''
                }`}
              >
                <td className="px-3 py-1.5">
                  <input
                    type="checkbox"
                    checked={selectedQueries.includes(query.id)}
                    onChange={() => toggleQuerySelection(query.id)}
                    className="accent-dark-accent"
                  />
                </td>
                <td className="px-3 py-1.5 text-xs text-dark-muted">{index + 1}</td>
                <td className="px-3 py-1.5 text-sm">{query.text}</td>
                <td className="px-3 py-1.5 text-sm text-right text-dark-muted">
                  {query.impressions?.toLocaleString('ru-RU') || '-'}
                </td>
                <td className="px-3 py-1.5 text-xs text-dark-muted">{query.source || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {sortedQueries.length === 0 && (
          <div className="flex items-center justify-center h-32 text-dark-muted">
            Нет запросов
          </div>
        )}
      </div>
    </div>
  );
}
