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

interface MultiPersonSelectorProps {
  selectedIds?: string[];
  selectedNames?: string[];
  people: Person[];
  placeholder?: string;
  onChange: (personIds: string[], personNames: string[]) => void;
  disabled?: boolean;
  className?: string;
  maxDisplay?: number;
}

const MultiPersonSelector = memo(function MultiPersonSelector({
  selectedIds = [],
  selectedNames = [],
  people,
  placeholder = 'Выберите людей',
  onChange,
  disabled = false,
  className = '',
  maxDisplay = Number.MAX_SAFE_INTEGER
}: MultiPersonSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
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
  
  const handleToggle = (person: Person) => {
    const isSelected = selectedIds.includes(person.id);
    
    if (isSelected) {
      onChange(
        selectedIds.filter(id => id !== person.id),
        selectedNames.filter(name => name !== person.name)
      );
    } else {
      onChange(
        [...selectedIds, person.id],
        [...selectedNames, person.name]
      );
    }
  };
  
  const handleRemove = (personId: string, personName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(
      selectedIds.filter(id => id !== personId),
      selectedNames.filter(name => name !== personName)
    );
  };
  
  const displayNames = selectedNames.slice(0, maxDisplay);
  const hiddenCount = selectedNames.length - maxDisplay;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-sm text-left flex items-start justify-between hover:border-blue-500/50 transition-all min-h-[42px] h-auto text-gray-900 dark:text-[var(--text-primary)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm will-change-transform"
        style={{ borderRadius: '20px' }}
      >
        <div className="flex-1 flex flex-wrap gap-1 items-center min-h-[24px]">
          {selectedNames.length === 0 ? (
            <span className="text-gray-400 dark:text-white/30 truncate whitespace-nowrap">{placeholder}</span>
          ) : (
            <>
              {displayNames.map((name, idx) => {
                const personId = selectedIds[idx];
                return (
                  <span
                    key={personId || `person-${idx}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-400/40"
                  >
                    {name}
                    <X
                      className="w-3 h-3 hover:text-red-500 transition-colors cursor-pointer"
                      onClick={(e) => handleRemove(personId, name, e)}
                    />
                  </span>
                );
              })}
              {hiddenCount > 0 && (
                <span className="text-xs text-gray-500 dark:text-white/50">+{hiddenCount}</span>
              )}
            </>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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

          {filteredPeople.length > 0 ? filteredPeople.map((person) => {
            const isSelected = selectedIds.includes(person.id);
            
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => handleToggle(person)}
                className={`w-full px-3 py-2 text-left transition-colors text-sm ${
                  isSelected 
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                    : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-900 dark:text-[var(--text-primary)]'
                }`}
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
            );
          }) : (
            <div className="px-3 py-3 text-xs text-gray-500 dark:text-white/50">Ничего не найдено</div>
          )}
        </div>
      )}
    </div>
  );
});

export default MultiPersonSelector;
