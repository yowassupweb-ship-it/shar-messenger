'use client';

import React, { useRef, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Message, User } from './types';
import { Reply, Edit3, Forward, CheckSquare, CalendarPlus, Trash2 } from 'lucide-react';

interface MessageContextMenuProps {
  message: Message | null;
  position: { top: number; left: number };
  currentUser: User | null;
  messageInputRef: React.RefObject<HTMLTextAreaElement>;
  onClose: () => void;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onShowTaskSelector: (message: Message) => void;
  onLoadTodoLists: () => Promise<void>;
  onShowEventSelector: (message: Message) => void;
  onLoadCalendars: () => Promise<void>;
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
  onDelete,
  onShowTaskSelector,
  onLoadTodoLists,
  onShowEventSelector,
  onLoadCalendars,
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

  const handleCreateTask = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onLoadTodoLists().then(() => {
      onShowTaskSelector(message);
      onClose();
    }).catch((error) => {
      console.error('Error loading todo lists:', error);
    });
    return false;
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
  const canDelete = currentUser && message.authorId === currentUser.id;

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

        {canDelete && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Удалить это сообщение?')) {
                onDelete(message.id);
              }
              onClose();
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-red-500"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            Удалить
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
