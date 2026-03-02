import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || 'http://127.0.0.1:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string; messageId: string }> }
) {
  try {
    const { chatId, messageId } = await params;
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/api/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Error pinning message:', error);
    return NextResponse.json({ error: 'Failed to pin message' }, { status: 500 });
  }
}
