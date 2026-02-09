import { useEffect } from 'react';
import { Toast, Todo } from '@/types/todos';

interface Person {
  id: string;
  name: string;
}

interface UseDeadlineCheckerProps {
  myAccountId: string | null;
  todos: Todo[];
  people: Person[];
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
}

export function useDeadlineChecker({
  myAccountId,
  todos,
  people,
  setToasts
}: UseDeadlineCheckerProps) {
  
  useEffect(() => {
    const checkDeadlines = () => {
      if (!myAccountId || todos.length === 0) return;
      
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);
      
      const myPerson = people.find(p => p.id === myAccountId);
      if (!myPerson) return;
      
      // Находим задачи с дедлайном на сегодня или завтра
      const urgentTasks = todos.filter(todo => {
        if (!todo.dueDate || todo.completed) return false;
        const dueDate = new Date(todo.dueDate);
        dueDate.setHours(23, 59, 59, 999);
        
        // Проверяем, что это моя задача (как исполнитель или постановщик)
        const isMyTask = todo.assignedToId === myAccountId || 
                         todo.assignedToIds?.includes(myAccountId) ||
                         todo.assignedById === myAccountId;
        
        return isMyTask && dueDate <= tomorrow && dueDate >= now;
      });
      
      // Показываем уведомления о приближающихся дедлайнах (максимум 3)
      const shownKey = `deadline_shown_${new Date().toDateString()}`;
      const alreadyShown = localStorage.getItem(shownKey);
      
      if (!alreadyShown && urgentTasks.length > 0) {
        const tasksToShow = urgentTasks.slice(0, 3);
        
        tasksToShow.forEach((task, index) => {
          setTimeout(() => {
            const dueDate = new Date(task.dueDate!);
            const isToday = dueDate.toDateString() === now.toDateString();
            
            const toast: Toast = {
              id: `toast-deadline-${task.id}`,
              type: 'warning',
              title: isToday ? '⏰ Дедлайн сегодня!' : '📅 Дедлайн завтра',
              message: task.title,
              todoId: task.id,
              createdAt: Date.now()
            };
            setToasts(prev => [...prev, toast]);
          }, index * 1000); // Показываем с задержкой
        });
        
        localStorage.setItem(shownKey, 'true');
      }
    };
    
    // Проверяем дедлайны при загрузке и каждый час
    checkDeadlines();
    const interval = setInterval(checkDeadlines, 3600000); // 1 час
    
    return () => clearInterval(interval);
  }, [myAccountId, todos, people, setToasts]);
}
