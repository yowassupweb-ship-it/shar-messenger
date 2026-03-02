import { NextRequest, NextResponse } from 'next/server';
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export interface EventTypeData {
  id: string;
  name: string;
  color: string;
  icon: string;
}

// GET - получить все типы
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/event-types`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
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
    const response = await fetch(`${BACKEND_URL}/api/event-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
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

    const response = await fetch(`${BACKEND_URL}/api/event-types?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error deleting event type:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete event type' },
      { status: 500 }
    );
  }
}
