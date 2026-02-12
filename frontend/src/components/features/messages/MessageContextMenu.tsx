'use client';

import React, { useRef, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Message, User } from './types';
import { Reply, Copy, Edit3, Forward, CheckSquare, CalendarPlus } from 'lucide-react';

interface MessageContextMenuProps {
  message: Message | null;
  position: { top: number; left: number };
  currentUser: User | null;
  messageInputRef: React.RefObject<HTMLTextAreaElement>;
  onClose: () => void;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onEdit: (messageId: string, content: string) => void;
  onShowEventSelector: (message: Message) => void;
  onLoadCalendars: () => Promise<void>;
  defaultListId?: string | null;
  onTaskCreated?: (task: any) => void;
  onTaskUpdated?: (tempId: string, newTask: any) => void;
}

export default function MessageContextMenu({
  message,
  position,
  currentUser,
  messageInputRef,
  onClose,
  onReply,
  onForward,
  onEdit,
  onShowEventSelector,
  onLoadCalendars,
  defaultListId,
  onTaskCreated,
  onTaskUpdated
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState(position);

  // Корректировка позиции меню, чтобы оно не вылезало за границы экрана
  useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let { top, left } = position;

      // Если меню выходит за правый край
      if (left + rect.width > viewportWidth) {
        left = viewportWidth - rect.width - 10;
      }

      // Если меню выходит за нижний край
      if (top + rect.height > viewportHeight) {
        top = viewportHeight - rect.height - 10;
      }

      setCoords({ top, left });
    }
  }, [position, message]);

  if (!message) return null;

  const handleCopyText = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      alert('Текст скопирован в буфер обмена');
    }
    onClose();
  };

  const handleCreateTask = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[MessageContextMenu] handleCreateTask START');

    const username = localStorage.getItem('username');
    const tempId = `temp-${Date.now()}`;
    
    // Оптимистичное создание задачи
    const optimisticTask = {
      id: tempId,
      title: message.content || 'Новая задача из сообщения',
      description: `Создано из сообщения от ${message.authorId}`,
      status: 'todo',
      priority: 'medium',
      authorId: currentUser?.id,
      assignedById: currentUser?.id,
      assignedTo: null,
      assignedToIds: [],
      listId: defaultListId || undefined,
      createdBy: username,
      createdAt: new Date().toISOString(),
      isCompleted: false,
      tags: [],
    };

    console.log('[MessageContextMenu] Optimistic task created:', optimisticTask);

    if (onTaskCreated) {
      console.log('[MessageContextMenu] Calling onTaskCreated callback');
      onTaskCreated(optimisticTask);
      console.log('[MessageContextMenu] Closing menu');
      onClose(); // Закрываем меню сразу
    }

    console.log('[MessageContextMenu] Sending request to server (fire and forget)');
    // Запускаем запрос в фоне без await
    fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: message.content || 'Новая задача из сообщения',
        description: `Создано из сообщения от ${message.authorId}`,
        status: 'todo',
        priority: 'medium',
        authorId: currentUser?.id,
        assignedById: currentUser?.id,
        createdBy: username,
        ...(defaultListId ? { listId: defaultListId } : {})
      }),
    }).then(res => {
      console.log('[MessageContextMenu] Server response status:', res.status);
      if (res.ok) {
        return res.json();
      } else {
        console.error('[MessageContextMenu] Failed to create task, status:', res.status);
        return null;
      }
    }).then(newTodo => {
      if (newTodo && onTaskUpdated) {
        console.log('[MessageContextMenu] Task created on server:', newTodo.id);
        console.log('[MessageContextMenu] Calling onTaskUpdated callback');
        onTaskUpdated(tempId, newTodo);
      }
    }).catch(error => {
      console.error('[MessageContextMenu] Error creating task:', error);
    });

    console.log('[MessageContextMenu] handleCreateTask END');
    return false; // Предотвращаем любое дефолтное поведение
  };

  const handleCreateEvent = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onLoadCalendars().then(() => {
      onShowEventSelector(message);
      onClose();
    });
    return false;
  };

  const canEdit = currentUser && message.authorId === currentUser.id;

  const content = (
    <div className="fixed inset-0 z-[99999] isolate">
      {/* Backdrop - ловит клики мимо */}
      <div 
        className="fixed inset-0 bg-transparent" 
        onMouseDown={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          onClose(); // Для мобильных
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />
      
      {/* Само меню */}
      <div
        ref={menuRef}
        className="fixed bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl min-w-[200px] overflow-hidden"
        style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
        onMouseDown={(e) => e.stopPropagation()} // Чтобы клик внутри меню не закрывал его
      >
      <button
          type="button"
          onClick={() => {
            onReply(message);
            messageInputRef.current?.focus();
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
        >
          <Reply className="w-4 h-4 text-blue-400" />
          Ответить
        </button>

        <button
          type="button"
          onClick={() => {
            onForward(message);
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
        >
          <Forward className="w-4 h-4 text-green-400" />
          Переслать
        </button>

        {message.content && (
          <button
            type="button"
            onClick={handleCopyText}
            className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
          >
            <Copy className="w-4 h-4 text-yellow-400" />
            Скопировать текст
          </button>
        )}

        {canEdit && (
          <button
            type="button"
            onClick={() => {
              onEdit(message.id, message.content || '');
              messageInputRef.current?.focus();
              onClose();
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
          >
            <Edit3 className="w-4 h-4 text-orange-400" />
            Редактировать
          </button>
        )}

        <button
          type="button"
          onClick={handleCreateTask}
          className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
        >
          <CheckSquare className="w-4 h-4 text-pink-400" />
          Сделать задачей
        </button>

        <button
          type="button"
          onClick={handleCreateEvent}
          className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
        >
          <CalendarPlus className="w-4 h-4 text-purple-400" />
          Сделать событием
        </button>
      </div>
    </div>
  );

  // Используем Portal чтобы меню всегда было поверх всего и не зависело от z-index родителей
  return typeof document !== 'undefined' 
    ? createPortal(content, document.body) 
    : null;
}
