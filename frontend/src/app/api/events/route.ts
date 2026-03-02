import { NextRequest, NextResponse } from 'next/server';
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

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
  participants?: string[];  // ID участников
  createdBy?: string;       // ID создателя
  createdAt: string;
  updatedAt: string;
}

export interface EventTypeData {
  id: string;
  name: string;
  color: string;
  icon: string;
}

// GET - получить все события
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const response = await fetch(`${BACKEND_URL}/api/events?${searchParams.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
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
    const response = await fetch(`${BACKEND_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
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
    const response = await fetch(`${BACKEND_URL}/api/events`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
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

    const response = await fetch(`${BACKEND_URL}/api/events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
