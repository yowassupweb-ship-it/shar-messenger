import { NextRequest, NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile, generateId } from '@/lib/dataStore';

interface CalendarList {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
  allowedUsers?: string[]; // ID пользователей с доступом (пустой = все)
  allowedDepartments?: string[]; // ID отделов с доступом (пустой = все)
}

interface CalendarListsData {
  lists: CalendarList[];
  activeListId: string;
}

const DEFAULT_DATA: CalendarListsData = {
  lists: [],
  activeListId: ''
};

// GET - получить календарные листы с фильтрацией по пользователю
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    const data = readJsonFile<CalendarListsData>('calendar-lists.json', DEFAULT_DATA);
    
    // Фильтрация календарей по пользователю
    let filteredLists = data.lists;
    if (userId) {
      filteredLists = data.lists.filter(list => {
        // Показываем календарь если:
        // 1. Пользователь создал календарь
        if (list.createdBy === userId) return true;
        // 2. allowedUsers пусто (доступен всем)
        if (!list.allowedUsers || list.allowedUsers.length === 0) return true;
        // 3. userId в списке allowedUsers
        if (list.allowedUsers.includes(userId)) return true;
        return false;
      });
    }
    
    return NextResponse.json({
      lists: filteredLists,
      activeListId: filteredLists.length > 0 ? (data.activeListId || filteredLists[0].id) : ''
    });
  } catch (error) {
    console.error('Error reading calendar lists:', error);
    return NextResponse.json({ error: 'Failed to read calendar lists' }, { status: 500 });
  }
}

// POST - создать новый календарный лист
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = readJsonFile<CalendarListsData>('calendar-lists.json', DEFAULT_DATA);

    const newList: CalendarList = {
      id: generateId(),
      name: body.name || 'Новый календарь',
      description: body.description,
      color: body.color || '#3B82F6',
      createdBy: body.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      allowedUsers: body.allowedUsers || [],
      allowedDepartments: body.allowedDepartments || []
    };

    data.lists.push(newList);
    writeJsonFile('calendar-lists.json', data);

    console.log('Calendar list created:', newList.id);
    return NextResponse.json(newList);
  } catch (error) {
    console.error('Error creating calendar list:', error);
    return NextResponse.json({ error: 'Failed to create calendar list' }, { status: 500 });
  }
}

// PUT - обновить календарный лист
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const data = readJsonFile<CalendarListsData>('calendar-lists.json', DEFAULT_DATA);

    const index = data.lists.findIndex(l => l.id === body.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Calendar list not found' }, { status: 404 });
    }

    // Обновляем поля
    data.lists[index] = {
      ...data.lists[index],
      ...body,
      updatedAt: new Date().toISOString()
    };

    // Если изменился activeListId
    if (body.activeListId) {
      data.activeListId = body.activeListId;
    }

    writeJsonFile('calendar-lists.json', data);
    return NextResponse.json(data.lists[index]);
  } catch (error) {
    console.error('Error updating calendar list:', error);
    return NextResponse.json({ error: 'Failed to update calendar list' }, { status: 500 });
  }
}

// DELETE - удалить календарный лист
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'List ID required' }, { status: 400 });
    }

    const data = readJsonFile<CalendarListsData>('calendar-lists.json', DEFAULT_DATA);
    
    const list = data.lists.find(l => l.id === id);
    if (!list) {
      return NextResponse.json({ error: 'Calendar list not found' }, { status: 404 });
    }

    data.lists = data.lists.filter(l => l.id !== id);

    // Если удаляемый лист был активным, переключаемся на первый доступный
    if (data.activeListId === id) {
      data.activeListId = data.lists.length > 0 ? data.lists[0].id : '';
    }

    writeJsonFile('calendar-lists.json', data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar list:', error);
    return NextResponse.json({ error: 'Failed to delete calendar list' }, { status: 500 });
  }
}
