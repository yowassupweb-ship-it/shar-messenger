import { useCallback } from 'react';
import type { Todo, TodoList, Person, CalendarList } from '@/types/todos';

interface UseTodoDataLoaderProps {
  myAccountId: string | null;
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
  setLists: React.Dispatch<React.SetStateAction<TodoList[]>>;
  setCategories: React.Dispatch<React.SetStateAction<any[]>>;
  setPeople: React.Dispatch<React.SetStateAction<Person[]>>;
  setCalendarLists: React.Dispatch<React.SetStateAction<CalendarList[]>>;
  setIsLoading: (loading: boolean) => void;
}

export function useTodoDataLoader({
  myAccountId,
  setTodos,
  setLists,
  setCategories,
  setPeople,
  setCalendarLists,
  setIsLoading
}: UseTodoDataLoaderProps) {
  const loadData = useCallback(async () => {
    try {
      const userId = myAccountId;
      const username = localStorage.getItem('username') || '';
      console.log('[loadData] Loading with userId:', userId);
      
      const [todosRes, peopleRes, telegramRes, calendarListsRes] = await Promise.all([
        fetch(`/api/todos${userId ? `?userId=${userId}` : ''}`),
        fetch('/api/todos/people'),
        fetch('/api/todos/telegram'),
        fetch(`/api/calendar-lists?userId=${encodeURIComponent(username)}`)
      ]);
      
      const todosData = await todosRes.json();
      const peopleData = await peopleRes.json();
      const telegramData = await telegramRes.json();
      const calendarListsData = await calendarListsRes.json();
      
      console.log('[loadData] Received lists:', todosData.lists?.length || 0);
      console.log('[loadData] Received todos:', todosData.todos?.length || 0);
      
      setTodos(todosData.todos || []);
      setLists(todosData.lists || []);
      setCategories(todosData.categories || []);
      setPeople(peopleData);
      setCalendarLists(calendarListsData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setIsLoading(false);
    }
  }, [myAccountId, setTodos, setLists, setCategories, setPeople, setCalendarLists, setIsLoading]);

  return { loadData };
}
