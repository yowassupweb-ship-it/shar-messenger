import { useCallback } from 'react';
// Import Todo type with recurrence field
import type { Todo, Person, TodoList, CalendarList } from '@/types/todos';

export function useTodoActions(
  todos: Todo[],
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>,
  people: Person[],
  lists: TodoList[],
  calendarLists: CalendarList[],
  myAccountId: string | null,
  createTaskNotification: (todo: Todo, type: 'new_task' | 'assignment' | 'status_change', oldStatus?: string) => void,
  closeTodoModal: () => void,
  TZ_LIST_ID: string
) {
  const addTodo = useCallback(async (
    listId: string,
    newTodoTitle: string,
    newTodoDescription: string,
    newTodoAssigneeId: string | null,
    onSuccess: () => void
  ) => {
    if (!newTodoTitle.trim()) return;
    
    const myAccount = myAccountId ? people.find(p => p.id === myAccountId) : null;
    const isExecutor = myAccount && myAccount.role === 'executor';
    const isCustomer = myAccount && (myAccount.role === 'customer' || myAccount.role === 'universal');
    const selectedAssignee = newTodoAssigneeId ? people.find(p => p.id === newTodoAssigneeId) : null;
    
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTodoTitle,
          description: newTodoDescription,
          listId: listId,
          priority: 'medium',
          ...(selectedAssignee && { assignedToId: selectedAssignee.id, assignedTo: selectedAssignee.name }),
          ...(!selectedAssignee && isExecutor && { assignedToId: myAccount.id, assignedTo: myAccount.name }),
          ...(isCustomer && { assignedById: myAccount.id, assignedBy: myAccount.name })
        })
      });
      
      if (res.ok) {
        const newTodo = await res.json();
        setTodos(prev => [...prev, newTodo]);
        onSuccess();
        
        if (newTodo.assignedToId) {
          createTaskNotification(newTodo, 'new_task');
        }
      }
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  }, [myAccountId, people, setTodos, createTaskNotification]);

  const toggleTodo = useCallback(async (todo: Todo) => {
    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todo.id,
          completed: !todo.completed
        })
      });
      
      if (res.ok) {
        setTodos(prev => prev.map(t => 
          t.id === todo.id ? { ...t, completed: !t.completed } : t
        ));
      }
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  }, [setTodos]);

  const sendToCalendar = async (todo: Todo): Promise<string | null> => {
    try {
      const list = lists.find(l => l.id === todo.listId);
      const isTZ = todo.listId === TZ_LIST_ID;
      const baseDate = todo.dueDate || new Date().toISOString().split('T')[0];
      const datesToAdd: string[] = [baseDate];

      if (todo.recurrence && todo.recurrence !== 'once') {
        const startDate = new Date(baseDate);
        const limitDate = new Date(startDate);
        limitDate.setFullYear(startDate.getFullYear() + 2);
        let currentDate = new Date(startDate);

        for (let i = 0; i < 365; i++) {
          const nextDate = new Date(currentDate);
          if (todo.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
          else if (todo.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          else if (todo.recurrence === 'biweekly') nextDate.setDate(nextDate.getDate() + 14);
          else if (todo.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
          else if (todo.recurrence === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
          else if (todo.recurrence === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

          if (nextDate > limitDate) break;
          datesToAdd.push(nextDate.toISOString().split('T')[0]);
          currentDate = nextDate;
        }
      }
      
      const results = await Promise.all(datesToAdd.map(async (date) => {
        const eventData = {
          title: todo.title,
          description: [
            todo.description ? todo.description.replace(/<[^>]*>/g, ' ') : '',
            todo.assignedTo ? `Исполнитель: ${todo.assignedTo}` : '',
            todo.assignedBy ? `Постановщик: ${todo.assignedBy}` : '',
            list?.name ? `Список: ${list.name}` : '',
            todo.linkUrl ? `Ссылка: ${todo.linkUrl}` : ''
          ].filter(Boolean).join('\n'),
          date,
          priority: todo.priority || 'medium',
          type: isTZ ? 'tz' : 'task',
          listId: todo.calendarListId || (calendarLists.length > 0 ? calendarLists[0].id : undefined),
          sourceId: todo.id,
          assignedTo: todo.assignedTo,
          assignedBy: todo.assignedBy,
          listName: list?.name,
          linkUrl: todo.linkUrl,
          linkTitle: todo.linkTitle,
          recurrence: todo.recurrence || 'once'
        };

        const response = await fetch('/api/calendar-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Calendar error');
        }

        return response.json();
      }));

      const calendarEventId = results[0]?.id;
      if (calendarEventId) {
        await fetch('/api/todos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: todo.id, calendarEventId })
        });
      }
      return calendarEventId || null;
    } catch (error) {
      console.error('Error sending to calendar:', error);
      alert('Не удалось связаться с сервером календаря');
      return null;
    }
  };

  const updateTodo = async (todo: Todo) => {
    try {
      const isNewTodo = todo.id.startsWith('temp-');
      const currentTodo = !isNewTodo ? todos.find(t => t.id === todo.id) : null;
      const statusChanged = currentTodo && currentTodo.status !== todo.status;
      const oldStatus = currentTodo?.status;
      
      const res = await fetch('/api/todos', {
        method: isNewTodo ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isNewTodo ? {
          ...todo,
          id: undefined,
        } : todo)
      });
      
      if (res.ok) {
        let updated = await res.json();
        
        if (todo.addToCalendar && !updated.calendarEventId) {
          const calendarResult = await sendToCalendar(updated);
          if (calendarResult) {
            updated = { ...updated, calendarEventId: calendarResult };
          }
        }
        
        if (statusChanged) {
          createTaskNotification(todo, 'status_change', oldStatus);
        }
        
        const assigneeChanged = currentTodo && currentTodo.assignedToId !== todo.assignedToId;
        if (assigneeChanged && todo.assignedToId) {
          createTaskNotification(todo, 'assignment');
        }
        
        if (isNewTodo) {
          setTodos(prev => [...prev, updated]);
          if (todo.assignedToId) {
            createTaskNotification(updated, 'assignment');
          }
        } else {
          setTodos(prev => prev.map(t => t.id === todo.id ? updated : t));
        }
        
        closeTodoModal();
      }
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const moveTodo = useCallback(async (todoId: string, newListId: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo || todo.listId === newListId) return;
    
    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todoId,
          listId: newListId
        })
      });
      
      if (res.ok) {
        setTodos(prev => prev.map(t => 
          t.id === todoId ? { ...t, listId: newListId } : t
        ));
      }
    } catch (error) {
      console.error('Error moving todo:', error);
    }
  }, [todos, setTodos]);

  const deleteTodo = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/todos?id=${id}`, { method: 'DELETE' });
      
      if (res.ok) {
        setTodos(prev => prev.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  }, [setTodos]);

  const toggleArchiveTodo = useCallback(async (todoId: string, archive: boolean) => {
    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todoId,
          archived: archive
        })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setTodos(prev => prev.map(t => t.id === todoId ? updated : t));
      }
    } catch (error) {
      console.error('Error archiving todo:', error);
    }
  }, [setTodos]);

  return {
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    moveTodo,
    toggleArchiveTodo,
    sendToCalendar
  };
}
