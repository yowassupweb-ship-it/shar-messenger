'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, Clock, MessageCircle, User, UserCheck, Plus, X, Edit3, ChevronDown, Settings, Info } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  description?: string;
  type: 'work' | 'meeting' | 'event' | 'holiday';
  listId?: string;
  participants?: string[];
  recurrence?: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
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
  const [todos, setTodos] = useState<Todo[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [lists, setLists] = useState<TodoList[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
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

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      try {
        const username = localStorage.getItem('username') || '';
        const [todosRes, listsRes, peopleRes, eventsRes, calListsRes, usersRes, deptsRes] = await Promise.all([
          fetch('/api/todos'),
          fetch('/api/todos/lists'),
          fetch('/api/todos/people'),
          fetch('/api/calendar-events'),
          fetch(`/api/calendar-lists?userId=${encodeURIComponent(username)}`),
          fetch('/api/users'),
          fetch('/api/departments')
        ]);

        if (todosRes.ok) {
          const data = await todosRes.json();
          setTodos(data.todos || []);
        }

        if (listsRes.ok) {
          const data = await listsRes.json();
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
          setEvents(data.events || []);
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

  const getTodosForDay = (date: Date) => {
    const dateKey = formatDateKey(date);
    return todos
      .filter(t => t.dueDate === dateKey)
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
      
      if (newEvent.recurrence && newEvent.recurrence !== 'once') {
        const startDate = new Date(selectedDate);
        const limitDate = new Date(startDate);
        limitDate.setFullYear(startDate.getFullYear() + 2); // 2 years limit
        
        let currentDate = new Date(startDate);
        
        // Safety limit: 365 events max
        for (let i = 0; i < 365; i++) {
            let nextDate = new Date(currentDate);
            
            if (newEvent.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
            else if (newEvent.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
            else if (newEvent.recurrence === 'biweekly') nextDate.setDate(nextDate.getDate() + 14);
            else if (newEvent.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
            else if (newEvent.recurrence === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
            else if (newEvent.recurrence === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
            
            if (nextDate > limitDate) break;
            
            datesToAdd.push(nextDate);
            currentDate = nextDate;
        }
      }

      await Promise.all(datesToAdd.map(date => {
        const eventData = {
          title: newEvent.title,
          date: formatDateKey(date),
          time: newEvent.time || undefined,
          description: newEvent.description || undefined,
          type: newEvent.type,
          listId: activeListId
        };

        return fetch('/api/calendar-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData)
        });
      }));

      // Reload all events to sync
      const res = await fetch('/api/calendar-events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
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
        listId: editingEvent.listId
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
      const res = await fetch(`/api/calendar-events/${eventId}`, { method: 'DELETE' });
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== eventId));
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleEditEvent = (event: CalendarEvent) => {
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

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl pb-16 sm:pb-20">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-4 border-b border-gray-200/50 dark:border-white/10">
        {/* Desktop - одна строка */}
        <div className="hidden sm:flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">            
            {/* Calendar List Selector */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowListSelector(!showListSelector)}
                className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 rounded-2xl transition-all duration-200 text-sm font-medium border border-gray-200/60 dark:border-white/10 shadow-sm hover:shadow-md backdrop-blur-md group"
                style={{ borderLeft: `4px solid ${calendarLists.find(l => l.id === activeListId)?.color || '#3B82F6'}` }}
              >
                <span className="max-w-[120px] truncate text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">
                  {calendarLists.find(l => l.id === activeListId)?.name || (calendarLists.length > 0 ? calendarLists[0].name : 'Нет календарей')}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 dark:text-white/40 group-hover:text-gray-600 dark:group-hover:text-white/70 flex-shrink-0 transition-colors" />
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
          
          <div className="flex items-center bg-white/50 dark:bg-black/20 p-1 rounded-2xl border border-gray-200/50 dark:border-white/10 backdrop-blur-md shadow-sm">
            <button
              onClick={goToPreviousMonth}
              className="p-2 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all"
              title="Предыдущий месяц"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="px-4 py-1 flex items-center justify-center min-w-[140px]">
              <span className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-white/70 whitespace-nowrap">
                {currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).charAt(0).toUpperCase() + currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).slice(1)}
              </span>
            </div>

            <button
              onClick={goToNextMonth}
              className="p-2 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all"
              title="Следующий месяц"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
              onClick={goToCurrentMonth}
              className="px-4 py-2 text-sm font-medium rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all shadow-sm"
            >
              Сегодня
          </button>
        </div>

        {/* Mobile - Compact Header (Styled like Todos) */}
        <div className="sm:hidden flex flex-col gap-2 p-1">
          {/* Top Row: Selector & Today */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <button
                onClick={() => setShowListSelector(!showListSelector)}
                className="w-full flex items-center justify-between gap-2 px-3 h-9 bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 rounded-[20px] transition-all duration-200 text-xs text-[var(--text-primary)] border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-xl"
                style={{ borderLeft: `4px solid ${calendarLists.find(l => l.id === activeListId)?.color || '#3B82F6'}` }}
              >
                <span className="truncate flex-1 text-left font-medium">
                  {calendarLists.find(l => l.id === activeListId)?.name || (calendarLists.length > 0 ? calendarLists[0].name : 'Нет календарей')}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
              </button>
            </div>
            
            <button
              onClick={goToCurrentMonth}
              className="px-4 h-9 text-xs font-medium rounded-[20px] bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-400 border border-blue-500/30 whitespace-nowrap shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-xl"
            >
              Сегодня
            </button>
          </div>

          {/* Bottom Row: Navigation & Month */}
          <div className="flex items-center justify-between h-9 bg-gradient-to-br from-white/15 to-white/5 border border-white/20 rounded-[20px] px-1 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-xl">
            <button
              onClick={goToPreviousMonth}
              className="w-8 h-full flex items-center justify-center text-[var(--text-primary)] hover:bg-white/10 rounded-l-[18px] transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex-1 text-center font-semibold text-sm text-[var(--text-primary)]">
              {currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).charAt(0).toUpperCase() + currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).slice(1)}
            </div>

            <button
              onClick={goToNextMonth}
              className="w-8 h-full flex items-center justify-center text-[var(--text-primary)] hover:bg-white/10 rounded-r-[18px] transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar */}
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
                      const colors = EVENT_COLORS[event.type];
                      return (
                        <div
                          key={event.id}
                          onClick={() => handleEditEvent(event)}
                          className={`
                            text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 sm:py-1 rounded cursor-pointer transition-all
                            border-l-2 ${colors.border} ${colors.bg} ${colors.text}
                            hover:shadow-md hover:scale-[1.02] group/item
                          `}
                          title={`${event.title}${event.time ? ` (${event.time})` : ''}${event.description ? `\n${event.description}` : ''}`}
                        >
                          <div className="flex items-center justify-between gap-0.5 sm:gap-1">
                            <div className="flex-1 min-w-0">
                              {event.time && (
                                <span className="text-[7px] sm:text-[8px] font-semibold opacity-70">{event.time} </span>
                              )}
                              <span className="font-medium truncate">{event.title}</span>
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
                <label className="block text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Повторение</label>
                <select
                  value={newEvent.recurrence || 'once'}
                  onChange={(e) => setNewEvent({ ...newEvent, recurrence: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-white"
                >
                  <option value="once">Не повторять</option>
                  <option value="daily">Каждый день</option>
                  <option value="weekly">Раз в неделю</option>
                  <option value="biweekly">Раз в 2 недели</option>
                  <option value="monthly">Раз в месяц</option>
                  <option value="quarterly">Раз в 3 месяца</option>
                  <option value="yearly">Раз в год</option>
                </select>
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

      {/* Empty State */}
      {todos.length === 0 && events.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <CalendarIcon className="w-12 h-12 text-gray-300 dark:text-white/20 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-white/60 text-sm">Нет задач и событий</p>
            <p className="text-gray-400 dark:text-white/40 text-xs mt-1">Нажмите + чтобы добавить событие</p>
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
                      className={`w-8 h-8 rounded-lg transition-all ${newListColor === color ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-white/30' : ''}`}
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
