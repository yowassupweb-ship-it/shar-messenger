'use client';

import React, { memo } from 'react';


interface CategoryComponentProps {
  todo: Todo;
  onUpdate: (updates: Partial<Todo>) => void;
}}

const CategoryComponent = memo(function CategoryComponent({todo, onUpdate}: CategoryComponentProps) {
  return (
    {openDropdown === 'category' && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto backdrop-blur-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTodo({ ...editingTodo, categoryId: undefined });
                            setOpenDropdown(null);
                          }}
                          className={`w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors text-xs ${
                            !editingTodo.categoryId ? 'bg-gray-100 dark:bg-[var(--bg-glass)] text-gray-900 dark:text-[var(--text-primary)]' : 'text-gray-500 dark:text-white/50'
                          }`}
                        >
                          Без категории
                        </button>
                        {categories.map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setEditingTodo({ ...editingTodo, categoryId: cat.id });
                              setOpenDropdown(null);
                            }}
                            className={`w-full px-3 py-1.5 text-left hover:bg-[var(--bg-glass)] transition-colors text-xs flex items-center gap-1.5 ${
                              editingTodo.categoryId === cat.id ? 'bg-[var(--bg-glass)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span>{cat.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
  );
});

export default CategoryComponent;
