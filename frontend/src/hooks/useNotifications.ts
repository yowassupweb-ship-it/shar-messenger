import { useEffect, useCallback, useRef } from 'react';
import { Toast, Todo, Notification } from '@/types/todos';

interface UseNotificationsProps {
  myAccountId: string | null;
  soundEnabled: boolean;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
  notificationSoundRef: React.RefObject<HTMLAudioElement | null>;
}

export function useNotifications({
  myAccountId,
  soundEnabled,
  setNotifications,
  setToasts,
  notificationSoundRef
}: UseNotificationsProps) {
  const lastNotificationCountRef = useRef<number>(0);
  const sentGroupedNotificationsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    sentGroupedNotificationsRef.current = new Set();
  }, [myAccountId]);

  const sendGroupedNotificationToChat = useCallback((groupNotifs: Notification[], groupKey: string) => {
    if (!myAccountId) return;
    if (groupNotifs.length < 2) return;

    const firstNotif = groupNotifs[0];
    const lastNotif = groupNotifs[groupNotifs.length - 1];
    const signature = `${groupKey}:${lastNotif?.id || 'none'}:${groupNotifs.length}`;

    if (sentGroupedNotificationsRef.current.has(signature)) return;
    sentGroupedNotificationsRef.current.add(signature);

    const title = firstNotif.type === 'comment'
      ? 'Новый комментарий'
      : firstNotif.type === 'mention'
        ? 'Вас упомянули'
        : firstNotif.type === 'status_change'
          ? 'Статус изменен'
          : firstNotif.type === 'new_task'
            ? 'Новая задача'
            : 'Уведомление';
    const noun = firstNotif.type === 'comment' ? 'комментариев' : 'уведомлений';
    const content = `${title}\n${firstNotif.fromUserName}: +${groupNotifs.length} ${noun}`;

    fetch(`/api/chats/notifications/${myAccountId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        linkedTaskId: firstNotif.todoId,
        notificationType: firstNotif.type
      })
    }).catch(error => {
      console.error('[notifications chat] Failed to send grouped summary:', error);
    });
  }, [myAccountId]);

  // Загрузка уведомлений из API
  const loadNotifications = useCallback(async (playSound = false) => {
    if (!myAccountId) return;
    // Не запрашиваем данные если вкладка не активна
    if (typeof document !== 'undefined' && document.hidden) return;
    
    try {
      const res = await fetch(`/api/notifications?userId=${myAccountId}`);
      if (res.ok) {
        const data: Notification[] = await res.json();
        
        // Проверяем, есть ли новые непрочитанные уведомления
        if (playSound) {
          const newUnreadCount = data.filter(n => !n.read).length;
          
          // Находим новые уведомления (которых не было раньше)
          if (newUnreadCount > lastNotificationCountRef.current) {
            // Играем звук
            if (soundEnabled && notificationSoundRef.current) {
              notificationSoundRef.current.currentTime = 0;
              notificationSoundRef.current.play().catch(() => {});
            }
            
            // Показываем toast для каждого нового уведомления с группировкой
            setNotifications(prevNotifications => {
              const existingIds = new Set(prevNotifications.map(n => n.id));
              const newNotifs = data.filter(n => !n.read && !existingIds.has(n.id));
            
              // Группируем уведомления по типу и задаче
              const groups = new Map<string, typeof newNotifs>();
              newNotifs.forEach(notif => {
                const groupKey = `${notif.type}_${notif.todoId || 'general'}`;
                if (!groups.has(groupKey)) {
                  groups.set(groupKey, []);
                }
                groups.get(groupKey)!.push(notif);
              });
            
              // Создаём toast для каждой группы
              groups.forEach((groupNotifs, groupKey) => {
                const firstNotif = groupNotifs[0];
                const count = groupNotifs.length;
              
                const toast: Toast = {
                  id: `toast-${firstNotif.id}`,
                  type: firstNotif.type === 'mention' ? 'warning' : 
                        firstNotif.type === 'status_change' ? 'success' : 'info',
                  title: firstNotif.type === 'comment' ? '💬 Новый комментарий' :
                         firstNotif.type === 'mention' ? '📢 Вас упомянули' :
                         firstNotif.type === 'status_change' ? '✅ Статус изменён' :
                         firstNotif.type === 'new_task' ? '📋 Новая задача' :
                         '🔔 Уведомление',
                  message: count > 1 
                    ? `${firstNotif.fromUserName}: +${count} ${firstNotif.type === 'comment' ? 'комментариев' : 'уведомлений'}`
                    : firstNotif.message,
                  todoId: firstNotif.todoId,
                  createdAt: Date.now(),
                  groupKey,
                  count
                };

                sendGroupedNotificationToChat(groupNotifs, groupKey);
              
                // Обновляем существующий toast или добавляем новый
                setToasts(prev => {
                  const existingIndex = prev.findIndex(t => t.groupKey === groupKey);
                  if (existingIndex >= 0) {
                    // Обновляем счётчик существующего
                    const updated = [...prev];
                    updated[existingIndex] = {
                      ...updated[existingIndex],
                      count: (updated[existingIndex].count || 1) + count,
                      message: `${firstNotif.fromUserName}: +${(updated[existingIndex].count || 1) + count} ${firstNotif.type === 'comment' ? 'комментариев' : 'уведомлений'}`,
                      createdAt: Date.now()
                    };
                    return updated;
                  }
                  return [...prev.slice(-4), toast]; // Максимум 5 toast
                });
              });
            
              return data;
            });
          } else {
            setNotifications(data);
          }
          
          lastNotificationCountRef.current = newUnreadCount;
        } else {
          setNotifications(data);
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [myAccountId, soundEnabled, setNotifications, setToasts, notificationSoundRef, sendGroupedNotificationToChat]);

  // Сохранение уведомления в API
  const saveNotification = useCallback(async (notification: Notification) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      });
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  }, []);

  return {
    loadNotifications,
    saveNotification
  };
}
