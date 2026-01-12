import { NextRequest, NextResponse } from 'next/server';

// Используем локальный API events
const CALENDAR_API_URL = process.env.CALENDAR_API_URL || 'http://localhost:3000/api/calendar-events';

// POST - создать событие в календаре
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[Calendar Proxy] Sending to calendar:', body);
    
    const response = await fetch(CALENDAR_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('[Calendar Proxy] Success:', result);
      return NextResponse.json(result);
    } else {
      const errorText = await response.text();
      console.error('[Calendar Proxy] Error:', response.status, errorText);
      return NextResponse.json(
        { error: errorText || 'Calendar API error' }, 
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('[Calendar Proxy] Network error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to calendar server' }, 
      { status: 500 }
    );
  }
}

// GET - получить события из календаря
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = searchParams.toString();
    const url = params ? `${CALENDAR_API_URL}?${params}` : CALENDAR_API_URL;
    
    const response = await fetch(url);
    
    if (response.ok) {
      const result = await response.json();
      return NextResponse.json(result);
    } else {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || 'Calendar API error' }, 
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('[Calendar Proxy] Network error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to calendar server' }, 
      { status: 500 }
    );
  }
}
