'use client';

import React from 'react';
import { Message, User } from './types';
import { Reply, Copy, Edit3, Forward, CheckSquare, CalendarPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  onLoadCalendars
}: MessageContextMenuProps) {
  const router = useRouter();

  if (!message) return null;

  const handleCopyText = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      alert('Текст скопирован в буфер обмена');
    }
    onClose();
  };

  const handleCreateTask = async () => {
    try {
      const username = localStorage.getItem('username');
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: message.content || 'Новая задача из сообщения',
          description: `Создано из сообщения от ${message.authorId}`,
          status: 'todo',
          priority: 'medium',
          createdBy: username,
        }),
      });

      if (res.ok) {
        const newTodo = await res.json();
        router.push(`/todos?id=${newTodo.id}`);
      } else {
        alert('Ошибка при создании задачи');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Ошибка при создании задачи');
    }
    onClose();
  };

  const handleCreateEvent = async () => {
    await onLoadCalendars();
    onShowEventSelector(message);
    onClose();
  };

  const canEdit = currentUser && message.authorId === currentUser.id;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={onClose}
      />

      {/* Context Menu */}
      <div
        className="fixed z-[9999] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl min-w-[200px] overflow-hidden"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
      >
        <button
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
            onClick={handleCopyText}
            className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
          >
            <Copy className="w-4 h-4 text-yellow-400" />
            Скопировать текст
          </button>
        )}

        {canEdit && (
          <button
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
          onClick={handleCreateTask}
          className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
        >
          <CheckSquare className="w-4 h-4 text-pink-400" />
          Сделать задачей
        </button>

        <button
          onClick={handleCreateEvent}
          className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
        >
          <CalendarPlus className="w-4 h-4 text-purple-400" />
          Сделать событием
        </button>
      </div>
    </>
  );
}
