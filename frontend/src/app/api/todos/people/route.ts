import { NextRequest, NextResponse } from 'next/server';

export interface Person {
  id: string;
  name: string;
  telegramId?: string;
  telegramUsername?: string;
  role: 'executor' | 'customer' | 'universal';
  // Настройки уведомлений
  notifyOnNewTask?: boolean;
  notifyOnStatusChange?: boolean;
  notifyOnComment?: boolean;
  notifyOnMention?: boolean;
  // Статус онлайн
  lastSeen?: string;
  createdAt: string;
}

interface User {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  role: 'admin' | 'user';
  todoRole?: 'executor' | 'customer' | 'universal';
  telegramId?: string;
  canSeeAllTasks?: boolean;
  createdAt: string;
}

interface UsersData {
  users: User[];
}

const DEFAULT_DATA: UsersData = {
  users: []
};

// GET - получить всех пользователей как профили задач
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    
    // Получаем пользователей через HTTP API backend
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    console.log('[todos/people] Fetching users from:', `${backendUrl}/api/users`);
    
    const response = await fetch(`${backendUrl}/api/users`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('[todos/people] Backend returned:', response.status);
      return NextResponse.json({ error: 'Failed to fetch users from backend' }, { status: response.status });
    }
    
    const users: User[] = await response.json();
    console.log('[todos/people] Found users:', users.length);
    
    // Преобразуем пользователей в формат Person
    let people: Person[] = users.map(user => ({
      id: user.id,
      name: user.name || user.username || 'Без имени',
      telegramId: user.telegramId,
      telegramUsername: undefined,
      role: user.todoRole || 'universal',  // Дефолт universal для старых аккаунтов
      createdAt: user.createdAt
    }));
    
    console.log('[todos/people] Converted to people:', people.length);
    
    // Фильтрация по роли
    if (role === 'executor' || role === 'customer') {
      people = people.filter(p => p.role === role || p.role === 'universal');
      console.log('[todos/people] Filtered by role', role, ':', people.length);
    }
    
    return NextResponse.json({ people });
  } catch (error) {
    console.error('Error reading people:', error);
    return NextResponse.json({ error: 'Failed to read people' }, { status: 500 });
  }
}

// POST/PUT/DELETE не поддерживаются - используйте /api/users для управления пользователями