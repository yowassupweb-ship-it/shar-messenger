'use client';

import React, { memo, useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface Person {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  department?: string;
}

interface PersonSelectorProps {
  selectedId?: string | null;
  selectedName?: string | null;
  people: Person[];
  placeholder?: string;
  onChange: (personId: string | null, personName: string | null) => void;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
}

const PersonSelector = memo(function PersonSelector({
  selectedId,
  selectedName,
  people,
  placeholder = 'Выберите человека',
  onChange,
  disabled = false,
  allowClear = true,
  className = ''
}: PersonSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fallbackName = selectedId ? people.find(person => person.id === selectedId)?.name : undefined;
  const displayName = selectedName || fallbackName;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredPeople = people.filter((person) => {
    if (!normalizedQuery) return true;
    const haystack = [person.name, person.role, person.department, person.id]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      setSearchQuery('');
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  
  const handleSelect = (person: Person) => {
    onChange(person.id, person.name);
    setIsOpen(false);
  };
  
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="no-mobile-scale w-full h-[42px] px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-sm text-left flex items-center justify-between hover:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm overflow-hidden will-change-transform"
        style={{ borderRadius: '20px' }}
      >
        <span className={`${displayName ? '' : 'text-gray-400 dark:text-white/30'} truncate whitespace-nowrap`}>
          {displayName || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {allowClear && selectedId && (
            <X 
              className="w-4 h-4 hover:text-red-500 transition-colors" 
              onClick={handleClear}
            />
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl shadow-lg max-h-60 overflow-y-auto z-50 min-w-[260px]">
          <div className="sticky top-0 z-10 p-2 bg-white/95 dark:bg-[var(--bg-secondary)]/95 backdrop-blur-sm border-b border-gray-200 dark:border-[var(--border-color)]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          {filteredPeople.length > 0 ? filteredPeople.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => handleSelect(person)}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-sm text-gray-900 dark:text-[var(--text-primary)]"
            >
              <div className="flex items-center justify-between">
                <span className="truncate">{person.name}</span>
                {person.role && (
                  <span className="text-xs text-gray-500 dark:text-white/50">{person.role}</span>
                )}
              </div>
              <div className="text-[10px] text-gray-500 dark:text-white/40">
                {person.department || 'Без отдела'}
              </div>
            </button>
          )) : (
            <div className="px-3 py-3 text-xs text-gray-500 dark:text-white/50">Ничего не найдено</div>
          )}
        </div>
      )}
    </div>
  );
});

export default PersonSelector;
