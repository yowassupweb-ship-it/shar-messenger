import { useCallback } from 'react';
import type { Task } from '@/components/features/messages/types';

interface UseTaskIntegrationParams {
  currentUser: { id: string } | null;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setEvents: React.Dispatch<React.SetStateAction<any[]>>;
}

export function useTaskIntegration({
  currentUser,
  setTasks,
  setEvents
}: UseTaskIntegrationParams) {
  
  const loadTasks = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const res = await fetch(`/api/todos`);
      if (res.ok) {
        const data = await res.json();
        const tasksArray = data.todos || [];
        setTasks(tasksArray);
        console.log('Loaded all tasks:', tasksArray.length);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    }
  }, [currentUser, setTasks]);

  const loadEvents = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const res = await fetch(`/api/events?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        const eventsArray = data.events || [];
        setEvents(eventsArray);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    }
  }, [currentUser, setEvents]);

  const createTaskFromMessage = useCallback(async (messageText: string, chatId: string) => {
    if (!currentUser) return null;
    
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: messageText.substring(0, 100),
          description: messageText,
          chatId,
          assignedById: currentUser.id,
          listId: 'default'
        })
      });
      
      if (res.ok) {
        const newTask = await res.json();
        await loadTasks();
        return newTask;
      }
      return null;
    } catch (error) {
      console.error('Error creating task:', error);
      return null;
    }
  }, [currentUser, loadTasks]);

  const createEventFromMessage = useCallback(async (messageText: string, calendarListId: string) => {
    if (!currentUser) return null;
    
    try {
      const res = await fetch('/api/calendar-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: messageText.substring(0, 100),
          description: messageText,
          date: new Date().toISOString().split('T')[0],
          listId: calendarListId
        })
      });
      
      if (res.ok) {
        const newEvent = await res.json();
        await loadEvents();
        return newEvent;
      }
      return null;
    } catch (error) {
      console.error('Error creating event:', error);
      return null;
    }
  }, [currentUser, loadEvents]);

  return {
    loadTasks,
    loadEvents,
    createTaskFromMessage,
    createEventFromMessage
  };
}
