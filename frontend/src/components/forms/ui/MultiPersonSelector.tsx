'use client';

import React, { memo, useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

export interface Person {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
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
  maxDisplay = 3
}: MultiPersonSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
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
        className="no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-sm text-left flex items-center justify-between hover:border-blue-500/50 transition-all min-h-[42px] text-gray-900 dark:text-[var(--text-primary)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm overflow-hidden will-change-transform"
        style={{ borderRadius: '20px' }}
      >
        <div className="flex-1 flex flex-wrap gap-1 items-center min-h-[24px]">
          {selectedNames.length === 0 ? (
            <span className="text-gray-400 dark:text-white/30">{placeholder}</span>
          ) : (
            <>
              {displayNames.map((name, idx) => (
                <span
                  key={selectedIds[idx]}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full text-xs"
                >
                  {name}
                  <X
                    className="w-3 h-3 hover:text-red-500 transition-colors cursor-pointer"
                    onClick={(e) => handleRemove(selectedIds[idx], name, e)}
                  />
                </span>
              ))}
              {hiddenCount > 0 && (
                <span className="text-xs text-gray-500 dark:text-white/50">+{hiddenCount}</span>
              )}
            </>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl shadow-lg max-h-60 overflow-y-auto z-50">
          {people.map((person) => {
            const isSelected = selectedIds.includes(person.id);
            
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => handleToggle(person)}
                className={`w-full px-3 py-2 text-left transition-colors text-sm flex items-center justify-between ${
                  isSelected 
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                    : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-900 dark:text-[var(--text-primary)]'
                }`}
              >
                <span>{person.name}</span>
                {person.role && (
                  <span className="text-xs text-gray-500 dark:text-white/50">{person.role}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default MultiPersonSelector;
