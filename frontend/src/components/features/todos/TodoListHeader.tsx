import React from 'react';
import { GripVertical, UserCheck, User, Plus, MoreVertical } from 'lucide-react';
import { TodoList, Person } from '@/types/todos';

interface TodoListHeaderProps {
  list: TodoList;
  people: Person[];
  completedCount: number;
  totalCount: number;
  windowWidth: number;
  editingListId: string | null;
  editingListName: string;
  setEditingListId: (id: string | null) => void;
  setEditingListName: (name: string) => void;
  setAddingToList: (id: string | null) => void;
  setNewTodoAssigneeId: (id: string | null) => void;
  setShowListMenu: (id: string | null) => void;
  showListMenu: string | null;
  updateList: (list: TodoList) => void;
  handleListDragStart: (e: React.DragEvent, list: TodoList) => void;
  handleListDragEnd: (e: React.DragEvent) => void;
}

export default function TodoListHeader({
  list,
  people,
  completedCount,
  totalCount,
  windowWidth,
  editingListId,
  editingListName,
  setEditingListId,
  setEditingListName,
  setAddingToList,
  setNewTodoAssigneeId,
  setShowListMenu,
  showListMenu,
  updateList,
  handleListDragStart,
  handleListDragEnd
}: TodoListHeaderProps) {
  return (
    <div 
      draggable={windowWidth >= 768}
      onDragStart={(e) => handleListDragStart(e, list)}
      onDragEnd={handleListDragEnd}
      className="bg-[var(--bg-secondary)] border-x border-t border-[var(--border-color)] rounded-t-xl p-2 sm:p-2.5 flex-shrink-0 md:cursor-grab md:active:cursor-grabbing"
    >
      <div className="flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 sm:gap-1.5">
          {/* Drag handle - только на десктопе */}
          <div
            className="hidden md:block p-0.5 -ml-1 rounded transition-colors opacity-0 group-hover:opacity-40"
            title="Перетащите для изменения порядка"
          >
            <GripVertical className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
          </div>
          <div 
            className="w-2.5 h-2.5 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: list.color }}
          />
          {editingListId === list.id ? (
            <input
              type="text"
              value={editingListName}
              onChange={(e) => setEditingListName(e.target.value)}
              onBlur={() => {
                if (editingListName.trim() && editingListName !== list.name) {
                  updateList({ ...list, name: editingListName.trim() });
                }
                setEditingListId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (editingListName.trim() && editingListName !== list.name) {
                    updateList({ ...list, name: editingListName.trim() });
                  }
                  setEditingListId(null);
                }
                if (e.key === 'Escape') {
                  setEditingListId(null);
                }
              }}
              className="bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded px-2 py-0.5 text-sm font-medium focus:outline-none focus:border-blue-500/50 w-28 pointer-events-auto"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3 
              className="font-medium text-sm sm:text-sm truncate cursor-pointer text-gray-900 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 transition-colors pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                setEditingListId(list.id);
                setEditingListName(list.name);
              }}
              title="Кликните для переименования"
            >
              {list.name}
            </h3>
          )}
          <span className="text-[10px] text-gray-500 dark:text-white/50 bg-gray-200 dark:bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded-full">
            {completedCount}/{totalCount}
          </span>
          {/* Индикаторы привязки */}
          {(list.defaultExecutorId || list.defaultCustomerId) && (
            <div className="flex items-center gap-0.5 ml-1" title={`${list.defaultExecutorId ? 'Исполнитель: ' + people.find(p => p.id === list.defaultExecutorId)?.name : ''}${list.defaultExecutorId && list.defaultCustomerId ? ', ' : ''}${list.defaultCustomerId ? 'Заказчик: ' + people.find(p => p.id === list.defaultCustomerId)?.name : ''}`}>
              {list.defaultExecutorId && (
                <UserCheck className="w-3 h-3 text-green-400/70" />
              )}
              {list.defaultCustomerId && (
                <User className="w-3 h-3 text-blue-400/70" />
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 pointer-events-auto">
          <button
            onClick={() => {
              setAddingToList(list.id);
              if (list.defaultExecutorId) {
                setNewTodoAssigneeId(list.defaultExecutorId);
              }
            }}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all bg-gradient-to-br from-white/10 to-white/5 hover:from-green-500/20 hover:to-green-500/10 border border-white/20 hover:border-green-500/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-md text-green-400"
            title="Добавить задачу"
          >
            <Plus className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5" />
          </button>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowListMenu(showListMenu === list.id ? null : list.id);
              }}
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all bg-gradient-to-br from-white/10 to-white/5 hover:from-blue-500/20 hover:to-blue-500/10 border border-white/20 hover:border-blue-500/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-md text-gray-400"
              title="Настройки"
            >
              <MoreVertical className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
