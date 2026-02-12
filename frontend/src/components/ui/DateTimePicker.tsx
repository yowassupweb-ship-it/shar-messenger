'use client';

import React, { memo } from 'react';
import { Calendar, X } from 'lucide-react';

interface DateTimePickerProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  showTime?: boolean;
  className?: string;
}

const DateTimePicker = memo(function DateTimePicker({
  value,
  onChange,
  placeholder = 'Выберите дату',
  disabled = false,
  allowClear = true,
  showTime = false,
  className = ''
}: DateTimePickerProps) {
  const inputType = showTime ? 'datetime-local' : 'date';
  
  const handleClear = () => {
    onChange(undefined);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type={inputType}
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        disabled={disabled}
        placeholder={placeholder}
        className="no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-sm focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm text-gray-900 dark:text-[var(--text-primary)]"
        style={{ borderRadius: '20px' }}
      />
      {allowClear && value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-10 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-3 h-3 text-gray-500 dark:text-white/50" />
        </button>
      )}
    </div>
  );
});

export default DateTimePicker;
