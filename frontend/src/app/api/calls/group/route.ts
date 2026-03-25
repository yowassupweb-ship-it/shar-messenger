import { NextRequest, NextResponse } from 'next/server';

/**
 * Group Call State Storage
 *
 * POST /api/calls/group        { action:'start'|'join'|'leave', callId, chatId, userId, userName }
 * GET  /api/calls/group?callId=xxx   → list of participants currently in call
 */

interface Participant {
  userId: string;
  userName: string;
  joinedAt: number;
}

interface GroupCall {
  callId: string;
  chatId: string;
  startedAt: number;
  participants: Participant[];
}

declare global {
  // eslint-disable-next-line no-var
  var _groupCalls: Map<string, GroupCall>;
}

if (!global._groupCalls) {
  global._groupCalls = new Map();
}

const calls = global._groupCalls;

// Auto-close calls with no participants after 60 s
function prune() {
  const now = Date.now();
  calls.forEach((call, callId) => {
    const stale = call.participants.length === 0 && now - call.startedAt > 60_000;
    if (stale) calls.delete(callId);
  });
}

export async function GET(req: NextRequest) {
  prune();
  const callId = req.nextUrl.searchParams.get('callId');
  const chatId = req.nextUrl.searchParams.get('chatId');

  if (callId) {
    const call = calls.get(callId);
    if (!call) return NextResponse.json(null);
    return NextResponse.json(call);
  }

  if (chatId) {
    // Find active call for this chat
    const active = [...calls.values()].find(c => c.chatId === chatId);
    return NextResponse.json(active || null);
  }

  return NextResponse.json({ error: 'callId or chatId required' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  prune();

  let body: {
    action: 'start' | 'join' | 'leave';
    callId: string;
    chatId: string;
    userId: string;
    userName: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, callId, chatId, userId, userName } = body;

  if (!callId || !userId) {
    return NextResponse.json({ error: 'callId and userId required' }, { status: 400 });
  }

  if (action === 'start') {
    const call: GroupCall = {
      callId,
      chatId,
      startedAt: Date.now(),
      participants: [{ userId, userName, joinedAt: Date.now() }],
    };
    calls.set(callId, call);
    return NextResponse.json(call);
  }

  const call = calls.get(callId);
  if (!call) {
    return NextResponse.json({ error: 'Call not found' }, { status: 404 });
  }

  if (action === 'join') {
    if (!call.participants.find(p => p.userId === userId)) {
      call.participants.push({ userId, userName, joinedAt: Date.now() });
    }
    return NextResponse.json(call);
  }

  if (action === 'leave') {
    call.participants = call.participants.filter(p => p.userId !== userId);
    if (call.participants.length === 0) {
      calls.delete(callId);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
