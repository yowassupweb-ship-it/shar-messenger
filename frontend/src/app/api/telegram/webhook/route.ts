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
  role?: string;
}

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

const AUTH_DATA_FILE = path.join(process.cwd(), '..', 'data', 'telegram_auth.json');

async function readAuthData(): Promise<TelegramAuthData> {
  try {
    const dir = path.dirname(AUTH_DATA_FILE);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    if (!existsSync(AUTH_DATA_FILE)) {
      return { codes: [] };
    }
    const content = await readFile(AUTH_DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { codes: [] };
  }
}

async function writeAuthData(data: TelegramAuthData): Promise<void> {
  const dir = path.dirname(AUTH_DATA_FILE);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(AUTH_DATA_FILE, JSON.stringify(data, null, 2));
}

async function readTelegramSettings(): Promise<{ botToken: string; enabled: boolean }> {
  try {
    const settingsPath = path.join(process.cwd(), 'data', 'telegram-settings.json');
    if (!existsSync(settingsPath)) {
      return { botToken: '', enabled: false };
    }
    const content = await readFile(settingsPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { botToken: '', enabled: false };
  }
}

async function sendTelegramMessage(chatId: number, text: string, botToken: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}

// POST - обработка webhook от Telegram
export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();
    console.log('[Telegram Webhook] Received update:', JSON.stringify(update));
    
    if (!update.message?.text) {
      return NextResponse.json({ ok: true });
    }
    
    const settings = await readTelegramSettings();
    if (!settings.botToken) {
      console.log('[Telegram Webhook] Bot token not configured');
      return NextResponse.json({ ok: true });
    }
    
    const message = update.message;
    const text = (message.text || '').trim();
    const telegramId = message.from.id;
    const chatId = message.chat.id;
    
    // Команда /start (может содержать код авторизации)
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const startParam = parts[1]; // Код после /start
      
      // Если есть параметр и это 6-значный код - обрабатываем авторизацию
      if (startParam && /^\d{6}$/.test(startParam)) {
        // Используем код из параметра start
        const code = startParam;
        
        // Ищем пользователя по telegramId
        const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
        let user: User | null = null;
        
        try {
          const userRes = await fetch(`${backendUrl}/api/users`);
          if (userRes.ok) {
            const users: User[] = await userRes.json();
            user = users.find(u => u.telegramId === telegramId.toString()) || null;
          }
        } catch (error) {
          console.error('[Telegram Webhook] Error fetching users:', error);
        }
        
        if (!user) {
          await sendTelegramMessage(
            chatId,
            '❌ <b>Пользователь не найден</b>\n\n' +
            'Ваш Telegram ID не привязан к аккаунту в системе.\n' +
            'Обратитесь к администратору для привязки аккаунта.\n\n' +
            `Ваш Telegram ID: <code>${telegramId}</code>`,
            settings.botToken
          );
          return NextResponse.json({ ok: true });
        }
        
        // Находим код и подтверждаем
        const authData = await readAuthData();
        const authCode = authData.codes.find(c => c.code === code);
        
        if (!authCode) {
          await sendTelegramMessage(
            chatId,
            '❌ <b>Код не найден</b>\n\n' +
            'Этот код не существует или истёк.\n' +
            'Запросите новый код на странице входа.',
            settings.botToken
          );
          return NextResponse.json({ ok: true });
        }
        
        if (new Date(authCode.expiresAt) < new Date()) {
          await sendTelegramMessage(
            chatId,
            '⏰ <b>Код истёк</b>\n\n' +
            'Срок действия этого кода истёк.\n' +
            'Запросите новый код на странице входа.',
            settings.botToken
          );
          return NextResponse.json({ ok: true });
        }
        
        // Подтверждаем код
        authCode.authenticated = true;
        authCode.userId = user.id;
        await writeAuthData(authData);
        
        await sendTelegramMessage(
          chatId,
          `✅ <b>Авторизация успешна!</b>\n\n` +
          `Добро пожаловать, ${user.username}!\n` +
          `Теперь вы можете закрыть это окно и вернуться в браузер.`,
          settings.botToken
        );
        
        return NextResponse.json({ ok: true });
      }
      
      // Обычный /start без кода
      await sendTelegramMessage(
        chatId,
        '👋 Привет! Я бот для авторизации в VS Tools.\n\n' +
        '📝 Чтобы войти в систему:\n' +
        '1. Откройте страницу входа в VS Tools\n' +
        '2. Нажмите "Войти через Telegram"\n' +
        '3. Нажмите на кнопку "Открыть бота" - код будет передан автоматически\n\n' +
        '🔑 Или просто отправьте 6-значный код вручную!',
        settings.botToken
      );
      return NextResponse.json({ ok: true });
    }
    
    // Проверяем, является ли текст 6-значным кодом
    if (/^\d{6}$/.test(text)) {
      const code = text;
      
      // Ищем пользователя по telegramId
      const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
      let user: User | null = null;
      
      try {
        const userRes = await fetch(`${backendUrl}/api/users`);
        if (userRes.ok) {
          const users: User[] = await userRes.json();
          user = users.find(u => u.telegramId === telegramId.toString()) || null;
        }
      } catch (error) {
        console.error('[Telegram Webhook] Error fetching users:', error);
      }
      
      if (!user) {
        await sendTelegramMessage(
          chatId,
          '❌ <b>Пользователь не найден</b>\n\n' +
          'Ваш Telegram ID не привязан к аккаунту в системе.\n' +
          'Обратитесь к администратору для привязки аккаунта.\n\n' +
          `Ваш Telegram ID: <code>${telegramId}</code>`,
          settings.botToken
        );
        return NextResponse.json({ ok: true });
      }
      
      // Находим код и подтверждаем
      const authData = await readAuthData();
      const authCode = authData.codes.find(c => c.code === code);
      
      if (!authCode) {
        await sendTelegramMessage(
          chatId,
          '❌ <b>Код не найден</b>\n\n' +
          'Этот код не существует или истёк.\n' +
          'Запросите новый код на странице входа.',
          settings.botToken
        );
        return NextResponse.json({ ok: true });
      }
      
      if (new Date(authCode.expiresAt) < new Date()) {
        await sendTelegramMessage(
          chatId,
          '⏰ <b>Код истёк</b>\n\n' +
          'Срок действия этого кода истёк.\n' +
          'Запросите новый код на странице входа.',
          settings.botToken
        );
        return NextResponse.json({ ok: true });
      }
      
      // Подтверждаем код
      authCode.authenticated = true;
      authCode.userId = user.id;
      await writeAuthData(authData);
      
      await sendTelegramMessage(
        chatId,
        `✅ <b>Авторизация успешна!</b>\n\n` +
        `Добро пожаловать, ${user.username}!\n` +
        `Теперь вы можете закрыть это окно и вернуться в браузер.`,
        settings.botToken
      );
      
      return NextResponse.json({ ok: true });
    }
    
    // Неизвестная команда
    await sendTelegramMessage(
      chatId,
      '🤔 Не понимаю эту команду.\n\n' +
      'Если вы хотите войти в систему, отправьте 6-значный код с страницы входа.\n' +
      'Или отправьте /start для справки.',
      settings.botToken
    );
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error);
    return NextResponse.json({ ok: true });
  }
}

// GET - для проверки webhook
export async function GET() {
  return NextResponse.json({ status: 'Telegram webhook is active' });
}
