'use client';

import React, { useRef, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Message, User } from './types';
import { Reply, Edit3, Forward, CheckSquare, CalendarPlus, Trash2, Pin, PinOff, CheckCheck, Copy, ChevronDown } from 'lucide-react';
import EmojiPicker from '@/components/common/overlays/EmojiPicker';

function getTwemojiUrl(emoji: string): string {
  const codepoints: string[] = [];
  for (const symbol of Array.from(emoji)) {
    const cp = symbol.codePointAt(0);
    if (!cp || cp === 0xfe0f) continue;
    codepoints.push(cp.toString(16));
  }
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${codepoints.join('-')}.png`;
}

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
  onTogglePin: (message: Message) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onSelect?: (message: Message) => void;
  canPinMessage?: boolean;
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
  onTogglePin,
  onToggleReaction,
  onSelect,
  canPinMessage = true,
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const reactionBarRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState(position);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionsPosition, setReactionsPosition] = useState<'top' | 'bottom'>('top');
  const [emojiPickerCoords, setEmojiPickerCoords] = useState({ top: 0, left: 0 });

  // Корректировка позиции меню и панели реакций
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

      // Определяем позицию панели реакций (сверху или снизу)
      const reactionBarHeight = 48; // примерная высота панели реакций
      const spaceAbove = position.top;
      const spaceBelow = viewportHeight - position.top;
      
      // Если сверху меньше места, показываем снизу
      if (spaceAbove < reactionBarHeight + 10 && spaceBelow > reactionBarHeight + 10) {
        setReactionsPosition('bottom');
      } else {
        setReactionsPosition('top');
      }
    }
  }, [position, message]);

  // Пересчитываем позицию эмоджи-пикера при его открытии
  useLayoutEffect(() => {
    if (showEmojiPicker && emojiPickerRef.current) {
      const pickerWidth = 320; // w-80
      const pickerHeight = 384; // max-h-96
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 10; // отступ от края экрана

      let pickerTop = coords.top;
      let pickerLeft = coords.left;

      // Позиционирование по вертикали
      if (reactionsPosition === 'top') {
        // Пикер должен быть сверху от меню
        pickerTop = coords.top - pickerHeight - 10;
        // Если не влезает сверху, показываем снизу
        if (pickerTop < padding) {
          pickerTop = coords.top + 50;
        }
      } else {
        // Пикер снизу от меню
        pickerTop = coords.top + 50;
      }

      // Проверяем, не выходит ли пикер за нижний край
      if (pickerTop + pickerHeight > viewportHeight - padding) {
        pickerTop = viewportHeight - pickerHeight - padding;
      }
      // Проверяем, не выходит ли за верхний край
      if (pickerTop < padding) {
        pickerTop = padding;
      }

      // Позиционирование по горизонтали
      // Пытаемся расположить слева от меню
      if (pickerLeft + pickerWidth > viewportWidth - padding) {
        // Не влезает справа, сдвигаем влево
        pickerLeft = viewportWidth - pickerWidth - padding;
      }
      // Проверяем левый край
      if (pickerLeft < padding) {
        pickerLeft = padding;
      }

      setEmojiPickerCoords({ top: pickerTop, left: pickerLeft });
    }
  }, [showEmojiPicker, coords, reactionsPosition]);

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
  const isPinned = Boolean(message.metadata?.isPinned);
  const reactionOptions = ['👍', '🤝', '😁', '❤️', '👎', '🔥', '🥰', '😂', '😭', '🙏', '😍'];
  const reactions = Object.fromEntries(
    Object.entries(((message.metadata as any)?.reactions && typeof (message.metadata as any)?.reactions === 'object')
      ? (message.metadata as any).reactions
      : {})
      .map(([emoji, userIds]) => [
        emoji,
        Array.isArray(userIds)
          ? userIds.map((id) => String(id)).filter(Boolean)
          : [],
      ])
  ) as Record<string, string[]>;

  const handleReactionClick = (emoji: string) => {
    if (onToggleReaction) {
      onToggleReaction(String(message.id), emoji);
    }
    onClose();
  };

  const handleEmojiPickerSelect = (emoji: string) => {
    if (onToggleReaction) {
      onToggleReaction(String(message.id), emoji);
    }
    onClose();
  };

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
        className="fixed"
        style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
        onMouseDown={(e) => e.stopPropagation()} // Чтобы клик внутри меню не закрывал его
      >
        <div className="relative">
          {showEmojiPicker ? (
            <div 
              ref={emojiPickerRef}
              className="fixed z-[100000] transition-all duration-150 ease-out"
              style={{
                top: `${emojiPickerCoords.top}px`,
                left: `${emojiPickerCoords.left}px`
              }}
            >
              <EmojiPicker
                mode="inline"
                onEmojiSelect={handleEmojiPickerSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            </div>
          ) : (
            <>
              <div 
                ref={reactionBarRef}
                className={`absolute left-1/2 -translate-x-1/2 z-10 ${
                  reactionsPosition === 'top' 
                    ? '-top-1 -translate-y-full' 
                    : 'top-full mt-1'
                }`}
              >
              <div className="relative flex items-center gap-0.5 rounded-[16px] bg-[#4B446E] px-1.5 py-1 shadow-2xl border border-white/10 transition-all duration-150 ease-out">
                {reactionOptions.map((emoji) => {
                  const selectedByMe = Boolean(currentUser?.id && reactions[emoji]?.includes(String(currentUser.id)));
                  return (
                    <button
                      key={`menu-reaction-${emoji}`}
                      type="button"
                      onClick={() => handleReactionClick(emoji)}
                      className={`h-8 w-8 rounded-full text-[21px] leading-none transition-all duration-150 hover:scale-105 active:scale-95 ${
                        selectedByMe
                          ? 'bg-white/28 ring-1 ring-white/35'
                          : 'bg-transparent hover:bg-white/14'
                      }`}
                      title={`Реакция ${emoji}`}
                    >
                      <img
                        src={getTwemojiUrl(emoji)}
                        alt={emoji}
                        className="mx-auto h-[20px] w-[20px] object-contain"
                        draggable={false}
                      />
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(true)}
                  className="ml-0.5 h-7 w-7 rounded-full text-white/70 hover:text-white hover:bg-white/14 transition-colors"
                  title="Открыть расширенный пикер эмодзи"
                >
                  <ChevronDown className="mx-auto h-4 w-4 rotate-180" />
                </button>
              </div>
              </div>

              <div ref={menuRef} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl min-w-[200px] overflow-hidden py-1">
            <button
              type="button"
              onClick={() => {
                onReply(message);
                messageInputRef.current?.focus();
                onClose();
              }}
              className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
            >
              <Reply className="w-4 h-4 text-blue-400" />
              Ответить
            </button>

            {onSelect && (
              <button
                type="button"
                onClick={() => {
                  onSelect(message);
                  onClose();
                }}
                className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
              >
                <CheckCheck className="w-4 h-4 text-indigo-400" />
                Выбрать
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onForward(message);
                onClose();
              }}
              className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
            >
              <Forward className="w-4 h-4 text-green-400" />
              Переслать
            </button>

            <button
              type="button"
              onClick={() => {
                const selected = typeof window !== 'undefined' ? window.getSelection()?.toString().trim() : '';
                const textToCopy = selected || message.content || '';
                navigator.clipboard.writeText(textToCopy).catch(() => {
                  const el = document.createElement('textarea');
                  el.value = textToCopy;
                  document.body.appendChild(el);
                  el.select();
                  document.execCommand('copy');
                  document.body.removeChild(el);
                });
                onClose();
              }}
              className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
            >
              <Copy className="w-4 h-4 text-sky-400" />
              Копировать
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit(message.id, message.content || '');
                  messageInputRef.current?.focus();
                  onClose();
                }}
                className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
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
                className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-red-500"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
                Удалить
              </button>
            )}

            {canPinMessage && (
              <button
                type="button"
                onClick={() => {
                  onTogglePin(message);
                  onClose();
                }}
                className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
              >
                {isPinned ? (
                  <PinOff className="w-4 h-4 text-amber-400" />
                ) : (
                  <Pin className="w-4 h-4 text-cyan-400" />
                )}
                {isPinned ? 'Открепить сообщение' : 'Закрепить сообщение'}
              </button>
            )}

            <button
              type="button"
              onClick={handleCreateTask}
              className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
            >
              <CheckSquare className="w-4 h-4 text-pink-400" />
              Сделать задачей
            </button>

            <button
              type="button"
              onClick={handleCreateEvent}
              className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
            >
              <CalendarPlus className="w-4 h-4 text-purple-400" />
              Сделать событием
            </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Используем Portal чтобы меню всегда было поверх всего и не зависело от z-index родителей
  return typeof document !== 'undefined' 
    ? createPortal(content, document.body) 
    : null;
}
