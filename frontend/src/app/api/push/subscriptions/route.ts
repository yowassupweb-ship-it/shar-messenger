import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSubscriptions,
  getPublicVapidKey,
  isWebPushConfigured,
  removeSubscription,
  upsertSubscription,
} from '@/lib/webPush';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = String(searchParams.get('userId') || '').trim();

    if (!userId) {
      return NextResponse.json({
        configured: isWebPushConfigured(),
        publicKey: getPublicVapidKey() || null,
      });
    }

    const all = getAllSubscriptions();
    const count = all.filter((item) => item.userId === userId).length;

    return NextResponse.json({
      configured: isWebPushConfigured(),
      publicKey: getPublicVapidKey() || null,
      userId,
      count,
    });
  } catch (error) {
    console.error('GET /api/push/subscriptions error', error);
    return NextResponse.json({ error: 'Failed to read push subscriptions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = String(body?.userId || '').trim();
    const subscription = body?.subscription;

    if (!userId || !subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (!isWebPushConfigured()) {
      return NextResponse.json(
        { error: 'Web push is not configured on server' },
        { status: 503 }
      );
    }

    const saved = upsertSubscription({
      userId,
      subscription,
      userAgent: String(body?.userAgent || ''),
      platform: String(body?.platform || ''),
    });

    return NextResponse.json({ success: true, endpoint: saved.endpoint, updatedAt: saved.updatedAt });
  } catch (error) {
    console.error('POST /api/push/subscriptions error', error);
    return NextResponse.json({ error: 'Failed to save push subscription' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = String(body?.userId || '').trim();
    const endpoint = String(body?.endpoint || '').trim();

    const removed = removeSubscription({ userId: userId || undefined, endpoint: endpoint || undefined });
    return NextResponse.json({ success: true, removed });
  } catch (error) {
    console.error('DELETE /api/push/subscriptions error', error);
    return NextResponse.json({ error: 'Failed to remove push subscription' }, { status: 500 });
  }
}
