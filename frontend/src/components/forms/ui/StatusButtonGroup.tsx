'use client';

import React, { memo } from 'react';

export interface StatusOption {
  value: string;
  label: string;
  color: 'orange' | 'blue' | 'green' | 'red' | 'yellow';
}

interface StatusButtonGroupProps {
  value?: string;
  options: StatusOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

const colorStyles = {
  orange: {
    active: 'bg-gradient-to-br from-orange-500/20 to-orange-600/30 text-orange-500 dark:text-orange-400 ring-1 ring-orange-500/50',
    hover: 'hover:from-orange-500/10 hover:to-orange-600/20 hover:text-orange-500 dark:hover:text-orange-400'
  },
  blue: {
    active: 'bg-gradient-to-br from-blue-500/20 to-blue-600/30 text-blue-500 dark:text-blue-400 ring-1 ring-blue-500/50',
    hover: 'hover:from-blue-500/10 hover:to-blue-600/20 hover:text-blue-500 dark:hover:text-blue-400'
  },
  green: {
    active: 'bg-gradient-to-br from-green-500/20 to-green-600/30 text-green-500 dark:text-green-400 ring-1 ring-green-500/50',
    hover: 'hover:from-green-500/10 hover:to-green-600/20 hover:text-green-500 dark:hover:text-green-400'
  },
  red: {
    active: 'bg-gradient-to-br from-red-500/20 to-red-600/30 text-red-500 dark:text-red-400 ring-1 ring-red-500/50',
    hover: 'hover:from-red-500/10 hover:to-red-600/20 hover:text-red-500 dark:hover:text-red-400'
  },
  yellow: {
    active: 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/30 text-yellow-500 ring-1 ring-yellow-500/50',
    hover: 'hover:from-yellow-500/10 hover:to-yellow-600/20 hover:text-yellow-500'
  }
};

const StatusButtonGroup = memo(function StatusButtonGroup({
  value,
  options,
  onChange,
  disabled = false
}: StatusButtonGroupProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((option) => {
        const isActive = value === option.value;
        const styles = colorStyles[option.color];
        
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-[background-color,color] select-none ${
              isActive
                ? `${styles.active} shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-sm`
                : `bg-gradient-to-br from-white/5 to-white/10 text-gray-500 dark:text-white/50 ${styles.hover} shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm border border-white/10`
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
});

export default StatusButtonGroup;
