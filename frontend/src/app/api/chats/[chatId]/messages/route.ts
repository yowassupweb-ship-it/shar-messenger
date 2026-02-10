import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    const response = await fetch(`${BACKEND_URL}/api/chats/${chatId}/messages`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    console.log('[POST /api/chats/[chatId]/messages] Called with chatId:', chatId);
    const body = await request.json();
    console.log('[POST /api/chats/[chatId]/messages] Body:', body);
    
    const url = `${BACKEND_URL}/api/chats/${chatId}/messages`;
    console.log('[POST /api/chats/[chatId]/messages] Backend URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    console.log('[POST /api/chats/[chatId]/messages] Backend response status:', response.status);
    
    const data = await response.json();
    console.log('[POST /api/chats/[chatId]/messages] Backend response data:', data);
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
