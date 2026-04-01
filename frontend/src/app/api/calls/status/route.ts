import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

export async function GET(req: NextRequest) {
  try {
    const backendUrl = `${BACKEND_URL}/api/calls/status${req.nextUrl.search}`;
    const response = await fetch(backendUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[calls status proxy] GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
