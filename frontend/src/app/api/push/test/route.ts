import { NextRequest, NextResponse } from 'next/server';
import { sendWebPushToUser } from '@/lib/webPush';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = String(body?.userId || '').trim();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const title = String(body?.title || 'Тестовое push-уведомление');
    const message = String(body?.body || 'Push для PWA работает корректно');
    const url = String(body?.url || '/account?tab=settings');

    const result = await sendWebPushToUser(userId, {
      title,
      body: message,
      tag: 'push-test',
      url,
      requireInteraction: false,
      silent: false,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('POST /api/push/test error', error);
    return NextResponse.json({ error: 'Failed to send push test' }, { status: 500 });
  }
}
