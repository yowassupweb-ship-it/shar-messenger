import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

interface TelegramAuthCode {
  code: string;
  createdAt: string;
  expiresAt: string;
  userId?: string;
  authenticated: boolean;
}

interface TelegramAuthData {
  codes: TelegramAuthCode[];
}

interface User {
  id: string;
  username: string;
  name?: string;
  role: string;
  telegramId?: string;
}

const DATA_FILE = path.join(process.cwd(), '..', 'data', 'telegram_auth.json');

async function readData(): Promise<TelegramAuthData> {
  try {
    if (!existsSync(DATA_FILE)) {
      return { codes: [] };
    }
    const content = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { codes: [] };
  }
}

async function writeData(data: TelegramAuthData): Promise<void> {
  const dir = path.dirname(DATA_FILE);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }
    
    const data = await readData();
    const authCode = data.codes.find(c => c.code === code);
    
    if (!authCode) {
      return NextResponse.json({ authenticated: false, error: 'Code not found' });
    }
    
    // Проверяем срок действия
    if (new Date(authCode.expiresAt) < new Date()) {
      return NextResponse.json({ authenticated: false, error: 'Code expired' });
    }
    
    if (!authCode.authenticated || !authCode.userId) {
      return NextResponse.json({ authenticated: false });
    }
    
    // Получаем данные пользователя
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    const userRes = await fetch(`${backendUrl}/api/users`);
    
    if (!userRes.ok) {
      return NextResponse.json({ authenticated: false, error: 'Failed to fetch user' });
    }
    
    const users: User[] = await userRes.json();
    const user = users.find(u => u.id === authCode.userId);
    
    if (!user) {
      return NextResponse.json({ authenticated: false, error: 'User not found' });
    }
    
    // Удаляем использованный код
    data.codes = data.codes.filter(c => c.code !== code);
    await writeData(data);
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error checking telegram auth:', error);
    return NextResponse.json({ error: 'Failed to check auth' }, { status: 500 });
  }
}
