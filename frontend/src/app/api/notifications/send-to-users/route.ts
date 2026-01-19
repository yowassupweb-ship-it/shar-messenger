import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userIds, type, data } = body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds is required and must be non-empty array' }, { status: 400 });
    }
    
    if (!type || !data) {
      return NextResponse.json({ error: 'type and data are required' }, { status: 400 });
    }

    // Отправляем запрос на backend
    const response = await fetch(`${BACKEND_URL}/api/notifications/send-to-users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userIds,
        type,
        data
      })
    });

    if (response.ok) {
      const result = await response.json();
      return NextResponse.json(result);
    } else {
      const error = await response.text();
      console.error('Backend error:', error);
      return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error sending notifications to users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
