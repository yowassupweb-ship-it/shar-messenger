import { useEffect, useRef, useCallback } from 'react';
import { Todo } from '@/types/todos';

interface UseAutoSaveProps {
  editingTodo: Todo | null;
  titleInputRef: React.RefObject<HTMLInputElement>;
  descriptionEditorRef: React.RefObject<HTMLDivElement>;
}

export function useAutoSave({
  editingTodo,
  titleInputRef,
  descriptionEditorRef
}: UseAutoSaveProps) {
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTodoRef = useRef<string | null>(null);

  const saveChanges = useCallback(async () => {
    if (!editingTodo || editingTodo.id.startsWith('temp-')) return;

    const title = titleInputRef.current?.value || editingTodo.title;
    const description = descriptionEditorRef.current?.innerHTML || editingTodo.description;

    const currentData = JSON.stringify({ title, description });
    if (currentData === lastSavedTodoRef.current) return;

    try {
      await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingTodo,
          title,
          description
        })
      });
      lastSavedTodoRef.current = currentData;
    } catch (error) {
      console.error('Error auto-saving todo:', error);
    }
  }, [editingTodo, titleInputRef, descriptionEditorRef]);

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(saveChanges, 15000);
  }, [saveChanges]);

  const saveBeforeClose = useCallback(async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    await saveChanges();
  }, [saveChanges]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  return {
    scheduleAutoSave,
    saveBeforeClose
  };
}
