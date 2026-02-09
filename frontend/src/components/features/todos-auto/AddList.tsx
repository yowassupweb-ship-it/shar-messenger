'use client';

import React, { memo } from 'react';
import { ChevronDown, UserCheck, Users, X } from 'lucide-react';

interface Person {
  id: string;
  name: string;
  role: 'executor' | 'customer' | 'universal';
}

interface AddListProps {
  isOpen: boolean;
  onClose: () => void;
  newListName: string;
  setNewListName: (name: string) => void;
  newListDescription: string;
  setNewListDescription: (desc: string) => void;
  newListColor: string;
  setNewListColor: (color: string) => void;
  newListAssigneeId: string | null;
  setNewListAssigneeId: (id: string | null) => void;
  showNewListAssigneeDropdown: boolean;
  setShowNewListAssigneeDropdown: (show: boolean) => void;
  people: Person[];
  myAccountId: string | null;
  addList: () => void;
  LIST_COLORS: string[];
}

const AddList = memo(function AddList({
  isOpen,
  onClose,
  newListName,
  setNewListName,
  newListDescription,
  setNewListDescription,
  newListColor,
  setNewListColor,
  newListAssigneeId,
  setNewListAssigneeId,
  showNewListAssigneeDropdown,
  setShowNewListAssigneeDropdown,
  people,
  myAccountId,
  addList,
  LIST_COLORS
}: AddListProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setNewListName('');
    setNewListDescription('');
    setNewListAssigneeId(null);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-[var(--bg-tertiary)] p-4 h-full w-full overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-[var(--text-primary)]">Новый список</h3>
          <button 
            onClick={onClose}
            className="md:hidden w-8 h-8 rounded-full bg-gray-100 dark:bg-[var(--bg-glass)] flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-[var(--text-secondary)]" />
          </button>
        </div>
              <input
                type="text"
                placeholder="Название списка"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addList()}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl mb-3 focus:outline-none focus:border-blue-500 dark:focus:border-[var(--accent-primary)] text-gray-900 dark:text-[var(--text-primary)]"
                autoFocus
              />
              <textarea
                placeholder="Описание списка (необязательно)"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border-color)] rounded-[20px] mb-3 focus:outline-none focus:border-blue-500 dark:focus:border-[var(--accent-primary)] text-gray-900 dark:text-[var(--text-primary)] resize-none"
              />
              <div className="mb-4">
                <label className="block text-sm text-gray-500 dark:text-[var(--text-muted)] mb-2">Цвет</label>
                <div className="flex gap-2 flex-wrap">
                  {LIST_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewListColor(color)}
                      className={`w-6 h-6 rounded-full transition-all ${newListColor === color ? 'ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-tertiary)] scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              {/* Выбор исполнителя по умолчанию */}
              <div className="mb-4 relative">
                <label className="block text-sm text-[var(--text-muted)] mb-2">Исполнитель по умолчанию</label>
                <button
                  onClick={() => setShowNewListAssigneeDropdown(!showNewListAssigneeDropdown)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl text-left text-sm flex items-center justify-between hover:border-gray-300 dark:hover:border-[var(--border-light)] transition-colors"
                >
                  <span className="flex items-center gap-2 text-gray-700 dark:text-[var(--text-secondary)]">
                    <UserCheck className="w-3.5 h-3.5 text-gray-400 dark:text-[var(--text-muted)]" />
                    {newListAssigneeId 
                      ? people.find(p => p.id === newListAssigneeId)?.name || 'Исполнитель'
                      : 'Не выбран'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-[var(--text-muted)] transition-transform ${showNewListAssigneeDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showNewListAssigneeDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl shadow-xl z-50 py-1 max-h-48 overflow-y-auto">
                    <button
                      onClick={() => { setNewListAssigneeId(null); setShowNewListAssigneeDropdown(false); }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors ${
                        !newListAssigneeId ? 'text-gray-900 dark:text-[var(--text-primary)] bg-gray-100 dark:bg-[var(--bg-glass)]' : 'text-gray-600 dark:text-[var(--text-secondary)]'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Не выбран
                    </button>
                    {people.filter(p => p.role === 'executor' || p.role === 'universal').map(person => (
                      <button
                        key={person.id}
                        onClick={() => { setNewListAssigneeId(person.id); setShowNewListAssigneeDropdown(false); }}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors ${
                          newListAssigneeId === person.id ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10' : 'text-gray-600 dark:text-[var(--text-secondary)]'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        {person.name}
                        {person.id === myAccountId && (
                          <span className="ml-auto text-[10px] bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 px-1.5 py-0.5 rounded">Я</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
        <div className="flex gap-2">
          <button
            onClick={addList}
            className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-all"
          >
            Создать
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2.5 bg-gray-100 dark:bg-[var(--bg-secondary)] hover:bg-gray-200 dark:hover:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-[var(--border-color)] text-gray-600 dark:text-[var(--text-secondary)] rounded-xl text-sm font-medium transition-all"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
});

export default AddList;
