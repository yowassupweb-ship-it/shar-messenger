'use client';

import React, { memo } from 'react';

interface TextAreaProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
}

const TextArea = memo(function TextArea({
  value,
  onChange,
  placeholder = '',
  disabled = false,
  rows = 3,
  className = ''
}: TextAreaProps) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      className={`no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-[20px] text-sm focus:outline-none focus:border-blue-500/50 transition-all text-gray-700 dark:text-[var(--text-secondary)] placeholder-gray-400 dark:placeholder-white/30 resize-none whitespace-pre-wrap break-words shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm ${className}`}
    />
  );
});

export default TextArea;
