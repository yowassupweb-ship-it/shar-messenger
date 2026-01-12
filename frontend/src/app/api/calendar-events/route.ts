import { NextRequest, NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile, generateId } from '@/lib/dataStore';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  priority: string;
  type: 'tz' | 'task';
  sourceId: string;
  assignedTo?: string;
  assignedBy?: string;
  listName?: string;
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

// GET - получить все события
export async function GET() {
  try {
    const data = readJsonFile<CalendarData>('calendar-events.json', DEFAULT_DATA);
    return NextResponse.json(data.events);
  } catch (error) {
    console.error('Error reading calendar events:', error);
    return NextResponse.json({ error: 'Failed to read events' }, { status: 500 });
  }
}

// POST - создать событие
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = readJsonFile<CalendarData>('calendar-events.json', DEFAULT_DATA);

    const newEvent: CalendarEvent = {
      id: generateId(),
      title: body.title || 'Без названия',
      description: body.description || '',
      date: body.date || new Date().toISOString().split('T')[0],
      priority: body.priority || 'medium',
      type: body.type || 'task',
      sourceId: body.sourceId || '',
      assignedTo: body.assignedTo,
      assignedBy: body.assignedBy,
      listName: body.listName,
      linkUrl: body.linkUrl,
      linkTitle: body.linkTitle,
      createdAt: new Date().toISOString()
    };

    data.events.push(newEvent);
    writeJsonFile('calendar-events.json', data);

    console.log('Calendar event created:', newEvent.id);
    return NextResponse.json(newEvent);
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

// DELETE - удалить событие
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const data = readJsonFile<CalendarData>('calendar-events.json', DEFAULT_DATA);
    const initialLength = data.events.length;
    data.events = data.events.filter(e => e.id !== id);

    if (data.events.length === initialLength) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    writeJsonFile('calendar-events.json', data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
