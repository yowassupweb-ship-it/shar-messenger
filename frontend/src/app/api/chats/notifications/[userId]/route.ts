import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/chats/notifications/${userId}`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting notifications chat:', error);
    return NextResponse.json({ error: 'Failed to get notifications chat' }, { status: 500 });
  }
}
