import { NextRequest, NextResponse } from 'next/server';

// Алиас для todos API - используем его для задач в сообщениях
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const todosUrl = new URL('/api/todos', url.origin);
    
    const response = await fetch(todosUrl.toString(), {
      method: 'GET',
      headers: request.headers,
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}
