/**
 * Сервис отправки уведомлений в чат уведомлений
 */

export type NotificationType = 
  | 'new_task' 
  | 'task_updated' 
  | 'task_status_changed'
  | 'new_executor'
  | 'removed_executor'
  | 'new_comment'
  | 'mention'
  | 'post_updated'
  | 'post_status_changed'
  | 'post_new_comment';

export interface NotificationData {
  fromUserId: string;
  fromUserName: string;
  taskId?: string;
  taskTitle?: string;
  postId?: string;
  postTitle?: string;
  oldStatus?: string;
  newStatus?: string;
  executorName?: string;
  executorId?: string;
  commentText?: string;
}

/**
 * Отправить уведомление одному пользователю
 */
export async function sendNotificationToUser(
  userId: string,
  type: NotificationType,
  data: NotificationData
): Promise<boolean> {
  try {
    const response = await fetch(`/api/chats/notifications/${userId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: generateNotificationContent(type, data),
        linkedTaskId: data.taskId,
        linkedPostId: data.postId,
        notificationType: type,
        metadata: {
          taskTitle: data.taskTitle,
          postTitle: data.postTitle,
          fromUserName: data.fromUserName
        }
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Error sending notification to user:', error);
    return false;
  }
}

/**
 * Отправить уведомление нескольким пользователям
 */
export async function sendNotificationToUsers(
  userIds: string[],
  type: NotificationType,
  data: NotificationData
): Promise<{ success: boolean; count: number }> {
  if (userIds.length === 0) {
    console.log('[Notifications] No recipients, skipping');
    return { success: true, count: 0 };
  }
  
  console.log('[Notifications] Sending to users:', userIds, 'type:', type);
  
  try {
    const response = await fetch('/api/notifications/send-to-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userIds,
        type,
        data
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('[Notifications] Sent successfully:', result);
      return { success: true, count: result.count };
    }
    console.error('[Notifications] Failed to send:', await response.text());
    return { success: false, count: 0 };
  } catch (error) {
    console.error('Error sending notifications to users:', error);
    return { success: false, count: 0 };
  }
}

/**
 * Генерация текста уведомления без эмоджи в стиле приложения
 */
function generateNotificationContent(type: NotificationType, data: NotificationData): string {
  const { fromUserName, taskTitle, postTitle, oldStatus, newStatus, executorName } = data;
  const title = taskTitle || postTitle || 'Без названия';
  
  const templates: Record<NotificationType, string> = {
    new_task: `<b>Новая задача</b>\n\n${fromUserName} назначил вам задачу:\n<i>${title}</i>`,
    task_updated: `<b>Задача изменена</b>\n\n${fromUserName} обновил задачу:\n<i>${title}</i>`,
    task_status_changed: `<b>Изменение статуса</b>\n\n${fromUserName} изменил статус задачи:\n<i>${title}</i>\n\n${oldStatus} → ${newStatus}`,
    new_executor: `<b>Новый исполнитель</b>\n\n${executorName} добавлен в задачу:\n<i>${title}</i>`,
    removed_executor: `<b>Исполнитель удалён</b>\n\n${executorName} удалён из задачи:\n<i>${title}</i>`,
    new_comment: `<b>Новый комментарий</b>\n\n${fromUserName} прокомментировал задачу:\n<i>${title}</i>`,
    mention: `<b>Вас упомянули</b>\n\n${fromUserName} упомянул вас в комментарии:\n<i>${title}</i>`,
    post_updated: `<b>Публикация изменена</b>\n\n${fromUserName} обновил публикацию:\n<i>${title}</i>`,
    post_status_changed: `<b>Изменение статуса публикации</b>\n\n${fromUserName} изменил статус:\n<i>${title}</i>\n\n${oldStatus} → ${newStatus}`,
    post_new_comment: `<b>Комментарий к публикации</b>\n\n${fromUserName} прокомментировал публикацию:\n<i>${title}</i>`,
  };
  
  return templates[type] || `<b>Уведомление</b>\n\n${fromUserName}: ${title}`;
}

/**
 * Типы статусов для локализации
 */
export const statusLabels: Record<string, string> = {
  // Статусы задач
  'todo': 'К выполнению',
  'in_progress': 'В работе',
  'stuck': 'Застряла',
  'review': 'На проверке',
  'done': 'Готово',
  'cancelled': 'Отменена',
  
  // Статусы публикаций
  'draft': 'Черновик',
  'ready': 'Готово',
  'scheduled': 'Запланировано',
  'published': 'Опубликовано',
  'rejected': 'Отклонено',
};

/**
 * Получить локализованное название статуса
 */
export function getStatusLabel(status: string): string {
  return statusLabels[status] || status;
}

/**
 * Класс для управления уведомлениями задач
 */
export class TaskNotificationManager {
  private currentUserId: string;
  private currentUserName: string;
  
  constructor(userId: string, userName: string) {
    this.currentUserId = userId;
    this.currentUserName = userName;
  }
  
  /**
   * Уведомление о новой задаче
   */
  async notifyNewTask(
    assigneeIds: string[],
    taskId: string,
    taskTitle: string,
    authorId?: string
  ): Promise<void> {
    // Фильтруем - не отправляем уведомление самому себе
    const recipients = assigneeIds.filter(id => id !== this.currentUserId);
    
    // Если есть автор и это не текущий пользователь - ему тоже уведомление
    if (authorId && authorId !== this.currentUserId && !recipients.includes(authorId)) {
      recipients.push(authorId);
    }
    
    if (recipients.length > 0) {
      await sendNotificationToUsers(recipients, 'new_task', {
        fromUserId: this.currentUserId,
        fromUserName: this.currentUserName,
        taskId,
        taskTitle
      });
    }
  }
  
  /**
   * Уведомление об изменении задачи
   */
  async notifyTaskUpdated(
    relatedUserIds: string[],
    taskId: string,
    taskTitle: string
  ): Promise<void> {
    const recipients = relatedUserIds.filter(id => id !== this.currentUserId);
    
    if (recipients.length > 0) {
      await sendNotificationToUsers(recipients, 'task_updated', {
        fromUserId: this.currentUserId,
        fromUserName: this.currentUserName,
        taskId,
        taskTitle
      });
    }
  }
  
  /**
   * Уведомление об изменении статуса
   */
  async notifyStatusChanged(
    relatedUserIds: string[],
    taskId: string,
    taskTitle: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    const recipients = relatedUserIds.filter(id => id !== this.currentUserId);
    
    if (recipients.length > 0) {
      await sendNotificationToUsers(recipients, 'task_status_changed', {
        fromUserId: this.currentUserId,
        fromUserName: this.currentUserName,
        taskId,
        taskTitle,
        oldStatus: getStatusLabel(oldStatus),
        newStatus: getStatusLabel(newStatus)
      });
    }
  }
  
  /**
   * Уведомление о новом исполнителе
   */
  async notifyNewExecutor(
    relatedUserIds: string[],
    taskId: string,
    taskTitle: string,
    executorId: string,
    executorName: string
  ): Promise<void> {
    const recipients = relatedUserIds.filter(id => id !== this.currentUserId);
    
    if (recipients.length > 0) {
      await sendNotificationToUsers(recipients, 'new_executor', {
        fromUserId: this.currentUserId,
        fromUserName: this.currentUserName,
        taskId,
        taskTitle,
        executorId,
        executorName
      });
    }
  }
  
  /**
   * Уведомление об удалении исполнителя
   */
  async notifyRemovedExecutor(
    relatedUserIds: string[],
    taskId: string,
    taskTitle: string,
    executorId: string,
    executorName: string
  ): Promise<void> {
    const recipients = relatedUserIds.filter(id => id !== this.currentUserId);
    
    if (recipients.length > 0) {
      await sendNotificationToUsers(recipients, 'removed_executor', {
        fromUserId: this.currentUserId,
        fromUserName: this.currentUserName,
        taskId,
        taskTitle,
        executorId,
        executorName
      });
    }
  }
  
  /**
   * Уведомление о новом комментарии
   */
  async notifyNewComment(
    relatedUserIds: string[],
    taskId: string,
    taskTitle: string,
    mentionedUserIds: string[] = []
  ): Promise<void> {
    // Отдельные уведомления для упомянутых
    const mentionRecipients = mentionedUserIds.filter(id => id !== this.currentUserId);
    if (mentionRecipients.length > 0) {
      await sendNotificationToUsers(mentionRecipients, 'mention', {
        fromUserId: this.currentUserId,
        fromUserName: this.currentUserName,
        taskId,
        taskTitle
      });
    }
    
    // Остальным - обычное уведомление о комментарии
    const commentRecipients = relatedUserIds.filter(
      id => id !== this.currentUserId && !mentionedUserIds.includes(id)
    );
    
    if (commentRecipients.length > 0) {
      await sendNotificationToUsers(commentRecipients, 'new_comment', {
        fromUserId: this.currentUserId,
        fromUserName: this.currentUserName,
        taskId,
        taskTitle
      });
    }
  }
}

/**
 * Класс для управления уведомлениями контент-плана
 */
export class ContentPlanNotificationManager {
  private currentUserId: string;
  private currentUserName: string;
  
  constructor(userId: string, userName: string) {
    this.currentUserId = userId;
    this.currentUserName = userName;
  }
  
  /**
   * Уведомление об изменении публикации
   */
  async notifyPostUpdated(
    relatedUserIds: string[],
    postId: string,
    postTitle: string
  ): Promise<void> {
    const recipients = relatedUserIds.filter(id => id !== this.currentUserId);
    
    if (recipients.length > 0) {
      await sendNotificationToUsers(recipients, 'post_updated', {
        fromUserId: this.currentUserId,
        fromUserName: this.currentUserName,
        postId,
        postTitle
      });
    }
  }
  
  /**
   * Уведомление об изменении статуса публикации
   */
  async notifyStatusChanged(
    relatedUserIds: string[],
    postId: string,
    postTitle: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    const recipients = relatedUserIds.filter(id => id !== this.currentUserId);
    
    if (recipients.length > 0) {
      await sendNotificationToUsers(recipients, 'post_status_changed', {
        fromUserId: this.currentUserId,
        fromUserName: this.currentUserName,
        postId,
        postTitle,
        oldStatus: getStatusLabel(oldStatus),
        newStatus: getStatusLabel(newStatus)
      });
    }
  }
  
  /**
   * Уведомление о новом комментарии к публикации
   */
  async notifyNewComment(
    relatedUserIds: string[],
    postId: string,
    postTitle: string,
    mentionedUserIds: string[] = []
  ): Promise<void> {
    // Отдельные уведомления для упомянутых
    const mentionRecipients = mentionedUserIds.filter(id => id !== this.currentUserId);
    if (mentionRecipients.length > 0) {
      await sendNotificationToUsers(mentionRecipients, 'mention', {
        fromUserId: this.currentUserId,
        fromUserName: this.currentUserName,
        postId,
        postTitle
      });
    }
    
    // Остальным - обычное уведомление о комментарии
    const commentRecipients = relatedUserIds.filter(
      id => id !== this.currentUserId && !mentionedUserIds.includes(id)
    );
    
    if (commentRecipients.length > 0) {
      await sendNotificationToUsers(commentRecipients, 'post_new_comment', {
        fromUserId: this.currentUserId,
        fromUserName: this.currentUserName,
        postId,
        postTitle
      });
    }
  }
}

/**
 * Получить список связанных пользователей для задачи
 * (автор, заказчик, исполнители)
 */
export function getTaskRelatedUsers(task: {
  authorId?: string;
  assignedById?: string;
  assignedToId?: string | string[];
}): string[] {
  const users = new Set<string>();
  
  if (task.authorId) users.add(task.authorId);
  if (task.assignedById) users.add(task.assignedById);
  
  if (task.assignedToId) {
    if (Array.isArray(task.assignedToId)) {
      task.assignedToId.forEach(id => users.add(id));
    } else {
      users.add(task.assignedToId);
    }
  }
  
  return Array.from(users);
}

/**
 * Получить список связанных пользователей для публикации
 * (автор, назначившие, назначенные)
 */
export function getPostRelatedUsers(post: {
  createdById?: string;
  assignedById?: string;
  assignedToId?: string;
}): string[] {
  const users = new Set<string>();
  
  if (post.createdById) users.add(post.createdById);
  if (post.assignedById) users.add(post.assignedById);
  if (post.assignedToId) users.add(post.assignedToId);
  
  return Array.from(users);
}
