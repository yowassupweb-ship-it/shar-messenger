import { useCallback, useRef } from 'react';
import { Todo } from '@/types/todos';

interface UseTodoDragDropProps {
  todos: Todo[];
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
  draggedTodo: Todo | null;
  setDraggedTodo: (todo: Todo | null) => void;
  setDragOverListId: (id: string | null) => void;
  setDragOverTodoId: (id: string | null) => void;
  moveTodo: (todoId: string, listId: string) => void;
}

export function useTodoDragDrop({
  todos,
  setTodos,
  draggedTodo,
  setDraggedTodo,
  setDragOverListId,
  setDragOverTodoId,
  moveTodo
}: UseTodoDragDropProps) {
  const dragCounter = useRef(0);

  const handleDragStart = useCallback((e: React.DragEvent, todo: Todo) => {
    setDraggedTodo(todo);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', todo.id);
    e.dataTransfer.setData('type', 'todo');
    // Добавляем задержку для красивой анимации
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = '0.5';
    }, 0);
  }, [setDraggedTodo]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedTodo(null);
    setDragOverListId(null);
    setDragOverTodoId(null);
    dragCounter.current = 0;
  }, [setDraggedTodo, setDragOverListId, setDragOverTodoId]);

  const handleDragEnter = useCallback((e: React.DragEvent, listId: string) => {
    e.preventDefault();
    if (draggedTodo) {
      dragCounter.current++;
      setDragOverListId(listId);
    }
  }, [draggedTodo, setDragOverListId]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (draggedTodo) {
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setDragOverListId(null);
      }
    }
  }, [draggedTodo, setDragOverListId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Обработчик перетаскивания над задачей (для вертикального изменения порядка)
  const handleTodoDragOver = useCallback((e: React.DragEvent, todoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTodo && draggedTodo.id !== todoId) {
      setDragOverTodoId(todoId);
    }
  }, [draggedTodo, setDragOverTodoId]);

  // Обработчик drop на задачу (для вертикального изменения порядка)
  const handleTodoDrop = useCallback(async (e: React.DragEvent, targetTodo: Todo) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedTodo || draggedTodo.id === targetTodo.id) return;
    
    // Получаем все задачи этого списка
    const listTodos = todos
      .filter(t => t.listId === targetTodo.listId && !t.archived)
      .sort((a, b) => a.order - b.order);
    
    const draggedIndex = listTodos.findIndex(t => t.id === draggedTodo.id);
    const targetIndex = listTodos.findIndex(t => t.id === targetTodo.id);
    
    if (draggedIndex === -1) {
      // Задача из другого списка - перемещаем в новый список на позицию targetIndex
      const newOrder = targetTodo.order;
      const updatedTodo = { ...draggedTodo, listId: targetTodo.listId, order: newOrder };
      
      // Получаем задачи, которые нужно сдвинуть
      const todosToShift = todos.filter(
        t => t.listId === targetTodo.listId && t.order >= newOrder && t.id !== draggedTodo.id && !t.archived
      ).map(t => ({ ...t, order: t.order + 1 }));
      
      // Обновляем порядок остальных задач
      const updatedTodos = todos.map(t => {
        if (t.id === draggedTodo.id) {
          return updatedTodo;
        }
        const shiftedTodo = todosToShift.find(st => st.id === t.id);
        if (shiftedTodo) {
          return shiftedTodo;
        }
        return t;
      });
      
      setTodos(updatedTodos);
      
      // Сохраняем на сервер все изменённые задачи
      try {
        await Promise.all([
          fetch('/api/todos', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedTodo)
          }),
          ...todosToShift.map(todo =>
            fetch('/api/todos', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(todo)
            })
          )
        ]);
      } catch (error) {
        console.error('Error moving todo:', error);
      }
    } else {
      // Задача из того же списка - меняем порядок
      const newListTodos = [...listTodos];
      const [removed] = newListTodos.splice(draggedIndex, 1);
      newListTodos.splice(targetIndex, 0, removed);
      
      // Обновляем order для всех задач в списке
      const updatedListTodos = newListTodos.map((t, index) => ({ ...t, order: index }));
      
      const updatedTodos = todos.map(t => {
        const updatedTodo = updatedListTodos.find(lt => lt.id === t.id);
        if (updatedTodo) {
          return updatedTodo;
        }
        return t;
      });
      
      setTodos(updatedTodos);
      
      // Сохраняем на сервер все задачи списка с новым order
      try {
        await Promise.all(
          updatedListTodos.map(todo =>
            fetch('/api/todos', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(todo)
            })
          )
        );
      } catch (error) {
        console.error('Error reordering todos:', error);
      }
    }
    
    setDraggedTodo(null);
    setDragOverTodoId(null);
    setDragOverListId(null);
  }, [draggedTodo, todos, setDraggedTodo, setDragOverTodoId, setDragOverListId, setTodos]);

  const handleDrop = useCallback((e: React.DragEvent, listId: string) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOverListId(null);
    setDragOverTodoId(null);
    
    if (draggedTodo) {
      moveTodo(draggedTodo.id, listId);
    }
    setDraggedTodo(null);
  }, [draggedTodo, moveTodo, setDragOverListId, setDragOverTodoId, setDraggedTodo]);

  return {
    handleDragStart,
    handleDragEnd,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleTodoDragOver,
    handleTodoDrop,
    handleDrop
  };
}
