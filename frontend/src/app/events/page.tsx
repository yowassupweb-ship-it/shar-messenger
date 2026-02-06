'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  CalendarDays,
  Clock,
  MapPin,
  Tag,
  X,
  Edit3,
  Trash2,
  ArrowLeft,
  Users,
  Bell,
  BellRing,
  Gift,
  Heart,
  Briefcase,
  Star,
  LayoutGrid,
  List,
  UserPlus,
  Check,
  AlertCircle,
  Search,
  Settings,
  User,
  ChevronDown,
  Filter,
  Send,
  Image,
  Video,
  FileText,
  Link2,
  Copy,
  ExternalLink,
  MessageCircle,
  AtSign,
  Flag,
  CheckSquare
} from 'lucide-react';

interface Person {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  role: 'customer' | 'executor' | 'universal';
}

interface Notification {
  id: string;
  type: 'new_task' | 'comment' | 'status_change' | 'assignment' | 'mention' | 'event_invite' | 'event_reminder' | 'event_update';
  todoId?: string;
  todoTitle?: string;
  eventId?: string;
  eventTitle?: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  type: string;
  dateType: string;
  startDate: string;
  endDate?: string;
  color?: string;
  url?: string;
  tags?: string[];
  impact?: 'positive' | 'negative' | 'neutral';
  notes?: string;
  participants?: string[]; // ID участников
  createdBy?: string; // ID создателя
  assignedById?: string; // Заказчик
  assignedToIds?: string[]; // Исполнители
  createdAt: string;
  updatedAt: string;
  // Поля для контент-плана
  platforms?: ('telegram' | 'vk' | 'dzen')[];
  contentType?: 'post' | 'story' | 'video' | 'article';
  mediaUrls?: string[];
  postText?: string;
  postStatus?: 'draft' | 'scheduled' | 'published';
  publishTime?: string;
}

interface EventType {
  id: string;
  name: string;
  color: string;
  icon: string;
}

const DEFAULT_EVENT_TYPES: EventType[] = [
  { id: 'meeting', name: 'Встреча', color: '#6366f1', icon: 'users' },
  { id: 'deadline', name: 'Дедлайн', color: '#ef4444', icon: 'clock' },
  { id: 'task', name: 'Техническое задание', color: '#8b5cf6', icon: 'briefcase' },
  { id: 'reminder', name: 'Напоминание', color: '#22c55e', icon: 'bell' },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  users: <Users className="w-4 h-4" />,
  clock: <Clock className="w-4 h-4" />,
  bell: <Bell className="w-4 h-4" />,
  gift: <Gift className="w-4 h-4" />,
  heart: <Heart className="w-4 h-4" />,
  briefcase: <Briefcase className="w-4 h-4" />,
  star: <Star className="w-4 h-4" />,
};

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

// Хелпер для форматирования локальной даты в YYYY-MM-DD
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>(DEFAULT_EVENT_TYPES);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddType, setShowAddType] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string | null>(null);
  const [showTodoTasks, setShowTodoTasks] = useState(true); // Показывать задачи из списка дел
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('calendar');
  const [sidebarTab, setSidebarTab] = useState<'upcoming' | 'timeline'>('upcoming'); // Вкладки в боковой панели
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true); // По умолчанию закрыт
  const [users, setUsers] = useState<Person[]>([]);
  const [myAccountId, setMyAccountId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipantFilter, setShowParticipantFilter] = useState(false);
  const [participantFilter, setParticipantFilter] = useState<string>('all');
  const [upcomingEventsExpanded, setUpcomingEventsExpanded] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null); // Подсветка связи ТЗ-дедлайн
  const [dayModalDate, setDayModalDate] = useState<string | null>(null); // Модалка дня
  const [hoveredCellDate, setHoveredCellDate] = useState<string | null>(null); // Hover ячейки
  
  // Inbox state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showInbox, setShowInbox] = useState(false);
  const [inboxTab, setInboxTab] = useState<'new' | 'history'>('new');
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Description editor ref
  const descriptionEditorRef = useRef<HTMLDivElement>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  // Refs для закрытия меню по клику вне
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const participantFilterRef = useRef<HTMLDivElement>(null);
  
  // Форма события
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    type: 'meeting',
    startDate: '',
    endDate: '',
    color: '',
    notes: '',
    participants: [] as string[],
    assignedById: '' as string,
    assignedToIds: [] as string[]
  });
  
  // Форма типа
  const [typeForm, setTypeForm] = useState({
    name: '',
    color: '#6366f1',
    icon: 'star'
  });

  // Загрузка людей (аналогично задачам)
  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/todos/people');
      const data = await res.json();
      const peopleArray = Array.isArray(data.people) ? data.people : [];
      setUsers(peopleArray);
    } catch (error) {
      console.error('Error loading people:', error);
      setUsers([]);
    }
  }, []);

  // Загрузка настроек пользователя из профиля
  useEffect(() => {
    const loadUserSettings = async () => {
      const username = localStorage.getItem('username');
      const userRole = localStorage.getItem('userRole');
      if (!username) return;
      
      setCurrentUser({ name: username, role: userRole });
      
      try {
        const res = await fetch(`/api/auth/me?username=${encodeURIComponent(username)}`);
        if (res.ok) {
          const userData = await res.json();
          
          // Используем ID пользователя напрямую как ID профиля
          setMyAccountId(userData.id);
          localStorage.setItem('events_myAccountId', userData.id);
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
        // При ошибке загружаем из localStorage
        const savedAccountId = localStorage.getItem('events_myAccountId');
        if (savedAccountId) {
          setMyAccountId(savedAccountId);
        }
      }
    };
    
    loadUserSettings();
  }, []);

  // Отправка уведомления об участии в событии
  const sendEventNotification = useCallback(async (
    type: 'event_invite' | 'event_reminder' | 'event_update',
    eventId: string,
    eventTitle: string,
    toUserId: string,
    message: string
  ) => {
    if (!myAccountId || toUserId === myAccountId) return;
    
    const currentUser = users.find(u => u.id === myAccountId);
    if (!currentUser) return;

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type,
          eventId,
          eventTitle,
          fromUserId: myAccountId,
          fromUserName: currentUser.name,
          toUserId,
          message,
          read: false,
          createdAt: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [myAccountId, users]);

  // Загрузка уведомлений
  const loadNotifications = useCallback(async () => {
    if (!myAccountId) return;
    // Не запрашиваем данные если вкладка не активна
    if (typeof document !== 'undefined' && document.hidden) return;
    
    try {
      const res = await fetch(`/api/notifications?userId=${myAccountId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [myAccountId]);

  // Отметить уведомление как прочитанное
  const markNotificationRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notificationId, read: true })
      });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  // Отметить все уведомления как прочитанные
  const markAllNotificationsRead = async () => {
    const myNotifs = notifications.filter(n => n.toUserId === myAccountId && !n.read);
    for (const notif of myNotifs) {
      await markNotificationRead(notif.id);
    }
  };

  // Мои уведомления
  const myNotifications = notifications.filter(n => n.toUserId === myAccountId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unreadCount = myNotifications.filter(n => !n.read).length;

  // Загрузка данных
  const loadData = useCallback(async () => {
    if (!myAccountId) return;
    
    try {
      const res = await fetch(`/api/events?userId=${myAccountId}`);
      const data = await res.json();
      setEvents(data.events || []);
      if (data.types?.length) {
        setEventTypes(data.types);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsLoading(false);
    }
  }, [myAccountId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Автоматический выбор первого пользователя если аккаунт не установлен
  useEffect(() => {
    if (!myAccountId && users.length > 0) {
      const firstUser = users[0];
      setMyAccountId(firstUser.id);
      localStorage.setItem('events_myAccountId', firstUser.id);
    }
  }, [myAccountId, users]);

  // Загрузка уведомлений при смене пользователя
  useEffect(() => {
    if (myAccountId) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [myAccountId, loadNotifications]);

  // Обработчик клика вне меню для закрытия
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
      if (participantFilterRef.current && !participantFilterRef.current.contains(event.target as Node)) {
        setShowParticipantFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Навигация по месяцам
  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Получение дней для календаря
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Дни предыдущего месяца
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // Понедельник = 0
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

  // Фильтрация событий по поиску и участникам
  const filterEvents = (eventList: Event[]) => {
    return eventList.filter(e => {
      // Фильтр по правам доступа - пользователь видит только свои задачи
      if (myAccountId && currentUser && !currentUser.canSeeAllTasks) {
        const isParticipant = e.participants?.includes(myAccountId) ||
                            e.assignedById === myAccountId ||
                            e.assignedToIds?.includes(myAccountId) ||
                            e.createdBy === myAccountId;
        if (!isParticipant) return false;
      }
      // Фильтр по поиску
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(query);
        const matchesDescription = e.description?.toLowerCase().includes(query);
        const matchesNotes = e.notes?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription && !matchesNotes) return false;
      }
      // Фильтр по участникам
      if (participantFilter !== 'all') {
        const participants = e.participants || [];
        if (!participants.includes(participantFilter) && e.createdBy !== participantFilter) return false;
      }
      return true;
    });
  };

  // Получение событий для даты
  const getEventsForDate = (dateStr: string) => {
    return filterEvents(events.filter(e => {
      // Фильтр задач из списка дел (типы content и technical)
      if (!showTodoTasks && (e.type === 'content' || e.type === 'technical')) return false;
      if (selectedTypeFilter && e.type !== selectedTypeFilter) return false;
      const eventStartDate = e.startDate.split('T')[0];
      const eventEndDate = e.endDate?.split('T')[0];
      if (eventStartDate === dateStr) return true;
      if (eventEndDate && eventStartDate <= dateStr && eventEndDate >= dateStr) return true;
      return false;
    })).sort((a, b) => {
      // ТЗ с дедлайном внизу списка (на дате начала)
      const aIsTaskStart = a.type === 'task' && a.endDate && a.startDate.split('T')[0] === dateStr;
      const bIsTaskStart = b.type === 'task' && b.endDate && b.startDate.split('T')[0] === dateStr;
      if (aIsTaskStart && !bIsTaskStart) return 1;
      if (!aIsTaskStart && bIsTaskStart) return -1;
      return 0;
    });
  };

  // Добавление события
  const addEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.startDate) return;
    
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventForm.title,
          description: eventForm.description,
          type: eventForm.type,
          dateType: eventForm.endDate ? 'range' : 'single',
          startDate: eventForm.startDate,
          endDate: eventForm.endDate || undefined,
          color: eventForm.color || undefined,
          notes: eventForm.notes || undefined,
          participants: eventForm.participants,
          assignedById: eventForm.assignedById || undefined,
          assignedToIds: eventForm.assignedToIds.length > 0 ? eventForm.assignedToIds : undefined,
          createdBy: myAccountId
        })
      });
      
      if (res.ok) {
        const newEvent = await res.json();
        // Отправляем уведомления участникам
        for (const participantId of eventForm.participants) {
          const participant = users.find(u => u.id === participantId);
          if (participant) {
            sendEventNotification(
              'event_invite',
              newEvent.id,
              eventForm.title,
              participantId,
              `Вас пригласили на событие "${eventForm.title}"`
            );
          }
        }
        loadData();
        setShowAddEvent(false);
        resetEventForm();
      }
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  // Обновление события
  const updateEvent = async () => {
    if (!editingEvent || !eventForm.title.trim()) return;
    
    // Определяем новых участников для уведомлений
    const previousParticipants = editingEvent.participants || [];
    const newParticipants = eventForm.participants.filter(p => !previousParticipants.includes(p));
    
    try {
      const res = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEvent.id,
          title: eventForm.title,
          description: eventForm.description,
          type: eventForm.type,
          dateType: eventForm.endDate ? 'range' : 'single',
          startDate: eventForm.startDate,
          endDate: eventForm.endDate || undefined,
          color: eventForm.color || undefined,
          notes: eventForm.notes || undefined,
          participants: eventForm.participants,
          assignedById: eventForm.assignedById || undefined,
          assignedToIds: eventForm.assignedToIds.length > 0 ? eventForm.assignedToIds : undefined
        })
      });
      
      if (res.ok) {
        // Уведомляем новых участников
        for (const participantId of newParticipants) {
          sendEventNotification(
            'event_invite',
            editingEvent.id,
            eventForm.title,
            participantId,
            `Вас пригласили на событие "${eventForm.title}"`
          );
        }
        // Уведомляем существующих участников об изменениях (кроме себя)
        for (const participantId of previousParticipants) {
          if (!newParticipants.includes(participantId)) {
            sendEventNotification(
              'event_update',
              editingEvent.id,
              eventForm.title,
              participantId,
              `Событие "${eventForm.title}" было обновлено`
            );
          }
        }
        loadData();
        setEditingEvent(null);
        resetEventForm();
      }
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  // Удаление события
  const deleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== id));
        setEditingEvent(null);
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  // Копирование события
  const copyEvent = async (event: Event) => {
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${event.title} (копия)`,
          description: event.description,
          type: event.type,
          dateType: event.endDate ? 'range' : 'single',
          startDate: event.startDate,
          endDate: event.endDate || undefined,
          color: event.color || undefined,
          notes: event.notes || undefined,
          participants: event.participants || [],
          assignedById: event.assignedById || undefined,
          assignedToIds: event.assignedToIds || [],
          createdBy: myAccountId
        })
      });
      
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Error copying event:', error);
    }
  };

  // Добавление типа
  const addType = async () => {
    if (!typeForm.name.trim()) return;
    
    const newType: EventType = {
      id: `type_${Date.now()}`,
      name: typeForm.name,
      color: typeForm.color,
      icon: typeForm.icon
    };
    
    try {
      const res = await fetch('/api/event-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newType)
      });
      
      if (res.ok) {
        setEventTypes(prev => [...prev, newType]);
        setShowAddType(false);
        setTypeForm({ name: '', color: '#6366f1', icon: 'star' });
      }
    } catch (error) {
      console.error('Error adding type:', error);
    }
  };

  // Удаление типа
  const deleteType = async (typeId: string) => {
    // Проверяем, не является ли тип дефолтным
    const defaultTypeIds = DEFAULT_EVENT_TYPES.map(t => t.id);
    if (defaultTypeIds.includes(typeId)) {
      alert('Нельзя удалить стандартный тип события');
      return;
    }
    
    // Проверяем, есть ли события с этим типом
    const hasEvents = events.some(e => e.type === typeId);
    if (hasEvents) {
      if (!confirm('У этого типа есть события. Вы уверены, что хотите удалить тип? События останутся, но их тип станет неопределенным.')) {
        return;
      }
    }
    
    try {
      const res = await fetch(`/api/event-types?id=${typeId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setEventTypes(prev => prev.filter(t => t.id !== typeId));
      } else {
        const data = await res.json();
        alert(`Ошибка удаления: ${data.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Error deleting type:', error);
      alert('Ошибка связи с сервером');
    }
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      type: 'meeting',
      startDate: selectedDate || '',
      endDate: '',
      color: '',
      notes: '',
      participants: [],
      assignedById: '',
      assignedToIds: []
    });
  };

  const openAddEvent = (date?: string) => {
    setShowDeleteConfirm(false);
    setEventForm({
      ...eventForm,
      startDate: date || selectedDate || new Date().toISOString().split('T')[0],
      participants: [],
      assignedById: myAccountId || '',
      assignedToIds: []
    });
    setShowAddEvent(true);
  };

  const openEditEvent = (event: Event) => {
    setShowDeleteConfirm(false);
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      type: event.type,
      startDate: event.startDate,
      endDate: event.endDate || '',
      color: event.color || '',
      notes: event.notes || '',
      participants: event.participants || [],
      assignedById: event.assignedById || '',
      assignedToIds: event.assignedToIds || []
    });
    // Устанавливаем контент редактора
    setTimeout(() => {
      if (descriptionEditorRef.current) {
        descriptionEditorRef.current.innerHTML = event.description || '';
      }
    }, 0);
  };

  // Переключение участника
  const toggleParticipant = (userId: string) => {
    setEventForm(prev => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter(p => p !== userId)
        : [...prev.participants, userId]
    }));
  };

  // Вспомогательная функция для фильтрации задач из списка дел
  const filterTodoTasks = (e: Event) => {
    if (!showTodoTasks && (e.type === 'content' || e.type === 'technical')) return false;
    return true;
  };

  // События для выбранной даты или ближайшие
  const selectedDateEvents = selectedDate 
    ? getEventsForDate(selectedDate)
    : filterEvents(events.filter(e => {
        if (!filterTodoTasks(e)) return false;
        if (selectedTypeFilter && e.type !== selectedTypeFilter) return false;
        const today = new Date().toISOString().split('T')[0];
        return e.startDate >= today;
      })).sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 10);

  const today = new Date().toISOString().split('T')[0];

  // Все события для полного таймлайна (сгруппированные по дате)
  const allTimelineEvents = filterEvents(events
    .filter(e => filterTodoTasks(e))
    .filter(e => !selectedTypeFilter || e.type === selectedTypeFilter))
    .filter(e => {
      // Фильтруем прошедшие события - показываем только где пользователь участвует
      const isPast = e.startDate < today;
      if (isPast && myAccountId && currentUser && !currentUser.canSeeAllTasks) {
        // Проверяем участие пользователя
        const isParticipant = e.participants?.includes(myAccountId) ||
                            e.assignedById === myAccountId ||
                            e.assignedToIds?.includes(myAccountId) ||
                            e.createdBy === myAccountId;
        return isParticipant;
      }
      return true;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  
  // Группировка событий по дате для таймлайна
  const groupedEvents = allTimelineEvents.reduce((acc, event) => {
    const date = event.startDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col text-white bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="flex-shrink-0 h-12 backdrop-blur-xl bg-white/15 dark:bg-black/15 border-b border-white/20 flex items-center px-4 z-40 relative">
        <div className="flex items-center gap-3 w-full max-w-7xl mx-auto">
          <Link
            href="/"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--bg-glass)] border border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)] transition-all backdrop-blur-sm"
            title="На главную"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          </Link>
          
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-sm sm:text-base">Календарь событий</span>
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:flex-initial" style={{ maxWidth: '200px' }}>
            <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 sm:w-4 h-3.5 sm:h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 sm:pl-9 pr-3 py-1.5 bg-[var(--bg-glass)] border border-[var(--border-glass)] rounded-xl w-full text-xs sm:text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-[var(--text-muted)] backdrop-blur-sm"
            />
          </div>

          {/* Participant Filter */}
          <div className="relative hidden sm:block" ref={participantFilterRef}>
            <button
              onClick={() => setShowParticipantFilter(!showParticipantFilter)}
              className={`px-2 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 sm:gap-2 border backdrop-blur-sm ${
                participantFilter !== 'all'
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                  : 'bg-[var(--bg-glass)] border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {participantFilter === 'all' 
                ? 'Участник' 
                : users.find(u => u.id === participantFilter)?.name || 'Участник'}
              <ChevronDown className={`w-3 h-3 transition-transform ${ showParticipantFilter ? 'rotate-180' : ''}`} />
            </button>
          
          {showParticipantFilter && (
            <div className="absolute left-0 top-full mt-1 w-56 backdrop-blur-xl bg-[var(--bg-tertiary)]/95 border border-white/10 rounded-xl shadow-xl z-[60] py-1 max-h-64 overflow-y-auto">
              <button
                onClick={() => { setParticipantFilter('all'); setShowParticipantFilter(false); }}
                className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-white/10 transition-colors rounded-lg mx-1 ${
                  participantFilter === 'all' ? 'text-white bg-white/5' : 'text-white/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Все участники
              </button>
              {users.filter(u => u && u.name).map(user => (
                <button
                  key={user.id}
                  onClick={() => { setParticipantFilter(user.id); setShowParticipantFilter(false); }}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-white/10 transition-colors rounded-lg mx-1 ${
                    participantFilter === user.id ? 'text-cyan-400 bg-cyan-500/10' : 'text-white/60'
                  }`}
                >
                  <div 
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.name.charAt(0)}
                  </div>
                  {user.name}
                  {user.id === myAccountId && (
                    <span className="ml-auto text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">Я</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

          <div className="flex-1" />

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => openAddEvent()}
              className="px-3 py-1.5 backdrop-blur-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 rounded-xl flex items-center gap-1.5 transition-all text-xs outline-none font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить
            </button>

            {/* Tools Menu */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 backdrop-blur-xl bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 rounded-xl text-xs transition-all flex items-center border border-white/20"
                title="Инструменты"
              >
                <Settings className="w-4 h-4" />
              </button>
            
            {showSettings && (
              <div className="absolute right-0 top-full mt-1 w-64 backdrop-blur-xl bg-[var(--bg-tertiary)]/95 border border-white/10 rounded-xl shadow-2xl z-[60] py-1">
                {/* Фильтры */}
                <div className="px-3 py-2 text-[10px] uppercase tracking-wide text-white/40 font-medium">Фильтры</div>
                <label className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer text-white/70 hover:bg-white/10 hover:text-white transition-all rounded-lg mx-1">
                  <input
                    type="checkbox"
                    checked={showTodoTasks}
                    onChange={(e) => setShowTodoTasks(e.target.checked)}
                    className="rounded w-3.5 h-3.5"
                  />
                  <span>Показывать задачи из TODO</span>
                </label>
                
                {/* Фильтр по типу */}
                <div className="px-3 py-2">
                  <div className="text-[10px] text-white/40 mb-2">Тип события</div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setSelectedTypeFilter(null)}
                      className={`px-2 py-1 rounded-lg text-[10px] transition-all outline-none ${
                        selectedTypeFilter === null 
                          ? 'bg-cyan-500/20 text-cyan-400 font-medium' 
                          : 'bg-white/5 hover:bg-white/10 text-white/60'
                      }`}
                    >
                      Все
                    </button>
                    {eventTypes.map(type => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedTypeFilter(type.id === selectedTypeFilter ? null : type.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] transition-all outline-none ${
                          selectedTypeFilter === type.id 
                            ? 'text-white' 
                            : 'hover:opacity-80'
                        }`}
                        style={{ 
                          backgroundColor: selectedTypeFilter === type.id ? type.color : `${type.color}20`,
                          color: selectedTypeFilter === type.id ? 'white' : type.color
                        }}
                      >
                        {type.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="border-t border-white/10 my-1" />
                <button
                  onClick={() => { setShowAddType(true); setShowSettings(false); }}
                  className="w-full px-3 py-2 text-xs text-left flex items-center gap-2 text-white/70 hover:text-white hover:bg-white/10 transition-all rounded-lg mx-1"
                >
                  <Tag className="w-3.5 h-3.5" />
                  Управление типами
                  <span className="ml-auto text-[10px] text-white/40">{eventTypes.length}</span>
                </button>
                <button
                  onClick={() => { setIsSidebarCollapsed(!isSidebarCollapsed); setShowSettings(false); }}
                  className="w-full px-3 py-2 text-xs text-left flex items-center gap-2 text-white/70 hover:text-white hover:bg-white/10 transition-all rounded-lg mx-1"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {isSidebarCollapsed ? 'Показать панель событий' : 'Скрыть панель событий'}
                </button>
                <div className="border-t border-white/10 my-1" />
                <button
                  onClick={() => { router.push('/'); setShowSettings(false); }}
                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-white/10 hover:text-white transition-all text-white/60 rounded-lg mx-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  На главную
                </button>
                <button
                  onClick={() => { router.push('/todos'); setShowSettings(false); }}
                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-white/5 transition-colors text-white/60 hover:text-white"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  Задачи
                </button>
                <button
                  onClick={() => { router.push('/contacts'); setShowSettings(false); }}
                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-white/5 transition-colors text-white/60 hover:text-white"
                >
                  <Users className="w-3.5 h-3.5" />
                  Контакты
                </button>
                <button
                  onClick={() => { router.push('/account'); setShowSettings(false); }}
                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-white/5 transition-colors text-white/60 hover:text-white"
                >
                  <User className="w-3.5 h-3.5" />
                  Аккаунт
                </button>
                {currentUser?.role === 'admin' && (
                  <button
                    onClick={() => { router.push('/admin'); setShowSettings(false); }}
                    className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-white/5 transition-colors text-amber-400 hover:text-amber-300"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Администрирование
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        </div>
      </header>

      {/* Mobile Month Switcher - только на мобильных */}
      <div className="md:hidden flex-shrink-0 bg-white/50 dark:bg-[var(--bg-tertiary)] backdrop-blur-md border-b border-gray-200/50 dark:border-[var(--border-color)]/50">
        <div className="flex items-center justify-between px-3 py-2">
          
          {/* Навигация по месяцам */}
          <div className="flex items-center gap-1 bg-white/10 dark:bg-white/5 rounded-lg p-0.5 border border-gray-200 dark:border-white/10">
            <button
              onClick={goToPreviousMonth}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/20 active:bg-white/30 text-gray-600 dark:text-white/70 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="text-sm font-semibold text-gray-800 dark:text-white/90 px-2 min-w-[110px] text-center">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>

            <button
              onClick={goToNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/20 active:bg-white/30 text-gray-600 dark:text-white/70 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Кнопка Сегодня */}
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-medium bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-all"
          >
            Сегодня
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-6 relative">
          {/* Календарь */}
          <div className={`transition-all duration-300 w-full ${isSidebarCollapsed ? 'lg:flex-1 lg:max-w-4xl lg:mx-auto' : 'lg:flex-1'}`}>
            <div className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-white/15 dark:to-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-2 sm:p-4 shadow-sm dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_4px_24px_rgba(0,0,0,0.2)]">
              {/* Навигация - скрыта на мобильных, там Mobile Month Switcher */}
              <div className="hidden md:flex items-center justify-between mb-3 sm:mb-4">
                <button
                  onClick={goToPreviousMonth}
                  className="p-1.5 sm:p-2 backdrop-blur-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl transition-all outline-none"
                >
                  <ChevronLeft className="w-4 sm:w-5 h-4 sm:h-5" />
                </button>
                <div className="flex items-center gap-2 sm:gap-3">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <button
                    onClick={goToToday}
                    className="px-2 sm:px-3 py-1 text-xs backdrop-blur-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 border border-cyan-500/30 rounded-full transition-all outline-none"
                  >
                    Сегодня
                  </button>
                </div>
                <button
                  onClick={goToNextMonth}
                  className="p-1.5 sm:p-2 backdrop-blur-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl transition-all outline-none"
                >
                  <ChevronRight className="w-4 sm:w-5 h-4 sm:h-5" />
                </button>
              </div>

              {/* Дни недели */}
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
                {WEEKDAYS.map((day, i) => (
                  <div 
                    key={day} 
                    className={`text-center text-[10px] sm:text-xs font-medium py-1 sm:py-2 rounded-lg ${
                      i === 5 || i === 6 ? 'text-gray-400 dark:text-white/30' : 'text-gray-600 dark:text-white/50'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Дни */}
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 relative">
                {getCalendarDays().map(({ date, isCurrentMonth }, index) => {
                  const dateStr = formatLocalDate(date);
                  const dayEvents = getEventsForDate(dateStr);
                  const isToday = dateStr === today;
                  const isSelected = dateStr === selectedDate;
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  
                  // Дедлайны ТЗ (конечные даты задач)
                  const deadlineEvents = events.filter(e => 
                    e.type === 'task' && 
                    e.endDate && 
                    e.endDate.split('T')[0] === dateStr &&
                    filterTodoTasks(e) &&
                    (!selectedTypeFilter || e.type === selectedTypeFilter)
                  );
                  
                  // ТЗ которые начинаются в этот день
                  const taskStartEvents = dayEvents.filter(e => 
                    e.type === 'task' && e.startDate.split('T')[0] === dateStr
                  );
                  
                  // Обычные события (не ТЗ)
                  const regularEvents = dayEvents.filter(e => e.type !== 'task');
                  
                  // Подсчёт для индикатора
                  const totalDeadlines = deadlineEvents.length;
                  const totalTasks = taskStartEvents.length;
                  const totalRegular = regularEvents.length;
                  const totalAll = totalDeadlines + totalTasks + totalRegular;
                  
                  // Показываем максимум 3 события: ТЗ первый (вверху), обычные в середине, дедлайн последний (внизу)
                  const shownTasks = Math.min(1, totalTasks);
                  const shownDeadlines = Math.min(1, totalDeadlines);
                  // Обычные события занимают оставшиеся слоты (макс 3 - ТЗ - дедлайн)
                  const remainingSlots = 3 - shownTasks - shownDeadlines;
                  const shownRegular = Math.min(remainingSlots, totalRegular);
                  const totalShown = shownTasks + shownRegular + shownDeadlines;
                  const hiddenCount = totalAll - totalShown;
                  
                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedDate(dateStr)}
                      onDoubleClick={(e) => { e.preventDefault(); setDayModalDate(dateStr); }}
                      onMouseEnter={() => setHoveredCellDate(dateStr)}
                      onMouseLeave={() => setHoveredCellDate(null)}
                      className={`
                        group min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] p-1 sm:p-1.5 rounded-xl cursor-pointer transition-all border relative outline-none flex flex-col
                        ${isCurrentMonth 
                          ? isWeekend 
                            ? 'backdrop-blur-xl bg-[var(--bg-tertiary)]/40 dark:bg-[var(--bg-tertiary)]/40' 
                            : 'backdrop-blur-xl bg-[var(--bg-tertiary)]/60 dark:bg-[var(--bg-tertiary)]/60' 
                          : 'backdrop-blur-xl bg-[var(--bg-tertiary)]/20 dark:bg-[var(--bg-tertiary)]/20 opacity-40'
                        }
                        ${isToday ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-gray-200 dark:border-white/5'}
                        ${isSelected ? 'ring-2 ring-cyan-500/50 ring-offset-1 ring-offset-transparent' : ''}
                        hover:bg-gray-100 dark:hover:bg-white/5 hover:border-gray-300 dark:hover:border-white/10
                      `}
                    >
                      {/* Hover tooltip со всеми событиями */}
                      {hoveredCellDate === dateStr && totalAll > 0 && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[100] w-56 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/20 rounded-xl shadow-2xl p-2.5 pointer-events-none">
                          <div className="text-[11px] font-medium text-gray-900 dark:text-white mb-1.5">
                            {date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </div>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {deadlineEvents.map(event => {
                              const eventType = eventTypes.find(t => t.id === event.type);
                              return (
                                <div key={`tip-dl-${event.id}`} className="flex items-center gap-1.5 text-[10px]">
                                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: event.color || eventType?.color || '#f59e0b' }} />
                                  <span className="text-orange-500 dark:text-orange-400">⏰</span>
                                  <span className="text-gray-600 dark:text-white/70 truncate">{event.title}</span>
                                </div>
                              );
                            })}
                            {taskStartEvents.map(event => {
                              const eventType = eventTypes.find(t => t.id === event.type);
                              return (
                                <div key={`tip-task-${event.id}`} className="flex items-center gap-1.5 text-[10px]">
                                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: event.color || eventType?.color || '#8b5cf6' }} />
                                  <span className="text-purple-500 dark:text-purple-400">📋</span>
                                  <span className="text-gray-600 dark:text-white/70 truncate">{event.title}</span>
                                </div>
                              );
                            })}
                            {regularEvents.map(event => {
                              const eventType = eventTypes.find(t => t.id === event.type);
                              return (
                                <div key={`tip-reg-${event.id}`} className="flex items-center gap-1.5 text-[10px]">
                                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: event.color || eventType?.color || '#6366f1' }} />
                                  <span className="text-gray-600 dark:text-white/70 truncate">{event.title}</span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-white/20" />
                        </div>
                      )}
                      
                      {/* Заголовок с датой */}
                      <div className={`text-[10px] sm:text-xs font-medium mb-0.5 flex items-center justify-between ${
                        isToday ? 'text-cyan-500' : isWeekend && isCurrentMonth ? 'text-gray-400 dark:text-white/40' : 'text-gray-700 dark:text-white/70'
                      }`}>
                        <span className={isToday ? 'bg-cyan-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold' : ''}>
                          {date.getDate()}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {totalAll > 0 && !isToday && (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/60 dark:bg-cyan-400/60"></span>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); openAddEvent(dateStr); }}
                            className="w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Контент ячейки - десктоп: ТЗ вверху, обычные в середине, дедлайн внизу */}
                      <div className="hidden sm:flex flex-col flex-1 overflow-hidden justify-between">
                        {/* Верхняя часть - ТЗ (начало задач) */}
                        <div className="space-y-0.5">
                          {taskStartEvents.slice(0, 1).map(event => {
                            const eventType = eventTypes.find(t => t.id === event.type);
                            const isHighlighted = highlightedTaskId === event.id;
                            const blockColor = event.color || eventType?.color || '#8b5cf6';
                            return (
                              <div
                                key={`task-${event.id}`}
                                className={`text-[8px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer z-10 transition-all ${isHighlighted ? 'ring-1 ring-white/50 dark:ring-white/50' : 'hover:brightness-110'}`}
                                style={{ backgroundColor: blockColor, color: '#fff' }}
                                onClick={(e) => { e.stopPropagation(); openEditEvent(event); }}
                                onMouseEnter={() => event.endDate && setHighlightedTaskId(event.id)}
                                onMouseLeave={() => setHighlightedTaskId(null)}
                              >
                                📋 {event.title}
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Середина - обычные события */}
                        <div className="space-y-0.5">
                          {regularEvents.slice(0, shownRegular).map(event => {
                            const eventType = eventTypes.find(t => t.id === event.type);
                            const blockColor = event.color || eventType?.color || '#6366f1';
                            return (
                              <div
                                key={`reg-${event.id}`}
                                className="text-[8px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer z-10 hover:brightness-110"
                                style={{ backgroundColor: blockColor, color: '#fff' }}
                                onClick={(e) => { e.stopPropagation(); openEditEvent(event); }}
                              >
                                {event.title}
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Нижняя часть - дедлайны */}
                        <div className="space-y-0.5 mt-auto">
                          {deadlineEvents.slice(0, 1).map(event => {
                            const eventType = eventTypes.find(t => t.id === event.type);
                            const isHighlighted = highlightedTaskId === event.id;
                            const blockColor = event.color || eventType?.color || '#f59e0b';
                            return (
                              <div
                                key={`deadline-${event.id}`}
                                className={`text-[8px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer z-10 transition-all ${isHighlighted ? 'ring-1 ring-white/50 dark:ring-white/50' : 'hover:brightness-110'}`}
                                style={{ backgroundColor: blockColor, color: '#fff' }}
                                onClick={(e) => { e.stopPropagation(); openEditEvent(event); }}
                                onMouseEnter={() => setHighlightedTaskId(event.id)}
                                onMouseLeave={() => setHighlightedTaskId(null)}
                              >
                                ⏰ {event.title}
                              </div>
                            );
                          })}
                          
                          {/* Индикатор скрытых */}
                          {hiddenCount > 0 && (
                            <div 
                              className="text-[8px] text-gray-500 dark:text-white/40 px-1 cursor-pointer hover:text-gray-700 dark:hover:text-white/60"
                              onClick={(e) => { e.stopPropagation(); setDayModalDate(dateStr); }}
                            >
                              +{hiddenCount} ещё
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Мобильная версия - точки */}
                      <div className="flex flex-wrap gap-0.5 sm:hidden mt-auto">
                        {[...deadlineEvents, ...regularEvents, ...taskStartEvents].slice(0, 4).map(event => {
                          const eventType = eventTypes.find(t => t.id === event.type);
                          return (
                            <div
                              key={`mob-${event.id}`}
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: event.color || eventType?.color || '#6366f1' }}
                            />
                          );
                        })}
                        {totalAll > 4 && <div className="w-2 h-2 rounded-full bg-white/30 text-[5px] flex items-center justify-center">+</div>}
                      </div>
                    </div>
                  );
                })}
                
                {/* Отрисовка линий для технических заданий */}
                {events.filter(e => e.type === 'task' && e.endDate && filterTodoTasks(e) && (!selectedTypeFilter || e.type === selectedTypeFilter)).map(task => {
                  const taskType = eventTypes.find(t => t.id === task.type);
                  const calendarDays = getCalendarDays();
                  
                  // Находим индексы начала и конца задачи в календаре
                  const taskStartDate = task.startDate.split('T')[0];
                  const taskEndDate = task.endDate!.split('T')[0];
                  
                  const startIndex = calendarDays.findIndex(d => {
                    const calDate = formatLocalDate(d.date);
                    return calDate === taskStartDate;
                  });
                  const endIndex = calendarDays.findIndex(d => {
                    const calDate = formatLocalDate(d.date);
                    return calDate === taskEndDate;
                  });
                  
                  if (startIndex === -1 || endIndex === -1) return null;
                  
                  const startRow = Math.floor(startIndex / 7);
                  const endRow = Math.floor(endIndex / 7);
                  const startCol = startIndex % 7;
                  const endCol = endIndex % 7;
                  
                  const lineColor = task.color || taskType?.color || '#8b5cf6';
                  const isHighlighted = highlightedTaskId === task.id;
                  const lineOpacity = isHighlighted ? 1 : 0.5;
                  const lineWidth = isHighlighted ? 3 : 2;
                  
                  // Процентные значения
                  const cellWidth = 100 / 7;
                  const totalRows = Math.ceil(calendarDays.length / 7);
                  const rowHeight = 100 / totalRows;
                  
                  const elements: React.ReactNode[] = [];
                  
                  // Позиции центров ячеек
                  const startX = (startCol + 0.5) * cellWidth;
                  const endX = (endCol + 0.5) * cellWidth;
                  
                  // ТЗ блок вверху ячейки (~25% от верха ячейки) - теперь ТЗ первый
                  const tzBlockY = (startRow + 0.28) * rowHeight;
                  // Дедлайн блок внизу ячейки (~82% от верха ячейки) - теперь дедлайн последний
                  const deadlineBlockY = (endRow + 0.82) * rowHeight;
                  
                  if (startRow === endRow) {
                    // Одна строка - простая горизонтальная линия
                    // От низа ТЗ блока вниз, затем горизонтально, затем вверх к дедлайну
                    const bottomOfRow = (startRow + 0.95) * rowHeight;
                    
                    // Вертикаль вниз от ТЗ
                    elements.push(
                      <div key={`${task.id}-v1`} className="absolute pointer-events-none" style={{
                        left: `${startX}%`, top: `${tzBlockY}%`,
                        width: `${lineWidth}px`, height: `${bottomOfRow - tzBlockY}%`,
                        backgroundColor: lineColor, opacity: lineOpacity,
                        transform: 'translateX(-50%)', borderRadius: '2px'
                      }} />
                    );
                    // Горизонталь внизу
                    elements.push(
                      <div key={`${task.id}-h1`} className="absolute pointer-events-none" style={{
                        left: `${Math.min(startX, endX)}%`, top: `${bottomOfRow}%`,
                        width: `${Math.abs(endX - startX)}%`, height: `${lineWidth}px`,
                        backgroundColor: lineColor, opacity: lineOpacity,
                        transform: 'translateY(-50%)', borderRadius: '2px'
                      }} />
                    );
                    // Вертикаль вверх к дедлайну
                    elements.push(
                      <div key={`${task.id}-v2`} className="absolute pointer-events-none" style={{
                        left: `${endX}%`, top: `${deadlineBlockY}%`,
                        width: `${lineWidth}px`, height: `${bottomOfRow - deadlineBlockY}%`,
                        backgroundColor: lineColor, opacity: lineOpacity,
                        transform: 'translateX(-50%)', borderRadius: '2px'
                      }} />
                    );
                  } else {
                    // Разные строки
                    const bottomOfStartRow = (startRow + 1) * rowHeight;
                    const topOfEndRow = endRow * rowHeight;
                    
                    // 1. Вертикаль вниз от ТЗ до низа ряда
                    elements.push(
                      <div key={`${task.id}-v1`} className="absolute pointer-events-none" style={{
                        left: `${startX}%`, top: `${tzBlockY}%`,
                        width: `${lineWidth}px`, height: `${bottomOfStartRow - tzBlockY}%`,
                        backgroundColor: lineColor, opacity: lineOpacity,
                        transform: 'translateX(-50%)', borderRadius: '2px'
                      }} />
                    );
                    
                    // 2. Горизонталь до правого края
                    elements.push(
                      <div key={`${task.id}-h1`} className="absolute pointer-events-none" style={{
                        left: `${startX}%`, top: `${bottomOfStartRow}%`,
                        width: `${100 - startX + 0.5}%`, height: `${lineWidth}px`,
                        backgroundColor: lineColor, opacity: lineOpacity,
                        transform: 'translateY(-50%)', borderRadius: '2px'
                      }} />
                    );
                    
                    // 3. Вертикаль по правому краю (если есть промежуточные ряды)
                    if (endRow > startRow) {
                      elements.push(
                        <div key={`${task.id}-vr`} className="absolute pointer-events-none" style={{
                          right: '0', top: `${bottomOfStartRow}%`,
                          width: `${lineWidth}px`, height: `${topOfEndRow - bottomOfStartRow}%`,
                          backgroundColor: lineColor, opacity: lineOpacity,
                          borderRadius: '2px'
                        }} />
                      );
                    }
                    
                    // 4. Горизонталь от правого края к дедлайну
                    elements.push(
                      <div key={`${task.id}-h2`} className="absolute pointer-events-none" style={{
                        left: `${endX}%`, top: `${topOfEndRow}%`,
                        width: `${100 - endX + 0.5}%`, height: `${lineWidth}px`,
                        backgroundColor: lineColor, opacity: lineOpacity,
                        transform: 'translateY(-50%)', borderRadius: '2px'
                      }} />
                    );
                    
                    // 5. Вертикаль вниз к блоку дедлайна
                    elements.push(
                      <div key={`${task.id}-v2`} className="absolute pointer-events-none" style={{
                        left: `${endX}%`, top: `${topOfEndRow}%`,
                        width: `${lineWidth}px`, height: `${deadlineBlockY - topOfEndRow}%`,
                        backgroundColor: lineColor, opacity: lineOpacity,
                        transform: 'translateX(-50%)', borderRadius: '2px'
                      }} />
                    );
                  }
                  
                  return elements;
                })}
              </div>
            </div>

            {/* Активные фильтры - компактная индикация */}
            {(selectedTypeFilter || !showTodoTasks) && (
              <div className="mt-4 backdrop-blur-xl bg-[var(--bg-secondary)]/60 border border-white/10 rounded-xl p-3 hidden lg:flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-white/40">Фильтры:</span>
                {selectedTypeFilter && (
                  <button
                    onClick={() => setSelectedTypeFilter(null)}
                    className="px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 transition-all"
                    style={{ 
                      backgroundColor: `${eventTypes.find(t => t.id === selectedTypeFilter)?.color}20`,
                      color: eventTypes.find(t => t.id === selectedTypeFilter)?.color
                    }}
                  >
                    {eventTypes.find(t => t.id === selectedTypeFilter)?.name}
                    <X className="w-3 h-3" />
                  </button>
                )}
                {!showTodoTasks && (
                  <button
                    onClick={() => setShowTodoTasks(true)}
                    className="px-2 py-1 rounded-lg text-[10px] bg-white/10 text-white/60 flex items-center gap-1 transition-all hover:bg-white/20"
                  >
                    Без TODO задач
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Боковая панель с вкладками */}
          {!isSidebarCollapsed && (
          <div className="w-full lg:w-96 hidden lg:flex flex-col">
            <div className="backdrop-blur-xl bg-[var(--bg-secondary)]/60 border border-white/10 rounded-xl flex-1 flex flex-col overflow-hidden">
              {/* Вкладки */}
              <div className="flex border-b border-white/10 flex-shrink-0">
                <button
                  onClick={() => setSidebarTab('upcoming')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    sidebarTab === 'upcoming' 
                      ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' 
                      : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                  }`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  {selectedDate ? new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : 'Ближайшие'}
                </button>
                <button
                  onClick={() => setSidebarTab('timeline')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    sidebarTab === 'timeline' 
                      ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' 
                      : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Таймлайн
                </button>
              </div>

              {/* Контент вкладки "Ближайшие события" */}
              {sidebarTab === 'upcoming' && (
                <div className="p-4 flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-sm">
                      {selectedDate 
                        ? `События на ${new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`
                        : 'Ближайшие события'
                      }
                    </h3>
                    {selectedDate && (
                      <button
                        onClick={() => openAddEvent(selectedDate)}
                        className="p-2 backdrop-blur-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-xl transition-all outline-none"
                      >
                        <Plus className="w-4 h-4 text-cyan-400" />
                      </button>
                    )}
                  </div>

                  {selectedDateEvents.length === 0 ? (
                    <div className="text-center py-8 text-white/50">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="text-sm mb-3">Нет событий</p>
                      <button
                        onClick={() => openAddEvent()}
                        className="px-4 py-2 backdrop-blur-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-400 text-sm rounded-xl transition-all outline-none font-medium"
                      >
                        <Plus className="w-4 h-4 inline mr-1" />
                        Добавить событие
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-white/10"></div>
                      <div className="space-y-3">
                        {selectedDateEvents.map((event) => {
                          const eventType = eventTypes.find(t => t.id === event.type);
                          const isTask = event.type === 'task' && event.endDate;
                          return (
                            <div key={event.id} className="relative pl-8">
                              <div 
                                className="absolute left-1.5 top-2 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)]"
                                style={{ backgroundColor: eventType?.color || '#06b6d4' }}
                              ></div>
                              <div 
                                className="p-3 rounded-xl border transition-all hover:shadow-md group backdrop-blur-xl cursor-pointer"
                                style={{ 
                                  borderColor: `${eventType?.color || '#06b6d4'}40`,
                                  backgroundColor: `${eventType?.color || '#06b6d4'}08`
                                }}
                                onClick={() => openEditEvent(event)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span 
                                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                                        style={{ 
                                          backgroundColor: `${eventType?.color || '#6366f1'}20`,
                                          color: eventType?.color || '#6366f1'
                                        }}
                                      >
                                        {eventType?.name || event.type}
                                      </span>
                                      {!selectedDate && (
                                        <span className="text-[10px] text-white/50">
                                          {new Date(event.startDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                        </span>
                                      )}
                                      {isTask && (
                                        <span className="text-[10px] text-white/50 flex items-center gap-1">
                                          ⏰ {new Date(event.endDate!).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="font-medium text-sm truncate">{event.title}</h4>
                                    {event.description && (
                                      <p className="text-xs text-white/50 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: event.description }} />
                                    )}
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 ml-2">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); copyEvent(event); }} 
                                      className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
                                      title="Копировать"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); if(confirm('Удалить?')) deleteEvent(event.id); }} 
                                      className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-all"
                                      title="Удалить"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Контент вкладки "Таймлайн" */}
              {sidebarTab === 'timeline' && (
                <div className="p-4 flex-1 overflow-y-auto">
                  {Object.keys(groupedEvents).length === 0 ? (
                    <div className="text-center py-8 text-white/50">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Нет запланированных событий</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-[7px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-white/20 via-white/10 to-transparent"></div>
                      
                      <div className="space-y-5">
                        {Object.entries(groupedEvents).map(([date, dateEvents]) => {
                          const dateObj = new Date(date);
                          const isToday = date === today;
                          const isPast = date < today;
                          
                          return (
                            <div key={date} className="relative">
                              <div className={`
                                absolute left-0 top-0 w-4 h-4 rounded-full border-2 
                                ${isToday ? 'bg-cyan-500 border-cyan-400' : isPast ? 'bg-white/30 border-white/30' : 'bg-[var(--bg-primary)] border-white/20'}
                              `}></div>
                              
                              <div className="pl-7">
                                <div className={`text-xs font-semibold mb-2 flex items-center gap-2 ${isToday ? 'text-cyan-400' : isPast ? 'text-white/50' : ''}`}>
                                  {isToday && <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
                                  {isToday ? 'Сегодня' : dateObj.toLocaleDateString('ru-RU', { 
                                    weekday: 'short', 
                                    day: 'numeric', 
                                    month: 'short' 
                                  })}
                                </div>
                                
                                <div className="space-y-2">
                                  {dateEvents.map(event => {
                                    const eventType = eventTypes.find(t => t.id === event.type);
                                    return (
                                      <div 
                                        key={event.id}
                                        onClick={() => {
                                          setSelectedDate(date);
                                          setSidebarTab('upcoming');
                                          openEditEvent(event);
                                        }}
                                        className={`
                                          p-2.5 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]
                                          ${isPast ? 'opacity-60' : ''}
                                        `}
                                        style={{ 
                                          borderColor: `${eventType?.color || '#06b6d4'}30`,
                                          borderLeftWidth: '3px',
                                          borderLeftColor: eventType?.color || '#06b6d4',
                                          backgroundColor: `${eventType?.color || '#06b6d4'}08`
                                        }}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span style={{ color: eventType?.color }}>
                                            {TYPE_ICONS[eventType?.icon || 'star'] || <Star className="w-3 h-3" />}
                                          </span>
                                          <span className="text-xs font-medium truncate flex-1">{event.title}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
      
      {/* Модал добавления/редактирования события */}
      {(showAddEvent || editingEvent) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
          <div className="bg-gradient-to-b from-[#1a1a1a] to-[#151515] border-0 sm:border border-white/10 rounded-none sm:rounded-xl w-full max-w-full sm:max-w-[95vw] xl:max-w-[1200px] shadow-2xl min-h-screen sm:min-h-0 max-h-full sm:max-h-[90vh] flex flex-col sm:my-auto">
            {/* Шапка */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-white/10 bg-white/[0.02] sm:rounded-t-xl flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-white/10">
                  <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" />
                </div>
                <h3 className="font-medium text-sm text-white">
                  {editingEvent ? 'Редактировать событие' : 'Новое событие'}
                </h3>
              </div>
              <button
                onClick={() => { setShowAddEvent(false); setEditingEvent(null); resetEventForm(); setShowDeleteConfirm(false); }}
                className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full transition-colors flex-shrink-0 flex items-center justify-center border border-white/10 backdrop-blur-sm"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
            
            {/* Две колонки - адаптивно */}
            <div className="flex flex-1 overflow-y-auto lg:overflow-hidden flex-col lg:flex-row min-h-0">
              {/* Левый блок - Название, Описание, Заметки */}
              <div className="flex-1 p-3 sm:p-4 space-y-3 overflow-y-auto border-b lg:border-b-0 lg:border-r border-white/10">
                {/* Название */}
                <div>
                  <label className="block text-[10px] font-medium text-white/50 mb-1 uppercase tracking-wide">Название</label>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[var(--bg-tertiary)] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 transition-all text-white placeholder-white/30"
                    placeholder="Введите название..."
                    autoFocus
                  />
                </div>
                
                {/* Описание - WYSIWYG редактор */}
                <div>
                  <label className="block text-[10px] font-medium text-white/50 mb-1 uppercase tracking-wide">
                    Описание
                  </label>
                  {/* Панель форматирования */}
                  <div className="flex items-center gap-1 flex-wrap p-2 bg-[var(--bg-tertiary)] border border-white/10 rounded-t-xl border-b-0">
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById('event-description-editor');
                        if (editor) {
                          document.execCommand('bold', false);
                          editor.focus();
                        }
                      }}
                      className="p-1.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                      title="Жирный"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById('event-description-editor');
                        if (editor) {
                          document.execCommand('italic', false);
                          editor.focus();
                        }
                      }}
                      className="p-1.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                      title="Курсив"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById('event-description-editor');
                        if (editor) {
                          document.execCommand('insertUnorderedList', false);
                          editor.focus();
                        }
                      }}
                      className="p-1.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                      title="Список"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById('event-description-editor');
                        if (editor) {
                          const url = prompt('Введите URL ссылки:');
                          if (url) {
                            document.execCommand('createLink', false, url);
                          }
                          editor.focus();
                        }
                      }}
                      className="p-1.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                      title="Ссылка"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div
                    ref={descriptionEditorRef}
                    id="event-description-editor"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const target = e.target as HTMLDivElement;
                      setEventForm(prev => ({ ...prev, description: target.innerHTML }));
                    }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.tagName === 'A' && target.getAttribute('href')) {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(target.getAttribute('href')!, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
                      document.execCommand('insertHTML', false, text);
                    }}
                    dangerouslySetInnerHTML={{ __html: eventForm.description }}
                    className="w-full min-h-[150px] px-3 py-2.5 bg-[var(--bg-tertiary)] border border-white/10 rounded-b-xl text-sm text-white placeholder-white/30 overflow-y-auto focus:outline-none focus:border-cyan-500/50 transition-all leading-relaxed [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_a]:text-blue-400 [&_a]:underline [&_a]:cursor-pointer [&_li]:ml-2"
                  />
                </div>
                
                {/* Заметки */}
                <div>
                  <label className="block text-[10px] font-medium text-white/50 mb-1 uppercase tracking-wide">Заметки</label>
                  <textarea
                    value={eventForm.notes}
                    onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[var(--bg-tertiary)] border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-all resize-none text-sm"
                    rows={3}
                    placeholder="Дополнительные заметки..."
                  />
                </div>
              </div>

              {/* Правый блок - Все остальное */}
              <div className="w-full lg:w-[340px] p-3 sm:p-4 space-y-3 overflow-y-auto flex-shrink-0 bg-white/[0.02]">
                {/* Тип события */}
                <div>
                  <label className="block text-[10px] font-medium text-white/50 mb-1.5 uppercase tracking-wide">Тип события</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {eventTypes.map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setEventForm({ ...eventForm, type: type.id })}
                        className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                          eventForm.type === type.id 
                            ? 'text-white ring-1' 
                            : 'bg-white/5 text-white/50 hover:text-white'
                        }`}
                        style={eventForm.type === type.id ? { 
                          backgroundColor: `${type.color}30`,
                          color: type.color,
                          boxShadow: `0 0 0 1px ${type.color}50`
                        } : {}}
                      >
                        {type.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Даты */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-white/50 mb-1 uppercase tracking-wide">Начало</label>
                    <input
                      type="date"
                      value={eventForm.startDate}
                      onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                      className="w-full px-2.5 py-2 bg-[var(--bg-tertiary)] border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500/50 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-white/50 mb-1 uppercase tracking-wide">Дедлайн</label>
                    <input
                      type="date"
                      value={eventForm.endDate}
                      onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                      className="w-full px-2.5 py-2 bg-[var(--bg-tertiary)] border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500/50 transition-all text-sm"
                    />
                  </div>
                </div>
                
                {/* Цвет линии (только для ТЗ с дедлайном) */}
                {eventForm.type === 'task' && eventForm.endDate && (
                  <div>
                    <label className="block text-[10px] font-medium text-white/50 mb-1 uppercase tracking-wide">Цвет линии</label>
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="color"
                        value={eventForm.color || eventTypes.find(t => t.id === 'task')?.color || '#8b5cf6'}
                        onChange={(e) => setEventForm({ ...eventForm, color: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer bg-transparent"
                      />
                      {['#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'].map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEventForm({ ...eventForm, color })}
                          className={`w-6 h-6 rounded-lg transition-all ${eventForm.color === color ? 'ring-2 ring-white/50 scale-110' : 'hover:scale-105'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Заказчик - дропдаун */}
                <div>
                  <label className="block text-[10px] font-medium text-white/50 mb-1 uppercase tracking-wide">Заказчик</label>
                  <div className="relative">
                    <select
                      value={eventForm.assignedById}
                      onChange={(e) => setEventForm({ ...eventForm, assignedById: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer text-sm text-white"
                    >
                      <option value="">Выбрать...</option>
                      {users.filter(u => u.role === 'customer' || u.role === 'universal').map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                  </div>
                </div>

                {/* Участники - дропдаун с мульти-выбором */}
                <div>
                  <label className="block text-[10px] font-medium text-white/50 mb-1 uppercase tracking-wide">Участники</label>
                  <div className="relative">
                    <div 
                      className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-white/10 rounded-lg cursor-pointer text-sm min-h-[38px] flex flex-wrap gap-1 items-center"
                      onClick={(e) => {
                        const dropdown = e.currentTarget.nextElementSibling;
                        if (dropdown) dropdown.classList.toggle('hidden');
                      }}
                    >
                      {eventForm.assignedToIds.length === 0 ? (
                        <span className="text-white/40">Выбрать...</span>
                      ) : (
                        eventForm.assignedToIds.map(id => {
                          const user = users.find(u => u.id === id);
                          return user ? (
                            <span 
                              key={id} 
                              className="px-2 py-0.5 rounded text-[11px] text-white flex items-center gap-1"
                              style={{ backgroundColor: user.color }}
                            >
                              {user.name}
                              <X 
                                className="w-3 h-3 cursor-pointer hover:text-white/70" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEventForm(prev => ({
                                    ...prev,
                                    assignedToIds: prev.assignedToIds.filter(i => i !== id)
                                  }));
                                }}
                              />
                            </span>
                          ) : null;
                        })
                      )}
                      <ChevronDown className="ml-auto w-4 h-4 text-white/30 flex-shrink-0" />
                    </div>
                    <div className="hidden absolute top-full left-0 right-0 mt-1 bg-[var(--bg-tertiary)] border border-white/10 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                      {users.filter(u => u.role === 'executor' || u.role === 'universal').map(user => {
                        const isSelected = eventForm.assignedToIds.includes(user.id);
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setEventForm(prev => ({
                                ...prev,
                                assignedToIds: isSelected 
                                  ? prev.assignedToIds.filter(id => id !== user.id)
                                  : [...prev.assignedToIds, user.id]
                              }));
                            }}
                            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 transition-colors ${
                              isSelected ? 'bg-white/5' : ''
                            }`}
                          >
                            <div 
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ backgroundColor: user.color }}
                            >
                              {user.name.charAt(0)}
                            </div>
                            <span className="text-white/80">{user.name}</span>
                            {isSelected && <Check className="w-4 h-4 text-green-400 ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Футер модалки */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-t border-white/10 bg-white/[0.02] safe-area-bottom">
              <div className="flex items-center gap-3">
                {editingEvent && (
                  <>
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl transition-all outline-none flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Удалить</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-400">Удалить?</span>
                        <button
                          onClick={() => deleteEvent(editingEvent.id)}
                          className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all outline-none text-xs font-medium"
                        >
                          Да
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-3 py-2 bg-white/10 hover:bg-white/15 rounded-xl transition-all outline-none text-xs"
                        >
                          Нет
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => { setShowAddEvent(false); setEditingEvent(null); resetEventForm(); setShowDeleteConfirm(false); }}
                  className="px-4 sm:px-5 py-2.5 sm:py-3 backdrop-blur-xl bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all outline-none text-sm"
                >
                  Отмена
                </button>
                <button
                  onClick={editingEvent ? updateEvent : addEvent}
                  className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl transition-all font-medium outline-none flex items-center gap-2 text-sm"
                >
                  {editingEvent ? (
                    <>
                      <Check className="w-4 h-4" />
                      Сохранить
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Добавить
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка дня - карточка ячейки */}
      {dayModalDate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#1a1a1a] to-[#151515] border border-white/10 rounded-xl w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col">
            {/* Шапка */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02] rounded-t-xl flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-white/10">
                  <span className="text-lg font-bold text-cyan-400">
                    {new Date(dayModalDate + 'T00:00:00').getDate()}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium text-white">
                    {new Date(dayModalDate + 'T00:00:00').toLocaleDateString('ru-RU', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </h3>
                  <p className="text-xs text-white/50">
                    {(() => {
                      const dayEvents = getEventsForDate(dayModalDate);
                      const deadlines = events.filter(e => e.type === 'task' && e.endDate?.split('T')[0] === dayModalDate);
                      const total = dayEvents.length + deadlines.length;
                      return `${total} ${total === 1 ? 'событие' : total < 5 ? 'события' : 'событий'}`;
                    })()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDayModalDate(null)}
                className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center border border-white/10"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
            
            {/* Контент */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Дедлайны */}
              {(() => {
                const deadlineEventsForDay = events.filter(e => 
                  e.type === 'task' && 
                  e.endDate?.split('T')[0] === dayModalDate &&
                  filterTodoTasks(e)
                );
                if (deadlineEventsForDay.length === 0) return null;
                return (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-orange-400/70 font-medium mb-2 flex items-center gap-1.5">
                      <span>⏰</span> Дедлайны ({deadlineEventsForDay.length})
                    </div>
                    <div className="space-y-2">
                      {deadlineEventsForDay.map(event => {
                        const eventType = eventTypes.find(t => t.id === event.type);
                        const blockColor = event.color || eventType?.color || '#6366f1';
                        return (
                          <div
                            key={`day-deadline-${event.id}`}
                            className="p-3 rounded-xl cursor-pointer hover:opacity-90 transition-all group"
                            style={{ backgroundColor: `${blockColor}20`, borderLeft: `3px solid ${blockColor}` }}
                            onClick={() => { setDayModalDate(null); openEditEvent(event); }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-white truncate">{event.title}</div>
                                <div className="text-xs text-white/50 mt-0.5">
                                  ТЗ от {new Date(event.startDate).toLocaleDateString('ru-RU')}
                                </div>
                              </div>
                              <Edit3 className="w-4 h-4 text-white/30 group-hover:text-white/60 flex-shrink-0" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              
              {/* ТЗ (начала) */}
              {(() => {
                const taskEventsForDay = getEventsForDate(dayModalDate).filter(e => 
                  e.type === 'task' && e.startDate.split('T')[0] === dayModalDate
                );
                if (taskEventsForDay.length === 0) return null;
                return (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-purple-400/70 font-medium mb-2 flex items-center gap-1.5">
                      <span>📋</span> Технические задания ({taskEventsForDay.length})
                    </div>
                    <div className="space-y-2">
                      {taskEventsForDay.map(event => {
                        const eventType = eventTypes.find(t => t.id === event.type);
                        const blockColor = event.color || eventType?.color || '#8b5cf6';
                        return (
                          <div
                            key={`day-task-${event.id}`}
                            className="p-3 rounded-xl cursor-pointer hover:opacity-90 transition-all group"
                            style={{ backgroundColor: `${blockColor}20`, borderLeft: `3px solid ${blockColor}` }}
                            onClick={() => { setDayModalDate(null); openEditEvent(event); }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-white truncate">{event.title}</div>
                                {event.endDate && (
                                  <div className="text-xs text-white/50 mt-0.5">
                                    Дедлайн: {new Date(event.endDate).toLocaleDateString('ru-RU')}
                                  </div>
                                )}
                              </div>
                              <Edit3 className="w-4 h-4 text-white/30 group-hover:text-white/60 flex-shrink-0" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              
              {/* Обычные события */}
              {(() => {
                const regularEventsForDay = getEventsForDate(dayModalDate).filter(e => e.type !== 'task');
                if (regularEventsForDay.length === 0) return null;
                return (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-cyan-400/70 font-medium mb-2 flex items-center gap-1.5">
                      <CalendarIcon className="w-3 h-3" /> События ({regularEventsForDay.length})
                    </div>
                    <div className="space-y-2">
                      {regularEventsForDay.map(event => {
                        const eventType = eventTypes.find(t => t.id === event.type);
                        const blockColor = event.color || eventType?.color || '#6366f1';
                        return (
                          <div
                            key={`day-event-${event.id}`}
                            className="p-3 rounded-xl cursor-pointer hover:opacity-90 transition-all group"
                            style={{ backgroundColor: `${blockColor}20`, borderLeft: `3px solid ${blockColor}` }}
                            onClick={() => { setDayModalDate(null); openEditEvent(event); }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: blockColor, color: '#fff' }}>
                                    {eventType?.name || 'Событие'}
                                  </span>
                                </div>
                                <div className="font-medium text-sm text-white truncate mt-1">{event.title}</div>
                                {event.description && (
                                  <div className="text-xs text-white/50 mt-0.5 line-clamp-2" dangerouslySetInnerHTML={{ __html: event.description }} />
                                )}
                              </div>
                              <Edit3 className="w-4 h-4 text-white/30 group-hover:text-white/60 flex-shrink-0" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              
              {/* Пусто */}
              {(() => {
                const dayEvents = getEventsForDate(dayModalDate);
                const deadlines = events.filter(e => e.type === 'task' && e.endDate?.split('T')[0] === dayModalDate);
                if (dayEvents.length === 0 && deadlines.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <CalendarIcon className="w-12 h-12 text-white/10 mx-auto mb-3" />
                      <p className="text-white/40 text-sm">Нет событий на этот день</p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            
            {/* Футер */}
            <div className="flex items-center justify-between p-4 border-t border-white/10 bg-white/[0.02] rounded-b-xl">
              <button
                onClick={() => setDayModalDate(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-sm"
              >
                Закрыть
              </button>
              <button
                onClick={() => { setDayModalDate(null); openAddEvent(dayModalDate); }}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl transition-all font-medium flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Добавить событие
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модал добавления типа */}
      {showAddType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-[var(--bg-tertiary)]/80 border border-white/10 rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="font-semibold">Новый тип события</h3>
              <button
                onClick={() => setShowAddType(false)}
                className="p-1 hover:bg-white/5 rounded outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Название</label>
                <input
                  type="text"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="w-full px-3 py-2 backdrop-blur-xl bg-[var(--bg-tertiary)]/60 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-all"
                  placeholder="Название типа"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Цвет</label>
                <div className="flex gap-2">
                  {['#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#06b6d4'].map(color => (
                    <button
                      key={color}
                      onClick={() => setTypeForm({ ...typeForm, color })}
                      className={`w-8 h-8 rounded-full transition-transform outline-none ${typeForm.color === color ? 'scale-110 ring-2 ring-offset-2 ring-white' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Иконка</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(TYPE_ICONS).map(([key, icon]) => (
                    <button
                      key={key}
                      onClick={() => setTypeForm({ ...typeForm, icon: key })}
                      className={`p-2 rounded-lg transition-colors outline-none ${typeForm.icon === key ? 'bg-white/20 text-white' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 p-4 border-t border-white/10">
              <button
                onClick={() => setShowAddType(false)}
                className="px-4 py-2 backdrop-blur-xl bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all outline-none"
              >
                Отмена
              </button>
              <button
                onClick={addType}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl transition-all font-medium outline-none"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
