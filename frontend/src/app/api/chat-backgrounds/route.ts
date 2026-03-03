import { NextResponse } from 'next/server';

const BACKEND_BASE_URL = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000')
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/chat-backgrounds`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error loading chat backgrounds:', error);
    return NextResponse.json({ error: 'Failed to load chat backgrounds' }, { status: 500 });
  }
}
