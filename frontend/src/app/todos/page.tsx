
'use client';

// Корректируем selectedColumnIndex если список изменился
// (перенесено ниже, после объявления хуков)

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Share2,
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
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Link2,
  ExternalLink,
  MessageCircle,
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
  AlertTriangle
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
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in-progress' | 'pending' | 'review' | 'cancelled' | 'stuck';
  reviewComment?: string;
  dueDate?: string;
  listId: string;
  categoryId?: string;
  tags: string[];
  assignedById?: string;
  assignedBy?: string;
  assignedToId?: string;
  assignedTo?: string;
  assignedToIds?: string[];  // Множественные исполнители
  assignedToNames?: string[];  // Имена множественных исполнителей
  linkId?: string;
  linkUrl?: string;
  linkTitle?: string;
  addToCalendar?: boolean;
  calendarEventId?: string;
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

const PRIORITY_COLORS = {
  low: 'border-l-blue-400',
  medium: 'border-l-yellow-400',
  high: 'border-l-red-400'
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

// Хелпер для проверки непрочитанных комментариев
const hasUnreadComments = (todo: Todo, myAccountId: string | null): boolean => {
  if (!myAccountId || !todo.comments || todo.comments.length === 0) return false;
  const lastReadId = todo.readCommentsByUser?.[myAccountId];
  if (!lastReadId) return todo.comments.length > 0;
  const lastReadIndex = todo.comments.findIndex(c => c.id === lastReadId);
  return lastReadIndex < todo.comments.length - 1;
};

// Хелпер для получения имени человека по ID
const getPersonNameById = (people: Person[], personId: string | undefined, fallbackName?: string): string => {
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
  
  const [todos, setTodos] = useState<Todo[]>([]);
  const [lists, setLists] = useState<TodoList[]>([]);
  const [categories, setCategories] = useState<TodoCategory[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
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
  const [newListColor, setNewListColor] = useState('#6366f1');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6366f1');
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag');
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonTelegramId, setNewPersonTelegramId] = useState('');
  const [newPersonTelegramUsername, setNewPersonTelegramUsername] = useState('');
  const [newPersonRole, setNewPersonRole] = useState<'executor' | 'customer' | 'universal'>('executor');
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [availableLinks, setAvailableLinks] = useState<LinkItem[]>([]);
  const [linksSearchQuery, setLinksSearchQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-progress' | 'pending' | 'review' | 'cancelled' | 'stuck'>('all');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [executorFilter, setExecutorFilter] = useState<string>('all');
  const [showExecutorFilter, setShowExecutorFilter] = useState(false);
  const [myAccountId, setMyAccountId] = useState<string | null>(null);
  const [myDepartment, setMyDepartment] = useState<string | null>(null);  // Отдел текущего пользователя
  const [canSeeAllTasks, setCanSeeAllTasks] = useState<boolean>(false);  // По умолчанию false - видны только свои задачи
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoAssigneeId, setNewTodoAssigneeId] = useState<string | null>(null);
  const [showNewTodoAssigneeDropdown, setShowNewTodoAssigneeDropdown] = useState(false);
  const [newListAssigneeId, setNewListAssigneeId] = useState<string | null>(null);
  const [showNewListAssigneeDropdown, setShowNewListAssigneeDropdown] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [showListSettings, setShowListSettings] = useState<string | null>(null);
  const [showListMenu, setShowListMenu] = useState<string | null>(null);  // Для выпадающего меню "..."
  const [listSettingsDropdown, setListSettingsDropdown] = useState<'executor' | 'customer' | null>(null);
  const [mobileView, setMobileView] = useState<'board' | 'single'>(typeof window !== 'undefined' && window.innerWidth < 768 ? 'single' : 'board');
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
  
  // Modal tabs and comments state
  const [modalTab, setModalTab] = useState<'details' | 'comments'>('details');
  const [newComment, setNewComment] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [replyingToComment, setReplyingToComment] = useState<Comment | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const descriptionEditorRef = useRef<HTMLDivElement>(null);
  const [lastReadCommentId, setLastReadCommentId] = useState<string | null>(null);
  const [unreadCommentsCount, setUnreadCommentsCount] = useState(0);
  
  // Notifications (Inbox) state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showInbox, setShowInbox] = useState(false);
  const [inboxTab, setInboxTab] = useState<'new' | 'history'>('new');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastNotificationCountRef = useRef<number>(0);
  
  // Hover preview state
  const [hoveredTodo, setHoveredTodo] = useState<Todo | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const executorFilterRef = useRef<HTMLDivElement>(null);
  const isClosingModalRef = useRef(false);
  const hasOpenedFromUrlRef = useRef(false);
  
  // Dropdown states for modal
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  // Drag and Drop state for todos
  const [draggedTodo, setDraggedTodo] = useState<Todo | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);
  const [dragOverTodoId, setDragOverTodoId] = useState<string | null>(null);
  const dragCounter = useRef(0);
  
  // Drag and Drop state for lists
  const [draggedList, setDraggedList] = useState<TodoList | null>(null);
  const [dragOverListOrder, setDragOverListOrder] = useState<number | null>(null);
  
  // Drag to scroll state
  const boardRef = useRef<HTMLDivElement>(null);
  const [isDraggingBoard, setIsDraggingBoard] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Загрузка данных
  const loadData = useCallback(async () => {
    try {
      const userId = myAccountId;
      console.log('[loadData] Loading with userId:', userId);
      
      const [todosRes, peopleRes, telegramRes, linksRes] = await Promise.all([
        fetch(`/api/todos${userId ? `?userId=${userId}` : ''}`),
        fetch('/api/todos/people'),
        fetch('/api/todos/telegram'),
        fetch('/api/links')
      ]);
      
      const todosData = await todosRes.json();
      const peopleData = await peopleRes.json();
      const telegramData = await telegramRes.json();
      const linksData = await linksRes.json();
      
      console.log('[loadData] Received lists:', todosData.lists?.length || 0);
      console.log('[loadData] Lists:', todosData.lists);
      
      setTodos(todosData.todos || []);
      setLists(todosData.lists || []);
      setCategories(todosData.categories || []);
      setPeople(peopleData.people || []);
      setTelegramEnabled(telegramData.enabled || false);
      setAvailableLinks(linksData.links || []);
    } catch (error) {
      console.error('Error loading todos:', error);
    } finally {
      setIsLoading(false);
    }
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
  }, [myAccountId, soundEnabled]); // Убрали notifications из зависимостей чтобы избежать бесконечного цикла

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
    loadData();
  }, [loadData]);

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
    
    if (createTask === 'true' && listId && assignTo && people.length > 0 && lists.length > 0) {
      // Убираем параметры из URL
      router.replace('/todos', { scroll: false });
      
      // Находим список и открываем полную модалку создания
      setTimeout(() => {
        const targetList = lists.find(l => l.id === listId);
        if (targetList && !editingTodo) {
          // Находим имена для заказчика и исполнителя
          const assignedByPerson = people.find(p => p.id === (authorId || myAccountId));
          const assignedToPerson = people.find(p => p.id === assignTo);
          
          // Создаём новую задачу с предзаполненными данными
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
            updatedAt: new Date().toISOString(),
            comments: []
          };
          setEditingTodo(newTodo);
          setModalTab('details');
        }
      }, 200);
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
                // Обновляем только если есть изменения в комментариях
                if (JSON.stringify(prev.comments) !== JSON.stringify(updatedTodo.comments)) {
                  // Автоскролл к новым комментариям или разделителю
                  if (newCommentsLength > prevCommentsLength) {
                    setTimeout(() => {
                      // Сначала пробуем прокрутить к разделителю непрочитанных
                      const unreadDivider = document.getElementById('unread-divider');
                      if (unreadDivider) {
                        unreadDivider.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      } else {
                        // Если разделителя нет, прокручиваем к концу
                        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }, 100);
                  }
                  return { ...prev, comments: updatedTodo.comments };
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

    // Polling каждые 10 секунд (уменьшено с 3s для производительности)
    const interval = setInterval(pollTodos, 10000);
    
    return () => clearInterval(interval);
  }, [myAccountId, soundEnabled, editingTodo?.id]);

  // Отслеживание непрочитанных комментариев при открытии модалки
  useEffect(() => {
    if (editingTodo?.comments && editingTodo.comments.length > 0) {
      // При открытии модалки запоминаем последний комментарий как прочитанный
      const lastComment = editingTodo.comments[editingTodo.comments.length - 1];
      if (!lastReadCommentId) {
        setLastReadCommentId(lastComment.id);
        setUnreadCommentsCount(0);
      }
    } else {
      setLastReadCommentId(null);
      setUnreadCommentsCount(0);
    }
  }, [editingTodo?.id]);

  // Обновляем количество непрочитанных при изменении комментариев
  useEffect(() => {
    if (editingTodo?.comments && lastReadCommentId) {
      const lastReadIndex = editingTodo.comments.findIndex(c => c.id === lastReadCommentId);
      if (lastReadIndex !== -1) {
        const unreadCount = editingTodo.comments.length - lastReadIndex - 1;
        // Только комментарии от других пользователей
        const unreadFromOthers = editingTodo.comments
          .slice(lastReadIndex + 1)
          .filter(c => c.authorId !== myAccountId).length;
        setUnreadCommentsCount(unreadFromOthers);
      }
    }
  }, [editingTodo?.comments, lastReadCommentId, myAccountId]);

  // Помечаем комментарии как прочитанные при клике на инпут
  const markLocalCommentsAsRead = useCallback(async () => {
    if (editingTodo?.comments && editingTodo.comments.length > 0) {
      const lastComment = editingTodo.comments[editingTodo.comments.length - 1];
      setLastReadCommentId(lastComment.id);
      setUnreadCommentsCount(0);
      
      // Помечаем уведомления по этой задаче как прочитанные на сервере
      if (myAccountId && editingTodo.id) {
        try {
          // 1. Помечаем уведомления как прочитанные
          await fetch('/api/notifications', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              markByTodo: true, 
              todoId: editingTodo.id, 
              userId: myAccountId 
            })
          });
          
          // 2. Сохраняем readCommentsByUser на сервере
          const currentLastRead = editingTodo.readCommentsByUser?.[myAccountId];
          if (currentLastRead !== lastComment.id) {
            const updatedReadBy = {
              ...editingTodo.readCommentsByUser,
              [myAccountId]: lastComment.id
            };
            
            await fetch('/api/todos', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: editingTodo.id,
                readCommentsByUser: updatedReadBy
              })
            });
            
            // Обновляем локальный state задач
            setTodos(prev => prev.map(t => 
              t.id === editingTodo.id ? { ...t, readCommentsByUser: updatedReadBy } : t
            ));
          }
          
          // 3. Обновляем локальный state уведомлений
          setNotifications(prev => prev.map(n => 
            n.todoId === editingTodo.id ? { ...n, read: true } : n
          ));
          
          // 4. Убираем toast'ы связанные с этой задачей
          setToasts(prev => prev.filter(t => t.todoId !== editingTodo.id));
          
        } catch (error) {
          console.error('Error marking as read:', error);
        }
      }
    }
  }, [editingTodo?.comments, editingTodo?.id, editingTodo?.readCommentsByUser, myAccountId]);

  // Инициализация редактора описания при открытии модалки
  useEffect(() => {
    if (editingTodo && descriptionEditorRef.current) {
      // Устанавливаем начальный контент только если он отличается
      if (descriptionEditorRef.current.innerHTML !== (editingTodo.description || '')) {
        descriptionEditorRef.current.innerHTML = editingTodo.description || '';
      }
    }
  }, [editingTodo?.id]); // Только при смене задачи, не при каждом изменении

  // Загрузка и polling уведомлений
  useEffect(() => {
    if (myAccountId) {
      loadNotifications(false); // Первая загрузка без звука
      
      // Polling каждые 10 секунд для проверки новых уведомлений
      const interval = setInterval(() => {
        loadNotifications(true); // Последующие загрузки со звуком
      }, 10000);
      
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
          
          // Устанавливаем права на просмотр всех задач (по умолчанию false)
          setCanSeeAllTasks(userData.canSeeAllTasks === true);
          console.log('[todos] canSeeAllTasks set to:', userData.canSeeAllTasks === true);
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
    if (!myAccountId || !content.trim()) return;
    
    const author = people.find(p => p.id === myAccountId);
    if (!author) return;

    // Парсим @упоминания (поддержка кириллицы и имени с фамилией)
    const mentionRegex = /@([a-zA-Zа-яА-ЯёЁ0-9_]+(?:\s+[a-zA-Zа-яА-ЯёЁ0-9_]+)?)/g;
    const mentions: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionText = match[1].trim();
      const mentionedPerson = people.find(p => 
        p.name.toLowerCase() === mentionText.toLowerCase() ||
        p.name.toLowerCase().startsWith(mentionText.toLowerCase())
      );
      if (mentionedPerson) {
        mentions.push(mentionedPerson.id);
      }
    }

    const newCommentObj: Comment = {
      id: `comment-${Date.now()}`,
      todoId,
      authorId: myAccountId,
      authorName: author.name,
      content: content.trim(),
      mentions,
      createdAt: new Date().toISOString()
    };

    // Получаем текущую задачу
    const currentTodo = todos.find(t => t.id === todoId);
    if (!currentTodo) return;

    // Обновляем комментарии
    const updatedComments = [...(currentTodo.comments || []), newCommentObj];

    // Сохраняем в базу данных через API
    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todoId,
          comments: updatedComments
        })
      });

      if (res.ok) {
        // Обновляем локальное состояние
        setTodos(prev => prev.map(t => {
          if (t.id === todoId) {
            return { ...t, comments: updatedComments };
          }
          return t;
        }));

        // Обновляем editingTodo если открыт
        if (editingTodo?.id === todoId) {
          setEditingTodo(prev => prev ? { ...prev, comments: updatedComments } : null);
        }

        setNewComment('');
        
        // Скроллим к последнему комментарию
        setTimeout(() => {
          commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        // Создаём уведомления для упомянутых и исполнителя
        const notifyUserIds = new Set<string>();
        
        // Добавляем исполнителя (если это не автор комментария)
        if (currentTodo.assignedToId && currentTodo.assignedToId !== myAccountId) {
          notifyUserIds.add(currentTodo.assignedToId);
        }
        
        // Добавляем заказчика (если это не автор комментария)
        if (currentTodo.assignedById && currentTodo.assignedById !== myAccountId) {
          notifyUserIds.add(currentTodo.assignedById);
        }
        
        // Добавляем упомянутых (если это не автор)
        mentions.forEach(id => {
          if (id !== myAccountId) notifyUserIds.add(id);
        });

        notifyUserIds.forEach(userId => {
          const notification: Notification = {
            id: `notif-${Date.now()}-${userId}`,
            type: mentions.includes(userId) ? 'mention' : 'comment',
            todoId,
            todoTitle: currentTodo.title,
            fromUserId: myAccountId,
            fromUserName: author.name,
            toUserId: userId,
            message: mentions.includes(userId) 
              ? `${author.name} упомянул вас в комментарии`
              : `${author.name} оставил комментарий`,
            read: false,
            createdAt: new Date().toISOString()
          };
          // Сохраняем в API и локальный state
          saveNotification(notification);
          setNotifications(prev => [notification, ...prev]);
          playNotificationSound();
        });

        // Отправляем уведомления в чат уведомлений
        const manager = new TaskNotificationManager(myAccountId, author.name);
        const relatedUsers = getTaskRelatedUsers({
          authorId: currentTodo.assignedById,
          assignedById: currentTodo.assignedById,
          assignedToId: currentTodo.assignedToId
        });
        await manager.notifyNewComment(
          relatedUsers,
          todoId,
          currentTodo.title,
          mentions
        );
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  }, [myAccountId, people, todos, editingTodo, playNotificationSound, saveNotification]);

  // Редактирование комментария
  const updateComment = useCallback(async (todoId: string, commentId: string, newContent: string) => {
    if (!newContent.trim()) return;
    
    // Получаем текущую задачу
    const currentTodo = todos.find(t => t.id === todoId);
    if (!currentTodo || !currentTodo.comments) return;

    // Обновляем комментарии
    const updatedComments = currentTodo.comments.map(c => 
      c.id === commentId ? { ...c, content: newContent.trim() } : c
    );

    // Сохраняем в базу данных через API
    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todoId,
          comments: updatedComments
        })
      });

      if (res.ok) {
        setTodos(prev => prev.map(t => {
          if (t.id === todoId) {
            return { ...t, comments: updatedComments };
          }
          return t;
        }));

        if (editingTodo?.id === todoId) {
          setEditingTodo(prev => prev ? { ...prev, comments: updatedComments } : null);
        }

        setEditingCommentId(null);
        setEditingCommentText('');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  }, [todos, editingTodo]);

  // Удаление комментария
  const deleteComment = useCallback(async (todoId: string, commentId: string) => {
    // Получаем текущую задачу
    const currentTodo = todos.find(t => t.id === todoId);
    if (!currentTodo || !currentTodo.comments) return;

    // Удаляем комментарий
    const updatedComments = currentTodo.comments.filter(c => c.id !== commentId);

    // Сохраняем в базу данных через API
    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todoId,
          comments: updatedComments
        })
      });

      if (res.ok) {
        setTodos(prev => prev.map(t => {
          if (t.id === todoId) {
            return { ...t, comments: updatedComments };
          }
          return t;
        }));

        if (editingTodo?.id === todoId) {
          setEditingTodo(prev => prev ? { ...prev, comments: updatedComments } : null);
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  }, [todos, editingTodo]);

  // Ответ на комментарий
  const startReply = useCallback((comment: Comment) => {
    setReplyingToComment(comment);
    setNewComment(`@${comment.authorName} `);
    commentInputRef.current?.focus();
  }, []);

  // Создание менеджера уведомлений
  const notificationManager = useCallback(() => {
    const author = people.find(p => p.id === myAccountId);
    if (!myAccountId || !author) return null;
    return new TaskNotificationManager(myAccountId, author.name);
  }, [myAccountId, people]);

  // Создание уведомления о новой задаче
  const createTaskNotification = useCallback(async (todo: Todo, type: 'new_task' | 'assignment' | 'status_change', oldStatus?: string) => {
    if (!myAccountId) return;
    
    const author = people.find(p => p.id === myAccountId);
    if (!author) return;

    const manager = notificationManager();
    if (!manager) return;

    // Собираем всех связанных пользователей
    const relatedUsers = getTaskRelatedUsers({
      authorId: todo.assignedById,
      assignedById: todo.assignedById,
      assignedToId: todo.assignedToId
    });

    // Уведомляем исполнителя (если назначен и это не автор)
    if (todo.assignedToId && todo.assignedToId !== myAccountId) {
      const notification: Notification = {
        id: `notif-${Date.now()}`,
        type,
        todoId: todo.id,
        todoTitle: todo.title,
        fromUserId: myAccountId,
        fromUserName: author.name,
        toUserId: todo.assignedToId,
        message: type === 'new_task' 
          ? `${author.name} создал задачу для вас`
          : type === 'assignment'
            ? `${author.name} назначил вас исполнителем`
            : `${author.name} изменил статус задачи`,
        read: false,
        createdAt: new Date().toISOString()
      };
      // Сохраняем в API и локальный state
      saveNotification(notification);
      setNotifications(prev => [notification, ...prev]);
      playNotificationSound();
    }

    // Уведомляем заказчика если статус "Готово к проверке" (review)
    if (type === 'status_change' && todo.status === 'review' && todo.assignedById && todo.assignedById !== myAccountId) {
      const notification: Notification = {
        id: `notif-${Date.now()}-customer`,
        type: 'status_change',
        todoId: todo.id,
        todoTitle: todo.title,
        fromUserId: myAccountId,
        fromUserName: author.name,
        toUserId: todo.assignedById,
        message: `${author.name} завершил задачу и ждёт проверки`,
        read: false,
        createdAt: new Date().toISOString()
      };
      // Сохраняем в API и локальный state
      saveNotification(notification);
      setNotifications(prev => [notification, ...prev]);
      playNotificationSound();
    }

    // Отправляем уведомления в чат уведомлений
    switch (type) {
      case 'new_task':
        await manager.notifyNewTask(
          todo.assignedToId ? [todo.assignedToId] : [],
          todo.id,
          todo.title,
          todo.assignedById
        );
        break;
      case 'status_change':
        await manager.notifyStatusChanged(
          relatedUsers,
          todo.id,
          todo.title,
          oldStatus || 'todo',
          todo.status || 'todo'
        );
        break;
      case 'assignment':
        await manager.notifyNewTask(
          todo.assignedToId ? [todo.assignedToId] : [],
          todo.id,
          todo.title,
          todo.assignedById
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

  // Получить уведомления для текущего пользователя
  const myNotifications = notifications.filter(n => n.toUserId === myAccountId);
  const unreadCount = myNotifications.filter(n => !n.read).length;

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
  const openTodoModal = (todo: Todo) => {
    // Автозаполнение "От кого" если не указано и myAccount - заказчик
    const myAccount = myAccountId ? people.find(p => p.id === myAccountId) : null;
    let updatedTodo = todo;
    if (!todo.assignedById && myAccount && myAccount.role === 'customer') {
      updatedTodo = { ...todo, assignedById: myAccount.id, assignedBy: myAccount.name };
    }
    setEditingTodo(updatedTodo);
    
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

  const closeTodoModal = () => {
    isClosingModalRef.current = true;
    setEditingTodo(null);
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
        setShowStatusFilter(false);
      }
      if (executorFilterRef.current && !executorFilterRef.current.contains(event.target as Node)) {
        setShowExecutorFilter(false);
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
  const addTodo = async (listId: string) => {
    if (!newTodoTitle.trim()) return;
    
    // Получаем данные myAccount для автозаполнения
    const myAccount = myAccountId ? people.find(p => p.id === myAccountId) : null;
    const isExecutor = myAccount && myAccount.role === 'executor';
    const isCustomer = myAccount && (myAccount.role === 'customer' || myAccount.role === 'universal');
    
    // Если выбран исполнитель вручную - используем его
    const selectedAssignee = newTodoAssigneeId ? people.find(p => p.id === newTodoAssigneeId) : null;
    
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTodoTitle,
          listId: listId,
          priority: 'medium',
          // Если выбран исполнитель вручную - используем его
          ...(selectedAssignee && { assignedToId: selectedAssignee.id, assignedTo: selectedAssignee.name }),
          // Иначе если текущий пользователь исполнитель - ставим его
          ...(!selectedAssignee && isExecutor && { assignedToId: myAccount.id, assignedTo: myAccount.name }),
          // Если руководитель/универсал - ставим его постановщиком
          ...(isCustomer && { assignedById: myAccount.id, assignedBy: myAccount.name })
        })
      });
      
      if (res.ok) {
        const newTodo = await res.json();
        setTodos(prev => [...prev, newTodo]);
        setNewTodoTitle('');
        setNewTodoAssigneeId(null);
        setShowNewTodoAssigneeDropdown(false);
        setAddingToList(null);
        
        // Отправляем уведомление исполнителю о новой задаче
        if (newTodo.assignedToId) {
          createTaskNotification(newTodo, 'new_task');
        }
      }
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  };

  // Переключение статуса задачи
  const toggleTodo = async (todo: Todo) => {
    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todo.id,
          completed: !todo.completed
        })
      });
      
      if (res.ok) {
        setTodos(prev => prev.map(t => 
          t.id === todo.id ? { ...t, completed: !t.completed } : t
        ));
      }
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  };

  // Обновление задачи
  const updateTodo = async (todo: Todo) => {
    try {
      // Проверяем, является ли задача новой (temp-id)
      const isNewTodo = todo.id.startsWith('temp-');
      
      // Получаем текущую версию задачи для сравнения статуса (только для существующих задач)
      const currentTodo = !isNewTodo ? todos.find(t => t.id === todo.id) : null;
      const statusChanged = currentTodo && currentTodo.status !== todo.status;
      const oldStatus = currentTodo?.status;
      
      const res = await fetch('/api/todos', {
        method: isNewTodo ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isNewTodo ? {
          ...todo,
          id: undefined, // Удаляем temp-id для создания
        } : todo)
      });
      
      if (res.ok) {
        let updated = await res.json();
        
        // Если включена опция "Поместить на календарь" и ещё не добавлено
        if (todo.addToCalendar && !updated.calendarEventId) {
          const calendarResult = await sendToCalendar(updated);
          if (calendarResult) {
            // Обновляем задачу с calendarEventId
            updated = { ...updated, calendarEventId: calendarResult };
          }
        }
        
        // Отправляем уведомление при изменении статуса
        if (statusChanged) {
          createTaskNotification(todo, 'status_change', oldStatus);
        }
        
        // Отправляем уведомление при назначении/смене исполнителя
        const assigneeChanged = currentTodo && currentTodo.assignedToId !== todo.assignedToId;
        if (assigneeChanged && todo.assignedToId) {
          createTaskNotification(todo, 'assignment');
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
      
      // Формат для локального API calendar-events
      const eventData = {
        title: todo.title,
        description: [
          todo.description ? todo.description.replace(/<[^>]*>/g, ' ') : '',
          todo.assignedTo ? `Исполнитель: ${todo.assignedTo}` : '',
          todo.assignedBy ? `Постановщик: ${todo.assignedBy}` : '',
          list?.name ? `Список: ${list.name}` : '',
          todo.linkUrl ? `Ссылка: ${todo.linkUrl}` : ''
        ].filter(Boolean).join('\n'),
        date: todo.dueDate || new Date().toISOString().split('T')[0],
        priority: todo.priority || 'medium',
        type: isTZ ? 'tz' : 'task',
        sourceId: todo.id,
        assignedTo: todo.assignedTo,
        assignedBy: todo.assignedBy,
        listName: list?.name,
        linkUrl: todo.linkUrl,
        linkTitle: todo.linkTitle
      };

      console.log('Sending to calendar:', eventData);

      // Отправляем напрямую на локальный API calendar-events
      const response = await fetch('/api/calendar-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });

      if (response.ok) {
        const result = await response.json();
        const calendarEventId = result.id;
        // Сохраняем ID события в задаче
        await fetch('/api/todos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: todo.id, calendarEventId })
        });
        console.log('Event added to calendar:', result);
        return calendarEventId;
      } else {
        const errorText = await response.text();
        console.error('Calendar error:', response.status, errorText);
        alert('Ошибка добавления в календарь: ' + errorText);
        return null;
      }
    } catch (error) {
      console.error('Error sending to calendar:', error);
      alert('Не удалось связаться с сервером календаря');
      return null;
    }
  };

  // Перемещение задачи в другой список
  const moveTodo = async (todoId: string, newListId: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo || todo.listId === newListId) return;
    
    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todoId,
          listId: newListId
        })
      });
      
      if (res.ok) {
        setTodos(prev => prev.map(t => 
          t.id === todoId ? { ...t, listId: newListId } : t
        ));
      }
    } catch (error) {
      console.error('Error moving todo:', error);
    }
  };

  // Удаление задачи
  const deleteTodo = async (id: string) => {
    try {
      const res = await fetch(`/api/todos?id=${id}`, { method: 'DELETE' });
      
      if (res.ok) {
        setTodos(prev => prev.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  // Добавление списка
  const addList = async () => {
    console.log('[addList] === START ===');
    console.log('[addList] Called with name:', newListName);
    console.log('[addList] myAccountId:', myAccountId);
    console.log('[addList] newListColor:', newListColor);
    console.log('[addList] newListAssigneeId:', newListAssigneeId);
    
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
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          // Новый список будет последним в отфильтрованном списке
          const filteredLists = lists.filter(l => !l.archived).sort((a, b) => a.order - b.order);
          const newIndex = filteredLists.length; // Так как новый список ещё не в lists, он будет добавлен после loadData
          setSelectedColumnIndex(newIndex);
        }
        
        setNewListName('');
        setNewListAssigneeId(null);
        setShowAddList(false);
        // Сразу открываем настройки нового списка
        setShowListSettings(newList.id);
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
  const toggleArchiveTodo = async (todoId: string, archive: boolean) => {
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
        setTodos(prev => prev.map(t => t.id === todoId ? updated : t));
      }
    } catch (error) {
      console.error('Error archiving todo:', error);
    }
  };

  // Обновление порядка списков
  const updateListsOrder = async (reorderedLists: TodoList[]) => {
    try {
      // Обновляем локально сразу
      setLists(reorderedLists);
      
      // Отправляем обновления на сервер
      await Promise.all(reorderedLists.map((list, index) => 
        fetch('/api/todos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: list.id,
            type: 'list',
            order: index
          })
        })
      ));
    } catch (error) {
      console.error('Error updating lists order:', error);
      loadData(); // Перезагружаем при ошибке
    }
  };

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
  const handleDragStart = (e: React.DragEvent, todo: Todo) => {
    setDraggedTodo(todo);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', todo.id);
    e.dataTransfer.setData('type', 'todo');
    // Добавляем задержку для красивой анимации
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedTodo(null);
    setDragOverListId(null);
    setDragOverTodoId(null);
    setDraggedList(null);
    setDragOverListOrder(null);
    dragCounter.current = 0;
    // Сбрасываем состояние скролла доски
    setIsDraggingBoard(false);
    if (boardRef.current) {
      boardRef.current.style.cursor = 'grab';
      boardRef.current.style.userSelect = 'auto';
    }
  };

  const handleDragEnter = (e: React.DragEvent, listId: string) => {
    e.preventDefault();
    if (draggedTodo) {
      dragCounter.current++;
      setDragOverListId(listId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedTodo) {
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setDragOverListId(null);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Обработчик перетаскивания над задачей (для вертикального изменения порядка)
  const handleTodoDragOver = (e: React.DragEvent, todoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTodo && draggedTodo.id !== todoId) {
      setDragOverTodoId(todoId);
    }
  };

  // Обработчик drop на задачу (для вертикального изменения порядка)
  const handleTodoDrop = async (e: React.DragEvent, targetTodo: Todo) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedTodo || draggedTodo.id === targetTodo.id) return;
    
    // Получаем все задачи этого списка
    const listTodos = todos
      .filter(t => t.listId === targetTodo.listId && !t.archived)
      .sort((a, b) => a.order - b.order);
    
    const draggedIndex = listTodos.findIndex(t => t.id === draggedTodo.id);
    const targetIndex = listTodos.findIndex(t => t.id === targetTodo.id);
    
    if (draggedIndex === -1) {
      // Задача из другого списка - перемещаем в новый список на позицию targetIndex
      const newOrder = targetTodo.order;
      const updatedTodo = { ...draggedTodo, listId: targetTodo.listId, order: newOrder };
      
      // Получаем задачи, которые нужно сдвинуть
      const todosToShift = todos.filter(
        t => t.listId === targetTodo.listId && t.order >= newOrder && t.id !== draggedTodo.id && !t.archived
      ).map(t => ({ ...t, order: t.order + 1 }));
      
      // Обновляем порядок остальных задач
      const updatedTodos = todos.map(t => {
        if (t.id === draggedTodo.id) {
          return updatedTodo;
        }
        const shiftedTodo = todosToShift.find(st => st.id === t.id);
        if (shiftedTodo) {
          return shiftedTodo;
        }
        return t;
      });
      
      setTodos(updatedTodos);
      
      // Сохраняем на сервер все изменённые задачи
      try {
        await Promise.all([
          fetch('/api/todos', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedTodo)
          }),
          ...todosToShift.map(todo =>
            fetch('/api/todos', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(todo)
            })
          )
        ]);
      } catch (error) {
        console.error('Error moving todo:', error);
      }
    } else {
      // Задача из того же списка - меняем порядок
      const newListTodos = [...listTodos];
      const [removed] = newListTodos.splice(draggedIndex, 1);
      newListTodos.splice(targetIndex, 0, removed);
      
      // Обновляем order для всех задач в списке
      const updatedListTodos = newListTodos.map((t, index) => ({ ...t, order: index }));
      
      const updatedTodos = todos.map(t => {
        const updatedTodo = updatedListTodos.find(lt => lt.id === t.id);
        if (updatedTodo) {
          return updatedTodo;
        }
        return t;
      });
      
      setTodos(updatedTodos);
      
      // Сохраняем на сервер все задачи списка с новым order
      try {
        await Promise.all(
          updatedListTodos.map(todo =>
            fetch('/api/todos', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(todo)
            })
          )
        );
      } catch (error) {
        console.error('Error reordering todos:', error);
      }
    }
    
    setDraggedTodo(null);
    setDragOverTodoId(null);
    setDragOverListId(null);
  };

  const handleDrop = (e: React.DragEvent, listId: string) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOverListId(null);
    setDragOverTodoId(null);
    
    if (draggedTodo) {
      moveTodo(draggedTodo.id, listId);
    }
    setDraggedTodo(null);
  };

  // Drag and Drop handlers for lists
  const handleListDragStart = (e: React.DragEvent, list: TodoList) => {
    e.stopPropagation();
    setDraggedList(list);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', list.id);
    e.dataTransfer.setData('type', 'list');
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = '0.5';
    }, 0);
  };

  const handleListDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedList(null);
    setDragOverListOrder(null);
  };

  const handleListDragOver = (e: React.DragEvent, targetList: TodoList) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedList && draggedList.id !== targetList.id) {
      setDragOverListOrder(targetList.order);
    }
  };

  const handleListDrop = (e: React.DragEvent, targetList: TodoList) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedList && draggedList.id !== targetList.id) {
      const activeLists = lists.filter(l => !l.archived).sort((a, b) => a.order - b.order);
      const draggedIndex = activeLists.findIndex(l => l.id === draggedList.id);
      const targetIndex = activeLists.findIndex(l => l.id === targetList.id);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const reordered = [...activeLists];
        const [removed] = reordered.splice(draggedIndex, 1);
        reordered.splice(targetIndex, 0, removed);
        
        // Обновляем order для каждого списка
        const updated = reordered.map((list, index) => ({ ...list, order: index }));
        updateListsOrder(updated);
      }
    }
    
    setDraggedList(null);
    setDragOverListOrder(null);
  };

  // Drag to scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Только для desktop
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
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
    // Проверяем, имеет ли пользователь ПОЛНЫЙ доступ к столбцу (создатель, в allowedUsers или в allowedDepartments)
    const list = listId ? lists.find(l => l.id === listId) : null;
    const hasFullListAccess = list && (
      list.creatorId === myAccountId ||
      (list.allowedUsers && list.allowedUsers.includes(myAccountId || '')) ||
      (myDepartment && list.allowedDepartments && list.allowedDepartments.includes(myDepartment))
    );
    
    return todoList.filter(todo => {
      if (!showCompleted && todo.completed) return false;
      
      // Фильтр по правам доступа (если не может видеть все задачи)
      if (!canSeeAllTasks && myAccountId) {
        // Показываем задачи, где пользователь исполнитель, заказчик, ИЛИ имеет полный доступ к столбцу
        const isExecutor = todo.assignedToId === myAccountId || todo.assignedToIds?.includes(myAccountId);
        const isCustomer = todo.assignedById === myAccountId;
        // Если нет полного доступа к столбцу - показываем только свои задачи
        if (!hasFullListAccess && !isExecutor && !isCustomer) return false;
      }
      
      // Фильтр по статусу
      if (statusFilter !== 'all') {
        if (todo.status !== statusFilter) return false;
      }
      
      // Фильтр по исполнителю (включая множественных)
      if (executorFilter !== 'all') {
        const matchesFilter = todo.assignedToId === executorFilter || todo.assignedToIds?.includes(executorFilter);
        if (!matchesFilter) return false;
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return todo.title.toLowerCase().includes(query) || 
               todo.description?.toLowerCase().includes(query);
      }
      return true;
    });
  };

  // Получение задач для списка (исключая архивные)
  const getTodosForList = (listId: string, includeArchived: boolean = false) => {
    const listTodos = todos.filter(t => t.listId === listId && (includeArchived || !t.archived));
    return filterTodos(listTodos, listId).sort((a, b) => {
      // Сначала незавершённые
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      // Потом по приоритету
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  // Получение архивных задач
  const getArchivedTodos = () => {
    return todos.filter(t => t.archived);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col text-gray-900 dark:text-white bg-[var(--bg-primary)] overflow-hidden">
      {/* Header */}
      <header className="h-12 backdrop-blur-xl bg-[var(--bg-secondary)]/60 border-b border-white/10 flex items-center px-2 sm:px-4 flex-shrink-0 sticky top-0 z-40">
        {/* Search - на мобилке иконка, на десктопе поле */}
        {/* Mobile search toggle */}
        <button
          onClick={() => setShowMobileSearch(!showMobileSearch)}
          className="sm:hidden w-8 h-8 rounded-full bg-[var(--bg-glass)] border border-[var(--border-color)] flex items-center justify-center hover:bg-[var(--bg-glass-hover)] transition-colors"
        >
          <Search className="w-4 h-4 text-[var(--text-muted)]" />
        </button>
        
        {/* Desktop search */}
        <div className="relative hidden sm:block flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-1.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-[25px] w-full text-sm focus:outline-none focus:border-[var(--border-light)] transition-colors"
          />
        </div>
        
        {/* Mobile search expanded */}
        {showMobileSearch && (
          <div className="sm:hidden absolute left-0 right-0 top-full bg-[var(--bg-tertiary)] border-b border-[var(--border-secondary)] p-2 z-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="pl-9 pr-10 py-2 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-[25px] w-full text-sm focus:outline-none focus:border-[var(--border-light)] transition-colors"
              />
              <button
                onClick={() => { setShowMobileSearch(false); setSearchQuery(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-white/10 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </button>
            </div>
          </div>
        )}

        {/* Status Filter Dropdown */}
        <div className="relative ml-2 sm:ml-4" ref={statusFilterRef}>
          <button
            onClick={() => setShowStatusFilter(!showStatusFilter)}
            className="flex-shrink-0 px-3 py-2 min-h-[36px] rounded-full text-xs font-medium transition-all flex items-center gap-2 border bg-[var(--bg-glass)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-glass-hover)]"
          >
            <span className={`w-2 h-2 rounded-full transition-colors ${
              statusFilter === 'in-progress' ? 'bg-blue-400' :
              statusFilter === 'pending' ? 'bg-orange-400' :
              statusFilter === 'review' ? 'bg-green-400' : 
              statusFilter === 'cancelled' ? 'bg-red-400' :
              statusFilter === 'stuck' ? 'bg-yellow-500' : 'bg-white/40'
            }`} />
            <span>{statusFilter === 'all' ? 'Статус' : 
             statusFilter === 'in-progress' ? 'В работе' :
             statusFilter === 'pending' ? 'Ожидание' : 
             statusFilter === 'cancelled' ? 'Отменена' :
             statusFilter === 'stuck' ? 'Застряла' : 'Проверка'}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showStatusFilter ? 'rotate-180' : ''}`} />
          </button>
          
          {showStatusFilter && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 py-1">
              <button
                onClick={() => { setStatusFilter('all'); setShowStatusFilter(false); }}
                className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-glass)] transition-colors ${
                  statusFilter === 'all' ? 'text-[var(--text-primary)] bg-[var(--bg-glass)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                Все статусы
              </button>
              <button
                onClick={() => { setStatusFilter('in-progress'); setShowStatusFilter(false); }}
                className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-glass)] transition-colors ${
                  statusFilter === 'in-progress' ? 'text-blue-400 bg-blue-500/10' : 'text-[var(--text-secondary)]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                В работе
              </button>
              <button
                onClick={() => { setStatusFilter('pending'); setShowStatusFilter(false); }}
                className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-glass)] transition-colors ${
                  statusFilter === 'pending' ? 'text-orange-400 bg-orange-500/10' : 'text-[var(--text-secondary)]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                В ожидании
              </button>
              <button
                onClick={() => { setStatusFilter('review'); setShowStatusFilter(false); }}
                className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-glass)] transition-colors ${
                  statusFilter === 'review' ? 'text-green-400 bg-green-500/10' : 'text-[var(--text-secondary)]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Готово к проверке
              </button>
              <button
                onClick={() => { setStatusFilter('cancelled'); setShowStatusFilter(false); }}
                className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-glass)] transition-colors ${
                  statusFilter === 'cancelled' ? 'text-red-400 bg-red-500/10' : 'text-[var(--text-secondary)]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Отменена
              </button>
              <button
                onClick={() => { setStatusFilter('stuck'); setShowStatusFilter(false); }}
                className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-glass)] transition-colors ${
                  statusFilter === 'stuck' ? 'text-yellow-500 bg-yellow-500/10' : 'text-[var(--text-secondary)]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                Застряла
              </button>
            </div>
          )}
        </div>

        {/* Executor Filter Dropdown - иконка на мобильных */}
        <div className="relative ml-2 hidden sm:block" ref={executorFilterRef}>
          <button
            onClick={() => setShowExecutorFilter(!showExecutorFilter)}
            className={`flex-shrink-0 px-3 py-2 min-h-[36px] rounded-full text-xs font-medium transition-all flex items-center gap-2 border ${
              executorFilter !== 'all'
                ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                : 'bg-[var(--bg-glass)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-glass-hover)]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            {executorFilter === 'all' 
              ? 'Исполнитель' 
              : people.find(p => p.id === executorFilter)?.name || 'Исполнитель'}
            <ChevronDown className={`w-3 h-3 transition-transform ${showExecutorFilter ? 'rotate-180' : ''}`} />
          </button>
          
          {showExecutorFilter && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
              <button
                onClick={() => { setExecutorFilter('all'); setShowExecutorFilter(false); }}
                className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-glass)] transition-colors ${
                  executorFilter === 'all' ? 'text-[var(--text-primary)] bg-[var(--bg-glass)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Все исполнители
              </button>
              {people.filter(p => p.role === 'executor' || p.role === 'universal').map(person => (
                <button
                  key={person.id}
                  onClick={() => { setExecutorFilter(person.id); setShowExecutorFilter(false); }}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-glass)] transition-colors ${
                    executorFilter === person.id ? 'text-purple-400 bg-purple-500/10' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {person.name}
                  {person.id === myAccountId && (
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

          {/* Settings Dropdown */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              title="Настройки"
              className="flex-shrink-0 w-8 h-8 bg-[var(--bg-glass)] hover:bg-[var(--bg-glass-hover)] rounded-full transition-colors flex items-center justify-center border border-[var(--border-glass)] backdrop-blur-sm"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            {showSettingsMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 py-1">
                <label className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer text-[var(--text-secondary)] hover:bg-[var(--bg-glass)] transition-colors">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    className="rounded w-3.5 h-3.5"
                  />
                  <span>Выполненные задачи</span>
                </label>
                <label className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer text-[var(--text-secondary)] hover:bg-[var(--bg-glass)] transition-colors">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={toggleSound}
                    className="rounded w-3.5 h-3.5"
                  />
                  <span>Звук уведомлений</span>
                  {soundEnabled && <Volume2 className="w-3 h-3 text-green-400 ml-auto" />}
                </label>
                <div className="border-t border-[var(--border-color)] my-1" />
                <button
                  onClick={() => { setShowTelegramSettings(true); setShowSettingsMenu(false); }}
                  className={`w-full px-3 py-2 text-xs text-left flex items-center gap-2 transition-colors ${
                    telegramEnabled 
                      ? 'text-cyan-400 hover:bg-cyan-500/10' 
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-glass)]'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  Уведомления
                  {telegramEnabled && <span className="ml-auto text-[10px] bg-cyan-500/20 px-1.5 py-0.5 rounded">ON</span>}
                </button>
                <button
                  onClick={() => { setShowCategoryManager(true); setShowSettingsMenu(false); }}
                  className="w-full px-3 py-2 text-xs text-left flex items-center gap-2 text-[var(--text-secondary)] hover:bg-[var(--bg-glass)] transition-colors"
                >
                  <Tag className="w-3.5 h-3.5" />
                  Категории
                  <span className="ml-auto text-[10px] text-[var(--text-muted)]">{categories.length}</span>
                </button>
              </div>
            )}
          </div>
          
          {/* Кнопка архива - всегда показываем */}
          <button
            onClick={() => setShowArchive(!showArchive)}
            title="Архив"
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all border backdrop-blur-sm ${
              showArchive 
                ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' 
                : 'bg-[var(--bg-glass)] text-[var(--text-secondary)] border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)] hover:text-orange-400'
            }`}
          >
            <Archive className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Column Switcher - только на мобильных */}
      <div className="md:hidden flex-shrink-0 bg-white/50 dark:bg-[var(--bg-tertiary)] backdrop-blur-md border-b border-gray-200/50 dark:border-[var(--border-color)]/50">
        <div className="flex items-center gap-1 px-2 py-3">
          {/* Левая стрелка */}
          <button
            onClick={() => {
              const nonArchivedLists = lists.filter(l => !l.archived).sort((a, b) => a.order - b.order);
              if (selectedColumnIndex > 0) {
                setSelectedColumnIndex(selectedColumnIndex - 1);
              }
            }}
            disabled={selectedColumnIndex === 0}
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              selectedColumnIndex === 0
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-blue-500 dark:text-blue-400 bg-white/80 dark:bg-[var(--bg-secondary)]/80 shadow-sm hover:shadow-md active:scale-95'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Скроллящийся список */}
          <div 
            className="flex-1 flex gap-2 items-center overflow-x-auto overflow-y-hidden"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-x'
            }}
          >
            <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            
            {/* Кнопка добавления списка */}
            <button
              onClick={() => setShowAddList(true)}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-white/80 dark:bg-[var(--bg-secondary)]/80 backdrop-blur-sm shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center text-blue-500 dark:text-blue-400 transition-all border border-blue-200 dark:border-blue-500/30"
            >
              <Plus className="w-5 h-5" />
            </button>
            
            {/* Показываем ТОЛЬКО активную вкладку */}
            {(() => {
              const sortedLists = lists.filter(l => !l.archived).sort((a, b) => a.order - b.order);
              const activeList = sortedLists[selectedColumnIndex];
              if (!activeList) return null;
              const listTodos = getTodosForList(activeList.id, showArchive);
              return (
                <div
                  className="flex-shrink-0 px-5 py-2.5 text-sm font-semibold bg-gradient-to-br text-white shadow-lg rounded-2xl flex items-center gap-2 whitespace-nowrap"
                  style={{ backgroundImage: `linear-gradient(135deg, ${activeList.color}, ${activeList.color}dd)` }}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-white/80" />
                  <span className="max-w-[120px] truncate">{activeList.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">
                    {listTodos.length}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Правая стрелка */}
          <button
            onClick={() => {
              const nonArchivedLists = lists.filter(l => !l.archived).sort((a, b) => a.order - b.order);
              if (selectedColumnIndex < nonArchivedLists.length - 1) {
                setSelectedColumnIndex(selectedColumnIndex + 1);
              }
            }}
            disabled={selectedColumnIndex >= lists.filter(l => !l.archived).length - 1}
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              selectedColumnIndex >= lists.filter(l => !l.archived).length - 1
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-blue-500 dark:text-blue-400 bg-white/80 dark:bg-[var(--bg-secondary)]/80 shadow-sm hover:shadow-md active:scale-95'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 min-h-0 pb-36 md:pb-16 overflow-y-auto md:overflow-y-auto">
        <div 
          ref={boardRef}
          className="px-1 sm:px-4 py-2 sm:py-4 flex flex-col md:flex-row gap-2 sm:gap-4 md:overflow-x-auto scrollbar-hide"
          style={{ cursor: typeof window !== 'undefined' && window.innerWidth >= 768 ? 'grab' : 'default' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {lists.filter(l => !l.archived).sort((a, b) => a.order - b.order)
            // При поиске показываем только списки с результатами
            // Показываем столбцы: свои, с полным доступом (allowedUsers/allowedDepartments), или где есть назначенные задачи
            .filter(list => {
              if (!canSeeAllTasks && myAccountId) {
                // Проверяем полный доступ к столбцу
                const hasFullAccess = list.creatorId === myAccountId || 
                  (list.allowedUsers && list.allowedUsers.includes(myAccountId)) ||
                  (myDepartment && list.allowedDepartments && list.allowedDepartments.includes(myDepartment));
                // Если есть полный доступ - показываем столбец всегда
                if (hasFullAccess) {
                  if (!searchQuery) return true;
                  const listTodos = getTodosForList(list.id, showArchive);
                  return listTodos.length > 0;
                }
                // Если нет полного доступа - показываем только если есть назначенные задачи
                const listTodos = getTodosForList(list.id, showArchive);
                if (listTodos.length === 0) return false;
              }
              if (!searchQuery) return true; // Без поиска показываем все списки
              const listTodos = getTodosForList(list.id, showArchive);
              return listTodos.length > 0; // С поиском - только списки с результатами
            })
            .map((list, index) => {
            const listTodos = getTodosForList(list.id, showArchive);
            const completedCount = todos.filter(t => t.listId === list.id && t.completed).length;
            const totalCount = todos.filter(t => t.listId === list.id).length;
            const isDropTarget = dragOverListId === list.id && draggedTodo?.listId !== list.id;
            const isListDropTarget = dragOverListOrder === list.order && draggedList?.id !== list.id;
            
            // На мобильных показываем только выбранную колонку (используем CSS для правильного SSR)
            const isNotSelectedOnMobile = index !== selectedColumnIndex;
            
            return (
              <div
                key={list.id}
                onDragOver={(e) => {
                  handleDragOver(e);
                  if (!draggedTodo) handleListDragOver(e, list);
                }}
                onDrop={(e) => {
                  if (draggedTodo) {
                    handleDrop(e, list.id);
                  } else if (draggedList) {
                    handleListDrop(e, list);
                  }
                }}
                className={`flex-shrink-0 w-full md:w-80 flex flex-col rounded-xl transition-all ${
                  isNotSelectedOnMobile ? 'hidden md:flex' : 'flex'
                } ${
                  isDropTarget ? 'ring-2 ring-white/30 ring-opacity-50' : ''
                } ${isListDropTarget ? 'ring-2 ring-blue-500/50' : ''} ${draggedList?.id === list.id ? 'opacity-50 scale-95' : ''}`}
                onDragEnter={(e) => handleDragEnter(e, list.id)}
                onDragLeave={handleDragLeave}
              >
                {/* List Header */}
                <div 
                  draggable={typeof window !== 'undefined' && window.innerWidth >= 768}
                  onDragStart={(e) => handleListDragStart(e, list)}
                  onDragEnd={handleListDragEnd}
                  className="bg-[#e5e5e5] dark:bg-[var(--bg-tertiary)] border border-gray-300 dark:border-[var(--border-color)] rounded-t-xl p-2 sm:p-2.5 flex-shrink-0 md:cursor-grab md:active:cursor-grabbing"
                >
                  <div className="flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1.5 sm:gap-1.5">
                      {/* Drag handle - только на десктопе */}
                      <div
                        className="hidden md:block p-0.5 -ml-1 rounded transition-colors opacity-0 group-hover:opacity-40"
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
                        <h3 
                          className="font-medium text-sm sm:text-sm truncate cursor-pointer text-gray-900 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 transition-colors pointer-events-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingListId(list.id);
                            setEditingListName(list.name);
                          }}
                          title="Кликните для переименования"
                        >
                          {list.name}
                        </h3>
                      )}
                      <span className="text-[10px] text-gray-500 dark:text-white/50 bg-gray-200 dark:bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded-full">
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
                        onClick={() => setAddingToList(list.id)}
                        className="flex-shrink-0 w-7 h-7 bg-[var(--bg-glass)] hover:bg-green-500/30 rounded-full transition-all duration-200 text-green-400 flex items-center justify-center border border-[var(--border-glass)] backdrop-blur-sm"
                        title="Добавить задачу"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      {/* Меню ... */}
                      <div className="relative">
                        <button
                          onClick={() => setShowListMenu(showListMenu === list.id ? null : list.id)}
                          className="w-7 h-7 bg-[var(--bg-glass)] hover:bg-[var(--bg-glass-hover)] rounded-full transition-all duration-200 text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center justify-center border border-[var(--border-glass)] backdrop-blur-sm"
                          title="Действия со списком"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        {showListMenu === list.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 py-1 pointer-events-auto">
                            <button
                              onClick={() => { setShowListMenu(null); setShowListSettings(list.id); }}
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
                  className={`bg-[var(--bg-secondary)] border-x border-b border-[var(--border-color)] rounded-b-xl p-2 flex flex-col gap-2 min-h-[100px] transition-colors ${
                    isDropTarget ? 'bg-[#eaeaea] dark:bg-[var(--bg-glass)]' : ''
                  }`}
                >
                  {/* Add Task Form */}
                  {addingToList === list.id && (
                    <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-3">
                      <input
                        type="text"
                        placeholder="Название задачи..."
                        value={newTodoTitle}
                        onChange={(e) => setNewTodoTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addTodo(list.id);
                          if (e.key === 'Escape') { setAddingToList(null); setNewTodoTitle(''); setNewTodoAssigneeId(null); }
                        }}
                        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg mb-2 focus:outline-none focus:border-white/30"
                        autoFocus
                      />
                      {/* Выбор исполнителя */}
                      <div className="relative mb-2">
                        <button
                          onClick={() => setShowNewTodoAssigneeDropdown(!showNewTodoAssigneeDropdown)}
                          className="w-full px-2 py-1.5 md:px-3 md:py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-left text-xs md:text-sm flex items-center justify-between hover:border-[var(--border-light)] transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <UserCheck className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            {newTodoAssigneeId 
                              ? people.find(p => p.id === newTodoAssigneeId)?.name || 'Исполнитель'
                              : 'Выбрать исполнителя'}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${showNewTodoAssigneeDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showNewTodoAssigneeDropdown && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 py-1 max-h-48 overflow-y-auto">
                            <button
                              onClick={() => { setNewTodoAssigneeId(null); setShowNewTodoAssigneeDropdown(false); }}
                              className={`w-full px-2 py-1.5 md:px-3 md:py-2 text-left text-[10px] md:text-xs flex items-center gap-1.5 md:gap-2 hover:bg-[var(--bg-glass)] transition-colors ${
                                !newTodoAssigneeId ? 'text-[var(--text-primary)] bg-[var(--bg-glass)]' : 'text-[var(--text-secondary)]'
                              }`}
                            >
                              <Users className="w-3.5 h-3.5" />
                              Без исполнителя
                            </button>
                            {people.filter(p => p.role === 'executor' || p.role === 'universal').map(person => (
                              <button
                                key={person.id}
                                onClick={() => { setNewTodoAssigneeId(person.id); setShowNewTodoAssigneeDropdown(false); }}
                                className={`w-full px-2 py-1.5 md:px-3 md:py-2 text-left text-[10px] md:text-xs flex items-center gap-1.5 md:gap-2 hover:bg-[var(--bg-glass)] transition-colors ${
                                  newTodoAssigneeId === person.id ? 'text-purple-400 bg-purple-500/10' : 'text-[var(--text-secondary)]'
                                }`}
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                {person.name}
                                {person.id === myAccountId && (
                                  <span className="ml-auto text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">Я</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => addTodo(list.id)}
                          className="flex-1 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all"
                        >
                          Добавить
                        </button>
                        <button
                          onClick={() => { setAddingToList(null); setNewTodoTitle(''); setNewTodoAssigneeId(null); }}
                          className="px-3 py-1.5 bg-[var(--bg-glass)] hover:bg-[var(--bg-glass-hover)] rounded-lg text-sm transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tasks */}
                  {listTodos.map(todo => (
                    <div
                      key={todo.id}
                      draggable={typeof window !== 'undefined' && window.innerWidth >= 768}
                      onDragStart={(e) => handleDragStart(e, todo)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleTodoDragOver(e, todo.id)}
                      onDrop={(e) => handleTodoDrop(e, todo)}
                      onMouseEnter={(e) => handleTodoMouseEnter(e, todo)}
                      onMouseLeave={handleTodoMouseLeave}
                      className={`
                        group bg-white dark:bg-[var(--bg-tertiary)] border border-gray-300 dark:border-[var(--border-color)] rounded-lg p-1.5 sm:p-2 md:cursor-grab md:active:cursor-grabbing
                        transition-all duration-200 hover:shadow-lg hover:border-gray-400 dark:hover:border-[var(--border-light)] border-l-3 ${PRIORITY_COLORS[todo.priority]}
                        ${todo.completed ? 'opacity-70' : ''}
                        ${draggedTodo?.id === todo.id ? 'opacity-50 scale-95' : ''}
                        ${dragOverTodoId === todo.id && draggedTodo?.id !== todo.id ? 'border-t-2 border-t-blue-500' : ''}
                        shadow-md
                      `}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 pointer-events-none">
                        {/* Grip handle */}
                        <div className="mt-0.5 opacity-0 group-hover:opacity-40 transition-opacity duration-200 text-gray-400 dark:text-white/50">
                          <GripVertical className="w-3 h-3" />
                        </div>
                        
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleTodo(todo)}
                          className={`
                            w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all pointer-events-auto
                            ${todo.completed 
                              ? 'bg-green-500 border-green-500 text-white' 
                              : 'border-gray-300 dark:border-[var(--border-color)] hover:border-green-500'
                            }
                          `}
                        >
                          {todo.completed && <Check className="w-3 h-3 sm:w-2.5 sm:h-2.5" />}
                        </button>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm sm:text-xs ${todo.completed ? 'line-through text-gray-400 dark:text-white/50' : 'text-gray-900 dark:text-white'}`}>
                            {todo.title}
                          </p>
                          {todo.description && (
                            <p 
                              className="text-xs sm:text-[10px] text-gray-700 dark:text-white/60 mt-1 sm:mt-0.5 line-clamp-2"
                              dangerouslySetInnerHTML={{ __html: todo.description.replace(/<[^>]*>/g, ' ').slice(0, 100) }}
                            />
                          )}
                          <div className="flex items-center gap-2 sm:gap-1.5 mt-2 sm:mt-1.5 flex-wrap">
                            {todo.status && !todo.completed && (
                              <span className={`px-2 py-1 sm:px-1.5 sm:py-0.5 rounded text-xs sm:text-[8px] font-medium ${
                                todo.status === 'in-progress' 
                                  ? 'bg-blue-500/20 text-blue-400' 
                                  : todo.status === 'pending'
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : todo.status === 'cancelled'
                                      ? 'bg-red-500/20 text-red-400'
                                      : todo.status === 'stuck'
                                        ? 'bg-yellow-500/20 text-yellow-500'
                                        : 'bg-green-500/20 text-green-400'
                              }`}>
                                {todo.status === 'in-progress' ? 'В работе' : 
                                 todo.status === 'pending' ? 'В ожидании' : 
                                 todo.status === 'cancelled' ? 'Отменена' :
                                 todo.status === 'stuck' ? 'Застряла' : 'Готово к проверке'}
                              </span>
                            )}
                            {todo.assignedById && (
                              <span className="text-xs sm:text-[9px] text-gray-700 dark:text-white/60" title="От кого">
                                {getPersonNameById(people, todo.assignedById, todo.assignedBy)}
                              </span>
                            )}
                            {/* Множественные исполнители или один */}
                            {todo.assignedToIds && todo.assignedToIds.length > 1 ? (
                              <span className="text-xs sm:text-[9px] text-green-600 dark:text-green-400" title={`Исполнители: ${todo.assignedToIds.map(id => getPersonNameById(people, id)).join(', ')}`}>
                                {todo.assignedToIds.slice(0, 2).map(id => getPersonNameById(people, id)).join(', ')}{todo.assignedToIds.length > 2 ? ` +${todo.assignedToIds.length - 2}` : ''}
                              </span>
                            ) : todo.assignedToId && (
                              <span className="text-xs sm:text-[9px] text-green-600 dark:text-green-400" title="Кому">
                                {getPersonNameById(people, todo.assignedToId, todo.assignedTo)}
                              </span>
                            )}
                            {/* Индикатор непрочитанных комментариев */}
                            {hasUnreadComments(todo, myAccountId) && (
                              <span className="flex items-center gap-1 text-xs sm:text-[10px] text-red-400 font-medium animate-bounce" title="Есть непрочитанные комментарии">
                                <MessageCircle className="w-4 h-4 sm:w-3 sm:h-3 fill-red-400/30" />
                                <span className="w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                              </span>
                            )}
                            {todo.dueDate && (
                              <span className="flex items-center gap-1 text-xs sm:text-[9px] text-gray-700 dark:text-white/60">
                                <Clock className="w-3.5 h-3.5 sm:w-2.5 sm:h-2.5" />
                                {new Date(todo.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                            {todo.categoryId && (() => {
                              const cat = categories.find(c => c.id === todo.categoryId);
                              return cat ? (
                                <span 
                                  className="flex items-center gap-1 px-2 py-1 sm:px-1.5 sm:py-0.5 rounded text-xs sm:text-[10px] font-medium"
                                  style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                                >
                                  {CATEGORY_ICONS[cat.icon] || <Tag className="w-3.5 h-3.5 sm:w-3 sm:h-3" />}
                                  {cat.name}
                                </span>
                              ) : null;
                            })()}
                            {todo.linkId && todo.linkUrl && (
                              <a
                                href={todo.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-0.5 text-[9px] text-blue-400 hover:text-blue-300 pointer-events-auto"
                                title={todo.linkTitle || todo.linkUrl}
                              >
                                <Link2 className="w-2.5 h-2.5" />
                                <span className="max-w-[150px] truncate">{todo.linkTitle || 'Ссылка'}</span>
                              </a>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 pointer-events-auto">
                          <button
                            onClick={() => openTodoModal(todo)}
                            className="flex-shrink-0 w-7 h-7 bg-gray-100 dark:bg-[var(--bg-glass)] hover:bg-gray-200 dark:hover:bg-[var(--bg-glass-hover)] rounded-full transition-all duration-200 flex items-center justify-center border border-gray-300 dark:border-[var(--border-glass)] backdrop-blur-sm text-gray-600 dark:text-[var(--text-secondary)]"
                            title="Редактировать"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleArchiveTodo(todo.id, true)}
                            className="flex-shrink-0 w-7 h-7 bg-gray-100 dark:bg-[var(--bg-glass)] hover:bg-orange-100 dark:hover:bg-orange-500/20 rounded-full text-orange-500 dark:text-orange-400 transition-all duration-200 flex items-center justify-center border border-gray-300 dark:border-[var(--border-glass)] backdrop-blur-sm"
                            title="В архив"
                            style={{ display: todo.completed ? 'flex' : 'none' }}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteTodo(todo.id)}
                            className="flex-shrink-0 w-7 h-7 bg-gray-100 dark:bg-[var(--bg-glass)] hover:bg-red-100 dark:hover:bg-red-500/20 rounded-full text-red-500 dark:text-red-400 transition-all duration-200 flex items-center justify-center border border-gray-300 dark:border-[var(--border-glass)] backdrop-blur-sm"
                            title="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
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
            <div className="hidden md:block flex-shrink-0 w-80">
              <button
                onClick={() => setShowAddList(true)}
                className="w-full h-20 border-2 border-dashed border-gray-300 dark:border-[var(--border-color)] rounded-xl flex items-center justify-center gap-2 text-gray-400 dark:text-[var(--text-muted)] hover:border-gray-400 dark:hover:border-[var(--border-light)] hover:text-gray-500 dark:hover:text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-[var(--bg-glass)] transition-all pointer-events-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Добавить список</span>
              </button>
            </div>
          )}

          {/* Add List Form */}
          {showAddList && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 md:relative md:inset-auto md:bg-transparent md:p-0 md:flex-shrink-0 md:w-80">
              <div className="w-full max-w-sm md:max-w-none bg-white dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl p-4 shadow-2xl md:shadow-none">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-[var(--text-primary)]">Новый список</h3>
                  <button 
                    onClick={() => setShowAddList(false)}
                    className="md:hidden w-8 h-8 rounded-full bg-gray-100 dark:bg-[var(--bg-glass)] flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-gray-500 dark:text-[var(--text-secondary)]" />
                  </button>
                </div>
              <input
                type="text"
                placeholder="Название списка"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addList()}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl mb-3 focus:outline-none focus:border-blue-500 dark:focus:border-[var(--accent-primary)] text-gray-900 dark:text-[var(--text-primary)]"
                autoFocus
              />
              <div className="mb-4">
                <label className="block text-sm text-gray-500 dark:text-[var(--text-muted)] mb-2">Цвет</label>
                <div className="flex gap-2 flex-wrap">
                  {LIST_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewListColor(color)}
                      className={`w-6 h-6 rounded-full transition-all ${newListColor === color ? 'ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-tertiary)] scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              {/* Выбор исполнителя по умолчанию */}
              <div className="mb-4 relative">
                <label className="block text-sm text-[var(--text-muted)] mb-2">Исполнитель по умолчанию</label>
                <button
                  onClick={() => setShowNewListAssigneeDropdown(!showNewListAssigneeDropdown)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl text-left text-sm flex items-center justify-between hover:border-gray-300 dark:hover:border-[var(--border-light)] transition-colors"
                >
                  <span className="flex items-center gap-2 text-gray-700 dark:text-[var(--text-secondary)]">
                    <UserCheck className="w-3.5 h-3.5 text-gray-400 dark:text-[var(--text-muted)]" />
                    {newListAssigneeId 
                      ? people.find(p => p.id === newListAssigneeId)?.name || 'Исполнитель'
                      : 'Не выбран'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-[var(--text-muted)] transition-transform ${showNewListAssigneeDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showNewListAssigneeDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl shadow-xl z-50 py-1 max-h-48 overflow-y-auto">
                    <button
                      onClick={() => { setNewListAssigneeId(null); setShowNewListAssigneeDropdown(false); }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors ${
                        !newListAssigneeId ? 'text-gray-900 dark:text-[var(--text-primary)] bg-gray-100 dark:bg-[var(--bg-glass)]' : 'text-gray-600 dark:text-[var(--text-secondary)]'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Не выбран
                    </button>
                    {people.filter(p => p.role === 'executor' || p.role === 'universal').map(person => (
                      <button
                        key={person.id}
                        onClick={() => { setNewListAssigneeId(person.id); setShowNewListAssigneeDropdown(false); }}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors ${
                          newListAssigneeId === person.id ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10' : 'text-gray-600 dark:text-[var(--text-secondary)]'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        {person.name}
                        {person.id === myAccountId && (
                          <span className="ml-auto text-[10px] bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 px-1.5 py-0.5 rounded">Я</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addList}
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-all"
                >
                  Создать
                </button>
                <button
                  onClick={() => { setShowAddList(false); setNewListName(''); setNewListAssigneeId(null); }}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-[var(--bg-secondary)] hover:bg-gray-200 dark:hover:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-[var(--border-color)] text-gray-600 dark:text-[var(--text-secondary)] rounded-xl text-sm font-medium transition-all"
                >
                  Отмена
                </button>
              </div>
              </div>
            </div>
          )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                    const completedCount = todos.filter(t => t.listId === list.id && t.completed).length;
                    const totalCount = todos.filter(t => t.listId === list.id).length;
                    
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
                              <h3 className="font-medium text-sm truncate text-[var(--text-secondary)]">
                                {list.name}
                              </h3>
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

      {/* Hover Preview Tooltip */}
      {hoveredTodo && (hoveredTodo.description || hoveredTodo.reviewComment) && (
        <div 
          className="fixed z-[100] bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[var(--border-light)] rounded-xl shadow-2xl p-4 max-w-sm animate-in fade-in duration-200 text-gray-900 dark:text-white"
          style={{ 
            left: Math.min(hoverPosition.x, window.innerWidth - 350),
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
                  {getPersonNameById(people, hoveredTodo.assignedToId, hoveredTodo.assignedTo)}
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
      {editingTodo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gradient-to-b dark:from-[#1a1a1a] dark:to-[#151515] border-0 sm:border border-gray-200 dark:border-[var(--border-color)] rounded-none sm:rounded-xl w-full h-full sm:h-auto max-w-full sm:max-w-[95vw] xl:max-w-[1200px] shadow-2xl sm:min-h-0 sm:max-h-[90vh] flex flex-col sm:my-auto">
            {/* Шапка */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-gray-200 dark:border-[var(--border-color)] bg-gray-50 dark:bg-white/[0.02] sm:rounded-t-xl flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-gray-200 dark:border-[var(--border-color)]">
                  <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500 dark:text-blue-400" />
                </div>
                <h3 className="font-medium text-sm text-gray-900 dark:text-white">Редактировать задачу</h3>
                {/* Кнопка выполнения в шапке - хорошо видна */}
                <button
                  onClick={() => {
                    const newCompleted = !editingTodo.completed;
                    setEditingTodo({ ...editingTodo, completed: newCompleted });
                    toggleTodo(editingTodo);
                  }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    editingTodo.completed
                      ? 'bg-green-500/30 text-green-300 ring-1 ring-green-500/50 hover:bg-green-500/40'
                      : 'bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:bg-green-500/20 hover:text-green-400 ring-1 ring-white/10'
                  }`}
                  title={editingTodo.completed ? 'Отметить как невыполненную' : 'Отметить как выполненную'}
                >
                  <Check className={`w-4 h-4 ${editingTodo.completed ? 'text-green-300' : ''}`} />
                  {editingTodo.completed ? 'Выполнено' : 'Выполнить'}
                </button>
              </div>
              <button
                onClick={closeTodoModal}
                className="w-8 h-8 bg-gray-100 dark:bg-[var(--bg-glass)] hover:bg-gray-200 dark:hover:bg-[var(--bg-glass-hover)] rounded-full transition-colors flex-shrink-0 flex items-center justify-center border border-gray-200 dark:border-[var(--border-glass)] backdrop-blur-sm"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-[var(--text-secondary)]" />
              </button>
            </div>
            
            {/* Три колонки - адаптивно */}
            <div className="flex flex-1 overflow-y-auto lg:overflow-hidden flex-col lg:flex-row min-h-0">
              {/* Левый блок - основные поля */}
              <div className="w-full lg:w-[380px] p-2 sm:p-3 space-y-2 sm:space-y-3 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-[var(--border-color)] lg:overflow-y-auto flex-shrink-0 bg-gray-50 dark:bg-[var(--bg-secondary)] order-2 lg:order-1">
                {/* Статус */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide">Статус</label>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setEditingTodo({ ...editingTodo, status: 'pending' })}
                      className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                        !editingTodo.status || editingTodo.status === 'pending' 
                          ? 'bg-orange-500/20 text-orange-500 dark:text-orange-400 ring-1 ring-orange-500/50' 
                          : 'bg-gray-100 dark:bg-[var(--bg-glass)] text-gray-500 dark:text-white/50 hover:bg-orange-500/10 hover:text-orange-500 dark:hover:text-orange-400'
                      }`}
                    >
                      В ожидании
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTodo({ ...editingTodo, status: 'in-progress' })}
                      className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                        editingTodo.status === 'in-progress' 
                          ? 'bg-blue-500/20 text-blue-500 dark:text-blue-400 ring-1 ring-blue-500/50' 
                          : 'bg-gray-100 dark:bg-[var(--bg-glass)] text-gray-500 dark:text-white/50 hover:bg-blue-500/10 hover:text-blue-500 dark:hover:text-blue-400'
                      }`}
                    >
                      В работе
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTodo({ ...editingTodo, status: 'review' })}
                      className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                        editingTodo.status === 'review' 
                          ? 'bg-green-500/20 text-green-500 dark:text-green-400 ring-1 ring-green-500/50' 
                          : 'bg-gray-100 dark:bg-[var(--bg-glass)] text-gray-500 dark:text-white/50 hover:bg-green-500/10 hover:text-green-500 dark:hover:text-green-400'
                      }`}
                    >
                      Готово к проверке
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTodo({ ...editingTodo, status: 'cancelled' })}
                      className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                        editingTodo.status === 'cancelled' 
                          ? 'bg-red-500/20 text-red-500 dark:text-red-400 ring-1 ring-red-500/50' 
                          : 'bg-gray-100 dark:bg-[var(--bg-glass)] text-gray-500 dark:text-white/50 hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400'
                      }`}
                    >
                      Отменена
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTodo({ ...editingTodo, status: 'stuck' })}
                      className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                        editingTodo.status === 'stuck' 
                          ? 'bg-yellow-500/20 text-yellow-500 ring-1 ring-yellow-500/50' 
                          : 'bg-gray-100 dark:bg-[var(--bg-glass)] text-gray-500 dark:text-white/50 hover:bg-yellow-500/10 hover:text-yellow-500'
                      }`}
                    >
                      Застряла
                    </button>
                  </div>
                  {editingTodo.status === 'review' && (
                    <div className="mt-2">
                      <label className="block text-[10px] font-medium text-gray-500 dark:text-[var(--text-muted)] mb-1">Комментарий руководителя</label>
                      <textarea
                        value={editingTodo.reviewComment || ''}
                        onChange={(e) => setEditingTodo({ ...editingTodo, reviewComment: e.target.value })}
                        className="no-mobile-scale w-full px-3 py-2.5 bg-white dark:bg-[var(--bg-tertiary)] border border-gray-300 dark:border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:border-blue-500/50 transition-all text-gray-700 dark:text-[var(--text-secondary)] placeholder-gray-400 dark:placeholder-white/30 resize-none"
                        placeholder="Комментарий или замечания..."
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              
                {/* Заказчик и Исполнитель */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide flex items-center gap-1">
                      <User className="w-2.5 h-2.5" />
                      От кого
                    </label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'assignedBy' ? null : 'assignedBy')}
                      className="no-mobile-scale w-full px-3 py-2.5 bg-white dark:bg-[var(--bg-tertiary)] border border-gray-300 dark:border-[var(--border-color)] rounded-xl text-sm text-left flex items-center justify-between hover:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)]"
                    >
                      <span className={editingTodo.assignedById ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                        {editingTodo.assignedBy || 'Не выбран'}
                      </span>
                      <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${openDropdown === 'assignedBy' ? 'rotate-180' : ''}`} />
                    </button>
                    {openDropdown === 'assignedBy' && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[var(--bg-tertiary)] border border-gray-300 dark:border-[var(--border-color)] rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTodo({ ...editingTodo, assignedById: undefined, assignedBy: '' });
                            setOpenDropdown(null);
                          }}
                          className="w-full px-3 py-1.5 text-left text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors text-xs"
                        >
                          Не выбран
                        </button>
                        {people.filter(p => p.role === 'customer' || p.role === 'universal').map(person => (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => {
                              setEditingTodo({ ...editingTodo, assignedById: person.id, assignedBy: person.name });
                              setOpenDropdown(null);
                            }}
                            className={`w-full px-3 py-1.5 text-left hover:bg-[var(--bg-glass)] transition-colors text-xs flex items-center justify-between ${
                              editingTodo.assignedById === person.id ? 'bg-[var(--bg-glass)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            <span>{person.name}</span>
                            {person.telegramId && <span className="text-[9px] text-blue-400 bg-blue-500/20 px-1 py-0.5 rounded">TG</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide flex items-center gap-1">
                      <UserCheck className="w-2.5 h-2.5" />
                      Исполнители
                    </label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'assignedTo' ? null : 'assignedTo')}
                      className="no-mobile-scale w-full px-3 py-2.5 bg-white dark:bg-[var(--bg-tertiary)] border border-gray-300 dark:border-[var(--border-color)] rounded-xl text-sm text-left flex items-center justify-between hover:border-blue-500/50 transition-all min-h-[42px] text-gray-900 dark:text-[var(--text-primary)]"
                    >
                      <div className="flex flex-wrap gap-1">
                        {editingTodo.assignedToIds && editingTodo.assignedToIds.length > 0 ? (
                          editingTodo.assignedToIds.map(id => {
                            const person = people.find(p => p.id === id);
                            return person ? (
                              <span key={id} className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                {person.name}
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newIds = editingTodo.assignedToIds?.filter(i => i !== id) || [];
                                    const newNames = editingTodo.assignedToNames?.filter((_, idx) => editingTodo.assignedToIds?.[idx] !== id) || [];
                                    setEditingTodo({ 
                                      ...editingTodo, 
                                      assignedToIds: newIds.length > 0 ? newIds : undefined,
                                      assignedToNames: newNames.length > 0 ? newNames : undefined,
                                      // Для обратной совместимости
                                      assignedToId: newIds[0],
                                      assignedTo: newNames[0] || ''
                                    });
                                  }}
                                  className="hover:text-green-900 dark:hover:text-[var(--text-primary)] cursor-pointer"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </span>
                              </span>
                            ) : null;
                          })
                        ) : editingTodo.assignedToId ? (
                          <span className="text-[var(--text-primary)]">{getPersonNameById(people, editingTodo.assignedToId, editingTodo.assignedTo)}</span>
                        ) : (
                          <span className="text-[var(--text-muted)]">Выберите исполнителей</span>
                        )}
                      </div>
                      <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform flex-shrink-0 ${openDropdown === 'assignedTo' ? 'rotate-180' : ''}`} />
                    </button>
                    {openDropdown === 'assignedTo' && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[var(--bg-tertiary)] border border-gray-300 dark:border-[var(--border-color)] rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTodo({ 
                              ...editingTodo, 
                              assignedToId: undefined, 
                              assignedTo: '',
                              assignedToIds: undefined,
                              assignedToNames: undefined
                            });
                            setOpenDropdown(null);
                          }}
                          className="w-full px-3 py-1.5 text-left text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors text-xs border-b border-[var(--border-color)]"
                        >
                          Очистить выбор
                        </button>
                        {people.filter(p => p.role === 'executor' || p.role === 'universal').map(person => {
                          const isSelected = editingTodo.assignedToIds?.includes(person.id) || editingTodo.assignedToId === person.id;
                          const lastSeenStatus = formatLastSeen(person.lastSeen);
                          return (
                            <button
                              key={person.id}
                              type="button"
                              onClick={() => {
                                const currentIds = editingTodo.assignedToIds || (editingTodo.assignedToId ? [editingTodo.assignedToId] : []);
                                const currentNames = editingTodo.assignedToNames || (editingTodo.assignedTo ? [editingTodo.assignedTo] : []);
                                
                                let newIds: string[];
                                let newNames: string[];
                                
                                if (isSelected) {
                                  newIds = currentIds.filter(id => id !== person.id);
                                  newNames = currentNames.filter((_, idx) => currentIds[idx] !== person.id);
                                } else {
                                  newIds = [...currentIds, person.id];
                                  newNames = [...currentNames, person.name];
                                }
                                
                                setEditingTodo({ 
                                  ...editingTodo, 
                                  assignedToIds: newIds.length > 0 ? newIds : undefined,
                                  assignedToNames: newNames.length > 0 ? newNames : undefined,
                                  // Для обратной совместимости - первый исполнитель
                                  assignedToId: newIds[0],
                                  assignedTo: newNames[0] || ''
                                });
                              }}
                              className={`w-full px-3 py-2 text-left hover:bg-[var(--bg-glass)] transition-colors text-xs flex items-center justify-between ${
                                isSelected ? 'bg-green-500/10' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                  isSelected ? 'bg-green-500 border-green-500' : 'border-white/30'
                                }`}>
                                  {isSelected && <Check className="w-2.5 h-2.5 text-[var(--text-primary)]" />}
                                </div>
                                <div>
                                  <span className={isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>{person.name}</span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`flex items-center gap-1 text-[9px] ${lastSeenStatus.color}`}>
                                      {lastSeenStatus.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                                      {lastSeenStatus.text}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {person.telegramId && <span className="text-[9px] text-blue-400 bg-blue-500/20 px-1 py-0.5 rounded">TG</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              
                {/* Приоритет и Срок */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide">Приоритет</label>
                    <div className="flex gap-1.5">
                      {(['low', 'medium', 'high'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setEditingTodo({ ...editingTodo, priority: p })}
                          className={`flex-shrink-0 w-6 h-6 rounded-full transition-all flex items-center justify-center ${
                            editingTodo.priority === p
                              ? p === 'high' 
                                ? 'bg-red-500/20 ring-1 ring-red-500'
                                : p === 'medium'
                                  ? 'bg-yellow-500/20 ring-1 ring-yellow-500'
                                  : 'bg-green-500/20 ring-1 ring-green-500'
                              : 'hover:bg-[var(--bg-glass)]'
                          }`}
                          title={p === 'high' ? 'Высокий' : p === 'medium' ? 'Средний' : 'Низкий'}
                        >
                          <span className={`flex-shrink-0 w-3 h-3 rounded-full ${
                            p === 'high' 
                              ? 'bg-red-500' 
                              : p === 'medium' 
                                ? 'bg-yellow-500' 
                                : 'bg-green-500'
                          }`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      Срок
                    </label>
                    <input
                      type="date"
                      value={editingTodo.dueDate || ''}
                      onChange={(e) => setEditingTodo({ ...editingTodo, dueDate: e.target.value })}
                      className="no-mobile-scale w-full px-3 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                    />
                  </div>
                </div>
              
                {/* Список и Категория */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide flex items-center gap-1">
                      <Inbox className="w-2.5 h-2.5" />
                      Список
                    </label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'list' ? null : 'list')}
                      className="no-mobile-scale w-full px-3 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-sm text-left flex items-center justify-between hover:border-blue-500/50 transition-all"
                    >
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const list = lists.find(l => l.id === editingTodo.listId);
                          return list ? (
                            <>
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                              <span className="text-[var(--text-primary)] text-xs">{list.name}</span>
                            </>
                          ) : <span className="text-[var(--text-muted)] text-xs">Выберите список</span>;
                        })()}
                      </div>
                      <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${openDropdown === 'list' ? 'rotate-180' : ''}`} />
                    </button>
                    {openDropdown === 'list' && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                        {lists.filter(l => !l.archived).map(list => (
                          <button
                            key={list.id}
                            type="button"
                            onClick={() => {
                              setEditingTodo({ ...editingTodo, listId: list.id });
                              setOpenDropdown(null);
                            }}
                            className={`w-full px-3 py-1.5 text-left hover:bg-[var(--bg-glass)] transition-colors text-xs flex items-center gap-1.5 ${
                              editingTodo.listId === list.id ? 'bg-[var(--bg-glass)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                            <span>{list.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5" />
                      Категория
                    </label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
                      className="no-mobile-scale w-full px-3 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-sm text-left flex items-center justify-between hover:border-blue-500/50 transition-all"
                    >
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const cat = categories.find(c => c.id === editingTodo.categoryId);
                          return cat ? (
                            <>
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                              <span className="text-[var(--text-primary)] text-xs">{cat.name}</span>
                            </>
                          ) : <span className="text-[var(--text-muted)] text-xs">Без категории</span>;
                        })()}
                      </div>
                      <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${openDropdown === 'category' ? 'rotate-180' : ''}`} />
                    </button>
                    {openDropdown === 'category' && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTodo({ ...editingTodo, categoryId: undefined });
                            setOpenDropdown(null);
                          }}
                          className={`w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors text-xs ${
                            !editingTodo.categoryId ? 'bg-gray-100 dark:bg-[var(--bg-glass)] text-gray-900 dark:text-[var(--text-primary)]' : 'text-gray-500 dark:text-white/50'
                          }`}
                        >
                          Без категории
                        </button>
                        {categories.map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setEditingTodo({ ...editingTodo, categoryId: cat.id });
                              setOpenDropdown(null);
                            }}
                            className={`w-full px-3 py-1.5 text-left hover:bg-[var(--bg-glass)] transition-colors text-xs flex items-center gap-1.5 ${
                              editingTodo.categoryId === cat.id ? 'bg-[var(--bg-glass)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span>{cat.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Прикреплённая ссылка */}
                <div className="relative">
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide flex items-center gap-1">
                    <Link2 className="w-2.5 h-2.5" />
                    Прикреплённая ссылка
                  </label>
                  {editingTodo.linkId ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <Link2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <a 
                        href={editingTodo.linkUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 truncate flex-1"
                        title={editingTodo.linkUrl}
                      >
                        {editingTodo.linkTitle || editingTodo.linkUrl}
                      </a>
                      <button
                        type="button"
                        onClick={() => setEditingTodo({ ...editingTodo, linkId: undefined, linkUrl: undefined, linkTitle: undefined })}
                        className="p-1 hover:bg-[var(--bg-glass-hover)] rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <a 
                        href={editingTodo.linkUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-[var(--bg-glass-hover)] rounded text-[var(--text-muted)] hover:text-blue-400 flex-shrink-0"
                        title="Открыть ссылку"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === 'link' ? null : 'link')}
                        className="no-mobile-scale w-full px-3 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-sm text-left flex items-center justify-between hover:border-blue-500/50 transition-all"
                      >
                        <span className="text-[var(--text-muted)] text-xs">Выбрать ссылку из базы...</span>
                        <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${openDropdown === 'link' ? 'rotate-180' : ''}`} />
                      </button>
                      {openDropdown === 'link' && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 max-h-60 overflow-hidden flex flex-col">
                          <div className="p-2 border-b border-[var(--border-color)]">
                            <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--bg-glass)] rounded-[25px] border border-[var(--border-color)]">
                              <Search className="w-3 h-3 text-[var(--text-muted)]" />
                              <input
                                type="text"
                                value={linksSearchQuery}
                                onChange={(e) => setLinksSearchQuery(e.target.value)}
                                placeholder="Поиск ссылки..."
                                className="bg-transparent text-xs text-gray-900 dark:text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-white/30 outline-none flex-1"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="overflow-y-auto flex-1">
                            {availableLinks.length === 0 ? (
                              <div className="px-3 py-4 text-center text-[var(--text-muted)] text-xs">
                                Нет сохранённых ссылок
                              </div>
                            ) : (
                              availableLinks
                                .filter(link => 
                                  !linksSearchQuery || 
                                  link.title.toLowerCase().includes(linksSearchQuery.toLowerCase()) ||
                                  link.url.toLowerCase().includes(linksSearchQuery.toLowerCase())
                                )
                                .slice(0, 20)
                                .map(link => (
                                  <button
                                    key={link.id}
                                    type="button"
                                    onClick={() => {
                                      setEditingTodo({ 
                                        ...editingTodo, 
                                        linkId: link.id, 
                                        linkUrl: link.url, 
                                        linkTitle: link.title 
                                      });
                                      setOpenDropdown(null);
                                      setLinksSearchQuery('');
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-[var(--bg-glass)] transition-colors flex items-center gap-2 border-b border-[var(--border-secondary)] last:border-0"
                                  >
                                    {link.favicon ? (
                                      <img src={link.favicon} alt="" className="w-4 h-4 rounded flex-shrink-0" />
                                    ) : (
                                      <Link2 className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs text-[var(--text-primary)] truncate">{link.title}</div>
                                      <div className="text-[10px] text-[var(--text-muted)] truncate">{link.url}</div>
                                    </div>
                                  </button>
                                ))
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Поместить на календарь */}
                <div className="mt-2">
                  <label 
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => setEditingTodo({ ...editingTodo, addToCalendar: !editingTodo.addToCalendar })}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      editingTodo.addToCalendar 
                        ? 'bg-purple-500 border-purple-500' 
                        : 'border-[var(--border-light)] group-hover:border-white/40'
                    }`}>
                      {editingTodo.addToCalendar && <Check className="w-3 h-3 text-[var(--text-primary)]" />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarPlus className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                        Поместить на календарь
                      </span>
                      {editingTodo.listId === TZ_LIST_ID && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                          как ТЗ
                        </span>
                      )}
                    </div>
                  </label>
                  {editingTodo.calendarEventId && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-green-400">
                      <Check className="w-3 h-3" />
                      <span>Уже добавлено на календарь</span>
                      <a 
                        href="http://117.117.117.235:3000/events" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 ml-1"
                      >
                        Открыть →
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Средний блок - Название и Описание */}
              <div className="flex-1 lg:flex-none lg:w-[420px] flex flex-col bg-white dark:bg-[var(--bg-secondary)] border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-[var(--border-color)] order-1 lg:order-2">
                {/* Название задачи */}
                <div className="px-2 sm:px-3 pt-2 sm:pt-3 pb-1.5 sm:pb-2">
                  <input
                    type="text"
                    value={editingTodo.title}
                    onChange={(e) => setEditingTodo({ ...editingTodo, title: e.target.value })}
                    className="no-mobile-scale w-full px-3 py-2.5 bg-gray-50 dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl text-base sm:text-lg font-medium focus:outline-none focus:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-white/30"
                    placeholder="Название задачи..."
                  />
                </div>
                
                {/* Заголовок с кнопками форматирования */}
                <div className="px-2 sm:px-3 py-1 sm:py-1.5 border-b border-gray-200 dark:border-[var(--border-color)]">
                  {/* Панель форматирования - компактная */}
                  <div className="flex items-center gap-0.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById('description-editor');
                        if (editor) {
                          document.execCommand('bold', false);
                          editor.focus();
                        }
                      }}
                      className="p-1 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Жирный (Ctrl+B)"
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById('description-editor');
                        if (editor) {
                          document.execCommand('italic', false);
                          editor.focus();
                        }
                      }}
                      className="p-1 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Курсив (Ctrl+I)"
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById('description-editor');
                        if (editor) {
                          document.execCommand('underline', false);
                          editor.focus();
                        }
                      }}
                      className="p-1 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Подчёркнутый (Ctrl+U)"
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById('description-editor');
                        if (editor) {
                          document.execCommand('strikeThrough', false);
                          editor.focus();
                        }
                      }}
                      className="p-1 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Зачёркнутый"
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/></svg>
                    </button>
                    <div className="w-px h-3 bg-gray-200 dark:bg-[var(--bg-glass-hover)] mx-0.5" />
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById('description-editor');
                        if (editor) {
                          document.execCommand('insertUnorderedList', false);
                          editor.focus();
                        }
                      }}
                      className="p-1 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Маркированный список"
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById('description-editor');
                        if (editor) {
                          document.execCommand('insertOrderedList', false);
                          editor.focus();
                        }
                      }}
                      className="p-1 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Нумерованный список"
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>
                    </button>
                    <div className="hidden sm:block w-px h-3 bg-gray-200 dark:bg-[var(--bg-glass-hover)] mx-0.5" />
                    {/* Кастомный dropdown для размера текста */}
                    <div className="relative hidden sm:block">
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === 'textSize' ? null : 'textSize')}
                        className="flex items-center gap-1 px-1.5 py-1 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors text-xs"
                      >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z"/></svg>
                        <span className="hidden sm:inline text-[10px]">Размер</span>
                        <ChevronDown className="w-2 h-2" />
                      </button>
                      {openDropdown === 'textSize' && (
                        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-[var(--border-color)] rounded-lg shadow-xl z-50 min-w-[120px] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              const editor = document.getElementById('description-editor');
                              if (editor) {
                                document.execCommand('formatBlock', false, '<h1>');
                                editor.focus();
                              }
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors flex items-center gap-2"
                          >
                            <span className="text-base font-bold text-gray-900 dark:text-[var(--text-primary)]">Заголовок 1</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const editor = document.getElementById('description-editor');
                              if (editor) {
                                document.execCommand('formatBlock', false, '<h2>');
                                editor.focus();
                              }
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors flex items-center gap-2"
                          >
                            <span className="text-sm font-semibold text-gray-900 dark:text-[var(--text-primary)]">Заголовок 2</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const editor = document.getElementById('description-editor');
                              if (editor) {
                                document.execCommand('formatBlock', false, '<h3>');
                                editor.focus();
                              }
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors flex items-center gap-2"
                          >
                            <span className="text-xs font-medium text-gray-900 dark:text-[var(--text-primary)]">Заголовок 3</span>
                          </button>
                          <div className="h-px bg-gray-200 dark:bg-[var(--bg-glass-hover)] my-1" />
                          <button
                            type="button"
                            onClick={() => {
                              const editor = document.getElementById('description-editor');
                              if (editor) {
                                // Сначала убираем форматирование заголовка, затем применяем div
                                const selection = window.getSelection();
                                if (selection && selection.rangeCount > 0) {
                                  document.execCommand('formatBlock', false, '<div>');
                                }
                                editor.focus();
                              }
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors flex items-center gap-2"
                          >
                            <span className="text-xs text-gray-600 dark:text-[var(--text-secondary)]">Обычный текст</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="hidden sm:block w-px h-3 bg-gray-200 dark:bg-[var(--bg-glass-hover)] mx-0.5" />
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById('description-editor');
                        if (editor) {
                          const url = prompt('Введите URL ссылки:');
                          if (url) {
                            document.execCommand('createLink', false, url);
                          }
                          editor.focus();
                        }
                      }}
                      className="p-1 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Вставить ссылку"
                    >
                      <Link2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById('description-editor');
                        if (editor) {
                          // Вставляем чек-лист
                          const checkbox = '<div class="checklist-item flex items-center gap-2 my-1"><input type="checkbox" class="w-4 h-4 rounded border-white/30 bg-[var(--bg-glass-hover)] cursor-pointer" onclick="this.parentElement.classList.toggle(\'completed\')" /><span contenteditable="true" class="flex-1">Пункт чек-листа</span></div>';
                          document.execCommand('insertHTML', false, checkbox);
                          editor.focus();
                        }
                      }}
                      className="hidden sm:block p-1 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Добавить чек-лист"
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById('description-editor');
                        if (editor) {
                          document.execCommand('removeFormat', false);
                          editor.focus();
                        }
                      }}
                      className="p-1 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Очистить форматирование"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Редактор описания - увеличенный с drag & drop */}
                <div className="flex-1 p-1.5 sm:p-2 overflow-y-auto flex flex-col relative min-h-[200px]">
                  {/* Превью загруженных изображений - Telegram-style grid */}
                  {editingTodo.attachments && editingTodo.attachments.filter(a => a.type === 'image').length > 0 && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 w-full">
                      {(() => {
                        const images = editingTodo.attachments?.filter(a => a.type === 'image') || [];
                        const count = Math.min(images.length, 6);
                        
                        if (count === 1) {
                          return (
                            <div className="relative group w-full">
                              <img src={images[0].url} alt="" className="w-full max-h-[180px] object-cover block" />
                              <button type="button" onClick={() => setEditingTodo(prev => prev ? { ...prev, attachments: prev.attachments?.filter(a => a.id !== images[0].id) } : null)} className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X className="w-4 h-4 text-white" /></button>
                            </div>
                          );
                        }
                        
                        if (count === 2) {
                          return (
                            <div className="grid grid-cols-2 gap-0.5 w-full">
                              {images.slice(0, 2).map((img, idx) => (
                                <div key={img.id} className="relative group w-full">
                                  <img src={img.url} alt="" className="w-full h-[100px] object-cover block" />
                                  <button type="button" onClick={() => setEditingTodo(prev => prev ? { ...prev, attachments: prev.attachments?.filter(a => a.id !== img.id) } : null)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3 text-white" /></button>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        
                        // 3+ images - grid layout
                        return (
                          <div className="grid grid-cols-3 gap-0.5 w-full">
                            {images.slice(0, 6).map((img, idx) => (
                              <div key={img.id} className="relative group w-full">
                                <img src={img.url} alt="" className="w-full h-[70px] object-cover block" />
                                <button type="button" onClick={() => setEditingTodo(prev => prev ? { ...prev, attachments: prev.attachments?.filter(a => a.id !== img.id) } : null)} className="absolute top-1 right-1 w-4 h-4 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X className="w-2.5 h-2.5 text-white" /></button>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      {(editingTodo.attachments?.filter(a => a.type === 'image').length || 0) > 6 && (
                        <div className="text-center text-xs text-gray-500 dark:text-white/40 py-1 bg-gray-100 dark:bg-white/5">
                          +{(editingTodo.attachments?.filter(a => a.type === 'image').length || 0) - 6} ещё
                        </div>
                      )}
                    </div>
                  )}
                  
                  <textarea
                    value={editingTodo?.description || ''}
                    onChange={(e) => setEditingTodo(prev => prev ? { ...prev, description: e.target.value } : null)}
                    placeholder="Добавьте описание задачи..."
                    className="w-full flex-1 min-h-[150px] px-2 sm:px-3 py-2 bg-gray-50 dark:bg-[var(--bg-glass)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl text-sm text-gray-900 dark:text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:border-blue-500/30 transition-all resize-none"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.style.borderColor = 'rgb(59, 130, 246)';
                      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.style.borderColor = '';
                      e.currentTarget.style.backgroundColor = '';
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.style.borderColor = '';
                      e.currentTarget.style.backgroundColor = '';
                      
                      const files = e.dataTransfer.files;
                      if (files && files.length > 0) {
                        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
                        if (imageFiles.length > 0) {
                          for (const file of imageFiles) {
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              const response = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData
                              });
                              if (response.ok) {
                                const data = await response.json();
                                const uploadedAttachment = {
                                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                                  name: data.filename || file.name,
                                  url: data.url,
                                  type: 'image' as const,
                                  size: data.size || file.size,
                                  uploadedAt: new Date().toISOString()
                                };
                                setEditingTodo(prev => prev ? {
                                  ...prev,
                                  attachments: [...(prev.attachments || []), uploadedAttachment]
                                } : null);
                              }
                            } catch (error) {
                              console.error('Error uploading image:', error);
                            }
                          }
                        }
                      }
                    }}
                    onPaste={async (e) => {
                      const items = e.clipboardData.items;
                      for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        if (item.type.indexOf('image') !== -1) {
                          e.preventDefault();
                          const blob = item.getAsFile();
                          if (blob) {
                            const formData = new FormData();
                            formData.append('file', blob, 'pasted-image.png');
                            try {
                              const response = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData
                              });
                              if (response.ok) {
                                const data = await response.json();
                                const uploadedAttachment = {
                                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                                  name: data.filename || 'pasted-image.png',
                                  url: data.url,
                                  type: 'image' as const,
                                  size: data.size || blob.size,
                                  uploadedAt: new Date().toISOString()
                                };
                                setEditingTodo(prev => prev ? {
                                  ...prev,
                                  attachments: [...(prev.attachments || []), uploadedAttachment]
                                } : null);
                              }
                            } catch (error) {
                              console.error('Error uploading pasted image:', error);
                            }
                          }
                          break;
                        }
                      }
                    }}
                  />
                </div>

                {/* Вложения - файлы (не картинки) */}
                <div className="px-1.5 sm:px-2 py-1.5 sm:py-2 border-t border-gray-200 dark:border-[var(--border-color)]">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 dark:text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-xs text-gray-500 dark:text-white/50">Вложения</span>
                    {editingTodo.attachments && editingTodo.attachments.length > 0 && (
                      <span className="text-[10px] bg-[var(--bg-glass-hover)] text-white/50 px-1.5 py-0.5 rounded-full">
                        {editingTodo.attachments.length}
                      </span>
                    )}
                    <label className="ml-auto cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                        className="hidden"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            // Загружаем файлы на сервер
                            const uploadPromises = Array.from(files).map(async (file) => {
                              const formData = new FormData();
                              formData.append('file', file);
                              
                              try {
                                const response = await fetch('/api/upload', {
                                  method: 'POST',
                                  body: formData
                                });
                                
                                if (response.ok) {
                                  const data = await response.json();
                                  return {
                                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                                    name: data.filename || file.name,
                                    url: data.url,
                                    type: file.type.startsWith('image/') ? 'image' : 'file',
                                    size: data.size || file.size,
                                    uploadedAt: new Date().toISOString()
                                  };
                                } else {
                                  console.error('Failed to upload file:', file.name);
                                  return null;
                                }
                              } catch (error) {
                                console.error('Error uploading file:', error);
                                return null;
                              }
                            });
                            
                            const uploadedAttachments = (await Promise.all(uploadPromises)).filter(Boolean);
                            
                            if (uploadedAttachments.length > 0) {
                              setEditingTodo(prev => prev ? {
                                ...prev,
                                attachments: [...(prev.attachments || []), ...uploadedAttachments]
                              } : null);
                            }
                          }
                        }}
                      />
                      <span className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors">
                        <Plus className="w-3 h-3" />
                        Добавить
                      </span>
                    </label>
                  </div>
                  {editingTodo.attachments && editingTodo.attachments.filter(a => a.type !== 'image').length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editingTodo.attachments.filter(a => a.type !== 'image').map(att => (
                        <div key={att.id} className="relative group">
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 dark:bg-[var(--bg-glass)] border border-gray-200 dark:border-[var(--border-color)] rounded-lg hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] transition-colors"
                          >
                            <svg className="w-4 h-4 text-gray-500 dark:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[10px] text-gray-700 dark:text-[var(--text-secondary)] max-w-[80px] truncate">{att.name}</span>
                          </a>
                          <button
                            onClick={() => {
                              setEditingTodo(prev => prev ? {
                                ...prev,
                                attachments: prev.attachments?.filter(a => a.id !== att.id)
                              } : null);
                            }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[var(--text-primary)] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Правый блок - Комментарии */}
              <div className="w-full lg:flex-1 flex flex-col bg-[var(--bg-secondary)] order-3 lg:order-3">
                {/* Заголовок */}
                <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-medium text-[var(--text-secondary)]">Комментарии</span>
                    {(editingTodo.comments?.length || 0) > 0 && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">
                        {editingTodo.comments?.length}
                      </span>
                    )}
                    {unreadCommentsCount > 0 && (
                      <button
                        onClick={markLocalCommentsAsRead}
                        className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full hover:bg-green-500/30 transition-colors flex items-center gap-1"
                      >
                        <Check className="w-2.5 h-2.5" />
                        Прочитать {unreadCommentsCount}
                      </button>
                    )}
                  </div>
                  {!myAccountId && (
                    <div className="flex items-center gap-1 text-[10px] text-orange-400" title="Выберите профиль для комментирования">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                    </div>
                  )}
                </div>

                {/* Список комментариев */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[150px] lg:min-h-[200px]" ref={commentsContainerRef}>
                  {!editingTodo.comments || editingTodo.comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] py-8">
                      <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-xs">Нет комментариев</p>
                      <p className="text-[10px] mt-1">Начните обсуждение</p>
                    </div>
                  ) : (
                    editingTodo.comments.map((comment, index) => {
                      const isMyComment = comment.authorId === myAccountId;
                      const isEditing = editingCommentId === comment.id;
                      
                      // Проверяем, нужно ли показать разделитель "Непрочитанные сообщения"
                      const lastReadIndex = lastReadCommentId 
                        ? editingTodo.comments!.findIndex(c => c.id === lastReadCommentId)
                        : -1;
                      const showUnreadDivider = lastReadCommentId && 
                        index === lastReadIndex + 1 && 
                        !isMyComment && 
                        unreadCommentsCount > 0;
                      
                      return (
                        <div key={comment.id}>
                          {/* Разделитель непрочитанных сообщений */}
                          {showUnreadDivider && (
                            <div className="flex items-center gap-2 my-3 animate-pulse" id="unread-divider">
                              <div className="flex-1 h-[1px] bg-blue-500/50"></div>
                              <span className="text-[10px] text-blue-400 font-medium px-2 whitespace-nowrap">
                                ↓ Непрочитанные сообщения ({unreadCommentsCount})
                              </span>
                              <div className="flex-1 h-[1px] bg-blue-500/50"></div>
                            </div>
                          )}
                          <div
                            className={`flex ${isMyComment ? 'justify-end' : 'justify-start'} group`}
                          >
                            <div className={`max-w-[90%] ${isMyComment ? 'order-2' : ''}`}>
                                      <div className={`rounded-xl px-3 py-2 relative ${
                                isMyComment 
                                  ? 'bg-blue-50 dark:bg-blue-500/20 rounded-br-sm' 
                                  : 'bg-gray-50 dark:bg-[var(--bg-glass)] rounded-bl-sm'
                              }`}>
                                {/* Автор комментария - всегда слева */}
                                <p className={`text-[10px] font-medium mb-0.5 ${isMyComment ? 'text-blue-500 dark:text-blue-300' : 'text-blue-600 dark:text-blue-400'}`}>
                                  {comment.authorName}
                                </p>
                              
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={editingCommentText}
                                      onChange={(e) => setEditingCommentText(e.target.value)}
                                      className="w-full px-2 py-1 bg-[var(--bg-glass-hover)] border border-[var(--border-light)] rounded text-xs text-[var(--text-primary)] resize-none focus:outline-none"
                                      rows={2}
                                      autoFocus
                                    />
                                    <div className="flex gap-1 justify-end">
                                      <button
                                        onClick={() => {
                                          setEditingCommentId(null);
                                          setEditingCommentText('');
                                        }}
                                        className="px-2 py-0.5 text-[10px] text-white/50 hover:text-[var(--text-primary)]"
                                      >
                                        Отмена
                                      </button>
                                      <button
                                        onClick={() => updateComment(editingTodo.id, comment.id, editingCommentText)}
                                        className="px-2 py-0.5 text-[10px] bg-blue-500/30 text-blue-400 rounded hover:bg-blue-500/40"
                                      >
                                        Сохранить
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-xs text-gray-800 dark:text-white/90 whitespace-pre-wrap break-words"
                                       dangerouslySetInnerHTML={{ 
                                         __html: comment.content
                                           .replace(
                                             /(https?:\/\/[^\s<>"']+)/gi,
                                             '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 underline">$1</a>'
                                           )
                                           .replace(
                                             /@([a-zA-Zа-яА-ЯёЁ0-9_]+(?:\s+[a-zA-Zа-яА-ЯёЁ0-9_]+)?)/g, 
                                             '<span class="text-blue-600 dark:text-blue-400 font-medium">@$1</span>'
                                           ) 
                                       }}
                                    />
                                    <div className="flex items-center justify-between mt-1">
                                      <div className="flex items-center gap-1">
                                        <p className="text-[9px] text-gray-500 dark:text-[var(--text-muted)]">
                                          {new Date(comment.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        {/* Галочки прочитано/непрочитано */}
                                        {isMyComment && (
                                          lastReadCommentId && (editingTodo.comments!.findIndex(c => c.id === lastReadCommentId) >= index || lastReadCommentId === comment.id) ? (
                                            <svg className="w-3 h-3 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                              <path d="M1 12l5 5L17 6" />
                                              <path d="M7 12l5 5L23 6" />
                                            </svg>
                                          ) : (
                                            <svg className="w-3 h-3 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                              <path d="M5 12l5 5L20 7" />
                                            </svg>
                                          )
                                        )}
                                      </div>
                                    
                                      {/* Действия с комментарием */}
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Ответить */}
                                        <button
                                          onClick={() => startReply(comment)}
                                          className="p-0.5 text-[var(--text-muted)] hover:text-blue-400 transition-colors"
                                          title="Ответить"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                          </svg>
                                        </button>
                                      
                                        {/* Редактировать (только свои) */}
                                        {isMyComment && (
                                          <button
                                            onClick={() => {
                                              setEditingCommentId(comment.id);
                                              setEditingCommentText(comment.content);
                                            }}
                                            className="p-0.5 text-[var(--text-muted)] hover:text-yellow-400 transition-colors"
                                            title="Редактировать"
                                          >
                                            <Edit3 className="w-3 h-3" />
                                          </button>
                                        )}
                                      
                                        {/* Удалить (только свои) */}
                                        {isMyComment && (
                                          <button
                                            onClick={() => {
                                              if (confirm('Удалить комментарий?')) {
                                                deleteComment(editingTodo.id, comment.id);
                                              }
                                            }}
                                            className="p-0.5 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                                            title="Удалить"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={commentsEndRef} />
                </div>

                {/* Ответ на комментарий */}
                {replyingToComment && (
                  <div className="px-2 py-1 border-t border-[var(--border-color)] bg-blue-500/5 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] text-blue-400">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      <span>Ответ для {replyingToComment.authorName}</span>
                    </div>
                    <button
                      onClick={() => {
                        setReplyingToComment(null);
                        setNewComment('');
                      }}
                      className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Ввод комментария */}
                {myAccountId ? (
                  <div className="p-2 border-t border-[var(--border-color)]">
                    <div className="relative">
                      <textarea
                        ref={commentInputRef}
                        value={newComment}
                        onFocus={() => {
                          // При клике на инпут помечаем все сообщения как прочитанные
                          markLocalCommentsAsRead();
                        }}
                        onChange={(e) => {
                          setNewComment(e.target.value);
                          // Проверяем @ - ищем последний @ после пробела или в начале
                          const text = e.target.value;
                          const cursorPos = e.target.selectionStart || text.length;
                          
                          // Находим последний @ перед курсором
                          let lastAtIndex = -1;
                          for (let i = cursorPos - 1; i >= 0; i--) {
                            if (text[i] === '@') {
                              // Проверяем, что @ в начале или после пробела/новой строки
                              if (i === 0 || /[\s\n]/.test(text[i - 1])) {
                                lastAtIndex = i;
                                break;
                              }
                            }
                            // Если встретили пробел - прекращаем поиск
                            if (/\s/.test(text[i])) break;
                          }
                          
                          if (lastAtIndex !== -1) {
                            const afterAt = text.slice(lastAtIndex + 1, cursorPos);
                            // Проверяем, что нет пробела после @
                            if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
                              setShowMentionDropdown(true);
                              setMentionFilter(afterAt);
                            } else {
                              setShowMentionDropdown(false);
                            }
                          } else {
                            setShowMentionDropdown(false);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (newComment.trim()) {
                              addComment(editingTodo.id, newComment);
                              setReplyingToComment(null);
                            }
                          }
                          if (e.key === 'Escape' && replyingToComment) {
                            setReplyingToComment(null);
                            setNewComment('');
                          }
                        }}
                        placeholder="Написать... (@упомянуть)"
                        className="w-full px-3 py-2 pr-12 bg-gray-50 dark:bg-[var(--bg-glass)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl text-xs text-gray-900 dark:text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-white/30 resize-none focus:outline-none focus:border-blue-500/30 transition-all"
                        rows={1}
                        style={{
                          minHeight: '40px',
                          maxHeight: '200px', // примерно 10 строк
                          overflowY: newComment.split('\n').length > 10 ? 'auto' : 'hidden',
                          height: 'auto'
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          const lines = target.value.split('\n').length;
                          const maxLines = 10;
                          if (lines <= maxLines) {
                            target.style.height = `${target.scrollHeight}px`;
                          } else {
                            target.style.height = '200px'; // макс высота
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newComment.trim()) {
                            addComment(editingTodo.id, newComment);
                            setReplyingToComment(null);
                          }
                        }}
                        disabled={!newComment.trim()}
                        className="absolute right-2 bottom-2 w-8 h-8 flex items-center justify-center bg-blue-500 hover:bg-blue-600 disabled:bg-[var(--bg-glass-hover)] disabled:text-[var(--text-muted)] text-[var(--text-primary)] rounded-full transition-all shadow-lg"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown упоминаний */}
                      {showMentionDropdown && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg shadow-xl max-h-32 overflow-y-auto">
                          {people
                            .filter(p => !mentionFilter || p.name.toLowerCase().includes(mentionFilter.toLowerCase()))
                            .map(person => (
                              <button
                                key={person.id}
                                type="button"
                                onClick={() => {
                                  // Находим позицию @ для замены
                                  const text = newComment;
                                  let lastAtIndex = -1;
                                  for (let i = text.length - 1; i >= 0; i--) {
                                    if (text[i] === '@') {
                                      if (i === 0 || /[\s\n]/.test(text[i - 1])) {
                                        lastAtIndex = i;
                                        break;
                                      }
                                    }
                                    if (/\s/.test(text[i])) break;
                                  }
                                  if (lastAtIndex !== -1) {
                                    const newText = text.slice(0, lastAtIndex) + '@' + person.name + ' ';
                                    setNewComment(newText);
                                  } else {
                                    setNewComment(newComment + '@' + person.name + ' ');
                                  }
                                  setShowMentionDropdown(false);
                                  commentInputRef.current?.focus();
                                }}
                                className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-glass)] flex items-center gap-2 transition-colors"
                              >
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                  person.role === 'executor' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {person.role === 'executor' ? <UserCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                </div>
                                <span className="text-[var(--text-secondary)]">{person.name}</span>
                                {person.telegramId && (
                                  <span className="text-[9px] text-cyan-400 ml-auto">TG</span>
                                )}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border-t border-[var(--border-color)] bg-orange-500/5">
                    <div className="flex items-center justify-center gap-2 text-orange-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                      <p className="text-[10px]">
                        Выберите профиль в настройках
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Футер */}
            <div className="flex justify-between items-center px-4 py-2.5 border-t border-[var(--border-color)] bg-white/[0.02] rounded-b-xl">
              <div className="text-[10px] text-[var(--text-muted)]">
                Создано: {new Date(editingTodo.createdAt).toLocaleDateString('ru-RU')}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={closeTodoModal}
                  className="px-3 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass)] rounded-lg transition-all text-xs font-medium"
                >
                  Отмена
                </button>
                <button
                  onClick={() => updateTodo(editingTodo)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all text-sm font-medium"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5 text-[var(--text-secondary)]" />
                Управление категориями
              </h3>
              <button
                onClick={() => setShowCategoryManager(false)}
                className="p-1 hover:bg-[var(--bg-glass)] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-white/50 mb-4">
                Категории общие для всех аккаунтов. Добавляйте, редактируйте и удаляйте категории задач.
              </p>

              {/* Список категорий */}
              <div className="space-y-2 mb-4">
                {categories.map(cat => (
                  <div 
                    key={cat.id}
                    className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]"
                  >
                    {editingCategory?.id === cat.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingCategory.name}
                          onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                          className="flex-1 px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded focus:outline-none focus:border-white/30"
                        />
                        <input
                          type="color"
                          value={editingCategory.color}
                          onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer"
                        />
                        <select
                          value={editingCategory.icon}
                          onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                          className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded text-sm"
                        >
                          <option value="search">SEO</option>
                          <option value="file-text">Контент</option>
                          <option value="megaphone">Реклама</option>
                          <option value="bar-chart">Аналитика</option>
                          <option value="share-2">Соцсети</option>
                          <option value="mail">Email</option>
                          <option value="palette">Дизайн</option>
                          <option value="code">Разработка</option>
                          <option value="tag">Другое</option>
                        </select>
                        <button
                          onClick={() => updateCategory(editingCategory)}
                          className="p-1 bg-green-500 text-[var(--text-primary)] rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="p-1 bg-[var(--bg-glass)] rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <span 
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                          >
                            {CATEGORY_ICONS[cat.icon] || <Tag className="w-4 h-4" />}
                          </span>
                          <span className="font-medium">{cat.name}</span>
                          <span 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingCategory(cat)}
                            className="p-1.5 hover:bg-[var(--bg-glass)] rounded"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteCategory(cat.id)}
                            className="p-1.5 hover:bg-red-500/20 rounded text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Форма добавления */}
              {showAddCategory ? (
                <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                  <h4 className="text-sm font-medium mb-3">Новая категория</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Название категории"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-white/30"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-white/50 block mb-1">Цвет</label>
                        <div className="flex gap-1">
                          {LIST_COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => setNewCategoryColor(color)}
                              className={`w-6 h-6 rounded-full transition-transform ${
                                newCategoryColor === color ? 'ring-2 ring-offset-2 ring-white/30 scale-110' : ''
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-white/50 block mb-1">Иконка</label>
                        <select
                          value={newCategoryIcon}
                          onChange={(e) => setNewCategoryIcon(e.target.value)}
                          className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded text-sm h-8"
                        >
                          <option value="search">SEO</option>
                          <option value="file-text">Контент</option>
                          <option value="megaphone">Реклама</option>
                          <option value="bar-chart">Аналитика</option>
                          <option value="share-2">Соцсети</option>
                          <option value="mail">Email</option>
                          <option value="palette">Дизайн</option>
                          <option value="code">Разработка</option>
                          <option value="tag">Другое</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addCategory}
                        className="flex-1 py-2 bg-[var(--bg-glass-hover)] text-[var(--text-primary)] rounded-lg text-sm font-medium border border-[var(--border-color)] hover:bg-white/15"
                      >
                        Добавить
                      </button>
                      <button
                        onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }}
                        className="px-4 py-2 bg-[var(--bg-glass)] rounded-lg text-sm hover:bg-[var(--bg-glass-hover)]"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="w-full py-2 border-2 border-dashed border-[var(--border-color)] rounded-xl text-[var(--text-muted)] hover:border-[var(--border-light)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-glass)] transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить категорию
                </button>
              )}
            </div>

            <div className="flex justify-end p-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => setShowCategoryManager(false)}
                className="px-4 py-2 bg-[var(--bg-glass-hover)] text-[var(--text-primary)] hover:bg-white/15 rounded-xl transition-all border border-[var(--border-color)]"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      {/* People Manager Modal */}
      {showPeopleManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--text-secondary)]" />
                Исполнители и заказчики
              </h3>
              <button
                onClick={() => setShowPeopleManager(false)}
                className="p-1 hover:bg-[var(--bg-glass)] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-white/50 mb-4">
                Список пользователей системы и их роли в задачах. Управление пользователями доступно в админ-панели.
              </p>

              {/* Исполнители */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" /> Исполнители
                </h4>
                <div className="space-y-2">
                  {people.filter(p => p.role === 'executor' || p.role === 'universal').map(person => (
                    <div 
                      key={person.id}
                      className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          person.role === 'universal' 
                            ? 'bg-purple-500/20 text-purple-400' 
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {person.role === 'universal' ? <Users className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{person.name}</span>
                            {person.role === 'universal' && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">Универсал</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {person.telegramId && (
                              <span className="text-xs text-cyan-400">📱 {person.telegramId}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {people.filter(p => p.role === 'executor' || p.role === 'universal').length === 0 && (
                    <div className="text-sm text-[var(--text-muted)] text-center py-4">Нет исполнителей</div>
                  )}
                </div>
              </div>

              {/* Заказчики */}
              <div>
                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" /> Заказчики
                </h4>
                <div className="space-y-2">
                  {people.filter(p => p.role === 'customer' || p.role === 'universal').map(person => (
                    <div 
                      key={person.id}
                      className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          person.role === 'universal' 
                            ? 'bg-purple-500/20 text-purple-400' 
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {person.role === 'universal' ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{person.name}</span>
                            {person.role === 'universal' && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">Универсал</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {person.telegramId && (
                              <span className="text-xs text-cyan-400">📱 {person.telegramId}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {people.filter(p => p.role === 'customer' || p.role === 'universal').length === 0 && (
                    <div className="text-sm text-[var(--text-muted)] text-center py-4">Нет заказчиков</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end p-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => setShowPeopleManager(false)}
                className="px-4 py-2 bg-[var(--bg-glass-hover)] text-[var(--text-primary)] hover:bg-white/15 rounded-xl transition-all border border-[var(--border-color)]"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Person Modal */}
      {showEditPersonModal && editingPerson && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl max-w-md w-full shadow-2xl">
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

      {/* Telegram Settings Modal */}
      {showTelegramSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h3 className="font-semibold flex items-center gap-2">
                <Bot className="w-5 h-5 text-cyan-400" />
                Уведомления в Telegram
              </h3>
              <button
                onClick={() => setShowTelegramSettings(false)}
                className="p-1 hover:bg-[var(--bg-glass)] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-sm text-white/50">
                Настройте бота для отправки уведомлений о новых задачах исполнителям в Telegram.
              </p>

              <div>
                <label className="block text-sm font-medium mb-1">Bot Token</label>
                <input
                  type="password"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-white/30"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Получите токен у @BotFather в Telegram
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-white/50" />
                  <span className="text-sm">Отправлять уведомления</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={telegramEnabled}
                    onChange={(e) => setTelegramEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[var(--bg-glass-hover)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <p className="text-xs text-cyan-400">
                  💡 Как получить Telegram ID:<br/>
                  1. Напишите боту @userinfobot<br/>
                  2. Он пришлёт ваш ID<br/>
                  3. Добавьте ID к исполнителю в разделе &quot;Люди&quot;
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 p-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => setShowTelegramSettings(false)}
                className="px-4 py-2 hover:bg-[var(--bg-glass)] rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={updateTelegramSettings}
                className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all border border-cyan-500/30"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List Settings Modal */}
      {showListSettings && (() => {
        const settingsList = lists.find(l => l.id === showListSettings);
        if (!settingsList) return null;
        
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl w-full max-w-md max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] flex-shrink-0">
                <h3 className="font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-400" />
                  Настройки списка &quot;{settingsList.name}&quot;
                </h3>
                <button
                  onClick={() => {
                    setShowListSettings(null);
                    setListSettingsDropdown(null);
                  }}
                  className="p-1 hover:bg-[var(--bg-glass)] rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <p className="text-sm text-[var(--text-muted)]">
                  Задайте исполнителя и заказчика по умолчанию для новых задач в этом списке.
                </p>

                {/* Дефолтный исполнитель */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-green-400" />
                    Исполнитель по умолчанию
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setListSettingsDropdown(listSettingsDropdown === 'executor' ? null : 'executor')}
                      className={`w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-left flex items-center justify-between hover:border-[var(--border-light)] transition-all ${
                        listSettingsDropdown === 'executor' ? 'rounded-t-lg border-b-0' : 'rounded-lg'
                      }`}
                    >
                    <div className="flex items-center gap-2">
                      {settingsList.defaultExecutorId ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                            <UserCheck className="w-3 h-3" />
                          </div>
                          <span className="text-[var(--text-primary)] text-sm">{people.find(p => p.id === settingsList.defaultExecutorId)?.name}</span>
                          {people.find(p => p.id === settingsList.defaultExecutorId)?.telegramId && (
                            <span className="text-[9px] text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                              TG
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[var(--text-muted)] text-sm">Не выбран</span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${listSettingsDropdown === 'executor' ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`absolute top-full left-0 right-0 bg-[var(--bg-secondary)] border border-[var(--border-color)] border-t-0 rounded-b-lg shadow-xl z-50 max-h-48 overflow-y-auto transition-all duration-200 ease-out origin-top ${
                    listSettingsDropdown === 'executor' 
                      ? 'opacity-100 scale-y-100' 
                      : 'opacity-0 scale-y-0 pointer-events-none'
                  }`}>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...settingsList, defaultExecutorId: undefined };
                          updateList(updated);
                          setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
                          setListSettingsDropdown(null);
                        }}
                        className={`w-full px-3 py-2.5 text-left hover:bg-[var(--bg-glass)] transition-colors flex items-center gap-2 border-b border-[var(--border-secondary)] ${
                          !settingsList.defaultExecutorId ? 'bg-[var(--bg-glass)]' : ''
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-[var(--bg-glass-hover)] flex items-center justify-center">
                          <X className="w-3 h-3 text-[var(--text-muted)]" />
                        </div>
                        <span className="text-white/50 text-sm">Не выбран</span>
                      </button>
                      {people.filter(p => p.role === 'executor' || p.role === 'universal').map(person => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => {
                            const updated = { ...settingsList, defaultExecutorId: person.id };
                            updateList(updated);
                            setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
                            setListSettingsDropdown(null);
                          }}
                          className={`w-full px-3 py-2.5 text-left hover:bg-[var(--bg-glass)] transition-colors flex items-center justify-between ${
                            settingsList.defaultExecutorId === person.id ? 'bg-green-500/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              settingsList.defaultExecutorId === person.id 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-[var(--bg-glass-hover)] text-[var(--text-secondary)]'
                            }`}>
                              <UserCheck className="w-3 h-3" />
                            </div>
                            <span className={`text-sm ${settingsList.defaultExecutorId === person.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                              {person.name}
                            </span>
                          </div>
                          {person.telegramId && (
                            <span className="text-[9px] text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                              TG
                            </span>
                          )}
                        </button>
                      ))}
                      {people.filter(p => p.role === 'executor' || p.role === 'universal').length === 0 && (
                        <div className="px-3 py-4 text-center text-[var(--text-muted)] text-sm">
                          Нет исполнителей
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Будет автоматически назначен при создании задачи
                  </p>
                </div>

                {/* Дефолтный заказчик */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    Заказчик по умолчанию
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setListSettingsDropdown(listSettingsDropdown === 'customer' ? null : 'customer')}
                      className={`w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-left flex items-center justify-between hover:border-[var(--border-light)] transition-all ${
                        listSettingsDropdown === 'customer' ? 'rounded-t-lg border-b-0' : 'rounded-lg'
                      }`}
                    >
                    <div className="flex items-center gap-2">
                      {settingsList.defaultCustomerId ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                            <User className="w-3 h-3" />
                          </div>
                          <span className="text-[var(--text-primary)] text-sm">{people.find(p => p.id === settingsList.defaultCustomerId)?.name}</span>
                          {people.find(p => p.id === settingsList.defaultCustomerId)?.telegramId && (
                            <span className="text-[9px] text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                              TG
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[var(--text-muted)] text-sm">Не выбран</span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${listSettingsDropdown === 'customer' ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`absolute top-full left-0 right-0 bg-[var(--bg-secondary)] border border-[var(--border-color)] border-t-0 rounded-b-lg shadow-xl z-50 max-h-48 overflow-y-auto transition-all duration-200 ease-out origin-top ${
                    listSettingsDropdown === 'customer' 
                      ? 'opacity-100 scale-y-100' 
                      : 'opacity-0 scale-y-0 pointer-events-none'
                  }`}>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...settingsList, defaultCustomerId: undefined };
                          updateList(updated);
                          setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
                          setListSettingsDropdown(null);
                        }}
                        className={`w-full px-3 py-2.5 text-left hover:bg-[var(--bg-glass)] transition-colors flex items-center gap-2 border-b border-[var(--border-secondary)] ${
                          !settingsList.defaultCustomerId ? 'bg-[var(--bg-glass)]' : ''
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-[var(--bg-glass-hover)] flex items-center justify-center">
                          <X className="w-3 h-3 text-[var(--text-muted)]" />
                        </div>
                        <span className="text-white/50 text-sm">Не выбран</span>
                      </button>
                      {people.filter(p => p.role === 'customer' || p.role === 'universal').map(person => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => {
                            const updated = { ...settingsList, defaultCustomerId: person.id };
                            updateList(updated);
                            setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
                            setListSettingsDropdown(null);
                          }}
                          className={`w-full px-3 py-2.5 text-left hover:bg-[var(--bg-glass)] transition-colors flex items-center justify-between ${
                            settingsList.defaultCustomerId === person.id ? 'bg-blue-500/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              settingsList.defaultCustomerId === person.id 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'bg-[var(--bg-glass-hover)] text-[var(--text-secondary)]'
                            }`}>
                              <User className="w-3 h-3" />
                            </div>
                            <span className={`text-sm ${settingsList.defaultCustomerId === person.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                              {person.name}
                            </span>
                          </div>
                          {person.telegramId && (
                            <span className="text-[9px] text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                              TG
                            </span>
                          )}
                        </button>
                      ))}
                      {people.filter(p => p.role === 'customer' || p.role === 'universal').length === 0 && (
                        <div className="px-3 py-4 text-center text-[var(--text-muted)] text-sm">
                          Нет заказчиков
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Будет автоматически установлен как &quot;От кого&quot;
                  </p>
                </div>

                {/* Цвет списка */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-400" />
                    Цвет списка
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {LIST_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => {
                          const updated = { ...settingsList, color };
                          updateList(updated);
                          setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
                        }}
                        className={`w-8 h-8 rounded-lg transition-all ${
                          settingsList.color === color 
                            ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-[#1a1a1a] scale-110' 
                            : 'opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Добавлять на календарь по умолчанию */}
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <label 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => {
                      const updated = { ...settingsList, defaultAddToCalendar: !settingsList.defaultAddToCalendar };
                      updateList(updated);
                      setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
                    }}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      settingsList.defaultAddToCalendar 
                        ? 'bg-purple-500 border-purple-500' 
                        : 'border-[var(--border-light)] group-hover:border-white/40'
                    }`}>
                      {settingsList.defaultAddToCalendar && <Check className="w-3 h-3 text-[var(--text-primary)]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CalendarPlus className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                          Добавлять задачи на календарь
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Новые задачи будут автоматически отправляться на календарь
                      </p>
                    </div>
                  </label>
                </div>

                {/* Доступ по отделам */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-orange-400" />
                    Доступ по отделам
                  </label>
                  <p className="text-xs text-[var(--text-muted)] mb-2">
                    Пользователи из выбранных отделов смогут видеть этот список
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      // Собираем все уникальные отделы из пользователей
                      const departments = [...new Set(people.filter(p => p.department).map(p => p.department!))].sort();
                      return departments.map(dept => {
                        const isSelected = settingsList.allowedDepartments?.includes(dept);
                        return (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => {
                              const currentDepts = settingsList.allowedDepartments || [];
                              const newDepts = isSelected
                                ? currentDepts.filter(d => d !== dept)
                                : [...currentDepts, dept];
                              const updated = { ...settingsList, allowedDepartments: newDepts };
                              updateList(updated);
                              setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                : 'bg-[var(--bg-glass)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-orange-500/30'
                            }`}
                          >
                            <Users className="w-3 h-3" />
                            {dept}
                            {isSelected && <Check className="w-3 h-3" />}
                          </button>
                        );
                      });
                    })()}
                    {people.filter(p => p.department).length === 0 && (
                      <div className="text-xs text-[var(--text-muted)] py-2">
                        Нет пользователей с назначенными отделами
                      </div>
                    )}
                  </div>
                  {settingsList.allowedDepartments && settingsList.allowedDepartments.length > 0 && (
                    <div className="mt-2 text-xs text-orange-400">
                      Выбрано отделов: {settingsList.allowedDepartments.length}
                    </div>
                  )}
                </div>

                {/* Текущие настройки */}
                {(settingsList.defaultExecutorId || settingsList.defaultCustomerId || settingsList.defaultAddToCalendar || (settingsList.allowedDepartments && settingsList.allowedDepartments.length > 0)) && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-xs text-green-400 font-medium mb-1">✓ Настройки сохранены</p>
                    <div className="text-xs text-[var(--text-secondary)] space-y-1">
                      {settingsList.defaultExecutorId && (
                        <div className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-green-400" />
                          Исполнитель: {people.find(p => p.id === settingsList.defaultExecutorId)?.name}
                        </div>
                      )}
                      {settingsList.defaultCustomerId && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-blue-400" />
                          Заказчик: {people.find(p => p.id === settingsList.defaultCustomerId)?.name}
                        </div>
                      )}
                      {settingsList.defaultAddToCalendar && (
                        <div className="flex items-center gap-1">
                          <CalendarPlus className="w-3 h-3 text-purple-400" />
                          Автодобавление в календарь
                        </div>
                      )}
                      {settingsList.allowedDepartments && settingsList.allowedDepartments.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-orange-400" />
                          Отделы: {settingsList.allowedDepartments.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2 p-4 border-t border-[var(--border-color)]">
                <button
                  onClick={() => {
                    setShowListSettings(null);
                    setListSettingsDropdown(null);
                  }}
                  className="px-4 py-2 bg-[var(--bg-glass-hover)] text-[var(--text-primary)] hover:bg-white/15 rounded-lg transition-all border border-[var(--border-color)]"
                >
                  Готово
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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