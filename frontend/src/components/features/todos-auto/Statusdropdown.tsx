'use client';

import React, { memo, Dispatch, SetStateAction } from 'react';

interface StatusdropdownProps {
  isOpen: boolean;
  onClose: () => void;
  filterStatus: 'all' | 'todo' | 'pending' | 'in-progress' | 'review' | 'stuck';
  setFilterStatus: Dispatch<SetStateAction<'all' | 'todo' | 'pending' | 'in-progress' | 'review' | 'stuck'>>;
}

const Statusdropdown = memo(function Statusdropdown({
  isOpen,
  onClose,
  filterStatus,
  setFilterStatus
}: StatusdropdownProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
        <div className="py-1">
          {[{ value: 'all', label: 'Все статусы' }, { value: 'todo', label: 'К выполнению' }, { value: 'pending', label: 'В ожидании' }, { value: 'in-progress', label: 'В работе' }, { value: 'review', label: 'Готово к проверке' }, { value: 'stuck', label: 'Застряла' }].map(status => (
            <button
              key={status.value}
              onClick={() => { setFilterStatus(status.value as any); onClose(); }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors ${
                filterStatus === status.value ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : ''
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
});

export default Statusdropdown;
