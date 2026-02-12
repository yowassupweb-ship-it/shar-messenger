'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, Clock, MessageCircle, User, UserCheck, Plus, X, Edit3, ChevronDown, Settings, Info, List } from 'lucide-react';
import AccessButton from './AccessButton';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  description?: string;
  type: 'work' | 'meeting' | 'event' | 'holiday' | 'task' | 'tz';
  listId?: string;
  participants?: string[];
  recurrence?: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  sourceId?: string;
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
  email?: string;
  role?: string;
  avatar?: string;
}

interface Todo {
  id: string;
  title: string;
  dueDate?: string;
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
  const [newEvent, setNewEvent] = useState({
    title: '',
    time: '',
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
      .filter(e => e.date === dateKey && (!e.listId || e.listId === activeListId))
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

    const isWithinMonth = (dateStr: string) => {
      const date = new Date(dateStr);
      return date >= monthStart && date <= monthEnd;
    };

    events
      .filter(e => e.date && isWithinMonth(e.date) && (!e.listId || e.listId === activeListId))
      .forEach(e => {
        items.push({
          id: `event-${e.id}`,
          kind: 'event',
          date: e.date,
          time: e.time,
          title: e.title,
          description: e.description,
          eventType: e.type
        });
      });

    todos
      .filter(t => t.dueDate && isWithinMonth(t.dueDate) && !t.archived)
      .forEach(t => {
        items.push({
          id: `todo-${t.id}`,
          kind: 'todo',
          date: t.dueDate as string,
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

  const getPersonName = (id?: string) => {
    if (!id) return '';
    const person = people.find(p => p.id === id);
    return person?.name || '';
  };

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

    try {
      const datesToAdd: Date[] = [new Date(selectedDate)];
      
      console.log('[CalendarBoard] Creating event with recurrence:', newEvent.recurrence);
      
      if (newEvent.recurrence && newEvent.recurrence !== 'once') {
        console.log('[CalendarBoard] Processing recurring event...');
        const startDate = new Date(selectedDate);
        const limitDate = new Date(); // Ровно 1 год вперед от сегодня
        limitDate.setFullYear(limitDate.getFullYear() + 1);
        
        let currentDate = new Date(startDate);
        console.log('[CalendarBoard] Start date:', startDate, 'Limit date:', limitDate);
        
        // Safety limit: 365 events max
        for (let i = 0; i < 365; i++) {
            let nextDate = new Date(currentDate);
            
            if (newEvent.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
            else if (newEvent.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
            else if (newEvent.recurrence === 'biweekly') nextDate.setDate(nextDate.getDate() + 14);
            else if (newEvent.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
            else if (newEvent.recurrence === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
            else if (newEvent.recurrence === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
            
            if (nextDate > limitDate) {
              console.log('[CalendarBoard] Reached limit date, stopping at iteration', i);
              break;
            }
            
            datesToAdd.push(nextDate);
            currentDate = nextDate;
        }
        console.log('[CalendarBoard] Generated', datesToAdd.length, 'dates for recurring events');
      } else {
        console.log('[CalendarBoard] Creating single (non-recurring) event');
      }

      console.log('[CalendarBoard] Dates to create:', datesToAdd.map(d => formatDateKey(d)));

      const responses = await Promise.all(datesToAdd.map(async (date, index) => {
        const eventData = {
          title: newEvent.title,
          date: formatDateKey(date),
          time: newEvent.time || undefined,
          description: newEvent.description || undefined,
          type: newEvent.type,
          listId: activeListId,
          recurrence: newEvent.recurrence
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
      setNewEvent({ title: '', time: '', description: '', type: 'work', recurrence: 'once' });
      setSelectedDate(null);
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent || !newEvent.title.trim()) return;

    try {
      const eventData = {
        title: newEvent.title,
        date: editingEvent.date,
        time: newEvent.time || undefined,
        description: newEvent.description || undefined,
        type: newEvent.type,
        listId: editingEvent.listId,
        recurrence: newEvent.recurrence
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
        setNewEvent({ title: '', time: '', description: '', type: 'work', recurrence: 'once' });
      }
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      console.log('[CalendarBoard] === DELETE EVENT START ===');
      console.log('[CalendarBoard] Event ID to delete:', eventId);
      console.log('[CalendarBoard] Event ID type:', typeof eventId);
      console.log('[CalendarBoard] Event ID length:', eventId.length);
      console.log('[CalendarBoard] DELETE URL:', `/api/calendar-events/${eventId}`);
      
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
      router.push(`/account?tab=tasks&task=${event.sourceId}`, { scroll: false });
      return;
    }
    
    // Обычные события редактируем в форме
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      time: event.time || '',
      description: event.description || '',
      type: event.type,
      recurrence: event.recurrence || 'once'
    });
    setShowAddEvent(true);
  };

  const timelineItems = getTimelineItems();

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl pb-16 sm:pb-20">
      {/* Header */}
      <div className="flex-shrink-0 h-12 px-2 sm:px-4 border-b border-gray-200 dark:border-white/10 bg-white/50 dark:bg-[#0d0d0d] flex items-center">
        {/* Desktop */}
        <div className="hidden sm:flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 flex-1 min-w-0">            
            {/* Calendar List Selector */}
            <div className="relative">
              <button
                onClick={() => setShowListSelector(!showListSelector)}
                className="flex items-center gap-2 px-3 h-8 bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-all text-sm font-medium border border-white/10"
                style={{ borderLeftWidth: '3px', borderLeftColor: calendarLists.find(l => l.id === activeListId)?.color || '#3B82F6' }}
              >
                <CalendarIcon className="w-4 h-4 text-gray-600 dark:text-white/70" />
                <span className="max-w-[150px] truncate text-gray-900 dark:text-white">
                  {calendarLists.find(l => l.id === activeListId)?.name || (calendarLists.length > 0 ? calendarLists[0].name : 'Нет календарей')}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500 dark:text-white/50" style={{ transform: showListSelector ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>
              
              {showListSelector && (
                <>
                  {/* Backdrop на мобилке */}
                  <div 
                    className="sm:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setShowListSelector(false)}
                  />
                  <div className="fixed sm:absolute top-1/2 sm:top-full left-1/2 sm:left-0 -translate-x-1/2 sm:translate-x-0 -translate-y-1/2 sm:translate-y-0 sm:right-auto mt-0 sm:mt-2 w-[90vw] sm:w-72 max-w-[400px] sm:max-w-none bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden ring-1 ring-black/5">
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
                          <AccessButton
                            resourceType="calendar"
                            resourceId={list.id}
                            resourceName={list.name}
                            size="sm"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setListSettingsData(list);
                              setShowListSettings(true);
                              setShowListSelector(false);
                            }}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white"
                            title="Настройки доступа"
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
          
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 text-gray-600 dark:text-white/70 hover:bg-white/10 dark:hover:bg-white/10 rounded-lg transition-all"
              title="Предыдущий месяц"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="px-3 flex items-center justify-center min-w-[140px]">
              <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                {currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).charAt(0).toUpperCase() + currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).slice(1)}
              </span>
            </div>

            <button
              onClick={goToNextMonth}
              className="p-1.5 text-gray-600 dark:text-white/70 hover:bg-white/10 dark:hover:bg-white/10 rounded-lg transition-all"
              title="Следующий месяц"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={goToCurrentMonth}
            className="px-3 h-8 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all whitespace-nowrap"
          >
            Сегодня
          </button>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/10 dark:bg-white/5 border border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                viewMode === 'grid'
                  ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-white/50 hover:bg-white/10'
              }`}
              title="Сетка"
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                viewMode === 'timeline'
                  ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-white/50 hover:bg-white/10'
              }`}
              title="Таймлайн"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile */}
        <div className="sm:hidden flex items-center justify-between gap-2 w-full">
          <div className="relative flex-1 min-w-0">
            <button
              onClick={() => setShowListSelector(!showListSelector)}
              className="w-full flex items-center justify-between gap-2 px-2 h-8 bg-white/10 dark:bg-white/5 rounded-lg transition-all text-xs border border-white/10"
              style={{ borderLeft: `3px solid ${calendarLists.find(l => l.id === activeListId)?.color || '#3B82F6'}` }}
            >
              <span className="truncate flex-1 text-left font-medium text-gray-900 dark:text-white">
                {calendarLists.find(l => l.id === activeListId)?.name || (calendarLists.length > 0 ? calendarLists[0].name : 'Нет календарей')}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-500 dark:text-white/50" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Month Navigation */}
      <div className="sm:hidden flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-white/10 bg-white/30 dark:bg-black/20">
        <button
          onClick={goToPreviousMonth}
          className="p-1.5 text-gray-600 dark:text-white/70 hover:bg-white/20 dark:hover:bg-white/10 rounded-md"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <div className="text-sm font-semibold text-gray-900 dark:text-white">
          {currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).charAt(0).toUpperCase() + currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).slice(1)}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={goToCurrentMonth}
            className="px-2 py-1 text-xs font-medium rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
          >
            Сегодня
          </button>
          <div className="flex items-center gap-1 p-0.5 rounded-md bg-white/10 dark:bg-white/5 border border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                viewMode === 'grid'
                  ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-white/50'
              }`}
              title="Сетка"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                viewMode === 'timeline'
                  ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-white/50'
              }`}
              title="Таймлайн"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={goToNextMonth}
            className="p-1.5 text-gray-600 dark:text-white/70 hover:bg-white/20 dark:hover:bg-white/10 rounded-md"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="flex-1 overflow-auto">
          <div className="min-w-full">
            {/* Weekday Headers - Sticky */}
            <div className="grid grid-cols-7 sticky top-0 bg-gray-100 dark:bg-[#1a1a1a] border-b border-gray-300 dark:border-white/20 z-10 shadow-sm">
              {WEEKDAYS.map(day => (
                <div
                  key={day}
                  className="py-1 sm:py-2 text-center text-[10px] sm:text-xs font-bold text-gray-700 dark:text-white/80 border-r border-gray-200 dark:border-white/10 last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 border-l border-gray-200 dark:border-white/10">
              {getCalendarDays().map(({ date, isCurrentMonth }, idx) => {
                const dateKey = formatDateKey(date);
                const dayTodos = getTodosForDay(date);
                const dayEvents = getEventsForDay(date);
                const isToday = dateKey === formatDateKey(new Date());
                const totalItems = dayTodos.length + dayEvents.length;

                return (
                  <div
                    key={idx}
                    className={`
                      relative min-h-[70px] sm:min-h-[110px] p-1 sm:p-1.5 border-r border-b border-gray-200 dark:border-white/10
                      ${!isCurrentMonth ? 'bg-gray-50 dark:bg-black/30' : 'bg-white dark:bg-transparent'}
                      ${isToday ? 'ring-2 ring-inset ring-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5' : ''}
                      group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors
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
                        <span className="text-[9px] bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white/60 px-1 rounded font-medium">
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
                      {dayEvents.slice(0, 2).map(event => {
                        const colors = EVENT_COLORS[event.type] || EVENT_COLORS.work;
                        return (
                          <div
                            key={event.id}
                            onClick={() => handleEditEvent(event)}
                            className={`
                              text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 sm:py-1 rounded cursor-pointer transition-all
                              border-l-2 ${colors.border} ${colors.text}
                              bg-white/60 dark:bg-white/10 backdrop-blur-md border border-white/30 dark:border-white/10
                              hover:shadow-md group/item overflow-hidden max-w-full
                            `}
                            title={`${event.title}${event.time ? ` (${event.time})` : ''}${event.description ? `\n${event.description}` : ''}`}
                          >
                            <div className="flex items-center justify-between gap-0.5 sm:gap-1 min-w-0">
                              <div className="flex-1 min-w-0 overflow-hidden">
                                {event.time && (
                                  <span className="text-[7px] sm:text-[8px] font-semibold opacity-70 whitespace-nowrap">{event.time} </span>
                                )}
                                <span className="font-medium truncate whitespace-nowrap">{event.title}</span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEvent(event.id);
                                }}
                                className="opacity-0 group-hover/item:opacity-100 transition-opacity hidden sm:block"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Todos */}
                      {dayTodos.slice(0, Math.max(0, 3 - dayEvents.length)).map(todo => {
                        const list = lists.find(l => l.id === todo.listId);
                        return (
                          <div
                            key={todo.id}
                            onClick={() => router.push(`/account?tab=tasks&task=${todo.id}`, { scroll: false })}
                            className={`
                              text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 sm:py-1 rounded cursor-pointer transition-all
                              border-l-2 ${PRIORITY_COLORS[todo.priority]}
                              ${todo.completed 
                                ? 'opacity-60 line-through bg-gray-100 dark:bg-white/5' 
                                : 'bg-gray-200 dark:bg-white/10'
                              }
                              hover:shadow-md
                            `}
                            title={todo.title}
                          >
                            <div className="flex items-center gap-1">
                              {todo.completed ? (
                                <Check className="w-2.5 h-2.5 flex-shrink-0 text-green-500" />
                              ) : (
                                <div className="w-2.5 h-2.5 rounded-full border border-gray-400 dark:border-white/40 flex-shrink-0" />
                              )}
                              <span className="truncate font-medium text-gray-900 dark:text-white">
                                {todo.title}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {totalItems > 3 && (
                        <div className="text-[8px] text-gray-500 dark:text-white/40 px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-center font-medium">
                          +{totalItems - 3}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 space-y-3">
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
          <div className="bg-white dark:bg-[#1a1a1a] rounded-t-2xl sm:rounded-xl border-t sm:border border-gray-200 dark:border-white/10 w-full sm:max-w-md shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                {editingEvent ? (
                  <>Редактировать событие</>
                ) : (
                  <>Добавить событие - {selectedDate?.getDate()} {selectedDate && MONTHS[selectedDate.getMonth()]}</>
                )}
              </h3>
              <button
                onClick={() => {
                  setShowAddEvent(false);
                  setEditingEvent(null);
                  setNewEvent({ title: '', time: '', description: '', type: 'work', recurrence: 'once' });
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-white/60" />
              </button>
            </div>

            <div className="p-3 sm:p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Название</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Встреча, звонок, дедлайн..."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Время</label>
                <input
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Тип</label>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setNewEvent({ ...newEvent, type: 'work' })}
                    className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                      newEvent.type === 'work' 
                        ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/30 text-blue-500 dark:text-blue-400 ring-1 ring-blue-500/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-sm' 
                        : 'bg-gradient-to-br from-white/5 to-white/10 text-gray-500 dark:text-white/50 hover:from-blue-500/10 hover:to-blue-600/20 hover:text-blue-500 dark:hover:text-blue-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm border border-white/10'
                    }`}
                  >
                    Работа
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewEvent({ ...newEvent, type: 'meeting' })}
                    className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                      newEvent.type === 'meeting' 
                        ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/30 text-purple-500 dark:text-purple-400 ring-1 ring-purple-500/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-sm' 
                        : 'bg-gradient-to-br from-white/5 to-white/10 text-gray-500 dark:text-white/50 hover:from-purple-500/10 hover:to-purple-600/20 hover:text-purple-500 dark:hover:text-purple-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm border border-white/10'
                    }`}
                  >
                    Встреча
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewEvent({ ...newEvent, type: 'event' })}
                    className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                      newEvent.type === 'event' 
                        ? 'bg-gradient-to-br from-green-500/20 to-green-600/30 text-green-500 dark:text-green-400 ring-1 ring-green-500/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-sm' 
                        : 'bg-gradient-to-br from-white/5 to-white/10 text-gray-500 dark:text-white/50 hover:from-green-500/10 hover:to-green-600/20 hover:text-green-500 dark:hover:text-green-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm border border-white/10'
                    }`}
                  >
                    Событие
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewEvent({ ...newEvent, type: 'holiday' })}
                    className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                      newEvent.type === 'holiday' 
                        ? 'bg-gradient-to-br from-pink-500/20 to-pink-600/30 text-pink-500 dark:text-pink-400 ring-1 ring-pink-500/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-sm' 
                        : 'bg-gradient-to-br from-white/5 to-white/10 text-gray-500 dark:text-white/50 hover:from-pink-500/10 hover:to-pink-600/20 hover:text-pink-500 dark:hover:text-pink-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm border border-white/10'
                    }`}
                  >
                    Праздник
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-white/60 mb-1.5">Повторение</label>
                <div className="grid grid-cols-2 gap-2">
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
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        newEvent.recurrence === option.value
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Описание</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Детали события..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[20px] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-white resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 p-3 sm:p-4 border-t border-gray-200 dark:border-white/10 flex-shrink-0">
              {editingEvent?.sourceId && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddEvent(false);
                    setEditingEvent(null);
                    router.push(`/account?tab=tasks&task=${editingEvent.sourceId}`);
                  }}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-900 text-white dark:bg-white/10 dark:text-white hover:bg-gray-800 dark:hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                >
                  Перейти к задаче
                </button>
              )}
              <button
                onClick={editingEvent ? handleUpdateEvent : handleAddEvent}
                disabled={!newEvent.title.trim()}
                className="flex-1 py-2 sm:py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
              >
                {editingEvent ? 'Сохранить' : 'Добавить'}
              </button>
              <button
                onClick={() => {
                  setShowAddEvent(false);
                  setEditingEvent(null);
                  setNewEvent({ title: '', time: '', description: '', type: 'work', recurrence: 'once' });
                }}
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-white rounded-lg text-sm font-medium transition-colors"
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
            className="bg-white dark:bg-[#1a1a1a] border-t sm:border border-gray-200 dark:border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col"
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
            className="bg-white dark:bg-[#1a1a1a] border-t sm:border border-gray-200 dark:border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col"
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

              <div>
                <label className="block text-sm font-medium mb-2">Доступ для пользователей</label>
                <p className="text-xs text-gray-500 dark:text-white/50 mb-2">
                  Выберите пользователей, которые могут видеть этот календарь. Если никто не выбран — доступен всем.
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1 border border-gray-200 dark:border-white/10 rounded-lg p-2">
                  {users.length === 0 ? (
                    <div className="p-3 text-center text-xs text-gray-400 dark:text-white/40">
                      Пользователи не загружены. Проверьте консоль браузера.
                    </div>
                  ) : (
                    users.map(user => {
                      const isAllowed = !listSettingsData.allowedUsers?.length || listSettingsData.allowedUsers.includes(user.id);
                      const isExplicitlyAllowed = listSettingsData.allowedUsers?.includes(user.id);
                      return (
                        <label
                          key={user.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isExplicitlyAllowed || false}
                            onChange={(e) => {
                              const newAllowed = e.target.checked
                                ? [...(listSettingsData.allowedUsers || []), user.id]
                                : (listSettingsData.allowedUsers || []).filter(id => id !== user.id);
                              setListSettingsData({ ...listSettingsData, allowedUsers: newAllowed });
                            }}
                            className="w-4 h-4 text-blue-500 rounded"
                          />
                          <span className="text-sm flex-1">{user.name}</span>
                          {user.role === 'admin' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded">admin</span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
                {!listSettingsData.allowedUsers?.length && users.length > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Доступен всем пользователям
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Доступ для отделов</label>
                <p className="text-xs text-gray-500 dark:text-white/50 mb-2">
                  Выберите отделы, сотрудники которых могут видеть этот календарь. Если ничего не выбрано — доступен всем.
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1 border border-gray-200 dark:border-white/10 rounded-lg p-2">
                  {departments.length === 0 ? (
                    <div className="p-3 text-center text-xs text-gray-400 dark:text-white/40">
                      Отделы не загружены. Проверьте консоль браузера.
                    </div>
                  ) : (
                    departments.map(dept => {
                      const isExplicitlyAllowed = listSettingsData.allowedDepartments?.includes(dept.id);
                      return (
                        <label
                          key={dept.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isExplicitlyAllowed || false}
                            onChange={(e) => {
                              const newAllowed = e.target.checked
                                ? [...(listSettingsData.allowedDepartments || []), dept.id]
                                : (listSettingsData.allowedDepartments || []).filter(id => id !== dept.id);
                              setListSettingsData({ ...listSettingsData, allowedDepartments: newAllowed });
                            }}
                            className="w-4 h-4 text-blue-500 rounded"
                          />
                          <div 
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: dept.color || '#gray' }}
                          />
                          <span className="text-sm flex-1">{dept.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                {!listSettingsData.allowedDepartments?.length && departments.length > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Доступен всем отделам
                  </p>
                )}
              </div>
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
  );
}
