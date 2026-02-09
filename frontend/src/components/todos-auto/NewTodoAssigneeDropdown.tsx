'use client';

import React, { memo } from 'react';
import { UserCheck, Users } from 'lucide-react';

interface NewTodoAssigneeDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  newTodoAssigneeId: string | null;
  setNewTodoAssigneeId: (id: string | null) => void;
  myAccountId: string;
}

const NewTodoAssigneeDropdown = memo(function NewTodoAssigneeDropdown({
  isOpen,
  onClose,
  people,
  newTodoAssigneeId,
  setNewTodoAssigneeId,
  myAccountId
}: NewTodoAssigneeDropdownProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 py-1 max-h-48 overflow-y-auto">
      <button
        onClick={() => { setNewTodoAssigneeId(null); onClose(); }}
        className={`w-full px-2 py-1.5 md:px-3 md:py-2 text-left text-[10px] md:text-xs flex items-center gap-1.5 md:gap-2 hover:bg-[var(--bg-glass)] transition-colors ${
          !newTodoAssigneeId ? 'text-[var(--text-primary)] bg-[var(--bg-glass)]' : 'text-[var(--text-secondary)]'
        }`}
      >
        <Users className="w-3.5 h-3.5" />
        Без исполнителя
      </button>
      {people.filter(p => p.role === 'executor' || p.role === 'universal').map(person => (
        <button
          key={person.id}
          onClick={() => { setNewTodoAssigneeId(person.id); onClose(); }}
          className={`w-full px-2 py-1.5 md:px-3 md:py-2 text-left text-[10px] md:text-xs flex items-center gap-1.5 md:gap-2 hover:bg-[var(--bg-glass)] transition-colors ${
            newTodoAssigneeId === person.id ? 'text-purple-400 bg-purple-500/10' : 'text-[var(--text-secondary)]'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          {person.name}
          {person.id === myAccountId && (
            <span className="ml-auto text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">Я</span>
          )}
        </button>
      ))}
    </div>
  );
});

export default NewTodoAssigneeDropdown;
