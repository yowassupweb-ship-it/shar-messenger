'use client';

import React, { memo, useState, useEffect } from 'react';
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
  newListStagesEnabled: boolean;
  setNewListStagesEnabled: (enabled: boolean) => void;
  people: Person[];
  myAccountId: string | null;
  addList: () => void;
  LIST_COLORS: string[];
  // Для редактирования существующего списка
  editingList?: any | null;
  updateList?: (list: any) => void;
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
  newListStagesEnabled,
  setNewListStagesEnabled,
  people,
  myAccountId,
  addList,
  LIST_COLORS,
  editingList,
  updateList
}: AddListProps) {
  if (!isOpen) return null;

  const isEditing = !!editingList;
  
  // Используем локальное состояние для редактирования
  const [localEditedList, setLocalEditedList] = useState<any | null>(null);
  
  useEffect(() => {
    if (editingList) {
      setLocalEditedList({ ...editingList });
    }
  }, [editingList]);
  
  const displayName = isEditing ? (localEditedList?.name || editingList.name) : newListName;
  const displayColor = isEditing ? (localEditedList?.color || editingList.color) : newListColor;
  const displayAssigneeId = isEditing ? (localEditedList?.defaultExecutorId !== undefined ? localEditedList.defaultExecutorId : editingList.defaultExecutorId) : newListAssigneeId;
  const displayStagesEnabled = isEditing ? (localEditedList?.stagesEnabled !== undefined ? localEditedList.stagesEnabled : editingList.stagesEnabled) : newListStagesEnabled;

  const handleClose = () => {
    onClose();
    setLocalEditedList(null);
    if (!isEditing) {
      setNewListName('');
      setNewListDescription('');
      setNewListAssigneeId(null);
      setNewListStagesEnabled(false);
    }
  };

  const handleSave = () => {
    if (isEditing && updateList && localEditedList) {
      updateList({
        ...editingList,
        ...localEditedList
      });
      handleClose();
    } else {
      addList();
    }
  };

  const handleNameChange = (value: string) => {
    if (isEditing) {
      setLocalEditedList({ ...localEditedList, name: value });
    } else {
      setNewListName(value);
    }
  };

  const handleColorChange = (color: string) => {
    if (isEditing) {
      setLocalEditedList({ ...localEditedList, color });
    } else {
      setNewListColor(color);
    }
  };

  const handleAssigneeChange = (id: string | null) => {
    if (isEditing) {
      setLocalEditedList({ ...localEditedList, defaultExecutorId: id });
    } else {
      setNewListAssigneeId(id);
    }
  };

  const handleStagesChange = (enabled: boolean) => {
    if (isEditing) {
      setLocalEditedList({ ...localEditedList, stagesEnabled: enabled });
    } else {
      setNewListStagesEnabled(enabled);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-0 md:p-4"
      onClick={(e) => {
        // Закрытие при клике на overlay (только на десктопе)
        if (e.target === e.currentTarget && window.innerWidth >= 768) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-[var(--bg-tertiary)] h-full w-full md:h-auto md:max-h-[90vh] md:max-w-[520px] md:rounded-2xl md:shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-[var(--bg-tertiary)] z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-[var(--border-color)]">
          <h3 className="font-semibold text-gray-900 dark:text-[var(--text-primary)]">
            {isEditing ? `Настройки списка '${editingList.name}'` : 'Новый список'}
          </h3>
          <button 
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[var(--bg-glass)] hover:bg-gray-200 dark:hover:bg-[var(--bg-glass-hover)] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-[var(--text-secondary)]" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
              <input
                type="text"
                placeholder="Название списка"
                value={displayName}
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
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
                      onClick={() => handleColorChange(color)}
                      className={`w-6 h-6 rounded-full transition-all ${displayColor === color ? 'ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-tertiary)] scale-110' : 'hover:scale-110'}`}
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
                    {displayAssigneeId 
                      ? people.find(p => p.id === displayAssigneeId)?.name || 'Исполнитель'
                      : 'Не выбран'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-[var(--text-muted)] transition-transform ${showNewListAssigneeDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showNewListAssigneeDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl shadow-xl z-50 py-1 max-h-48 overflow-y-auto">
                    <button
                      onClick={() => { handleAssigneeChange(null); setShowNewListAssigneeDropdown(false); }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors ${
                        !displayAssigneeId ? 'text-gray-900 dark:text-[var(--text-primary)] bg-gray-100 dark:bg-[var(--bg-glass)]' : 'text-gray-600 dark:text-[var(--text-secondary)]'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Не выбран
                    </button>
                    {people.filter(p => p.role === 'executor' || p.role === 'universal').map(person => (
                      <button
                        key={person.id}
                        onClick={() => { handleAssigneeChange(person.id); setShowNewListAssigneeDropdown(false); }}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors ${
                          displayAssigneeId === person.id ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10' : 'text-gray-600 dark:text-[var(--text-secondary)]'
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
              
              {/* Включить этапы */}
              <div className="mb-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={displayStagesEnabled}
                      onChange={(e) => handleStagesChange(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-[var(--bg-secondary)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-[var(--text-primary)]">
                      Включить этапы в задачах
                    </span>
                    <p className="text-xs text-gray-500 dark:text-[var(--text-muted)] mt-0.5">
                      Задачи в этом списке будут иметь отдельные этапы с собственными исполнителями и сроками
                    </p>
                  </div>
                </label>
              </div>
              
              <div className="flex gap-2 sticky bottom-0 bg-white dark:bg-[var(--bg-tertiary)] pt-4 -mx-4 px-4 pb-4 border-t border-gray-200 dark:border-[var(--border-color)]">
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-all"
                >
                  {isEditing ? 'Сохранить' : 'Создать'}
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
        </div>
      );
});

export default AddList;
