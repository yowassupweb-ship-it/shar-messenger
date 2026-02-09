import { useCallback } from 'react';
import type { Todo, Person, Notification } from '@/types/todos';
import { TaskNotificationManager, getTaskRelatedUsers } from '@/services/notificationService';

interface UseTodoNotificationsProps {
  myAccountId: string | null;
  people: Person[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  playNotificationSound: () => void;
  saveNotification: (notification: Notification) => Promise<void>;
}

export function useTodoNotifications({
  myAccountId,
  people,
  setNotifications,
  playNotificationSound,
  saveNotification
}: UseTodoNotificationsProps) {
  
  const notificationManager = useCallback(() => {
    const author = people.find(p => p.id === myAccountId);
    if (!myAccountId || !author) return null;
    return new TaskNotificationManager(myAccountId, author.name);
  }, [myAccountId, people]);

  const createTaskNotification = useCallback(async (
    todo: Todo, 
    type: 'new_task' | 'assignment' | 'status_change', 
    oldStatus?: string
  ) => {
    if (!myAccountId) return;
    
    const author = people.find(p => p.id === myAccountId);
    if (!author) return;

    const manager = notificationManager();
    if (!manager) return;

    // Собираем всех связанных пользователей
    const relatedUsers = getTaskRelatedUsers({
      authorId: todo.assignedById,
      assignedById: todo.assignedById,
      assignedToId: todo.assignedToId
    });

    // Уведомляем исполнителя (если назначен и это не автор)
    if (todo.assignedToId && todo.assignedToId !== myAccountId) {
      const notification: Notification = {
        id: `notif-${Date.now()}`,
        type,
        todoId: todo.id,
        todoTitle: todo.title,
        fromUserId: myAccountId,
        fromUserName: author.name,
        toUserId: todo.assignedToId,
        message: type === 'new_task' 
          ? `${author.name} создал задачу для вас`
          : type === 'assignment'
            ? `${author.name} назначил вас исполнителем`
            : `${author.name} изменил статус задачи`,
        read: false,
        createdAt: new Date().toISOString()
      };
      // Сохраняем в API и локальный state
      saveNotification(notification);
      setNotifications(prev => [notification, ...prev]);
      playNotificationSound();
    }

    // Уведомляем заказчика если статус "Готово к проверке" (review)
    if (type === 'status_change' && todo.status === 'review' && todo.assignedById && todo.assignedById !== myAccountId) {
      const notification: Notification = {
        id: `notif-${Date.now()}-customer`,
        type: 'status_change',
        todoId: todo.id,
        todoTitle: todo.title,
        fromUserId: myAccountId,
        fromUserName: author.name,
        toUserId: todo.assignedById,
        message: `${author.name} завершил задачу`,
        read: false,
        createdAt: new Date().toISOString()
      };
      saveNotification(notification);
      setNotifications(prev => [notification, ...prev]);
      playNotificationSound();
    }
  }, [myAccountId, people, notificationManager, saveNotification, setNotifications, playNotificationSound]);

  return { createTaskNotification };
}
