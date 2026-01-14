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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState<Person[]>([]);
  const [myAccountId, setMyAccountId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipantFilter, setShowParticipantFilter] = useState(false);
  const [participantFilter, setParticipantFilter] = useState<string>('all');
  const [upcomingEventsExpanded, setUpcomingEventsExpanded] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
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
    try {
      const res = await fetch('/api/events');
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
  }, []);

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
      {/* Header with backdrop blur */}
      <div className="backdrop-blur-xl bg-[var(--bg-secondary)]/60 border-b border-white/10 px-4 pt-3 pb-2 sticky top-0 z-10">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 sm:px-4 py-2 rounded-t-xl text-xs sm:text-sm font-medium transition-all ${
              viewMode === 'calendar' 
                ? 'bg-[var(--bg-primary)] text-cyan-400 border-t border-l border-r border-cyan-500/30' 
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <LayoutGrid className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              <span className="hidden sm:inline">Календарь</span>
            </div>
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 sm:px-4 py-2 rounded-t-xl text-xs sm:text-sm font-medium transition-all ${
              viewMode === 'timeline' 
                ? 'bg-[var(--bg-primary)] text-cyan-400 border-t border-l border-r border-cyan-500/30' 
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <List className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              <span className="hidden sm:inline">Таймлайн</span>
            </div>
          </button>
        </div>
      </div>

      {/* Header */}
      <header className="backdrop-blur-xl bg-[var(--bg-secondary)]/60 border-b border-white/10 flex items-center px-3 sm:px-4 py-3 flex-shrink-0">
        <Link
          href="/"
          className="flex items-center justify-center w-9 h-9 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all mr-3"
          title="На главную"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
        </Link>
        
        <div className="flex items-center gap-2 mr-4">
          <CalendarDays className="w-5 h-5 text-cyan-400" />
          <span className="font-semibold text-base">Календарь событий</span>
        </div>

        {/* Search */}
        <div className="relative mr-2 sm:mr-3 flex-1 sm:flex-initial">
          <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 sm:w-4 h-3.5 sm:h-4 text-white/40" />
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 sm:pl-9 pr-3 py-2 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl w-full sm:w-48 text-xs sm:text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
          />
        </div>

        {/* Participant Filter */}
        <div className="relative mr-2 sm:mr-3 hidden sm:block" ref={participantFilterRef}>
          <button
            onClick={() => setShowParticipantFilter(!showParticipantFilter)}
            className={`px-2 sm:px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 sm:gap-2 border ${
              participantFilter !== 'all'
                ? 'backdrop-blur-xl bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                : 'backdrop-blur-xl bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {participantFilter === 'all' 
              ? 'Участник' 
              : users.find(u => u.id === participantFilter)?.name || 'Участник'}
            <ChevronDown className={`w-3 h-3 transition-transform ${ showParticipantFilter ? 'rotate-180' : ''}`} />
          </button>
          
          {showParticipantFilter && (
            <div className="absolute left-0 top-full mt-1 w-56 backdrop-blur-xl bg-[var(--bg-tertiary)]/80 border border-white/10 rounded-xl shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
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
          {/* Inbox Button */}
          <div className="relative">
            <button
              onClick={() => setShowInbox(!showInbox)}
              title="Почтовый ящик"
              className="p-2 backdrop-blur-xl bg-white/5 hover:bg-white/10 rounded-xl text-xs transition-all flex items-center border border-white/10 relative"
            >
              {unreadCount > 0 ? <BellRing className="w-4 h-4 text-orange-400" /> : <Bell className="w-4 h-4" />}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Inbox Dropdown */}
            {showInbox && (
              <div className="absolute right-0 top-full mt-1 w-80 sm:w-96 backdrop-blur-xl bg-[var(--bg-tertiary)]/80 border border-white/10 rounded-xl shadow-2xl z-50 max-h-[400px] sm:max-h-[450px] flex flex-col">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium">Уведомления</span>
                  </div>
                  {inboxTab === 'new' && unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Прочитать все
                    </button>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                  <button
                    onClick={() => setInboxTab('new')}
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-all ${
                      inboxTab === 'new' 
                        ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' 
                        : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                    }`}
                  >
                    Новые {unreadCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full text-[10px]">{unreadCount}</span>}
                  </button>
                  <button
                    onClick={() => setInboxTab('history')}
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-all ${
                      inboxTab === 'history' 
                        ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' 
                        : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                    }`}
                  >
                    История
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {(() => {
                    const filteredNotifs = inboxTab === 'new' 
                      ? myNotifications.filter(n => !n.read)
                      : myNotifications.filter(n => n.read);
                    
                    if (filteredNotifs.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-8 text-white/30">
                          <Bell className="w-8 h-8 mb-2 opacity-50" />
                          <p className="text-xs">{inboxTab === 'new' ? 'Нет новых уведомлений' : 'История пуста'}</p>
                        </div>
                      );
                    }
                    
                    return filteredNotifs.slice(0, 30).map(notif => {
                      const isEventNotification = notif.type?.startsWith('event_');
                      return (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markNotificationRead(notif.id);
                            setShowInbox(false);
                            if (isEventNotification && notif.eventId) {
                              const event = events.find(e => e.id === notif.eventId);
                              if (event) openEditEvent(event);
                            }
                          }}
                          className={`px-3 py-2.5 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${
                            !notif.read ? 'bg-blue-500/5' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                              notif.type === 'new_task' ? 'bg-green-500/20 text-green-400' :
                              notif.type === 'mention' ? 'bg-purple-500/20 text-purple-400' :
                              notif.type === 'comment' ? 'bg-blue-500/20 text-blue-400' :
                              notif.type === 'event_invite' ? 'bg-pink-500/20 text-pink-400' :
                              notif.type === 'event_update' ? 'bg-cyan-500/20 text-cyan-400' :
                              notif.type === 'event_reminder' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-orange-500/20 text-orange-400'
                            }`}>
                              {notif.type === 'new_task' && <Plus className="w-3 h-3" />}
                              {notif.type === 'mention' && <AtSign className="w-3 h-3" />}
                              {notif.type === 'comment' && <MessageCircle className="w-3 h-3" />}
                              {notif.type === 'assignment' && <User className="w-3 h-3" />}
                              {notif.type === 'status_change' && <Flag className="w-3 h-3" />}
                              {notif.type === 'event_invite' && <CalendarIcon className="w-3 h-3" />}
                              {notif.type === 'event_update' && <CalendarIcon className="w-3 h-3" />}
                              {notif.type === 'event_reminder' && <Bell className="w-3 h-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white/90 line-clamp-1">{notif.message}</p>
                              <p className="text-[10px] text-white/40 truncate mt-0.5">
                                {isEventNotification ? notif.eventTitle : notif.todoTitle}
                              </p>
                              <p className="text-[9px] text-white/30 mt-1">
                                {new Date(notif.createdAt).toLocaleString('ru-RU', { 
                                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                                })}
                              </p>
                            </div>
                            {!notif.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => openAddEvent()}
            className="px-3 py-2 backdrop-blur-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 rounded-xl flex items-center gap-1.5 transition-all text-xs outline-none font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Добавить
          </button>

          {/* Tools Menu */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 backdrop-blur-xl bg-white/5 hover:bg-white/10 rounded-xl text-xs transition-all flex items-center border border-white/10"
              title="Инструменты"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            {showSettings && (
              <div className="absolute right-0 top-full mt-1 w-56 backdrop-blur-xl bg-[var(--bg-tertiary)]/80 border border-white/10 rounded-xl shadow-2xl z-50 py-1">
                <label className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer text-white/70 hover:bg-white/10 hover:text-white transition-all rounded-lg mx-1">
                  <input
                    type="checkbox"
                    checked={showTodoTasks}
                    onChange={(e) => setShowTodoTasks(e.target.checked)}
                    className="rounded w-3.5 h-3.5"
                  />
                  <span>Показывать задачи из TODO</span>
                </label>
                <button
                  onClick={() => { setShowAddType(true); setShowSettings(false); }}
                  className="w-full px-3 py-2 text-xs text-left flex items-center gap-2 text-white/70 hover:text-white hover:bg-white/10 transition-all rounded-lg mx-1"
                >
                  <Tag className="w-3.5 h-3.5" />
                  Типы событий
                  <span className="ml-auto text-[10px] text-white/40">{eventTypes.length}</span>
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
      </header>

      <div className="flex-1 overflow-auto px-2 sm:px-4 py-2 sm:py-4">
        {viewMode === 'calendar' ? (
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-6 relative">
          {/* Календарь */}
          <div className={`transition-all duration-300 w-full ${isSidebarCollapsed ? 'lg:flex-1 lg:max-w-4xl lg:mx-auto' : 'lg:flex-1'}`}>
            <div className="backdrop-blur-xl bg-[var(--bg-secondary)]/60 border border-white/10 rounded-xl p-2 sm:p-4">
              {/* Навигация */}
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <button
                  onClick={goToPreviousMonth}
                  className="p-1.5 sm:p-2 backdrop-blur-xl bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all outline-none"
                >
                  <ChevronLeft className="w-4 sm:w-5 h-4 sm:h-5" />
                </button>
                <div className="flex items-center gap-2 sm:gap-3">
                  <h2 className="text-base sm:text-lg font-semibold">
                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <button
                    onClick={goToToday}
                    className="px-2 sm:px-3 py-1 text-xs backdrop-blur-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full transition-all outline-none"
                  >
                    Сегодня
                  </button>
                </div>
                <button
                  onClick={goToNextMonth}
                  className="p-1.5 sm:p-2 backdrop-blur-xl bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all outline-none"
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
                      i === 5 || i === 6 ? 'text-white/30' : 'text-white/50'
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
                  
                  // Отфильтруем обычные события
                  const regularEvents = dayEvents.filter(e => {
                    // Если это ТЗ с дедлайном, показываем только на дате начала
                    if (e.type === 'task' && e.endDate) {
                      return e.startDate.split('T')[0] === dateStr;
                    }
                    return true;
                  });
                  
                  // Добавляем дедлайны ТЗ на их даты (с учётом фильтров)
                  const deadlineEvents = events.filter(e => 
                    e.type === 'task' && 
                    e.endDate && 
                    e.endDate.split('T')[0] === dateStr &&
                    filterTodoTasks(e) &&
                    (!selectedTypeFilter || e.type === selectedTypeFilter)
                  );
                  
                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`
                        group min-h-[60px] sm:min-h-[80px] lg:min-h-[90px] p-1 sm:p-1.5 rounded-xl cursor-pointer transition-all border relative outline-none
                        ${isCurrentMonth 
                          ? isWeekend ? 'backdrop-blur-xl bg-[var(--bg-tertiary)]/40' : 'backdrop-blur-xl bg-[var(--bg-tertiary)]/60' 
                          : 'backdrop-blur-xl bg-[var(--bg-tertiary)]/20 opacity-40'
                        }
                        ${isToday ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-white/5'}
                        ${isSelected ? 'ring-2 ring-cyan-500/50 ring-offset-1 ring-offset-transparent' : ''}
                        hover:bg-white/5 hover:border-white/10
                      `}
                    >
                      <div className={`text-[10px] sm:text-xs font-medium mb-1 flex items-center justify-between ${
                        isToday ? 'text-cyan-400' : isWeekend && isCurrentMonth ? 'text-white/40' : ''
                      }`}>
                        <span className={isToday ? 'bg-cyan-500 text-white w-4 sm:w-5 h-4 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold' : ''}>
                          {date.getDate()}
                        </span>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          {dayEvents.length > 0 && !isToday && (
                            <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-cyan-400/60"></span>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); openAddEvent(dateStr); }}
                            className="w-3.5 sm:w-4 h-3.5 sm:h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
                            title="Добавить событие"
                          >
                            <Plus className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                          </button>
                        </div>
                      </div>
                      {/* События - разные представления для мобильных и десктопа */}
                      <div className="space-y-0.5">
                        {/* Мобильная версия - цветные точки */}
                        <div className="flex flex-wrap gap-0.5 sm:hidden">
                          {deadlineEvents.slice(0, 3).map(event => {
                            const eventType = eventTypes.find(t => t.id === event.type);
                            return (
                              <div
                                key={`deadline-mobile-${event.id}`}
                                className="w-2 h-2 rounded-full cursor-pointer ring-1 ring-white/30"
                                style={{ backgroundColor: eventType?.color || '#6366f1' }}
                                title={`⏰ ${event.title}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditEvent(event);
                                }}
                              />
                            );
                          })}
                          {regularEvents.slice(0, 3).map(event => {
                            const eventType = eventTypes.find(t => t.id === event.type);
                            return (
                              <div
                                key={`mobile-${event.id}`}
                                className="w-2 h-2 rounded-full cursor-pointer"
                                style={{ backgroundColor: eventType?.color || '#6366f1' }}
                                title={event.title}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditEvent(event);
                                }}
                              />
                            );
                          })}
                          {(deadlineEvents.length + regularEvents.length) > 6 && (
                            <div className="w-2 h-2 rounded-full bg-white/30 flex items-center justify-center text-[6px]">
                              +
                            </div>
                          )}
                        </div>
                        
                        {/* Десктопная версия - полные блоки с текстом */}
                        <div className="hidden sm:block space-y-0.5">
                          {/* Дедлайны ТЗ - первые */}
                          {deadlineEvents.map(event => {
                            const eventType = eventTypes.find(t => t.id === event.type);
                            return (
                              <div
                                key={`deadline-${event.id}`}
                                className="text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 relative z-10"
                                style={{ 
                                  backgroundColor: eventType?.color || '#6366f1',
                                  color: '#fff'
                                }}
                                title={`Дедлайн: ${event.title}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditEvent(event);
                                }}
                              >
                                ⏰ {event.title}
                              </div>
                            );
                          })}
                          {/* Обычные события (не ТЗ) - в середине */}
                          {regularEvents.filter(e => e.type !== 'task').slice(0, 2).map(event => {
                            const eventType = eventTypes.find(t => t.id === event.type);
                            return (
                              <div
                                key={event.id}
                                className="text-[10px] px-1 py-0.5 rounded truncate relative z-10"
                                style={{ 
                                  backgroundColor: eventType?.color || '#6366f1',
                                  color: '#fff'
                                }}
                                title={event.title}
                              >
                                {event.title}
                              </div>
                            );
                          })}
                          {/* ТЗ - последние */}
                          {regularEvents.filter(e => e.type === 'task').map(event => {
                            const eventType = eventTypes.find(t => t.id === event.type);
                            return (
                              <div
                                key={event.id}
                                className="text-[10px] px-1 py-0.5 rounded truncate relative z-10"
                                style={{ 
                                  backgroundColor: eventType?.color || '#6366f1',
                                  color: '#fff'
                                }}
                                title={event.title}
                              >
                                {event.title}
                              </div>
                            );
                          })}
                        </div>
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
                  
                  const lineColor = taskType?.color || '#8b5cf6';
                  
                  // Константы для расчёта позиций - линия идёт ровно между ячейками
                  const rowHeight = 94; // 90px min-h + 4px gap
                  const cellWidthPercent = 100 / 7;
                  const gapBetweenCells = 4; // gap-1 = 4px
                  
                  // Позиции между ячейками (не в центре, а по границе)
                  // Правая граница стартовой ячейки = (startCol + 1) * cellWidth
                  // Левая граница конечной ячейки = endCol * cellWidth
                  const startRightEdge = (startCol + 1) * cellWidthPercent;
                  const endLeftEdge = endCol * cellWidthPercent;
                  
                  // Y координаты - ровно между рядами
                  const rowBottomY = (startRow + 1) * rowHeight - gapBetweenCells / 2;
                  const nextRowTopY = endRow * rowHeight + gapBetweenCells / 2;
                  
                  // Вертикальные выходы из блоков - от нижней границы ячейки
                  const startCellBottomY = (startRow + 1) * rowHeight - gapBetweenCells;
                  const endCellTopY = endRow * rowHeight + 20; // отступ от верха для числа
                  
                  // Горизонтальный центр ячеек
                  const startCenterX = (startCol + 0.5) * cellWidthPercent;
                  const endCenterX = (endCol + 0.5) * cellWidthPercent;
                  
                  const elements: React.ReactNode[] = [];
                  let lineIndex = 0;
                  
                  if (startRow === endRow) {
                    // Одна строка - горизонтальная линия ровно между рядами (под ячейками)
                    // 1. Вниз из центра начальной ячейки до нижнего края
                    elements.push(
                      <div
                        key={`${task.id}-line-${lineIndex++}`}
                        className="absolute pointer-events-none"
                        style={{
                          left: `${startCenterX}%`,
                          top: `${startCellBottomY}px`,
                          width: '2px',
                          height: `${gapBetweenCells}px`,
                          backgroundColor: lineColor,
                          opacity: 0.6,
                          transform: 'translateX(-50%)'
                        }}
                      />
                    );
                    // 2. Горизонтальная линия ровно между рядами
                    elements.push(
                      <div
                        key={`${task.id}-line-${lineIndex++}`}
                        className="absolute pointer-events-none"
                        style={{
                          left: `${Math.min(startCenterX, endCenterX)}%`,
                          width: `${Math.abs(endCenterX - startCenterX)}%`,
                          top: `${rowBottomY}px`,
                          height: '2px',
                          backgroundColor: lineColor,
                          opacity: 0.6
                        }}
                      />
                    );
                    // 3. Вверх к дедлайну
                    elements.push(
                      <div
                        key={`${task.id}-line-${lineIndex++}`}
                        className="absolute pointer-events-none"
                        style={{
                          left: `${endCenterX}%`,
                          top: `${endCellTopY}px`,
                          width: '2px',
                          height: `${rowBottomY - endCellTopY}px`,
                          backgroundColor: lineColor,
                          opacity: 0.6,
                          transform: 'translateX(-50%)'
                        }}
                      />
                    );
                  } else {
                    // Разные строки - путь по правому краю между ячейками
                    // 1. Вниз из центра ТЗ до нижней границы между рядами
                    elements.push(
                      <div
                        key={`${task.id}-line-${lineIndex++}`}
                        className="absolute pointer-events-none"
                        style={{
                          left: `${startCenterX}%`,
                          top: `${startCellBottomY}px`,
                          width: '2px',
                          height: `${rowBottomY - startCellBottomY}px`,
                          backgroundColor: lineColor,
                          opacity: 0.6,
                          transform: 'translateX(-50%)'
                        }}
                      />
                    );
                    // 2. Вправо по нижнему краю строки
                    elements.push(
                      <div
                        key={`${task.id}-line-${lineIndex++}`}
                        className="absolute pointer-events-none"
                        style={{
                          left: `${startCenterX}%`,
                          width: `calc(100% - ${startCenterX}%)`,
                          top: `${rowBottomY}px`,
                          height: '2px',
                          backgroundColor: lineColor,
                          opacity: 0.6
                        }}
                      />
                    );
                    // 3. Вниз по правому краю между рядами
                    elements.push(
                      <div
                        key={`${task.id}-line-${lineIndex++}`}
                        className="absolute pointer-events-none"
                        style={{
                          right: '0px',
                          top: `${rowBottomY}px`,
                          width: '2px',
                          height: `${nextRowTopY - rowBottomY}px`,
                          backgroundColor: lineColor,
                          opacity: 0.6
                        }}
                      />
                    );
                    // 4. Влево по верхнему краю целевой строки к дедлайну
                    elements.push(
                      <div
                        key={`${task.id}-line-${lineIndex++}`}
                        className="absolute pointer-events-none"
                        style={{
                          left: `${endCenterX}%`,
                          width: `calc(100% - ${endCenterX}%)`,
                          top: `${nextRowTopY}px`,
                          height: '2px',
                          backgroundColor: lineColor,
                          opacity: 0.6
                        }}
                      />
                    );
                    // 5. Вниз к дедлайну
                    elements.push(
                      <div
                        key={`${task.id}-line-${lineIndex++}`}
                        className="absolute pointer-events-none"
                        style={{
                          left: `${endCenterX}%`,
                          top: `${nextRowTopY}px`,
                          width: '2px',
                          height: `${endCellTopY - nextRowTopY}px`,
                          backgroundColor: lineColor,
                          opacity: 0.6,
                          transform: 'translateX(-50%)'
                        }}
                      />
                    );
                  }
                  
                  return elements;
                })}
              </div>
            </div>

            {/* Переключатель задач из списка дел */}
            <div className="mt-4 backdrop-blur-xl bg-[var(--bg-secondary)]/60 border border-white/10 rounded-xl p-4 hidden lg:block">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm">Задачи из списка дел</span>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showTodoTasks}
                    onChange={(e) => setShowTodoTasks(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </div>
              </label>
              <p className="text-[10px] text-white/40 mt-2">Показывать задачи, добавленные из раздела «Задачи»</p>
            </div>

            {/* Фильтры по типу */}
            <div className="mt-4 backdrop-blur-xl bg-[var(--bg-secondary)]/60 border border-white/10 rounded-xl p-4 hidden lg:block">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Фильтр по типу</h3>
                <button
                  onClick={() => setShowAddType(true)}
                  className="text-xs px-2 py-1 backdrop-blur-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl transition-all flex items-center gap-1 outline-none"
                >
                  <Plus className="w-3 h-3" />
                  Добавить тип
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTypeFilter(null)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all outline-none ${
                    selectedTypeFilter === null 
                      ? 'backdrop-blur-xl bg-cyan-500/20 text-cyan-400 font-medium border border-cyan-500/30' 
                      : 'backdrop-blur-xl bg-white/5 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  Все события
                </button>
                {eventTypes.map(type => {
                  const isDefaultType = ['meeting', 'deadline', 'task', 'reminder'].includes(type.id);
                  return (
                    <div key={type.id} className="relative group">
                      <button
                        onClick={() => setSelectedTypeFilter(type.id === selectedTypeFilter ? null : type.id)}
                        className={`px-3 py-1.5 rounded-full text-xs transition-colors flex items-center gap-1.5 outline-none ${
                          selectedTypeFilter === type.id 
                            ? 'text-white' 
                            : 'hover:opacity-80'
                        }`}
                        style={{ 
                          backgroundColor: selectedTypeFilter === type.id ? type.color : `${type.color}20`,
                          color: selectedTypeFilter === type.id ? 'white' : type.color
                        }}
                      >
                        {TYPE_ICONS[type.icon] || <Star className="w-3 h-3" />}
                        {type.name}
                      </button>
                      {!isDefaultType && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteType(type.id);
                          }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity outline-none"
                          title="Удалить тип"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
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
        ) : viewMode === 'timeline' ? (
          /* Вид таймлайна на всю ширину */
          <div className="max-w-4xl mx-auto">
          {/* Фильтры по типу */}
          <div className="mb-6 backdrop-blur-xl bg-[var(--bg-secondary)]/60 border border-white/10 rounded-xl p-4">
            <h3 className="text-sm font-medium mb-3">Фильтр по типу</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTypeFilter(null)}
                className={`px-3 py-1.5 rounded-full text-xs transition-all outline-none ${
                  selectedTypeFilter === null 
                    ? 'backdrop-blur-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                    : 'backdrop-blur-xl bg-white/5 hover:bg-white/10 border border-white/10'
                }`}
              >
                Все события
              </button>
              {eventTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedTypeFilter(type.id === selectedTypeFilter ? null : type.id)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-colors flex items-center gap-1.5 outline-none ${
                    selectedTypeFilter === type.id 
                      ? 'text-white' 
                      : 'hover:opacity-80'
                  }`}
                  style={{ 
                    backgroundColor: selectedTypeFilter === type.id ? type.color : `${type.color}20`,
                    color: selectedTypeFilter === type.id ? 'white' : type.color
                  }}
                >
                  {TYPE_ICONS[type.icon] || <Star className="w-3 h-3" />}
                  {type.name}
                </button>
              ))}
            </div>
          </div>

          {/* Полный вертикальный таймлайн */}
          <div className="backdrop-blur-xl bg-[var(--bg-secondary)]/60 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                Все события
              </h3>
              <span className="text-sm text-white/50">
                {allTimelineEvents.length} событий
              </span>
            </div>
            
            {Object.keys(groupedEvents).length === 0 ? (
              <div className="text-center py-16 text-white/50">
                <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg mb-2">Нет запланированных событий</p>
                <p className="text-sm">Создайте первое событие, чтобы начать</p>
                <button
                  onClick={() => openAddEvent()}
                  className="mt-4 px-4 py-2 backdrop-blur-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-400 rounded-xl transition-all font-medium outline-none"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Добавить событие
                </button>
              </div>
            ) : (
              <div className="relative">
                {/* Вертикальная линия таймлайна */}
                <div className="absolute left-[11px] top-0 bottom-0 w-[3px] bg-gradient-to-b from-white/20 via-white/10 to-transparent rounded-full"></div>
                
                <div className="space-y-8">
                  {Object.entries(groupedEvents).map(([date, dateEvents]) => {
                    const dateObj = new Date(date);
                    const isToday = date === today;
                    const isPast = date < today;
                    
                    return (
                      <div key={date} className="relative">
                        {/* Маркер даты на таймлайне */}
                        <div className={`
                          absolute left-0 top-0 w-6 h-6 rounded-full border-3 flex items-center justify-center
                          ${isToday 
                            ? 'bg-white/20 border-white/20 shadow-lg shadow-white/10' 
                            : isPast 
                              ? 'bg-white/30 border-white/30' 
                              : 'backdrop-blur-xl bg-[var(--bg-primary)] border-white/20 border-2'
                          }
                        `}>
                          {isToday && <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>}
                        </div>
                        
                        <div className="pl-10">
                          {/* Заголовок даты */}
                          <div className={`text-sm font-bold mb-3 ${isToday ? 'text-white' : isPast ? 'text-white/50' : ''}`}>
                            {isToday ? 'Сегодня' : dateObj.toLocaleDateString('ru-RU', { 
                              weekday: 'long', 
                              day: 'numeric', 
                              month: 'long',
                              year: dateObj.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                            })}
                          </div>
                          
                          {/* События этой даты */}
                          <div className="space-y-3">
                            {dateEvents.map(event => {
                              const eventType = eventTypes.find(t => t.id === event.type);
                              const isTask = event.type === 'task' && event.endDate;
                              return (
                                <div 
                                  key={event.id}
                                  className={`
                                    p-4 rounded-xl border cursor-pointer transition-all hover:shadow-lg group backdrop-blur-xl
                                    ${isPast ? 'opacity-70' : ''}
                                  `}
                                  style={{ 
                                    borderColor: `${eventType?.color || '#06b6d4'}40`,
                                    borderLeftWidth: '4px',
                                    borderLeftColor: eventType?.color || '#06b6d4',
                                    backgroundColor: `${eventType?.color || '#06b6d4'}08`
                                  }}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span 
                                          className="p-1.5 rounded-lg"
                                          style={{ backgroundColor: `${eventType?.color || '#6366f1'}20`, color: eventType?.color }}
                                        >
                                          {TYPE_ICONS[eventType?.icon || 'star'] || <Star className="w-4 h-4" />}
                                        </span>
                                        <span 
                                          className="px-2 py-0.5 rounded text-xs font-medium"
                                          style={{ 
                                            backgroundColor: `${eventType?.color || '#6366f1'}20`,
                                            color: eventType?.color || '#6366f1'
                                          }}
                                        >
                                          {eventType?.name || event.type}
                                        </span>
                                        {isTask && (
                                          <span className="text-xs text-white/50 flex items-center gap-1 ml-auto">
                                            ⏰ дедлайн: {new Date(event.endDate!).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                          </span>
                                        )}
                                      </div>
                                      <h4 className="font-semibold text-base mb-1">{event.title}</h4>
                                      {event.description && (
                                        <p className="text-sm text-white/50 line-clamp-2 mb-2">
                                          {event.description}
                                        </p>
                                      )}
                                      {event.notes && (
                                        <p className="text-xs text-white/50 italic">
                                          {event.notes}
                                        </p>
                                      )}
                                      {/* Автор и участники */}
                                      <div className="flex items-center gap-4 mt-2 pt-2 border-t border-white/5 flex-wrap">
                                        {event.createdBy && users.find(u => u.id === event.createdBy) && (
                                          <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                                            <span>Автор:</span>
                                            <div
                                              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                                              style={{ backgroundColor: users.find(u => u.id === event.createdBy)?.color }}
                                              title={users.find(u => u.id === event.createdBy)?.name}
                                            >
                                              {users.find(u => u.id === event.createdBy)?.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-white/60">{users.find(u => u.id === event.createdBy)?.name}</span>
                                          </div>
                                        )}
                                        {event.participants && event.participants.length > 0 && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-white/40">Участники:</span>
                                            <div className="flex -space-x-1.5">
                                              {event.participants.slice(0, 5).map(participantId => {
                                                const user = users.find(u => u.id === participantId);
                                                if (!user) return null;
                                                return (
                                                  <div
                                                    key={participantId}
                                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-[#1a1a1a]"
                                                    style={{ backgroundColor: user.color }}
                                                    title={user.name}
                                                  >
                                                    {user.name.charAt(0).toUpperCase()}
                                                  </div>
                                                );
                                              })}
                                              {event.participants.length > 5 && (
                                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[9px] border-2 border-[#1a1a1a]">
                                                  +{event.participants.length - 5}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 ml-4">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); copyEvent(event); }} 
                                        className="p-2 hover:bg-white/5 rounded-lg transition-all duration-200 hover:scale-110 outline-none"
                                        title="Копировать"
                                      >
                                        <Copy className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); openEditEvent(event); }} 
                                        className="p-2 hover:bg-white/5 rounded-lg transition-all duration-200 hover:scale-110 outline-none"
                                        title="Редактировать"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); if(confirm('Удалить событие?')) deleteEvent(event.id); }} 
                                        className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-all duration-200 hover:scale-110 outline-none"
                                        title="Удалить"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
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
        </div>
        ) : null
        }
      </div>
      
      {/* Модал добавления/редактирования события */}
      {(showAddEvent || editingEvent) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center z-50">
          <div className="backdrop-blur-2xl bg-[var(--bg-tertiary)]/95 sm:bg-[var(--bg-tertiary)]/80 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-[95vw] xl:max-w-[1200px] shadow-2xl h-[95vh] sm:h-[90vh] flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
            {/* Шапка с индикатором для мобильных */}
            <div className="flex flex-col items-center pt-2 sm:pt-0">
              {/* Индикатор перетаскивания для мобильных */}
              <div className="w-12 h-1 bg-white/20 rounded-full mb-2 sm:hidden"></div>
              <div className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-2.5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/20">
                    <CalendarIcon className="w-5 h-5 sm:w-4 sm:h-4 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-sm">
                      {editingEvent ? 'Редактировать' : 'Новое событие'}
                    </h3>
                    <p className="text-xs text-white/50 hidden sm:block">Заполните информацию о событии</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowAddEvent(false); setEditingEvent(null); resetEventForm(); }}
                  className="p-2.5 sm:p-1.5 hover:bg-white/10 rounded-xl transition-all outline-none"
                >
                  <X className="w-5 h-5 sm:w-4 sm:h-4 text-white/60" />
                </button>
              </div>
            </div>
            
            {/* Контент - адаптивно */}
            <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
              {/* Левый блок - основные поля */}
              <div className="w-full lg:w-[380px] p-4 space-y-4 border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto flex-shrink-0">
                {/* Название */}
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wide">Название</label>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full px-4 py-3.5 sm:py-2.5 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl text-base sm:text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all text-white placeholder-white/30"
                    placeholder="Введите название события..."
                    autoFocus
                  />
                </div>
                
                {/* Тип */}
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wide">Тип события</label>
                  <select
                    value={eventForm.type}
                    onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                    className="w-full px-4 py-3.5 sm:py-2.5 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer text-base sm:text-sm"
                  >
                    {eventTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Даты */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wide">Дата начала</label>
                    <input
                      type="date"
                      value={eventForm.startDate}
                      onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                      className="w-full px-3 py-3.5 sm:py-2.5 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wide">Дата окончания</label>
                    <input
                      type="date"
                      value={eventForm.endDate}
                      onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                      className="w-full px-3 py-3.5 sm:py-2.5 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Средний блок - контент */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {/* Участники */}
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wide flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Участники
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl min-h-[60px]">
                  {users.length === 0 ? (
                    <span className="text-white/30 text-sm">Нет доступных пользователей</span>
                  ) : (
                    users.map(user => {
                      const isSelected = eventForm.participants.includes(user.id);
                      return (
                        <button
                          key={user.id}
                          onClick={() => toggleParticipant(user.id)}
                          className={`px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-all outline-none ${
                            isSelected 
                              ? 'text-white shadow-lg' 
                              : 'bg-white/5 hover:bg-white/10 text-white/60'
                          }`}
                          style={isSelected ? { backgroundColor: user.color } : {}}
                        >
                          <div 
                            className="w-6 h-6 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : user.color }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          {user.name}
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })
                  )}
                </div>
                {eventForm.participants.length > 0 && (
                  <p className="text-xs text-white/40 mt-1">
                    Выбрано участников: {eventForm.participants.length}
                  </p>
                )}
              </div>

              {/* Заказчик и Исполнители */}
              <div className="grid grid-cols-2 gap-4">
                {/* Заказчик */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-white/80">Заказчик</label>
                  <div className="relative">
                    <select
                      value={eventForm.assignedById}
                      onChange={(e) => setEventForm({ ...eventForm, assignedById: e.target.value })}
                      className="w-full px-4 py-3 backdrop-blur-xl bg-[var(--bg-tertiary)]/60 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer text-sm"
                    >
                      <option value="">Выбрать заказчика...</option>
                      {users.filter(u => u.role === 'customer' || u.role === 'universal').map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                  </div>
                </div>

                {/* Исполнители */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-white/80">Исполнители</label>
                  <div className="flex flex-wrap gap-2 p-3 backdrop-blur-xl bg-[var(--bg-tertiary)]/60 border border-white/10 rounded-xl min-h-[52px]">
                    {users.filter(u => u.role === 'executor' || u.role === 'universal').map(user => {
                      const isSelected = eventForm.assignedToIds.includes(user.id);
                      return (
                        <button
                          key={user.id}
                          onClick={() => setEventForm(prev => ({
                            ...prev,
                            assignedToIds: isSelected 
                              ? prev.assignedToIds.filter(id => id !== user.id)
                              : [...prev.assignedToIds, user.id]
                          }))}
                          className={`px-2 py-1 rounded-full text-xs flex items-center gap-1.5 transition-all outline-none ${
                            isSelected 
                              ? 'text-white' 
                              : 'bg-white/5 hover:bg-white/10 text-white/60'
                          }`}
                          style={isSelected ? { backgroundColor: user.color } : {}}
                        >
                          <div 
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                            style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : user.color }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          {user.name}
                          {isSelected && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Описание - WYSIWYG редактор */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white/80">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Описание
                </label>
                {/* Панель форматирования */}
                <div className="flex items-center gap-1 flex-wrap mb-2 p-2 backdrop-blur-xl bg-[var(--bg-tertiary)]/60 border border-white/10 rounded-t-xl border-b-0">
                  <button
                    type="button"
                    onClick={() => {
                      const editor = document.getElementById('event-description-editor');
                      if (editor) {
                        document.execCommand('bold', false);
                        editor.focus();
                      }
                    }}
                    className="p-2 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                    title="Жирный (Ctrl+B)"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
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
                    className="p-2 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                    title="Курсив (Ctrl+I)"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const editor = document.getElementById('event-description-editor');
                      if (editor) {
                        document.execCommand('underline', false);
                        editor.focus();
                      }
                    }}
                    className="p-2 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                    title="Подчёркнутый (Ctrl+U)"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>
                  </button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <button
                    type="button"
                    onClick={() => {
                      const editor = document.getElementById('event-description-editor');
                      if (editor) {
                        document.execCommand('insertUnorderedList', false);
                        editor.focus();
                      }
                    }}
                    className="p-2 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                    title="Маркированный список"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const editor = document.getElementById('event-description-editor');
                      if (editor) {
                        document.execCommand('insertOrderedList', false);
                        editor.focus();
                      }
                    }}
                    className="p-2 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                    title="Нумерованный список"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>
                  </button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
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
                    className="p-2 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                    title="Вставить ссылку"
                  >
                    <Link2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const editor = document.getElementById('event-description-editor');
                      if (editor) {
                        document.execCommand('removeFormat', false);
                        editor.focus();
                      }
                    }}
                    className="p-2 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                    title="Очистить форматирование"
                  >
                    <X className="w-4 h-4" />
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
                  className="w-full min-h-[120px] px-4 py-3 backdrop-blur-xl bg-[var(--bg-tertiary)]/60 border border-white/10 rounded-b-xl text-sm text-white placeholder-white/30 overflow-y-auto focus:outline-none focus:border-cyan-500/50 transition-all leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-medium [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_a]:text-blue-400 [&_a]:underline [&_a]:cursor-pointer [&_li]:ml-2 [&_div]:text-sm [&_div]:font-normal [&_p]:text-sm [&_p]:font-normal"
                />
              </div>
              </div>
              
              {/* Правый блок - заметки (только на десктопе) */}
              <div className="w-full lg:w-[280px] p-4 border-t lg:border-t-0 lg:border-l border-white/10 overflow-y-auto flex-shrink-0 hidden lg:block">
                {/* Заметки */}
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wide">Заметки</label>
                  <textarea
                    value={eventForm.notes}
                    onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                    className="w-full px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-all resize-none"
                    rows={4}
                    placeholder="Дополнительные заметки..."
                  />
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
