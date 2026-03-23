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

const POLL_INTERVAL_MS = 3500;
const SEEN_LIMIT = 300;
const CALENDAR_REMINDER_WINDOW_MS = 60 * 60 * 1000; // 1 час (для пропущенных)
const CALENDAR_EVENT_START_WINDOW_MS = 30 * 1000; // ± 30 секунд - напоминание РОВНО в момент начала события

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
  private visibilityHandler: (() => void) | null = null;
  private focusHandler: (() => void) | null = null;

  private seenTaskIds = new Set<string>();
  private chatSnapshots = new Map<string, ChatSnapshot>();
  private eventVersions = new Map<string, string>();
  private calendarEventVersions = new Map<string, string>();
  private calendarEventSnapshots = new Map<string, CalendarEventSnapshot>();
  private firedCalendarReminders = new Set<string>();
  private notifiedEventVersions = new Set<string>();
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
    this.attachWakeHandlers();
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
    this.detachWakeHandlers();
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private attachWakeHandlers(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    this.detachWakeHandlers();

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        void this.poll(false);
      }
    };

    this.focusHandler = () => {
      void this.poll(false);
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
    window.addEventListener('focus', this.focusHandler);
    window.addEventListener('online', this.focusHandler);
  }

  private detachWakeHandlers(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.focusHandler) {
      window.removeEventListener('focus', this.focusHandler);
      window.removeEventListener('online', this.focusHandler);
      this.focusHandler = null;
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

      const eventNotifiedRaw = localStorage.getItem(this.stateKey('event-notified-versions'));
      if (eventNotifiedRaw) {
        const keys: string[] = JSON.parse(eventNotifiedRaw);
        this.notifiedEventVersions = new Set(keys.slice(0, SEEN_LIMIT));
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
      this.notifiedEventVersions = new Set();
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
      localStorage.setItem(this.stateKey('event-notified-versions'), JSON.stringify(Array.from(this.notifiedEventVersions).slice(0, SEEN_LIMIT)));
    } catch {
      // ignore quota or serialization errors
    }
  }

  private claimEventVersionNotification(eventId: string, version: string): boolean {
    const normalizedEventId = String(eventId || '').trim();
    const normalizedVersion = String(version || '').trim();
    if (!normalizedEventId || !normalizedVersion) return true;

    const key = `${normalizedEventId}:${normalizedVersion}`;
    if (this.notifiedEventVersions.has(key)) return false;

    this.notifiedEventVersions.add(key);
    if (this.notifiedEventVersions.size > SEEN_LIMIT) {
      const oldest = this.notifiedEventVersions.values().next().value;
      if (oldest) this.notifiedEventVersions.delete(oldest);
    }
    return true;
  }

  private async ensurePermissionAndWorker(): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.log('[BrowserPushService] Notification API недоступен');
      return;
    }

    console.log(`[BrowserPushService] Текущий статус разрешений на уведомления: ${Notification.permission}`);

    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/notifications-sw.js');
      } catch {
        // ignore registration errors
      }
    }

    if (Notification.permission === 'default') {
      console.log('[BrowserPushService] Запрашиваем разрешение на уведомления...');
      try {
        const permission = await Notification.requestPermission();
        console.log(`[BrowserPushService] Результат запроса разрешений: ${permission}`);
      } catch (error) {
        console.error('[BrowserPushService] Ошибка при запросе разрешений:', error);
      }
    }
    
    if (Notification.permission === 'granted') {
      console.log('[BrowserPushService] ✅ Разрешение на уведомления получено');
    } else {
      console.warn('[BrowserPushService] ⚠️ Разрешение на уведомления не получено');
    }
  }

  private async poll(isInitial: boolean): Promise<void> {
    if (!this.running || !this.userId) return;
    if (this.inFlight) return;

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

      const isFavoritesChat = Boolean(chat?.isFavoritesChat) || chatId.startsWith('favorites_');
      if (isFavoritesChat) {
        continue;
      }

      const unreadCount = Number(chat?.unreadCount || 0);
      const lastMessageId = String(chat?.lastMessage?.id || '');
      const lastAuthorId = String(chat?.lastMessage?.authorId || '');
      const title = String(chat?.title || (chat?.isGroup ? 'Групповой чат' : 'Личные сообщения'));
      const snippet = String(chat?.lastMessage?.content || 'Новое сообщение');
      const authorName = String(chat?.lastMessage?.authorName || 'Неизвестный отправитель');

      const prev = this.chatSnapshots.get(chatId);
      this.chatSnapshots.set(chatId, { unreadCount, lastMessageId });

      if (isInitial || !this.isPrimed) continue;
      if (!prev) continue;
      if (unreadCount <= prev.unreadCount) continue;
      if (!lastMessageId || lastMessageId === prev.lastMessageId) continue;
      if (lastAuthorId === this.userId) continue;

      const context = this.getContext?.();
      const isPageVisible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true;
      if (isPageVisible && context?.activeTab === 'messages' && context?.isChatOpen) {
        continue;
      }

      await this.showNotification(authorName, snippet, {
        key: `msg:${chatId}:${lastMessageId}`,
        tag: `chat-${chatId}`,
        url: `/account?tab=messages&chat=${encodeURIComponent(chatId)}`,
        senderName: authorName,
        chatName: title,
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
      if (!this.claimEventVersionNotification(eventId, version)) continue;

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
    
    // Парсим дату в формате YYYY-MM-DD
    const dateMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) return null;
    
    const year = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1; // Месяцы в JavaScript 0-based
    const day = parseInt(dateMatch[3], 10);
    
    // Парсим время в формате HH:MM или HH:MM:SS
    const timeMatch = timeRaw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!timeMatch) return null;
    
    const hour = parseInt(timeMatch[1], 10);
    const minute = parseInt(timeMatch[2], 10);
    const second = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    
    // Создаем Date объект в локальном часовом поясе
    const parsed = new Date(year, month, day, hour, minute, second);

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
    
    // Отладочная информация
    const eventsWithReminder = events.filter(e => e?.remind);
    if (eventsWithReminder.length > 0) {
      console.log(`[BrowserPushService] Проверка ${eventsWithReminder.length} событий с напоминанием из ${events.length} всего`);
    }

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
        if (!this.claimEventVersionNotification(eventId, version)) {
          continue;
        }

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
        
        // После обновления/создания события проверяем, не нужно ли сразу показать напоминание
        // (если событие начинается прямо сейчас или скоро)
        if (event?.remind && isRelevant) {
          const reminderAt = this.parseCalendarReminderDate(event);
          if (reminderAt) {
            const now = Date.now();
            const reminderAtMs = reminderAt.getTime();
            const timeUntilEvent = reminderAtMs - now;
            const isImminentOrOngoing = Math.abs(timeUntilEvent) <= CALENDAR_EVENT_START_WINDOW_MS;
            
            if (isImminentOrOngoing) {
              const reminderKey = `calendar:${eventId}:${event.date || ''}:${event.time || '09:00'}`;
              
              if (!this.firedCalendarReminders.has(reminderKey)) {
                console.log(`[BrowserPushService] 🔔 Событие "${event.title}" начинается сейчас - отправка немедленного напоминания`);
                
                this.firedCalendarReminders.add(reminderKey);
                if (this.firedCalendarReminders.size > SEEN_LIMIT) {
                  const oldest = this.firedCalendarReminders.values().next().value;
                  if (oldest) this.firedCalendarReminders.delete(oldest);
                }
                
                const eventTitle = snapshot.title || 'Событие';
                const reminderDetailLines = this.buildCalendarEventDetailLines(snapshot)
                  .filter((line) => !line.startsWith('Описание:'));
                const reminderBody = [`«${eventTitle}»`, ...reminderDetailLines].join('\n');
                const browserReminderBody = reminderDetailLines.length > 0
                  ? `${eventTitle} • ${reminderDetailLines[0]}`
                  : eventTitle;

                await this.sendCalendarReminderToNotificationsChat(event, reminderBody);
                await this.showNotification('Напоминание о событии', browserReminderBody, {
                  key: `calendar-reminder:${reminderKey}`,
                  tag: `calendar-reminder-${eventId}`,
                  url: '/account?tab=calendar',
                  skipDedupe: true,
                });
                
                console.log(`[BrowserPushService] ✅ Немедленное напоминание отправлено для события "${event.title}"`);
              }
            }
          }
        }
      }

      if (!event?.remind) continue;
      
      console.log(`[BrowserPushService] Обработка напоминания для события "${event.title}" (${event.date} ${event.time}), remind=${event.remind}`);
      
      if (!isRelevant) {
        console.log(`[BrowserPushService] Событие "${event.title}" не релевантно пользователю`);
        continue;
      }

      const reminderAt = this.parseCalendarReminderDate(event);
      if (!reminderAt) {
        console.log(`[BrowserPushService] Не удалось распарсить дату для события "${event.title}": date=${event.date}, time=${event.time}`);
        continue;
      }

      const reminderAtMs = reminderAt.getTime();
      if (!Number.isFinite(reminderAtMs)) continue;

      // Проверяем, находимся ли мы в окне напоминания:
      // 1. В момент начала события (± 30 секунд)
      // 2. В течение 1 часа после события (если пропустили)
      const delta = now - reminderAtMs;
      const timeUntilEvent = reminderAtMs - now;
      
      // Допустимые окна:
      // - В момент начала: |timeUntilEvent| <= 30 секунд (ровно в момент начала)
      // - Пропущенное: delta > 30 секунд и delta < 1 час (для старых событий)
      const isAtEventStart = Math.abs(timeUntilEvent) <= CALENDAR_EVENT_START_WINDOW_MS; // ± 30 секунд от начала
      const isMissedRecent = delta > CALENDAR_EVENT_START_WINDOW_MS && delta <= CALENDAR_REMINDER_WINDOW_MS; // пропущено более 30 сек назад, но недавно (< 1 часа)
      const isInReminderWindow = isAtEventStart || isMissedRecent;
      
      if (!isInReminderWindow) {
        const deltaMin = Math.round(delta / 60000);
        const untilMin = Math.round(timeUntilEvent / 60000);
        console.log(`[BrowserPushService] Событие "${event.title}" вне окна напоминания: до события ${untilMin} мин, после события ${deltaMin} мин`);
        continue;
      }

      const reminderKey = `calendar:${eventId}:${event.date || ''}:${event.time || '09:00'}`;

      if (this.firedCalendarReminders.has(reminderKey)) {
        console.log(`[BrowserPushService] Напоминание для события "${event.title}" уже было отправлено`);
        continue;
      }

      console.log(`[BrowserPushService] 🔔 Отправка напоминания для события "${event.title}" (${event.date} ${event.time})`);

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
        skipDedupe: true, // У calendar reminders своя дедупликация через firedCalendarReminders
      });
      
      console.log(`[BrowserPushService] ✅ Напоминание успешно отправлено для события "${event.title}"`);
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
    options: {
      key: string;
      tag: string;
      url: string;
      skipDedupe?: boolean;
      senderName?: string;
      subtitle?: string;
      chatName?: string;
      avatar?: string;
      badge?: number;
    }
  ): Promise<void> {
    console.log(`[BrowserPushService] 🔔 showNotification вызван: "${title}"`);
    console.log(`[BrowserPushService] Body: "${body}"`);
    console.log(`[BrowserPushService] Key: ${options.key}, Tag: ${options.tag}, SkipDedupe: ${options.skipDedupe}`);
    
    const dedupeKey = options.key;
    
    // Пропускаем проверку дедупликации для calendar reminders (у них своя дедупликация через firedCalendarReminders)
    if (!options.skipDedupe) {
      if (this.shownKeys.has(dedupeKey)) {
        console.log(`[BrowserPushService] ⚠️ Уведомление с ключом ${dedupeKey} уже было показано`);
        return;
      }
      this.shownKeys.add(dedupeKey);
      console.log(`[BrowserPushService] ✅ Ключ ${dedupeKey} добавлен в дедупликацию`);
    } else {
      console.log(`[BrowserPushService] ⏭️ Дедупликация пропущена (используется внешняя дедупликация)`);
    }

    // Проверяем, запущены ли мы в Electron
    const isElectron = typeof window !== 'undefined' && Boolean(window.sharDesktop?.showNotification);
    
    if (isElectron) {
      console.log('[BrowserPushService] 🖥️ Обнаружен Electron, используем desktop-уведомления');
      try {
        const kind = options.url.includes('tab=tasks')
          ? 'task'
          : options.url.includes('tab=calendar')
            ? 'event'
            : options.url.includes('tab=messages')
              ? 'message'
              : 'system';

        await window.sharDesktop!.showNotification({
          title,
          subtitle: options.subtitle || (kind === 'task' ? 'Задачи' : kind === 'event' ? 'Календарь' : kind === 'system' ? 'Shar OS' : 'Сообщения'),
          senderName: options.senderName || title,
          chatName: options.chatName,
          message: body,
          avatar: options.avatar,
          timestamp: Date.now(),
          badge: options.badge,
          chatId: options.url.includes('chat=') ? options.url.split('chat=')[1]?.split('&')[0] : undefined,
          url: options.url,
          kind,
        });
        console.log('[BrowserPushService] ✅✅✅ Electron уведомление отправлено');
        return;
      } catch (err) {
        console.error('[BrowserPushService] ❌ Ошибка при отправке Electron уведомления:', err);
      }
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.log('[BrowserPushService] ❌ Notification API недоступен');
      return;
    }

    console.log(`[BrowserPushService] Notification.permission: ${Notification.permission}`);

    if (Notification.permission !== 'granted') {
      console.warn(`[BrowserPushService] ❌ Разрешение не дано (${Notification.permission}), уведомление не будет показано`);
      return;
    }

    const notificationOptions: NotificationOptions & {
      renotify?: boolean;
      requireInteraction?: boolean;
      timestamp?: number;
      vibrate?: number[];
    } = {
      body,
      tag: options.tag,
      icon: '/Group 8.png',
      badge: '/Group 8.png',
      data: { url: options.url },
      silent: false,
      renotify: true,
      requireInteraction: false,
      timestamp: Date.now(),
      vibrate: [200, 100, 200],
    };

    console.log(`[BrowserPushService] 📦 Параметры уведомления:`, notificationOptions);

    try {
      if ('serviceWorker' in navigator) {
        console.log('[BrowserPushService] 🔍 Проверка service worker...');
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          console.log('[BrowserPushService] ✅ Service worker найден, показываем уведомление...');
          await registration.showNotification(title, notificationOptions);
          console.log(`[BrowserPushService] ✅✅✅ Уведомление показано через service worker: "${title}"`);
          return;
        } else {
          console.log('[BrowserPushService] ⚠️ Service worker не зарегистрирован');
        }
      } else {
        console.log('[BrowserPushService] ⚠️ Service Worker API недоступен');
      }

      console.log('[BrowserPushService] 🔔 Показываем уведомление через Notification API...');
      const notice = new Notification(title, notificationOptions);
      notice.onclick = () => {
        window.focus();
        window.location.href = options.url;
      };
      console.log(`[BrowserPushService] ✅✅✅ Уведомление показано через Notification API: "${title}"`);
    } catch (error) {
      console.error('[BrowserPushService] ❌❌❌ Ошибка при показе уведомления:', error);
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
