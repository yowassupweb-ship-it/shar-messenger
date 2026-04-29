import webpush, { type PushSubscription } from 'web-push';
import { readJsonFile, writeJsonFile } from '@/lib/dataStore';

type StoredPushSubscription = {
  userId: string;
  endpoint: string;
  subscription: PushSubscription;
  userAgent?: string;
  platform?: string;
  createdAt: string;
  updatedAt: string;
};

type PushSubscriptionsData = {
  subscriptions: StoredPushSubscription[];
};

const SUBSCRIPTIONS_FILE = 'web_push_subscriptions.json';
const DEFAULT_SUBSCRIPTIONS: PushSubscriptionsData = { subscriptions: [] };

const getVapidConfig = () => {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || '';
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY || '';
  const subject = process.env.WEB_PUSH_SUBJECT || 'mailto:admin@shar-os.local';
  return { publicKey, privateKey, subject };
};

const configureWebPush = (): boolean => {
  const { publicKey, privateKey, subject } = getVapidConfig();
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
};

export const getPublicVapidKey = (): string => getVapidConfig().publicKey;

export const isWebPushConfigured = (): boolean => {
  const { publicKey, privateKey } = getVapidConfig();
  return Boolean(publicKey && privateKey);
};

export const getAllSubscriptions = (): StoredPushSubscription[] => {
  const data = readJsonFile<PushSubscriptionsData>(SUBSCRIPTIONS_FILE, DEFAULT_SUBSCRIPTIONS);
  return Array.isArray(data.subscriptions) ? data.subscriptions : [];
};

const saveAllSubscriptions = (subscriptions: StoredPushSubscription[]): void => {
  writeJsonFile<PushSubscriptionsData>(SUBSCRIPTIONS_FILE, { subscriptions });
};

export const upsertSubscription = (input: {
  userId: string;
  subscription: PushSubscription;
  userAgent?: string;
  platform?: string;
}): StoredPushSubscription => {
  const now = new Date().toISOString();
  const userId = String(input.userId || '').trim();
  const endpoint = String(input.subscription?.endpoint || '').trim();

  if (!userId || !endpoint) {
    throw new Error('Invalid subscription payload');
  }

  const items = getAllSubscriptions();
  const idx = items.findIndex(
    (item) => item.userId === userId && item.endpoint === endpoint
  );

  const next: StoredPushSubscription = {
    userId,
    endpoint,
    subscription: input.subscription,
    userAgent: input.userAgent,
    platform: input.platform,
    createdAt: idx >= 0 ? items[idx].createdAt : now,
    updatedAt: now,
  };

  if (idx >= 0) {
    items[idx] = next;
  } else {
    items.unshift(next);
  }

  if (items.length > 3000) {
    items.length = 3000;
  }

  saveAllSubscriptions(items);
  return next;
};

export const removeSubscription = (params: {
  userId?: string;
  endpoint?: string;
}): number => {
  const userId = String(params.userId || '').trim();
  const endpoint = String(params.endpoint || '').trim();
  const items = getAllSubscriptions();

  const filtered = items.filter((item) => {
    if (userId && endpoint) {
      return !(item.userId === userId && item.endpoint === endpoint);
    }
    if (userId) {
      return item.userId !== userId;
    }
    if (endpoint) {
      return item.endpoint !== endpoint;
    }
    return true;
  });

  const removed = items.length - filtered.length;
  if (removed > 0) {
    saveAllSubscriptions(filtered);
  }

  return removed;
};

export const sendWebPushToUser = async (
  userId: string,
  payload: Record<string, unknown>
): Promise<{ sent: number; failed: number }> => {
  if (!configureWebPush()) {
    return { sent: 0, failed: 0 };
  }

  const targetUserId = String(userId || '').trim();
  if (!targetUserId) {
    return { sent: 0, failed: 0 };
  }

  const all = getAllSubscriptions();
  const targets = all.filter((item) => item.userId === targetUserId);

  let sent = 0;
  let failed = 0;

  for (const item of targets) {
    try {
      await webpush.sendNotification(item.subscription, JSON.stringify(payload), {
        TTL: 120,
        urgency: 'high',
        topic: String(payload.tag || 'shar-notification'),
      });
      sent += 1;
    } catch (error: any) {
      failed += 1;
      const statusCode = Number(error?.statusCode || 0);
      if (statusCode === 404 || statusCode === 410) {
        removeSubscription({ userId: targetUserId, endpoint: item.endpoint });
      }
      console.warn('[webPush] sendNotification failed', {
        userId: targetUserId,
        endpoint: item.endpoint,
        statusCode,
      });
    }
  }

  return { sent, failed };
};
