'use client';

import React, { memo } from 'react';


interface CalendarlistsitemComponentProps {
  todo: Todo;
  onUpdate: (updates: Partial<Todo>) => void;
}}

const CalendarlistsitemComponent = memo(function CalendarlistsitemComponent({todo, onUpdate}: CalendarlistsitemComponentProps) {
  return (
    (
                            <button
                              key={list.id}
                              type="button"
                              onClick={() => setEditingTodo({ ...editingTodo, calendarListId: list.id })}
                              className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-[background-color,color] select-none whitespace-nowrap ${
                                editingTodo.calendarListId === list.id || (!editingTodo.calendarListId && list.id === calendarLists[0]?.id)
                                  ? 'bg-purple-500 text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]'
                                  : 'bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-[var(--text-secondary)] hover:border-purple-500/30'
                              }`}
                              title={list.name}
                            >
                              {list.name}
                            </button>
                          )
  );
});

export default CalendarlistsitemComponent;
