'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, CheckSquare, List } from 'lucide-react';
import { Message } from './types';

interface TodoList {
  id: string;
  name: string;
  color?: string;
}

interface TaskListSelectorProps {
  show: boolean;
  message: Message | null;
  todoLists: TodoList[];
  currentUserId?: string | null;
  onClose: () => void;
  onTaskCreated?: () => void;
}

export default function TaskListSelector({
  show,
  message,
  todoLists,
  currentUserId,
  onClose,
  onTaskCreated,
}: TaskListSelectorProps) {
  const [selectedList, setSelectedList] = useState<TodoList | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const normalizedMessage = useMemo(() => {
    const text = (message?.content || '').replace(/\s+/g, ' ').trim();
    return text;
  }, [message?.content]);

  useEffect(() => {
    if (!show || !message) return;
    const defaultTitle = normalizedMessage.length > 120
      ? `${normalizedMessage.slice(0, 120)}...`
      : normalizedMessage || 'Новая задача из сообщения';

    setSelectedList(null);
    setTitle(defaultTitle);
    setDescription(normalizedMessage);
  }, [show, message, normalizedMessage]);

  if (!show || !message) return null;

  const handleCreateTask = async () => {
    if (!selectedList || !title.trim()) return;

    setCreating(true);
    try {
      const username = localStorage.getItem('username') || '';
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || `Создано из сообщения: ${message.id}`,
          status: 'todo',
          priority: 'medium',
          listId: selectedList.id,
          authorId: currentUserId || undefined,
          assignedById: currentUserId || undefined,
          createdBy: username || undefined,
          sourceId: message.id,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create task: ${res.status}`);
      }

      onTaskCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating task from message:', error);
      alert('Не удалось создать задачу');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[101]">
      <div
        className="bg-white dark:bg-gradient-to-b dark:from-[#1a1a1a] dark:to-[#151515] border-0 sm:border border-gray-200 dark:border-white/10 rounded-t-2xl sm:rounded-xl w-full sm:w-[560px] max-h-[95vh] shadow-2xl flex flex-col overflow-hidden select-none"
        onCopy={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10">
          <h3 className="font-medium text-gray-900 dark:text-white">Создание задачи из сообщения</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-white/60" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 dark:border-white/10">
          <p className="text-xs text-gray-500 dark:text-white/50 mb-2">Шаг 1: Выберите список</p>
          {todoLists.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-white/50">Списки задач не найдены</div>
          ) : (
            <div className="max-h-44 overflow-y-auto space-y-2">
              {todoLists.map((list) => {
                const isSelected = selectedList?.id === list.id;
                return (
                  <button
                    key={list.id}
                    onClick={() => setSelectedList(list)}
                    className={`w-full px-3 py-2.5 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/40'
                        : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                    style={{ borderLeft: `3px solid ${list.color || '#8B5CF6'}` }}
                  >
                    <List className="w-4 h-4 text-gray-500 dark:text-white/50" />
                    <span className="text-sm text-gray-900 dark:text-white">{list.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-500 dark:text-white/50">Шаг 2: Проверьте данные задачи</p>
          <div>
            <label className="block text-xs text-gray-500 dark:text-white/50 mb-1">Заголовок</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm"
              placeholder="Название задачи"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-white/50 mb-1">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm min-h-[110px]"
              placeholder="Описание задачи"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-white/10 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-sm text-gray-700 dark:text-white/80"
          >
            Отмена
          </button>
          <button
            onClick={handleCreateTask}
            disabled={!selectedList || !title.trim() || creating}
            className="flex-1 py-2 bg-purple-500/90 hover:bg-purple-500 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckSquare className="w-4 h-4" />
            {creating ? 'Создание...' : 'Создать задачу'}
          </button>
        </div>
      </div>
    </div>
  );
}
