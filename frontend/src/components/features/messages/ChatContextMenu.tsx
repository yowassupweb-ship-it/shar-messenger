'use client';

import React from 'react';
import { Chat, User } from './types';
import { Pin, PinOff } from 'lucide-react';

interface ChatContextMenuProps {
  chat: Chat | null;
  position: { top: number; left: number };
  currentUser: User | null;
  onClose: () => void;
  onTogglePin: (chatId: string) => void;
}

export default function ChatContextMenu({
  chat,
  position,
  currentUser,
  onClose,
  onTogglePin
}: ChatContextMenuProps) {
  if (!chat) return null;

  const isPinned = chat.pinnedByUser?.[currentUser?.id || ''];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />

      {/* Context Menu */}
      <div 
        className="fixed z-50 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl rounded-xl py-1 min-w-[200px]"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <button
          onClick={() => {
            onTogglePin(chat.id);
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
        >
          {isPinned ? (
            <>
              <PinOff className="w-4 h-4 text-cyan-400" />
              Открепить
            </>
          ) : (
            <>
              <Pin className="w-4 h-4 text-cyan-400" />
              Закрепить
            </>
          )}
        </button>
      </div>
    </>
  );
}
