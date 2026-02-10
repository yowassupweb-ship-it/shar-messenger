'use client';

import React, { memo } from 'react';


interface CategoriesitemComponentProps {
  todo: Todo;
  onUpdate: (updates: Partial<Todo>) => void;
}}

const CategoriesitemComponent = memo(function CategoriesitemComponent({todo, onUpdate}: CategoriesitemComponentProps) {
  return (
    (
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
                        )
  );
});

export default CategoriesitemComponent;
