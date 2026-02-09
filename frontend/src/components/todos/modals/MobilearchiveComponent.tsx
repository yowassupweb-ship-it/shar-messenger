'use client';

import React, { memo } from 'react';
import { X } from 'lucide-react';

interface MobilearchiveComponentProps {
  isOpen: boolean;
  onClose: () => void;
}}

const MobilearchiveComponent = memo(function MobilearchiveComponent({isOpen, onClose}: MobilearchiveComponentProps) {
  return (
    {showMobileArchiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 backdrop-blur-sm">
          <div className="bg-[var(--bg-tertiary)] border-t border-[var(--border-color)] rounded-t-2xl w-full flex flex-col shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h3 className="font-semibold flex items-center gap-2 text-[var(--text-primary)]">
                <Archive className="w-5 h-5 text-orange-400" />
                Архив
              </h3>
              <button
                onClick={() => setShowMobileArchiveModal(false)}
                className="p-1 hover:bg-[var(--bg-glass)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                <div className="flex-1">
                  <div className="font-medium text-[var(--text-primary)] mb-1">Показывать архив</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Отображать скрытые списки и завершенные задачи
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={showArchive}
                    onChange={(e) => setShowArchive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--bg-glass)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                <h4 className="text-sm font-medium text-orange-400 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Как работает архив
                </h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Архивированные списки скрыты с главной доски. В архиве вы можете просматривать старые задачи и при необходимости восстанавливать их.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
              <button
                onClick={() => setShowMobileArchiveModal(false)}
                className="w-full py-3 bg-[var(--bg-glass-hover)] text-[var(--text-primary)] font-medium rounded-xl border border-[var(--border-color)] active:scale-95 transition-all"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
  );
});

export default MobilearchiveComponent;
