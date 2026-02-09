import React from 'react';
import { X, Edit3 } from 'lucide-react';

interface RenameChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newName: string) => void;
  newChatName: string;
  setNewChatName: (value: string) => void;
}

export default function RenameChatModal({
  isOpen,
  onClose,
  onRename,
  newChatName,
  setNewChatName,
}: RenameChatModalProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setNewChatName('');
  };

  const handleRename = () => {
    if (newChatName.trim()) {
      onRename(newChatName);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h3 className="font-semibold flex items-center gap-2 text-[var(--text-primary)]">
            <Edit3 className="w-5 h-5 text-cyan-400" />
            Переименовать чат
          </h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-[var(--bg-tertiary)] rounded"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>
        <div className="p-4">
          <input
            type="text"
            placeholder="Название группы..."
            value={newChatName}
            onChange={(e) => setNewChatName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl text-sm text-gray-900 dark:text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-cyan-400"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRename();
              }
            }}
          />
        </div>
        <div className="flex gap-2 p-4 border-t border-[var(--border-color)]">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 bg-gray-200 dark:bg-[var(--bg-tertiary)] text-gray-700 dark:text-[var(--text-secondary)] rounded-xl text-sm font-medium hover:bg-gray-300 dark:hover:bg-[var(--bg-primary)] transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleRename}
            disabled={!newChatName.trim()}
            className="flex-1 py-2.5 bg-cyan-500 text-white rounded-xl text-sm font-medium hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
