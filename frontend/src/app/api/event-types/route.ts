import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

export interface EventTypeData {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface EventsData {
  events: any[];
  types?: EventTypeData[];
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
      types: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

async function saveEvents(data: EventsData): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(EVENTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// GET - получить все типы
export async function GET(request: NextRequest) {
  try {
    const data = await loadEvents();
    
    return NextResponse.json({
      success: true,
      types: data.types || []
    });
  } catch (error) {
    console.error('Error loading event types:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load event types' },
      { status: 500 }
    );
  }
}

// POST - создать тип
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, color, icon } = body;

    if (!id || !name || !color || !icon) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id, name, color, icon' },
        { status: 400 }
      );
    }

    const data = await loadEvents();
    
    if (!data.types) {
      data.types = [];
    }

    // Проверяем, не существует ли уже тип с таким id
    if (data.types.some(t => t.id === id)) {
      return NextResponse.json(
        { success: false, error: 'Type with this ID already exists' },
        { status: 400 }
      );
    }

    const newType: EventTypeData = { id, name, color, icon };
    data.types.push(newType);
    data.lastUpdated = new Date().toISOString();

    await saveEvents(data);

    return NextResponse.json({
      success: true,
      type: newType
    });
  } catch (error) {
    console.error('Error creating event type:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create event type' },
      { status: 500 }
    );
  }
}

// DELETE - удалить тип
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Type ID is required' },
        { status: 400 }
      );
    }

    const data = await loadEvents();
    
    if (!data.types) {
      return NextResponse.json(
        { success: false, error: 'Type not found' },
        { status: 404 }
      );
    }

    const typeIndex = data.types.findIndex(t => t.id === id);

    if (typeIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Type not found' },
        { status: 404 }
      );
    }

    const deletedType = data.types.splice(typeIndex, 1)[0];
    data.lastUpdated = new Date().toISOString();

    await saveEvents(data);

    return NextResponse.json({
      success: true,
      type: deletedType
    });
  } catch (error) {
    console.error('Error deleting event type:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete event type' },
      { status: 500 }
    );
  }
}
