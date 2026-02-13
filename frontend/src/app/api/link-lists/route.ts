import { NextRequest, NextResponse } from 'next/server';

// Временное API для link-lists (проксирует к backend)
export async function GET(request: NextRequest) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/link-lists`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching link lists:', error);
    return NextResponse.json({ error: 'Failed to fetch link lists' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/link-lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating link list:', error);
    return NextResponse.json({ error: 'Failed to create link list' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/link-lists`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating link list:', error);
    return NextResponse.json({ error: 'Failed to update link list' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/link-lists?id=${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deleting link list:', error);
    return NextResponse.json({ error: 'Failed to delete link list' }, { status: 500 });
  }
}
