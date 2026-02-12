'use client';

import React, { memo } from 'react';

interface Person {
  id: string;
  name: string;
  username?: string;
  role?: string;
  department?: string;
}

interface ExecutordropdownProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  filterExecutor: string | null;
  setFilterExecutor: (executorId: string | null) => void;
}

const Executordropdown = memo(function Executordropdown({
  isOpen,
  onClose,
  people,
  filterExecutor,
  setFilterExecutor
}: ExecutordropdownProps) {
  if (!isOpen) return null;

  console.log('[Executordropdown] Rendering with people:', people.length, people);
  console.log('[Executordropdown] People details:', people.map(p => ({ id: p.id, name: p.name, hasName: !!p.name })));

  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} />
      <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-[100] max-h-80 overflow-y-auto text-gray-900 dark:text-white">
        <div className="py-1 flex flex-col">
          <button
            onClick={() => { setFilterExecutor(null); onClose(); }}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors ${
              filterExecutor === null
                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'text-gray-800 dark:text-white/90'
            }`}
          >
            Все исполнители
          </button>
          {people.length === 0 && (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-white/50 italic">
              Нет исполнителей
            </div>
          )}
          {people.map((person) => (
            <button
              key={person.id}
              onClick={() => { setFilterExecutor(person.id); onClose(); }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors ${
                filterExecutor === person.id
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'text-gray-800 dark:text-white/90'
              }`}
            >
              {person.name || person.id}
            </button>
          ))}
        </div>
      </div>
    </>
  );
});

export default Executordropdown;
