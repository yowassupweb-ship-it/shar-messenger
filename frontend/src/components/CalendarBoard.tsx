'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, Clock, MessageCircle, User, UserCheck, Plus, X, Edit3, ChevronDown, Settings, Info, List, RefreshCw, Link2, Users } from 'lucide-react';
import FormField from './ui/FormField';
import { useTheme } from '@/contexts/ThemeContext';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  remind?: boolean;
  description?: string;
  type: 'work' | 'meeting' | 'event' | 'holiday' | 'task' | 'tz';
  listId?: string;
  participants?: string[];
  recurrence?: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  sourceId?: string;
  createdBy?: string;
  createdByName?: string;
  assignedBy?: string;
}

interface CalendarList {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
  allowedUsers?: string[];
  allowedDepartments?: string[];
}

interface Department {
  id: string;
  name: string;
  color?: string;
  order: number;
}

interface UserAccount {
  id: string;
  name: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  avatar?: string;
}

interface Todo {
  id: string;
  title: string;
  dueDate?: string;
  calendarEventId?: string;
  addToCalendar?: boolean;
  completed: boolean;
  status?: 'todo' | 'in-progress' | 'pending' | 'review' | 'stuck' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  assignedToId?: string;
  assignedToIds?: string[];
  assignedById?: string;
  description?: string;
  listId?: string;
  archived?: boolean;
}

interface TodoList {
  id: string;
  name: string;
  color: string;
}

interface Person {
  id: string;
  name: string;
  avatar?: string;
  username?: string;
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

interface ChatSettings {
  chatOverlayImageDark?: string;
  chatOverlayImageLight?: string;
  chatOverlayScale?: number;
  chatOverlayOpacity?: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-green-500'
};

const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  work: { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-l-blue-500' },
  meeting: { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-l-purple-500' },
  event: { bg: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-700 dark:text-green-300', border: 'border-l-green-500' },
  holiday: { bg: 'bg-pink-100 dark:bg-pink-500/20', text: 'text-pink-700 dark:text-pink-300', border: 'border-l-pink-500' }
};

export default function CalendarBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [lists, setLists] = useState<TodoList[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [chatSettings, setChatSettings] = useState<ChatSettings>({
    chatOverlayImageDark: '',
    chatOverlayImageLight: '',
    chatOverlayScale: 100,
    chatOverlayOpacity: 1,
  });
  const [newEvent, setNewEvent] = useState({
    title: '',
    time: '',
    remind: false,
    description: '',
    type: 'work' as 'work' | 'meeting' | 'event' | 'holiday',
    recurrence: 'once' as 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  });

  // Календарные листы
  const [calendarLists, setCalendarLists] = useState<CalendarList[]>([]);
  const [activeListId, setActiveListId] = useState<string>('');
  const [showListSelector, setShowListSelector] = useState(false);
  const [showListSettings, setShowListSettings] = useState(false);
  const [listSettingsData, setListSettingsData] = useState<CalendarList | null>(null);
  const [showCreateList, setShowCreateList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState('#3B82F6');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newListAllowedUsers, setNewListAllowedUsers] = useState<string[]>([]);
  const [newListAllowedDepartments, setNewListAllowedDepartments] = useState<string[]>([]);
  const [editListAccess, setEditListAccess] = useState<{listId: string, users: string[], departments: string[]} | null>(null);
  
  // Advanced access management states
  const [accessPermission, setAccessPermission] = useState<'viewer' | 'editor'>('viewer');
  const [accessShareTarget, setAccessShareTarget] = useState<'chat' | 'department' | 'user' | 'link'>('user');
  const [accessSelectedChatId, setAccessSelectedChatId] = useState('');
  const [accessSelectedDepartmentId, setAccessSelectedDepartmentId] = useState('');
  const [accessSelectedUserId, setAccessSelectedUserId] = useState('');
  const [searchChatAccess, setSearchChatAccess] = useState('');
  const [searchDepartmentAccess, setSearchDepartmentAccess] = useState('');
  const [searchUserAccess, setSearchUserAccess] = useState('');
  const [showChatDropdown, setShowChatDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false);
  const [showShareTargetDropdown, setShowShareTargetDropdown] = useState(false);
  const [showSharedCalendarToast, setShowSharedCalendarToast] = useState(false);
  const [calendarToastType, setCalendarToastType] = useState<'shared' | 'personal'>('shared');

  const isMainSharedList = useCallback((list?: CalendarList | null) => {
    if (!list) return false;
    return list.id === 'shared-main' || list.isDefault || list.name.toLowerCase().includes('общ');
  }, []);

  const activeCalendarList = calendarLists.find(l => l.id === activeListId) || null;

  useEffect(() => {
    if (!activeCalendarList) {
      setShowSharedCalendarToast(false);
      return;
    }

    setCalendarToastType(isMainSharedList(activeCalendarList) ? 'shared' : 'personal');

    setShowSharedCalendarToast(true);
    const timeoutId = setTimeout(() => {
      setShowSharedCalendarToast(false);
    }, 4000);

    return () => clearTimeout(timeoutId);
  }, [activeCalendarList, isMainSharedList]);

  // Загрузка настроек overlay
  useEffect(() => {
    const defaultSettings = {
      chatOverlayImageDark: '',
      chatOverlayImageLight: '',
      chatOverlayScale: 100,
      chatOverlayOpacity: 1,
    };
    
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      try {
        const settings = { ...defaultSettings, ...JSON.parse(savedSettings) };
        setChatSettings({
          chatOverlayImageDark: settings.chatOverlayImageDark || '',
          chatOverlayImageLight: settings.chatOverlayImageLight || '',
          chatOverlayScale: settings.chatOverlayScale ?? 100,
          chatOverlayOpacity: settings.chatOverlayOpacity ?? 1,
        });
        console.log('[CalendarBoard] Загружены настройки overlay:', {
          theme,
          dark: settings.chatOverlayImageDark,
          light: settings.chatOverlayImageLight,
          scale: settings.chatOverlayScale,
          opacity: settings.chatOverlayOpacity
        });
      } catch (error) {
        console.error('Failed to parse chatSettings:', error);
        setChatSettings(defaultSettings);
      }
    } else {
      console.log('[CalendarBoard] Нет сохраненных настроек, используем дефолтные');
      setChatSettings(defaultSettings);
    }
  }, [theme]);

  // Управление классом modal-open для скрытия нижнего меню
  useEffect(() => {
    if (showAddEvent || editingEvent || showListSettings || showCreateList) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showAddEvent, editingEvent, showListSettings, showCreateList]);

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      try {
        const username = localStorage.getItem('username') || '';
        const [todosRes, peopleRes, eventsRes, calListsRes, usersRes, deptsRes] = await Promise.all([
          fetch('/api/todos'),
          fetch('/api/todos/people'),
          fetch('/api/calendar-events'),
          fetch(`/api/calendar-lists?userId=${encodeURIComponent(username)}`),
          fetch('/api/users'),
          fetch('/api/departments')
        ]);

        if (todosRes.ok) {
          const data = await todosRes.json();
          setTodos(data.todos || []);
          setLists(data.lists || []);
        }

        if (peopleRes.ok) {
          const data = await peopleRes.json();
          setPeople(data.people || []);
        }

        if (calListsRes.ok) {
          const data = await calListsRes.json();
          const lists = data.lists || [];
          setCalendarLists(lists);
          
          // Приоритет: localStorage > API > первый доступный
          const savedListId = localStorage.getItem('calendar_active_list_id');
          if (savedListId && lists.some((l: CalendarList) => l.id === savedListId)) {
            setActiveListId(savedListId);
          } else if (data.activeListId && lists.some((l: CalendarList) => l.id === data.activeListId)) {
            setActiveListId(data.activeListId);
          } else if (lists.length > 0) {
            setActiveListId(lists[0].id);
          }
        }

        let loadedUsers: any[] = [];
        if (usersRes.ok) {
          const data = await usersRes.json();
          // Обработка разных форматов ответа (массив или объект с полем users)
          loadedUsers = Array.isArray(data) ? data : (data.users || []);
          console.log('[CalendarBoard] Loaded users:', loadedUsers.length, loadedUsers);
          setUsers(loadedUsers);
        } else {
          console.error('[CalendarBoard] Failed to load users:', usersRes.status);
        }

        if (deptsRes.ok) {
          const data = await deptsRes.json();
          console.log('[CalendarBoard] Loaded departments:', data);
          const deptsList = data.departments || [];
          console.log('[CalendarBoard] Departments list:', deptsList.length, deptsList);
          
          // Fallback: если отделы не загрузились, извлекаем из пользователей
          if (deptsList.length === 0 && loadedUsers.length > 0) {
            const deptSet = new Set<string>();
            loadedUsers.forEach((user: any) => {
              if (user.department) deptSet.add(user.department);
            });
            const fallbackDepts = Array.from(deptSet).sort().map((name, idx) => ({
              id: name.toLowerCase().replace(/\s+/g, '_'),
              name,
              order: idx
            }));
            console.log('[CalendarBoard] Using departments from users:', fallbackDepts.length);
            setDepartments(fallbackDepts);
          } else {
            setDepartments(deptsList);
          }
        } else {
          console.log('[CalendarBoard] Departments API returned', deptsRes.status, '- using fallback from users');
          // Fallback: извлекаем отделы из пользователей
          if (loadedUsers.length > 0) {
            const deptSet = new Set<string>();
            loadedUsers.forEach((user: any) => {
              if (user.department) deptSet.add(user.department);
            });
            const fallbackDepts = Array.from(deptSet).sort().map((name, idx) => ({
              id: name.toLowerCase().replace(/\s+/g, '_'),
              name,
              order: idx
            }));
            console.log('[CalendarBoard] Using departments from users (error fallback):', fallbackDepts.length);
            setDepartments(fallbackDepts);
          }
        }

        if (eventsRes.ok) {
          const data = await eventsRes.json();
          console.log('[CalendarBoard] Events loaded:', data);
          // API возвращает массив напрямую, не объект {events: []}
          const eventsList = Array.isArray(data) ? data : (data.events || []);
          console.log('[CalendarBoard] Events count:', eventsList.length);
          setEvents(eventsList);
        } else {
          console.error('[CalendarBoard] Failed to load events:', eventsRes.status);
        }
      } catch (error) {
        console.error('Error loading calendar data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Открытие события по параметру URL ?event=ID
  useEffect(() => {
    const eventId = searchParams.get('event');
    
    if (eventId && events.length > 0 && !isLoading) {
      const event = events.find(e => e.id === eventId);
      if (event) {
        // Открываем модалку редактирования события
        handleEditEvent(event);
      }
    }
  }, [searchParams, events, isLoading]);

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Дни предыдущего месяца
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Дни текущего месяца
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Дни следующего месяца
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  };

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const normalizeDateKey = (value?: string) => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return formatDateKey(parsed);
  };

  const getTodosForDay = (date: Date) => {
    const dateKey = formatDateKey(date);
    return todos
      .filter(t => normalizeDateKey(t.dueDate) === dateKey)
      .sort((a, b) => {
        // Завершённые в конце
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        // По приоритету
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  };

  const getEventsForDay = (date: Date) => {
    const dateKey = formatDateKey(date);

    return events
      .filter(e => {
        if (normalizeDateKey(e.date) !== dateKey) return false;
        // Если нет активного листа, показываем все события
        if (!activeListId) return true;
        // Если у события нет listId (старые события), показываем их
        if (!e.listId) return true;
        // Иначе проверяем совпадение листов
        return e.listId === activeListId;
      })
      .sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time);
        return 0;
      });
  };

  const getTimelineItems = () => {
    const items: Array<{
      id: string;
      kind: 'event' | 'todo';
      date: string;
      time?: string;
      title: string;
      description?: string;
      completed?: boolean;
      priority?: Todo['priority'];
      eventType?: CalendarEvent['type'];
    }> = [];

    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const isWithinMonth = (dateStr?: string) => {
      const normalized = normalizeDateKey(dateStr);
      if (!normalized) return false;
      const date = new Date(normalized);
      return date >= monthStart && date <= monthEnd;
    };

    const visibleCalendarEvents = events.filter(e => {
      if (!e.date || !isWithinMonth(e.date)) return false;
      if (!activeListId) return true;
      if (!e.listId) return true;
      return e.listId === activeListId;
    });

    const visibleCalendarEventIds = new Set(
      visibleCalendarEvents.map((event) => String(event.id || '').trim()).filter(Boolean)
    );

    const visibleTodoSourceIds = new Set(
      visibleCalendarEvents
        .filter((event) => event.type === 'task' || event.type === 'tz')
        .map((event) => String(event.sourceId || '').trim())
        .filter(Boolean)
    );

    visibleCalendarEvents.forEach(e => {
        items.push({
          id: `event-${e.id}`,
          kind: 'event',
          date: normalizeDateKey(e.date),
          time: e.time,
          title: e.title,
          description: e.description,
          eventType: e.type
        });
      });

    todos
      .filter(t => {
        if (!t.dueDate || !isWithinMonth(t.dueDate) || t.archived) return false;

        const linkedEventId = String(t.calendarEventId || '').trim();
        const linkedByEventId = Boolean(linkedEventId) && visibleCalendarEventIds.has(linkedEventId);
        const linkedBySourceId = visibleTodoSourceIds.has(String(t.id || '').trim());

        return linkedByEventId || linkedBySourceId;
      })
      .forEach(t => {
        const normalizedDueDate = normalizeDateKey(t.dueDate);
        if (!normalizedDueDate) return;
        items.push({
          id: `todo-${t.id}`,
          kind: 'todo',
          date: normalizedDueDate,
          title: t.title,
          description: t.description,
          completed: t.completed,
          priority: t.priority
        });
      });

    items.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const timeA = a.time || '99:99';
      const timeB = b.time || '99:99';
      return timeA.localeCompare(timeB);
    });

    return items;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  const currentMonthLabel = currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const formattedCurrentMonthLabel = currentMonthLabel.charAt(0).toUpperCase() + currentMonthLabel.slice(1);

  const getPersonName = (id?: string) => {
    if (!id) return '';
    const person = people.find(p => p.id === id);
    return person?.name || '';
  };

  const resolveEventAuthorName = useCallback((event: CalendarEvent) => {
    const authorKey = event.createdBy || event.assignedBy || '';

    const matchedUser = users.find(user =>
      user.id === authorKey ||
      user.username === authorKey ||
      user.id === event.createdByName ||
      user.username === event.createdByName
    );

    if (matchedUser) {
      const composedName = [matchedUser.firstName, matchedUser.lastName].filter(Boolean).join(' ').trim();
      return composedName || matchedUser.name;
    }

    const matchedPerson = people.find(person =>
      person.id === authorKey ||
      person.username === authorKey ||
      person.id === event.createdByName ||
      person.username === event.createdByName
    );

    return matchedPerson?.name || event.createdByName || authorKey || 'Не указан';
  }, [users, people]);

  const getListColor = (listId?: string) => {
    if (!listId) return 'bg-gray-100 dark:bg-white/5';
    const list = lists.find(l => l.id === listId);
    return list ? `bg-[${list.color}]/10` : 'bg-gray-100 dark:bg-white/5';
  };

  const closeCreateListModal = () => {
    setShowCreateList(false);
    setNewListName('');
    setNewListColor('#3B82F6');
    setNewListAllowedUsers([]);
    setNewListAllowedDepartments([]);
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim() || !selectedDate) return;

    if (isMainSharedList(activeCalendarList)) {
      const shouldCreate = confirm('Вы создаёте событие в основном общем календаре. Его увидят все пользователи. Продолжить?');
      if (!shouldCreate) return;
    }

    try {
      const datesToAdd: Date[] = [];
      
      console.log('[CalendarBoard] Creating event with recurrence:', newEvent.recurrence);
      
      // Генерируем sourceId для группы повторяющихся событий
      const sourceId = newEvent.recurrence && newEvent.recurrence !== 'once' 
        ? `recurring_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` 
        : undefined;
      
      if (newEvent.recurrence && newEvent.recurrence !== 'once') {
        console.log('[CalendarBoard] Processing recurring event with sourceId:', sourceId);
        const startDate = new Date(selectedDate);
        const limitDate = new Date();
        limitDate.setFullYear(limitDate.getFullYear() + 1);
        
        console.log('[CalendarBoard] Start date:', startDate, 'Limit date:', limitDate);
        
        // Создаем события на год вперед (максимум 365)
        for (let i = 0; i < 365; i++) {
            const eventDate = new Date(startDate);
            
            // Вычисляем дату события в зависимости от типа повтора
            if (newEvent.recurrence === 'daily') {
              eventDate.setDate(startDate.getDate() + i);
            } else if (newEvent.recurrence === 'weekly') {
              eventDate.setDate(startDate.getDate() + (i * 7));
            } else if (newEvent.recurrence === 'biweekly') {
              eventDate.setDate(startDate.getDate() + (i * 14));
            } else if (newEvent.recurrence === 'monthly') {
              eventDate.setMonth(startDate.getMonth() + i);
            } else if (newEvent.recurrence === 'quarterly') {
              eventDate.setMonth(startDate.getMonth() + (i * 3));
            } else if (newEvent.recurrence === 'yearly') {
              eventDate.setFullYear(startDate.getFullYear() + i);
            }
            
            if (eventDate > limitDate) {
              console.log('[CalendarBoard] Reached limit date, stopping at iteration', i);
              break;
            }
            
            datesToAdd.push(eventDate);
        }
        console.log('[CalendarBoard] Generated', datesToAdd.length, 'dates for recurring events');
      } else {
        console.log('[CalendarBoard] Creating single (non-recurring) event');
        datesToAdd.push(new Date(selectedDate));
      }

      console.log('[CalendarBoard] Dates to create:', datesToAdd.map(d => formatDateKey(d)));

      const responses = await Promise.all(datesToAdd.map(async (date, index) => {
        const myAccountRaw = localStorage.getItem('myAccount');
        const myAccount = myAccountRaw ? JSON.parse(myAccountRaw) : null;
        const eventData = {
          title: newEvent.title,
          date: formatDateKey(date),
          time: newEvent.time || undefined,
          remind: newEvent.remind || undefined,
          description: newEvent.description || undefined,
          type: newEvent.type,
          listId: activeListId || undefined,
          recurrence: 'once',
          sourceId: sourceId,
          createdBy: myAccount?.id || localStorage.getItem('username') || undefined,
          createdByName: myAccount?.name || localStorage.getItem('username') || undefined,
          assignedBy: localStorage.getItem('username') || undefined
        };

        console.log(`[CalendarBoard] Creating event ${index + 1}/${datesToAdd.length}:`, eventData);
        const response = await fetch('/api/calendar-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData)
        });
        
        const result = await response.json();
        console.log(`[CalendarBoard] Event ${index + 1} created:`, response.ok, result);
        return result;
      }));
      
      console.log('[CalendarBoard] All events created successfully:', responses.length);

      // Reload all events to sync
      const res = await fetch('/api/calendar-events');
      if (res.ok) {
        const data = await res.json();
        console.log('[CalendarBoard] Reloaded events after create:', data);
        const eventsList = Array.isArray(data) ? data : (data.events || []);
        console.log('[CalendarBoard] Events count after reload:', eventsList.length);
        setEvents(eventsList);
      }

      // Показываем уведомление о количестве созданных событий
      if (datesToAdd.length > 1) {
        alert(`✅ Создано ${datesToAdd.length} повторяющихся событий`);
      }
      
      setShowAddEvent(false);
      setNewEvent({ title: '', time: '', remind: false, description: '', type: 'work', recurrence: 'once' });
      setSelectedDate(null);
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent || !newEvent.title.trim()) return;

    try {
      // Если изменяется повтор или убирается повтор у события из группы
      if (newEvent.recurrence === 'once') {
        const seriesEvents = getRecurringSeriesEvents(editingEvent);
        if (seriesEvents.length > 1) {
        // Спрашиваем подтверждение
          if (confirm('Это событие является частью повторяющейся группы. Удалить все связанные события?')) {
          // Удаляем все события с этим sourceId
            await handleDeleteRecurringSeries(editingEvent);
            setEditingEvent(null);
            setShowAddEvent(false);
            setNewEvent({ title: '', time: '', remind: false, description: '', type: 'work', recurrence: 'once' });
            return;
          }
        }
      }
      
      const eventData = {
        title: newEvent.title,
        date: editingEvent.date,
        time: newEvent.time || undefined,
        remind: newEvent.remind || undefined,
        description: newEvent.description || undefined,
        type: newEvent.type,
        listId: editingEvent.listId,
        recurrence: newEvent.recurrence,
        sourceId: editingEvent.sourceId
      };

      const res = await fetch(`/api/calendar-events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });

      if (res.ok) {
        const updated = await res.json();
        setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
        setEditingEvent(null);
        setShowAddEvent(false);
        setNewEvent({ title: '', time: '', remind: false, description: '', type: 'work', recurrence: 'once' });
      }
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleDeleteRecurringGroup = async (sourceId: string) => {
    try {
      console.log('[CalendarBoard] Deleting all events with sourceId:', sourceId);
      // Находим все события с этим sourceId
      const eventsToDelete = events.filter(e => e.sourceId === sourceId);
      console.log('[CalendarBoard] Found', eventsToDelete.length, 'events to delete');
      
      // Удаляем все события
      await Promise.all(eventsToDelete.map(e => 
        fetch(`/api/calendar-events/${e.id}`, { method: 'DELETE' })
      ));
      
      // Обновляем локальное состояние
      setEvents(prev => prev.filter(e => e.sourceId !== sourceId));

      // Синхронизируемся с сервером после массового удаления
      const reloadRes = await fetch('/api/calendar-events');
      if (reloadRes.ok) {
        const data = await reloadRes.json();
        const eventsList = Array.isArray(data) ? data : (data.events || []);
        setEvents(eventsList);
      }
      
      alert(`✅ Удалено ${eventsToDelete.length} связанных событий`);
    } catch (error) {
      console.error('Error deleting recurring group:', error);
    }
  };

  const getRecurringSeriesEvents = (event: CalendarEvent): CalendarEvent[] => {
    if (event.sourceId) {
      return events.filter(e => e.sourceId === event.sourceId);
    }

    if (!event.recurrence || event.recurrence === 'once') {
      return [];
    }

    return events.filter(e =>
      !e.sourceId &&
      e.recurrence === event.recurrence &&
      e.title === event.title &&
      e.type === event.type &&
      (e.time || '') === (event.time || '') &&
      (e.listId || '') === (event.listId || '')
    );
  };

  const handleDeleteRecurringSeries = async (event: CalendarEvent) => {
    if (event.sourceId) {
      await handleDeleteRecurringGroup(event.sourceId);
      return;
    }

    const eventsToDelete = getRecurringSeriesEvents(event);
    if (eventsToDelete.length <= 1) return;

    try {
      await Promise.all(eventsToDelete.map(e =>
        fetch(`/api/calendar-events/${e.id}`, { method: 'DELETE' })
      ));

      const idsToDelete = new Set(eventsToDelete.map(e => e.id));
      setEvents(prev => prev.filter(e => !idsToDelete.has(e.id)));

      const reloadRes = await fetch('/api/calendar-events');
      if (reloadRes.ok) {
        const data = await reloadRes.json();
        const eventsList = Array.isArray(data) ? data : (data.events || []);
        setEvents(eventsList);
      }

      alert(`✅ Удалено ${eventsToDelete.length} связанных событий`);
    } catch (error) {
      console.error('Error deleting recurring series:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      console.log('[CalendarBoard] === DELETE EVENT START ===');
      console.log('[CalendarBoard] Event ID to delete:', eventId);
      console.log('[CalendarBoard] Event ID type:', typeof eventId);
      console.log('[CalendarBoard] Event ID length:', eventId.length);
      console.log('[CalendarBoard] DELETE URL:', `/api/calendar-events/${eventId}`);
      
      // Удаляем только текущее событие (серия удаляется отдельной кнопкой)
      if (!confirm('Удалить только это событие?')) return;
      
      const res = await fetch(`/api/calendar-events/${eventId}`, { method: 'DELETE' });
      
      console.log('[CalendarBoard] Response status:', res.status);
      console.log('[CalendarBoard] Response ok:', res.ok);
      
      if (res.ok) {
        console.log('[CalendarBoard] Event deleted successfully');
        // Сразу удаляем из локального состояния
        setEvents(prev => prev.filter(e => e.id !== eventId));
        // Закрываем модалку редактирования
        setEditingEvent(null);
        // Перезагружаем все события с сервера
        const reloadRes = await fetch('/api/calendar-events');
        if (reloadRes.ok) {
          const data = await reloadRes.json();
          const eventsList = Array.isArray(data) ? data : (data.events || []);
          console.log('[CalendarBoard] Events reloaded after delete:', eventsList.length);
          setEvents(eventsList);
        }
        console.log('[CalendarBoard] === DELETE EVENT SUCCESS ===');
      } else {
        const errorText = await res.text();
        console.error('[CalendarBoard] Failed to delete event:', res.status, errorText);
        alert('Ошибка при удалении события');
      }
    } catch (error) {
      console.error('[CalendarBoard] Error deleting event:', error);
      alert('Ошибка при удалении события');
    }
  };

  const handleEditEvent = (event: CalendarEvent) => {
    // Если это событие задачи (task/tz), открываем модалку задачи
    if ((event.type === 'task' || event.type === 'tz') && event.sourceId) {
      router.push(`/account?tab=tasks&task=${event.sourceId}&from=${encodeURIComponent('/account?tab=calendar')}`, { scroll: false });
      return;
    }
    
    // Обычные события редактируем в форме
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      time: event.time || '',
      remind: !!event.remind,
      description: event.description || '',
      type: (event.type === 'task' || event.type === 'tz') ? 'work' : event.type,
      recurrence: event.recurrence || 'once'
    });
    setShowAddEvent(true);
  };

  const timelineItems = getTimelineItems();
  const editingRecurringGroupSize = editingEvent
    ? getRecurringSeriesEvents(editingEvent).length
    : 0;
  const headerButtonClass = 'flex items-center gap-2 px-3 h-10 bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] rounded-[20px] transition-all duration-200 text-sm border border-[var(--border-light)] shadow-[var(--shadow-card)] backdrop-blur-xl text-[var(--text-primary)]';
  const headerIconButtonClass = 'flex items-center justify-center rounded-[20px] transition-all duration-200 border border-[var(--border-light)] bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] shadow-[var(--shadow-card)] backdrop-blur-xl text-[var(--text-primary)]';
  const headerActiveButtonClass = 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-[inset_0_1px_2px_rgba(96,165,250,0.35),0_3px_8px_rgba(59,130,246,0.16)]';
  const headerInactiveButtonClass = 'bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] border-[var(--border-light)] shadow-[var(--shadow-card)] text-[var(--text-primary)]';

  return (
    <div
      className="h-full flex flex-col relative rounded-xl overflow-hidden overflow-x-hidden select-none"
      onCopy={(e) => e.preventDefault()}
    >
      {/* Градиент фона */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#007aff]/20 via-[#0a84ff]/5 to-transparent z-0 pointer-events-none" />
      
      {/* Контент относительно z-index */}
      <div className="relative z-10 h-full flex flex-col border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden overflow-x-hidden">
      {showSharedCalendarToast && (
        <div className="fixed top-[56px] right-4 z-[120] max-w-xs rounded-xl border border-blue-300/70 dark:border-blue-400/40 bg-white/95 dark:bg-[#1a1a1a]/95 px-3 py-2 shadow-lg backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                {calendarToastType === 'shared' ? 'Основной общий календарь' : 'Личный календарь'}
              </div>
              <div className="text-[11px] text-gray-600 dark:text-white/70">
                {calendarToastType === 'shared'
                  ? 'События в этом календаре увидят все пользователи.'
                  : 'Доступ к событиям этого календаря определяется его настройками.'}
              </div>
            </div>
            <button
              onClick={() => setShowSharedCalendarToast(false)}
              className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Закрыть"
            >
              <X className="w-3.5 h-3.5 text-gray-500 dark:text-white/60" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 h-[56px] bg-transparent">
        {/* Desktop */}
        <div className="hidden sm:flex items-center justify-between gap-2 w-full h-full px-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">            
            {/* Calendar List Selector */}
            <div className="relative">
              <button
                onClick={() => setShowListSelector(!showListSelector)}
                className={`${headerButtonClass} font-medium`}
                style={{ borderLeftWidth: '3px', borderLeftColor: calendarLists.find(l => l.id === activeListId)?.color || '#3B82F6' }}
              >
                <CalendarIcon className="w-4 h-4" />
                <span className="max-w-[150px] truncate">
                  {calendarLists.find(l => l.id === activeListId)?.name || (calendarLists.length > 0 ? calendarLists[0].name : 'Нет календарей')}
                </span>
                {isMainSharedList(activeCalendarList) && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-[10px] font-semibold text-blue-600 dark:text-blue-300">
                    ОБЩИЙ
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 opacity-70" style={{ transform: showListSelector ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>
              
              {showListSelector && (
                <>
                  <div className="hidden sm:block sm:absolute top-full left-0 mt-2 w-72 max-w-none bg-white/95 dark:bg-[var(--bg-secondary)]/95 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl z-[100] overflow-hidden ring-1 ring-black/5">
                  <div className="p-3 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
                    <span className="text-xs text-gray-500 dark:text-white/50 font-bold uppercase tracking-wider px-2">Календари</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {calendarLists.map(list => (
                      <div
                        key={list.id}
                        onClick={() => {
                          if (editingListId !== list.id) {
                            setActiveListId(list.id);
                            // Сохраняем выбор в localStorage
                            localStorage.setItem('calendar_active_list_id', list.id);
                            fetch('/api/calendar-lists', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ activeListId: list.id })
                            });
                            setShowListSelector(false);
                          }
                        }}
                        className="px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors"
                        style={{ borderLeft: `3px solid ${list.color}` }}
                      >
                        <div className="flex-1 min-w-0">
                          {editingListId === list.id ? (
                            <input
                              type="text"
                              value={editingListName}
                              onChange={(e) => setEditingListName(e.target.value)}
                              onBlur={async () => {
                                if (editingListName.trim() && editingListName !== list.name) {
                                  await fetch('/api/calendar-lists', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: list.id, name: editingListName })
                                  });
                                  setCalendarLists(prev => prev.map(l => l.id === list.id ? { ...l, name: editingListName } : l));
                                }
                                setEditingListId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="w-full bg-white dark:bg-white/10 border border-blue-500 rounded px-2 py-0.5 text-sm"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <>
                              <div 
                                className="font-medium text-sm text-gray-900 dark:text-white truncate"
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setEditingListId(list.id);
                                  setEditingListName(list.name);
                                }}
                                title={list.name}
                              >
                                {list.name}
                              </div>
                              <div className="mt-0.5 flex items-center gap-1.5">
                                {isMainSharedList(list) ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-300 font-medium">Основной общий</span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-medium">Личный</span>
                                )}
                              </div>
                              {list.description && (
                                <div className="text-xs text-gray-500 dark:text-white/40 truncate" title={list.description}>{list.description}</div>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {list.id === activeListId && (
                            <Check className="w-4 h-4 text-blue-500" />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isMainSharedList(list)) {
                                return;
                              }
                              setListSettingsData(list);
                              setShowListSettings(true);
                              setShowListSelector(false);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isMainSharedList(list)
                                ? 'text-gray-300 dark:text-white/20 cursor-not-allowed'
                                : 'hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white'
                            }`}
                            title={isMainSharedList(list) ? 'Доступ основного общего календаря нельзя редактировать' : 'Настройки доступа'}
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                    <button
                      onClick={() => {
                        setShowCreateList(true);
                        setShowListSelector(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/10 rounded-xl transition-colors flex items-center gap-2 justify-center font-semibold"
                    >
                      <Plus className="w-4 h-4" />
                      Создать календарь
                    </button>
                  </div>
                </div>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className={`w-10 h-10 ${headerIconButtonClass}`}
              title="Предыдущий месяц"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className={`px-5 h-10 max-w-[340px] inline-flex items-center justify-center ${headerButtonClass}`}>
              <span className="text-sm font-semibold whitespace-nowrap">
                {formattedCurrentMonthLabel}
              </span>
            </div>

            <button
              onClick={goToNextMonth}
              className={`w-10 h-10 ${headerIconButtonClass}`}
              title="Следующий месяц"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={goToCurrentMonth}
            className={`px-3 h-10 text-sm font-medium rounded-[20px] transition-all duration-200 whitespace-nowrap backdrop-blur-xl border ${headerActiveButtonClass}`}
          >
            Сегодня
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`w-10 h-10 rounded-[20px] flex items-center justify-center transition-all duration-200 border backdrop-blur-xl ${
                viewMode === 'grid'
                  ? headerActiveButtonClass
                  : headerInactiveButtonClass
              }`}
              title="Сетка"
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`w-10 h-10 rounded-[20px] flex items-center justify-center transition-all duration-200 border backdrop-blur-xl ${
                viewMode === 'timeline'
                  ? headerActiveButtonClass
                  : headerInactiveButtonClass
              }`}
              title="Таймлайн"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile */}
        <div className="sm:hidden flex items-center justify-between gap-2 w-full h-full px-3">
          <div className="relative flex-1 min-w-0">
            <button
              onClick={() => setShowListSelector(!showListSelector)}
              className="w-full flex items-center justify-between gap-2 px-3 h-9 bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] rounded-[20px] transition-all duration-200 text-xs border border-[var(--border-light)] shadow-[var(--shadow-card)] backdrop-blur-xl text-[var(--text-primary)]"
              style={{ borderLeft: `3px solid ${calendarLists.find(l => l.id === activeListId)?.color || '#3B82F6'}` }}
            >
              <span className="truncate flex-1 text-left font-medium">
                {calendarLists.find(l => l.id === activeListId)?.name || (calendarLists.length > 0 ? calendarLists[0].name : 'Нет календарей')}
              </span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {showListSelector && (
              <>
                <div
                  className="fixed inset-0 bg-black/50 z-40 sm:hidden"
                  onClick={() => setShowListSelector(false)}
                />
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 sm:hidden w-[90vw] max-w-[400px] bg-white/95 dark:bg-[var(--bg-secondary)]/95 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden ring-1 ring-black/5">
                  <div className="p-3 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
                    <span className="text-xs text-gray-500 dark:text-white/50 font-bold uppercase tracking-wider px-2">Календари</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {calendarLists.map(list => (
                      <div
                        key={list.id}
                        onClick={() => {
                          if (editingListId !== list.id) {
                            setActiveListId(list.id);
                            localStorage.setItem('calendar_active_list_id', list.id);
                            fetch('/api/calendar-lists', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ activeListId: list.id })
                            });
                            setShowListSelector(false);
                          }
                        }}
                        className="px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors"
                        style={{ borderLeft: `3px solid ${list.color}` }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 dark:text-white truncate" title={list.name}>
                            {list.name}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            {isMainSharedList(list) ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-300 font-medium">Основной общий</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-medium">Личный</span>
                            )}
                          </div>
                        </div>
                        {list.id === activeListId && <Check className="w-4 h-4 text-blue-500" />}
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                    <button
                      onClick={() => {
                        setShowCreateList(true);
                        setShowListSelector(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/10 rounded-xl transition-colors flex items-center gap-2 justify-center font-semibold"
                    >
                      <Plus className="w-4 h-4" />
                      Создать календарь
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Month Navigation */}
      <div className="sm:hidden flex items-center justify-between h-[56px] px-3 bg-transparent">
        <button
          onClick={goToPreviousMonth}
          className={`w-9 h-9 ${headerIconButtonClass}`}
          title="Предыдущий месяц"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className={`mx-2 px-3 h-9 inline-flex items-center justify-center min-w-0 max-w-[60vw] ${headerButtonClass}`}>
          <div className="text-sm font-semibold truncate px-2">
            {formattedCurrentMonthLabel}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={goToCurrentMonth}
            className={`h-9 px-2.5 text-xs font-medium rounded-[20px] transition-all duration-200 border backdrop-blur-xl ${headerActiveButtonClass}`}
          >
            Сегодня
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`w-9 h-9 rounded-[20px] flex items-center justify-center transition-all duration-200 border backdrop-blur-xl ${
              viewMode === 'grid'
                ? headerActiveButtonClass
                : headerInactiveButtonClass
            }`}
            title="Сетка"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`w-9 h-9 rounded-[20px] flex items-center justify-center transition-all duration-200 border backdrop-blur-xl ${
              viewMode === 'timeline'
                ? headerActiveButtonClass
                : headerInactiveButtonClass
            }`}
            title="Таймлайн"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={goToNextMonth}
          className={`w-9 h-9 ml-2 ${headerIconButtonClass}`}
          title="Следующий месяц"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {viewMode === 'grid' ? (
        <div 
          className="flex-1 overflow-y-auto min-h-0 calendar-no-scrollbar"
        >
          <div className="h-full">
            {/* Weekday Headers - Sticky */}
            <div className="grid grid-cols-7 sticky top-0 bg-gray-100 dark:bg-[var(--bg-secondary)] border-b border-gray-300 dark:border-white/20 z-10 shadow-sm">
              {WEEKDAYS.map(day => (
                <div
                  key={day}
                  className={`py-1 sm:py-2 text-center text-[10px] sm:text-xs font-bold text-gray-700 dark:text-white/80 border-r border-gray-200 dark:border-white/10 last:border-r-0 ${(day === 'Сб' || day === 'Вс') ? 'bg-pink-100 dark:bg-pink-900/30' : ''}`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 border-l border-gray-200 dark:border-white/10 pb-[calc(env(safe-area-inset-bottom)+88px)] md:pb-[calc(env(safe-area-inset-bottom)+56px)] overflow-x-hidden">
              {getCalendarDays().map(({ date, isCurrentMonth }, idx) => {
                const dateKey = formatDateKey(date);
                const dayEvents = getEventsForDay(date);
                const isToday = dateKey === formatDateKey(new Date());
                const totalItems = dayEvents.length;
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                return (
                  <div
                    key={idx}
                    className={`
                      relative min-h-[70px] sm:min-h-[110px] p-1 sm:p-1.5 border-r border-b border-gray-200 dark:border-white/10
                      ${!isCurrentMonth ? 'bg-gray-50/80 dark:bg-[var(--bg-tertiary)]/60 backdrop-blur-md' : 'bg-white/60 dark:bg-white/5 backdrop-blur-md'}
                      ${isToday ? 'ring-2 ring-inset ring-blue-500/30 bg-blue-50/70 dark:bg-blue-500/5 backdrop-blur-md' : ''}
                      ${isWeekend && isCurrentMonth && !isToday ? 'bg-pink-100/60 dark:bg-pink-900/25' : ''}
                      group hover:bg-gray-50/90 dark:hover:bg-white/5 transition-colors
                      ${totalItems > 4 ? 'min-h-[180px] sm:min-h-[220px]' : totalItems > 2 ? 'min-h-[130px] sm:min-h-[160px]' : ''}
                    `}
                  >
                    {/* Day Number */}
                    <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                      <span className={`text-[10px] sm:text-xs font-bold ${
                        isToday 
                          ? 'bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]' 
                          : isCurrentMonth 
                            ? 'text-gray-800 dark:text-white' 
                            : 'text-gray-400 dark:text-white/30'
                      }`}>
                        {date.getDate()}
                      </span>
                      {totalItems > 0 && (
                        <span className="text-[9px] bg-gradient-to-r from-blue-500/20 to-purple-500/20 dark:from-blue-400/20 dark:to-purple-400/20 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-semibold border border-blue-300/30 dark:border-blue-500/30">
                          {totalItems}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setSelectedDate(date);
                          setShowAddEvent(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-blue-500/20 rounded"
                        title="Добавить событие"
                      >
                        <Plus className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                      </button>
                    </div>

                    {/* Events */}
                    <div className="space-y-0.5 sm:space-y-1">
                      {dayEvents.map(event => {
                        const colors = EVENT_COLORS[event.type] || EVENT_COLORS.work;
                        return (
                          <div
                            key={event.id}
                            onClick={() => handleEditEvent(event)}
                            className={`
                              text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg cursor-pointer transition-all
                              ${colors.text}
                              bg-gradient-to-r ${colors.bg} backdrop-blur-md 
                              border-l-3 ${colors.border}
                              shadow-sm hover:shadow-lg hover:scale-[1.02] hover:z-10
                              group/item overflow-hidden max-w-full
                              relative
                            `}
                            title={`${event.title}${event.time ? ` (${event.time})` : ''}${event.description ? `\n${event.description}` : ''}${event.recurrence && event.recurrence !== 'once' ? ' (Повторяется)' : ''}`}
                          >
                            <div className="flex items-center justify-between gap-0.5 sm:gap-1 min-w-0">
                              <div className="flex-1 min-w-0 overflow-hidden flex items-center gap-0.5 sm:gap-1">
                                {event.recurrence && event.recurrence !== 'once' && (
                                  <RefreshCw className="w-2 h-2 sm:w-2.5 sm:h-2.5 flex-shrink-0 opacity-70" />
                                )}
                                <div className="flex-1 min-w-0">
                                  {event.time && (
                                    <span className="text-[8px] sm:text-[9px] font-bold opacity-80 whitespace-nowrap block">{event.time}</span>
                                  )}
                                  <span className="font-semibold truncate whitespace-nowrap block">{event.title}</span>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEvent(event.id);
                                }}
                                className="opacity-0 group-hover/item:opacity-100 transition-opacity hidden sm:block flex-shrink-0 hover:bg-red-500/20 rounded p-0.5"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+88px)] md:pb-[calc(env(safe-area-inset-bottom)+56px)] space-y-3">
            {(() => {
              let lastDate = '';
              return timelineItems.map(item => {
                const showDate = item.date !== lastDate;
                lastDate = item.date;
                const dateLabel = new Date(item.date).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  weekday: 'short'
                });
                const isEvent = item.kind === 'event';
                const colors = isEvent && item.eventType ? (EVENT_COLORS[item.eventType] || EVENT_COLORS.work) : null;

                return (
                  <div key={item.id} className="space-y-2">
                    {showDate && (
                      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-white/50">
                        {dateLabel}
                      </div>
                    )}
                    <div
                      className={`flex items-start gap-3 px-3 py-2 rounded-xl border border-white/20 backdrop-blur-md ${
                        isEvent
                          ? 'bg-white/60 dark:bg-white/10'
                          : 'bg-gray-100/80 dark:bg-white/5'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1 pt-0.5">
                        <span className="text-[10px] text-gray-500 dark:text-white/50">{item.time || '—'}</span>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isEvent
                              ? colors?.border?.replace('border-l-', 'bg-') || 'bg-blue-500'
                              : item.completed
                                ? 'bg-green-500'
                                : 'bg-gray-400'
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${isEvent ? (colors?.text || 'text-blue-600') : 'text-gray-900 dark:text-white'}`}>
                            {isEvent ? 'Событие' : 'Задача'}
                          </span>
                          {!isEvent && item.priority && (
                            <span className="text-[10px] text-gray-400 dark:text-white/40 uppercase">
                              {item.priority}
                            </span>
                          )}
                        </div>
                        <div className={`text-sm font-medium truncate ${isEvent ? (colors?.text || 'text-gray-900 dark:text-white') : 'text-gray-900 dark:text-white'}`}>
                          {item.title}
                        </div>
                        {item.description && (
                          <div className="text-xs text-gray-500 dark:text-white/40 max-h-[32px] overflow-hidden">
                            {item.description.replace(/<[^>]*>/g, ' ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Add/Edit Event Modal */}
      {showAddEvent && (selectedDate || editingEvent) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-t-[50px] sm:rounded-[50px] border-t sm:border border-gray-200 dark:border-gray-700 w-full sm:max-w-[600px] shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white">
                {editingEvent ? (
                  <>Редактировать событие</>
                ) : (
                  <>Новое событие</>
                )}
              </h3>
              <button
                onClick={() => {
                  setShowAddEvent(false);
                  setEditingEvent(null);
                  setNewEvent({ title: '', time: '', remind: false, description: '', type: 'work', recurrence: 'once' });
                }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-[50px] transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* Title Input */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Название события</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Еще проверка"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-[50px] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Описание</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Добавьте детали, ссылки, заметки..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-[50px] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Time & Reminder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Время</label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-[50px] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-[50px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full">
                    <input
                      id="event-remind"
                      type="checkbox"
                      checked={newEvent.remind}
                      onChange={(e) => setNewEvent({ ...newEvent, remind: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">Напомнить</span>
                  </label>
                </div>
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Тип события</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setNewEvent({ ...newEvent, type: 'work' })}
                    className={`px-4 py-2 rounded-[50px] text-sm font-medium transition-colors ${
                      newEvent.type === 'work' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Работа
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewEvent({ ...newEvent, type: 'meeting' })}
                    className={`px-4 py-2 rounded-[50px] text-sm font-medium transition-colors ${
                      newEvent.type === 'meeting' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Встреча
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewEvent({ ...newEvent, type: 'event' })}
                    className={`px-4 py-2 rounded-[50px] text-sm font-medium transition-colors ${
                      newEvent.type === 'event' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Событие
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewEvent({ ...newEvent, type: 'holiday' })}
                    className={`px-4 py-2 rounded-[50px] text-sm font-medium transition-colors ${
                      newEvent.type === 'holiday' 
                        ? 'bg-pink-600 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Праздник
                  </button>
                </div>
              </div>

              {/* Recurrence */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Повторение</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { value: 'once', label: 'Не повторять' },
                    { value: 'daily', label: 'Каждый день' },
                    { value: 'weekly', label: 'Раз в неделю' },
                    { value: 'biweekly', label: 'Раз в 2 недели' },
                    { value: 'monthly', label: 'Раз в месяц' },
                    { value: 'quarterly', label: 'Раз в квартал' },
                    { value: 'yearly', label: 'Раз в год' }
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setNewEvent({ ...newEvent, recurrence: option.value as any })}
                      className={`px-3 py-2 rounded-[50px] text-xs font-medium transition-colors ${
                        newEvent.recurrence === option.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Author Info */}
              {editingEvent && (
                <div className="rounded-[50px] border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Автор события</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {resolveEventAuthorName(editingEvent)}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-4 sm:p-5 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              {editingEvent && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteEvent(editingEvent.id);
                    }}
                    className="px-4 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-[50px] text-sm font-medium transition-colors"
                  >
                    Удалить
                  </button>
                  {editingRecurringGroupSize > 1 && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Удалить всю серию повторяющихся событий (${editingRecurringGroupSize} шт.)?`)) {
                          await handleDeleteRecurringSeries(editingEvent);
                          setShowAddEvent(false);
                          setEditingEvent(null);
                          setNewEvent({ title: '', time: '', remind: false, description: '', type: 'work', recurrence: 'once' });
                        }
                      }}
                      className="px-4 py-2.5 bg-orange-600 text-white hover:bg-orange-700 rounded-[50px] text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      Удалить серию ({editingRecurringGroupSize})
                    </button>
                  )}
                </>
              )}
              <button
                onClick={editingEvent ? handleUpdateEvent : handleAddEvent}
                disabled={!newEvent.title.trim()}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-[50px] text-sm font-medium transition-colors disabled:cursor-not-allowed"
              >
                {editingEvent ? 'Сохранить' : 'Добавить'}
              </button>
              <button
                onClick={() => {
                  setShowAddEvent(false);
                  setEditingEvent(null);
                  setNewEvent({ title: '', time: '', remind: false, description: '', type: 'work', recurrence: 'once' });
                }}
                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-[50px] text-sm font-medium transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Calendar List */}
      {showCreateList && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={closeCreateListModal}
        >
          <div 
            className="bg-white dark:bg-[var(--bg-secondary)] border-t sm:border border-gray-200 dark:border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 dark:border-white/10 px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-base sm:text-lg font-semibold">Создать календарь</h3>
              <button
                onClick={closeCreateListModal}
                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-sm font-medium mb-1.5">Название</label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Мой календарь"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Цвет</label>
                <div className="flex gap-2">
                  {['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewListColor(color)}
                      className={`w-8 h-8 rounded-lg transition-all ${newListColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Доступ для пользователей</label>
                <p className="text-xs text-gray-500 dark:text-white/50 mb-2">
                  Если никто не выбран — доступен всем пользователям
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1 border border-gray-200 dark:border-white/10 rounded-lg p-2">
                  {users.length === 0 ? (
                    <div className="p-3 text-center text-xs text-gray-400 dark:text-white/40">
                      Пользователи не загружены. Проверьте консоль браузера.
                    </div>
                  ) : (
                    users.map(user => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={newListAllowedUsers.includes(user.id)}
                          onChange={(e) => {
                            setNewListAllowedUsers(prev => 
                              e.target.checked 
                                ? [...prev, user.id] 
                                : prev.filter(id => id !== user.id)
                            );
                          }}
                          className="w-4 h-4 text-blue-500 rounded"
                        />
                        <span className="text-sm flex-1">{user.name}</span>
                        {user.role === 'admin' && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded">admin</span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Доступ для отделов</label>
                <p className="text-xs text-gray-500 dark:text-white/50 mb-2">
                  Если ничего не выбрано — доступен всем отделам
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1 border border-gray-200 dark:border-white/10 rounded-lg p-2">
                  {departments.length === 0 ? (
                    <div className="p-3 text-center text-xs text-gray-400 dark:text-white/40">
                      Отделы не загружены. Проверьте консоль браузера.
                    </div>
                  ) : (
                    departments.map(dept => (
                      <label
                        key={dept.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={newListAllowedDepartments.includes(dept.id)}
                          onChange={(e) => {
                            setNewListAllowedDepartments(prev => 
                              e.target.checked 
                                ? [...prev, dept.id] 
                                : prev.filter(id => id !== dept.id)
                            );
                          }}
                          className="w-4 h-4 text-blue-500 rounded"
                        />
                        <div 
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: dept.color || '#gray' }}
                        />
                        <span className="text-sm flex-1">{dept.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 dark:border-white/10 px-4 sm:px-5 py-3 sm:py-4 flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={closeCreateListModal}
                className="px-3 sm:px-4 py-2 text-sm text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={async () => {
                  if (!newListName.trim()) return;
                  try {
                    const username = localStorage.getItem('username') || '';
                    const res = await fetch('/api/calendar-lists', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: newListName,
                        color: newListColor,
                        createdBy: username,
                        allowedUsers: newListAllowedUsers,
                        allowedDepartments: newListAllowedDepartments
                      })
                    });
                    if (res.ok) {
                      const created = await res.json();
                      setCalendarLists(prev => [...prev, created]);
                      closeCreateListModal();
                    }
                  } catch (error) {
                    console.error('Error creating calendar list:', error);
                  }
                }}
                disabled={!newListName.trim()}
                className="px-3 sm:px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Calendar List Settings */}
      {showListSettings && listSettingsData && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setShowListSettings(false)}
        >
          <div 
            className="bg-white dark:bg-[var(--bg-secondary)] border-t sm:border border-gray-200 dark:border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 dark:border-white/10 px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-base sm:text-lg font-semibold">Настройки календаря</h3>
              <button
                onClick={() => setShowListSettings(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-sm font-medium mb-1.5">Название</label>
                <input
                  type="text"
                  value={listSettingsData.name}
                  onChange={(e) => setListSettingsData({ ...listSettingsData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Advanced Access Management */}
              {!isMainSharedList(listSettingsData) && (
              <div className="space-y-3 rounded-2xl p-3 bg-white dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-white/10">
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-white/50">Управление доступом</div>

                <FormField label="Уровень доступа">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPermissionDropdown(!showPermissionDropdown)}
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/10 hover:border-blue-500/50 transition-all rounded-xl"
                    >
                      <span>{accessPermission === 'viewer' ? 'Читатель' : 'Редактор'}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showPermissionDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showPermissionDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 p-1 rounded-xl bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-white/15 shadow-2xl z-[140]">
                        {[
                          { value: 'viewer', label: 'Читатель' },
                          { value: 'editor', label: 'Редактор' }
                        ].map((option) => {
                          const isActive = accessPermission === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setAccessPermission(option.value as 'viewer' | 'editor');
                                setShowPermissionDropdown(false);
                              }}
                              className={`w-full px-3 py-2 text-sm text-left rounded-lg transition-colors ${
                                isActive
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                                  : 'hover:bg-gray-100 dark:hover:bg-white/[0.08]'
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </FormField>

                <FormField label="Куда выдать доступ">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowShareTargetDropdown(!showShareTargetDropdown)}
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/10 hover:border-blue-500/50 transition-all rounded-xl"
                    >
                      <span>
                        {accessShareTarget === 'user' && 'Пользователю'}
                        {accessShareTarget === 'department' && 'Отделу'}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showShareTargetDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showShareTargetDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 p-1 rounded-xl bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-white/15 shadow-2xl z-[140]">
                        {[
                          { id: 'user', label: 'Пользователю' },
                          { id: 'department', label: 'Отделу' }
                        ].map((option) => {
                          const isActive = accessShareTarget === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                setAccessShareTarget(option.id as 'department' | 'user');
                                setShowShareTargetDropdown(false);
                              }}
                              className={`w-full px-3 py-2 text-sm text-left rounded-lg transition-colors ${
                                isActive
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                                  : 'hover:bg-gray-100 dark:hover:bg-white/[0.08]'
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </FormField>

                {accessShareTarget === 'user' && (
                  <FormField label="Пользователь">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowUserDropdown(!showUserDropdown)}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/10 hover:border-blue-500/50 transition-all rounded-xl"
                      >
                        <span className="truncate">
                          {accessSelectedUserId 
                            ? users.find(u => u.id === accessSelectedUserId)?.name || 'Выберите пользователя'
                            : 'Выберите пользователя'}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showUserDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-white/15 shadow-2xl z-[140] max-h-64 overflow-hidden flex flex-col">
                          <input
                            type="text"
                            placeholder="Поиск пользователя..."
                            value={searchUserAccess}
                            onChange={(e) => setSearchUserAccess(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-sm focus:outline-none"
                          />
                          <div className="overflow-y-auto p-1">
                            {users.filter(u => 
                              u.name.toLowerCase().includes(searchUserAccess.toLowerCase())
                            ).map((user) => {
                              const isActive = accessSelectedUserId === user.id;
                              const alreadyHasAccess = listSettingsData.allowedUsers?.includes(user.id);
                              return (
                                <button
                                  key={user.id}
                                  type="button"
                                  disabled={alreadyHasAccess}
                                  onClick={() => {
                                    setAccessSelectedUserId(user.id);
                                    setShowUserDropdown(false);
                                    setSearchUserAccess('');
                                  }}
                                  className={`w-full px-3 py-2 text-sm text-left rounded-lg transition-colors flex items-center gap-2 ${
                                    alreadyHasAccess
                                      ? 'opacity-50 cursor-not-allowed'
                                      : isActive
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                                      : 'hover:bg-gray-100 dark:hover:bg-white/[0.08]'
                                  }`}
                                >
                                  <span className="flex-1">{user.name}</span>
                                  {alreadyHasAccess && (
                                    <Check className="w-4 h-4 text-green-500" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </FormField>
                )}

                {accessShareTarget === 'department' && (
                  <FormField label="Отдел">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/10 hover:border-blue-500/50 transition-all rounded-xl"
                      >
                        <span className="truncate">
                          {accessSelectedDepartmentId 
                            ? departments.find(d => d.id === accessSelectedDepartmentId)?.name || 'Выберите отдел'
                            : 'Выберите отдел'}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showDepartmentDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showDepartmentDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-white/15 shadow-2xl z-[140] max-h-64 overflow-hidden flex flex-col">
                          <input
                            type="text"
                            placeholder="Поиск отдела..."
                            value={searchDepartmentAccess}
                            onChange={(e) => setSearchDepartmentAccess(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-sm focus:outline-none"
                          />
                          <div className="overflow-y-auto p-1">
                            {departments.filter(d => 
                              d.name.toLowerCase().includes(searchDepartmentAccess.toLowerCase())
                            ).map((dept) => {
                              const isActive = accessSelectedDepartmentId === dept.id;
                              const alreadyHasAccess = listSettingsData.allowedDepartments?.includes(dept.id);
                              return (
                                <button
                                  key={dept.id}
                                  type="button"
                                  disabled={alreadyHasAccess}
                                  onClick={() => {
                                    setAccessSelectedDepartmentId(dept.id);
                                    setShowDepartmentDropdown(false);
                                    setSearchDepartmentAccess('');
                                  }}
                                  className={`w-full px-3 py-2 text-sm text-left rounded-lg transition-colors flex items-center gap-2 ${
                                    alreadyHasAccess
                                      ? 'opacity-50 cursor-not-allowed'
                                      : isActive
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                                      : 'hover:bg-gray-100 dark:hover:bg-white/[0.08]'
                                  }`}
                                >
                                  <div 
                                    className="w-3 h-3 rounded"
                                    style={{ backgroundColor: dept.color || '#gray' }}
                                  />
                                  <span className="flex-1">{dept.name}</span>
                                  {alreadyHasAccess && (
                                    <Check className="w-4 h-4 text-green-500" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </FormField>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (accessShareTarget === 'user' && accessSelectedUserId) {
                      setListSettingsData({
                        ...listSettingsData,
                        allowedUsers: [...(listSettingsData.allowedUsers || []), accessSelectedUserId]
                      });
                      setAccessSelectedUserId('');
                    } else if (accessShareTarget === 'department' && accessSelectedDepartmentId) {
                      setListSettingsData({
                        ...listSettingsData,
                        allowedDepartments: [...(listSettingsData.allowedDepartments || []), accessSelectedDepartmentId]
                      });
                      setAccessSelectedDepartmentId('');
                    }
                  }}
                  disabled={
                    (accessShareTarget === 'user' && !accessSelectedUserId) ||
                    (accessShareTarget === 'department' && !accessSelectedDepartmentId)
                  }
                  className="w-full px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить доступ
                </button>

                {/* Current Access List */}
                {((listSettingsData.allowedUsers && listSettingsData.allowedUsers.length > 0) ||
                  (listSettingsData.allowedDepartments && listSettingsData.allowedDepartments.length > 0)) && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
                    <div className="text-xs font-medium text-gray-500 dark:text-white/50 mb-2">Имеют доступ:</div>
                    <div className="space-y-1.5">
                      {listSettingsData.allowedUsers?.map(userId => {
                        const user = users.find(u => u.id === userId);
                        if (!user) return null;
                        return (
                          <div
                            key={userId}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">{user.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setListSettingsData({
                                  ...listSettingsData,
                                  allowedUsers: listSettingsData.allowedUsers?.filter(id => id !== userId)
                                });
                              }}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-500/20 rounded text-red-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                      {listSettingsData.allowedDepartments?.map(deptId => {
                        const dept = departments.find(d => d.id === deptId);
                        if (!dept) return null;
                        return (
                          <div
                            key={deptId}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: dept.color || '#gray' }}
                              />
                              <span className="text-sm">{dept.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setListSettingsData({
                                  ...listSettingsData,
                                  allowedDepartments: listSettingsData.allowedDepartments?.filter(id => id !== deptId)
                                });
                              }}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-500/20 rounded text-red-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!listSettingsData.allowedUsers?.length && !listSettingsData.allowedDepartments?.length && (
                  <div className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Доступен всем
                  </div>
                )}
              </div>
              )}

              {isMainSharedList(listSettingsData) && (
                <div className="rounded-2xl p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-xs text-blue-700 dark:text-blue-300">
                  Основной общий календарь: права доступа фиксированы и не редактируются.
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-200 dark:border-white/10 px-4 sm:px-5 py-3 sm:py-4 flex justify-between flex-shrink-0">
              <button
                onClick={async () => {
                  if (!confirm(`Удалить календарь "${listSettingsData.name}"?`)) return;
                  try {
                    const res = await fetch(`/api/calendar-lists?id=${listSettingsData.id}`, { method: 'DELETE' });
                    if (res.ok) {
                      setCalendarLists(prev => prev.filter(l => l.id !== listSettingsData.id));
                      setShowListSettings(false);
                    }
                  } catch (error) {
                    console.error('Error deleting calendar list:', error);
                  }
                }}
                className="px-3 sm:px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
              >
                Удалить
              </button>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setShowListSettings(false)}
                  className="px-3 sm:px-4 py-2 text-sm text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/calendar-lists', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(listSettingsData)
                      });
                      if (res.ok) {
                        const updated = await res.json();
                        setCalendarLists(prev => prev.map(l => l.id === updated.id ? updated : l));
                        setShowListSettings(false);
                      }
                    } catch (error) {
                      console.error('Error updating calendar list:', error);
                    }
                  }}
                  className="px-3 sm:px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
