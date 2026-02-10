import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string; messageId: string }> }
) {
  try {
    const { chatId, messageId } = await params;
    const body = await request.json();
    
    const res = await fetch(`${BACKEND_URL}/api/chats/${chatId}/messages/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ error }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string; messageId: string }> }
) {
  try {
    const { chatId, messageId } = await params;
    
    const res = await fetch(`${BACKEND_URL}/api/chats/${chatId}/messages/${messageId}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ error }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
