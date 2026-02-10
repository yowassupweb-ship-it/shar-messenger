import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

// Удалить участника из группового чата
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string; userId: string }> }
) {
  try {
    const { chatId, userId } = await params;
    
    const res = await fetch(`${BACKEND_URL}/api/chats/${chatId}/participants/${userId}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ error }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error removing participant:', error);
    return NextResponse.json({ error: 'Failed to remove participant' }, { status: 500 });
  }
}
