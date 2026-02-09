'use client';

import React, { memo } from 'react';
import { Archive, Filter, Plus } from 'lucide-react';

interface MobileheadermenuProps {
  isOpen: boolean;
  onClose: () => void;
  setShowMobileFiltersModal: (show: boolean) => void;
  setShowMobileArchiveModal: (show: boolean) => void;
  setShowAddList: (show: boolean) => void;
}

const Mobileheadermenu = memo(function Mobileheadermenu({
  isOpen,
  onClose,
  setShowMobileFiltersModal,
  setShowMobileArchiveModal,
  setShowAddList
}: MobileheadermenuProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
        <div className="py-1">
          <button
            onClick={() => { setShowMobileFiltersModal(true); onClose(); }}
            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Фильтры
          </button>
          <button
            onClick={() => { setShowMobileArchiveModal(true); onClose(); }}
            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Archive className="w-4 h-4" />
            Архив
          </button>
          <button
            onClick={() => { setShowAddList(true); onClose(); }}
            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-green-400"
          >
            <Plus className="w-4 h-4" />
            Добавить список
          </button>
        </div>
      </div>
    </>
  );
});

export default Mobileheadermenu;
