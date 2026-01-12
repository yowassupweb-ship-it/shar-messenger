import { NextRequest, NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile } from '@/lib/dataStore';

export interface Notification {
  id: string;
  type: 'new_task' | 'assignment' | 'comment' | 'mention' | 'status_change' | 'event_invite' | 'event_reminder' | 'event_update';
  todoId?: string;
  todoTitle?: string;
  eventId?: string;
  eventTitle?: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsData {
  notifications: Notification[];
}

const DEFAULT_DATA: NotificationsData = {
  notifications: []
};

// GET - получить уведомления
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    const data = readJsonFile<NotificationsData>('notifications.json', DEFAULT_DATA);
    
    // Если указан userId - фильтруем по нему
    if (userId) {
      const userNotifications = data.notifications.filter(n => n.toUserId === userId);
      return NextResponse.json(userNotifications);
    }
    
    return NextResponse.json(data.notifications);
  } catch (error) {
    console.error('Error reading notifications:', error);
    return NextResponse.json({ error: 'Failed to read notifications' }, { status: 500 });
  }
}

// POST - создать новое уведомление
export async function POST(request: NextRequest) {
  try {
    const notification: Notification = await request.json();
    
    const data = readJsonFile<NotificationsData>('notifications.json', DEFAULT_DATA);
    
    // Добавляем уведомление в начало списка
    data.notifications = [notification, ...data.notifications];
    
    // Ограничиваем количество уведомлений (хранить последние 500)
    if (data.notifications.length > 500) {
      data.notifications = data.notifications.slice(0, 500);
    }
    
    writeJsonFile('notifications.json', data);
    
    return NextResponse.json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// PUT - обновить уведомление (пометить как прочитанное)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, markAllRead, userId, todoId, markByTodo } = body;
    
    const data = readJsonFile<NotificationsData>('notifications.json', DEFAULT_DATA);
    
    if (markAllRead && userId) {
      // Пометить все уведомления пользователя как прочитанные
      data.notifications = data.notifications.map(n => 
        n.toUserId === userId ? { ...n, read: true } : n
      );
    } else if (markByTodo && todoId && userId) {
      // Пометить все уведомления по конкретной задаче как прочитанные
      data.notifications = data.notifications.map(n => 
        n.toUserId === userId && n.todoId === todoId ? { ...n, read: true } : n
      );
    } else if (id) {
      // Пометить одно уведомление как прочитанное
      data.notifications = data.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      );
    }
    
    writeJsonFile('notifications.json', data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
