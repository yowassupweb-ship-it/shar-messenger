'use client';

import React, { memo } from 'react';
import { ChevronDown, UserCheck, X } from 'lucide-react';
import NewTodoAssigneeDropdown from '../todos-auto/NewTodoAssigneeDropdown';

interface Person {
  id: string;
  name: string;
  username?: string;
}

interface AddTodoFormProps {
  listId: string;
  newTodoTitle: string;
  newTodoDescription: string;
  newTodoAssigneeId: string | null;
  showNewTodoAssigneeDropdown: boolean;
  people: Person[];
  myAccountId: string;
  setNewTodoTitle: (title: string) => void;
  setNewTodoDescription: (desc: string) => void;
  setNewTodoAssigneeId: (id: string | null) => void;
  setShowNewTodoAssigneeDropdown: (show: boolean) => void;
  onAdd: (listId: string) => void;
  onCancel: () => void;
}

const AddTodoForm = memo(function AddTodoForm({
  listId,
  newTodoTitle,
  newTodoDescription,
  newTodoAssigneeId,
  showNewTodoAssigneeDropdown,
  people,
  myAccountId,
  setNewTodoTitle,
  setNewTodoDescription,
  setNewTodoAssigneeId,
  setShowNewTodoAssigneeDropdown,
  onAdd,
  onCancel
}: AddTodoFormProps) {
  return (
    <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-3">
      <input
        type="text"
        placeholder="Название задачи..."
        value={newTodoTitle}
        onChange={(e) => setNewTodoTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onAdd(listId);
          if (e.key === 'Escape') onCancel();
        }}
        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg mb-2 focus:outline-none focus:border-white/30"
        autoFocus
      />
      <textarea
        placeholder="Описание (необязательно)..."
        value={newTodoDescription}
        onChange={(e) => setNewTodoDescription(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[20px] mb-2 focus:outline-none focus:border-white/30 resize-none text-sm"
      />
      <div className="relative mb-2">
        <button
          onClick={() => setShowNewTodoAssigneeDropdown(!showNewTodoAssigneeDropdown)}
          className="w-full px-2 py-1.5 md:px-3 md:py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-left text-xs md:text-sm flex items-center justify-between hover:border-[var(--border-light)] transition-colors"
        >
          <span className="flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            {newTodoAssigneeId 
              ? people.find(p => p.id === newTodoAssigneeId)?.name || 'Исполнитель'
              : 'Выбрать исполнителя'}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${showNewTodoAssigneeDropdown ? 'rotate-180' : ''}`} />
        </button>
        <NewTodoAssigneeDropdown
          isOpen={showNewTodoAssigneeDropdown}
          onClose={() => setShowNewTodoAssigneeDropdown(false)}
          people={people}
          newTodoAssigneeId={newTodoAssigneeId}
          setNewTodoAssigneeId={setNewTodoAssigneeId}
          myAccountId={myAccountId}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onAdd(listId)}
          className="flex-1 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all"
        >
          Добавить
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 bg-[var(--bg-glass)] hover:bg-[var(--bg-glass-hover)] rounded-lg text-sm transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

export default AddTodoForm;
