import { useMemo, useCallback } from 'react';
import type { Todo, TodoList, Notification } from '@/types/todos';

interface FilteredTodos {
  listId: string;
  todos: Todo[];
}

interface UseTodoComputedValuesParams {
  todos: Todo[];
  lists: TodoList[];
  notifications: Notification[];
  myAccountId: string | null;
  searchQuery: string;
  filterStatus: 'all' | 'todo' | 'pending' | 'in-progress' | 'review' | 'stuck';
  filterExecutor: string | null;
  showCompleted: boolean;
  showArchive: boolean;
}

export function useTodoComputedValues({
  todos,
  lists,
  notifications,
  myAccountId,
  searchQuery,
  filterStatus,
  filterExecutor,
  showCompleted,
  showArchive
}: UseTodoComputedValuesParams) {
  
  // Мемоизация уведомлений
  const myNotifications = useMemo(
    () => notifications.filter(n => n.toUserId === myAccountId), 
    [notifications, myAccountId]
  );
  
  const unreadCount = useMemo(
    () => myNotifications.filter(n => !n.read).length,
    [myNotifications]
  );

  // Мемоизация фильтрованных и отсортированных задач
  const filteredAndSortedTodos = useMemo(() => {
    return lists.map(list => {
      if (list.archived && !showArchive) return { listId: list.id, todos: [] };
      
      const listTodos = todos.filter(t => {
        if (t.listId !== list.id) return false;
        if (t.archived && !showArchive) return false;
        if (!showCompleted && t.completed) return false;
        
        // Поиск
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesSearch = t.title.toLowerCase().includes(query) || 
                               t.description?.toLowerCase().includes(query);
          if (!matchesSearch) return false;
        }
        
        // Фильтр по статусу
        if (filterStatus !== 'all' && t.status !== filterStatus) return false;
        
        // Фильтр по исполнителю
        if (filterExecutor !== null) {
          const matchesFilter = t.assignedToId === filterExecutor || 
                               t.assignedToIds?.includes(filterExecutor);
          if (!matchesFilter) return false;
        }
        
        return true;
      }).sort((a, b) => {
        // Сначала незавершённые
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        // Потом по приоритету
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      });
      
      return { listId: list.id, todos: listTodos };
    });
  }, [todos, lists, searchQuery, filterStatus, filterExecutor, showCompleted, showArchive]);

  // Фильтрация задач
  const filterTodos = useCallback((todoList: Todo[], _listId?: string) => {
    return todoList.filter(todo => {
      if (!showCompleted && todo.completed) return false;
      
      // Фильтр по статусу
      if (filterStatus !== 'all') {
        if (todo.status !== filterStatus) return false;
      }
      
      // Фильтр по исполнителю (включая множественных)
      if (filterExecutor !== null) {
        const matchesFilter = todo.assignedToId === filterExecutor || todo.assignedToIds?.includes(filterExecutor);
        if (!matchesFilter) return false;
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return todo.title.toLowerCase().includes(query) || 
               todo.description?.toLowerCase().includes(query);
      }
      return true;
    });
  }, [showCompleted, filterStatus, filterExecutor, searchQuery]);

  // Получение задач для списка
  const getTodosForList = useCallback((listId: string, includeArchived: boolean = false) => {
    const cached = filteredAndSortedTodos.find(f => f.listId === listId);
    if (cached) return cached.todos;
    
    // Fallback
    const listTodos = todos.filter(t => t.listId === listId && (includeArchived || !t.archived));
    return filterTodos(listTodos, listId);
  }, [filteredAndSortedTodos, todos, filterTodos]);

  // Получение архивных задач
  const getArchivedTodos = useCallback(() => {
    return todos.filter(t => t.archived);
  }, [todos]);

  // Мемоизация неархивных списков
  const nonArchivedLists = useMemo(
    () => lists.filter(l => !l.archived).sort((a, b) => a.order - b.order),
    [lists]
  );

  // Мемоизация счетчиков задач по спискам
  const listCounts = useMemo(() => {
    return lists.reduce((acc, list) => {
      const listTodos = getTodosForList(list.id, showArchive);
      acc[list.id] = {
        completedCount: listTodos.filter(t => t.completed).length,
        totalCount: listTodos.length
      };
      return acc;
    }, {} as Record<string, { completedCount: number; totalCount: number }>);
  }, [lists, getTodosForList, showArchive]);

  return {
    myNotifications,
    unreadCount,
    filteredAndSortedTodos,
    filterTodos,
    getTodosForList,
    getArchivedTodos,
    nonArchivedLists,
    listCounts
  };
}
