'use client';

import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { Message } from '@/components/features/messages/types';

interface PinnedMessageBarProps {
  pinnedMessages: Message[];
  onGoToMessage: (messageId: string) => void;
  onUnpinMessage: (messageId: string) => void;
  canUnpin: boolean;
  isMobile?: boolean;
}

export default function PinnedMessageBar({
  pinnedMessages,
  onGoToMessage,
  onUnpinMessage,
  canUnpin,
  isMobile = false,
}: PinnedMessageBarProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // Reset index if current is out of bounds
    if (currentIndex >= pinnedMessages.length) {
      setCurrentIndex(Math.max(0, pinnedMessages.length - 1));
    }
  }, [pinnedMessages.length, currentIndex]);

  if (pinnedMessages.length === 0) {
    return null;
  }

  const currentMessage = pinnedMessages[currentIndex];
  const hasMultiple = pinnedMessages.length > 1;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : pinnedMessages.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < pinnedMessages.length - 1 ? prev + 1 : 0));
  };

  const getPreviewText = (message: Message): string => {
    if (message.isDeleted) return 'Сообщение удалено';
    if (message.attachments && message.attachments.length > 0) {
      const attachment = message.attachments[0];
      if (attachment.type === 'image') return '🖼 Фото';
      if (attachment.type === 'video') return '🎥 Видео';
      if (attachment.type === 'audio') return '🎵 Аудио';
      return '📎 Файл';
    }
    return message.content || 'Сообщение без текста';
  };
  
  const handleContextMenu = (e: React.MouseEvent) => {
    if (!canUnpin) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };
  
  const handleUnpin = () => {
    onUnpinMessage(String(currentMessage.id));
    setContextMenu(null);
  };
  
  useEffect(() => {
    if (!contextMenu) return;
    
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [contextMenu]);

  // Desktop: pill style like header islands with two-line layout and size constraints
  // Mobile: full-width bar below header
  const desktopClasses = 'h-10 px-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 inline-flex items-center gap-2 w-full';
  const mobileClasses = 'w-full h-[25px] py-0 bg-gray-100/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-2 flex items-center gap-1.5 shadow-sm';

  return (
    <>
      <div 
        className={isMobile ? mobileClasses : desktopClasses}
        onContextMenu={handleContextMenu}
      >
        {/* Navigation arrows (if multiple pinned) */}
        {hasMultiple && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={goToPrevious}
              className="p-0 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
              title="Предыдущее"
            >
            <ChevronUp className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={goToNext}
            className="p-0 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
            title="Следующее"
          >
            <ChevronDown className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      )}

      {/* Message preview (clickable) - two-line layout on desktop */}
      <button
        onClick={() => onGoToMessage(String(currentMessage.id))}
        onContextMenu={handleContextMenu}
        className={isMobile 
          ? 'flex-1 min-w-0 text-left hover:bg-gray-200 dark:hover:bg-slate-700 rounded px-1.5 py-0 transition-colors h-full flex items-center'
          : 'flex-1 min-w-0 text-left hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-full px-2 py-0.5 transition-colors flex flex-col justify-center'
        }
      >
        {isMobile ? (
          <div className="flex items-center gap-1.5 w-full">
              <span className="text-[10px] font-semibold flex-shrink-0 text-gray-700 dark:text-gray-300">
                {hasMultiple ? `${currentIndex + 1}/${pinnedMessages.length}` : 'Закреплено'}
              </span>
              <span className="text-[10px] truncate text-gray-600 dark:text-gray-400">
                {getPreviewText(currentMessage)}
              </span>
            </div>
          ) : (
            <>
              {/* First line: label */}
              <div className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 leading-tight">
                {hasMultiple ? `Закреплено ${currentIndex + 1}/${pinnedMessages.length}` : 'Закреплено'}
              </div>
              {/* Second line: preview text */}
              <div className="text-[10px] text-gray-600 dark:text-gray-400 leading-tight truncate w-full">
                {getPreviewText(currentMessage)}
              </div>
            </>
          )}
        </button>
      </div>
      
      {/* Context menu popup */}
      {contextMenu && canUnpin && (
        <div
          className="fixed z-[100] bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[150px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={handleUnpin}
            className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            Открепить сообщение
          </button>
        </div>
      )}
    </>
  );
}

// Component for pinned message action (like date divider)
export function PinnedMessageAction({ pinnerName }: { pinnerName: string }) {
  return (
    <div className="flex justify-center my-3">
      <span className="px-3 py-1 rounded-full bg-white/70 dark:bg-slate-800/70 border border-gray-200 dark:border-gray-700 text-[11px] text-gray-600 dark:text-gray-300">
        {pinnerName} закрепил(а) сообщение
      </span>
    </div>
  );
}
