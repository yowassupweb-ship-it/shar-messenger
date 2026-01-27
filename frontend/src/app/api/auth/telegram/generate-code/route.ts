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

const DATA_FILE = path.join(process.cwd(), '..', 'data', 'telegram_auth.json');

async function readData(): Promise<TelegramAuthData> {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
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

function generateCode(): string {
  // Генерируем 6-значный код
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const data = await readData();
    
    // Очищаем просроченные коды (старше 10 минут)
    const now = new Date();
    data.codes = data.codes.filter(c => new Date(c.expiresAt) > now);
    
    // Генерируем новый код
    const code = generateCode();
    const createdAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 минут
    
    data.codes.push({
      code,
      createdAt,
      expiresAt,
      authenticated: false
    });
    
    await writeData(data);
    
    return NextResponse.json({ code });
  } catch (error) {
    console.error('Error generating telegram code:', error);
    return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
  }
}
