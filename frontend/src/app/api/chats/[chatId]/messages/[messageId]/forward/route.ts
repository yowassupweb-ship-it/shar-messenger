import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string; messageId: string }> }
) {
  try {
    const { chatId, messageId } = await params;
    const body = await request.json();
    const { targetChatIds } = body;
    
    const response = await fetch(
      `${BACKEND_URL}/api/chats/${chatId}/messages/${messageId}/forward`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetChatIds }),
      }
    );
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error forwarding message:', error);
    return NextResponse.json({ error: 'Failed to forward message' }, { status: 500 });
  }
}
