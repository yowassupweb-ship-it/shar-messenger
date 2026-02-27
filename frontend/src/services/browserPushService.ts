type PollContext = {
  activeTab?: string;
  isChatOpen?: boolean;
};

type StartOptions = {
  userId: string;
  userName?: string;
  getContext?: () => PollContext;
};

type ChatSnapshot = {
  unreadCount: number;
  lastMessageId: string;
};

type CalendarReminderEvent = {
  id?: string;
  title?: string;
  date?: string;
  time?: string;
  remind?: boolean;
  type?: string;
  description?: string;
  createdBy?: string;
  assignedTo?: string;
  updatedAt?: string;
};

type CalendarEventSnapshot = {
  title: string;
  date: string;
  time: string;
  remind: boolean;
  type: string;
  description: string;
};

const POLL_INTERVAL_MS = 15000;
const SEEN_LIMIT = 300;
const CALENDAR_REMINDER_WINDOW_MS = 30 * 60 * 1000;

const TASK_STATUS_RU: Record<string, string> = {
  'todo': 'К выполнению',
  'pending': 'В ожидании',
  'in-progress': 'В работе',
  'in_progress': 'В работе',
  'review': 'На проверке',
  'cancelled': 'Отменена',
  'stuck': 'Застряла',
  'done': 'Готово',
};

export class BrowserPushService {
  private userId: string | null = null;
  private userName: string | null = null;
  private timer: number | null = null;
  private running = false;
  private isPrimed = false;
  private getContext: (() => PollContext) | null = null;
  private inFlight = false;

  private seenTaskIds = new Set<string>();
  private chatSnapshots = new Map<string, ChatSnapshot>();
  private eventVersions = new Map<string, string>();
  private calendarEventVersions = new Map<string, string>();
  private calendarEventSnapshots = new Map<string, CalendarEventSnapshot>();
  private firedCalendarReminders = new Set<string>();
  private shownKeys = new Set<string>();

  async start(options: StartOptions): Promise<void> {
    if (!options.userId) return;

    this.stop();
    this.userId = options.userId;
    this.userName = options.userName ? String(options.userName) : null;
    this.getContext = options.getContext || null;

    this.restoreState();
    await this.ensurePermissionAndWorker();

    this.running = true;
    await this.poll(true);

    if (!this.running) return;

    this.timer = window.setInterval(() => {
      void this.poll(false);
    }, POLL_INTERVAL_MS);
  }

  stop(): void {
    this.running = false;
    this.isPrimed = false;
    this.inFlight = false;
    this.userName = null;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private normalizeIdentity(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private getUserIdentityAliases(): Set<string> {
    const aliases = new Set<string>();
    const pushAlias = (value: unknown) => {
      const normalized = this.normalizeIdentity(value);
      if (normalized) aliases.add(normalized);
    };

    pushAlias(this.userId);
    pushAlias(this.userName);

    if (typeof window !== 'undefined') {
      pushAlias(localStorage.getItem('username'));
      try {
        const myAccountRaw = localStorage.getItem('myAccount');
        if (myAccountRaw) {
          const myAccount = JSON.parse(myAccountRaw);
          pushAlias(myAccount?.id);
          pushAlias(myAccount?.name);
          pushAlias(myAccount?.username);
        }
      } catch {
        // ignore malformed localStorage payloads
      }
    }

    return aliases;
  }

  private stateKey(suffix: string): string {
    return `push_state:${this.userId}:${suffix}`;
  }

  private restoreState() {
    if (!this.userId || typeof window === 'undefined') return;

    try {
      const tasksRaw = localStorage.getItem(this.stateKey('tasks'));
      if (tasksRaw) {
        const ids: string[] = JSON.parse(tasksRaw);
        this.seenTaskIds = new Set(ids.slice(0, SEEN_LIMIT));
      }

      const chatsRaw = localStorage.getItem(this.stateKey('chats'));
      if (chatsRaw) {
        const entries: [string, ChatSnapshot][] = JSON.parse(chatsRaw);
        this.chatSnapshots = new Map(entries);
      }

      const eventsRaw = localStorage.getItem(this.stateKey('events'));
      if (eventsRaw) {
        const entries: [string, string][] = JSON.parse(eventsRaw);
        this.eventVersions = new Map(entries);
      }

      const calendarRaw = localStorage.getItem(this.stateKey('calendar-reminders'));
      if (calendarRaw) {
        const keys: string[] = JSON.parse(calendarRaw);
        this.firedCalendarReminders = new Set(keys.slice(0, SEEN_LIMIT));
      }

      const calendarVersionsRaw = localStorage.getItem(this.stateKey('calendar-event-versions'));
      if (calendarVersionsRaw) {
        const entries: [string, string][] = JSON.parse(calendarVersionsRaw);
        this.calendarEventVersions = new Map(entries);
      }

      const calendarSnapshotsRaw = localStorage.getItem(this.stateKey('calendar-event-snapshots'));
      if (calendarSnapshotsRaw) {
        const entries: [string, CalendarEventSnapshot][] = JSON.parse(calendarSnapshotsRaw);
        this.calendarEventSnapshots = new Map(entries);
      }
    } catch {
      this.seenTaskIds = new Set();
      this.chatSnapshots = new Map();
      this.eventVersions = new Map();
      this.calendarEventVersions = new Map();
      this.calendarEventSnapshots = new Map();
      this.firedCalendarReminders = new Set();
    }
  }

  private persistState() {
    if (!this.userId || typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.stateKey('tasks'), JSON.stringify(Array.from(this.seenTaskIds).slice(0, SEEN_LIMIT)));
      localStorage.setItem(this.stateKey('chats'), JSON.stringify(Array.from(this.chatSnapshots.entries()).slice(0, SEEN_LIMIT)));
      localStorage.setItem(this.stateKey('events'), JSON.stringify(Array.from(this.eventVersions.entries()).slice(0, SEEN_LIMIT)));
      localStorage.setItem(this.stateKey('calendar-event-versions'), JSON.stringify(Array.from(this.calendarEventVersions.entries()).slice(0, SEEN_LIMIT)));
      localStorage.setItem(this.stateKey('calendar-event-snapshots'), JSON.stringify(Array.from(this.calendarEventSnapshots.entries()).slice(0, SEEN_LIMIT)));
      localStorage.setItem(this.stateKey('calendar-reminders'), JSON.stringify(Array.from(this.firedCalendarReminders).slice(0, SEEN_LIMIT)));
    } catch {
      // ignore quota or serialization errors
    }
  }

  private async ensurePermissionAndWorker(): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/notifications-sw.js');
      } catch {
        // ignore registration errors
      }
    }

    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore prompt failure
      }
    }
  }

  private async poll(isInitial: boolean): Promise<void> {
    if (!this.running || !this.userId) return;
    if (this.inFlight) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    this.inFlight = true;
    try {
      await Promise.all([
        this.pollTaskNotifications(isInitial),
        this.pollChats(isInitial),
        this.pollEvents(isInitial),
        this.pollCalendarReminders(isInitial),
      ]);

      if (isInitial) {
        this.isPrimed = true;
      }

      this.persistState();
    } finally {
      this.inFlight = false;
    }
  }

  private async pollTaskNotifications(isInitial: boolean): Promise<void> {
    const list = await this.fetchJson<any[]>(`/api/notifications?userId=${encodeURIComponent(this.userId || '')}`);
    if (!Array.isArray(list)) return;

    const unread = list.filter((item) => item && item.read === false && item.id);

    for (const item of unread) {
      const id = String(item.id);
      if (this.seenTaskIds.has(id)) continue;

      this.seenTaskIds.add(id);
      if (this.seenTaskIds.size > SEEN_LIMIT) {
        const oldest = this.seenTaskIds.values().next().value;
        if (oldest) this.seenTaskIds.delete(oldest);
      }

      if (!isInitial && this.isPrimed) {
        const title = this.mapTaskTitle(item.type);
        const rawBody = String(item.message || item.todoTitle || 'Новое уведомление по задаче');
        const body = this.localizeTaskStatusesInBody(rawBody);

        await this.showNotification(title, body, {
          key: `task:${id}`,
          tag: `task-${id}`,
          url: item.todoId ? `/account?tab=tasks&task=${encodeURIComponent(String(item.todoId))}` : '/account?tab=tasks',
        });
      }
    }
  }

  private localizeTaskStatusesInBody(body: string): string {
    if (!body) return body;

    const localizeToken = (value: string): string => {
      const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
      return TASK_STATUS_RU[normalized] || TASK_STATUS_RU[normalized.replace(/-/g, '_')] || value;
    };

    const arrowPattern = /([a-z][a-z\-_]*)\s*(?:→|->)\s*([a-z][a-z\-_]*)/gi;
    const withArrows = body.replace(arrowPattern, (_match, left, right) => `${localizeToken(left)} → ${localizeToken(right)}`);

    return withArrows
      .replace(/\bin-progress\b/gi, TASK_STATUS_RU['in-progress'])
      .replace(/\bin_progress\b/gi, TASK_STATUS_RU['in_progress'])
      .replace(/\bpending\b/gi, TASK_STATUS_RU['pending'])
      .replace(/\breview\b/gi, TASK_STATUS_RU['review'])
      .replace(/\bcancelled\b/gi, TASK_STATUS_RU['cancelled'])
      .replace(/\bstuck\b/gi, TASK_STATUS_RU['stuck'])
      .replace(/\btodo\b/gi, TASK_STATUS_RU['todo'])
      .replace(/\bdone\b/gi, TASK_STATUS_RU['done']);
  }

  private async pollChats(isInitial: boolean): Promise<void> {
    const chats = await this.fetchJson<any[]>(`/api/chats?user_id=${encodeURIComponent(this.userId || '')}`);
    if (!Array.isArray(chats)) return;

    for (const chat of chats) {
      const chatId = String(chat?.id || '');
      if (!chatId) continue;

      const unreadCount = Number(chat?.unreadCount || 0);
      const lastMessageId = String(chat?.lastMessage?.id || '');
      const lastAuthorId = String(chat?.lastMessage?.authorId || '');
      const title = String(chat?.title || (chat?.isGroup ? 'Групповой чат' : 'Личные сообщения'));
      const snippet = String(chat?.lastMessage?.content || 'Новое сообщение');

      const prev = this.chatSnapshots.get(chatId);
      this.chatSnapshots.set(chatId, { unreadCount, lastMessageId });

      if (isInitial || !this.isPrimed) continue;
      if (!prev) continue;
      if (unreadCount <= prev.unreadCount) continue;
      if (!lastMessageId || lastMessageId === prev.lastMessageId) continue;
      if (lastAuthorId === this.userId) continue;

      const context = this.getContext?.();
      if (context?.activeTab === 'messages' && context?.isChatOpen) {
        continue;
      }

      await this.showNotification('Новое сообщение', `${title}: ${snippet}`, {
        key: `msg:${chatId}:${lastMessageId}`,
        tag: `chat-${chatId}`,
        url: `/account?tab=messages&chat=${encodeURIComponent(chatId)}`,
      });
    }
  }

  private async pollEvents(isInitial: boolean): Promise<void> {
    const payload = await this.fetchJson<any>(`/api/events?userId=${encodeURIComponent(this.userId || '')}`);
    const events = Array.isArray(payload) ? payload : Array.isArray(payload?.events) ? payload.events : [];

    for (const event of events) {
      const eventId = String(event?.id || '');
      if (!eventId) continue;

      const version = String(event?.updatedAt || event?.createdAt || '');
      const prevVersion = this.eventVersions.get(eventId);
      this.eventVersions.set(eventId, version || '');

      if (isInitial || !this.isPrimed) continue;
      if (!version) continue;
      if (prevVersion === version) continue;

      const isOwn = String(event?.createdBy || '') === this.userId;
      if (isOwn) continue;

      const title = prevVersion ? 'Событие обновлено' : 'Новое событие';
      const body = String(event?.title || 'Изменение в календаре');

      await this.sendEventNotificationToNotificationsChat(event, title, body);

      await this.showNotification(title, body, {
        key: `event:${eventId}:${version}`,
        tag: `event-${eventId}`,
        url: '/account?tab=calendar',
      });
    }
  }

  private isCalendarEventRelevantToUser(event: CalendarReminderEvent): boolean {
    if (!this.userId) return false;

    const aliases = this.getUserIdentityAliases();
    const createdBy = this.normalizeIdentity(event?.createdBy);
    const assignedTo = this.normalizeIdentity(event?.assignedTo);

    if (createdBy && aliases.has(createdBy)) return true;
    if (assignedTo && aliases.has(assignedTo)) return true;

    if (!createdBy && !assignedTo) return true;

    return false;
  }

  private parseCalendarReminderDate(event: CalendarReminderEvent): Date | null {
    const dateRaw = String(event?.date || '').trim();
    if (!dateRaw) return null;

    const timeRaw = String(event?.time || '09:00').trim();
    const datePart = dateRaw.includes('T') ? dateRaw.split('T')[0] : dateRaw;
    const normalizedTime = timeRaw.length === 5 ? `${timeRaw}:00` : timeRaw;
    const full = `${datePart}T${normalizedTime}`;
    const parsed = new Date(full);

    if (!Number.isFinite(parsed.getTime())) return null;
    return parsed;
  }

  private toCalendarEventSnapshot(event: CalendarReminderEvent): CalendarEventSnapshot {
    return {
      title: String(event?.title || '').trim(),
      date: String(event?.date || '').trim(),
      time: String(event?.time || '').trim(),
      remind: Boolean(event?.remind),
      type: String(event?.type || '').trim(),
      description: String(event?.description || '').trim(),
    };
  }

  private formatCalendarEventType(type: string): string {
    switch (type) {
      case 'work':
        return 'Работа';
      case 'meeting':
        return 'Встреча';
      case 'event':
        return 'Событие';
      case 'holiday':
        return 'Праздник';
      case 'task':
        return 'Задача';
      case 'tz':
        return 'ТЗ';
      default:
        return type || 'Не указан';
    }
  }

  private buildCalendarEventDetailLines(snapshot: CalendarEventSnapshot): string[] {
    const lines: string[] = [];
    if (snapshot.date) lines.push(`Дата: ${snapshot.date}`);
    if (snapshot.time) lines.push(`Время: ${snapshot.time}`);
    if (snapshot.type) lines.push(`Тип: ${this.formatCalendarEventType(snapshot.type)}`);
    lines.push(`Напоминание: ${snapshot.remind ? 'включено' : 'выключено'}`);
    if (snapshot.description) {
      const shortDescription = snapshot.description.length > 140
        ? `${snapshot.description.slice(0, 140)}...`
        : snapshot.description;
      lines.push(`Описание: ${shortDescription}`);
    }
    return lines;
  }

  private buildCalendarEventChangeLines(prev: CalendarEventSnapshot, next: CalendarEventSnapshot): string[] {
    const lines: string[] = [];
    const pushChange = (label: string, before: string, after: string) => {
      if (before === after) return;
      lines.push(`${label}: ${before || '—'} → ${after || '—'}`);
    };

    pushChange('Название', prev.title, next.title);
    pushChange('Дата', prev.date, next.date);
    pushChange('Время', prev.time, next.time);
    pushChange('Тип', this.formatCalendarEventType(prev.type), this.formatCalendarEventType(next.type));
    pushChange('Напоминание', prev.remind ? 'включено' : 'выключено', next.remind ? 'включено' : 'выключено');
    pushChange('Описание', prev.description, next.description);

    return lines.length > 0 ? lines : ['Обновлены параметры события'];
  }

  private async pollCalendarReminders(isInitial: boolean): Promise<void> {
    const events = await this.fetchJson<CalendarReminderEvent[]>('/api/calendar-events');
    if (!Array.isArray(events)) return;

    const now = Date.now();

    for (const event of events) {
      if (!event?.id) continue;
      const eventId = String(event.id);
      const snapshot = this.toCalendarEventSnapshot(event);
      const prevSnapshot = this.calendarEventSnapshots.get(eventId);
      this.calendarEventSnapshots.set(eventId, snapshot);

      const isRelevant = this.isCalendarEventRelevantToUser(event);
      const version = String(
        event.updatedAt
          || `${event.date || ''}|${event.time || ''}|${event.title || ''}|${event.remind ? '1' : '0'}|${event.type || ''}|${event.description || ''}|${event.createdBy || ''}|${event.assignedTo || ''}`
      );
      const prevVersion = this.calendarEventVersions.get(eventId);
      this.calendarEventVersions.set(eventId, version);

      if (!isInitial && this.isPrimed && isRelevant && version && prevVersion !== version) {
        const title = prevVersion ? 'Событие обновлено' : 'Новое событие';
        const eventTitle = snapshot.title || 'Событие';
        const detailLines = prevVersion && prevSnapshot
          ? this.buildCalendarEventChangeLines(prevSnapshot, snapshot)
          : this.buildCalendarEventDetailLines(snapshot);
        const body = [`«${eventTitle}»`, ...detailLines].join('\n');
        const browserBody = detailLines.length > 0
          ? `${eventTitle} • ${detailLines[0]}`
          : eventTitle;

        await this.sendEventNotificationToNotificationsChat(event, title, body);
        await this.showNotification(title, browserBody, {
          key: `calendar-event:${eventId}:${version}`,
          tag: `calendar-event-${eventId}`,
          url: '/account?tab=calendar',
        });
      }

      if (!event?.remind) continue;
      if (!isRelevant) continue;

      const reminderAt = this.parseCalendarReminderDate(event);
      if (!reminderAt) continue;

      const reminderAtMs = reminderAt.getTime();
      if (!Number.isFinite(reminderAtMs)) continue;

      const delta = now - reminderAtMs;
      if (delta < 0 || delta > CALENDAR_REMINDER_WINDOW_MS) continue;

      const reminderKey = `calendar:${eventId}:${event.date || ''}:${event.time || '09:00'}`;

      if (this.firedCalendarReminders.has(reminderKey)) continue;

      this.firedCalendarReminders.add(reminderKey);
      if (this.firedCalendarReminders.size > SEEN_LIMIT) {
        const oldest = this.firedCalendarReminders.values().next().value;
        if (oldest) this.firedCalendarReminders.delete(oldest);
      }

      const eventTitle = snapshot.title || 'Событие';
      const reminderDetailLines = this.buildCalendarEventDetailLines(snapshot)
        .filter((line) => !line.startsWith('Описание:'));
      const body = [`«${eventTitle}»`, ...reminderDetailLines].join('\n');
      const browserBody = reminderDetailLines.length > 0
        ? `${eventTitle} • ${reminderDetailLines[0]}`
        : eventTitle;

      await this.sendCalendarReminderToNotificationsChat(event, body);

      await this.showNotification('Напоминание о событии', browserBody, {
        key: `calendar-reminder:${reminderKey}`,
        tag: `calendar-reminder-${eventId}`,
        url: '/account?tab=calendar',
      });
    }
  }

  private async sendCalendarReminderToNotificationsChat(
    event: CalendarReminderEvent,
    body: string
  ): Promise<void> {
    if (!this.userId) return;

    await this.postNotificationToChat({
      content: `Напоминание о событии\n${body}`,
      notificationType: 'event_reminder',
      linkedEventId: event?.id ? String(event.id) : null,
      linkedEventTitle: event.title || null,
    });
  }

  private async sendTaskNotificationToNotificationsChat(
    notification: any,
    title: string,
    body: string
  ): Promise<void> {
    if (!this.userId) return;

    const linkedTaskId = notification?.todoId ? String(notification.todoId) : null;

    await this.postNotificationToChat({
      content: `${title}\n${body}`,
      notificationType: notification?.type || 'task_notification',
      linkedTaskId,
    });
  }

  private async sendEventNotificationToNotificationsChat(
    event: any,
    title: string,
    body: string
  ): Promise<void> {
    if (!this.userId) return;

    await this.postNotificationToChat({
      content: `${title}\n${body}`,
      notificationType: 'event_update',
      linkedEventId: event?.id ? String(event.id) : null,
      linkedEventTitle: event?.title || null,
    });
  }

  private async postNotificationToChat(payload: Record<string, unknown>): Promise<void> {
    if (!this.userId) return;

    try {
      const response = await fetch(`/api/chats/notifications/${encodeURIComponent(this.userId)}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let details = '';
        try {
          details = await response.text();
        } catch {
          details = '';
        }
        console.warn('[BrowserPushService] Failed to save notification chat message', {
          status: response.status,
          statusText: response.statusText,
          details,
          userId: this.userId,
          payload,
        });
      }
    } catch (error) {
      console.warn('[BrowserPushService] Error sending notification chat message', {
        error,
        userId: this.userId,
        payload,
      });
    }
  }

  private mapTaskTitle(type?: string): string {
    switch (String(type || '')) {
      case 'new_task':
      case 'assignment':
        return 'Новая задача';
      case 'status_change':
      case 'task_status_changed':
        return 'Статус задачи изменён';
      case 'task_updated':
        return 'Задача изменена';
      case 'assignee_response':
        return 'Ответ по задаче';
      case 'mention':
        return 'Вас упомянули';
      default:
        return 'Уведомление по задаче';
    }
  }

  private async showNotification(
    title: string,
    body: string,
    options: { key: string; tag: string; url: string }
  ): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const dedupeKey = options.key;
    if (this.shownKeys.has(dedupeKey)) return;
    this.shownKeys.add(dedupeKey);

    const notificationOptions: NotificationOptions = {
      body,
      tag: options.tag,
      icon: '/favicon.png',
      badge: '/favicon.png',
      data: { url: options.url },
      silent: false,
    };

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.showNotification(title, notificationOptions);
          return;
        }
      }

      const notice = new Notification(title, notificationOptions);
      notice.onclick = () => {
        window.focus();
        window.location.href = options.url;
      };
    } catch {
      // ignore notification failures
    }
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) return null;
      return (await response.json()) as T;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timeout);
    }
  }
}
