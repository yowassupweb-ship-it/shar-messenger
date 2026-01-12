'use client';

import { useState } from 'react';
import { useStore } from '@/store/store';

export default function FilterPanel() {
  const { filters, selectedFilter, setSelectedFilter, updateFilter } = useStore();
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');

  const selectedFilterData = filters.find((f) => f.id === selectedFilter);

  const handleAddItem = () => {
    if (!selectedFilter || !newItemText.trim()) return;
    const filter = filters.find((f) => f.id === selectedFilter);
    if (filter) {
      updateFilter(selectedFilter, [...filter.items, newItemText.trim()]);
      setNewItemText('');
    }
  };

  const handleRemoveItem = (index: number) => {
    if (!selectedFilter) return;
    const filter = filters.find((f) => f.id === selectedFilter);
    if (filter) {
      const newItems = filter.items.filter((_, i) => i !== index);
      updateFilter(selectedFilter, newItems);
    }
  };

  return (
    <div className="flex h-full gap-4">
      {/* Filter list */}
      <div className="w-64 bg-dark-surface rounded border border-dark-border overflow-hidden">
        <div className="p-2 border-b border-dark-border text-sm font-medium">
          Фильтры ({filters.length})
        </div>
        <div className="overflow-y-auto max-h-[calc(100%-40px)]">
          {filters.map((filter) => (
            <div
              key={filter.id}
              className={`px-3 py-2 cursor-pointer border-b border-dark-border ${
                selectedFilter === filter.id ? 'bg-dark-highlight' : 'hover:bg-dark-hover'
              }`}
              onClick={() => setSelectedFilter(filter.id)}
            >
              <div className="font-medium text-sm">{filter.name}</div>
              <div className="text-xs text-dark-muted mt-0.5">
                {filter.items.length} элементов
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter items */}
      <div className="flex-1 bg-dark-surface rounded border border-dark-border overflow-hidden">
        {selectedFilterData ? (
          <>
            <div className="p-2 border-b border-dark-border flex items-center justify-between">
              <span className="text-sm font-medium">{selectedFilterData.name}</span>
              <span className="text-xs text-dark-muted">{selectedFilterData.items.length} элементов</span>
            </div>
            
            {/* Add new item */}
            <div className="p-2 border-b border-dark-border flex gap-2">
              <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                placeholder="Добавить элемент..."
                className="flex-1 bg-dark-bg border border-dark-border rounded px-2 py-1 text-sm focus:outline-none focus:border-dark-accent"
              />
              <button
                onClick={handleAddItem}
                className="px-3 py-1 bg-dark-accent text-white rounded text-sm hover:opacity-90"
              >
                Добавить
              </button>
            </div>

            {/* Items list */}
            <div className="overflow-y-auto max-h-[calc(100%-88px)]">
              <table className="w-full">
                <thead className="sticky top-0 bg-dark-surface">
                  <tr className="border-b border-dark-border">
                    <th className="text-left px-3 py-2 text-xs font-medium text-dark-muted w-10">#</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-dark-muted">Значение</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFilterData.items.map((item, index) => (
                    <tr key={index} className="border-b border-dark-border hover:bg-dark-hover">
                      <td className="px-3 py-1.5 text-xs text-dark-muted">{index + 1}</td>
                      <td className="px-3 py-1.5 text-sm">{item}</td>
                      <td className="px-3 py-1.5 text-right">
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-dark-muted">
            Выберите фильтр
          </div>
        )}
      </div>
    </div>
  );
}
