'use client';

import { Search, Archive, Trash2, X } from 'lucide-react';

interface ChatActionsMenuProps {
  onSearch: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onClose: () => void;
  isMobile?: boolean;
}

export default function ChatActionsMenu({ onSearch, onArchive, onDelete, onClose, isMobile = false }: ChatActionsMenuProps) {
  const handleSearch = () => {
    onSearch();
    onClose();
  };

  const handleArchive = () => {
    onArchive();
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Удалить этот чат?')) {
      onDelete();
      onClose();
    }
  };

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col animate-slide-up">
          <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
            <div className="font-semibold text-gray-900 dark:text-gray-100">Действия</div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors" title="Закрыть"><X className="w-5 h-5 text-gray-600 dark:text-gray-300" /></button>
          </div>
          <div className="p-4 space-y-2">
            <button onClick={handleSearch} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"><Search className="w-5 h-5 text-gray-600 dark:text-gray-300" /><span className="text-sm font-medium text-gray-900 dark:text-gray-100">Поиск по сообщениям</span></button>
            <button onClick={handleArchive} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"><Archive className="w-5 h-5 text-gray-600 dark:text-gray-300" /><span className="text-sm font-medium text-gray-900 dark:text-gray-100">В архив</span></button>
            <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" /><span className="text-sm font-medium text-red-600 dark:text-red-400">Удалить чат</span></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-12 right-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-30 overflow-hidden">
      <button onClick={handleSearch} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-gray-700"><Search className="w-5 h-5 text-gray-600 dark:text-gray-300" /><span className="text-sm font-medium text-gray-900 dark:text-gray-100">Поиск по сообщениям</span></button>
      <button onClick={handleArchive} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-gray-700"><Archive className="w-5 h-5 text-gray-600 dark:text-gray-300" /><span className="text-sm font-medium text-gray-900 dark:text-gray-100">В архив</span></button>
      <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" /><span className="text-sm font-medium text-red-600 dark:text-red-400">Удалить чат</span></button>
    </div>
  );
}
