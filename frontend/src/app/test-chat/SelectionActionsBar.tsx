'use client';

import { Forward, Trash2, X, Copy, Star } from 'lucide-react';

interface SelectionActionsBarProps {
  selectedCount: number;
  onForward: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onCopy?: () => void;
  onAddToFavorites?: () => void;
}

export default function SelectionActionsBar({
  selectedCount,
  onForward,
  onDelete,
  onCancel,
  onCopy,
  onAddToFavorites,
}: SelectionActionsBarProps) {
  return (
    <div className="w-full bg-blue-600 dark:bg-blue-700 text-white px-3 shadow-lg flex items-center min-h-[48px]">
      <div className="flex items-center justify-between w-full max-w-5xl mx-auto">
        {/* Левая часть - крестик и счетчик */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
            title="Отменить выделение"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="font-medium text-xs leading-none">
            {selectedCount} {selectedCount === 1 ? 'сообщение' : selectedCount < 5 ? 'сообщения' : 'сообщений'}
          </span>
        </div>

        {/* Правая часть - действия */}
        <div className="flex items-center gap-1">
          {onCopy && (
            <button
              onClick={onCopy}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
              title="Копировать"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
          
          {onAddToFavorites && (
            <button
              onClick={onAddToFavorites}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
              title="В избранное"
            >
              <Star className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onForward}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
            title="Переслать"
          >
            <Forward className="w-4 h-4" />
          </button>

          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
            title="Удалить"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
