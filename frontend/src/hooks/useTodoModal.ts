import { Todo } from '@/types/todos';
import { useCallback } from 'react';

interface UseTodoModalProps {
  setEditingTodo: (todo: Todo | null) => void;
  todos: Todo[];
  router: any;
  isClosingModalRef: React.MutableRefObject<boolean>;
}

export function useTodoModal({
  setEditingTodo,
  todos,
  router,
  isClosingModalRef
}: UseTodoModalProps) {
  
  const openTodoModal = useCallback((todo: Todo) => {
    // Обновляем URL с параметром задачи
    const params = new URLSearchParams(window.location.search);
    params.set('task', todo.id);
    router.push(`/todos?${params.toString()}`, { scroll: false });
    
    setEditingTodo(todo);
  }, [setEditingTodo, router]);

  const closeTodoModal = useCallback(() => {
    isClosingModalRef.current = true;
    
    // Убираем параметр task из URL
    const params = new URLSearchParams(window.location.search);
    params.delete('task');
    const newUrl = params.toString() ? `/todos?${params.toString()}` : '/todos';
    router.push(newUrl, { scroll: false });
    
    setEditingTodo(null);
    
    setTimeout(() => {
      isClosingModalRef.current = false;
    }, 500);
  }, [setEditingTodo, router, isClosingModalRef]);

  const openTodoById = useCallback((todoId: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (todo) {
      openTodoModal(todo);
    }
  }, [todos, openTodoModal]);

  return {
    openTodoModal,
    closeTodoModal,
    openTodoById
  };
}
