import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// GET - получить текущего пользователя по username из query
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    
    console.log('[/api/auth/me] Looking for user:', username);
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }
    
    // Получаем пользователей из backend
    const response = await fetch(`${BACKEND_URL}/api/users`);
    
    if (!response.ok) {
      console.error('[/api/auth/me] Failed to fetch users from backend:', response.status);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: response.status });
    }

    const users = await response.json();
    console.log('[/api/auth/me] Fetched users:', users.length);
    
    // Ищем пользователя по username или name или части username до @
    const user = users.find((u: any) => {
      const uUsername = u.username || '';
      const uName = u.name || '';
      const uUsernamePrefix = uUsername.includes('@') ? uUsername.split('@')[0] : uUsername;
      return uUsername === username || uName === username || uUsernamePrefix === username;
    })
    
    if (!user) {
      console.log('[/api/auth/me] User not found:', username);
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    console.log('[/api/auth/me] Found user:', user.id);
    
    // Возвращаем данные пользователя без пароля
    const { password, ...userWithoutPassword } = user
    
    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error('Error fetching current user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
