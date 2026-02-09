'use client';

import React, { memo } from 'react';


interface NonarchivedlistsitemComponentProps {
  todo: Todo;
  onUpdate: (updates: Partial<Todo>) => void;
}}

const NonarchivedlistsitemComponent = memo(function NonarchivedlistsitemComponent({todo, onUpdate}: NonarchivedlistsitemComponentProps) {
  return (
    (
                          <button
                            key={list.id}
                            type="button"
                            onClick={() => {
                              setEditingTodo({ ...editingTodo, listId: list.id });
                              setOpenDropdown(null);
                            }}
                            className={`w-full px-3 py-1.5 text-left hover:bg-[var(--bg-glass)] transition-colors text-xs flex items-center gap-1.5 ${
                              editingTodo.listId === list.id ? 'bg-[var(--bg-glass)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                            <span>{list.name}</span>
                          </button>
                        )
  );
});

export default NonarchivedlistsitemComponent;
