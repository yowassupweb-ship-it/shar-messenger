import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '..', 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

// Типы событий
export type EventType = 
  | 'article'      // Статья опубликована
  | 'campaign'     // Рекламная кампания
  | 'seo'          // SEO работы
  | 'technical'    // Технические работы
  | 'content'      // Контентные работы
  | 'external'     // Внешнее событие
  | 'milestone'    // Важная веха
  | 'other';       // Другое

// Типы дат события
export type EventDateType = 
  | 'single'       // Конкретная дата
  | 'range'        // От даты до даты
  | 'ongoing';     // Продолжающееся (без конечной даты)

export interface Event {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  dateType: EventDateType;
  startDate: string;        // ISO date string
  endDate?: string;         // ISO date string (для range)
  color?: string;           // Цвет для отображения
  url?: string;             // Ссылка на статью/страницу
  tags?: string[];          // Теги для фильтрации
  impact?: 'positive' | 'negative' | 'neutral';  // Ожидаемое влияние
  notes?: string;           // Заметки
  createdAt: string;
  updatedAt: string;
}

interface EventsData {
  events: Event[];
  lastUpdated: string;
}

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function loadEvents(): Promise<EventsData> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(EVENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      events: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

async function saveEvents(data: EventsData): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(EVENTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// GET - получить все события
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type');
    const tag = searchParams.get('tag');

    const data = await loadEvents();
    let events = data.events;

    // Фильтрация по датам
    if (startDate) {
      events = events.filter(e => e.startDate >= startDate || (e.endDate && e.endDate >= startDate));
    }
    if (endDate) {
      events = events.filter(e => e.startDate <= endDate);
    }

    // Фильтрация по типу
    if (type) {
      events = events.filter(e => e.type === type);
    }

    // Фильтрация по тегу
    if (tag) {
      events = events.filter(e => e.tags?.includes(tag));
    }

    // Сортировка по дате начала (новые первыми)
    events.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    return NextResponse.json({
      success: true,
      events,
      total: events.length
    });
  } catch (error) {
    console.error('Error loading events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load events' },
      { status: 500 }
    );
  }
}

// POST - создать событие
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, type, dateType, startDate, endDate, color, url, tags, impact, notes } = body;

    if (!title || !type || !dateType || !startDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, type, dateType, startDate' },
        { status: 400 }
      );
    }

    const data = await loadEvents();
    
    const newEvent: Event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      type,
      dateType,
      startDate,
      endDate: dateType === 'range' ? endDate : undefined,
      color,
      url,
      tags: tags || [],
      impact,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.events.push(newEvent);
    data.lastUpdated = new Date().toISOString();

    await saveEvents(data);

    return NextResponse.json({
      success: true,
      event: newEvent
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create event' },
      { status: 500 }
    );
  }
}

// PUT - обновить событие
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const data = await loadEvents();
    const eventIndex = data.events.findIndex(e => e.id === id);

    if (eventIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    data.events[eventIndex] = {
      ...data.events[eventIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    data.lastUpdated = new Date().toISOString();

    await saveEvents(data);

    return NextResponse.json({
      success: true,
      event: data.events[eventIndex]
    });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

// DELETE - удалить событие
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const data = await loadEvents();
    const eventIndex = data.events.findIndex(e => e.id === id);

    if (eventIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    const deletedEvent = data.events.splice(eventIndex, 1)[0];
    data.lastUpdated = new Date().toISOString();

    await saveEvents(data);

    return NextResponse.json({
      success: true,
      event: deletedEvent
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
