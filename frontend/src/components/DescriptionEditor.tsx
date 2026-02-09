'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface DescriptionEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * 🚀 Изолированный компонент Description Editor
 * 
 * Оптимизации:
 * - Собственный state (не ререндерит родителя)
 * - Debounced onChange (400ms)
 * - contentEditable для плавного ввода
 */
export default function DescriptionEditor({
  initialValue,
  onChange,
  placeholder = 'Описание задачи...',
  className = '',
  disabled = false
}: DescriptionEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [localValue, setLocalValue] = useState(initialValue);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);

  // Синхронизация с внешним значением (только при изменении извне)
  useEffect(() => {
    if (!isUpdatingRef.current && initialValue !== localValue) {
      setLocalValue(initialValue);
      if (editorRef.current && editorRef.current.innerHTML !== initialValue) {
        editorRef.current.innerHTML = initialValue;
      }
    }
  }, [initialValue]);

  // Debounced callback в родитель
  const debouncedOnChange = useCallback((value: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      isUpdatingRef.current = true;
      onChange(value);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 50);
    }, 400);
  }, [onChange]);

  // Обработчик ввода (только локальный state + debounced onChange)
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const newValue = e.currentTarget.innerHTML;
    setLocalValue(newValue); // Локальный state - не вызывает re-render родителя
    debouncedOnChange(newValue); // Debounced callback в родитель
  }, [debouncedOnChange]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={editorRef}
      id="description-editor"
      contentEditable={!disabled}
      onInput={handleInput}
      className={`w-full flex-1 min-h-[150px] p-3 border border-gray-700 rounded-lg 
                  bg-gray-800 text-white focus:outline-none focus:ring-2 
                  focus:ring-blue-500 overflow-y-auto ${className}`}
      style={{
        minHeight: '150px',
        maxHeight: '400px'
      }}
      dangerouslySetInnerHTML={{ __html: localValue }}
      suppressContentEditableWarning
    />
  );
}
