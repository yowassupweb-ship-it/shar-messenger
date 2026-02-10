import { NextRequest, NextResponse } from 'next/server';
import fsPromises from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

interface Event {
  id: string;
  title: string;
  description?: string;
  type: string;
  startDate: string;
  endDate?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

interface EventsData {
  events: Event[];
  lastUpdated: string;
}

async function loadEvents(): Promise<EventsData> {
  try {
    const data = await fsPromises.readFile(EVENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      events: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

async function saveEvents(data: EventsData): Promise<void> {
  await fsPromises.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
  await fsPromises.writeFile(EVENTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// PUT - обновить событие
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const updates = await request.json();

    const data = await loadEvents();
    const eventIndex = data.events.findIndex(e => e.id === id);

    if (eventIndex === -1) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    data.events[eventIndex] = {
      ...data.events[eventIndex],
      ...updates,
      id, // Сохраняем ID
      updatedAt: new Date().toISOString()
    };
    data.lastUpdated = new Date().toISOString();

    await saveEvents(data);

    return NextResponse.json(data.events[eventIndex]);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

// DELETE - удалить событие
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const data = await loadEvents();
    const eventIndex = data.events.findIndex(e => e.id === id);

    if (eventIndex === -1) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    data.events.splice(eventIndex, 1);
    data.lastUpdated = new Date().toISOString();

    await saveEvents(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
