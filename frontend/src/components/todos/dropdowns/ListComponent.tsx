'use client';

import React, { memo } from 'react';


interface ListComponentProps {
  todo: Todo;
  onUpdate: (updates: Partial<Todo>) => void;
}}

const ListComponent = memo(function ListComponent({todo, onUpdate}: ListComponentProps) {
  return (
    {openDropdown === 'list' && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto backdrop-blur-xl">
                        {nonArchivedLists.map(list => (
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
                        ))}
                      </div>
                    )}
  );
});

export default ListComponent;
