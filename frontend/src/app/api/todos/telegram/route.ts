import { NextRequest, NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile } from '@/lib/dataStore';

interface TelegramSettings {
  botToken: string;
  enabled: boolean;
}

const DEFAULT_SETTINGS: TelegramSettings = {
  botToken: '',
  enabled: false
};

// GET - получить настройки
export async function GET() {
  try {
    const settings = readJsonFile<TelegramSettings>('telegram-settings.json', DEFAULT_SETTINGS);
    // Не отправляем токен клиенту, только статус
    return NextResponse.json({ 
      enabled: settings.enabled,
      hasToken: !!settings.botToken 
    });
  } catch (error) {
    console.error('Error reading telegram settings:', error);
    return NextResponse.json({ error: 'Failed to read settings' }, { status: 500 });
  }
}

// PUT - обновить настройки
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const settings = readJsonFile<TelegramSettings>('telegram-settings.json', DEFAULT_SETTINGS);
    
    if (body.botToken !== undefined) {
      settings.botToken = body.botToken;
    }
    if (body.enabled !== undefined) {
      settings.enabled = body.enabled;
    }
    
    writeJsonFile('telegram-settings.json', settings);
    
    return NextResponse.json({ 
      enabled: settings.enabled,
      hasToken: !!settings.botToken 
    });
  } catch (error) {
    console.error('Error updating telegram settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

// POST - отправить уведомление
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatId, message } = body;
    
    if (!chatId || !message) {
      return NextResponse.json({ error: 'chatId and message are required' }, { status: 400 });
    }
    
    const settings = readJsonFile<TelegramSettings>('telegram-settings.json', DEFAULT_SETTINGS);
    
    if (!settings.enabled || !settings.botToken) {
      return NextResponse.json({ error: 'Telegram notifications are disabled or not configured' }, { status: 400 });
    }
    
    // Отправляем сообщение через Telegram API
    const response = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      console.error('Telegram API error:', result);
      return NextResponse.json({ error: result.description || 'Failed to send message' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending telegram notification:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
