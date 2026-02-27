
'use client';

// Корректируем selectedColumnIndex если список изменился
// (перенесено ниже, после объявления хуков)

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDebounce } from '@/hooks/useDebounce';
import TaskLeftPanel from '@/components/TaskModal/TaskLeftPanel';
import TaskCenterPanel from '@/components/TaskModal/TaskCenterPanel';
import StatusButtonGroup, { StatusOption } from '@/components/ui/StatusButtonGroup';
import PersonSelector from '@/components/ui/PersonSelector';
import MultiPersonSelector from '@/components/ui/MultiPersonSelector';
import DateTimePicker from '@/components/ui/DateTimePicker';
import TextArea from '@/components/ui/TextArea';
import FormField from '@/components/ui/FormField';
import {
  PeopleManager,
  CategoryManager,
  TelegramSettings,
  MobileFilters,
  AddList,
  Editingtodo,
  Statusdropdown,
  Executordropdown,
  Departmentdropdown,
  NewTodoAssigneeDropdown,
  Mobileheadermenu,
  MobileArchiveModal
} from '@/components/todos-auto';
import TodoItem from '@/components/todos/TodoItem';
import AddTodoForm from '@/components/todos/AddTodoForm';
import { 
  Plus, 
  Check, 
  CheckSquare,
  Trash2, 
  Edit3, 
  Calendar,
  CalendarPlus,
  Tag,
  Inbox,
  Briefcase,
  FolderOpen,
  Clock,
  Flag,
  X,
  ArrowLeft,
  MoreHorizontal,
  MoreVertical,
  Search,
  GripVertical,
  User,
  UserCheck,
  FileText,
  Megaphone,
  BarChart3,
  Mail,
  Palette,
  Code,
  Settings,
  Star,
  Heart,
  Target,
  Bookmark,
  Zap,
  Trophy,
  Rocket,
  Users,
  Send,
  Bot,
  Archive,
  Info,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Link2,
  ExternalLink,
  MessageCircle,
  Share2,
  AtSign,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Type,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  AlertTriangle,
  Filter
} from 'lucide-react';
import { 
  TaskNotificationManager, 
  getTaskRelatedUsers,
  getStatusLabel 
} from '@/services/notificationService';

interface Comment {
  id: string;
  todoId: string;
  authorId: string;
  authorName: string;
  content: string;
  mentions: string[];
  createdAt: string;
}

interface Notification {
  id: string;
  type: 'new_task' | 'comment' | 'status_change' | 'assignment' | 'mention' | 'event_invite' | 'event_reminder' | 'event_update' | 'assignee_response' | 'task_updated';
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

interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  todoId?: string;
  createdAt: number;
  // Для группировки
  groupKey?: string;  // Ключ группировки (например, "comment_taskId" или "status_taskId")
  count?: number;  // Количество событий в группе
}

interface Person {
  id: string;
  name: string;
  username?: string;
  telegramId?: string;
  telegramUsername?: string;
  role: 'executor' | 'customer' | 'universal';
  department?: string;  // Отдел пользователя
  // Настройки уведомлений
  notifyOnNewTask?: boolean;  // Уведомление о новой задаче
  notifyOnStatusChange?: boolean;  // Уведомление при смене статуса
  notifyOnComment?: boolean;  // Уведомление о комментариях
  notifyOnMention?: boolean;  // Уведомление при упоминании
  // Статус онлайн
  lastSeen?: string;  // ISO дата последней активности
  createdAt: string;
}

interface TodoCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
}

interface LinkItem {
  id: string;
  url: string;
  title: string;
  description?: string;
  favicon?: string;
}

interface Todo {
  id: string;
  title: string;
  description?: string;
  assigneeResponse?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in-progress' | 'pending' | 'review' | 'cancelled' | 'stuck';
  reviewComment?: string;
  dueDate?: string;
  recurrence?: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  listId: string;
  categoryId?: string | null;
  tags: string[];
  assignedById?: string | null;
  assignedBy?: string | null;
  delegatedById?: string | null;  // Делегировал (второй уровень)
  delegatedBy?: string | null;
  assignedToId?: string | null;
  assignedTo?: string | null;
  assignedToIds?: string[];  // Множественные исполнители
  assignedToNames?: string[];  // Имена множественных исполнителей
  linkId?: string;
  linkUrl?: string;
  linkTitle?: string;
  addToCalendar?: boolean;
  calendarEventId?: string;
  calendarListId?: string;
  chatId?: string;  // ID чата для обсуждения задачи
  createdAt: string;
  updatedAt: string;
  order: number;
  archived?: boolean;
  comments?: Comment[];
  // Трекинг прочитанных комментариев
  readCommentsByUser?: Record<string, string>;  // userId -> lastReadCommentId
  // Чек-лист
  checklist?: ChecklistItem[];
  // Прикреплённые файлы
  attachments?: Attachment[];
  stagesEnabled?: boolean;
  technicalSpecTabs?: { id: string; label: string }[];
  stageDefaultAssigneeId?: string | null;
  stageDefaultAssigneeName?: string | null;
  stageMeta?: Record<string, { assigneeId?: string | null; assigneeName?: string | null }>;
  metadata?: Record<string, unknown>;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'file';
  size?: number;
  uploadedAt: string;
}

// ID списка "Техническое задание"
const TZ_LIST_ID = 'tz-list';

const STATUS_LABELS: Record<string, string> = {
  'todo': 'К выполнению',
  'pending': 'В ожидании',
  'in-progress': 'В работе',
  'review': 'Готово к проверке',
  'cancelled': 'Отменена',
  'stuck': 'Застряла'
};

const STATUS_COLORS: Record<string, string> = {
  'todo': 'bg-gray-500',
  'pending': 'bg-orange-500',
  'in-progress': 'bg-blue-500',
  'review': 'bg-green-500',
  'cancelled': 'bg-red-500',
  'stuck': 'bg-yellow-600'
};

interface TodoList {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
  order: number;
  archived?: boolean;
  defaultExecutorId?: string;
  defaultCustomerId?: string;
  defaultAddToCalendar?: boolean;
  creatorId?: string;
  allowedUsers?: string[];
  allowedDepartments?: string[];  // Разрешённые отделы
}

interface CalendarList {
  id: string;
  name: string;
  color?: string;
  isDefault?: boolean;
  allowedUsers?: string[];
  allowedDepartments?: string[];
}

const PRIORITY_COLORS = {
  low: 'border-l-blue-400 dark:border-l-blue-500',
  medium: 'border-l-yellow-400 dark:border-l-yellow-500',
  high: 'border-l-red-400 dark:border-l-red-500'
};

const PRIORITY_BG = {
  low: 'bg-blue-400/10',
  medium: 'bg-yellow-400/10', 
  high: 'bg-red-400/10'
};

const PRIORITY_LABELS = {
  low: 'Низкий',
  medium: 'Средний', 
  high: 'Высокий'
};

// Хелпер для форматирования статуса онлайн
const formatLastSeen = (lastSeen?: string): { text: string; isOnline: boolean; color: string } => {
  if (!lastSeen) return { text: 'Никогда', isOnline: false, color: 'text-[var(--text-muted)]' };
  
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  
  if (diffMinutes < 2) {
    return { text: 'Онлайн', isOnline: true, color: 'text-green-400' };
  } else if (diffMinutes < 5) {
    return { text: 'Был(а) только что', isOnline: false, color: 'text-green-400/70' };
  } else if (diffMinutes < 60) {
    return { text: `Был(а) ${diffMinutes} мин. назад`, isOnline: false, color: 'text-white/50' };
  } else if (diffMinutes < 1440) { // меньше суток
    const hours = Math.floor(diffMinutes / 60);
    return { text: `Был(а) ${hours} ч. назад`, isOnline: false, color: 'text-[var(--text-muted)]' };
  } else {
    const days = Math.floor(diffMinutes / 1440);
    return { text: `Был(а) ${days} дн. назад`, isOnline: false, color: 'text-[var(--text-muted)]' };
  }
};

// Хелпер для получения имени человека по ID
const getPersonNameById = (people: Person[], personId: string | null | undefined, fallbackName?: string): string => {
  if (!personId) return fallbackName || '';
  const person = people.find(p => p.id === personId);
  return person?.name || fallbackName || personId;
};

const LIST_ICONS: Record<string, React.ReactNode> = {
  inbox: <Inbox className="w-4 h-4" />,
  calendar: <Calendar className="w-4 h-4" />,
  briefcase: <Briefcase className="w-4 h-4" />,
  folder: <FolderOpen className="w-4 h-4" />,
  star: <Star className="w-4 h-4" />,
  heart: <Heart className="w-4 h-4" />,
  target: <Target className="w-4 h-4" />,
  bookmark: <Bookmark className="w-4 h-4" />,
  flag: <Flag className="w-4 h-4" />,
  zap: <Zap className="w-4 h-4" />,
  trophy: <Trophy className="w-4 h-4" />,
  rocket: <Rocket className="w-4 h-4" />
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  search: <Search className="w-4 h-4" />,
  'file-text': <FileText className="w-4 h-4" />,
  megaphone: <Megaphone className="w-4 h-4" />,
  'bar-chart': <BarChart3 className="w-4 h-4" />,
  'share-2': <Share2 className="w-4 h-4" />,
  mail: <Mail className="w-4 h-4" />,
  palette: <Palette className="w-4 h-4" />,
  code: <Code className="w-4 h-4" />,
  tag: <Tag className="w-4 h-4" />,
};

const LIST_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', 
  '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6'
];

export default function TodosPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Редирект с /todos на /account?tab=tasks
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/todos') {
      router.replace('/account?tab=tasks');
    }
  }, [router]);
  
  const [todos, setTodos] = useState<Todo[]>([]);
  const [lists, setLists] = useState<TodoList[]>([]);
  const [categories, setCategories] = useState<TodoCategory[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [calendarLists, setCalendarLists] = useState<CalendarList[]>([]);
  const isSharedCalendarList = useCallback((list?: CalendarList | null) => {
    if (!list) return false;
    return list.id === 'shared-main' || !!list.isDefault || list.name.toLowerCase().includes('общ');
  }, []);
  const personalCalendarLists = useMemo(
    () => calendarLists.filter(list => !isSharedCalendarList(list)),
    [calendarLists, isSharedCalendarList]
  );
  const [isLoading, setIsLoading] = useState(true);
  const [returnUrl, setReturnUrl] = useState<string>('/account?tab=tasks');
  const [showAddList, setShowAddList] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showPeopleManager, setShowPeopleManager] = useState(false);
  const [showTelegramSettings, setShowTelegramSettings] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TodoCategory | null>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [showEditPersonModal, setShowEditPersonModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListColor, setNewListColor] = useState('#6366f1');
  const [newListStagesEnabled, setNewListStagesEnabled] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6366f1');
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag');
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonTelegramId, setNewPersonTelegramId] = useState('');
  const [newPersonTelegramUsername, setNewPersonTelegramUsername] = useState('');
  const [newPersonRole, setNewPersonRole] = useState<'executor' | 'customer' | 'universal'>('executor');
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [myAccountId, setMyAccountId] = useState<string | null>(null);
  const [myDepartment, setMyDepartment] = useState<string | null>(null);  // Отдел текущего пользователя
  const [canSeeAllTasks, setCanSeeAllTasks] = useState<boolean>(false);  // По умолчанию false - видны только свои задачи
  const [isDepartmentHead, setIsDepartmentHead] = useState<boolean>(false);  // Руководитель отдела
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'stages' | 'todo' | 'pending' | 'in-progress' | 'review' | 'cancelled' | 'stuck'>('all');
  const [filterExecutor, setFilterExecutor] = useState<string | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  // 🚀 PERFORMANCE: Мемоизация filteredAndSortedTodos должна быть ВЫШЕ headerPeople!
  // Перенесено из строки 2795 сюда для правильного порядка зависимостей
  const filteredAndSortedTodos = useMemo(() => {
    const personDepartmentById = new Map<string, string>();
    people.forEach(person => {
      if (person.department?.trim()) {
        personDepartmentById.set(person.id, person.department.trim());
      }
    });

    return lists.map(list => {
      if (list.archived && !showArchive) return { listId: list.id, todos: [] };
      
      const listTodos = todos.filter(t => {
        if (t.listId !== list.id) return false;
        if (t.archived && !showArchive) return false;
        if (!showCompleted && t.completed) return false;
        
        // Поиск
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesSearch = t.title.toLowerCase().includes(query) || 
                               t.description?.toLowerCase().includes(query);
          if (!matchesSearch) return false;
        }
        
        // Фильтр по статусу
        if (filterStatus !== 'all') {
          if (filterStatus === 'stages') {
            if (!t.stagesEnabled) return false;
          } else {
            if (t.stagesEnabled) return false;
            if (t.status !== filterStatus) return false;
          }
        }
        
        // Фильтр по исполнителю
        if (filterExecutor !== null) {
          const matchesFilter = t.assignedToId === filterExecutor || 
                               t.assignedToIds?.includes(filterExecutor) ||
                               t.stageDefaultAssigneeId === filterExecutor;
          
          // Проверяем исполнителей в этапах
          const stageMeta = (t.stageMeta || (t.metadata as any)?.stageMeta) as Todo['stageMeta'] | undefined;
          const matchesStageAssignee = stageMeta && Object.values(stageMeta).some(meta => 
            meta.assigneeId === filterExecutor
          );
          
          const matches = matchesFilter || matchesStageAssignee;
          
          if (!matches) return false;
        }

        // Фильтр по отделу
        if (filterDepartment !== 'all') {
          const stageMeta = (t.stageMeta || (t.metadata as any)?.stageMeta) as Todo['stageMeta'] | undefined;
          const taskAssigneeIds = new Set<string>();

          if (t.assignedToId) taskAssigneeIds.add(t.assignedToId);
          if (Array.isArray(t.assignedToIds)) {
            t.assignedToIds.forEach(id => taskAssigneeIds.add(id));
          }
          if (t.stageDefaultAssigneeId) taskAssigneeIds.add(t.stageDefaultAssigneeId);
          if (stageMeta) {
            Object.values(stageMeta).forEach(meta => {
              if (meta.assigneeId) taskAssigneeIds.add(meta.assigneeId);
            });
          }

          const matchesDepartment = Array.from(taskAssigneeIds).some(assigneeId => personDepartmentById.get(assigneeId) === filterDepartment);
          if (!matchesDepartment) return false;
        }
        
        return true;
      }).sort((a, b) => {
        // Сначала незавершённые
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        // Потом по приоритету
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      });
      
      return { listId: list.id, todos: listTodos };
    });
  }, [todos, lists, people, searchQuery, filterStatus, filterExecutor, filterDepartment, showCompleted, showArchive]);

  const filteredTodosByListId = useMemo(() => {
    const map: Record<string, Todo[]> = {};
    filteredAndSortedTodos.forEach((entry) => {
      map[entry.listId] = entry.todos;
    });
    return map;
  }, [filteredAndSortedTodos]);

  const headerPeople = useMemo(() => {
    const now = new Date().toISOString();
    const peopleMap = new Map<string, Person>();
    
    // Создаём Map из всех людей для быстрого поиска
    people.forEach(person => {
      peopleMap.set(person.id, {
        ...person,
        name: person.name || person.username || person.id,
        role: person.role || 'universal',
        createdAt: person.createdAt || now
      });
    });

    // Собираем ID людей из ВСЕХ задач (не только отфильтрованных!)
    const visiblePeopleIds = new Set<string>();
    
    todos.forEach(todo => {
      if (todo.assignedToId) visiblePeopleIds.add(todo.assignedToId);
      if (todo.assignedById) visiblePeopleIds.add(todo.assignedById);
      if (todo.stageDefaultAssigneeId) visiblePeopleIds.add(todo.stageDefaultAssigneeId);
      if (Array.isArray(todo.assignedToIds)) {
        todo.assignedToIds.forEach(id => visiblePeopleIds.add(id));
      }
      const stageMeta = (todo.stageMeta || (todo.metadata as any)?.stageMeta) as Todo['stageMeta'] | undefined;
      Object.values(stageMeta || {}).forEach(meta => {
        if (meta.assigneeId) visiblePeopleIds.add(meta.assigneeId);
      });
    });

    // Возвращаем только тех людей, которые есть в задачах
    return Array.from(visiblePeopleIds)
      .map(id => peopleMap.get(id))
      .filter((p): p is Person => p !== undefined);
  }, [people, todos]);
  
  // 🚀 PERFORMANCE: Статусы для переиспользуемого компонента
  const statusOptions: StatusOption[] = [
    { value: 'pending', label: 'В ожидании', color: 'orange' },
    { value: 'in-progress', label: 'В работе', color: 'blue' },
    { value: 'review', label: 'Готово к проверке', color: 'green' },
    { value: 'cancelled', label: 'Отменена', color: 'red' },
    { value: 'stuck', label: 'Застряла', color: 'yellow' },
  ];

  const availableDepartments = useMemo(() => {
    const departmentSet = new Set<string>();
    people.forEach(person => {
      const department = person.department?.trim();
      if (department) {
        departmentSet.add(department);
      }
    });
    return Array.from(departmentSet).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [people]);
  
  // 🚀 PERFORMANCE: Мемоизированный обработчик обновления - изолирует ре-рендеры компонентов
  const handleUpdate = useCallback((updates: Partial<Todo>) => {
    setEditingTodo(prev => {
      if (!prev) return prev;
      setTodos(current => current.map(t => t.id === prev.id ? { ...t, ...updates } : t));
      return { ...prev, ...updates };
    });
  }, []);
  
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDescription, setNewTodoDescription] = useState('');
  const [newTodoAssigneeId, setNewTodoAssigneeId] = useState<string | null>(null);
  const [showNewTodoAssigneeDropdown, setShowNewTodoAssigneeDropdown] = useState(false);
  const [newListAssigneeId, setNewListAssigneeId] = useState<string | null>(null);
  const [showNewListAssigneeDropdown, setShowNewListAssigneeDropdown] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [executorDropdownOpen, setExecutorDropdownOpen] = useState(false);
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [showMobileFiltersModal, setShowMobileFiltersModal] = useState(false);  // Модаль для фильтров
  const [showMobileArchiveModal, setShowMobileArchiveModal] = useState(false);  // Модаль для архива
  const [mobileHeaderMenuOpen, setMobileHeaderMenuOpen] = useState(false);  // Дропдаун в мобильном хедере
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [editingList, setEditingList] = useState<any | null>(null);
  const [showListMenu, setShowListMenu] = useState<string | null>(null);  // Для выпадающего меню "..."
  
  // 🚀 PERFORMANCE: Кэшируем ширину окна вместо множественных проверок window.innerWidth
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [mobileView, setMobileView] = useState<'board' | 'single'>(windowWidth < 550 ? 'single' : 'board');
  
  // 🚀 PERFORMANCE: Passive resize listener для плавной адаптации
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newWidth = window.innerWidth;
        setWindowWidth(newWidth);
        setMobileView(newWidth < 550 ? 'single' : 'board');
      }, 200);
    };
    
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  useEffect(() => {
    setColumnWidths([30, 40, 30]);
    resizeStartWidthsRef.current = [30, 40, 30];
  }, [windowWidth]);
  const [selectedColumnIndex, setSelectedColumnIndex] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('todos_selected_column');
      if (stored !== null) return Number(stored);
    }
    return 0;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('todos_selected_column', String(selectedColumnIndex));
    }
  }, [selectedColumnIndex]);
  
  // 🚀 PERFORMANCE: title и description живут в refs, НЕ вызывают re-render при вводе
  // Автосохранение раз в 15 секунд + при закрытии модалки
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionEditorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTodoRef = useRef<string | null>(null);
  
  // Notifications (Inbox) state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showInbox, setShowInbox] = useState(false);
  const [inboxTab, setInboxTab] = useState<'new' | 'history'>('new');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  const sentGroupedNotificationsRef = useRef<Set<string>>(new Set());
  
  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastNotificationCountRef = useRef<number>(0);
  
  // Hover preview state
  const [hoveredTodo, setHoveredTodo] = useState<Todo | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragPayloadRef = useRef<{ type: 'todo' | 'list' | null; id: string | null }>({ type: null, id: null });
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const executorFilterRef = useRef<HTMLDivElement>(null);
  const departmentFilterRef = useRef<HTMLDivElement>(null);
  const isClosingModalRef = useRef(false);
  const hasOpenedFromUrlRef = useRef(false);
  
  // Dropdown states for modal
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchAssignedBy, setSearchAssignedBy] = useState('');
  const [searchDelegatedBy, setSearchDelegatedBy] = useState('');
  const [searchAssignedTo, setSearchAssignedTo] = useState('');
  
  // Resizable columns for modal (left: 30%, center: 40%, right: 30% by default)
  const [columnWidths, setColumnWidths] = useState<[number, number, number]>(() => {
    return [30, 40, 30];
  });
  const [isResizing, setIsResizing] = useState<number | null>(null); // 0 или 1 (между какими колонками)
  const resizeStartXRef = useRef<number>(0);
  const resizeStartWidthsRef = useRef<[number, number, number]>([30, 40, 30]);
  
  // Добавляем/удаляем класс modal-open на body когда любая модалка открыта
  useEffect(() => {
    const hasAnyModal = editingTodo !== null || 
      showAddList || 
      showAddCategory || 
      showCategoryManager || 
      showPeopleManager || 
      showTelegramSettings || 
      showEditPersonModal || 
      showInbox || 
      showMobileFiltersModal || 
      showMobileArchiveModal;
    
    if (hasAnyModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    // Cleanup при unmount
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [editingTodo, showAddList, showAddCategory, showCategoryManager, showPeopleManager, showTelegramSettings, showEditPersonModal, showInbox, showMobileFiltersModal, showMobileArchiveModal]);
  
  // Save column widths to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('todos_modal_column_widths', JSON.stringify(columnWidths));
    }
  }, [columnWidths]);
  
  // Resize handlers
  useEffect(() => {
    if (isResizing === null) return;
    
    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const deltaX = e.clientX - resizeStartXRef.current;
      const containerWidth = windowWidth;
      const deltaPercent = (deltaX / containerWidth) * 100;
      
      const [left, center, right] = resizeStartWidthsRef.current;
      
      if (isResizing === 0) {
        // Resizing between left and center
        const newLeft = Math.max(15, Math.min(50, left + deltaPercent));
        const newCenter = Math.max(15, Math.min(60, center - deltaPercent));
        setColumnWidths([newLeft, newCenter, right]);
      } else if (isResizing === 1) {
        // Resizing between center and right
        const newCenter = Math.max(15, Math.min(60, center + deltaPercent));
        const newRight = Math.max(15, Math.min(50, right - deltaPercent));
        setColumnWidths([left, newCenter, newRight]);
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(null);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, windowWidth]); // Убрали columnWidths из зависимостей - используется только ref
  
  // Drag and Drop state for todos
  const [draggedTodo, setDraggedTodo] = useState<Todo | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);
  const [dragOverTodoId, setDragOverTodoId] = useState<string | null>(null);
  const dragOverTodoInsertAfterRef = useRef(false);
  const dragCounter = useRef(0);
  
  // Drag and Drop state for lists
  const [draggedList, setDraggedList] = useState<TodoList | null>(null);
  const [dragOverListOrder, setDragOverListOrder] = useState<number | null>(null);
  
  // Drag to scroll state
  const boardRef = useRef<HTMLDivElement>(null);
  const bottomScrollbarRef = useRef<HTMLDivElement>(null);
  const scrollSyncRef = useRef(false);
  const [boardScrollWidth, setBoardScrollWidth] = useState(0);
  const [boardClientWidth, setBoardClientWidth] = useState(0);
  const [isDraggingBoard, setIsDraggingBoard] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const settingsRef = useRef<HTMLDivElement>(null);

  const syncBoardMetrics = useCallback(() => {
    if (!boardRef.current) return;
    setBoardScrollWidth(boardRef.current.scrollWidth);
    setBoardClientWidth(boardRef.current.clientWidth);
  }, []);

  const handleBoardScroll = useCallback(() => {
    const board = boardRef.current;
    const bottom = bottomScrollbarRef.current;
    if (!board || !bottom) return;

    if (scrollSyncRef.current) return;
    scrollSyncRef.current = true;
    bottom.scrollLeft = board.scrollLeft;
    requestAnimationFrame(() => {
      scrollSyncRef.current = false;
    });
  }, []);

  const handleBottomScrollbarScroll = useCallback(() => {
    const board = boardRef.current;
    const bottom = bottomScrollbarRef.current;
    if (!board || !bottom) return;

    if (scrollSyncRef.current) return;
    scrollSyncRef.current = true;
    board.scrollLeft = bottom.scrollLeft;
    requestAnimationFrame(() => {
      scrollSyncRef.current = false;
    });
  }, []);

  const handleBottomScrollbarTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const board = boardRef.current;
    const bottom = bottomScrollbarRef.current;
    if (!board || !bottom) return;

    const rect = bottom.getBoundingClientRect();
    if (rect.width <= 0) return;

    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const maxScroll = Math.max(0, bottom.scrollWidth - bottom.clientWidth);
    const nextScrollLeft = ratio * maxScroll;

    scrollSyncRef.current = true;
    bottom.scrollLeft = nextScrollLeft;
    board.scrollLeft = nextScrollLeft;
    requestAnimationFrame(() => {
      scrollSyncRef.current = false;
    });
  }, []);

  useEffect(() => {
    if (windowWidth < 550) return;

    syncBoardMetrics();
    const board = boardRef.current;
    if (!board) return;

    const resizeObserver = new ResizeObserver(() => {
      syncBoardMetrics();
    });

    resizeObserver.observe(board);
    window.addEventListener('resize', syncBoardMetrics);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncBoardMetrics);
    };
  }, [syncBoardMetrics, windowWidth, lists.length, showAddList, showArchive]);

  // Проверка авторизации - редирект на /login если не авторизован
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated || isAuthenticated !== 'true') {
      router.push('/login');
    }
  }, [router]);

  // Загрузка данных
  const loadData = useCallback(async () => {
    try {
      const userId = myAccountId;
      const username = localStorage.getItem('username') || '';
      const myAccountRaw = localStorage.getItem('myAccount');
      const myAccount = myAccountRaw ? JSON.parse(myAccountRaw) : null;
      const calendarUserId = myAccount?.id || userId || '';
      const calendarDepartment = myAccount?.department || '';
      const calendarParams = new URLSearchParams();
      if (calendarUserId) calendarParams.set('userId', calendarUserId);
      if (username) calendarParams.set('username', username);
      if (calendarDepartment) calendarParams.set('department', calendarDepartment);
      console.log('[loadData] Loading with userId:', userId);
      
      const [todosRes, peopleRes, telegramRes, calendarListsRes] = await Promise.all([
        fetch(`/api/todos${userId ? `?userId=${userId}` : ''}`),
        fetch('/api/todos/people'),
        fetch('/api/todos/telegram'),
        fetch(`/api/calendar-lists?${calendarParams.toString()}`)
      ]);
      
      const todosData = await todosRes.json();
      const peopleData = await peopleRes.json();
      const telegramData = await telegramRes.json();
      const calendarListsData = await calendarListsRes.json();
      
      console.log('[loadData] Received lists:', todosData.lists?.length || 0);
      console.log('[loadData] Lists:', todosData.lists);
      
      setTodos(todosData.todos || []);
      setLists(todosData.lists || []);
      setCategories(todosData.categories || []);
      let nextPeople = Array.isArray(peopleData.people) ? peopleData.people : [];
      let usersList: any[] = [];

      const needsUsersFallback =
        nextPeople.length === 0 || nextPeople.some((person: Person) => !person.department || !person.name || !person.role);

      if (needsUsersFallback) {
        try {
          const usersRes = await fetch('/api/users');
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            usersList = Array.isArray(usersData) ? usersData : (usersData?.users || []);
          }
        } catch (error) {
          console.error('[loadData] Failed to load users fallback:', error);
        }
      }

      if (nextPeople.length === 0 && usersList.length > 0) {
        nextPeople = usersList.map((user: any) => ({
          id: user.id,
          name: user.name || user.username || user.id,
          username: user.username,
          telegramId: user.telegramId,
          telegramUsername: user.telegramUsername,
          role: user.todoRole || 'universal',
          department: user.department,
          notifyOnNewTask: user.notifyOnNewTask,
          notifyOnStatusChange: user.notifyOnStatusChange,
          notifyOnComment: user.notifyOnComment,
          notifyOnMention: user.notifyOnMention,
          lastSeen: user.lastSeen,
          createdAt: user.createdAt || new Date().toISOString()
        }));
      } else if (usersList.length > 0) {
        const usersById = new Map(usersList.map((user: any) => [user.id, user]));
        nextPeople = nextPeople.map((person: Person) => {
          const match = usersById.get(person.id);
          if (!match) return person;
          return {
            ...person,
            name: person.name || match.name || match.username || match.id,
            role: person.role || match.todoRole || 'universal',
            department: person.department || match.department
          };
        });
      }

      const now = new Date().toISOString();
      nextPeople = nextPeople.map((person: Person) => ({
        ...person,
        name: person.name || person.username || person.id,
        role: person.role || 'universal',
        createdAt: person.createdAt || now
      }));

      setPeople(nextPeople);
      setTelegramEnabled(telegramData.enabled || false);
      setCalendarLists(Array.isArray(calendarListsData) ? calendarListsData : calendarListsData.lists || []);
    } catch (error) {
      console.error('Error loading todos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [myAccountId]);

  useEffect(() => {
    sentGroupedNotificationsRef.current = new Set();
  }, [myAccountId]);

  const sendGroupedNotificationToChat = useCallback((groupNotifs: Notification[], groupKey: string) => {
    if (!myAccountId) return;
    if (groupNotifs.length < 2) return;

    const firstNotif = groupNotifs[0];
    const lastNotif = groupNotifs[groupNotifs.length - 1];
    const signature = `${groupKey}:${lastNotif?.id || 'none'}:${groupNotifs.length}`;

    if (sentGroupedNotificationsRef.current.has(signature)) return;
    sentGroupedNotificationsRef.current.add(signature);

    const title = firstNotif.type === 'comment'
      ? 'Новый комментарий'
      : firstNotif.type === 'mention'
        ? 'Вас упомянули'
        : firstNotif.type === 'status_change'
          ? 'Статус изменен'
          : firstNotif.type === 'task_updated'
            ? 'Задача изменена'
            : firstNotif.type === 'assignee_response'
              ? 'Ответ по задаче'
          : firstNotif.type === 'new_task'
            ? 'Новая задача'
            : 'Уведомление';
    const noun = firstNotif.type === 'comment' ? 'комментариев' : 'уведомлений';
    const content = `${title}\n${firstNotif.fromUserName}: +${groupNotifs.length} ${noun}`;

    fetch(`/api/chats/notifications/${myAccountId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        linkedTaskId: firstNotif.todoId,
        notificationType: firstNotif.type
      })
    }).catch(error => {
      console.error('[notifications chat] Failed to send grouped summary:', error);
    });
  }, [myAccountId]);

  // Загрузка уведомлений из API
  const loadNotifications = useCallback(async (playSound = false) => {
    if (!myAccountId) return;
    // Не запрашиваем данные если вкладка не активна
    if (typeof document !== 'undefined' && document.hidden) return;
    
    try {
      const res = await fetch(`/api/notifications?userId=${myAccountId}`);
      if (res.ok) {
        const data: Notification[] = await res.json();
        
        // Проверяем, есть ли новые непрочитанные уведомления
        if (playSound) {
          const newUnreadCount = data.filter(n => !n.read).length;
          
          // Находим новые уведомления (которых не было раньше)
          if (newUnreadCount > lastNotificationCountRef.current) {
            // Играем звук
            if (soundEnabled && notificationSoundRef.current) {
              notificationSoundRef.current.currentTime = 0;
              notificationSoundRef.current.play().catch(() => {});
            }
            
            // Показываем toast для каждого нового уведомления с группировкой
            // Используем setNotifications с коллбэком чтобы получить текущие уведомления
            setNotifications(prevNotifications => {
              const existingIds = new Set(prevNotifications.map(n => n.id));
              const newNotifs = data.filter(n => !n.read && !existingIds.has(n.id));
            
            // Группируем уведомления по типу и задаче
            const groups = new Map<string, typeof newNotifs>();
            newNotifs.forEach(notif => {
              const groupKey = `${notif.type}_${notif.todoId || 'general'}`;
              if (!groups.has(groupKey)) {
                groups.set(groupKey, []);
              }
              groups.get(groupKey)!.push(notif);
            });
            
            // Создаём toast для каждой группы
            groups.forEach((groupNotifs, groupKey) => {
              const firstNotif = groupNotifs[0];
              const count = groupNotifs.length;
              
              const toast: Toast = {
                id: `toast-${firstNotif.id}`,
                type: firstNotif.type === 'mention' ? 'warning' : 
                      firstNotif.type === 'status_change' ? 'success' : 'info',
                title: firstNotif.type === 'comment' ? '💬 Новый комментарий' :
                       firstNotif.type === 'mention' ? '📢 Вас упомянули' :
                       firstNotif.type === 'status_change' ? '✅ Статус изменён' :
                    firstNotif.type === 'task_updated' ? '✏️ Задача изменена' :
                    firstNotif.type === 'assignee_response' ? '💬 Ответ по задаче' :
                       firstNotif.type === 'new_task' ? '📋 Новая задача' :
                       '🔔 Уведомление',
                message: count > 1 
                  ? `${firstNotif.fromUserName}: +${count} ${firstNotif.type === 'comment' ? 'комментариев' : 'уведомлений'}`
                  : firstNotif.message,
                todoId: firstNotif.todoId,
                createdAt: Date.now(),
                groupKey,
                count
              };

                sendGroupedNotificationToChat(groupNotifs, groupKey);
              
              // Обновляем существующий toast или добавляем новый
              setToasts(prev => {
                const existingIndex = prev.findIndex(t => t.groupKey === groupKey);
                if (existingIndex >= 0) {
                  // Обновляем счётчик существующего
                  const updated = [...prev];
                  updated[existingIndex] = {
                    ...updated[existingIndex],
                    count: (updated[existingIndex].count || 1) + count,
                    message: `${firstNotif.fromUserName}: +${(updated[existingIndex].count || 1) + count} ${firstNotif.type === 'comment' ? 'комментариев' : 'уведомлений'}`,
                    createdAt: Date.now()
                  };
                  return updated;
                }
                return [...prev.slice(-4), toast]; // Максимум 5 toast
              });
            });
            
              return data; // Возвращаем новые данные
            });
          } else {
            setNotifications(data);
          }
          
          lastNotificationCountRef.current = newUnreadCount;
        } else {
          // Если нет новых уведомлений, просто обновляем данные
          setNotifications(data);
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [myAccountId, soundEnabled, sendGroupedNotificationToChat]); // Убрали notifications из зависимостей чтобы избежать бесконечного цикла

  // Сохранение уведомления в API
  const saveNotification = useCallback(async (notification: Notification) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      });
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  }, []);

  // Обновление статуса lastSeen для текущего пользователя
  // ОТКЛЮЧЕНО: используйте /api/users/[id] для обновления пользователей
  const updateLastSeen = useCallback(async () => {
    // Функция временно отключена
  }, []);

  // Обновляем lastSeen при загрузке и каждую минуту
  // ОТКЛЮЧЕНО
  // useEffect(() => {
  //   if (myAccountId) {
  //     updateLastSeen();
  //     const interval = setInterval(updateLastSeen, 60000); // каждую минуту
  //     return () => clearInterval(interval);
  //   }
  // }, [myAccountId, updateLastSeen]);

  useEffect(() => {
    // Загружаем данные только когда myAccountId уже установлен
    if (myAccountId) {
      loadData();
    }
  }, [loadData, myAccountId]);

  // Автоматическое открытие модалки создания задачи из URL параметров
  useEffect(() => {
    const createTask = searchParams.get('createTask');
    const listId = searchParams.get('listId');
    const assignTo = searchParams.get('assignTo');
    const assignToName = searchParams.get('assignToName');
    const taskTitle = searchParams.get('taskTitle');
    const authorId = searchParams.get('authorId');
    const authorName = searchParams.get('authorName');
    const from = searchParams.get('from');
    
    // Сохраняем URL откуда пришли для возврата
    if (from) {
      setReturnUrl(from);
    }
    
    if (createTask === 'true' && listId && assignTo && lists.length > 0 && !editingTodo) {
      const targetList = lists.find(l => l.id === listId);
      if (!targetList) {
        return;
      }

      const assignedByPerson = people.find(p => p.id === (authorId || myAccountId));
      const assignedToPerson = people.find(p => p.id === assignTo);

      const newTodo: Todo = {
        id: `temp-${Date.now()}`,
        title: taskTitle || '',
        description: '',
        listId: listId,
        status: 'todo',
        priority: 'medium',
        completed: false,
        order: 0,
        assignedToId: assignTo,
        assignedTo: assignedToPerson?.name || assignToName || '',
        assignedById: authorId || myAccountId || undefined,
        assignedBy: assignedByPerson?.name || authorName || '',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setEditingTodo(newTodo);
      router.replace('/todos', { scroll: false });
    }
  }, [searchParams, people, router, lists, myAccountId, editingTodo]);

  // Polling задач каждые 3 секунды для real-time синхронизации
  useEffect(() => {
    const pollTodos = async () => {
      // Не запрашиваем данные если вкладка не активна
      if (typeof document !== 'undefined' && document.hidden) return;
      
      try {
        const userId = myAccountId;
        const res = await fetch(`/api/todos${userId ? `?userId=${userId}` : ''}`);
        if (res.ok) {
          const data = await res.json();
          const newTodos: Todo[] = data.todos || [];
          
          // Проверяем, есть ли новые задачи или комментарии
          setTodos(prev => {
            const prevMap = new Map(prev.map(t => [t.id, t]));
            
            if (myAccountId) {
              newTodos.forEach((newTodo: Todo) => {
                const oldTodo = prevMap.get(newTodo.id);
                
                // Не показываем уведомления если модалка с этой задачей уже открыта
                const isModalOpenForThis = editingTodo?.id === newTodo.id;
                
                // Новая задача назначена мне (и модалка не открыта)
                if (!oldTodo && newTodo.assignedToId === myAccountId && !isModalOpenForThis) {
                  const toast: Toast = {
                    id: `toast-new-${newTodo.id}`,
                    type: 'info',
                    title: '📋 Новая задача',
                    message: newTodo.title,
                    todoId: newTodo.id,
                    createdAt: Date.now()
                  };
                  setToasts(toastPrev => [...toastPrev.slice(-2), toast]);
                  
                  if (soundEnabled && notificationSoundRef.current) {
                    notificationSoundRef.current.currentTime = 0;
                    notificationSoundRef.current.play().catch(() => {});
                  }
                }
                
                // Новый комментарий в моей задаче (я заказчик или исполнитель)
                const isMyTask = newTodo.assignedToId === myAccountId || newTodo.assignedById === myAccountId;
                // Не показываем уведомление о комментарии если модалка открыта
                if (oldTodo && isMyTask && newTodo.comments && oldTodo.comments && !isModalOpenForThis) {
                  const oldCommentsCount = oldTodo.comments.length;
                  const newCommentsCount = newTodo.comments.length;
                  
                  if (newCommentsCount > oldCommentsCount) {
                    const lastComment = newTodo.comments[newTodo.comments.length - 1];
                    // Не показываем уведомление о своём комментарии
                    if (lastComment && lastComment.authorId !== myAccountId) {
                      const toast: Toast = {
                        id: `toast-comment-${lastComment.id}`,
                        type: 'info',
                        title: '💬 Новый комментарий',
                        message: `${lastComment.authorName}: ${lastComment.content.slice(0, 50)}${lastComment.content.length > 50 ? '...' : ''}`,
                        todoId: newTodo.id,
                        createdAt: Date.now()
                      };
                      setToasts(toastPrev => [...toastPrev.slice(-2), toast]);
                      
                      if (soundEnabled && notificationSoundRef.current) {
                        notificationSoundRef.current.currentTime = 0;
                        notificationSoundRef.current.play().catch(() => {});
                      }
                    }
                  }
                }
                
                // Статус изменён на "review" - уведомляем заказчика (если модалка не открыта)
                if (oldTodo && newTodo.status === 'review' && oldTodo.status !== 'review' && newTodo.assignedById === myAccountId && !isModalOpenForThis) {
                  const toast: Toast = {
                    id: `toast-review-${newTodo.id}`,
                    type: 'success',
                    title: '✅ Задача готова',
                    message: newTodo.title,
                    todoId: newTodo.id,
                    createdAt: Date.now()
                  };
                  setToasts(toastPrev => [...toastPrev.slice(-2), toast]);
                  
                  if (soundEnabled && notificationSoundRef.current) {
                    notificationSoundRef.current.currentTime = 0;
                    notificationSoundRef.current.play().catch(() => {});
                  }
                }
              });
            }
            
            return newTodos;
          });
          
          setLists(data.lists || []);
          setCategories(data.categories || []);
          
          // Обновляем editingTodo если модалка открыта
          if (editingTodo) {
            const updatedTodo = newTodos.find((t: Todo) => t.id === editingTodo.id);
            if (updatedTodo) {
              const prevCommentsLength = editingTodo.comments?.length || 0;
              const newCommentsLength = updatedTodo.comments?.length || 0;
              
              setEditingTodo(prev => {
                if (!prev) return null;
                
                // Обновляем только комментарии и метаданные, которые изменились на сервере
                // НЕ перезаписываем поля, которые может редактировать пользователь
                const shouldUpdateComments = JSON.stringify(prev.comments) !== JSON.stringify(updatedTodo.comments);
                
                if (shouldUpdateComments) {
                  // Автоскролл к новым комментариям или разделителю
                  if (newCommentsLength > prevCommentsLength) {
                    // setTimeout(() => {
                      // Сначала пробуем прокрутить к разделителю непрочитанных
                      // const unreadDivider = document.getElementById('unread-divider');
                      // if (unreadDivider) {
                      //   unreadDivider.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      // } else {
                      //   // Если разделителя нет, прокручиваем к концу
                      //   // commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                      // }
                    // }, 100);
                  }
                  
                  // Обновляем только комментарии и readCommentsByUser
                  // Остальные поля остаются как они есть в editingTodo
                  return {
                    ...prev,
                    comments: updatedTodo.comments,
                    readCommentsByUser: updatedTodo.readCommentsByUser
                  };
                }
                
                // Если комментариев не изменилось, но status или другие поля - обновляем их
                // но только те, которые не редактирует пользователь прямо сейчас
                if (prev.status !== updatedTodo.status || 
                    prev.completed !== updatedTodo.completed ||
                    prev.dueDate !== updatedTodo.dueDate) {
                  return {
                    ...prev,
                    status: updatedTodo.status,
                    completed: updatedTodo.completed,
                    dueDate: updatedTodo.dueDate
                  };
                }
                
                return prev;
              });
            }
          }
        }
      } catch (error) {
        // Silently fail
      }
    };

    // 🚀 PERFORMANCE: Polling каждые 30 секунд (вместо 10s для производительности)
    const interval = setInterval(pollTodos, 30000);
    
    return () => clearInterval(interval);
  }, [myAccountId, soundEnabled, editingTodo?.id]);

  // Отслеживание непрочитанных комментариев при открытии модалки
  // useEffect(() => {
  //   if (editingTodo?.comments && editingTodo.comments.length > 0) {
  //     const lastComment = editingTodo.comments[editingTodo.comments.length - 1];
  //     if (!lastReadCommentId) {
  //       setLastReadCommentId(lastComment.id);
  //       setUnreadCommentsCount(0);
  //     }
  //   } else {
  //     setLastReadCommentId(null);
  //     setUnreadCommentsCount(0);
  //   }
  // }, [editingTodo?.id]);

  // Обновляем количество непрочитанных при изменении комментариев
  // useEffect(() => {
  //   if (editingTodo?.comments && lastReadCommentId) {
  //     const lastReadIndex = editingTodo.comments.findIndex(c => c.id === lastReadCommentId);
  //     if (lastReadIndex !== -1) {
  //       const unreadCount = editingTodo.comments.length - lastReadIndex - 1;
  //       const unreadFromOthers = editingTodo.comments
  //         .slice(lastReadIndex + 1)
  //         .filter(c => c.authorId !== myAccountId).length;
  //       setUnreadCommentsCount(unreadFromOthers);
  //     }
  //   }
  // }, [editingTodo?.comments, lastReadCommentId, myAccountId]);

  // Помечаем комментарии как прочитанные при клике на инпут
  const markLocalCommentsAsRead = useCallback(async () => {
    // Закомментировано - функциональность комментариев удалена
  }, []);

  // Инициализация редактора описания при открытии модалки
  useEffect(() => {
    if (!editingTodo) return;
    
    // 🚀 PERFORMANCE: Синхронизация title ref
    if (titleInputRef.current) {
      titleInputRef.current.value = editingTodo.title || '';
    }
    
    // 🚀 PERFORMANCE: Синхронизация description ref
    if (descriptionEditorRef.current) {
      // Устанавливаем начальный контент только если он отличается
      const newDesc = editingTodo.description || '';
      if (descriptionEditorRef.current.innerHTML !== newDesc) {
        descriptionEditorRef.current.innerHTML = newDesc;
      }
    }
  }, [editingTodo?.id]); // Только при смене задачи

  // 🚀 Функция сохранения задачи (вызывается вручную по кнопке)
  const saveTodo = async () => {
    if (!editingTodo || editingTodo.id.startsWith('temp-')) return;

    const todoToSave = { ...editingTodo };
    
    // Обновляем title и description из refs
    if (titleInputRef.current) {
      todoToSave.title = titleInputRef.current.value || '';
    }
    if (descriptionEditorRef.current) {
      todoToSave.description = descriptionEditorRef.current.innerHTML || '';
    }

    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(todoToSave)
      });

      if (res.ok) {
        const updated = await res.json();
        setTodos(prev => prev.map(t => t.id === updated.id ? updated : t));
        setEditingTodo(prev => prev && prev.id === updated.id ? updated : prev);
        
        // Показываем success toast
        const toast: Toast = {
          id: `toast-${Date.now()}`,
          type: 'success',
          title: 'Успех',
          message: 'Задача сохранена',
          todoId: updated.id,
          createdAt: Date.now()
        };
        setToasts(prev => [toast, ...prev]);
      } else {
        // Показываем error toast
        const toast: Toast = {
          id: `toast-${Date.now()}`,
          type: 'error',
          title: 'Ошибка',
          message: 'Ошибка сохранения задачи',
          createdAt: Date.now()
        };
        setToasts(prev => [toast, ...prev]);
      }
    } catch (error) {
      console.error('Error saving task:', error);
      
      // Показываем error toast
      const toast: Toast = {
        id: `toast-${Date.now()}`,
        type: 'error',
        title: 'Ошибка',
        message: 'Ошибка сохранения задачи',
        createdAt: Date.now()
      };
      setToasts(prev => [toast, ...prev]);
    }
  }

  // Загрузка и polling уведомлений
  useEffect(() => {
    if (myAccountId) {
      loadNotifications(false); // Первая загрузка без звука
      
      // 🚀 CRITICAL FIX: Polling каждые 30s instead of 10s
      const interval = setInterval(() => {
        loadNotifications(true); // Последующие загрузки со звуком
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [myAccountId, loadNotifications]);

  // Проверка приближающихся дедлайнов
  useEffect(() => {
    const checkDeadlines = () => {
      if (!myAccountId || todos.length === 0) return;
      
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);
      
      const myPerson = people.find(p => p.id === myAccountId);
      if (!myPerson) return;
      
      // Находим задачи с дедлайном на сегодня или завтра
      const urgentTasks = todos.filter(todo => {
        if (!todo.dueDate || todo.completed) return false;
        const dueDate = new Date(todo.dueDate);
        dueDate.setHours(23, 59, 59, 999);
        
        // Проверяем, что это моя задача (как исполнитель или постановщик)
        const isMyTask = todo.assignedToId === myAccountId || 
                         todo.assignedToIds?.includes(myAccountId) ||
                         todo.assignedById === myAccountId;
        
        return isMyTask && dueDate <= tomorrow && dueDate >= now;
      });
      
      // Показываем уведомления о приближающихся дедлайнах (максимум 3)
      const shownKey = `deadline_shown_${new Date().toDateString()}`;
      const alreadyShown = localStorage.getItem(shownKey);
      if (alreadyShown) return; // Показываем только раз в день
      
      urgentTasks.slice(0, 3).forEach((task, idx) => {
        const dueDate = new Date(task.dueDate!);
        const isToday = dueDate.toDateString() === now.toDateString();
        const isExecutor = task.assignedToId === myAccountId || task.assignedToIds?.includes(myAccountId);
        
        setTimeout(() => {
          const newToast: Toast = {
            id: `deadline-${task.id}-${Date.now()}`,
            type: 'warning',
            title: isToday ? '⚠️ Срочно! Дедлайн сегодня' : '⏰ Дедлайн завтра',
            message: `${task.title}\n${isExecutor ? 'Вы исполнитель' : 'Вы постановщик'}`,
            createdAt: Date.now()
          };
          setToasts(prev => [newToast, ...prev]);
        }, idx * 1000); // Показываем с задержкой
      });
      
      if (urgentTasks.length > 0) {
        localStorage.setItem(shownKey, 'true');
      }
    };
    
    // Проверяем дедлайны при загрузке и каждые 30 минут
    checkDeadlines();
    const interval = setInterval(checkDeadlines, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [todos, myAccountId, people]);

  // Toast'ы больше не удаляются автоматически - только вручную
  // (Пользователь сам закрывает уведомления)

  // Удаление toast вручную
  const removeToast = useCallback((toastId: string) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  }, []);

  // Инициализация звука уведомлений
  useEffect(() => {
    // Создаём звук уведомления (base64 короткий звук)
    notificationSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6Xkoh/d3N3fYOJjo6KhX55dnZ4e4CGiIiGg398eHd3eXyAgoSFhIJ/fHp4d3h6fH+BgoODgX98enl4eHl7fYCBgoKBf3x6eHd3eHp8f4GCgoF/fHt5d3d4enz/');
    notificationSoundRef.current.volume = 0.3;
    
    // Загружаем настройку звука
    const savedSoundEnabled = localStorage.getItem('todos_soundEnabled');
    if (savedSoundEnabled !== null) {
      setSoundEnabled(savedSoundEnabled === 'true');
    }
    
    // Сразу загружаем сохраненный myAccountId из localStorage
    const savedAccountId = localStorage.getItem('todos_myAccountId');
    if (savedAccountId) {
      setMyAccountId(savedAccountId);
    }
  }, []);

  // Загрузка настроек пользователя (используем userId напрямую)
  useEffect(() => {
    const loadUserSettings = async () => {
      const username = localStorage.getItem('username');
      if (!username) {
        console.log('[todos] No username in localStorage');
        return;
      }
      
      try {
        console.log('[todos] Loading user settings for:', username);
        const res = await fetch(`/api/auth/me?username=${encodeURIComponent(username)}`);
        if (res.ok) {
          const userData = await res.json();
          console.log('[todos] User loaded:', userData);
          
          // Используем ID пользователя напрямую как ID профиля в задачах
          setMyAccountId(userData.id);
          localStorage.setItem('todos_myAccountId', userData.id);
          
          // Сохраняем отдел пользователя
          setMyDepartment(userData.department || null);
          
          // Устанавливаем права на просмотр всех задач
          // Админы всегда видят все задачи
          const hasAllTasksAccess = userData.role === 'admin' || userData.canSeeAllTasks === true;
          setCanSeeAllTasks(hasAllTasksAccess);
          
          // Устанавливаем статус руководителя отдела
          setIsDepartmentHead(userData.isDepartmentHead === true);
          
          console.log('[todos] canSeeAllTasks set to:', hasAllTasksAccess);
        } else {
          console.log('[todos] Failed to load user, status:', res.status);
          // Если загрузка не удалась, устанавливаем false чтобы не блокировать UI
          setCanSeeAllTasks(false);
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
        // При ошибке устанавливаем false чтобы не блокировать UI
        setCanSeeAllTasks(false);
      }
    };
    
    loadUserSettings();
  }, []);

  // Сохранение myAccountId в localStorage
  const updateMyAccountId = (accountId: string | null) => {
    setMyAccountId(accountId);
    if (accountId) {
      localStorage.setItem('todos_myAccountId', accountId);
    } else {
      localStorage.removeItem('todos_myAccountId');
    }
  };

  // Функция воспроизведения звука
  const playNotificationSound = useCallback(() => {
    if (soundEnabled && notificationSoundRef.current) {
      notificationSoundRef.current.currentTime = 0;
      notificationSoundRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  // Переключение звука
  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('todos_soundEnabled', String(newValue));
  };

  // Добавление комментария
  const addComment = useCallback(async (todoId: string, content: string) => {
    // Закомментировано - функциональность комментариев удалена
  }, []);

  // Редактирование комментария
  const updateComment = useCallback(async (todoId: string, commentId: string, newContent: string) => {
    // Закомментировано - функциональность комментариев удалена
  }, []);

  // Удаление комментария
  const deleteComment = useCallback(async (todoId: string, commentId: string) => {
    // Закомментировано - функциональность комментариев удалена
  }, []);

  // Ответ на комментарий
  const startReply = useCallback((comment: Comment) => {
    // Закомментировано - функциональность комментариев удалена
  }, []);

  // Создание менеджера уведомлений
  const notificationManager = useCallback(() => {
    const author = people.find(p => p.id === myAccountId);
    if (!myAccountId || !author) return null;
    return new TaskNotificationManager(myAccountId, author.name);
  }, [myAccountId, people]);

  // Создание уведомления о новой задаче
  const createTaskNotification = useCallback(async (
    todo: Todo,
    type: 'new_task' | 'assignment' | 'status_change' | 'assignee_response' | 'task_updated',
    changes?: { oldStatus?: string; oldAssignee?: string; newAssignee?: string; responseFrom?: 'assignee' | 'customer' }
  ) => {
    if (!myAccountId) return;
    
    const author = people.find(p => p.id === myAccountId);
    if (!author) return;

    const manager = notificationManager();
    if (!manager) return;

    // Собираем всех связанных пользователей
    const relatedUsers = getTaskRelatedUsers({
      authorId: todo.assignedById,
      assignedById: todo.assignedById,
      assignedToId: todo.assignedToId,
      assignedToIds: todo.assignedToIds
    });

    const statusBefore = getStatusLabel(changes?.oldStatus || 'todo');
    const statusAfter = getStatusLabel(todo.status || 'todo');
    const assigneeBefore = (changes?.oldAssignee || 'Не назначен').trim() || 'Не назначен';
    const assigneeAfter = (changes?.newAssignee || todo.assignedTo || 'Не назначен').trim() || 'Не назначен';

    const includeInitiator = type === 'status_change';
    const recipients = (type === 'assignee_response'
      ? changes?.responseFrom === 'customer'
        ? [todo.assignedToId, ...(todo.assignedToIds || [])]
        : [todo.assignedById]
      : relatedUsers
    ).filter((id): id is string => !!id && (includeInitiator || id !== myAccountId));

    const uniqueRecipients = Array.from(new Set(recipients));

    if (uniqueRecipients.length > 0) {
      const baseMessage =
        type === 'new_task'
          ? `${author.name} создал задачу`
          : type === 'assignment'
            ? `${author.name} изменил исполнителя: ${assigneeBefore} → ${assigneeAfter}`
            : type === 'status_change'
              ? `${author.name} изменил статус: ${statusBefore} → ${statusAfter}`
              : type === 'task_updated'
                ? `${author.name} изменил текст задачи`
                : changes?.responseFrom === 'customer'
                  ? `${author.name} изменил ответ заказчика`
              : `${author.name} ответил по задаче`;

      const nowIso = new Date().toISOString();
      const localNotifications: Notification[] = uniqueRecipients.map((toUserId, idx) => ({
        id: `notif-${Date.now()}-${idx}`,
        type,
        todoId: todo.id,
        todoTitle: todo.title,
        fromUserId: myAccountId,
        fromUserName: author.name,
        toUserId,
        message: baseMessage,
        read: false,
        createdAt: nowIso
      }));

      await Promise.all(localNotifications.map((notification) => saveNotification(notification)));
      setNotifications(prev => [...localNotifications, ...prev]);
      playNotificationSound();
    }

    // Отправляем уведомления в чат уведомлений
    switch (type) {
      case 'new_task':
        await manager.notifyNewTask(
          todo.assignedToId ? [todo.assignedToId] : [],
          todo.id,
          todo.title,
          todo.assignedById ?? undefined
        );
        break;
      case 'status_change':
        await manager.notifyStatusChanged(
          relatedUsers,
          todo.id,
          todo.title,
          changes?.oldStatus || 'todo',
          todo.status || 'todo',
          true
        );
        break;
      case 'assignment':
        await manager.notifyNewTask(
          todo.assignedToId ? [todo.assignedToId] : [],
          todo.id,
          todo.title,
          todo.assignedById ?? undefined
        );
        break;
      case 'task_updated':
        await manager.notifyTaskUpdated(
          relatedUsers,
          todo.id,
          todo.title
        );
        break;
    }
  }, [myAccountId, people, playNotificationSound, saveNotification, notificationManager]);

  // Пометить уведомление как прочитанное
  const markNotificationRead = useCallback(async (notifId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notifId ? { ...n, read: true } : n
    ));
    // Сохраняем в API
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notifId })
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Пометить все как прочитанные
  const markAllNotificationsRead = useCallback(async () => {
    if (!myAccountId) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    // Сохраняем в API
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true, userId: myAccountId })
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [myAccountId]);

  // 🚀 CRITICAL FIX: Мемоизируем уведомления (выполнялось при каждом render!)
  const myNotifications = useMemo(
    () => notifications.filter(n => n.toUserId === myAccountId), 
    [notifications, myAccountId]
  );
  const unreadCount = useMemo(
    () => myNotifications.filter(n => !n.read).length,
    [myNotifications]
  );

  // Открытие задачи по параметру URL ?task=ID
  useEffect(() => {
    const taskId = searchParams.get('task');
    
    console.log('[URL Task] taskId:', taskId, 'todos:', todos.length, 'isLoading:', isLoading, 'isClosing:', isClosingModalRef.current, 'hasOpened:', hasOpenedFromUrlRef.current);
    
    // Если есть taskId в URL и данные загружены
    if (taskId && !isLoading && !isClosingModalRef.current && !hasOpenedFromUrlRef.current) {
      const todo = todos.find(t => t.id === taskId);
      console.log('[URL Task] Found todo:', todo?.title);
      if (todo) {
        hasOpenedFromUrlRef.current = true; // Помечаем что уже открыли
        // Автозаполнение "От кого" если не указано и myAccount - заказчик
        const myAccount = myAccountId ? people.find(p => p.id === myAccountId) : null;
        let updatedTodo = todo;
        if (!todo.assignedById && myAccount && myAccount.role === 'customer') {
          updatedTodo = { ...todo, assignedById: myAccount.id, assignedBy: myAccount.name };
        }
        setEditingTodo(updatedTodo);
      }
    }
    
    // Сбрасываем флаги когда taskId убран из URL
    if (!taskId) {
      isClosingModalRef.current = false;
      hasOpenedFromUrlRef.current = false;
    }
  }, [searchParams, todos, isLoading, myAccountId, people]);

  // Отметка комментариев как прочитанных
  const markCommentsAsRead = useCallback(async (todo: Todo) => {
    if (!myAccountId || !todo.comments || todo.comments.length === 0) return;
    
    const lastComment = todo.comments[todo.comments.length - 1];
    const currentLastRead = todo.readCommentsByUser?.[myAccountId];
    
    // Если уже всё прочитано - не обновляем
    if (currentLastRead === lastComment.id) return;
    
    try {
      const updatedReadBy = {
        ...todo.readCommentsByUser,
        [myAccountId]: lastComment.id
      };
      
      await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todo.id,
          readCommentsByUser: updatedReadBy
        })
      });
      
      // Обновляем локальный state
      setTodos(prev => prev.map(t => 
        t.id === todo.id ? { ...t, readCommentsByUser: updatedReadBy } : t
      ));
    } catch (error) {
      console.error('Error marking comments as read:', error);
    }
  }, [myAccountId]);

  // Обновление URL при открытии/закрытии задачи
  const openTodoModal = useCallback((todo: Todo) => {
    // Автозаполнение "От кого" если не указано и myAccount - заказчик
    const myAccount = myAccountId ? people.find(p => p.id === myAccountId) : null;
    let updatedTodo = todo;
    if (!todo.assignedById && myAccount && myAccount.role === 'customer') {
      updatedTodo = { ...todo, assignedById: myAccount.id, assignedBy: myAccount.name };
    }
    setEditingTodo(updatedTodo);

    const finalizeOpen = () => {
      // Если мы на /account, сохраняем returnUrl
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath.startsWith('/account')) {
        setReturnUrl(currentPath);
        router.push(`/account?tab=tasks&task=${todo.id}&from=${encodeURIComponent(currentPath)}`, { scroll: false });
      } else {
        router.push(`/account?tab=tasks&task=${todo.id}`, { scroll: false });
      }

      // Отмечаем комментарии как прочитанные
      markCommentsAsRead(todo);
    };

    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
      window.requestAnimationFrame(finalizeOpen);
    } else {
      setTimeout(finalizeOpen, 0);
    }
  }, [myAccountId, people, router, markCommentsAsRead]);

  // Открытие задачи с загрузкой актуальных данных (для уведомлений)
  const openTodoModalWithFreshData = async (todoId: string) => {
    try {
      // Загружаем актуальные данные задачи
      const userId = myAccountId;
      const res = await fetch(`/api/todos${userId ? `?userId=${userId}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        const freshTodo = data.todos?.find((t: Todo) => t.id === todoId);
        
        if (freshTodo) {
          // Обновляем локальный state
          setTodos(data.todos || []);
          
          // Автозаполнение "От кого" если не указано
          const myAccount = myAccountId ? people.find(p => p.id === myAccountId) : null;
          let updatedTodo = freshTodo;
          if (!freshTodo.assignedById && myAccount && myAccount.role === 'customer') {
            updatedTodo = { ...freshTodo, assignedById: myAccount.id, assignedBy: myAccount.name };
          }
          
          setEditingTodo(updatedTodo);
          
          // Если мы на /account, сохраняем returnUrl
          const currentPath = window.location.pathname + window.location.search;
          if (currentPath.startsWith('/account')) {
            setReturnUrl(currentPath);
            router.push(`/account?tab=tasks&task=${todoId}&from=${encodeURIComponent(currentPath)}`, { scroll: false });
          } else {
            router.push(`/account?tab=tasks&task=${todoId}`, { scroll: false });
          }
          
          // Отмечаем комментарии как прочитанные
          markCommentsAsRead(freshTodo);
        }
      }
    } catch (error) {
      console.error('Error loading fresh todo data:', error);
      // Fallback к локальным данным
      const todo = todos.find(t => t.id === todoId);
      if (todo) {
        openTodoModal(todo);
      }
    }
  };

  const closeTodoModal = async () => {
    isClosingModalRef.current = true;
    setEditingTodo(null);
    // Возвращаемся туда, откуда пришли (календарь или список задач)
    router.push(returnUrl, { scroll: false });
    // Сбрасываем returnUrl после возврата
    setReturnUrl('/account?tab=tasks');
  };

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
      if (executorFilterRef.current && !executorFilterRef.current.contains(event.target as Node)) {
        setExecutorDropdownOpen(false);
      }
      if (departmentFilterRef.current && !departmentFilterRef.current.contains(event.target as Node)) {
        setDepartmentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Глобальный сброс состояния перетаскивания при mouseup за пределами элемента
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingBoard) {
        setIsDraggingBoard(false);
        if (boardRef.current) {
          boardRef.current.style.cursor = 'grab';
          boardRef.current.style.userSelect = 'auto';
        }
      }
    };
    
    const handleWindowBlur = () => {
      if (isDraggingBoard) {
        setIsDraggingBoard(false);
        if (boardRef.current) {
          boardRef.current.style.cursor = 'grab';
          boardRef.current.style.userSelect = 'auto';
        }
      }
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('blur', handleWindowBlur);
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isDraggingBoard]);

  // Сброс дропдаунов модалки при закрытии
  useEffect(() => {
    if (!editingTodo) {
      setOpenDropdown(null);
    }
  }, [editingTodo]);

  // Блокировка скролла при открытой модалке
  useEffect(() => {
    const isModalOpen = editingTodo || showCategoryManager || showPeopleManager;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [editingTodo, showCategoryManager, showPeopleManager]);

  // Hover preview handlers
  const handleTodoMouseEnter = (e: React.MouseEvent, todo: Todo) => {
    if (!todo.description && !todo.reviewComment) return; // Нет смысла показывать пустое превью
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setHoverPosition({ 
        x: rect.right + 10, 
        y: rect.top 
      });
      setHoveredTodo(todo);
    }, 400); // Задержка 400мс перед показом
  };
  
  const handleTodoMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredTodo(null);
  };

  // Добавление задачи
  const addTodo = useCallback(async (listId: string) => {
    if (!newTodoTitle.trim()) {
      console.log('[addTodo] Empty title, returning');
      return;
    }
    
    console.log('[addTodo] === START ===');
    console.log('[addTodo] listId:', listId);
    console.log('[addTodo] title:', newTodoTitle);
    console.log('[addTodo] description:', newTodoDescription);
    console.log('[addTodo] newTodoAssigneeId:', newTodoAssigneeId);
    
    // Получаем данные myAccount для автозаполнения
    const myAccount = myAccountId ? people.find(p => p.id === myAccountId) : null;
    const isExecutor = myAccount && myAccount.role === 'executor';
    const isCustomer = myAccount && (myAccount.role === 'customer' || myAccount.role === 'universal');
    
    // Если выбран исполнитель вручную - используем его
    const selectedAssignee = newTodoAssigneeId ? people.find(p => p.id === newTodoAssigneeId) : null;
    
    const payload = {
      title: newTodoTitle,
      description: newTodoDescription,
      listId: listId,
      priority: 'medium',
      status: 'pending',
      // Если выбран исполнитель вручную - используем его
      ...(selectedAssignee && { assignedToId: selectedAssignee.id, assignedTo: selectedAssignee.name }),
      // Иначе если текущий пользователь исполнитель - ставим его
      ...(!selectedAssignee && isExecutor && { assignedToId: myAccount.id, assignedTo: myAccount.name }),
      // Если руководитель/универсал - ставим его постановщиком
      ...(isCustomer && { assignedById: myAccount.id, assignedBy: myAccount.name })
    };
    
    console.log('[addTodo] Sending payload:', payload);
    
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log('[addTodo] Response status:', res.status);
      console.log('[addTodo] Response ok:', res.ok);
      
      if (res.ok) {
        const newTodo = await res.json();
        console.log('[addTodo] Created todo:', newTodo);
        
        // Оптимистичное обновление: добавляем задачу в стейт
        setTodos(prev => [newTodo, ...prev]);
        
        // Очищаем форму
        setNewTodoTitle('');
        setNewTodoDescription('');
        setNewTodoAssigneeId(null);
        setShowNewTodoAssigneeDropdown(false);
        setAddingToList(null);
        
        // Отправляем уведомление исполнителю о новой задаче
        if (newTodo.assignedToId) {
          createTaskNotification(newTodo, 'new_task');
        }
        
        console.log('[addTodo] === SUCCESS ===');
      } else {
        const errorText = await res.text();
        console.error('[addTodo] Response not OK:', errorText);
        alert('Ошибка при создании задачи: ' + errorText);
      }
    } catch (error) {
      console.error('[addTodo] Error:', error);
      alert('Ошибка при создании задачи: ' + error);
    }
  }, [newTodoTitle, newTodoDescription, newTodoAssigneeId, myAccountId, people, createTaskNotification, loadData]);

  const removeCalendarEventForTodo = useCallback(async (todo: Todo) => {
    if (!todo.calendarEventId) return;

    try {
      await fetch(`/api/calendar-events/${todo.calendarEventId}`, { method: 'DELETE' });
      await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: todo.id, calendarEventId: null, addToCalendar: false })
      });
    } catch (error) {
      console.error('Error removing calendar event:', error);
    }
  }, []);

  // Переключение статуса задачи
  const toggleTodo = useCallback(async (todo: Todo) => {
    try {
      const nextCompleted = !todo.completed;
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todo.id,
          completed: nextCompleted
        })
      });
      
      if (res.ok) {
        setTodos(prev => prev.map(t => 
          t.id === todo.id
            ? {
                ...t,
                completed: nextCompleted,
                ...(nextCompleted && t.calendarEventId ? { calendarEventId: undefined, addToCalendar: false } : {})
              }
            : t
        ));

        if (nextCompleted && todo.calendarEventId) {
          await removeCalendarEventForTodo({ ...todo, completed: nextCompleted });
        }
      }
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  }, []);

  // Обновление задачи
  const updateTodo = async (todo: Todo) => {
    try {
      // Проверяем, является ли задача новой (temp-id)
      const isNewTodo = todo.id.startsWith('temp-');
      
      console.log('[updateTodo] ' + (isNewTodo ? '🆕 Creating' : '✏️ Updating') + ' task:', todo.id);
      console.log('[updateTodo] Task data keys:', Object.keys(todo).filter(k => todo[k as keyof Todo] !== undefined));
      
      if (todo.stageMeta) {
        console.log('[updateTodo] 📊 stageMeta being sent:', todo.stageMeta);
      }
      
      // Получаем текущую версию задачи для сравнения статуса (только для существующих задач)
      const currentTodo = !isNewTodo ? todos.find(t => t.id === todo.id) : null;
      const statusChanged = currentTodo && currentTodo.status !== todo.status;
      const oldStatus = currentTodo?.status;
      const oldAssigneeName = currentTodo?.assignedTo || 'Не назначен';
      const newAssigneeName = todo.assignedTo || 'Не назначен';
      
      console.log('[updateTodo] Sending ' + (isNewTodo ? 'POST' : 'PUT') + ' request');
      
      const bodyData = isNewTodo ? {
        ...todo,
        id: undefined, // Удаляем temp-id для создания
      } : todo;
      
      console.log('[updateTodo] Request body ID:', bodyData.id, 'keys:', Object.keys(bodyData).length);
      
      const res = await fetch('/api/todos', {
        method: isNewTodo ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      
      console.log('[updateTodo] Response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[updateTodo] ❌ Error response:', errorText);
      }
      
      if (res.ok) {
        let updated = await res.json();
        
        console.log('[updateTodo] ✅ Server returned task:', updated.id);
        if (updated.stageMeta) {
          console.log('[updateTodo] 📊 stageMeta received from server:', updated.stageMeta);
          console.log('🔍 Full stageMeta from server:', JSON.stringify(updated.stageMeta, null, 2));
        }
        if (updated.metadata?.stageMeta) {
          console.log('🔍 metadata.stageMeta from server:', JSON.stringify(updated.metadata.stageMeta, null, 2));
        }
        
        // Если включена опция "Поместить на календарь" и ещё не добавлено
        if (todo.addToCalendar && !updated.calendarEventId) {
          const calendarResult = await sendToCalendar(updated);
          if (calendarResult) {
            // Обновляем задачу с calendarEventId
            updated = { ...updated, calendarEventId: calendarResult };
          }
        }

        if (updated.calendarEventId && (updated.completed || updated.archived)) {
          await removeCalendarEventForTodo(updated);
          updated = { ...updated, calendarEventId: undefined, addToCalendar: false };
        }
        
        // Отправляем уведомление при изменении статуса
        if (statusChanged) {
          createTaskNotification(todo, 'status_change', { oldStatus: oldStatus || undefined });
        }

        // Отправляем уведомление при изменении текста задачи
        const taskTextChanged = currentTodo && (
          String(currentTodo.title || '').trim() !== String(todo.title || '').trim()
          || String(currentTodo.description || '').trim() !== String(todo.description || '').trim()
        );
        if (taskTextChanged) {
          createTaskNotification(todo, 'task_updated');
        }
        
        // Отправляем уведомление при назначении/смене исполнителя
        const assigneeChanged = currentTodo && currentTodo.assignedToId !== todo.assignedToId;
        if (assigneeChanged && todo.assignedToId) {
          createTaskNotification(todo, 'assignment', {
            oldAssignee: oldAssigneeName,
            newAssignee: newAssigneeName
          });
        }

        // Отправляем уведомление при ответе исполнителя
        const responseChanged = currentTodo && currentTodo.assigneeResponse !== todo.assigneeResponse;
        if (responseChanged) {
          createTaskNotification(todo, 'assignee_response', { responseFrom: 'assignee' });
        }

        // Отправляем уведомление при изменении ответа заказчика
        const customerResponseChanged = currentTodo && currentTodo.reviewComment !== todo.reviewComment;
        if (customerResponseChanged) {
          createTaskNotification(todo, 'assignee_response', { responseFrom: 'customer' });
        }
        
        // Для новых задач - добавляем, для существующих - обновляем
        if (isNewTodo) {
          setTodos(prev => [...prev, updated]);
          // Отправляем уведомление о создании
          if (todo.assignedToId) {
            createTaskNotification(updated, 'assignment');
          }
        } else {
          setTodos(prev => prev.map(t => t.id === todo.id ? updated : t));
        }
        
        closeTodoModal();
      }
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  // Отправка задачи на календарь
  const sendToCalendar = async (todo: Todo): Promise<string | null> => {
    try {
      const list = lists.find(l => l.id === todo.listId);
      const isTZ = todo.listId === TZ_LIST_ID;
      const selectedCalendar = calendarLists.find(cl => cl.id === todo.calendarListId);
      const targetCalendar = selectedCalendar && !isSharedCalendarList(selectedCalendar)
        ? selectedCalendar
        : (personalCalendarLists[0] || null);

      if (!targetCalendar) {
        alert('Для задачи нужно выбрать личный календарь. Общий календарь для задач недоступен.');
        return null;
      }

      const baseDate = todo.dueDate || new Date().toISOString().split('T')[0];
      const datesToAdd: string[] = [baseDate];

      if (todo.recurrence && todo.recurrence !== 'once') {
        const startDate = new Date(baseDate);
        const limitDate = new Date(startDate);
        limitDate.setFullYear(startDate.getFullYear() + 2);
        let currentDate = new Date(startDate);

        for (let i = 0; i < 365; i++) {
          const nextDate = new Date(currentDate);
          if (todo.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
          else if (todo.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          else if (todo.recurrence === 'biweekly') nextDate.setDate(nextDate.getDate() + 14);
          else if (todo.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
          else if (todo.recurrence === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
          else if (todo.recurrence === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

          if (nextDate > limitDate) break;
          datesToAdd.push(nextDate.toISOString().split('T')[0]);
          currentDate = nextDate;
        }
      }
      
      // Формат для локального API calendar-events
      const results = await Promise.all(datesToAdd.map(async (date) => {
        const eventData = {
          title: todo.title,
          description: [
            todo.description ? todo.description.replace(/<[^>]*>/g, ' ') : '',
            todo.assignedTo ? `Исполнитель: ${todo.assignedTo}` : '',
            todo.assignedBy ? `Постановщик: ${todo.assignedBy}` : '',
            list?.name ? `Список: ${list.name}` : '',
            todo.linkUrl ? `Ссылка: ${todo.linkUrl}` : ''
          ].filter(Boolean).join('\n'),
          date,
          priority: todo.priority || 'medium',
          type: isTZ ? 'tz' : 'task',
          recurrence: todo.recurrence || 'once',
          listId: targetCalendar.id,
          sourceId: todo.id,
          assignedTo: todo.assignedTo,
          assignedBy: todo.assignedBy,
          listName: list?.name,
          linkUrl: todo.linkUrl,
          linkTitle: todo.linkTitle
        };

        const response = await fetch('/api/calendar-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Calendar error');
        }

        return response.json();
      }));

      const calendarEventId = results[0]?.id;
      if (calendarEventId) {
        await fetch('/api/todos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: todo.id, calendarEventId })
        });
      }
      return calendarEventId || null;
    } catch (error) {
      console.error('Error sending to calendar:', error);
      alert('Не удалось связаться с сервером календаря');
      return null;
    }
  };

  // Удаление задачи
  const deleteTodo = useCallback(async (id: string) => {
    const targetTodo = todos.find(t => t.id === id);
    const todoName = targetTodo?.title || 'Задача';
    
    if (!confirm(`Удалить задачу "${todoName}"? Это действие нельзя отменить.`)) {
      return false;
    }
    
    try {
      const res = await fetch(`/api/todos?id=${id}`, { method: 'DELETE' });
      
      if (res.ok) {
        if (targetTodo?.calendarEventId) {
          await removeCalendarEventForTodo(targetTodo);
        }
        setTodos(prev => prev.filter(t => t.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting todo:', error);
      return false;
    }
  }, [todos, removeCalendarEventForTodo]);

  // Добавление списка
  const addList = async () => {
    console.log('[addList] === START ===');
    console.log('[addList] Called with name:', newListName);
    console.log('[addList] myAccountId:', myAccountId);
    console.log('[addList] newListColor:', newListColor);
    console.log('[addList] newListAssigneeId:', newListAssigneeId);
    console.log('[addList] newListStagesEnabled:', newListStagesEnabled);
    
    if (!newListName.trim()) {
      console.log('[addList] Name is empty, returning');
      return;
    }
    
    // Получаем данные выбранного исполнителя
    const selectedAssignee = newListAssigneeId ? people.find(p => p.id === newListAssigneeId) : null;
    
    try {
      const payload = {
        type: 'list',
        name: newListName,
        color: newListColor,
        icon: 'folder',
        creatorId: myAccountId,
        stagesEnabled: newListStagesEnabled,
        // Добавляем исполнителя по умолчанию если выбран
        ...(selectedAssignee && { defaultAssigneeId: selectedAssignee.id, defaultAssignee: selectedAssignee.name })
      };
      console.log('[addList] Sending POST request with payload:', payload);
      
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log('[addList] Response status:', res.status);
      console.log('[addList] Response ok:', res.ok);
      
      if (res.ok) {
        const newList = await res.json();
        console.log('[addList] Created list:', newList);
        
        // Перезагружаем данные с сервера для правильной фильтрации
        await loadData();
        
        // Переключаемся на новый список на мобильных
        if (windowWidth < 550) {
          // Новый список будет последним в отфильтрованном списке
          const newIndex = nonArchivedLists.length; // Так как новый список ещё не в lists, он будет добавлен после loadData
          setSelectedColumnIndex(newIndex);
        }
        
        setNewListName('');
        setNewListAssigneeId(null);
        setNewListStagesEnabled(false);
        setShowAddList(false);
        // Сразу открываем настройки нового списка
        setEditingList(newList);
        setShowAddList(true);
        console.log('[addList] === SUCCESS ===');
      } else {
        const errorText = await res.text();
        console.error('[addList] Response not OK:', errorText);
        console.error('[addList] === FAILED (not ok) ===');
      }
    } catch (error) {
      console.error('[addList] Error:', error);
      console.error('[addList] === FAILED (exception) ===');
    }
  };

  // Удаление списка
  const deleteList = async (id: string) => {
    const targetList = lists.find(l => l.id === id);
    const listName = targetList?.name || 'Список';
    const tasksInList = todos.filter(t => t.listId === id).length;
    
    const message = tasksInList > 0 
      ? `Удалить список "${listName}"? В нем ${tasksInList} задач(и). Задачи будут перемещены в другой список.`
      : `Удалить список "${listName}"?`;
    
    if (!confirm(message)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/todos?id=${id}&type=list`, { method: 'DELETE' });
      
      if (res.ok) {
        setLists(prev => prev.filter(l => l.id !== id));
        loadData();
      }
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  };

  // Добавление категории
  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'category',
          name: newCategoryName,
          color: newCategoryColor,
          icon: newCategoryIcon
        })
      });
      
      if (res.ok) {
        const newCat = await res.json();
        setCategories(prev => [...prev, newCat]);
        setNewCategoryName('');
        setNewCategoryColor('#6366f1');
        setNewCategoryIcon('tag');
        setShowAddCategory(false);
      }
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  // Обновление категории
  const updateCategory = async (category: TodoCategory) => {
    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: category.id,
          type: 'category',
          name: category.name,
          color: category.color,
          icon: category.icon
        })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setCategories(prev => prev.map(c => c.id === category.id ? updated : c));
        setEditingCategory(null);
      }
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  // Удаление категории
  const deleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/todos?id=${id}&type=category`, { method: 'DELETE' });
      
      if (res.ok) {
        setCategories(prev => prev.filter(c => c.id !== id));
        loadData();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  // Добавление человека (исполнитель/заказчик)
  const addPerson = async () => {
    if (!newPersonName.trim()) return;
    
    try {
      const res = await fetch('/api/todos/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPersonName,
          telegramId: newPersonTelegramId || undefined,
          telegramUsername: newPersonTelegramUsername || undefined,
          role: newPersonRole
        })
      });
      
      if (res.ok) {
        const newPerson = await res.json();
        setPeople(prev => [...prev, newPerson]);
        setNewPersonName('');
        setNewPersonTelegramId('');
        setNewPersonTelegramUsername('');
      }
    } catch (error) {
      console.error('Error adding person:', error);
    }
  };

  // Обновление человека
  const updatePerson = async (person: Person) => {
    try {
      const res = await fetch('/api/todos/people', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(person)
      });
      
      if (res.ok) {
        const updated = await res.json();
        setPeople(prev => prev.map(p => p.id === person.id ? updated : p));
        setEditingPerson(null);
      }
    } catch (error) {
      console.error('Error updating person:', error);
    }
  };

  // Удаление человека
  const deletePerson = async (id: string) => {
    try {
      const res = await fetch(`/api/todos/people?id=${id}`, { method: 'DELETE' });
      
      if (res.ok) {
        setPeople(prev => prev.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Error deleting person:', error);
    }
  };

  // Обновление списка (переименование)
  const updateList = async (list: TodoList) => {
    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: list.id,
          type: 'list',
          name: list.name,
          color: list.color,
          order: list.order,
          archived: list.archived,
          defaultExecutorId: list.defaultExecutorId,
          defaultCustomerId: list.defaultCustomerId,
          defaultAddToCalendar: list.defaultAddToCalendar,
          allowedDepartments: list.allowedDepartments,
          allowedUsers: list.allowedUsers
        })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setLists(prev => prev.map(l => l.id === list.id ? updated : l));
      }
    } catch (error) {
      console.error('Error updating list:', error);
    }
  };

  // Архивирование/разархивирование списка
  const toggleArchiveList = async (listId: string, archive: boolean) => {
    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: listId,
          type: 'list',
          archived: archive
        })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setLists(prev => prev.map(l => l.id === listId ? updated : l));
      }
    } catch (error) {
      console.error('Error archiving list:', error);
    }
  };

  // Архивирование/разархивирование задачи
  const toggleArchiveTodo = useCallback(async (todoId: string, archive: boolean) => {
    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todoId,
          archived: archive
        })
      });
      
      if (res.ok) {
        const updated = await res.json();
        if (archive && updated.calendarEventId) {
          await removeCalendarEventForTodo(updated);
        }
        const cleaned = archive && updated.calendarEventId
          ? { ...updated, calendarEventId: undefined, addToCalendar: false }
          : updated;
        setTodos(prev => prev.map(t => t.id === todoId ? cleaned : t));
      }
    } catch (error) {
      console.error('Error archiving todo:', error);
    }
  }, [todos, removeCalendarEventForTodo]);

  // Обновление порядка списков
  const updateListsOrder = useCallback(async (reorderedLists: TodoList[]) => {
    try {
      const orderedIds = reorderedLists.map((list) => list.id);

      setLists((prevLists) => {
        const reorderedMap = new Map(reorderedLists.map((list) => [list.id, list]));
        const archivedLists = prevLists.filter((list) => list.archived);

        const activeLists = orderedIds
          .map((id, index) => {
            const list = reorderedMap.get(id);
            if (!list) return null;
            return { ...list, order: index };
          })
          .filter((list): list is TodoList => Boolean(list));

        return [...activeLists, ...archivedLists];
      });
      
      // Отправляем обновления на сервер
      await Promise.all(reorderedLists.map(async (list, index) => {
        const response = await fetch('/api/todos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: list.id,
            type: 'list',
            order: index
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to update list order for ${list.id}`);
        }
      }));
    } catch (error) {
      console.error('Error updating lists order:', error);
      loadData(); // Перезагружаем при ошибке
    }
  }, [loadData]);

  const moveListByOffset = useCallback((listId: string, offset: -1 | 1) => {
    const currentNonArchivedLists = lists.filter((list) => !list.archived).sort((a, b) => a.order - b.order);
    const currentIndex = currentNonArchivedLists.findIndex((list) => list.id === listId);
    if (currentIndex === -1) return;

    const nextIndex = currentIndex + offset;
    if (nextIndex < 0 || nextIndex >= currentNonArchivedLists.length) return;

    const reordered = [...currentNonArchivedLists];
    const [movedList] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, movedList);

    const updated = reordered.map((list, index) => ({ ...list, order: index }));
    updateListsOrder(updated);
  }, [lists, updateListsOrder]);

  // Обновление настроек Telegram
  const updateTelegramSettings = async () => {
    try {
      const res = await fetch('/api/todos/telegram', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramToken,
          enabled: telegramEnabled
        })
      });
      
      if (res.ok) {
        setShowTelegramSettings(false);
        setTelegramToken('');
      }
    } catch (error) {
      console.error('Error updating telegram settings:', error);
    }
  };

  // Drag and Drop handlers for todos
  const handleDragStart = useCallback((e: React.DragEvent, todo: Todo) => {
    setDraggedList(null);
    setDraggedTodo(todo);
    dragPayloadRef.current = { type: 'todo', id: todo.id };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `todo:${todo.id}`);
    e.dataTransfer.setData('application/x-shar-dnd-type', 'todo');
    e.dataTransfer.setData('type', 'todo');
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    dragPayloadRef.current = { type: null, id: null };
    setDraggedTodo(null);
    setDragOverListId(null);
    setDragOverTodoId(null);
    setDraggedList(null);
    setDragOverListOrder(null);
    dragOverTodoInsertAfterRef.current = false;
    dragCounter.current = 0;
    // Сбрасываем состояние скролла доски
    setIsDraggingBoard(false);
    if (boardRef.current) {
      boardRef.current.style.cursor = 'grab';
      boardRef.current.style.userSelect = 'auto';
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, listId: string) => {
    e.preventDefault();
    if (draggedTodo) {
      dragCounter.current++;
      setDragOverListId(listId);
    }
  }, [draggedTodo]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (draggedTodo) {
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setDragOverListId(null);
      }
    }
  }, [draggedTodo]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const getDragPayload = useCallback((e: React.DragEvent) => {
    const raw = e.dataTransfer.getData('text/plain');
    const explicitType =
      e.dataTransfer.getData('application/x-shar-dnd-type') ||
      e.dataTransfer.getData('type');

    let parsedType: 'todo' | 'list' | null = null;
    let parsedId: string | null = null;

    if (raw) {
      if (raw.startsWith('todo:')) {
        parsedType = 'todo';
        parsedId = raw.slice(5);
      } else if (raw.startsWith('list:')) {
        parsedType = 'list';
        parsedId = raw.slice(5);
      } else {
        parsedId = raw;
      }
    }

    const type =
      (explicitType as 'todo' | 'list' | '') ||
      parsedType ||
      dragPayloadRef.current.type;

    const id =
      parsedId ||
      dragPayloadRef.current.id;

    return { type: type || null, id: id || null };
  }, []);

  // Обработчик перетаскивания над задачей (для вертикального изменения порядка)
  const handleTodoDragOver = useCallback((e: React.DragEvent, todoId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const payload = getDragPayload(e);
    const dragType = payload.type;
    const draggedTodoId = draggedTodo?.id || payload.id;

    if (dragType === 'todo' && draggedTodoId && draggedTodoId !== todoId) {
      const targetRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      dragOverTodoInsertAfterRef.current = e.clientY > targetRect.top + targetRect.height / 2;
      setDragOverTodoId(todoId);
    }
  }, [draggedTodo, getDragPayload]);

  const persistTodos = useCallback(async (updatedItems: Todo[]) => {
    await Promise.all(
      updatedItems.map((item) =>
        fetch('/api/todos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        })
      )
    );
  }, []);

  const reorderTodoRelativeToTarget = useCallback(async (draggedTodoId: string, targetTodo: Todo, insertAfter: boolean) => {
    const sourceTodo = todos.find((item) => item.id === draggedTodoId);
    if (!sourceTodo || sourceTodo.id === targetTodo.id) return;

    const targetListTodos = todos
      .filter((item) => item.listId === targetTodo.listId && !item.archived && item.id !== draggedTodoId)
      .sort((a, b) => a.order - b.order);

    const targetIndex = targetListTodos.findIndex((item) => item.id === targetTodo.id);
    if (targetIndex === -1) return;

    const insertIndex = Math.min(targetListTodos.length, Math.max(0, targetIndex + (insertAfter ? 1 : 0)));

    const destinationWithMoved = [...targetListTodos];
    destinationWithMoved.splice(insertIndex, 0, { ...sourceTodo, listId: targetTodo.listId });

    const reindexedDestination = destinationWithMoved.map((item, index) => ({
      ...item,
      listId: targetTodo.listId,
      order: index,
    }));

    const sourceListChanged = sourceTodo.listId !== targetTodo.listId;
    const reindexedSource = sourceListChanged
      ? todos
          .filter((item) => item.listId === sourceTodo.listId && !item.archived && item.id !== draggedTodoId)
          .sort((a, b) => a.order - b.order)
          .map((item, index) => ({ ...item, order: index }))
      : [];

    const updatedMap = new Map<string, Todo>();
    [...reindexedDestination, ...reindexedSource].forEach((item) => updatedMap.set(item.id, item));

    setTodos((prev) => prev.map((item) => updatedMap.get(item.id) || item));

    try {
      await persistTodos(Array.from(updatedMap.values()));
    } catch (error) {
      console.error('Error reordering todos:', error);
      loadData();
    }

    setDraggedTodo(null);
    setDragOverTodoId(null);
    setDragOverListId(null);
    dragOverTodoInsertAfterRef.current = false;
    dragPayloadRef.current = { type: null, id: null };
  }, [loadData, persistTodos, todos]);

  // Обработчик drop на задачу (для вертикального изменения порядка)
  const handleTodoDrop = useCallback(async (e: React.DragEvent, targetTodo: Todo) => {
    e.preventDefault();
    e.stopPropagation();

    const payload = getDragPayload(e);
    const dragType = payload.type;
    if (dragType !== 'todo') return;

    const draggedTodoId = draggedTodo?.id || payload.id;
    if (!draggedTodoId || draggedTodoId === targetTodo.id) return;

    const targetRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const insertAfter = e.clientY > targetRect.top + targetRect.height / 2;
    await reorderTodoRelativeToTarget(draggedTodoId, targetTodo, insertAfter);
  }, [draggedTodo, getDragPayload, reorderTodoRelativeToTarget]);

  const handleDrop = useCallback(async (e: React.DragEvent, listId: string) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOverListId(null);
    setDragOverTodoId(null);

    const payload = getDragPayload(e);
    const dragType = payload.type;
    if (dragType !== 'todo') return;

    const draggedTodoId = draggedTodo?.id || payload.id;
    if (!draggedTodoId) return;

    if (dragOverTodoId) {
      const targetTodo = todos.find((item) => item.id === dragOverTodoId && item.listId === listId && !item.archived);
      if (targetTodo && targetTodo.id !== draggedTodoId) {
        await reorderTodoRelativeToTarget(draggedTodoId, targetTodo, dragOverTodoInsertAfterRef.current);
        return;
      }
    }

    const sourceTodo = todos.find((item) => item.id === draggedTodoId);
    if (!sourceTodo) return;

    const destinationTodos = todos
      .filter((item) => item.listId === listId && !item.archived && item.id !== draggedTodoId)
      .sort((a, b) => a.order - b.order);

    destinationTodos.push({ ...sourceTodo, listId });

    const reindexedDestination = destinationTodos.map((item, index) => ({ ...item, listId, order: index }));
    const sourceListChanged = sourceTodo.listId !== listId;

    const reindexedSource = sourceListChanged
      ? todos
          .filter((item) => item.listId === sourceTodo.listId && !item.archived && item.id !== draggedTodoId)
          .sort((a, b) => a.order - b.order)
          .map((item, index) => ({ ...item, order: index }))
      : [];

    const updatedMap = new Map<string, Todo>();
    [...reindexedDestination, ...reindexedSource].forEach((item) => updatedMap.set(item.id, item));

    setTodos((prev) => prev.map((item) => updatedMap.get(item.id) || item));

    try {
      await persistTodos(Array.from(updatedMap.values()));
    } catch (error) {
      console.error('Error moving todo to list:', error);
      loadData();
    }

    setDraggedTodo(null);
    dragOverTodoInsertAfterRef.current = false;
    dragPayloadRef.current = { type: null, id: null };
  }, [dragOverTodoId, draggedTodo, getDragPayload, loadData, persistTodos, reorderTodoRelativeToTarget, todos]);

  // Drag and Drop handlers for lists
  const handleListDragStart = useCallback((e: React.DragEvent, list: TodoList) => {
    e.stopPropagation();
    setDraggedTodo(null);
    setDraggedList(list);
    dragPayloadRef.current = { type: 'list', id: list.id };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `list:${list.id}`);
    e.dataTransfer.setData('application/x-shar-dnd-type', 'list');
    e.dataTransfer.setData('type', 'list');
  }, []);

  const handleListDragEnd = useCallback((e: React.DragEvent) => {
    dragPayloadRef.current = { type: null, id: null };
    setDraggedList(null);
    setDragOverListOrder(null);
  }, []);

  const handleListDragOver = useCallback((e: React.DragEvent, targetList: TodoList) => {
    e.preventDefault();
    e.stopPropagation();

    const payload = getDragPayload(e);
    const dragType = payload.type;
    const draggedListId = draggedList?.id || payload.id;

    if (dragType === 'list' && draggedListId && draggedListId !== targetList.id) {
      setDragOverListOrder(targetList.order);
    }
  }, [draggedList, getDragPayload]);

  const handleListDrop = useCallback((e: React.DragEvent, targetList: TodoList) => {
    e.preventDefault();
    e.stopPropagation();

    const payload = getDragPayload(e);
    const dragType = payload.type;
    if (dragType !== 'list') return;

    const draggedListId = draggedList?.id || payload.id;
    
    if (draggedListId && draggedListId !== targetList.id) {
      const currentNonArchivedLists = lists.filter(l => !l.archived).sort((a, b) => a.order - b.order);
      const draggedIndex = currentNonArchivedLists.findIndex(l => l.id === draggedListId);
      const targetIndex = currentNonArchivedLists.findIndex(l => l.id === targetList.id);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const reordered = [...currentNonArchivedLists];
        const [removed] = reordered.splice(draggedIndex, 1);
        reordered.splice(targetIndex, 0, removed);
        
        // Обновляем order для каждого списка
        const updated = reordered.map((list, index) => ({ ...list, order: index }));
        updateListsOrder(updated);
      }
    }
    
    setDraggedList(null);
    setDragOverListOrder(null);
    dragPayloadRef.current = { type: null, id: null };
  }, [draggedList, getDragPayload, lists, updateListsOrder]);

  useEffect(() => {
    const resetListDragState = () => {
      dragPayloadRef.current = { type: null, id: null };
      setDraggedList(null);
      setDragOverListOrder(null);
    };

    window.addEventListener('dragend', resetListDragState);
    window.addEventListener('drop', resetListDragState);

    return () => {
      window.removeEventListener('dragend', resetListDragState);
      window.removeEventListener('drop', resetListDragState);
    };
  }, []);

  // Drag to scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Только для desktop
    if (windowWidth < 550) return;
    // Не начинаем scroll если идёт перетаскивание задачи или списка
    if (!boardRef.current || draggedTodo || draggedList) return;
    // Не начинаем scroll если клик был на интерактивном элементе
    const target = e.target as HTMLElement;
    if (target.closest('button, input, [draggable="true"], a')) return;
    setIsDraggingBoard(true);
    setStartX(e.pageX - boardRef.current.offsetLeft);
    setScrollLeft(boardRef.current.scrollLeft);
    boardRef.current.style.cursor = 'grabbing';
    boardRef.current.style.userSelect = 'none';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Не двигаем если идёт перетаскивание задачи или списка
    if (!isDraggingBoard || !boardRef.current || draggedTodo || draggedList) return;
    e.preventDefault();
    const x = e.pageX - boardRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    boardRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDraggingBoard(false);
    if (boardRef.current) {
      boardRef.current.style.cursor = 'grab';
      boardRef.current.style.userSelect = 'auto';
    }
  };

  const handleMouseLeave = () => {
    if (isDraggingBoard) {
      setIsDraggingBoard(false);
      if (boardRef.current) {
        boardRef.current.style.cursor = 'grab';
        boardRef.current.style.userSelect = 'auto';
      }
    }
  };

  // Фильтрация задач по поиску, статусу, исполнителю и правам доступа
  const filterTodos = (todoList: Todo[], listId?: string) => {
    return todoList.filter(todo => {
      if (!showCompleted && todo.completed) return false;
      
      // Фильтр по статусу
      if (filterStatus !== 'all') {
        if (filterStatus === 'stages') {
          if (!todo.stagesEnabled) return false;
        } else {
          if (todo.stagesEnabled) return false;
          if (todo.status !== filterStatus) return false;
        }
      }
      
      // Фильтр по исполнителю (включая множественных)
      if (filterExecutor !== null) {
        const matchesFilter = todo.assignedToId === filterExecutor || todo.assignedToIds?.includes(filterExecutor);
        if (!matchesFilter) return false;
      }

      // Фильтр по отделу
      if (filterDepartment !== 'all') {
        const assigneeIds = new Set<string>();
        if (todo.assignedToId) assigneeIds.add(todo.assignedToId);
        if (Array.isArray(todo.assignedToIds)) {
          todo.assignedToIds.forEach(id => assigneeIds.add(id));
        }
        const hasDepartmentMatch = Array.from(assigneeIds).some(assigneeId => {
          const person = people.find(p => p.id === assigneeId);
          return person?.department?.trim() === filterDepartment;
        });
        if (!hasDepartmentMatch) return false;
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return todo.title.toLowerCase().includes(query) || 
               todo.description?.toLowerCase().includes(query);
      }
      return true;
    });
  };

  // Получение задач для списка (исключая архивные) - ИСПОЛЬЗУЕТ МЕМОИЗИРОВАННЫЕ ДАННЫЕ
  const getTodosForList = useCallback((listId: string, includeArchived: boolean = false) => {
    const cached = filteredTodosByListId[listId];
    if (cached) return cached;
    
    // Fallback (не должно использоваться при нормальной работе)
    const listTodos = todos.filter(t => t.listId === listId && (includeArchived || !t.archived));
    return filterTodos(listTodos, listId);
  }, [filteredTodosByListId, todos]);

  // Получение архивных задач
  const getArchivedTodos = () => {
    return todos.filter(t => t.archived);
  };

  // 🚀 CRITICAL FIX: Мемоизируем неархивные списки (вызывалось 8+ раз без кэша!)
  const nonArchivedLists = useMemo(
    () => lists.filter(l => !l.archived).sort((a, b) => a.order - b.order),
    [lists]
  );

  const peopleNameById = useMemo(() => {
    const map: Record<string, string> = {};
    people.forEach((person) => {
      map[person.id] = person.name || person.username || person.id;
    });
    return map;
  }, [people]);

  const hasActiveBoardFilters = useMemo(
    () => Boolean(searchQuery || filterExecutor || filterDepartment !== 'all' || filterStatus !== 'all'),
    [searchQuery, filterExecutor, filterDepartment, filterStatus]
  );

  const visibleNonArchivedLists = useMemo(() => {
    return nonArchivedLists.filter((list) => {
      const filteredTodos = filteredTodosByListId[list.id] || [];

      if (!canSeeAllTasks && myAccountId) {
        const hasFullAccess = list.creatorId === myAccountId ||
          (list.allowedUsers && list.allowedUsers.includes(myAccountId)) ||
          (myDepartment && list.allowedDepartments && list.allowedDepartments.includes(myDepartment));

        if (hasFullAccess) {
          if (!hasActiveBoardFilters) return true;
          return filteredTodos.length > 0;
        }

        return filteredTodos.length > 0;
      }

      if (!hasActiveBoardFilters) return true;
      return filteredTodos.length > 0;
    });
  }, [nonArchivedLists, filteredTodosByListId, canSeeAllTasks, myAccountId, myDepartment, hasActiveBoardFilters]);

  // 🚀 CRITICAL FIX: Мемоизируем счетчики задач по спискам (было 2000+ операций!)
  const listCounts = useMemo(() => {
    return lists.reduce((acc, list) => {
      const listTodos = filteredTodosByListId[list.id] || [];
      acc[list.id] = {
        completedCount: listTodos.filter(t => t.completed).length,
        totalCount: listTodos.length
      };
      return acc;
    }, {} as Record<string, { completedCount: number; totalCount: number }>);
  }, [lists, filteredTodosByListId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="todos-page h-screen flex flex-col text-gray-900 dark:text-white overflow-hidden relative bg-gray-50 dark:bg-transparent">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-40 w-full px-3 py-2 flex-shrink-0">
        {/* Mobile header - all in one line */}
        <div className="flex items-center gap-2 w-full min-[550px]:hidden">
          {/* Левая стрелка */}
          <button
            onClick={() => {
              if (selectedColumnIndex > 0) {
                setSelectedColumnIndex(selectedColumnIndex - 1);
              }
            }}
            disabled={selectedColumnIndex === 0}
            className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              selectedColumnIndex === 0
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed bg-gray-200/10 dark:bg-white/5 border border-white/10'
                : 'text-[var(--text-primary)] bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_3px_8px_rgba(0,0,0,0.15)] active:scale-95 backdrop-blur-xl'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Search */}
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-primary)] flex items-center justify-center z-10 pointer-events-none">
              <Search className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 border border-white/20 rounded-[20px] text-xs focus:outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-white/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-xl"
            />
          </div>

          {/* More menu dropdown */}
          <div className="relative">
            <button
              onClick={() => setMobileHeaderMenuOpen(!mobileHeaderMenuOpen)}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 rounded-[20px] transition-all duration-200 border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-xl"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            <Mobileheadermenu
              isOpen={mobileHeaderMenuOpen}
              onClose={() => setMobileHeaderMenuOpen(false)}
              setShowMobileFiltersModal={setShowMobileFiltersModal}
              setShowMobileArchiveModal={setShowMobileArchiveModal}
              setShowAddList={setShowAddList}
            />
          </div>

          {/* Правая стрелка */}
          <button
            onClick={() => {
              if (selectedColumnIndex < nonArchivedLists.length - 1) {
                setSelectedColumnIndex(selectedColumnIndex + 1);
              }
            }}
            disabled={selectedColumnIndex >= nonArchivedLists.length - 1}
            className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              selectedColumnIndex >= nonArchivedLists.length - 1
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed bg-gray-200/10 dark:bg-white/5 border border-white/10'
                : 'text-[var(--text-primary)] bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_3px_8px_rgba(0,0,0,0.15)] active:scale-95 backdrop-blur-xl'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop header */}
        <div className="hidden min-[550px]:flex items-center justify-center gap-2 whitespace-nowrap">
          {/* Search */}
          <div className="relative flex-none">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-primary)] flex items-center justify-center z-10 pointer-events-none">
              <Search className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[200px] h-10 pl-10 pr-3 bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 border border-white/20 rounded-[20px] text-sm focus:outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-white/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-xl"
            />
          </div>

          {/* Status Filter */}
          <div className="relative hidden min-[550px]:block" ref={statusFilterRef}>
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="flex items-center gap-1.5 px-3 h-10 bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 rounded-[20px] transition-all duration-200 text-sm border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_3px_8px_rgba(0,0,0,0.15)] backdrop-blur-xl"
            >
              <Filter className="w-4 h-4 flex-shrink-0" />
              <span className="truncate max-w-[120px]">{filterStatus === 'all' ? 'Все' : filterStatus === 'stages' ? 'Этапы' : filterStatus === 'todo' ? 'К выполнению' : filterStatus === 'pending' ? 'В ожидании' : filterStatus === 'in-progress' ? 'В работе' : filterStatus === 'review' ? 'Готово к проверке' : filterStatus === 'cancelled' ? 'Отменена' : 'Застряла'}</span>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
            <Statusdropdown
              isOpen={statusDropdownOpen}
              onClose={() => setStatusDropdownOpen(false)}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
            />
          </div>

          {/* Executor Filter */}
          <div className="relative hidden min-[550px]:block" ref={executorFilterRef}>
            <button
              onClick={() => setExecutorDropdownOpen(!executorDropdownOpen)}
              className="flex items-center gap-1.5 px-3 h-10 bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 rounded-[20px] transition-all duration-200 text-sm border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_3px_8px_rgba(0,0,0,0.15)] backdrop-blur-xl"
            >
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate max-w-[100px]">{filterExecutor ? headerPeople.find(p => p.id === filterExecutor)?.name || 'Все' : 'Все'}</span>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
            <Executordropdown
              isOpen={executorDropdownOpen}
              onClose={() => setExecutorDropdownOpen(false)}
              people={headerPeople}
              filterExecutor={filterExecutor}
              setFilterExecutor={setFilterExecutor}
            />
          </div>

          {/* Department Filter */}
          <div className="relative hidden min-[550px]:block" ref={departmentFilterRef}>
            <button
              onClick={() => setDepartmentDropdownOpen(!departmentDropdownOpen)}
              className="flex items-center gap-1.5 px-3 h-10 bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 rounded-[20px] transition-all duration-200 text-sm border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_3px_8px_rgba(0,0,0,0.15)] backdrop-blur-xl"
            >
              <Briefcase className="w-4 h-4 flex-shrink-0" />
              <span className="truncate max-w-[120px]">{filterDepartment === 'all' ? 'Все отделы' : filterDepartment}</span>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
            <Departmentdropdown
              isOpen={departmentDropdownOpen}
              onClose={() => setDepartmentDropdownOpen(false)}
              departments={availableDepartments}
              filterDepartment={filterDepartment}
              setFilterDepartment={setFilterDepartment}
            />
          </div>

          {/* Archive Toggle */}
          <button
            onClick={() => setShowArchive(!showArchive)}
            className={`hidden min-[550px]:flex w-10 h-10 items-center justify-center rounded-[20px] transition-all duration-200 border flex-shrink-0 backdrop-blur-xl ${
              showArchive
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[inset_0_1px_2px_rgba(96,165,250,0.4),0_3px_8px_rgba(59,130,246,0.2)]'
                : 'bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_3px_8px_rgba(0,0,0,0.15)]'
            }`}
            title={showArchive ? 'Скрыть архив' : 'Показать архив'}
          >
            <Archive className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 min-h-0 pb-20 min-[550px]:pb-16 pt-[60px] overflow-y-auto min-[550px]:overflow-y-auto">
        <div 
          ref={boardRef}
          className="px-0 sm:px-4 py-2 sm:py-4 flex flex-col min-[550px]:flex-row gap-3 sm:gap-4 min-[550px]:overflow-x-auto scrollbar-hide"
          style={{ cursor: windowWidth >= 550 ? 'grab' : 'default' }}
          onScroll={handleBoardScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {visibleNonArchivedLists.map((list, index) => {
            const listTodos = getTodosForList(list.id, showArchive);
            const { completedCount, totalCount } = listCounts[list.id] || { completedCount: 0, totalCount: 0 };
            const isDropTarget = dragOverListId === list.id && draggedTodo?.listId !== list.id;
            const isListDropTarget = dragOverListOrder === list.order && draggedList?.id !== list.id;
            const listCreatorName = list.creatorId
              ? (list.creatorId === myAccountId ? 'Вы' : (peopleNameById[list.creatorId] || 'Неизвестно'))
              : '';
            
            // На мобильных показываем только выбранную колонку (используем CSS для правильного SSR)
            const isNotSelectedOnMobile = index !== selectedColumnIndex;
            
            return (
              <div
                key={list.id}
                data-todo-list="true"
                onDragOver={(e) => {
                  handleDragOver(e);
                  const dragType = getDragPayload(e).type;
                  if (dragType === 'list') handleListDragOver(e, list);
                }}
                onDrop={(e) => {
                  const payload = getDragPayload(e);
                  const dragType = payload.type;
                  const hasDraggedListId = Boolean(payload.id);

                  if (dragType === 'list') {
                    handleListDrop(e, list);
                  } else if (dragType === 'todo') {
                    handleDrop(e, list.id);
                  } else if (draggedList || hasDraggedListId) {
                    handleListDrop(e, list);
                  } else if (draggedTodo) {
                    handleDrop(e, list.id);
                  }
                }}
                className={`flex-shrink-0 w-full min-[550px]:w-80 flex flex-col rounded-xl transition-opacity duration-150 ${
                  isNotSelectedOnMobile ? 'hidden min-[550px]:flex' : 'flex'
                } ${
                  isDropTarget ? '' : ''
                } ${isListDropTarget ? 'ring-2 ring-blue-500/50' : ''} ${draggedList?.id === list.id ? 'opacity-50 scale-95' : ''} mt-[10px] min-[550px]:mt-0 group overflow-visible`}
                onDragEnter={(e) => handleDragEnter(e, list.id)}
                onDragLeave={handleDragLeave}
              >
                {/* List Header */}
                <div 
                  draggable={windowWidth >= 550}
                  data-list-header-drag="true"
                  onDragStart={(e) => handleListDragStart(e, list)}
                  onDragEnd={handleListDragEnd}
                  className="relative z-20 overflow-visible bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border-x border-t border-[var(--border-light)] rounded-t-xl p-2 sm:p-2.5 flex-shrink-0 min-[550px]:cursor-grab min-[550px]:active:cursor-grabbing backdrop-blur-xl shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1.5 sm:gap-1.5">
                      {/* Drag handle - только на десктопе */}
                      <div
                        className="hidden min-[550px]:block p-0.5 -ml-1 rounded transition-colors opacity-0 group-hover:opacity-40"
                        title="Перетащите для изменения порядка"
                      >
                        <GripVertical className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      </div>
                      <div 
                        className="w-2.5 h-2.5 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: list.color }}
                      />
                      {editingListId === list.id ? (
                        <input
                          type="text"
                          value={editingListName}
                          onChange={(e) => setEditingListName(e.target.value)}
                          onBlur={() => {
                            if (editingListName.trim() && editingListName !== list.name) {
                              updateList({ ...list, name: editingListName.trim() });
                            }
                            setEditingListId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editingListName.trim() && editingListName !== list.name) {
                                updateList({ ...list, name: editingListName.trim() });
                              }
                              setEditingListId(null);
                            }
                            if (e.key === 'Escape') {
                              setEditingListId(null);
                            }
                          }}
                          className="bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded px-2 py-0.5 text-sm font-medium focus:outline-none focus:border-blue-500/50 w-28 pointer-events-auto"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="flex flex-col min-w-0 pointer-events-auto">
                          <h3 
                            className="font-medium text-sm sm:text-sm truncate cursor-pointer text-gray-900 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingListId(list.id);
                              setEditingListName(list.name);
                            }}
                            title="Кликните для переименования"
                          >
                            {list.name}
                          </h3>
                          {listCreatorName && (
                            <div className="text-[10px] leading-none text-gray-500 dark:text-white/45 mt-0.5 truncate" title={`Создатель: ${listCreatorName}`}>
                              создал: {listCreatorName}
                            </div>
                          )}
                        </div>
                      )}
                      <span className="text-[10px] text-gray-500 dark:text-white/50 bg-gray-200 dark:bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded-full self-start">
                        {completedCount}/{totalCount}
                      </span>
                      {/* Индикаторы привязки */}
                      {(list.defaultExecutorId || list.defaultCustomerId) && (
                        <div className="flex items-center gap-0.5 ml-1" title={`${list.defaultExecutorId ? 'Исполнитель: ' + people.find(p => p.id === list.defaultExecutorId)?.name : ''}${list.defaultExecutorId && list.defaultCustomerId ? ', ' : ''}${list.defaultCustomerId ? 'Заказчик: ' + people.find(p => p.id === list.defaultCustomerId)?.name : ''}`}>
                          {list.defaultExecutorId && (
                            <UserCheck className="w-3 h-3 text-green-400/70" />
                          )}
                          {list.defaultCustomerId && (
                            <User className="w-3 h-3 text-blue-400/70" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 pointer-events-auto">
                      <button
                        onClick={() => {
                          setAddingToList(list.id);
                          // Устанавливаем предустановленного исполнителя из настроек столбца
                          if (list.defaultExecutorId) {
                            setNewTodoAssigneeId(list.defaultExecutorId);
                          }
                        }}
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all bg-gradient-to-br from-white/10 to-white/5 hover:from-green-500/20 hover:to-green-500/10 border border-white/20 hover:border-green-500/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-md text-green-400"
                        title="Добавить задачу"
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.8} />
                      </button>
                      {/* Меню ... */}
                      <div className="relative z-30">
                        <button
                          onClick={() => setShowListMenu(showListMenu === list.id ? null : list.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-all bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-md text-[var(--text-primary)]"
                          title="Действия со списком"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        {showListMenu === list.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg shadow-xl z-[200] py-1 pointer-events-auto">
                            <button
                              onClick={() => { moveListByOffset(list.id, -1); setShowListMenu(null); }}
                              disabled={list.order <= 0}
                              className="w-full px-3 py-2.5 text-sm text-left flex items-center gap-2.5 text-[var(--text-primary)] hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              Сдвинуть влево
                            </button>
                            <button
                              onClick={() => { moveListByOffset(list.id, 1); setShowListMenu(null); }}
                              disabled={list.order >= nonArchivedLists.length - 1}
                              className="w-full px-3 py-2.5 text-sm text-left flex items-center gap-2.5 text-[var(--text-primary)] hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <ChevronRight className="w-4 h-4" />
                              Сдвинуть вправо
                            </button>
                            <div className="border-t border-[var(--border-color)] my-1" />
                            <button
                              onClick={() => { setShowListMenu(null); setEditingList(list); setShowAddList(true); }}
                              className="w-full px-3 py-2.5 text-sm text-left flex items-center gap-2.5 text-blue-400 hover:bg-blue-500/10 transition-colors"
                            >
                              <Settings className="w-4 h-4" />
                              Настройки
                            </button>
                            <button
                              onClick={() => { toggleArchiveList(list.id, true); setShowListMenu(null); }}
                              className="w-full px-3 py-2.5 text-sm text-left flex items-center gap-2.5 text-orange-400 hover:bg-orange-500/10 transition-colors"
                            >
                              <Archive className="w-4 h-4" />
                              Архивировать
                            </button>
                            <div className="border-t border-[var(--border-color)] my-1" />
                            <button
                              onClick={() => { deleteList(list.id); setShowListMenu(null); }}
                              className="w-full px-3 py-2.5 text-sm text-left flex items-center gap-2.5 text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Удалить
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tasks Container */}
                <div 
                  className={`relative z-0 bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border-x border-b border-[var(--border-light)] rounded-b-xl p-2 flex flex-col gap-2 min-h-[100px] transition-colors backdrop-blur-xl shadow-[var(--shadow-card)] ${
                    isDropTarget ? 'bg-[#eaeaea] dark:bg-[var(--bg-glass)]' : ''
                  }`}
                  onDragEnter={(e) => handleDragEnter(e, list.id)}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => {
                    const dragType = getDragPayload(e).type;
                    if (dragType === 'list') {
                      handleListDrop(e, list);
                    } else {
                      handleDrop(e, list.id);
                    }
                  }}
                >
                  {/* Add Task Form */}
                  {addingToList === list.id && (
                    <AddTodoForm
                      listId={list.id}
                      newTodoTitle={newTodoTitle}
                      newTodoDescription={newTodoDescription}
                      newTodoAssigneeId={newTodoAssigneeId}
                      showNewTodoAssigneeDropdown={showNewTodoAssigneeDropdown}
                      people={people}
                      myAccountId={myAccountId || ''}
                      setNewTodoTitle={setNewTodoTitle}
                      setNewTodoDescription={setNewTodoDescription}
                      setNewTodoAssigneeId={setNewTodoAssigneeId}
                      setShowNewTodoAssigneeDropdown={setShowNewTodoAssigneeDropdown}
                      onAdd={addTodo}
                      onCancel={() => { setAddingToList(null); setNewTodoTitle(''); setNewTodoDescription(''); setNewTodoAssigneeId(null); }}
                    />
                  )}

                  {/* Tasks */}
                  {listTodos.map(todo => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      isDraggable={windowWidth >= 550}
                      isDragging={draggedTodo?.id === todo.id}
                      isDragOver={dragOverTodoId === todo.id && draggedTodo?.id !== todo.id}
                      categories={categories}
                      people={people}
                      onDragStart={(e) => handleDragStart(e, todo)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleTodoDragOver(e, todo.id)}
                      onDrop={(e) => handleTodoDrop(e, todo)}
                      onMouseEnter={(e) => handleTodoMouseEnter(e, todo)}
                      onMouseLeave={handleTodoMouseLeave}
                      onToggle={() => toggleTodo(todo)}
                      onEdit={() => openTodoModal(todo)}
                      onArchive={() => toggleArchiveTodo(todo.id, true)}
                      onDelete={() => deleteTodo(todo.id)}
                    />
                  ))}

                  {/* Empty state */}
                  {listTodos.length === 0 && addingToList !== list.id && (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-white/60 pointer-events-none">
                      <Inbox className="w-8 h-8 mb-2 text-gray-400 dark:text-white/50" />
                      <p className="text-sm">Нет задач</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add List Button - скрыта на мобильных, где есть кнопка + в табах */}
          {!showAddList && (
            <div className="hidden min-[550px]:block flex-shrink-0 w-80">
              <button
                onClick={() => setShowAddList(true)}
                className="w-full h-20 border-2 border-dashed border-gray-300 dark:border-[var(--border-color)] rounded-xl flex items-center justify-center gap-2 text-gray-400 dark:text-[var(--text-muted)] hover:border-gray-400 dark:hover:border-[var(--border-light)] hover:text-gray-500 dark:hover:text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-[var(--bg-glass)] transition-all pointer-events-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Добавить список</span>
              </button>
            </div>
          )}

          {/* Add List Form - оптимизировано для мобильных */}
          <AddList
            isOpen={showAddList}
            onClose={() => { setShowAddList(false); setEditingList(null); }}
            newListName={newListName}
            setNewListName={setNewListName}
            newListDescription={newListDescription}
            setNewListDescription={setNewListDescription}
            newListColor={newListColor}
            setNewListColor={setNewListColor}
            newListAssigneeId={newListAssigneeId}
            setNewListAssigneeId={setNewListAssigneeId}
            showNewListAssigneeDropdown={showNewListAssigneeDropdown}
            setShowNewListAssigneeDropdown={setShowNewListAssigneeDropdown}
            newListStagesEnabled={newListStagesEnabled}
            setNewListStagesEnabled={setNewListStagesEnabled}
            people={people}
            myAccountId={myAccountId || ''}
            addList={addList}
            LIST_COLORS={LIST_COLORS}
            editingList={editingList}
            updateList={(updatedList) => {
              updateList(updatedList);
              setLists(prev => prev.map(l => l.id === updatedList.id ? updatedList : l));
            }}
          />
        </div>

        {/* Archived Lists */}
        {showArchive && (lists.filter(l => l.archived).length > 0 || getArchivedTodos().length > 0) && (
          <div className="mt-6 px-6">
            <div className="flex items-center gap-2 mb-4">
              <Archive className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-orange-400">Архив</h2>
            </div>
            
            {/* Архивные задачи */}
            {getArchivedTodos().length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Архивные задачи</h3>
                <div className="grid grid-cols-1 min-[550px]:grid-cols-2 lg:grid-cols-3 gap-3">
                  {getArchivedTodos().map(todo => {
                    const list = lists.find(l => l.id === todo.listId);
                    return (
                      <div
                        key={todo.id}
                        onMouseEnter={(e) => handleTodoMouseEnter(e, todo)}
                        onMouseLeave={handleTodoMouseLeave}
                        className={`bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-3 opacity-60 border-l-3 ${PRIORITY_COLORS[todo.priority]}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${todo.completed ? 'line-through text-[var(--text-muted)]' : ''}`}>
                              {todo.title}
                            </p>
                            {list && (
                              <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                                {list.name}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => toggleArchiveTodo(todo.id, false)}
                              className="p-1.5 hover:bg-green-500/20 rounded text-green-400"
                              title="Восстановить"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteTodo(todo.id)}
                              className="p-1.5 hover:bg-red-500/20 rounded text-red-400"
                              title="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Архивные списки */}
            {lists.filter(l => l.archived).length > 0 && (
              <>
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Архивные списки</h3>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
                  {lists.filter(l => l.archived).map(list => {
                    const listTodos = getTodosForList(list.id, true);
                    const { completedCount, totalCount } = listCounts[list.id] || { completedCount: 0, totalCount: 0 };
                    
                    const listCreatorName = list.creatorId
                      ? (list.creatorId === myAccountId ? 'Вы' : getPersonNameById(people, list.creatorId))
                      : '';

                    return (
                      <div
                        key={list.id}
                        className="flex-shrink-0 w-80 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl opacity-75"
                      >
                        {/* List Header */}
                        <div className="p-2.5 border-b border-[var(--border-color)]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: list.color }}
                              />
                              <div className="flex flex-col min-w-0">
                                <h3 className="font-medium text-sm truncate text-[var(--text-secondary)]">
                                  {list.name}
                                </h3>
                                {listCreatorName && (
                                  <div className="text-[10px] leading-none text-[var(--text-muted)]/80 mt-0.5 truncate" title={`Создатель: ${listCreatorName}`}>
                                    создал: {listCreatorName}
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded-full">
                                {completedCount}/{totalCount}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => toggleArchiveList(list.id, false)}
                                className="p-1.5 hover:bg-green-500/20 rounded transition-all duration-200 text-green-400"
                                title="Восстановить из архива"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteList(list.id)}
                                className="p-1.5 hover:bg-red-500/20 rounded transition-all duration-200 text-red-400"
                                title="Удалить навсегда"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Tasks preview */}
                        <div className="p-2 max-h-40 overflow-y-auto">
                          {listTodos.slice(0, 3).map(todo => (
                            <div 
                              key={todo.id}
                              className="text-xs text-[var(--text-muted)] py-1 border-b border-[var(--border-secondary)] last:border-0 truncate flex items-center gap-1.5"
                            >
                              {todo.completed ? <Check className="w-3 h-3 text-green-500" /> : <span className="w-3 h-3 border border-gray-300 dark:border-white/30 rounded-full" />}
                              {todo.title}
                            </div>
                          ))}
                          {listTodos.length > 3 && (
                            <div className="text-xs text-[var(--text-muted)] py-1 text-center">
                              +{listTodos.length - 3} задач
                            </div>
                          )}
                          {listTodos.length === 0 && (
                            <div className="text-xs text-[var(--text-muted)] py-2 text-center">
                              Нет задач
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Empty Archive */}
        {showArchive && lists.filter(l => l.archived).length === 0 && getArchivedTodos().length === 0 && (
          <div className="mt-6 px-6">
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
              <Archive className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">Архив пуст</p>
              <p className="text-sm mt-1">Здесь будут отображаться архивные задачи и списки</p>
            </div>
          </div>
        )}
      </div>

      {/* Sticky horizontal scrollbar (desktop) */}
      {windowWidth >= 550 && boardScrollWidth > boardClientWidth + 2 && (
        <div className="fixed left-0 right-0 bottom-[54px] z-[120] px-4 pointer-events-none">
          <div
            ref={bottomScrollbarRef}
            onScroll={handleBottomScrollbarScroll}
            onClick={handleBottomScrollbarTrackClick}
            className="todos-bottom-scrollbar mx-auto w-[56vw] min-w-[280px] max-w-[640px] h-5 overflow-x-auto overflow-y-hidden pointer-events-auto"
          >
            <div style={{ width: `${boardScrollWidth}px`, height: '1px' }} />
          </div>
        </div>
      )}

      {/* Hover Preview Tooltip - only on desktop */}
      {hoveredTodo && (hoveredTodo.description || hoveredTodo.reviewComment) && (
        <div 
          className="hidden min-[550px]:block fixed z-[100] bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[var(--border-light)] rounded-xl shadow-2xl p-4 max-w-sm text-gray-900 dark:text-white"
          style={{ 
            left: Math.min(hoverPosition.x, windowWidth - 350),
            top: Math.min(hoverPosition.y, window.innerHeight - 200),
          }}
          onMouseEnter={() => {}} // Keep visible when hovering the tooltip
          onMouseLeave={handleTodoMouseLeave}
        >
          <div className="flex items-start gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
              hoveredTodo.priority === 'high' ? 'bg-red-500' : 
              hoveredTodo.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
            }`} />
            <h4 className="font-medium text-sm">{hoveredTodo.title}</h4>
          </div>
          
          {hoveredTodo.description && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 dark:text-[var(--text-muted)] mb-1">Описание:</p>
              <div 
                className="text-sm text-gray-700 dark:text-[var(--text-secondary)] prose dark:prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: hoveredTodo.description }}
              />
            </div>
          )}
          
          {hoveredTodo.reviewComment && (
            <div className="pt-2 border-t border-gray-200 dark:border-[var(--border-color)]">
              <p className="text-xs text-purple-500 dark:text-purple-400/60 mb-1">Комментарий руководителя:</p>
              <p className="text-sm text-purple-600 dark:text-purple-300/80 whitespace-pre-wrap">{hoveredTodo.reviewComment}</p>
            </div>
          )}
          
          {hoveredTodo.linkId && hoveredTodo.linkUrl && (
            <div className="pt-2 border-t border-gray-200 dark:border-[var(--border-color)]">
              <p className="text-xs text-blue-500 dark:text-blue-400/60 mb-1">Прикреплённая ссылка:</p>
              <a
                href={hoveredTodo.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span className="truncate">{hoveredTodo.linkTitle || hoveredTodo.linkUrl}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </div>
          )}
          
          {(hoveredTodo.assignedToId || hoveredTodo.dueDate) && (
            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-200 dark:border-[var(--border-color)] text-xs text-gray-500 dark:text-white/50">
              {hoveredTodo.assignedToId && (
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  {getPersonNameById(people, hoveredTodo.assignedToId ?? undefined, hoveredTodo.assignedTo || undefined)}
                </span>
              )}
              {hoveredTodo.dueDate && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(hoveredTodo.dueDate).toLocaleDateString('ru-RU')}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Todo Modal */}
      <Editingtodo
        todo={editingTodo}
        isOpen={editingTodo !== null}
        onClose={closeTodoModal}
        onUpdate={updateTodo}
        onToggle={toggleTodo}
        onDelete={deleteTodo}
        onDraftUpdate={handleUpdate}
        people={people}
        lists={lists}
        nonArchivedLists={nonArchivedLists}
        categories={categories}
        calendarLists={personalCalendarLists}
        openDropdown={openDropdown}
        setOpenDropdown={setOpenDropdown}
        columnWidths={columnWidths}
        setColumnWidths={setColumnWidths}
        isResizing={isResizing}
        setIsResizing={setIsResizing}
        resizeStartXRef={resizeStartXRef}
        resizeStartWidthsRef={resizeStartWidthsRef}
        statusOptions={statusOptions}
        TZ_LIST_ID={TZ_LIST_ID}
        myAccountId={myAccountId || ''}
      />

      {/* Category Manager Modal */}
      <CategoryManager
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        categories={categories}
        editingCategory={editingCategory}
        setEditingCategory={setEditingCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
        showAddCategory={showAddCategory}
        setShowAddCategory={setShowAddCategory}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        newCategoryColor={newCategoryColor}
        setNewCategoryColor={setNewCategoryColor}
        newCategoryIcon={newCategoryIcon}
        setNewCategoryIcon={setNewCategoryIcon}
        addCategory={addCategory}
        LIST_COLORS={LIST_COLORS}
        CATEGORY_ICONS={CATEGORY_ICONS}
      />

      {/* People Manager Modal */}
      <PeopleManager
        isOpen={showPeopleManager}
        onClose={() => setShowPeopleManager(false)}
        people={people}
      />

      {/* Edit Person Modal */}
      {showEditPersonModal && editingPerson && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                {editingPerson.role === 'executor' ? <UserCheck className="w-5 h-5 text-green-400" /> : 
                 editingPerson.role === 'customer' ? <User className="w-5 h-5 text-blue-400" /> :
                 <Users className="w-5 h-5 text-purple-400" />}
                Редактирование профиля
              </h2>
              <button
                onClick={() => { setShowEditPersonModal(false); setEditingPerson(null); }}
                className="p-2 rounded-lg hover:bg-[var(--bg-glass-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Основные данные */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-white/50 mb-2">Имя</label>
                  <input
                    type="text"
                    value={editingPerson.name}
                    onChange={(e) => setEditingPerson({ ...editingPerson, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-cyan-500/50"
                    placeholder="Имя пользователя"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2">Telegram ID</label>
                  <input
                    type="text"
                    value={editingPerson.telegramId || ''}
                    onChange={(e) => setEditingPerson({ ...editingPerson, telegramId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-cyan-500/50"
                    placeholder="123456789"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">ID пользователя в Telegram (можно получить у @userinfobot)</p>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2">Роль</label>
                  <select
                    value={editingPerson.role}
                    onChange={(e) => setEditingPerson({ ...editingPerson, role: e.target.value as 'executor' | 'customer' | 'universal' })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="executor" className="bg-[var(--bg-tertiary)]">Исполнитель</option>
                    <option value="customer" className="bg-[var(--bg-tertiary)]">Заказчик</option>
                    <option value="universal" className="bg-[var(--bg-tertiary)]">Универсальный</option>
                  </select>
                </div>
              </div>

              {/* Настройки уведомлений */}
              <div className="border-t border-[var(--border-color)] pt-4">
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-cyan-400" />
                  Уведомления в Telegram
                </h3>
                {!editingPerson.telegramId && (
                  <p className="text-xs text-orange-400/70 mb-3 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Укажите Telegram ID для получения уведомлений
                  </p>
                )}
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-[var(--bg-glass)]">
                    <input
                      type="checkbox"
                      checked={editingPerson.notifyOnNewTask ?? true}
                      onChange={(e) => setEditingPerson({ ...editingPerson, notifyOnNewTask: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--border-light)] bg-[var(--bg-glass)] text-cyan-500 focus:ring-cyan-500/20"
                    />
                    <div>
                      <span className="text-sm text-[var(--text-secondary)] group-hover:text-white/90 transition-colors block">Новая задача</span>
                      <span className="text-[10px] text-[var(--text-muted)]">Когда вам назначают новую задачу</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-[var(--bg-glass)]">
                    <input
                      type="checkbox"
                      checked={editingPerson.notifyOnStatusChange ?? true}
                      onChange={(e) => setEditingPerson({ ...editingPerson, notifyOnStatusChange: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--border-light)] bg-[var(--bg-glass)] text-cyan-500 focus:ring-cyan-500/20"
                    />
                    <div>
                      <span className="text-sm text-[var(--text-secondary)] group-hover:text-white/90 transition-colors block">Изменение статуса</span>
                      <span className="text-[10px] text-[var(--text-muted)]">Когда меняется статус вашей задачи</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-[var(--bg-glass)]">
                    <input
                      type="checkbox"
                      checked={editingPerson.notifyOnComment ?? true}
                      onChange={(e) => setEditingPerson({ ...editingPerson, notifyOnComment: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--border-light)] bg-[var(--bg-glass)] text-cyan-500 focus:ring-cyan-500/20"
                    />
                    <div>
                      <span className="text-sm text-[var(--text-secondary)] group-hover:text-white/90 transition-colors block">Комментарии</span>
                      <span className="text-[10px] text-[var(--text-muted)]">Когда кто-то комментирует вашу задачу</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-[var(--bg-glass)]">
                    <input
                      type="checkbox"
                      checked={editingPerson.notifyOnMention ?? true}
                      onChange={(e) => setEditingPerson({ ...editingPerson, notifyOnMention: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--border-light)] bg-[var(--bg-glass)] text-cyan-500 focus:ring-cyan-500/20"
                    />
                    <div>
                      <span className="text-sm text-[var(--text-secondary)] group-hover:text-white/90 transition-colors block">Упоминания</span>
                      <span className="text-[10px] text-[var(--text-muted)]">Когда вас упоминают в комментарии</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    updatePerson(editingPerson);
                    setShowEditPersonModal(false);
                    setEditingPerson(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-[var(--text-primary)] rounded-xl font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all"
                >
                  <Check className="w-4 h-4" />
                  Сохранить
                </button>
                <button
                  onClick={() => { setShowEditPersonModal(false); setEditingPerson(null); }}
                  className="px-4 py-2.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)] transition-all"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filters Modal */}
      <MobileFilters
        isOpen={showMobileFiltersModal}
        onClose={() => setShowMobileFiltersModal(false)}
        people={headerPeople}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterExecutor={filterExecutor}
        setFilterExecutor={setFilterExecutor}
        filterDepartment={filterDepartment}
        setFilterDepartment={setFilterDepartment}
        departments={availableDepartments}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Mobile Archive Modal */}
      <MobileArchiveModal
        isOpen={showMobileArchiveModal}
        onClose={() => setShowMobileArchiveModal(false)}
        showArchive={showArchive}
        setShowArchive={setShowArchive}
      />

      {/* Telegram Settings Modal */}
      <TelegramSettings
        isOpen={showTelegramSettings}
        onClose={() => setShowTelegramSettings(false)}
        telegramToken={telegramToken}
        setTelegramToken={setTelegramToken}
        telegramEnabled={telegramEnabled}
        setTelegramEnabled={setTelegramEnabled}
        updateTelegramSettings={updateTelegramSettings}
      />

      {/* Toast Notifications - Боковые уведомления справа */}
      <div className="fixed top-20 right-6 z-[100] flex flex-col gap-2 pointer-events-none max-h-[calc(100vh-120px)] overflow-hidden">
        {toasts.slice(0, 5).map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto animate-slide-in-right"
          >
            <div className={`
              flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl min-w-[280px] max-w-[360px]
              bg-gradient-to-r ${
                toast.type === 'success' ? 'from-green-500/20 to-green-500/5 border-green-500/30' :
                toast.type === 'warning' ? 'from-orange-500/20 to-orange-500/5 border-orange-500/30' :
                toast.type === 'error' ? 'from-red-500/20 to-red-500/5 border-red-500/30' :
                'from-blue-500/20 to-blue-500/5 border-blue-500/30'
              } border
            `}>
              {/* Иконка */}
              <div className={`relative flex-shrink-0 ${
                toast.type === 'success' ? 'text-green-400' :
                toast.type === 'warning' ? 'text-orange-400' :
                toast.type === 'error' ? 'text-red-400' :
                'text-blue-400'
              }`}>
                {toast.type === 'success' ? <Check className="w-4 h-4 relative" /> :
                 toast.type === 'warning' ? <Bell className="w-4 h-4 relative" /> :
                 toast.type === 'error' ? <X className="w-4 h-4 relative" /> :
                 <MessageCircle className="w-4 h-4 relative" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate">{toast.title}</span>
                  {toast.count && toast.count > 1 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      toast.type === 'success' ? 'bg-green-500/30 text-green-300' :
                      toast.type === 'warning' ? 'bg-orange-500/30 text-orange-300' :
                      toast.type === 'error' ? 'bg-red-500/30 text-red-300' :
                      'bg-blue-500/30 text-blue-300'
                    }`}>
                      +{toast.count}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] truncate">{toast.message}</div>
              </div>

              {toast.todoId && (
                <button
                  onClick={() => {
                    openTodoModalWithFreshData(toast.todoId!);
                    removeToast(toast.id);
                  }}
                  className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
                    toast.type === 'success' ? 'hover:bg-green-500/20 text-green-400' :
                    toast.type === 'warning' ? 'hover:bg-orange-500/20 text-orange-400' :
                    toast.type === 'error' ? 'hover:bg-red-500/20 text-red-400' :
                    'hover:bg-blue-500/20 text-blue-400'
                  }`}
                  title="Открыть задачу"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
              
              <button
                onClick={() => removeToast(toast.id)}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] p-1 rounded transition-all flex-shrink-0"
                title="Закрыть"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        
        {/* Кнопка очистки всех */}
        {toasts.length > 1 && (
          <button
            onClick={() => setToasts([])}
            className="pointer-events-auto text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors self-end px-2 py-1"
          >
            Очистить все ({toasts.length})
          </button>
        )}
      </div>
    </div>
  );
}