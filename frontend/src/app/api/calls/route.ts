import { promises as fs } from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * WebRTC Call Signaling Server
 *
 * Durable signaling broker for WebRTC SDP/ICE exchange.
 * State is stored on disk so signals survive across Next.js route workers.
 * A per-chat session guard prevents competing offers from creating glare loops.
 */

interface CallSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'reject' | 'hangup' | 'group-invite' | 'group-join' | 'group-leave';
  callId: string;
  fromUserId: string;
  toUserId: string;
  chatId: string;
  callType?: 'voice' | 'video';
  fromUserName?: string;
  isGroup?: boolean;
  groupParticipants?: string[];
  payload?: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
}

interface SignalEnvelope {
  signal: CallSignal;
  ts: number;
  scope?: 'p2p' | 'group';
}

interface CallSession {
  sessionKey: string;
  callId: string;
  chatId: string;
  participantKey: string;
  initiatorUserId: string;
  recipientUserId: string;
  status: 'ringing' | 'answered';
  createdAt: number;
  lastActivityAt: number;
}

interface SignalingState {
  queues: Record<string, SignalEnvelope[]>;
  sessions: Record<string, CallSession>;
}

const TTL_MS = 30_000;
const SESSION_TTL_MS = 45_000;
const LOCK_STALE_MS = 10_000;
const DATA_DIR = process.env.CALL_SIGNALING_DIR || path.join(process.cwd(), '..', 'runtime-data');
const STATE_FILE = path.join(DATA_DIR, 'call-signaling.json');
const LOCK_FILE = path.join(DATA_DIR, 'call-signaling.lock');
const USE_MEMORY_SIGNALING = process.env.CALL_SIGNALING_STORE === 'memory';

function getMemoryState(): SignalingState {
  const globalStore = globalThis as unknown as { __callSignalingState?: SignalingState };
  if (!globalStore.__callSignalingState) {
    globalStore.__callSignalingState = createEmptyState();
  }
  return globalStore.__callSignalingState;
}

function createEmptyState(): SignalingState {
  return {
    queues: {},
    sessions: {},
  };
}

async function ensureStateFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STATE_FILE);
  } catch {
    await fs.writeFile(STATE_FILE, JSON.stringify(createEmptyState(), null, 2), 'utf8');
  }
}

async function delay(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function acquireLock(retries = 80, delayMs = 25) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const handle = await fs.open(LOCK_FILE, 'wx');
      await handle.writeFile(String(process.pid));
      return handle;
    } catch (error: unknown) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST') {
        throw error;
      }

      // Recover from stale lock left by crashed process.
      try {
        const stat = await fs.stat(LOCK_FILE);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          await fs.unlink(LOCK_FILE).catch(() => {});
        }
      } catch {
        // lock may disappear between checks
      }

      await delay(delayMs);
    }
  }

  throw new Error('CALL_SIGNAL_LOCK_TIMEOUT');
}

async function releaseLock(handle: Awaited<ReturnType<typeof fs.open>>) {
  await handle.close();
  await fs.unlink(LOCK_FILE).catch(() => {});
}

async function readState(): Promise<SignalingState> {
  await ensureStateFile();
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<SignalingState>;
    return {
      queues: parsed.queues ?? {},
      sessions: parsed.sessions ?? {},
    };
  } catch {
    return createEmptyState();
  }
}

async function writeState(state: SignalingState) {
  const tempFile = `${STATE_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(state, null, 2), 'utf8');
  await fs.rename(tempFile, STATE_FILE);
}

async function withLockedState<T>(
  mutator: (state: SignalingState) => Promise<T> | T,
): Promise<T> {
  if (USE_MEMORY_SIGNALING) {
    const state = pruneState(getMemoryState());
    const result = await mutator(state);
    return result;
  }

  await ensureStateFile();
  const lock = await acquireLock();
  try {
    const state = pruneState(await readState());
    const before = JSON.stringify(state);
    const result = await mutator(state);
    const after = JSON.stringify(state);
    if (after !== before) {
      await writeState(state);
    }
    return result;
  } finally {
    await releaseLock(lock);
  }
}

function pruneState(state: SignalingState): SignalingState {
  const now = Date.now();

  Object.entries(state.queues).forEach(([userId, queue]) => {
    const fresh = queue.filter(entry => now - entry.ts < TTL_MS);
    if (fresh.length > 0) {
      state.queues[userId] = fresh;
    } else {
      delete state.queues[userId];
    }
  });

  Object.entries(state.sessions).forEach(([sessionKey, session]) => {
    if (now - session.lastActivityAt >= SESSION_TTL_MS) {
      delete state.sessions[sessionKey];
    }
  });

  return state;
}

function enqueueSignal(
  state: SignalingState,
  signal: CallSignal,
  ts = Date.now(),
  scope: 'p2p' | 'group' = 'p2p',
) {
  const queue = state.queues[signal.toUserId] ?? [];
  queue.push({ signal, ts, scope });
  state.queues[signal.toUserId] = queue;
}

function getParticipantKey(userA: string, userB: string) {
  return [String(userA), String(userB)].sort().join(':');
}

function getSessionKey(chatId: string, userA: string, userB: string) {
  return `${chatId}:${getParticipantKey(userA, userB)}`;
}

function findSessionForCall(
  sessions: Record<string, CallSession>,
  chatId: string,
  callId: string,
  fromUserId: string,
): CallSession | null {
  const direct = Object.values(sessions).find(
    session =>
      session.chatId === chatId &&
      session.callId === callId &&
      (session.initiatorUserId === fromUserId || session.recipientUserId === fromUserId),
  );
  if (direct) return direct;

  return Object.values(sessions).find(
    session =>
      session.callId === callId &&
      (session.initiatorUserId === fromUserId || session.recipientUserId === fromUserId),
  ) ?? null;
}

function findSessionsByCall(
  sessions: Record<string, CallSession>,
  chatId: string,
  callId: string,
): CallSession[] {
  return Object.values(sessions).filter(
    session => session.chatId === chatId && session.callId === callId,
  );
}

function isGroupSignal(type: CallSignal['type'], isGroup?: boolean, targetCount?: number) {
  return Boolean(isGroup) || type.startsWith('group-') || (targetCount ?? 0) > 1;
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  const scopeParam = req.nextUrl.searchParams.get('scope');
  const scope: 'all' | 'p2p' | 'group' =
    scopeParam === 'group' ? 'group' : scopeParam === 'all' ? 'all' : 'p2p';
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    const signals = await withLockedState(state => {
      const queue = state.queues[userId] ?? [];
      const deliverableEntries = queue
        .filter(entry => {
          const entryScope = entry.scope ?? 'p2p';
          return scope === 'all' ? true : entryScope === scope;
        })
        .sort((left, right) => left.ts - right.ts);
      const queued = deliverableEntries.map(entry => entry.signal);

      const remainingEntries = queue.filter(entry => {
        const entryScope = entry.scope ?? 'p2p';
        return scope === 'all' ? false : entryScope !== scope;
      });

      if (remainingEntries.length > 0) {
        state.queues[userId] = remainingEntries;
      } else {
        delete state.queues[userId];
      }

      if (queued.length > 0) {
        console.log(
          `[CallsAPI] GET: Draining ${queued.length} ${scope} signals for user ${userId}:`,
          queued.map(sig => sig.type),
        );
      }

      return queued;
    });

    return NextResponse.json(signals);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[CallsAPI] GET error:', message);
    // Keep polling clients stable even when signaling store is temporarily unavailable.
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  let body: Partial<CallSignal & { toUserIds?: string[] }>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { toUserId, toUserIds, ...rest } = body;
  const targets = toUserIds ? toUserIds : toUserId ? [toUserId] : [];

  if (targets.length === 0) {
    return NextResponse.json({ error: 'toUserId or toUserIds required' }, { status: 400 });
  }

  if (!rest.type || !rest.callId || !rest.fromUserId || !rest.chatId) {
    return NextResponse.json({ error: 'type, callId, fromUserId and chatId are required' }, { status: 400 });
  }

  const type = rest.type as CallSignal['type'];
  const now = Date.now();
  const groupSignal = isGroupSignal(type, rest.isGroup, targets.length);

  let result: { ok: boolean; accepted: boolean; conflicts: Array<{ toUserId: string; activeCallId: string }> };
  try {
    result = await withLockedState(state => {
    const conflicts: Array<{ toUserId: string; activeCallId: string }> = [];

    const resolveTargetsForP2P = (initialTargets: string[]): string[] => {
      if (groupSignal || type === 'offer') {
        return initialTargets;
      }

      const sourceUserId = String(rest.fromUserId || '');
      const chatId = String(rest.chatId || '');
      const callId = String(rest.callId || '');
      const resolved = new Set<string>(initialTargets.map(String));

      const callSessions = findSessionsByCall(state.sessions, chatId, callId);
      for (const session of callSessions) {
        resolved.add(String(session.initiatorUserId));
        resolved.add(String(session.recipientUserId));
      }

      const session = findSessionForCall(state.sessions, chatId, callId, sourceUserId);
      if (session) {
        const counterpart =
          session.initiatorUserId === sourceUserId ? session.recipientUserId : session.initiatorUserId;
        if (counterpart && counterpart !== sourceUserId) {
          resolved.add(String(counterpart));
        }
      }

      resolved.delete(sourceUserId);

      if (callSessions.length === 0) {
        console.warn(
          `[CallsAPI] POST: no active session for ${type} callId=${callId}, chatId=${chatId}. Using requested targets only: ${initialTargets.join(',')}`,
        );
      }

      return Array.from(resolved);
    };

    const effectiveTargets = resolveTargetsForP2P(targets);

    for (const targetUserId of effectiveTargets) {
      const signal: CallSignal = {
        ...(rest as CallSignal),
        toUserId: targetUserId,
      };

      if (groupSignal) {
        enqueueSignal(state, signal, now, 'group');
        continue;
      }

      const sessionKey = getSessionKey(signal.chatId, signal.fromUserId, targetUserId);
      const existingSession = state.sessions[sessionKey];

      if (type === 'offer') {
        if (existingSession && existingSession.callId !== signal.callId) {
          conflicts.push({ toUserId: targetUserId, activeCallId: existingSession.callId });
          enqueueSignal(
            state,
            {
              type: 'reject',
              callId: signal.callId,
              fromUserId: targetUserId,
              toUserId: signal.fromUserId,
              chatId: signal.chatId,
              callType: signal.callType,
              payload: null,
            },
            now,
            'p2p',
          );
          continue;
        }

        if (
          existingSession &&
          existingSession.callId === signal.callId &&
          existingSession.initiatorUserId !== signal.fromUserId
        ) {
          // Protect against mirrored/reversed offers for the same callId.
          // Only the original initiator may send offer updates for a session.
          enqueueSignal(
            state,
            {
              type: 'reject',
              callId: signal.callId,
              fromUserId: targetUserId,
              toUserId: signal.fromUserId,
              chatId: signal.chatId,
              callType: signal.callType,
              payload: null,
            },
            now,
            'p2p',
          );
          continue;
        }

        state.sessions[sessionKey] = {
          sessionKey,
          callId: signal.callId,
          chatId: signal.chatId,
          participantKey: getParticipantKey(signal.fromUserId, targetUserId),
          initiatorUserId: signal.fromUserId,
          recipientUserId: targetUserId,
          status: 'ringing',
          createdAt: existingSession?.createdAt ?? now,
          lastActivityAt: now,
        };
      } else if (type === 'answer') {
        if (existingSession && existingSession.callId === signal.callId) {
          existingSession.status = 'answered';
          existingSession.lastActivityAt = now;
        }
      } else if (type === 'ice-candidate') {
        if (existingSession && existingSession.callId !== signal.callId) {
          continue;
        }

        if (existingSession) {
          existingSession.lastActivityAt = now;
        }
      } else if (type === 'reject' || type === 'hangup') {
        if (!existingSession || existingSession.callId === signal.callId) {
          delete state.sessions[sessionKey];
        }
      }

      enqueueSignal(state, signal, now, 'p2p');
    }

    console.log(
      `[CallsAPI] POST: type=${type} callId=${rest.callId} from=${rest.fromUserId} to=${effectiveTargets.join(',')} requested=${targets.join(',')} conflicts=${conflicts.length}`,
    );

    return {
      ok: conflicts.length === 0,
      accepted: conflicts.length === 0,
      conflicts,
    };
  });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[CallsAPI] POST error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
