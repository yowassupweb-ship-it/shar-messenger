'use client';

import React, { memo, useRef, useState, useEffect, Dispatch, SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Calendar, 
  CalendarPlus, 
  Check, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Link as LinkIcon,
  Link2,
  MessageCircle,
  Plus, 
  Tag,
  Copy,
  Users,
  X,
  Trash2,
  Shield,
  Send,
  Paperclip,
  Edit3,
  Menu
} from 'lucide-react';
import StatusButtonGroup, { StatusOption } from '@/components/ui/StatusButtonGroup';
import PersonSelector from '@/components/ui/PersonSelector';
import MultiPersonSelector from '@/components/ui/MultiPersonSelector';
import DateTimePicker from '@/components/ui/DateTimePicker';
import TextArea from '@/components/ui/TextArea';
import FormField from '@/components/ui/FormField';

// Типы (должны быть импортированы из parent или shared types)
interface Person {
  id: string;
  name: string;
  username?: string;
  telegramId?: string;
  role: 'executor' | 'customer' | 'universal';
  department?: string;
}

interface ContactUser {
  id: string;
  name?: string;
  username?: string;
  department?: string;
}

interface TodoList {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
  archived?: boolean;
}

interface TodoCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
}

interface CalendarList {
  id: string;
  name: string;
  color?: string;
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

interface Comment {
  id: string;
  todoId: string;
  authorId: string;
  authorName: string;
  content: string;
  mentions: string[];
  createdAt: string;
}

interface ChatOption {
  id: string;
  title?: string;
  name?: string;
  isGroup?: boolean;
  participantIds?: string[];
  lastMessage?: { id?: string; createdAt?: string };
}

interface TaskChatMessage {
  id: string;
  chatId: string;
  authorId: string;
  authorName: string;
  content: string;
  mentions: string[];
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  attachments?: Array<{ type?: string; name?: string; url?: string }>;
}

interface ShareLink {
  id: string;
  token: string;
  permission: 'viewer' | 'editor';
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  metadata?: {
    shareTarget?: 'link' | 'chat' | 'department' | 'user';
    chatId?: string;
    department?: string;
    userId?: string;
  };
}

interface TaskVersionEntry {
  id: string;
  createdAt: string;
  createdById?: string;
  createdByName?: string;
  snapshot: {
    title?: string;
    description?: string;
    assigneeResponse?: string;
    stageMeta?: Todo['stageMeta'];
    technicalSpecTabs?: Todo['technicalSpecTabs'];
    stagesEnabled?: boolean;
    priority?: Todo['priority'];
    status?: Todo['status'];
    dueDate?: string;
    recurrence?: Todo['recurrence'];
  };
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
  delegatedById?: string | null;
  delegatedBy?: string | null;
  assignedToId?: string | null;
  assignedTo?: string | null;
  assignedToIds?: string[];
  assignedToNames?: string[];
  addToCalendar?: boolean;
  calendarEventId?: string;
  calendarListId?: string;
  chatId?: string;
  createdAt: string;
  updatedAt: string;
  order: number;
  archived?: boolean;
  comments?: Comment[];
  checklist?: ChecklistItem[];
  attachments?: Attachment[];
  type?: 'task' | 'technical_task';
  technicalSpec?: Record<string, string>;
  technicalSpecTabs?: { id: string, label: string }[];
  stagesEnabled?: boolean;
  stageDefaultAssigneeId?: string | null;
  stageDefaultAssigneeName?: string | null;
  stageMeta?: Record<string, {
    status?: Todo['status'];
    assigneeId?: string | null;
    assigneeName?: string | null;
    dueDate?: string;
    reviewComment?: string;
    description?: string;
    assigneeResponse?: string;
  }>;
  versionHistory?: TaskVersionEntry[];
  metadata?: Record<string, unknown>;
}

interface EditingtodoProps {
  // Основные данные
  todo: Todo | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (todo: Todo) => void;
  onToggle: (todo: Todo) => void;
  onDraftUpdate?: (updates: Partial<Todo>) => void;
  
  // Данные
  people: Person[];
  lists: TodoList[];
  nonArchivedLists: TodoList[];
  categories: TodoCategory[];
  calendarLists: CalendarList[];
  
  // UI состояние
  openDropdown: string | null;
  setOpenDropdown: (dropdown: string | null) => void;
  
  // Layout состояние (для resize колонок)
  columnWidths: [number, number, number];
  setColumnWidths: Dispatch<SetStateAction<[number, number, number]>>;
  isResizing: number | null;
  setIsResizing: Dispatch<SetStateAction<number | null>>;
  resizeStartXRef: React.MutableRefObject<number>;
  resizeStartWidthsRef: React.MutableRefObject<number[]>;
  
  // Константы
  statusOptions: StatusOption[];
  TZ_LIST_ID: string;
  myAccountId: string;
}

const Editingtodo = memo(function Editingtodo({
  todo,
  isOpen,
  onClose,
  onUpdate,
  onToggle,
  onDraftUpdate,
  people,
  lists,
  nonArchivedLists,
  categories,
  calendarLists,
  openDropdown,
  setOpenDropdown,
  columnWidths,
  setColumnWidths,
  isResizing,
  setIsResizing,
  resizeStartXRef,
  resizeStartWidthsRef,
  statusOptions,
  TZ_LIST_ID,
  myAccountId
}: EditingtodoProps) {
  const router = useRouter();
  const { theme } = useTheme();
  
  // Локальное состояние для редактирования
  const [editingTodo, setEditingTodo] = useState<Todo | null>(
    todo ? { ...todo, title: todo.title ?? '' } : null
  );
  const initialTodoRef = useRef<Todo | null>(null); // Исходное состояние для отслеживания изменений
  const [activeStageId, setActiveStageId] = useState<string>('details');
  const [sidebarMode, setSidebarMode] = useState<'settings' | 'stages' | 'status' | 'access'>('settings');
  const [contentTab, setContentTab] = useState<'details'>('details');
  const [isBurgerMenuOpen, setIsBurgerMenuOpen] = useState(false);
  const [discussionEnabled, setDiscussionEnabled] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [activeTechSpecTab, setActiveTechSpecTab] = useState<string>('stage1');
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renamingTabValue, setRenamingTabValue] = useState<string>('');
  const [permission, setPermission] = useState<'viewer' | 'editor'>('viewer');
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);

  // Refs для DOM элементов
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false);
  const [shareTarget, setShareTarget] = useState<'link' | 'chat' | 'department' | 'user'>('link');
  const [chatId, setChatId] = useState('');
  const [department, setDepartment] = useState('');
  const [userId, setUserId] = useState('');
  const [accessChats, setAccessChats] = useState<ChatOption[]>([]);
  const [accessChatSearch, setAccessChatSearch] = useState('');
  const [isChatDropdownOpen, setIsChatDropdownOpen] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);
  const [accessUserSearch, setAccessUserSearch] = useState('');
  const [contactUsers, setContactUsers] = useState<ContactUser[]>([]);
  const [isDiscussionCollapsed, setIsDiscussionCollapsed] = useState(false);
  const [discussionMessages, setDiscussionMessages] = useState<TaskChatMessage[]>([]);
  const [discussionInput, setDiscussionInput] = useState('');
  const [discussionAttachments, setDiscussionAttachments] = useState<Array<{ type?: string; name?: string; url?: string }>>([]);
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [discussionSending, setDiscussionSending] = useState(false);
  const [editingDiscussionMessageId, setEditingDiscussionMessageId] = useState<string | null>(null);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  
  // Настройки чата для обсуждений
  const [chatSettings, setChatSettings] = useState({
    bubbleStyle: 'modern' as 'modern' | 'classic' | 'minimal',
    fontSize: 10, // размер в пикселях для десктопа (уменьшен на 20%)
    fontSizeMobile: 12, // размер в пикселях для мобильных (уменьшен на 20%)
    bubbleColor: '#3c3d96', // цвет для темной темы
    bubbleColorLight: '#453de6', // цвет для светлой темы
    colorPreset: 0
  });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const chatDropdownRef = useRef<HTMLDivElement>(null);
  const departmentDropdownRef = useRef<HTMLDivElement>(null);
  const discussionListRef = useRef<HTMLDivElement>(null);
  const discussionFileInputRef = useRef<HTMLInputElement>(null);
  
  // Функция для определения нужен ли тёмный текст на светлом фоне
  const needsDarkText = (hexColor: string) => {
    // Преобразуем hex в RGB
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Вычисляем яркость (YIQ формула)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128; // Если яркость выше 128 - нужен тёмный текст
  };
  
  // Определяем цвет текста для своих баблов в зависимости от яркости фона
  const currentBubbleColor = theme === 'dark' ? chatSettings.bubbleColor : chatSettings.bubbleColorLight;
  const useDarkTextOnBubble = needsDarkText(currentBubbleColor);
  const myBubbleTextClass = useDarkTextOnBubble ? 'text-gray-900' : 'text-white';
  const myBubbleTextMutedClass = useDarkTextOnBubble ? 'text-gray-700' : 'text-white/70';
  
  // Настройки стилей баблов
  const bubbleRadius = chatSettings.bubbleStyle === 'minimal' ? 'rounded-lg' : chatSettings.bubbleStyle === 'classic' ? 'rounded-2xl' : 'rounded-[18px]';
  const mobileFontSize = chatSettings.fontSizeMobile || 15;
  const desktopFontSize = chatSettings.fontSize || 13;
  const isDesktopView = typeof window !== 'undefined' && window.innerWidth >= 768;
  const fontSizeStyle = { fontSize: `${isDesktopView ? desktopFontSize : mobileFontSize}px`, lineHeight: isDesktopView ? '1.5' : '1.3' };
  
  const stagesEnabled = editingTodo?.stagesEnabled === true;
  const hasDiscussionStarted = Boolean(editingTodo?.chatId) || discussionMessages.length > 0;
  const descriptionEditorId = stagesEnabled ? `description-editor-${activeTechSpecTab}` : 'description-editor';

  // Динамические вкладки tech spec
  const getTechSpecTabs = () => {
    const tabs = editingTodo?.technicalSpecTabs || [
      { id: 'stage1', label: 'Этап 1' }
    ];
    // Всегда нормализуем ID этапов при получении
    const normalizedTabs = tabs.map(tab => ({
      ...tab,
      id: tab.id.replace(/^tab_/, 'tab')
    }));
    console.log('📋 getTechSpecTabs:', normalizedTabs.map(t => t.id));
    return normalizedTabs;
  };

  const syncActiveStageEditors = () => {
    if (!editingTodo || !stagesEnabled) return;
    const nextDescription = descriptionEditorRef.current?.innerHTML || '';
    const nextResponse = assigneeResponseEditorRef.current?.innerHTML || '';
    updateStageMeta(activeTechSpecTab, {
      description: nextDescription,
      assigneeResponse: nextResponse
    });
  };

  const addTechSpecTab = () => {
    if (!editingTodo) return;
    // Сохраняем текущий этап перед добавлением нового
    if (descriptionEditorRef.current && assigneeResponseEditorRef.current) {
      const nextDescription = descriptionEditorRef.current.innerHTML || '';
      const nextResponse = assigneeResponseEditorRef.current.innerHTML || '';
      updateStageMeta(activeTechSpecTab, {
        description: nextDescription,
        assigneeResponse: nextResponse
      });
    }
    const newId = `tab${Date.now()}`;
    const newTabs = [...getTechSpecTabs(), { id: newId, label: 'Новый этап' }];
    setEditingTodo({
      ...editingTodo,
      technicalSpecTabs: newTabs
    });
    setActiveTechSpecTab(newId);
  };

  const deleteTechSpecTab = (tabId: string) => {
    if (!editingTodo) return;
    const tabs = getTechSpecTabs();
    if (tabs.length <= 1) return; // Не удаляем последний
    
    const newTabs = tabs.filter(t => t.id !== tabId);
    const newStageMeta = { ...getMergedStageMeta(editingTodo) };
    delete newStageMeta[tabId];
    
    setEditingTodo({
      ...editingTodo,
      technicalSpecTabs: newTabs,
      stageMeta: newStageMeta
    });
    
    if (activeTechSpecTab === tabId) {
      setActiveTechSpecTab(newTabs[0]?.id || 'stage1');
    }
  };

  const renameTechSpecTab = (tabId: string, newLabel: string) => {
    if (!editingTodo) return;
    const newTabs = getTechSpecTabs().map(tab => 
      tab.id === tabId ? { ...tab, label: newLabel } : tab
    );
    setEditingTodo({
      ...editingTodo,
      technicalSpecTabs: newTabs
    });
  };

  const startRenameTechSpecTab = (tabId: string, currentLabel: string) => {
    setRenamingTabId(tabId);
    setRenamingTabValue(currentLabel);
  };

  const commitRenameTechSpecTab = (tabId: string) => {
    const nextLabel = renamingTabValue.trim();
    if (nextLabel) {
      renameTechSpecTab(tabId, nextLabel);
    }
    setRenamingTabId(null);
    setRenamingTabValue('');
  };

  const getMergedStageMeta = (todoState: Todo) => {
    const metadataStageMeta = (todoState.metadata as any)?.stageMeta as Todo['stageMeta'] | undefined;
    return {
      ...(metadataStageMeta || {}),
      ...(todoState.stageMeta || {})
    };
  };

  const getStageMeta = (todoState: Todo, tabId: string) => {
    const stageMeta = getMergedStageMeta(todoState);
    return stageMeta?.[tabId] || {
      status: 'pending' as Todo['status'],
      description: '',
      assigneeResponse: ''
    };
  };

  const updateStageMeta = (tabId: string, patch: Partial<NonNullable<Todo['stageMeta']>[string]>) => {
    console.log('🔧 updateStageMeta called:', {
      tabId,
      patch,
      activeTechSpecTab,
      stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n')
    });
    setEditingTodo(prev => {
      if (!prev) return prev;
      const current = getStageMeta(prev, tabId);
      const updated = {
        ...prev,
        stageMeta: {
          ...(prev.stageMeta || {}),
          [tabId]: { ...current, ...patch }
        }
      };
      console.log('🔧 updateStageMeta result:', {
        tabId,
        newStageMeta: updated.stageMeta
      });
      return updated;
    });
  };

  const getDefaultStageAssignee = (todoState: Todo) => {
    return {
      id: todoState.stageDefaultAssigneeId,
      name: todoState.stageDefaultAssigneeName
    };
  };

  const getEffectiveStageAssignee = (todoState: Todo, tabId: string) => {
    const meta = getStageMeta(todoState, tabId);
    const defaults = getDefaultStageAssignee(todoState);
    const hasStageAssignee = meta.assigneeId != null || (meta.assigneeName != null && meta.assigneeName !== '');
    if (hasStageAssignee) {
      return {
        id: meta.assigneeId ?? null,
        name: meta.assigneeName ?? null
      };
    }
    return {
      id: defaults.id ?? null,
      name: defaults.name ?? null
    };
  };


  const getStatusOption = (status?: Todo['status']) => {
    const normalizedStatus = status === 'todo' ? 'pending' : status;
    return normalizedStatusOptions.find(option => option.value === normalizedStatus);
  };

  const getStatusPillClasses = (color?: StatusOption['color']) => {
    switch (color) {
      case 'orange':
        return 'bg-orange-100 text-orange-800 ring-1 ring-orange-300 dark:bg-orange-500/20 dark:text-orange-300 dark:ring-orange-500/40';
      case 'blue':
        return 'bg-blue-100 text-blue-800 ring-1 ring-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:ring-blue-500/40';
      case 'green':
        return 'bg-green-100 text-green-800 ring-1 ring-green-300 dark:bg-green-500/20 dark:text-green-300 dark:ring-green-500/40';
      case 'red':
        return 'bg-red-100 text-red-800 ring-1 ring-red-300 dark:bg-red-500/20 dark:text-red-300 dark:ring-red-500/40';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-300 dark:ring-yellow-500/40';
      default:
        return 'bg-gray-100 text-gray-700 ring-1 ring-gray-200 dark:bg-white/10 dark:text-[var(--text-muted)] dark:ring-white/10';
    }
  };

  const shareResourceType = 'task';

  const resolvePersonName = (id?: string | null, fallback?: string | null) => {
    if (fallback) return fallback;
    if (!id) return undefined;
    const match = people.find(person => person.id === id);
    if (match) return match.name || match.username || id;
    const contactMatch = contactUsers.find(user => user.id === id);
    return contactMatch?.name || contactMatch?.username || id;
  };

  const getChatLabel = (chat: ChatOption) => {
    if (chat.title) return chat.title;
    if (chat.name) return chat.name;
    if (!chat.isGroup && chat.participantIds?.length) {
      const otherId = chat.participantIds.find(id => id !== myAccountId);
      const other = otherId ? people.find(person => person.id === otherId) : undefined;
      if (other) return other.name || other.username || otherId || chat.id;
    }
    return chat.id;
  };

  const getShareTargetInfo = (link: ShareLink) => {
    const target = link.metadata?.shareTarget || 'link';
    if (target === 'chat') {
      const chat = link.metadata?.chatId
        ? accessChats.find(item => item.id === link.metadata?.chatId)
        : undefined;
      const label = chat ? getChatLabel(chat) : (link.metadata?.chatId || 'Чат');
      return { target, label: `Чат: ${label}` };
    }
    if (target === 'department') {
      return { target, label: `Отдел: ${link.metadata?.department || 'Не выбран'}` };
    }
    if (target === 'user') {
      const label = resolvePersonName(link.metadata?.userId) || link.metadata?.userId || 'Контакт';
      return { target, label: `Контакт: ${label}` };
    }
    return { target: 'link', label: 'Ссылка' };
  };

  const getDefaultAccessPeople = (todoState: Todo) => {
    const ids: string[] = [];
    const names: string[] = [];
    const add = (id?: string | null, name?: string | null) => {
      if (!id || !name || ids.includes(id)) return;
      ids.push(id);
      names.push(name);
    };

    add(todoState.assignedById, todoState.assignedBy);
    add(todoState.delegatedById, todoState.delegatedBy);

    if (todoState.assignedToIds?.length && todoState.assignedToNames?.length) {
      todoState.assignedToIds.forEach((id, idx) => add(id, todoState.assignedToNames?.[idx]));
    } else {
      add(todoState.assignedToId, todoState.assignedTo);
    }

    add(todoState.stageDefaultAssigneeId, todoState.stageDefaultAssigneeName);

    Object.values(getMergedStageMeta(todoState) || {}).forEach((meta) => {
      add(meta.assigneeId, meta.assigneeName);
    });

    return { ids, names };
  };

  const defaultAccessPeople = editingTodo ? getDefaultAccessPeople(editingTodo) : { ids: [], names: [] };
  const selectedShareUserName = resolvePersonName(userId);
  const selectedChat = accessChats.find(chat => chat.id === chatId);
  const selectedChatName = selectedChat ? getChatLabel(selectedChat) : (chatId || undefined);

  const contactPeople = contactUsers.map(user => ({
    id: user.id,
    name: user.name || user.username || user.id
  }));

  const stripRole = (list: Person[]) => list.map(({ role, ...rest }) => rest);

  const departmentOptions = Array.from(
    new Set(
      (contactUsers.length > 0 ? contactUsers : people)
        .map(person => person.department)
        .filter(Boolean)
    )
  ).sort() as string[];

  const filteredDepartments = departmentOptions.filter((dept) =>
    dept.toLowerCase().includes(departmentSearch.toLowerCase())
  );

  const filteredAccessChats = accessChats.filter(chat => {
    const label = getChatLabel(chat).toLowerCase();
    return label.includes(accessChatSearch.toLowerCase());
  });

  const accessContactOptions = (contactPeople.length > 0
    ? contactPeople
    : people.map(person => ({ id: person.id, name: person.name || person.username || person.id }))
  ).filter(item => !!item.id);

  const filteredAccessContacts = accessContactOptions.filter((item) =>
    (item.name || '').toLowerCase().includes(accessUserSearch.toLowerCase())
  );

  const loadShareLinks = async () => {
    try {
      if (!editingTodo?.id) return;
      const params = new URLSearchParams({
        resource_type: shareResourceType,
        resource_id: editingTodo.id
      });
      const res = await fetch(`/api/share?${params}`);
      if (res.ok) {
        const data = await res.json();
        setShareLinks(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading share links:', error);
      setShareLinks([]);
    }
  };

  const createShareLink = async (options?: { copyToken?: boolean }) => {
    if (!editingTodo?.id) return;
    if (shareTarget === 'chat' && !chatId) {
      alert('Выберите чат для доступа');
      return;
    }
    if (shareTarget === 'department' && !department) {
      alert('Выберите отдел для доступа');
      return;
    }
    if (shareTarget === 'user' && !userId) {
      alert('Выберите контакт для доступа');
      return;
    }
    setIsLoading(true);
    try {
      const username = localStorage.getItem('username') || 'anonymous';
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceType: shareResourceType,
          resourceId: editingTodo.id,
          permission,
          createdBy: username,
          metadata: {
            shareTarget,
            chatId: chatId || undefined,
            department: department || undefined,
            userId: userId || undefined
          }
        })
      });

      if (res.ok) {
        const newLink = await res.json();
        setShareLinks(prev => [newLink, ...prev]);
        if (options?.copyToken !== false) {
          copyToClipboard(newLink.token);
        }
      }
    } catch (error) {
      console.error('Error creating share link:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteShareLink = async (linkId: string) => {
    try {
      const params = new URLSearchParams({ link_id: linkId });
      const res = await fetch(`/api/share?${params}`, { method: 'DELETE' });
      if (res.ok) {
        setShareLinks(prev => prev.filter(l => l.id !== linkId));
      }
    } catch (error) {
      console.error('Error deleting share link:', error);
    }
  };

  const copyToClipboard = async (token: string) => {
    const url = `${window.location.origin}/${shareResourceType}?share=${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const loadAccessChats = async () => {
    if (!myAccountId) return;
    setIsLoadingChats(true);
    try {
      const res = await fetch(`/api/chats?user_id=${myAccountId}`);
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.chats)
          ? data.chats
          : [];
      const withMessages = (list as ChatOption[]).filter(chat => !!chat.lastMessage);
      setAccessChats(withMessages);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setIsLoadingChats(false);
    }
  };

  const getCurrentUserName = () => {
    const person = people.find(p => p.id === myAccountId);
    if (person?.name) return person.name;
    if (person?.username) return person.username;
    const username = typeof window !== 'undefined' ? localStorage.getItem('username') : null;
    return username || 'Пользователь';
  };

  const buildTaskParticipants = (todoState: Todo) => {
    const ids = new Set<string>();
    if (myAccountId) ids.add(myAccountId);
    if (todoState.assignedById) ids.add(todoState.assignedById);
    if (todoState.delegatedById) ids.add(todoState.delegatedById);
    if (todoState.assignedToId) ids.add(todoState.assignedToId);
    (todoState.assignedToIds || []).forEach(id => ids.add(id));
    return Array.from(ids).filter(Boolean);
  };

  const persistTodoChatId = async (nextChatId: string) => {
    if (!editingTodo) return;
    try {
      const nextTodo = { ...editingTodo, chatId: nextChatId };
      await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextTodo)
      });
    } catch (error) {
      console.error('Error persisting todo chatId:', error);
    }
  };

  const ensureTaskChat = async (): Promise<string | null> => {
    if (!editingTodo) return null;
    if (editingTodo.chatId) return editingTodo.chatId;

    try {
      const participantIds = buildTaskParticipants(editingTodo);
      if (participantIds.length === 0) return null;

      const chatRes = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isGroup: participantIds.length > 2,
          participantIds,
          title: `Обсуждение: ${editingTodo.title}`,
          creatorId: myAccountId,
          todoId: editingTodo.id
        })
      });

      if (!chatRes.ok) return null;
      const chat = await chatRes.json();
      if (!chat?.id) return null;

      setEditingTodo(prev => (prev ? { ...prev, chatId: chat.id } : prev));
      void persistTodoChatId(chat.id);
      return chat.id;
    } catch (error) {
      console.error('Error ensuring task chat:', error);
      return null;
    }
  };

  const resolveExistingDiscussionChatId = async (): Promise<string | null> => {
    if (!editingTodo || !myAccountId) return null;
    try {
      const res = await fetch(`/api/chats?user_id=${encodeURIComponent(myAccountId)}`);
      if (!res.ok) return null;
      const chats = await res.json();
      const chatList = Array.isArray(chats) ? chats : [];
      const linkedChat = chatList.find((chat: any) => {
        const linkedTodoId = chat?.todoId || chat?.todo_id;
        return linkedTodoId && String(linkedTodoId) === String(editingTodo.id);
      });
      return linkedChat?.id || null;
    } catch (error) {
      console.error('Error resolving existing discussion chat:', error);
      return null;
    }
  };

  const loadDiscussionMessages = async (chatIdValue: string) => {
    setDiscussionLoading(true);
    try {
      const res = await fetch(`/api/chats/${chatIdValue}/messages`);
      if (!res.ok) {
        setDiscussionMessages([]);
        return;
      }
      const data = await res.json();
      setDiscussionMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading discussion messages:', error);
      setDiscussionMessages([]);
    } finally {
      setDiscussionLoading(false);
    }
  };

  const uploadDiscussionFiles = async (files: File[]) => {
    if (files.length === 0) return;
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          setDiscussionAttachments(prev => [...prev, {
            type: file.type.startsWith('image/') ? 'image' : 'file',
            name: file.name,
            url: uploadData.url
          }]);
        }
      } catch (error) {
        console.error('Error uploading discussion file:', error);
      }
    }
  };

  const sendDiscussionMessage = async () => {
    const content = discussionInput.trim();
    if (!content && discussionAttachments.length === 0) return;
    if (!myAccountId) return;

    const ensuredChatId = await ensureTaskChat();
    if (!ensuredChatId) {
      alert('Не удалось создать чат обсуждения');
      return;
    }

    setDiscussionSending(true);
    try {
      if (editingDiscussionMessageId) {
        const patchRes = await fetch(`/api/messages/${editingDiscussionMessageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });
        if (!patchRes.ok) {
          alert('Не удалось обновить сообщение');
          return;
        }
      } else {
        const res = await fetch(`/api/chats/${ensuredChatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authorId: myAccountId,
            authorName: getCurrentUserName(),
            content,
            mentions: [],
            attachments: discussionAttachments
          })
        });
        if (!res.ok) {
          alert('Не удалось отправить сообщение');
          return;
        }
      }

      setDiscussionInput('');
      setDiscussionAttachments([]);
      setEditingDiscussionMessageId(null);
      await loadDiscussionMessages(ensuredChatId);
    } catch (error) {
      console.error('Error sending discussion message:', error);
      alert('Ошибка отправки сообщения');
    } finally {
      setDiscussionSending(false);
    }
  };

  const renderStageStatus = (tabId: string) => {
    if (!editingTodo) return null;
    const meta = getStageMeta(editingTodo, tabId);
    const option = getStatusOption(meta.status);
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusPillClasses(option?.color)}`}
      >
        {option?.label || 'Без статуса'}
      </span>
    );
  };

  const activeStageMeta = editingTodo
    ? getStageMeta(editingTodo, activeTechSpecTab)
    : { status: 'pending' as Todo['status'] };
  const normalizedStatusOptions: StatusOption[] = statusOptions.filter(option => option.value !== 'todo');
  
  // Синхронизируем локальное состояние только при смене задачи
  useEffect(() => {
    if (!todo) {
      setEditingTodo(null);
      return;
    }
    if (!editingTodo || editingTodo.id !== todo.id) {
      console.log('🔄 Loading task into modal:', {
        id: todo.id,
        title: todo.title,
        stageMeta: todo.stageMeta,
        metadataStageMeta: (todo.metadata as any)?.stageMeta,
        stagesEnabled: todo.stagesEnabled
      });
      console.log('🔍 Full stageMeta:', JSON.stringify(todo.stageMeta, null, 2));
      console.log('🔍 Full metadata.stageMeta:', JSON.stringify((todo.metadata as any)?.stageMeta, null, 2));
      
      // Нормализуем ID этапов: убираем подчёркивание из tab_XXX -> tabXXX
      let normalizedTodo = { ...todo };
      const metadata = (normalizedTodo.metadata as Record<string, unknown> | undefined) || {};
      const metadataChatId = (metadata.chatId as string | undefined)
        || (metadata.chat_id as string | undefined);
      if (!normalizedTodo.chatId && metadataChatId) {
        normalizedTodo.chatId = metadataChatId;
      }
      normalizedTodo.title = normalizedTodo.title ?? '';

      if (normalizedTodo.technicalSpecTabs) {
        normalizedTodo.technicalSpecTabs = normalizedTodo.technicalSpecTabs.map(tab => ({
          ...tab,
          id: tab.id.replace(/^tab_/, 'tab')
        }));
        console.log('🔧 Normalized technicalSpecTabs:', normalizedTodo.technicalSpecTabs.map(t => t.id));
      }
      
      // Нормализуем ключи в stageMeta
      if (normalizedTodo.stageMeta) {
        const normalizedStageMeta: any = {};
        Object.entries(normalizedTodo.stageMeta).forEach(([key, value]) => {
          const normalizedKey = key.replace(/^tab_/, 'tab');
          normalizedStageMeta[normalizedKey] = value;
        });
        normalizedTodo.stageMeta = normalizedStageMeta;
        console.log('🔧 Normalized stageMeta keys:', Object.keys(normalizedStageMeta));
      }
      
      // Нормализуем ключи в metadata.stageMeta
      if (normalizedTodo.metadata && (normalizedTodo.metadata as any).stageMeta) {
        const normalizedMetaStageMeta: any = {};
        Object.entries((normalizedTodo.metadata as any).stageMeta).forEach(([key, value]) => {
          const normalizedKey = key.replace(/^tab_/, 'tab');
          normalizedMetaStageMeta[normalizedKey] = value;
        });
        (normalizedTodo.metadata as any).stageMeta = normalizedMetaStageMeta;
        console.log('🔧 Normalized metadata.stageMeta keys:', Object.keys(normalizedMetaStageMeta));
      }
      
      setEditingTodo(normalizedTodo);
      // Сохраняем исходное состояние для отслеживания изменений
      initialTodoRef.current = JSON.parse(JSON.stringify(normalizedTodo));
    }
  }, [todo?.id]);

  // Восстанавливаем состояние при открытии новой задачи
  useEffect(() => {
    setActiveStageId('details');
    const isStagesMode = editingTodo?.stagesEnabled === true;
    setSidebarMode(isStagesMode ? 'stages' : 'settings');
    setLeftPanelOpen(isStagesMode);
    setRightPanelOpen(false);
    setContentTab('details');
    const firstTab = getTechSpecTabs()[0]?.id || 'details';
    // Нормализуем ID: убираем подчёркивание
    const normalizedFirstTab = firstTab.replace(/^tab_/, 'tab');
    setActiveTechSpecTab(normalizedFirstTab);
    console.log('🎯 Set initial active tab:', normalizedFirstTab);
  }, [editingTodo?.id]);

  // Загрузка настроек чата для обсуждений
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setChatSettings(settings);
      } catch (e) {
        console.error('Error loading chat settings:', e);
      }
    }
  }, []);

  useEffect(() => {
    console.log('⚡ Stage content useEffect triggered:', {
      hasEditingTodo: !!editingTodo,
      hasDescription: !!descriptionEditorRef.current,
      hasResponse: !!assigneeResponseEditorRef.current,
      stagesEnabled,
      activeTechSpecTab,
      editingTodoId: editingTodo?.id
    });
    
    if (!editingTodo || !descriptionEditorRef.current || !assigneeResponseEditorRef.current) return;
    
    // Загружаем содержимое активного этапа
    if (stagesEnabled) {
      const meta = getStageMeta(editingTodo, activeTechSpecTab);
      console.log('📝 Loading stage content:', {
        stageId: activeTechSpecTab,
        meta,
        fullStageMeta: getMergedStageMeta(editingTodo)
      });
      console.log('🔍 Stage meta detail:', JSON.stringify(meta, null, 2));
      console.log('🔍 Merged stageMeta:', JSON.stringify(getMergedStageMeta(editingTodo), null, 2));
      descriptionEditorRef.current.innerHTML = meta.description || '';
      assigneeResponseEditorRef.current.innerHTML = meta.assigneeResponse || '';
    } else {
      descriptionEditorRef.current.innerHTML = editingTodo.description || '';
      assigneeResponseEditorRef.current.innerHTML = editingTodo.assigneeResponse || '';
    }
  }, [activeTechSpecTab, editingTodo?.id, editingTodo?.stageMeta, editingTodo?.metadata, stagesEnabled]);

  useEffect(() => {
    if (!stagesEnabled && sidebarMode === 'stages') {
      setSidebarMode('settings');
    }
  }, [stagesEnabled, sidebarMode]);

  useEffect(() => {
    if (sidebarMode === 'access') {
      loadShareLinks();
    }
  }, [sidebarMode, editingTodo?.id]);

  useEffect(() => {
    if (!rightPanelOpen || !editingTodo) return;

    const loadOrResolveDiscussion = async () => {
      if (editingTodo.chatId) {
        await loadDiscussionMessages(editingTodo.chatId);
        return;
      }

      const existingChatId = await resolveExistingDiscussionChatId();
      if (existingChatId) {
        setEditingTodo(prev => (prev ? { ...prev, chatId: existingChatId } : prev));
        void persistTodoChatId(existingChatId);
        await loadDiscussionMessages(existingChatId);
        return;
      }

      setDiscussionMessages([]);
    };

    void loadOrResolveDiscussion();
  }, [rightPanelOpen, editingTodo?.id, editingTodo?.chatId, myAccountId]);

  useEffect(() => {
    if (!discussionListRef.current) return;
    // Скролл к последним сообщениям с небольшой задержкой для корректного рендеринга
    setTimeout(() => {
      if (discussionListRef.current) {
        discussionListRef.current.scrollTop = discussionListRef.current.scrollHeight;
      }
    }, 100);
  }, [discussionMessages.length]);

  useEffect(() => {
    if (!isOpen || sidebarMode !== 'access' || contactUsers.length > 0) return;

    const loadContacts = async () => {
      try {
        const res = await fetch('/api/users');
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.users || []);
        setContactUsers(list);
      } catch (error) {
        console.error('Error loading contacts:', error);
      }
    };

    loadContacts();
  }, [isOpen, sidebarMode, contactUsers.length]);

  useEffect(() => {
    if (sidebarMode === 'access' && shareTarget === 'chat' && accessChats.length === 0) {
      loadAccessChats();
    }
  }, [sidebarMode, shareTarget, accessChats.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPermissionDropdown(false);
      }
    };

    if (showPermissionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPermissionDropdown]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chatDropdownRef.current && !chatDropdownRef.current.contains(e.target as Node)) {
        setIsChatDropdownOpen(false);
      }
    };

    if (isChatDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isChatDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (departmentDropdownRef.current && !departmentDropdownRef.current.contains(e.target as Node)) {
        setIsDepartmentDropdownOpen(false);
      }
    };

    if (isDepartmentDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDepartmentDropdownOpen]);

  useEffect(() => {
    if (editingTodo && !editingTodo.dueDate && editingTodo.addToCalendar) {
      setEditingTodo(prev => (prev ? { ...prev, addToCalendar: false, calendarListId: undefined } : prev));
    }
    if (editingTodo && !editingTodo.dueDate && editingTodo.recurrence && editingTodo.recurrence !== 'once') {
      setEditingTodo(prev => (prev ? { ...prev, recurrence: 'once' } : prev));
    }
  }, [editingTodo?.dueDate, editingTodo?.addToCalendar]);
  
  // Refs для DOM элементов
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionEditorRef = useRef<HTMLDivElement>(null);
  const assigneeResponseEditorRef = useRef<HTMLDivElement>(null);
  
  // Обработчик обновления полей
  const handleUpdate = (updates: Partial<Todo>) => {
    setEditingTodo(prev => (prev ? { ...prev, ...updates } : prev));
  };

  const handleUpdateAndSync = (updates: Partial<Todo>) => {
    handleUpdate(updates);
    if (onDraftUpdate) {
      onDraftUpdate(updates);
    }
  };

  const handleRecurrenceChange = (value: Todo['recurrence']) => {
    setEditingTodo(prev => {
      if (!prev) return prev;

      const shouldAutofillDueDate = value && value !== 'once' && !prev.dueDate;
      return {
        ...prev,
        recurrence: value,
        dueDate: shouldAutofillDueDate ? new Date().toISOString().slice(0, 10) : prev.dueDate
      };
    });
  };

  const recurrenceOptions: Array<{ value: NonNullable<Todo['recurrence']>; label: string }> = [
    { value: 'once', label: 'Без повтора' },
    { value: 'daily', label: 'Ежедневно' },
    { value: 'weekly', label: 'Еженедельно' },
    { value: 'biweekly', label: 'Раз в две недели' },
    { value: 'monthly', label: 'Ежемесячно' },
    { value: 'quarterly', label: 'Ежеквартально' },
    { value: 'yearly', label: 'Ежегодно' }
  ];

  const recurrenceValue = (editingTodo?.recurrence || 'once') as NonNullable<Todo['recurrence']>;
  const recurrenceLabel = recurrenceOptions.find(option => option.value === recurrenceValue)?.label || 'Без повтора';

  const uploadAttachmentFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) return null;
    const data = await response.json();
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      name: data.filename || file.name,
      url: data.url,
      type: file.type.startsWith('image/') ? 'image' as const : 'file' as const,
      size: data.size || file.size,
      uploadedAt: new Date().toISOString(),
      mime: file.type || ''
    } as Attachment;
  };

  const setCaretFromPoint = (editor: HTMLDivElement, x: number, y: number) => {
    const selection = window.getSelection();
    if (!selection) return;

    const doc = document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    };

    let range: Range | null = null;

    if (doc.caretRangeFromPoint) {
      range = doc.caretRangeFromPoint(x, y);
    } else if (doc.caretPositionFromPoint) {
      const position = doc.caretPositionFromPoint(x, y);
      if (position) {
        range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
      }
    }

    if (range && editor.contains(range.commonAncestorContainer)) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const insertAttachmentIntoEditor = (
    editor: HTMLDivElement | null,
    attachment: Attachment & { mime?: string },
    field: 'description' | 'assigneeResponse'
  ) => {
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (!selection) return;

    let range: Range;
    if (selection.rangeCount > 0 && editor.contains(selection.getRangeAt(0).commonAncestorContainer)) {
      range = selection.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'my-2';

    const isImage = attachment.type === 'image' || (attachment.mime || '').startsWith('image/');
    if (isImage) {
      const img = document.createElement('img');
      img.src = attachment.url;
      img.alt = attachment.name || 'image';
      img.className = 'max-w-full h-auto rounded-xl border border-white/15';
      img.loading = 'lazy';
      wrapper.appendChild(img);
    } else {
      const link = document.createElement('a');
      link.href = attachment.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 underline break-all';
      link.textContent = attachment.name || attachment.url || 'Вложение';
      wrapper.appendChild(link);
    }

    const spacer = document.createElement('div');
    spacer.appendChild(document.createElement('br'));

    range.deleteContents();
    range.insertNode(spacer);
    range.insertNode(wrapper);

    range.setStartAfter(spacer);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    const html = editor.innerHTML || '';
    if (stagesEnabled) {
      updateStageMeta(activeTechSpecTab, { [field]: html });
    } else if (field === 'description') {
      handleUpdate({ description: html });
    } else {
      handleUpdate({ assigneeResponse: html });
    }
  };
  
  // Обработчик сохранения
  const updateTodo = (updatedTodo: Todo) => {
    onUpdate(updatedTodo);
    // Обновляем исходное состояние после сохранения
    initialTodoRef.current = JSON.parse(JSON.stringify(updatedTodo));
    // Не закрываем модалку после сохранения
  };
  
  // Проверка наличия несохраненных изменений
  const hasUnsavedChanges = (): boolean => {
    if (!editingTodo || !initialTodoRef.current) return false;
    
    // Сравниваем ключевые поля
    const current = JSON.stringify({
      title: editingTodo.title,
      description: editingTodo.description,
      status: editingTodo.status,
      listId: editingTodo.listId,
      categoryId: editingTodo.categoryId,
      assigneeId: editingTodo.assigneeId,
      assigneeName: editingTodo.assigneeName,
      customerId: editingTodo.customerId,
      customerName: editingTodo.customerName,
      dueDate: editingTodo.dueDate,
      tags: editingTodo.tags,
      priority: editingTodo.priority,
      archived: editingTodo.archived,
      stageMeta: editingTodo.stageMeta,
      checklist: editingTodo.checklist
    });
    
    const initial = JSON.stringify({
      title: initialTodoRef.current.title,
      description: initialTodoRef.current.description,
      status: initialTodoRef.current.status,
      listId: initialTodoRef.current.listId,
      categoryId: initialTodoRef.current.categoryId,
      assigneeId: initialTodoRef.current.assigneeId,
      assigneeName: initialTodoRef.current.assigneeName,
      customerId: initialTodoRef.current.customerId,
      customerName: initialTodoRef.current.customerName,
      dueDate: initialTodoRef.current.dueDate,
      tags: initialTodoRef.current.tags,
      priority: initialTodoRef.current.priority,
      archived: initialTodoRef.current.archived,
      stageMeta: initialTodoRef.current.stageMeta,
      checklist: initialTodoRef.current.checklist
    });
    
    return current !== initial;
  };
  
  const closeTodoModal = () => {
    if (hasUnsavedChanges()) {
      if (!confirm('У вас есть несохраненные изменения. Закрыть без сохранения?')) {
        return;
      }
    }
    onClose();
  };
  
  const toggleTodo = (todo: Todo) => {
    onToggle(todo);
  };
  
  // Автоматическое сворачивание обсуждения на мобильных устройствах
  useEffect(() => {
    if (!discussionEnabled) return;
    
    const handleResize = () => {
      const isMobile = window.innerWidth < 768; // md breakpoint
      if (isMobile && !isDiscussionCollapsed) {
        setIsDiscussionCollapsed(true);
      } else if (!isMobile && isDiscussionCollapsed) {
        setIsDiscussionCollapsed(false);
      }
    };
    
    // Проверяем при монтировании
    handleResize();
    
    // Слушаем изменения размера окна
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDiscussionCollapsed, discussionEnabled]);
  
  if (!isOpen || !editingTodo) return null;

  const versionHistory: TaskVersionEntry[] = Array.isArray(editingTodo.versionHistory)
    ? editingTodo.versionHistory
    : Array.isArray((editingTodo.metadata as Record<string, unknown> | undefined)?.versionHistory)
      ? ((editingTodo.metadata as Record<string, unknown>).versionHistory as TaskVersionEntry[])
      : [];

  const accessTargetOptions: Array<{ id: 'link' | 'chat' | 'department' | 'user'; label: string }> = [
    { id: 'link', label: 'Ссылка' },
    { id: 'chat', label: 'Чат' },
    { id: 'department', label: 'Отдел' },
    { id: 'user', label: 'Контакт' }
  ];

  const permissionLabel = permission === 'editor' ? 'Редактор' : 'Читатель';
  const shareTargetLabel = accessTargetOptions.find(option => option.id === shareTarget)?.label || 'Ссылка';
  
    return (
        <div className="fixed inset-0 bg-transparent flex items-start justify-center z-[100]">
          <div className="bg-white dark:bg-[var(--bg-secondary)] w-full h-screen flex flex-col overflow-hidden select-none relative">
            {/* Шапка */}
            <div className="flex items-center justify-between px-3 sm:px-4 border-b border-gray-200 dark:border-white/20 bg-white/85 dark:bg-[var(--bg-glass)]/85 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_18px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_rgba(0,0,0,0.22)] flex-shrink-0" style={{ minHeight: '40px', maxHeight: '40px' }}>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => {
                    const newCompleted = !editingTodo.completed;
                    setEditingTodo({ ...editingTodo, completed: newCompleted });
                    toggleTodo(editingTodo);
                  }}
                  className={`h-[30px] px-2 md:px-3 rounded-[20px] inline-flex items-center justify-center gap-1.5 md:gap-2 text-[12px] leading-none font-normal transition-all whitespace-nowrap shrink-0 ${
                    editingTodo.completed
                      ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-white border border-green-300 dark:border-green-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_2px_8px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                      : 'bg-gradient-to-b from-gray-100 to-gray-50 dark:from-white/10 dark:to-white/5 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white hover:from-gray-200 hover:to-gray-100 dark:hover:from-white/15 dark:hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span className="hidden md:inline">{editingTodo.completed ? 'Выполнено' : 'Выполнить'}</span>
                </button>

                <button
                  onClick={() => setLeftPanelOpen(prev => !prev)}
                  className={`h-[30px] px-2 md:px-3 rounded-[20px] inline-flex items-center justify-center gap-1.5 md:gap-2 text-[12px] leading-none font-normal transition-all whitespace-nowrap shrink-0 ${
                    leftPanelOpen
                      ? 'bg-blue-100 text-blue-800 dark:bg-[#007aff]/25 dark:text-white border border-blue-300 dark:border-[#007aff]/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_2px_8px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                      : 'bg-gradient-to-b from-gray-100 to-gray-50 dark:from-white/10 dark:to-white/5 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white hover:from-gray-200 hover:to-gray-100 dark:hover:from-white/15 dark:hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
                  }`}
                >
                  <Menu className="w-4 h-4" />
                  <span className="hidden md:inline">Меню</span>
                </button>

                <button
                  onClick={() => setRightPanelOpen(prev => !prev)}
                  className={`h-[30px] px-2 md:px-3 rounded-[20px] inline-flex items-center justify-center gap-1.5 md:gap-2 text-[12px] leading-none font-normal transition-all whitespace-nowrap shrink-0 relative ${
                    rightPanelOpen
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-white border border-purple-300 dark:border-purple-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_2px_8px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                      : 'bg-gradient-to-b from-gray-100 to-gray-50 dark:from-white/10 dark:to-white/5 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white hover:from-gray-200 hover:to-gray-100 dark:hover:from-white/15 dark:hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden md:inline">Обсуждение</span>
                  {hasDiscussionStarted && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[var(--bg-secondary)]" />
                  )}
                </button>

                <button
                  onClick={() => {
                    const nextStagesEnabled = !stagesEnabled;
                    handleUpdate({ stagesEnabled: nextStagesEnabled });
                    if (nextStagesEnabled) {
                      setLeftPanelOpen(true);
                      setSidebarMode('stages');
                    } else if (sidebarMode === 'stages') {
                      setSidebarMode('settings');
                    }
                  }}
                  className={`h-[30px] px-2 md:px-3 rounded-[20px] inline-flex items-center justify-center gap-1.5 md:gap-2 text-[12px] leading-none font-normal transition-all whitespace-nowrap shrink-0 ${
                    stagesEnabled
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-white border border-indigo-300 dark:border-indigo-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_2px_8px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                      : 'bg-gradient-to-b from-gray-100 to-gray-50 dark:from-white/10 dark:to-white/5 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white hover:from-gray-200 hover:to-gray-100 dark:hover:from-white/15 dark:hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  <span className="hidden md:inline">Этапы</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden md:inline text-[11px] text-[var(--text-muted)]">
                  Создано {new Date(editingTodo.createdAt).toLocaleDateString('ru-RU')}
                </span>
                <button
                  onClick={closeTodoModal}
                  className="w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all flex-shrink-0 bg-gradient-to-b from-gray-100 to-gray-50 dark:from-white/10 dark:to-white/5 border border-gray-300 dark:border-white/20 text-[var(--text-primary)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)] hover:from-gray-200 hover:to-gray-100 dark:hover:from-white/15 dark:hover:to-white/8"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            {/* Warning: Задача не относится к пользователю */}
            {(() => {
              // Получаем данные текущего пользователя из localStorage
              const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
              const userId = myAccountId;
              
              // Проверяем связан ли пользователь с задачей
              const isAuthor = (editingTodo as any).authorId === userId;
              const isAssignedBy = editingTodo.assignedById === userId;
              const isAssignedTo = editingTodo.assignedToIds?.includes(userId) || 
                                   editingTodo.assignedToId === userId;
              const isRelated = isAuthor || isAssignedBy || isAssignedTo;
              const isAdmin = userRole === 'admin';
              
              // Показываем предупреждение если пользователь не связан с задачей и не админ
              if (!isRelated && !isAdmin) {
                return (
                  <div className="bg-amber-500/10 border-l-4 border-amber-500 px-4 py-3 mx-3 mt-3 rounded-r-md">
                    <div className="flex items-start gap-3">
                      <div className="text-amber-500 flex-shrink-0 mt-0.5">
                        ⚠️
                      </div>
                      <div className="text-sm text-amber-200">
                        <p className="font-medium mb-1">Внимание!</p>
                        <p className="text-amber-300/90">
                          Вы не являетесь автором, заказчиком или исполнителем этой задачи. 
                          При передаче задачи другому пользователю она исчезнет из вашего списка.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            {leftPanelOpen && (
              <div
                className="md:hidden fixed inset-0 top-[40px] bottom-[40px] z-[110] bg-black/40"
                onClick={() => setLeftPanelOpen(false)}
              />
            )}

            {rightPanelOpen && (
              <div
                className="md:hidden fixed inset-0 top-[40px] bottom-[40px] z-[110] bg-black/40"
                onClick={() => setRightPanelOpen(false)}
              />
            )}

            {/* Трехзонный layout */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <div className={`${leftPanelOpen ? 'fixed top-[40px] bottom-[40px] left-0 z-[120] w-[78%] max-w-[300px] block shadow-2xl' : 'hidden'} border-r border-[var(--border-color)] bg-[var(--bg-secondary)]`}>
                <div className="h-full overflow-y-auto px-2 sm:px-3 py-2">
                  {leftPanelOpen && (
                  <div>
                  <div className="md:hidden text-[10px] text-[var(--text-muted)] px-1 pb-1.5">
                    Создано {new Date(editingTodo.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                  <div className={`grid ${stagesEnabled ? 'grid-cols-3' : 'grid-cols-2'} gap-1 p-1 rounded-[18px] bg-gray-100 dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-white/10 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]`}>
                    <button onClick={() => setSidebarMode('settings')} className={`px-2 py-1.5 text-[10px] rounded-[12px] border transition-all ${sidebarMode === 'settings' ? 'bg-white dark:bg-[var(--bg-secondary)] text-gray-900 dark:text-white border-gray-300 dark:border-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.28)]' : 'text-gray-600 dark:text-white/75 border-transparent hover:bg-gray-200 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/15'}`}>Настройки</button>
                    {stagesEnabled && (
                      <button onClick={() => setSidebarMode('stages')} className={`px-2 py-1.5 text-[10px] rounded-[12px] border transition-all ${sidebarMode === 'stages' ? 'bg-white dark:bg-[var(--bg-secondary)] text-gray-900 dark:text-white border-gray-300 dark:border-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.28)]' : 'text-gray-600 dark:text-white/75 border-transparent hover:bg-gray-200 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/15'}`}>Этапы</button>
                    )}
                    <button onClick={() => setSidebarMode('access')} className={`px-2 py-1.5 text-[10px] rounded-[12px] border transition-all ${sidebarMode === 'access' ? 'bg-white dark:bg-[var(--bg-secondary)] text-gray-900 dark:text-white border-gray-300 dark:border-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.28)]' : 'text-gray-600 dark:text-white/75 border-transparent hover:bg-gray-200 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/15'}`}>Доступ</button>
                  </div>

                  {sidebarMode === 'settings' && (
                    <div className="mt-2 space-y-2">
                      {!stagesEnabled && (
                        <FormField label="Статус задачи">
                          <StatusButtonGroup
                            value={(editingTodo.status === 'todo' ? 'pending' : editingTodo.status) || 'pending'}
                            options={normalizedStatusOptions}
                            onChange={(status) => handleUpdate({ status: status as Todo['status'] })}
                          />
                          {editingTodo.status === 'review' && (
                            <div className="mt-2">
                              <TextArea
                                value={editingTodo.reviewComment}
                                onChange={(reviewComment) => handleUpdate({ reviewComment })}
                                placeholder="Комментарий или замечания..."
                                rows={2}
                              />
                            </div>
                          )}
                        </FormField>
                      )}

                      <FormField label="От кого">
                        <PersonSelector
                          selectedId={editingTodo.assignedById}
                          selectedName={resolvePersonName(editingTodo.assignedById, editingTodo.assignedBy)}
                          people={stripRole(people.filter(p => p.role === 'customer' || p.role === 'universal'))}
                          placeholder="Не выбран"
                          onChange={(id, name) => handleUpdate({ assignedById: id, assignedBy: name })}
                        />
                      </FormField>
                      <FormField label="Делегировано">
                        <PersonSelector
                          selectedId={editingTodo.delegatedById}
                          selectedName={resolvePersonName(editingTodo.delegatedById, editingTodo.delegatedBy)}
                          people={stripRole(people.filter(p => p.role === 'customer' || p.role === 'universal'))}
                          placeholder="Не выбран"
                          onChange={(id, name) => handleUpdate({ delegatedById: id, delegatedBy: name })}
                        />
                      </FormField>

                      {!stagesEnabled ? (
                        <FormField label="Исполнители">
                          <MultiPersonSelector
                            selectedIds={editingTodo.assignedToIds || (editingTodo.assignedToId ? [editingTodo.assignedToId] : [])}
                            selectedNames={editingTodo.assignedToNames || (editingTodo.assignedTo ? [editingTodo.assignedTo] : [])}
                            people={stripRole(people.filter(p => p.role === 'executor' || p.role === 'universal'))}
                            placeholder="Выберите исполнителей"
                            onChange={(ids, names) => handleUpdateAndSync({
                              assignedToIds: ids.length > 0 ? ids : undefined,
                              assignedToNames: names.length > 0 ? names : undefined,
                              assignedToId: ids[0] || undefined,
                              assignedTo: names[0] || ''
                            })}
                          />
                        </FormField>
                      ) : (
                        <FormField label="Исполнитель по умолчанию">
                          <PersonSelector
                            selectedId={editingTodo.stageDefaultAssigneeId}
                            selectedName={resolvePersonName(editingTodo.stageDefaultAssigneeId, editingTodo.stageDefaultAssigneeName)}
                            people={stripRole(people.filter(p => p.role === 'executor' || p.role === 'universal'))}
                            placeholder="Не выбран"
                            onChange={(id, name) => handleUpdate({ stageDefaultAssigneeId: id, stageDefaultAssigneeName: name })}
                          />
                        </FormField>
                      )}

                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide select-none">Приоритет</label>
                          <div className="flex gap-1.5">
                            {(['low', 'medium', 'high'] as const).map((p) => (
                              <button
                                key={p}
                                onClick={() => handleUpdate({ priority: p })}
                                className={`flex-shrink-0 w-6 h-6 rounded-full transition-all flex items-center justify-center ${
                                  editingTodo.priority === p
                                    ? p === 'high'
                                      ? 'bg-red-500/20 ring-1 ring-red-500'
                                      : p === 'medium'
                                        ? 'bg-yellow-500/20 ring-1 ring-yellow-500'
                                        : 'bg-green-500/20 ring-1 ring-green-500'
                                    : 'hover:bg-[var(--bg-glass)]'
                                }`}
                              >
                                <span className={`w-3 h-3 rounded-full ${p === 'high' ? 'bg-red-500' : p === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <FormField label="Срок">
                          <DateTimePicker
                            value={editingTodo.dueDate}
                            onChange={(dueDate) => handleUpdate({ dueDate })}
                            placeholder="Выберите срок"
                          />
                        </FormField>
                      </div>

                      <FormField label="Повтор">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenDropdown(openDropdown === 'recurrence' ? null : 'recurrence')}
                            className="no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-sm text-left flex items-center justify-between hover:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm overflow-hidden will-change-transform rounded-[20px]"
                          >
                            <span className="truncate">{recurrenceLabel}</span>
                            <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${openDropdown === 'recurrence' ? 'rotate-180' : ''}`} />
                          </button>

                          {openDropdown === 'recurrence' && (
                            <div className="absolute top-full left-0 right-0 mt-1 p-1 rounded-2xl bg-[var(--bg-secondary)]/95 border border-white/15 backdrop-blur-xl shadow-2xl z-[140]">
                              {recurrenceOptions.map((option) => {
                                const isActive = recurrenceValue === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      handleRecurrenceChange(option.value);
                                      setOpenDropdown(null);
                                    }}
                                    className={`w-full px-3 py-2 text-sm text-left rounded-xl transition-colors ${
                                      isActive
                                        ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40'
                                        : 'text-[var(--text-secondary)] hover:bg-white/[0.08] border border-transparent'
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

                      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 p-2">
                        <button
                          type="button"
                          onClick={() => setIsVersionHistoryOpen(prev => !prev)}
                          className="w-full flex items-center justify-between text-[10px] uppercase tracking-wide text-[var(--text-muted)]"
                        >
                          <span>История версий</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isVersionHistoryOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isVersionHistoryOpen && (
                          <div className="mt-2">
                            {versionHistory.length === 0 ? (
                              <div className="text-[11px] text-[var(--text-muted)]">Пока нет сохранённых версий</div>
                            ) : (
                              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                                {versionHistory.slice(0, 10).map((version) => (
                                  <div key={version.id} className="rounded-lg border border-white/10 px-2 py-1.5">
                                    <div className="text-[10px] text-[var(--text-secondary)]">
                                      {new Date(version.createdAt).toLocaleString('ru-RU')}
                                    </div>
                                    <div className="text-[10px] text-[var(--text-muted)] truncate">
                                      {version.createdByName || 'Пользователь'}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const snap = version.snapshot || {};
                                        setEditingTodo(prev => {
                                          if (!prev) return prev;
                                          const merged: Todo = {
                                            ...prev,
                                            title: snap.title ?? prev.title,
                                            description: snap.description ?? prev.description,
                                            assigneeResponse: snap.assigneeResponse ?? prev.assigneeResponse,
                                            stageMeta: snap.stageMeta ?? prev.stageMeta,
                                            technicalSpecTabs: snap.technicalSpecTabs ?? prev.technicalSpecTabs,
                                            stagesEnabled: snap.stagesEnabled ?? prev.stagesEnabled,
                                            priority: snap.priority ?? prev.priority,
                                            status: snap.status ?? prev.status,
                                            dueDate: snap.dueDate ?? prev.dueDate,
                                            recurrence: snap.recurrence ?? prev.recurrence
                                          };
                                          return merged;
                                        });

                                        if (descriptionEditorRef.current && snap.description !== undefined) {
                                          descriptionEditorRef.current.innerHTML = snap.description;
                                        }
                                        if (assigneeResponseEditorRef.current && snap.assigneeResponse !== undefined) {
                                          assigneeResponseEditorRef.current.innerHTML = snap.assigneeResponse;
                                        }
                                      }}
                                      className="mt-1 text-[10px] text-blue-400 hover:text-blue-300"
                                    >
                                      Восстановить
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {sidebarMode === 'stages' && (
                    <div className="mt-2 space-y-2 rounded-2xl p-2.5 bg-white dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-white/10 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_14px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.25)]">
                      <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] px-1">Этапы задачи</div>
                      {getTechSpecTabs().map((tab: { id: string, label: string }) => {
                        const isActive = activeTechSpecTab === tab.id;
                        return (
                          <div
                            key={tab.id}
                            onClick={() => {
                              if (renamingTabId !== tab.id) {
                                setActiveTechSpecTab(tab.id);
                              }
                            }}
                            onDoubleClick={() => startRenameTechSpecTab(tab.id, tab.label)}
                            className={`w-full text-left px-3 py-2 text-xs rounded-xl border transition-all backdrop-blur-sm cursor-pointer ${
                              isActive
                                ? 'bg-blue-100 text-blue-800 border-blue-300 shadow-[0_0_0_1px_rgba(59,130,246,0.15),inset_0_1px_0_rgba(255,255,255,0.4)] dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/40 dark:shadow-[0_0_0_1px_rgba(59,130,246,0.25),0_2px_8px_rgba(59,130,246,0.2)]'
                                : 'text-gray-700 dark:text-white/80 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20'
                            }`}
                            title="Двойной клик для переименования"
                          >
                            {renamingTabId === tab.id ? (
                              <input
                                type="text"
                                autoFocus
                                value={renamingTabValue}
                                onChange={(e) => setRenamingTabValue(e.target.value)}
                                onBlur={() => commitRenameTechSpecTab(tab.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitRenameTechSpecTab(tab.id);
                                  }
                                  if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setRenamingTabId(null);
                                    setRenamingTabValue('');
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-2 py-1 rounded-lg border border-blue-300 dark:border-blue-400/40 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-[var(--text-primary)] focus:outline-none"
                              />
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <span className="block truncate">{tab.label}</span>
                                {renderStageStatus(tab.id)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={addTechSpecTab}
                        className="w-full px-3 py-2 text-xs text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-400/40 rounded-xl bg-blue-100 dark:bg-blue-500/16 hover:bg-blue-200 dark:hover:bg-blue-500/24 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
                      >
                        Добавить этап
                      </button>
                    </div>
                  )}
                  {sidebarMode === 'access' && (
                    <div className="mt-2 space-y-2 rounded-2xl p-2.5 bg-white dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-white/10 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_14px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.25)]">
                      <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] px-1">Доступ к задаче</div>
                      <FormField label="Уровень доступа">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenDropdown(openDropdown === 'access-permission' ? null : 'access-permission')}
                            className="no-mobile-scale w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/10 hover:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.35)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.12)] backdrop-blur-sm overflow-hidden will-change-transform rounded-[20px]"
                          >
                            <span className="truncate">{permissionLabel}</span>
                            <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${openDropdown === 'access-permission' ? 'rotate-180' : ''}`} />
                          </button>

                          {openDropdown === 'access-permission' && (
                            <div className="absolute top-full left-0 right-0 mt-1 p-1 rounded-2xl bg-[var(--bg-secondary)]/95 border border-white/15 backdrop-blur-xl shadow-2xl z-[140]">
                              {[
                                { value: 'viewer', label: 'Читатель' },
                                { value: 'editor', label: 'Редактор' }
                              ].map((option) => {
                                const isActive = permission === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      setPermission(option.value as 'viewer' | 'editor');
                                      setOpenDropdown(null);
                                    }}
                                    className={`w-full px-3 py-2 text-sm text-left rounded-xl transition-colors ${
                                      isActive
                                        ? 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/40'
                                        : 'text-gray-700 dark:text-[var(--text-secondary)] hover:bg-gray-100 dark:hover:bg-white/[0.08] border border-transparent'
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
                            onClick={() => setOpenDropdown(openDropdown === 'access-target' ? null : 'access-target')}
                            className="no-mobile-scale w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/10 hover:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.35)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.12)] backdrop-blur-sm overflow-hidden will-change-transform rounded-[20px]"
                          >
                            <span className="truncate">{shareTargetLabel}</span>
                            <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${openDropdown === 'access-target' ? 'rotate-180' : ''}`} />
                          </button>

                          {openDropdown === 'access-target' && (
                            <div className="absolute top-full left-0 right-0 mt-1 p-1 rounded-2xl bg-[var(--bg-secondary)]/95 border border-white/15 backdrop-blur-xl shadow-2xl z-[140]">
                              {accessTargetOptions.map((option) => {
                                const isActive = shareTarget === option.id;
                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => {
                                      setShareTarget(option.id);
                                      setOpenDropdown(null);
                                    }}
                                    className={`w-full px-3 py-2 text-sm text-left rounded-xl transition-colors ${
                                      isActive
                                        ? 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/40'
                                        : 'text-gray-700 dark:text-[var(--text-secondary)] hover:bg-gray-100 dark:hover:bg-white/[0.08] border border-transparent'
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

                      {shareTarget === 'chat' && (
                        <FormField label="Чат">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                if (accessChats.length === 0) {
                                  void loadAccessChats();
                                }
                                setOpenDropdown(openDropdown === 'access-chat' ? null : 'access-chat');
                              }}
                              className="no-mobile-scale w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/10 hover:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.35)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.12)] backdrop-blur-sm overflow-hidden will-change-transform rounded-[20px]"
                            >
                              <span className="truncate">{selectedChatName || 'Выберите чат'}</span>
                              <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${openDropdown === 'access-chat' ? 'rotate-180' : ''}`} />
                            </button>

                            {openDropdown === 'access-chat' && (
                              <div className="absolute top-full left-0 right-0 mt-1 p-1 rounded-2xl bg-[var(--bg-secondary)]/95 border border-white/15 backdrop-blur-xl shadow-2xl z-[140]">
                                <div className="px-1 pb-1">
                                  <input
                                    type="text"
                                    value={accessChatSearch}
                                    onChange={(e) => setAccessChatSearch(e.target.value)}
                                    placeholder="Поиск чата..."
                                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-[var(--text-primary)] placeholder:text-gray-400 dark:placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500/40"
                                  />
                                </div>

                                {isLoadingChats ? (
                                  <div className="px-3 py-2 text-xs text-[var(--text-muted)]">Загрузка...</div>
                                ) : filteredAccessChats.length > 0 ? (
                                  filteredAccessChats.map((chat) => {
                                    const label = getChatLabel(chat);
                                    const isActive = chatId === chat.id;
                                    return (
                                      <button
                                        key={chat.id}
                                        type="button"
                                        onClick={() => {
                                          setChatId(chat.id);
                                          setOpenDropdown(null);
                                        }}
                                        className={`w-full px-3 py-2 text-sm text-left rounded-xl transition-colors ${
                                          isActive
                                            ? 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/40'
                                            : 'text-gray-700 dark:text-[var(--text-secondary)] hover:bg-gray-100 dark:hover:bg-white/[0.08] border border-transparent'
                                        }`}
                                      >
                                        {label}
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="px-3 py-2 text-xs text-[var(--text-muted)]">Чаты не найдены</div>
                                )}
                              </div>
                            )}
                          </div>
                        </FormField>
                      )}

                      {shareTarget === 'department' && (
                        <FormField label="Отдел">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenDropdown(openDropdown === 'access-department' ? null : 'access-department')}
                              className="no-mobile-scale w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/10 hover:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.35)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.12)] backdrop-blur-sm overflow-hidden will-change-transform rounded-[20px]"
                            >
                              <span className="truncate">{department || 'Выберите отдел'}</span>
                              <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${openDropdown === 'access-department' ? 'rotate-180' : ''}`} />
                            </button>

                            {openDropdown === 'access-department' && (
                              <div className="absolute top-full left-0 right-0 mt-1 p-1 rounded-2xl bg-[var(--bg-secondary)]/95 border border-white/15 backdrop-blur-xl shadow-2xl z-[140]">
                                <div className="px-1 pb-1">
                                  <input
                                    type="text"
                                    value={departmentSearch}
                                    onChange={(e) => setDepartmentSearch(e.target.value)}
                                    placeholder="Поиск отдела..."
                                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-[var(--text-primary)] placeholder:text-gray-400 dark:placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500/40"
                                  />
                                </div>

                                {filteredDepartments.length > 0 ? (
                                  filteredDepartments.map((dept) => {
                                    const isActive = department === dept;
                                    return (
                                      <button
                                        key={dept}
                                        type="button"
                                        onClick={() => {
                                          setDepartment(dept);
                                          setOpenDropdown(null);
                                        }}
                                        className={`w-full px-3 py-2 text-sm text-left rounded-xl transition-colors ${
                                          isActive
                                            ? 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/40'
                                            : 'text-gray-700 dark:text-[var(--text-secondary)] hover:bg-gray-100 dark:hover:bg-white/[0.08] border border-transparent'
                                        }`}
                                      >
                                        {dept}
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="px-3 py-2 text-xs text-[var(--text-muted)]">Отделы не найдены</div>
                                )}
                              </div>
                            )}
                          </div>
                        </FormField>
                      )}

                      {shareTarget === 'user' && (
                        <FormField label="Контакт">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenDropdown(openDropdown === 'access-user' ? null : 'access-user')}
                              className="no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-sm text-left flex items-center justify-between hover:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm overflow-hidden will-change-transform rounded-[20px]"
                            >
                              <span className="truncate">{selectedShareUserName || 'Выберите контакт'}</span>
                              <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${openDropdown === 'access-user' ? 'rotate-180' : ''}`} />
                            </button>

                            {openDropdown === 'access-user' && (
                              <div className="absolute top-full left-0 right-0 mt-1 p-1 rounded-2xl bg-[var(--bg-secondary)]/95 border border-white/15 backdrop-blur-xl shadow-2xl z-[140]">
                                <div className="px-1 pb-1">
                                  <input
                                    type="text"
                                    value={accessUserSearch}
                                    onChange={(e) => setAccessUserSearch(e.target.value)}
                                    placeholder="Поиск контакта..."
                                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-white/10 bg-white/5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500/40"
                                  />
                                </div>

                                {filteredAccessContacts.length > 0 ? (
                                  filteredAccessContacts.map((contact) => {
                                    const isActive = userId === contact.id;
                                    return (
                                      <button
                                        key={contact.id}
                                        type="button"
                                        onClick={() => {
                                          setUserId(contact.id);
                                          setOpenDropdown(null);
                                        }}
                                        className={`w-full px-3 py-2 text-sm text-left rounded-xl transition-colors ${
                                          isActive
                                            ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40'
                                            : 'text-[var(--text-secondary)] hover:bg-white/[0.08] border border-transparent'
                                        }`}
                                      >
                                        {contact.name}
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="px-3 py-2 text-xs text-[var(--text-muted)]">Контакты не найдены</div>
                                )}
                              </div>
                            )}
                          </div>
                        </FormField>
                      )}

                      <button
                        type="button"
                        onClick={() => createShareLink({ copyToken: shareTarget === 'link' })}
                        disabled={isLoading}
                        className="w-full px-3 py-2 rounded-xl text-xs text-white bg-blue-500/90 hover:bg-blue-500 disabled:opacity-60 border border-blue-400/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-colors"
                      >
                        {isLoading ? 'Сохранение...' : 'Создать доступ'}
                      </button>

                      {shareLinks.length > 0 && (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                          {shareLinks.map(link => (
                            <div key={link.id} className="p-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gradient-to-br dark:from-white/5 dark:to-white/10 text-[10px] text-gray-700 dark:text-[var(--text-secondary)]">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate">{getShareTargetInfo(link).label}</span>
                                <button
                                  type="button"
                                  onClick={() => deleteShareLink(link.id)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  удалить
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                  )}
                </div>
              </div>

              {/* Средний блок - Название и Описание */}
              <div className="flex-1 flex flex-col bg-white dark:bg-[var(--bg-secondary)] overflow-y-auto min-h-0">
                {/* Контейнер с ограниченной шириной по центру */}
                <div className="w-full md:max-w-[680px] mx-auto px-2 sm:px-4 md:px-5">
                {/* Название задачи */}
                <div className="px-2 sm:px-3 pt-2 sm:pt-3 pb-1.5 sm:pb-2">
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editingTodo.title || ''}
                    onChange={(e) => handleUpdate({ title: e.target.value })}
                    className="no-mobile-scale w-full px-2 sm:px-3 py-3 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-[20px] text-lg sm:text-xl font-semibold focus:outline-none focus:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-white/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]"
                    placeholder="Название задачи..."
                  />
                </div>
                
                {/* Заголовок с кнопками форматирования */}
                <div className="px-2 sm:px-3 py-1 sm:py-1.5">
                  {/* Панель форматирования - компактная */}
                  <div className="flex items-center justify-center sm:justify-start gap-0.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById(descriptionEditorId);
                        if (editor) {
                          document.execCommand('bold', false);
                          editor.focus();
                        }
                      }}
                      className="p-1.5 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Жирный (Ctrl+B)"
                    >
                      <svg className="w-5 h-5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById(descriptionEditorId);
                        if (editor) {
                          document.execCommand('italic', false);
                          editor.focus();
                        }
                      }}
                      className="p-1.5 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Курсив (Ctrl+I)"
                    >
                      <svg className="w-5 h-5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById(descriptionEditorId);
                        if (editor) {
                          document.execCommand('underline', false);
                          editor.focus();
                        }
                      }}
                      className="p-1.5 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Подчёркнутый (Ctrl+U)"
                    >
                      <svg className="w-5 h-5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById(descriptionEditorId);
                        if (editor) {
                          document.execCommand('strikeThrough', false);
                          editor.focus();
                        }
                      }}
                      className="p-1.5 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Зачёркнутый"
                    >
                      <svg className="w-5 h-5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/></svg>
                    </button>
                    <div className="w-px h-3 bg-gray-200 dark:bg-[var(--bg-glass-hover)] mx-0.5" />
                    <button
                      type="button"
                      onClick={() => {
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                          const range = selection.getRangeAt(0);
                          const selectedText = range.toString();
                          const editor = document.getElementById(descriptionEditorId);
                          if (editor && selectedText) {
                            const items = selectedText.split('\n').filter(s => s.trim());
                            const ul = `<ul class="list-disc ml-6 my-2">${items.map(item => `<li class="text-gray-900 dark:text-white">${item.trim()}</li>`).join('')}</ul>`;
                            range.deleteContents();
                            const template = document.createElement('template');
                            template.innerHTML = ul;
                            range.insertNode(template.content.firstChild!);
                            editor.focus();
                            if (editingTodo && descriptionEditorRef.current) {
                              setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                            }
                          }
                        }
                      }}
                      className="p-1.5 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Маркированный список"
                    >
                      <svg className="w-5 h-5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                          const range = selection.getRangeAt(0);
                          const selectedText = range.toString();
                          const editor = document.getElementById(descriptionEditorId);
                          if (editor && selectedText) {
                            const items = selectedText.split('\n').filter(s => s.trim());
                            const ol = `<ol class="list-decimal ml-6 my-2">${items.map(item => `<li class="text-gray-900 dark:text-white">${item.trim()}</li>`).join('')}</ol>`;
                            range.deleteContents();
                            const template = document.createElement('template');
                            template.innerHTML = ol;
                            range.insertNode(template.content.firstChild!);
                            editor.focus();
                            if (editingTodo && descriptionEditorRef.current) {
                              setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                            }
                          }
                        }
                      }}
                      className="p-1.5 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Нумерованный список"
                    >
                      <svg className="w-5 h-5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>
                    </button>
                    <div className="hidden sm:block w-px h-3 bg-gray-200 dark:bg-[var(--bg-glass-hover)] mx-0.5" />
                    {/* Кастомный dropdown для размера текста */}
                    <div className="relative hidden sm:block">
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === 'textSize' ? null : 'textSize')}
                        className="flex items-center gap-1 px-1.5 py-1 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors text-xs will-change-transform"
                        style={{ transform: 'translateZ(0)' }}
                      >
                        <svg className="w-5 h-5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z"/></svg>
                        <span className="hidden sm:inline text-[10px]">Размер</span>
                        <ChevronDown className="w-2 h-2" />
                      </button>
                      {openDropdown === 'textSize' && (
                        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-[var(--border-color)] rounded-lg shadow-xl z-50 min-w-[120px] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              const selection = window.getSelection();
                              if (selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                const selectedText = range.toString();
                                const editor = document.getElementById(descriptionEditorId);
                                if (editor && selectedText) {
                                  const h1 = `<h1 class="text-2xl font-bold my-2 text-gray-900 dark:text-white">${selectedText}</h1>`;
                                  range.deleteContents();
                                  const template = document.createElement('template');
                                  template.innerHTML = h1;
                                  range.insertNode(template.content.firstChild!);
                                  editor.focus();
                                  // Сохраняем изменения
                                  if (editingTodo && descriptionEditorRef.current) {
                                    setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                                  }
                                }
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
                              const selection = window.getSelection();
                              if (selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                const selectedText = range.toString();
                                const editor = document.getElementById(descriptionEditorId);
                                if (editor && selectedText) {
                                  const h2 = `<h2 class="text-xl font-semibold my-2 text-gray-900 dark:text-white">${selectedText}</h2>`;
                                  range.deleteContents();
                                  const template = document.createElement('template');
                                  template.innerHTML = h2;
                                  range.insertNode(template.content.firstChild!);
                                  editor.focus();
                                  // Сохраняем изменения
                                  if (editingTodo && descriptionEditorRef.current) {
                                    setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                                  }
                                }
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
                              const selection = window.getSelection();
                              if (selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                const selectedText = range.toString();
                                const editor = document.getElementById(descriptionEditorId);
                                if (editor && selectedText) {
                                  const h3 = `<h3 class="text-lg font-medium my-2 text-gray-900 dark:text-white">${selectedText}</h3>`;
                                  range.deleteContents();
                                  const template = document.createElement('template');
                                  template.innerHTML = h3;
                                  range.insertNode(template.content.firstChild!);
                                  editor.focus();
                                  // Сохраняем изменения
                                  if (editingTodo && descriptionEditorRef.current) {
                                    setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                                  }
                                }
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
                              const selection = window.getSelection();
                              if (selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                const selectedText = range.toString();
                                const editor = document.getElementById(descriptionEditorId);
                                if (editor && selectedText) {
                                  const span = `<span class="text-sm text-gray-900 dark:text-white">${selectedText}</span>`;
                                  range.deleteContents();
                                  const template = document.createElement('template');
                                  template.innerHTML = span;
                                  range.insertNode(template.content.firstChild!);
                                  editor.focus();
                                  if (editingTodo && descriptionEditorRef.current) {
                                    setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                                  }
                                }
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
                        const selection = window.getSelection();
                        const editor = document.getElementById(descriptionEditorId);
                        if (!selection || !editor) return;
                        
                        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
                        const selectedText = selection.toString();
                        
                        const url = prompt('Введите URL ссылки:', 'https://');
                        if (url && url.trim() && range) {
                          const linkText = selectedText || url;
                          const linkHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" contenteditable="false" class="text-blue-500 hover:text-blue-600 underline cursor-pointer">${linkText}</a>`;
                          
                          range.deleteContents();
                          const template = document.createElement('template');
                          template.innerHTML = linkHTML;
                          range.insertNode(template.content.firstChild!);
                          
                          editor.focus();
                          // Сохраняем изменения
                          if (editingTodo && descriptionEditorRef.current) {
                            setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                          }
                        }
                      }}
                      className="p-1.5 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Вставить ссылку"
                    >
                      <Link2 className="w-5 h-5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById(descriptionEditorId);
                        if (editor) {
                          // Вставляем чек-лист
                          const checkbox = '<div class="checklist-item flex items-center gap-2 my-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"><input type="checkbox" data-checklist="true" class="w-4 h-4 rounded border-2 border-gray-300 dark:border-white/30 cursor-pointer accent-blue-500" /><span contenteditable="true" class="flex-1 text-gray-900 dark:text-white outline-none">Пункт чек-листа</span></div>';
                          document.execCommand('insertHTML', false, checkbox);
                          editor.focus();
                        }
                      }}
                      className="hidden sm:block p-1.5 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Добавить чек-лист"
                    >
                      <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                          const range = selection.getRangeAt(0);
                          const selectedText = range.toString();
                          const editor = document.getElementById(descriptionEditorId);
                          if (editor && selectedText) {
                            // Заменяем выделенное на простой текст без форматирования
                            const plainText = document.createTextNode(selectedText);
                            range.deleteContents();
                            range.insertNode(plainText);
                            editor.focus();
                            // Сохраняем изменения
                            if (editingTodo && descriptionEditorRef.current) {
                              setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                            }
                          }
                        }
                      }}
                      className="p-1.5 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Очистить форматирование"
                    >
                      <X className="w-5 h-5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>

                {stagesEnabled && sidebarMode === 'stages' && (
                  <div key={activeTechSpecTab} className="px-2 sm:px-3 pb-2 sm:pb-3">
                    <div className="mb-2">
                      <FormField label="Статус этапа">
                        <StatusButtonGroup
                          value={(activeStageMeta.status === 'todo' ? 'pending' : activeStageMeta.status) || 'pending'}
                          options={normalizedStatusOptions}
                          onChange={(status) => updateStageMeta(activeTechSpecTab, { status: status as Todo['status'] })}
                        />
                      </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <PersonSelector
                          selectedId={editingTodo ? getEffectiveStageAssignee(editingTodo, activeTechSpecTab).id : undefined}
                          selectedName={editingTodo
                            ? resolvePersonName(
                                getEffectiveStageAssignee(editingTodo, activeTechSpecTab).id,
                                getEffectiveStageAssignee(editingTodo, activeTechSpecTab).name
                              )
                            : undefined}
                          people={stripRole(people.filter(p => p.role === 'executor' || p.role === 'universal'))}
                          placeholder={editingTodo?.stageDefaultAssigneeName ? `По умолчанию: ${editingTodo.stageDefaultAssigneeName}` : 'Не выбран'}
                          onChange={(id, name) => {
                            console.log('👤 PersonSelector onChange:', {
                              id,
                              name,
                              activeTechSpecTab,
                              currentStageId: activeTechSpecTab
                            });
                            updateStageMeta(activeTechSpecTab, { assigneeId: id, assigneeName: name });
                          }}
                        />
                      </div>
                      <div>
                        <DateTimePicker
                          value={activeStageMeta.dueDate}
                          onChange={(dueDate) => updateStageMeta(activeTechSpecTab, { dueDate })}
                          placeholder="Выберите срок"
                        />
                      </div>
                    </div>
                    {activeStageMeta.status === 'review' && (
                      <div className="mb-2">
                        <TextArea
                          value={activeStageMeta.reviewComment}
                          onChange={(reviewComment) => updateStageMeta(activeTechSpecTab, { reviewComment })}
                          placeholder="Комментарий или замечания..."
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                )}

                  <div className="flex-1 px-2 sm:px-3 pb-28 sm:pb-32 overflow-y-auto flex flex-col gap-2 min-h-[400px]">
                    <div className="flex-1 flex flex-col relative min-h-[150px]">

                    <div
                      ref={descriptionEditorRef}
                      id={descriptionEditorId}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => {
                        const html = (e.currentTarget as HTMLDivElement).innerHTML || '';
                        if (stagesEnabled) {
                          updateStageMeta(activeTechSpecTab, { description: html });
                        } else {
                          handleUpdate({ description: html });
                        }
                      }}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        
                        if (target.tagName === 'A' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          const link = target as HTMLAnchorElement;
                          if (link.href) {
                            window.open(link.href, '_blank', 'noopener,noreferrer');
                          }
                          return;
                        }
                        
                        if (target.tagName === 'INPUT' && target.getAttribute('data-checklist') === 'true') {
                          const checkbox = target as HTMLInputElement;
                          const parent = checkbox.parentElement;
                          if (parent) {
                            if (checkbox.checked) {
                              parent.style.opacity = '0.5';
                              parent.style.textDecoration = 'line-through';
                            } else {
                              parent.style.opacity = '1';
                              parent.style.textDecoration = 'none';
                            }
                            if (editingTodo && descriptionEditorRef.current && stagesEnabled) {
                              updateStageMeta(activeTechSpecTab, { description: descriptionEditorRef.current!.innerHTML });
                            }
                          }
                        }
                      }}
                      data-placeholder="Добавьте описание задачи..."
                      className="w-full flex-1 min-h-[150px] max-h-[220px] px-2 sm:px-3 py-2 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-[var(--text-primary)] focus:outline-none focus:border-blue-500/30 transition-all whitespace-pre-wrap break-words overflow-y-auto empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:dark:text-white/30 will-change-contents"
                      style={{ transform: 'translate Z(0)' }}
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
                        const editor = e.currentTarget;
                        editor.style.borderColor = '';
                        editor.style.backgroundColor = '';
                        setCaretFromPoint(editor, e.clientX, e.clientY);
                        
                        const files = e.dataTransfer.files;
                        if (files && files.length > 0) {
                          const droppedFiles = Array.from(files);
                          for (const file of droppedFiles) {
                            try {
                              const uploadedAttachment = await uploadAttachmentFile(file);
                              if (uploadedAttachment) {
                                insertAttachmentIntoEditor(editor, uploadedAttachment, 'description');
                              }
                            } catch (error) {
                              console.error('Error uploading dropped file:', error);
                            }
                          }
                        }
                      }}
                      onPaste={async (e) => {
                        const editor = e.currentTarget;
                        const items = e.clipboardData.items;
                        for (let i = 0; i < items.length; i++) {
                          const item = items[i];
                          if (item.kind === 'file') {
                            e.preventDefault();
                            const blob = item.getAsFile();
                            if (blob) {
                              try {
                                const fallbackName = blob.type.startsWith('image/') ? 'pasted-image.png' : 'pasted-file';
                                const pastedFile = new File([blob], fallbackName, { type: blob.type || 'application/octet-stream' });
                                const uploadedAttachment = await uploadAttachmentFile(pastedFile);
                                if (uploadedAttachment) {
                                  insertAttachmentIntoEditor(editor, uploadedAttachment, 'description');
                                }
                              } catch (error) {
                                console.error('Error uploading pasted file:', error);
                              }
                            }
                          }
                        }
                      }}
                    >
                    </div>
                  </div>

                  {/* Ответ исполнителя */}
                  <div className="flex-1 flex flex-col pt-2 sm:pt-3">
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1.5 uppercase tracking-wide select-none">
                      Ответ исполнителя
                    </label>
                    <div
                      ref={assigneeResponseEditorRef}
                      id="assignee-response-editor"
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => {
                        const html = (e.currentTarget as HTMLDivElement).innerHTML || '';
                        if (stagesEnabled) {
                          updateStageMeta(activeTechSpecTab, { assigneeResponse: html });
                        } else {
                          handleUpdate({ assigneeResponse: html });
                        }
                      }}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.tagName === 'A' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          const link = target as HTMLAnchorElement;
                          if (link.href) {
                            window.open(link.href, '_blank', 'noopener,noreferrer');
                          }
                        }
                      }}
                      data-placeholder="Ответ исполнителя на задачу..."
                      className="w-full flex-1 min-h-[150px] max-h-[220px] px-2 sm:px-3 py-2 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-[var(--text-primary)] focus:outline-none focus:border-blue-500/30 transition-all whitespace-pre-wrap break-words overflow-y-auto empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:dark:text-white/30 will-change-contents"
                      style={{ transform: 'translateZ(0)' }}
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
                        const editor = e.currentTarget;
                        editor.style.borderColor = '';
                        editor.style.backgroundColor = '';
                        setCaretFromPoint(editor, e.clientX, e.clientY);

                        const files = e.dataTransfer.files;
                        if (files && files.length > 0) {
                          const droppedFiles = Array.from(files);
                          for (const file of droppedFiles) {
                            try {
                              const uploadedAttachment = await uploadAttachmentFile(file);
                              if (uploadedAttachment) {
                                insertAttachmentIntoEditor(editor, uploadedAttachment, 'assigneeResponse');
                              }
                            } catch (error) {
                              console.error('Error uploading dropped file:', error);
                            }
                          }
                        }
                      }}
                      onPaste={async (e) => {
                        const editor = e.currentTarget;
                        const items = e.clipboardData.items;
                        for (let i = 0; i < items.length; i++) {
                          const item = items[i];
                          if (item.kind === 'file') {
                            e.preventDefault();
                            const blob = item.getAsFile();
                            if (blob) {
                              try {
                                const fallbackName = blob.type.startsWith('image/') ? 'pasted-image.png' : 'pasted-file';
                                const pastedFile = new File([blob], fallbackName, { type: blob.type || 'application/octet-stream' });
                                const uploadedAttachment = await uploadAttachmentFile(pastedFile);
                                if (uploadedAttachment) {
                                  insertAttachmentIntoEditor(editor, uploadedAttachment, 'assigneeResponse');
                                }
                              } catch (error) {
                                console.error('Error uploading pasted file:', error);
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                </div>
              </div>
              {/* Правый блок - Обсуждение */}
              <div className={`${rightPanelOpen ? 'fixed top-[40px] bottom-[40px] right-0 z-[120] w-[86%] max-w-[360px] flex shadow-2xl' : 'hidden'} flex-col bg-[var(--bg-secondary)] border-l border-[var(--border-color)] min-h-0`}>
                {rightPanelOpen ? (
                <>
                {/* Заголовок */}
                <div className="px-3 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between bg-gradient-to-br from-white/5 to-white/2 flex-shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-[var(--text-secondary)] select-none">
                      Обсуждение
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRightPanelOpen(false)}
                    className="h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)] border border-white/15 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/8 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                    Закрыть
                  </button>
                </div>

                <div ref={discussionListRef} className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
                  {discussionLoading ? (
                    <div className="text-xs text-[var(--text-muted)] px-2 py-2">Загрузка сообщений...</div>
                  ) : discussionMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] px-3 text-center">
                      <MessageCircle className="w-8 h-8 opacity-40 mb-2" />
                      <p className="text-xs">Обсуждение на месте</p>
                      <p className="text-[11px] opacity-70">Первое сообщение автоматически создаст чат задачи</p>
                    </div>
                  ) : (
                    discussionMessages.map((message) => {
                      const isOwn = message.authorId === myAccountId;
                      return (
                        <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div 
                            className={`max-w-[92%] ${bubbleRadius} px-2.5 py-1.5 md:px-3 md:py-2 ${
                              isOwn 
                                ? myBubbleTextClass
                                : 'bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]'
                            }`}
                            style={isOwn ? { backgroundColor: currentBubbleColor } : undefined}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className={`text-[10px] truncate ${isOwn ? myBubbleTextMutedClass : 'text-[var(--text-muted)]'}`}>
                                {message.authorName || 'Пользователь'}
                              </span>
                              <span className={`text-[10px] ${isOwn ? myBubbleTextMutedClass : 'text-[var(--text-muted)]'}`}>
                                {new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div 
                              className={`whitespace-pre-wrap break-words ${isOwn ? myBubbleTextClass : 'text-[var(--text-primary)]'}`}
                              style={fontSizeStyle}
                            >
                              {message.content}
                            </div>

                            {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {message.attachments.map((att, idx) => (
                                  <a
                                    key={`${message.id}-att-${idx}`}
                                    href={att.url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`block text-[10px] truncate ${
                                      isOwn 
                                        ? `${myBubbleTextMutedClass} hover:${useDarkTextOnBubble ? 'text-gray-900' : 'text-white'}` 
                                        : 'text-blue-400 hover:text-blue-300'
                                    }`}
                                  >
                                    {att.name || att.url || 'Вложение'}
                                  </a>
                                ))}
                              </div>
                            )}

                            {isOwn && (
                              <div className="mt-1.5 flex justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDiscussionInput(message.content || '');
                                    setEditingDiscussionMessageId(message.id);
                                  }}
                                  className={`p-1 rounded-md transition-colors ${
                                    isOwn 
                                      ? `${myBubbleTextMutedClass} hover:${myBubbleTextClass} hover:bg-white/15` 
                                      : 'text-[var(--text-muted)] hover:text-blue-300 hover:bg-white/10'
                                  }`}
                                  title="Редактировать"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`/api/messages/${message.id}`, { method: 'DELETE' });
                                      if (!res.ok) return;
                                      if (editingTodo?.chatId) {
                                        await loadDiscussionMessages(editingTodo.chatId);
                                      }
                                    } catch (error) {
                                      console.error('Error deleting message:', error);
                                    }
                                  }}
                                  className={`p-1 rounded-md transition-colors ${
                                    isOwn 
                                      ? `${myBubbleTextMutedClass} hover:text-red-100 hover:bg-red-400/30` 
                                      : 'text-[var(--text-muted)] hover:text-red-300 hover:bg-white/10'
                                  }`}
                                  title="Удалить"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-[var(--border-color)] p-2 space-y-2">
                  {discussionAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {discussionAttachments.map((att, idx) => (
                        <span key={`discussion-attachment-${idx}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-[var(--text-secondary)]">
                          <span className="truncate max-w-[120px]">{att.name || 'Файл'}</span>
                          <button
                            type="button"
                            onClick={() => setDiscussionAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="hover:text-red-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-end gap-1.5">
                    <input
                      ref={discussionFileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        await uploadDiscussionFiles(files);
                        e.target.value = '';
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => discussionFileInputRef.current?.click()}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-white/15 to-white/5 border border-white/20 flex items-center justify-center text-[var(--text-secondary)]"
                      title="Вложение"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <textarea
                      rows={1}
                      value={discussionInput}
                      onChange={(e) => setDiscussionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void sendDiscussionMessage();
                        }
                      }}
                      placeholder={editingDiscussionMessageId ? 'Редактирование сообщения...' : 'Напишите сообщение...'}
                      className="flex-1 h-[30px] min-h-[30px] max-h-[30px] resize-none overflow-hidden px-3 py-1.5 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500/40"
                    />

                    <button
                      type="button"
                      disabled={discussionSending}
                      onClick={() => void sendDiscussionMessage()}
                      className="w-8 h-8 rounded-full bg-blue-500/80 hover:bg-blue-500 disabled:opacity-60 text-white flex items-center justify-center"
                      title={editingDiscussionMessageId ? 'Сохранить' : 'Отправить'}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>

                  {editingDiscussionMessageId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDiscussionMessageId(null);
                        setDiscussionInput('');
                      }}
                      className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Отменить редактирование
                    </button>
                  )}
                </div>
                </>
                ) : (
                  <div className="h-full" />
                )}
              </div>

            </div>
            
            {/* Футер */}
            <div className="relative z-[130] w-full mt-auto pointer-events-none">
              <div className="pointer-events-auto w-full border-t border-gray-200 dark:border-white/20 bg-white/85 dark:bg-[var(--bg-glass)]/85 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_-6px_18px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_-8px_24px_rgba(0,0,0,0.22)]">
                <div className="mx-auto md:max-w-[680px] px-2.5 sm:px-3.5 py-1 flex items-center justify-center gap-1.5">
                <button
                  onClick={closeTodoModal}
                  className="w-[74px] h-[30px] text-[12px] font-medium leading-none text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-gradient-to-b from-gray-100 to-gray-50 dark:from-white/14 dark:to-white/6 hover:from-gray-200 hover:to-gray-100 dark:hover:from-white/18 dark:hover:to-white/8 border border-gray-300 dark:border-white/20 rounded-[21px] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
                >
                  Отмена
                </button>
                <button
                  onClick={async () => {
                    const updatedTodo = { ...editingTodo };
                    updatedTodo.title = (editingTodo.title || '').trim() || updatedTodo.title;
                    const nextDescription = descriptionEditorRef.current?.innerHTML || '';
                    const nextResponse = assigneeResponseEditorRef.current?.innerHTML || '';

                    if (stagesEnabled) {
                      const currentMeta = getStageMeta(updatedTodo, activeTechSpecTab);
                      const mergedStageMeta = getMergedStageMeta(updatedTodo);
                      updatedTodo.stageMeta = {
                        ...(mergedStageMeta || {}),
                        [activeTechSpecTab]: {
                          ...currentMeta,
                          description: nextDescription,
                          assigneeResponse: nextResponse
                        }
                      };
                      console.log('💾 Saving task with stageMeta:', {
                        activeTechSpecTab,
                        currentMeta,
                        fullStageMeta: updatedTodo.stageMeta
                      });
                      console.log('🔍 Full stageMeta being saved:', JSON.stringify(updatedTodo.stageMeta, null, 2));
                      console.log('🔍 currentMeta detail:', JSON.stringify(currentMeta, null, 2));
                    } else {
                      updatedTodo.description = nextDescription;
                      updatedTodo.assigneeResponse = nextResponse;
                    }

                    if ((updatedTodo.completed || updatedTodo.archived) && updatedTodo.chatId) {
                      try {
                        await fetch(`/api/chats/${updatedTodo.chatId}`, { method: 'DELETE' });
                      } catch (error) {
                        console.error('Error deleting task chat on complete/archive:', error);
                      }
                      updatedTodo.chatId = undefined;
                    }

                    const actorName = typeof window !== 'undefined'
                      ? (localStorage.getItem('username') || localStorage.getItem('userName') || undefined)
                      : undefined;
                    const existingHistory = Array.isArray(updatedTodo.versionHistory)
                      ? updatedTodo.versionHistory
                      : [];
                    const newVersion: TaskVersionEntry = {
                      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                      createdAt: new Date().toISOString(),
                      createdById: myAccountId || undefined,
                      createdByName: actorName,
                      snapshot: {
                        title: updatedTodo.title,
                        description: updatedTodo.description,
                        assigneeResponse: updatedTodo.assigneeResponse,
                        stageMeta: updatedTodo.stageMeta,
                        technicalSpecTabs: updatedTodo.technicalSpecTabs,
                        stagesEnabled: updatedTodo.stagesEnabled,
                        priority: updatedTodo.priority,
                        status: updatedTodo.status,
                        dueDate: updatedTodo.dueDate,
                        recurrence: updatedTodo.recurrence
                      }
                    };
                    updatedTodo.versionHistory = [newVersion, ...existingHistory].slice(0, 50);

                    updateTodo(updatedTodo);
                  }}
                  className="w-[85px] h-[30px] text-[12px] font-medium leading-none text-white bg-gradient-to-br from-blue-500/85 to-blue-600/75 hover:from-blue-500 hover:to-blue-600 border border-blue-300/35 rounded-[21px] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_14px_rgba(59,130,246,0.22)]"
                >
                  Сохранить
                </button>
                </div>
              </div>
            </div>
          </div>
        </div>
    
    

  );
});

export default Editingtodo;
