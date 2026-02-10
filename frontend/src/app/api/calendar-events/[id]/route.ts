import { NextRequest, NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile } from '@/lib/dataStore';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  type: 'work' | 'meeting' | 'event' | 'holiday';
  listId?: string;
  assignedTo?: string;
  assignedBy?: string;
  linkUrl?: string;
  linkTitle?: string;
  createdAt: string;
}

interface CalendarData {
  events: CalendarEvent[];
}

const DEFAULT_DATA: CalendarData = {
  events: []
};

// GET - получить событие по ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const data = readJsonFile<CalendarData>('calendar-events.json', DEFAULT_DATA);
    const event = data.events.find(e => e.id === params.id);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error reading calendar event:', error);
    return NextResponse.json({ error: 'Failed to read event' }, { status: 500 });
  }
}

// PUT - обновить событие
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();
    const data = readJsonFile<CalendarData>('calendar-events.json', DEFAULT_DATA);
    
    const eventIndex = data.events.findIndex(e => e.id === params.id);
    
    if (eventIndex === -1) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Сохраняем оригинальные данные о создании
    const originalEvent = data.events[eventIndex];

    const updatedEvent: CalendarEvent = {
      ...originalEvent,
      title: body.title ?? originalEvent.title,
      description: body.description ?? originalEvent.description,
      date: body.date ?? originalEvent.date,
      time: body.time ?? originalEvent.time,
      type: body.type ?? originalEvent.type,
      listId: body.listId ?? originalEvent.listId,
      assignedTo: body.assignedTo ?? originalEvent.assignedTo,
      assignedBy: body.assignedBy ?? originalEvent.assignedBy,
      linkUrl: body.linkUrl ?? originalEvent.linkUrl,
      linkTitle: body.linkTitle ?? originalEvent.linkTitle,
    };

    data.events[eventIndex] = updatedEvent;
    writeJsonFile('calendar-events.json', data);

    console.log('Calendar event updated:', updatedEvent.id);
    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

// DELETE - удалить событие
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    console.log('[DELETE calendar-event] Received params:', params);
    console.log('[DELETE calendar-event] Event ID:', params.id);
    
    const data = readJsonFile<CalendarData>('calendar-events.json', DEFAULT_DATA);
    console.log('[DELETE calendar-event] Total events before delete:', data.events.length);
    console.log('[DELETE calendar-event] Event IDs in DB:', data.events.map(e => e.id));
    
    const initialLength = data.events.length;
    
    data.events = data.events.filter(e => e.id !== params.id);

    if (data.events.length === initialLength) {
      console.error('[DELETE calendar-event] Event not found:', params.id);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    writeJsonFile('calendar-events.json', data);
    
    console.log('[DELETE calendar-event] Event deleted successfully:', params.id);
    console.log('[DELETE calendar-event] Events remaining:', data.events.length);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
