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

// POST - подтвердить код от Telegram бота
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, telegramId } = body;
    
    if (!code || !telegramId) {
      return NextResponse.json({ error: 'Code and telegramId are required' }, { status: 400 });
    }
    
    // Ищем пользователя по telegramId
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    const userRes = await fetch(`${backendUrl}/api/users`);
    
    if (!userRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
    
    const users: User[] = await userRes.json();
    const user = users.find(u => u.telegramId === telegramId.toString());
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found', 
        message: 'Пользователь с этим Telegram ID не найден в системе. Обратитесь к администратору.' 
      }, { status: 404 });
    }
    
    // Находим код и подтверждаем его
    const data = await readData();
    const authCode = data.codes.find(c => c.code === code);
    
    if (!authCode) {
      return NextResponse.json({ 
        error: 'Code not found',
        message: 'Код не найден или истёк срок его действия. Запросите новый код на странице входа.'
      }, { status: 404 });
    }
    
    if (new Date(authCode.expiresAt) < new Date()) {
      return NextResponse.json({ 
        error: 'Code expired',
        message: 'Срок действия кода истёк. Запросите новый код на странице входа.'
      }, { status: 400 });
    }
    
    // Подтверждаем код
    authCode.authenticated = true;
    authCode.userId = user.id;
    
    await writeData(data);
    
    return NextResponse.json({ 
      success: true, 
      message: `Авторизация успешна! Добро пожаловать, ${user.username}!` 
    });
  } catch (error) {
    console.error('Error confirming telegram auth:', error);
    return NextResponse.json({ error: 'Failed to confirm auth' }, { status: 500 });
  }
}
