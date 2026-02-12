'use client';

import React, { memo, useRef, useState, useEffect, Dispatch, SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
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
  Shield
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
  
  // Локальное состояние для редактирования
  const [editingTodo, setEditingTodo] = useState<Todo | null>(todo);
  const [activeStageId, setActiveStageId] = useState<string>('details');
  const [sidebarMode, setSidebarMode] = useState<'settings' | 'stages' | 'access'>('settings');
  const [contentTab, setContentTab] = useState<'details'>('details');
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
  const [contactUsers, setContactUsers] = useState<ContactUser[]>([]);
  const [isDiscussionCollapsed, setIsDiscussionCollapsed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const chatDropdownRef = useRef<HTMLDivElement>(null);
  const departmentDropdownRef = useRef<HTMLDivElement>(null);
  
  const stagesEnabled = editingTodo?.stagesEnabled === true;
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
    return statusOptions.find(option => option.value === status);
  };

  const getStatusPillClasses = (color?: StatusOption['color']) => {
    switch (color) {
      case 'orange':
        return 'bg-orange-500/20 text-orange-500 ring-1 ring-orange-500/40';
      case 'blue':
        return 'bg-blue-500/20 text-blue-500 ring-1 ring-blue-500/40';
      case 'green':
        return 'bg-green-500/20 text-green-500 ring-1 ring-green-500/40';
      case 'red':
        return 'bg-red-500/20 text-red-500 ring-1 ring-red-500/40';
      case 'yellow':
        return 'bg-yellow-500/20 text-yellow-600 ring-1 ring-yellow-500/40';
      default:
        return 'bg-white/10 text-[var(--text-muted)] ring-1 ring-white/10';
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
    }
  }, [todo?.id]);

  // Восстанавливаем состояние при открытии новой задачи
  useEffect(() => {
    setActiveStageId('details');
    setSidebarMode(editingTodo?.stagesEnabled ? 'stages' : 'settings');
    setContentTab('details');
    const firstTab = getTechSpecTabs()[0]?.id || 'details';
    // Нормализуем ID: убираем подчёркивание
    const normalizedFirstTab = firstTab.replace(/^tab_/, 'tab');
    setActiveTechSpecTab(normalizedFirstTab);
    console.log('🎯 Set initial active tab:', normalizedFirstTab);
  }, [editingTodo?.id]);

  // Синхронизируем title при смене задачи
  useEffect(() => {
    if (editingTodo && titleInputRef.current) {
      titleInputRef.current.value = editingTodo.title || '';
    }
  }, [editingTodo?.id]);

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
      setEditingTodo({ ...editingTodo, addToCalendar: false, calendarListId: undefined });
    }
    if (editingTodo && !editingTodo.dueDate && editingTodo.recurrence && editingTodo.recurrence !== 'once') {
      setEditingTodo({ ...editingTodo, recurrence: 'once' });
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
  
  // Обработчик сохранения
  const updateTodo = (updatedTodo: Todo) => {
    onUpdate(updatedTodo);
    onClose();
  };
  
  const closeTodoModal = () => {
    onClose();
  };
  
  const toggleTodo = (todo: Todo) => {
    onToggle(todo);
  };
  
  if (!isOpen || !editingTodo) return null;
  
  return (
        <div className="fixed inset-0 bg-black flex items-start justify-center z-[100]">
          <div className="bg-white dark:bg-gradient-to-b dark:from-[#1a1a1a] dark:to-[#151515] w-full h-screen flex flex-col overflow-hidden select-none">
            {/* Шапка */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 md:border-b border-gray-200 dark:border-[var(--border-color)] bg-gray-50 dark:bg-white/[0.02] flex-shrink-0 select-none">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {/* Кнопка выполнения в шапке - хорошо видна */}
                <button
                  onClick={() => {
                    const newCompleted = !editingTodo.completed;
                    setEditingTodo({ ...editingTodo, completed: newCompleted });
                    toggleTodo(editingTodo);
                  }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-[background-color,color] select-none ${
                    editingTodo.completed
                      ? 'bg-green-500/30 text-green-300 ring-1 ring-green-500/50 hover:bg-green-500/40'
                      : 'bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:bg-green-500/20 hover:text-green-400 ring-1 ring-white/10'
                  }`}
                  title={editingTodo.completed ? 'Отметить как невыполненную' : 'Отметить как выполненную'}
                >
                  <Check className={`w-4 h-4 ${editingTodo.completed ? 'text-green-300' : ''}`} />
                  {editingTodo.completed ? 'Выполнено' : 'Выполнить'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextValue = !stagesEnabled;
                    if (nextValue && editingTodo) {
                      const nextTabs = editingTodo.technicalSpecTabs?.length
                        ? editingTodo.technicalSpecTabs
                        : [{ id: 'stage1', label: 'Этап 1' }];
                      const nextStageMeta = editingTodo.stageMeta || { stage1: { status: 'pending' as Todo['status'] } };
                      handleUpdate({ stagesEnabled: nextValue, technicalSpecTabs: nextTabs, stageMeta: nextStageMeta });
                      setSidebarMode('stages');
                    } else {
                      handleUpdate({ stagesEnabled: nextValue });
                    }
                    if (!nextValue && sidebarMode === 'stages') {
                      setSidebarMode('settings');
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-[background-color,color] select-none ${
                    stagesEnabled
                      ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40 hover:bg-blue-500/30'
                      : 'bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] ring-1 ring-white/10'
                  }`}
                  title={stagesEnabled ? 'Отключить этапы' : 'Включить этапы'}
                >
                  <span className={`w-2 h-2 rounded-full ${stagesEnabled ? 'bg-blue-400' : 'bg-gray-400'}`} />
                  Этапы
                </button>
                
              </div>
              <button
                onClick={closeTodoModal}
                className="w-8 h-8 bg-gray-100 dark:bg-[var(--bg-glass)] hover:bg-gray-200 dark:hover:bg-[var(--bg-glass-hover)] rounded-full transition-colors flex-shrink-0 flex items-center justify-center border border-gray-200 dark:border-[var(--border-glass)] backdrop-blur-sm"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-[var(--text-secondary)]" />
              </button>
            </div>
            
            {/* Три колонки - адаптивно с регулируемой шириной */}
            <div 
              className="flex flex-1 flex-col lg:flex-row min-h-0 overflow-hidden relative"
              style={{
                '--col-left': `${columnWidths[0]}%`,
                '--col-center': isDiscussionCollapsed ? `${columnWidths[1] + columnWidths[2]}%` : `${columnWidths[1]}%`,
                '--col-right': isDiscussionCollapsed ? '48px' : `${columnWidths[2]}%`,
                contain: 'layout style' // 🚀 Изолируем reflow
              } as React.CSSProperties}
            >
              {/* Левый блок - вкладки */}
              <div 
                className="w-full lg:w-[var(--col-left)] border-b-0 lg:border-b-0 lg:border-r border-gray-200 dark:border-[var(--border-color)] flex-shrink-0 bg-gray-50 dark:bg-[var(--bg-secondary)] order-2 lg:order-1 overflow-y-auto min-h-0 min-w-0 transition-[width] duration-100"
              >
                {/* Переключатель вкладок */}
                <div className="flex bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-[35px] p-1 m-2 sm:m-3 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]">
                  {stagesEnabled && (
                    <button
                      onClick={() => setSidebarMode('stages')}
                      className={`flex-1 py-2 text-xs font-medium rounded-[30px] transition-all flex items-center gap-1.5 justify-center ${
                        sidebarMode === 'stages'
                          ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/30 text-blue-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] border border-blue-500/30 backdrop-blur-xl'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/5 transition-colors'
                      }`}
                    >
                      Этапы
                    </button>
                  )}
                  <button
                    onClick={() => setSidebarMode('settings')}
                    className={`flex-1 py-2 text-xs font-medium rounded-[30px] transition-all flex items-center gap-1.5 justify-center ${
                      sidebarMode === 'settings'
                        ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/30 text-blue-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] border border-blue-500/30 backdrop-blur-xl'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/5 transition-colors'
                    }`}
                  >
                    Настройки
                  </button>
                  <button
                    onClick={() => {
                      setSidebarMode('access');
                    }}
                    className={`flex-1 py-2 text-xs font-medium rounded-[30px] transition-all flex items-center gap-1.5 justify-center ${
                      sidebarMode === 'access'
                        ? 'bg-gradient-to-br from-green-500/20 to-green-600/30 text-green-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] border border-green-500/30 backdrop-blur-xl'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/5 transition-colors'
                    }`}
                  >
                    Доступ
                  </button>
                </div>

                {/* Настройки */}
                {sidebarMode === 'settings' && (
                <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
              
                {/* Заказчик и Исполнитель */}
                <div className="space-y-2">
                  {/* От кого и Делегировано */}
                  <div className="grid grid-cols-2 gap-2">
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
                  </div>
                  
                  {/* Исполнители / Исполнитель по умолчанию */}
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
                </div>
              
                {/* Приоритет и Срок */}
                <div className="grid grid-cols-2 gap-2">
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
                  <FormField label="Срок">
                    <DateTimePicker
                      value={editingTodo.dueDate}
                      onChange={(dueDate) => handleUpdate({ dueDate })}
                      placeholder="Выберите срок"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Повтор">
                    <select
                      value={editingTodo.recurrence || 'once'}
                      onChange={(e) => handleUpdate({ recurrence: e.target.value as Todo['recurrence'] })}
                      disabled={!editingTodo.dueDate}
                      className="w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-xl text-xs text-gray-900 dark:text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 disabled:opacity-60"
                    >
                      <option value="once">Без повтора</option>
                      <option value="daily">Ежедневно</option>
                      <option value="weekly">Еженедельно</option>
                      <option value="biweekly">Раз в две недели</option>
                      <option value="monthly">Ежемесячно</option>
                      <option value="quarterly">Ежеквартально</option>
                      <option value="yearly">Ежегодно</option>
                    </select>
                  </FormField>
                  <div />
                </div>
              
                {/* Список и Категория */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide flex items-center gap-1 select-none">
                      <Inbox className="w-2.5 h-2.5" />
                      Список
                    </label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'list' ? null : 'list')}
                      className="no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-sm text-left flex items-center justify-between hover:border-blue-500/50 transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm overflow-hidden will-change-transform"
                      style={{ borderRadius: '35px', transform: 'translateZ(0)' }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {(() => {
                          const list = lists.find(l => l.id === editingTodo.listId);
                          return list ? (
                            <>
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
                              <span className="text-[var(--text-primary)] text-xs truncate whitespace-nowrap">{list.name}</span>
                            </>
                          ) : <span className="text-[var(--text-muted)] text-xs whitespace-nowrap">Выберите список</span>;
                        })()}
                      </div>
                      <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${openDropdown === 'list' ? 'rotate-180' : ''}`} />
                    </button>
                    {openDropdown === 'list' && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto backdrop-blur-xl">
                        {nonArchivedLists.map(list => (
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
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide flex items-center gap-1 select-none">
                      <Tag className="w-2.5 h-2.5" />
                      Категория
                    </label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
                      className="no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-sm text-left flex items-center justify-between hover:border-blue-500/50 transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm overflow-hidden will-change-transform"
                      style={{ borderRadius: '35px', transform: 'translateZ(0)' }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {(() => {
                          const cat = categories.find(c => c.id === editingTodo.categoryId);
                          return cat ? (
                            <>
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                              <span className="text-[var(--text-primary)] text-xs truncate whitespace-nowrap">{cat.name}</span>
                            </>
                          ) : <span className="text-[var(--text-muted)] text-xs whitespace-nowrap">Без категории</span>;
                        })()}
                      </div>
                      <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${openDropdown === 'category' ? 'rotate-180' : ''}`} />
                    </button>
                    {openDropdown === 'category' && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto backdrop-blur-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTodo({ ...editingTodo, categoryId: null });
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



                {/* Поместить на календарь */}
                {editingTodo.dueDate && (
                  <div className="mt-2">
                    <label 
                      className="flex items-center gap-2 cursor-pointer group select-none"
                      onClick={() => setEditingTodo({ ...editingTodo, addToCalendar: !editingTodo.addToCalendar })}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        editingTodo.addToCalendar 
                          ? 'bg-blue-500 border-blue-500' 
                          : 'border-[var(--border-light)] group-hover:border-white/40'
                      }`}>
                        {editingTodo.addToCalendar && <Check className="w-3 h-3 text-[var(--text-primary)]" />}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CalendarPlus className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                          Поместить на календарь
                        </span>
                        {editingTodo.listId === TZ_LIST_ID && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                            как ТЗ
                          </span>
                        )}
                      </div>
                    </label>
                    {editingTodo.addToCalendar && (
                      <div className="mt-2 ml-7">
                        <label className="text-[10px] text-[var(--text-muted)] mb-1 block select-none">Календарь</label>
                        {calendarLists.length === 0 ? (
                          <p className="text-[10px] text-[var(--text-muted)] italic">Нет доступных календарей</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {calendarLists.map(list => (
                              <button
                                key={list.id}
                                type="button"
                                onClick={() => setEditingTodo({ ...editingTodo, calendarListId: list.id })}
                                className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-[background-color,color] select-none whitespace-nowrap ${
                                  editingTodo.calendarListId === list.id || (!editingTodo.calendarListId && list.id === calendarLists[0]?.id)
                                      ? 'bg-blue-500 text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]'
                                      : 'bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-[var(--text-secondary)] hover:border-blue-500/30'
                                }`}
                                title={list.name}
                              >
                                {list.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {editingTodo.calendarEventId && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-green-400">
                        <Check className="w-3 h-3" />
                        <span>Уже добавлено на календарь</span>
                        <a 
                          href="/events" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 ml-1"
                        >
                          Открыть
                        </a>
                      </div>
                    )}
                  </div>
                )}

                </div>
                )}

                {/* Этапы */}
                {stagesEnabled && sidebarMode === 'stages' && (
                  <div className="p-2 sm:p-3">
                    {getTechSpecTabs().map((tab: { id: string, label: string }) => {
                      // ID уже нормализован в getTechSpecTabs()
                      const isActive = activeTechSpecTab === tab.id;
                      console.log('🗂️ Rendering stage tab:', {
                        id: tab.id,
                        label: tab.label,
                        isActive,
                        activeTechSpecTab
                      });
                      return (
                      <div key={tab.id} className="relative group mb-2">
                        {renamingTabId === tab.id ? (
                          <div
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-xl border ${
                              isActive
                                ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/30 text-blue-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] border-blue-500/30 backdrop-blur-xl'
                                : 'border-white/10 text-[var(--text-secondary)]'
                            }`}
                          >
                            <input
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
                              autoFocus
                              className="flex-1 bg-transparent text-sm outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                              placeholder="Название этапа"
                            />
                            {renderStageStatus(tab.id)}
                            {getTechSpecTabs().length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('Удалить этап?')) {
                                    deleteTechSpecTab(tab.id);
                                  }
                                }}
                                className="p-0.5 hover:bg-red-500/20 rounded transition-opacity"
                                title="Удалить"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              console.log('🔄 Switching stage:', {
                                from: activeTechSpecTab,
                                to: tab.id,
                                tabLabel: tab.label
                              });
                              if (editingTodo) {
                                const nextDescription = descriptionEditorRef.current?.innerHTML || '';
                                const nextResponse = assigneeResponseEditorRef.current?.innerHTML || '';
                                updateStageMeta(activeTechSpecTab, {
                                  description: nextDescription,
                                  assigneeResponse: nextResponse
                                });
                              }
                              console.log('🔄 About to setActiveTechSpecTab:', tab.id);
                              setActiveTechSpecTab(tab.id);
                            }}
                            onDoubleClick={() => {
                              startRenameTechSpecTab(tab.id, tab.label);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors rounded-xl border ${
                              isActive
                                ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/30 text-blue-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] border-blue-500/30 backdrop-blur-xl'
                                : 'border-white/10 text-[var(--text-secondary)] hover:bg-gradient-to-br hover:from-white/10 hover:to-white/5 hover:backdrop-blur-sm transition-all hover:border-white/20'
                            }`}
                          >
                            <span className="truncate flex-1">{tab.label}</span>
                            {renderStageStatus(tab.id)}
                            {getTechSpecTabs().length > 1 && (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Удалить этап?')) {
                                    deleteTechSpecTab(tab.id);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (confirm('Удалить этап?')) {
                                      deleteTechSpecTab(tab.id);
                                    }
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 rounded transition-opacity"
                                title="Удалить"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={addTechSpecTab}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:bg-gradient-to-br hover:from-blue-500/10 hover:to-blue-600/20 transition-all rounded-xl border border-blue-500/30 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] mt-2 hover:border-blue-400/50"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Добавить этап</span>
                    </button>
                  </div>
                )}

                {/* Доступ */}
                {sidebarMode === 'access' && (
                  <div className="p-2 sm:p-3 space-y-3">
                    <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] font-medium mb-3 flex items-center gap-1.5">
                      <Shield className="w-3 h-3" />
                      Управление доступом
                    </div>
                    <div className="space-y-4">
                      <FormField label="Доступ по умолчанию">
                        <MultiPersonSelector
                          selectedIds={defaultAccessPeople.ids}
                          selectedNames={defaultAccessPeople.names}
                          people={people}
                          placeholder="Участники задачи"
                          maxDisplay={Math.max(defaultAccessPeople.ids.length, 1)}
                          onChange={() => {}}
                          disabled
                        />
                      </FormField>

                      <FormField label="Уровень доступа">
                        <div className="relative" ref={dropdownRef}>
                          <button
                            type="button"
                            onClick={() => setShowPermissionDropdown(!showPermissionDropdown)}
                            className="no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-sm text-left flex items-center justify-between hover:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm overflow-hidden will-change-transform"
                            style={{ borderRadius: '20px' }}
                          >
                            <span className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-gray-500 dark:text-white/50" />
                              <span className="text-xs">
                                {permission === 'viewer' ? 'Читатель — только просмотр' : 'Редактор — полный доступ'}
                              </span>
                            </span>
                            <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${showPermissionDropdown ? 'rotate-180' : ''}`} />
                          </button>

                          {showPermissionDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-10 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  setPermission('viewer');
                                  setShowPermissionDropdown(false);
                                }}
                                className={`w-full px-3 py-2.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between ${
                                  permission === 'viewer' ? 'bg-blue-50 dark:bg-blue-500/10' : ''
                                }`}
                              >
                                <div>
                                  <div className={`font-medium ${permission === 'viewer' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                                    Читатель
                                  </div>
                                  <div className="text-[10px] text-gray-500 dark:text-white/50 mt-1">
                                    Может только просматривать содержимое
                                  </div>
                                </div>
                                {permission === 'viewer' && (
                                  <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                )}
                              </button>
                              <div className="border-t border-gray-100 dark:border-white/5" />
                              <button
                                type="button"
                                onClick={() => {
                                  setPermission('editor');
                                  setShowPermissionDropdown(false);
                                }}
                                className={`w-full px-3 py-2.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between ${
                                  permission === 'editor' ? 'bg-blue-50 dark:bg-blue-500/10' : ''
                                }`}
                              >
                                <div>
                                  <div className={`font-medium ${permission === 'editor' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                                    Редактор
                                  </div>
                                  <div className="text-[10px] text-gray-500 dark:text-white/50 mt-1">
                                    Может редактировать и добавлять элементы
                                  </div>
                                </div>
                                {permission === 'editor' && (
                                  <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </FormField>

                      <FormField label="Куда выдать доступ">
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { id: 'link', label: 'Ссылка' },
                              { id: 'chat', label: 'Чат' },
                              { id: 'department', label: 'Отдел' },
                              { id: 'user', label: 'Контакт' }
                            ].map(option => (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => setShareTarget(option.id as 'link' | 'chat' | 'department' | 'user')}
                                className={`px-3 py-2 rounded-lg text-xs border transition-colors ${
                                  shareTarget === option.id
                                    ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400/60 dark:bg-blue-500/10'
                                    : 'border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-400/40 text-gray-700 dark:text-white/80'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>

                        {shareTarget === 'chat' && (
                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 dark:text-white/50">ID или название чата</label>
                            <div className="relative" ref={chatDropdownRef}>
                              <button
                                type="button"
                                onClick={() => setIsChatDropdownOpen(!isChatDropdownOpen)}
                                className="no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-xs text-left flex items-center justify-between hover:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm overflow-hidden will-change-transform"
                                style={{ borderRadius: '20px' }}
                              >
                                <span className={selectedChatName ? '' : 'text-gray-400 dark:text-white/30'}>
                                  {selectedChatName || 'Выберите чат'}
                                </span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${isChatDropdownOpen ? 'rotate-180' : ''}`} />
                              </button>

                              {isChatDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl shadow-lg z-50 overflow-hidden">
                                  <div className="p-2 border-b border-gray-100 dark:border-white/10">
                                    <input
                                      value={accessChatSearch}
                                      onChange={(e) => setAccessChatSearch(e.target.value)}
                                      className="no-mobile-scale w-full px-3 py-2 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-xs text-gray-900 dark:text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm"
                                      style={{ borderRadius: '18px' }}
                                      placeholder="Поиск по чатам"
                                    />
                                  </div>
                                  <div className="max-h-60 overflow-y-auto">
                                    {isLoadingChats && (
                                      <div className="px-3 py-2 text-xs text-[var(--text-muted)]">Загрузка чатов...</div>
                                    )}
                                    {!isLoadingChats && filteredAccessChats.length === 0 && (
                                      <div className="px-3 py-2 text-xs text-[var(--text-muted)]">Чаты не найдены</div>
                                    )}
                                    {!isLoadingChats && filteredAccessChats.map(chat => (
                                      <button
                                        key={chat.id}
                                        type="button"
                                        onClick={() => {
                                          setChatId(chat.id);
                                          setIsChatDropdownOpen(false);
                                        }}
                                        className={`w-full px-3 py-2 text-left transition-colors text-xs flex items-center justify-between ${
                                          chat.id === chatId
                                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                            : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-900 dark:text-[var(--text-primary)]'
                                        }`}
                                      >
                                        <span className="truncate">{getChatLabel(chat)}</span>
                                        <span className="text-[10px] text-gray-500 dark:text-white/40">{chat.id}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {shareTarget === 'department' && (
                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 dark:text-white/50">Название отдела</label>
                            <div className="relative" ref={departmentDropdownRef}>
                              <button
                                type="button"
                                onClick={() => setIsDepartmentDropdownOpen(!isDepartmentDropdownOpen)}
                                className="no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-xs text-left flex items-center justify-between hover:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm overflow-hidden will-change-transform"
                                style={{ borderRadius: '20px' }}
                              >
                                <span className={department ? '' : 'text-gray-400 dark:text-white/30'}>
                                  {department || 'Выберите отдел'}
                                </span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${isDepartmentDropdownOpen ? 'rotate-180' : ''}`} />
                              </button>

                              {isDepartmentDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl shadow-lg z-50 overflow-hidden">
                                  <div className="p-2 border-b border-gray-100 dark:border-white/10">
                                    <input
                                      value={departmentSearch}
                                      onChange={(e) => setDepartmentSearch(e.target.value)}
                                      className="no-mobile-scale w-full px-3 py-2 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-xs text-gray-900 dark:text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm"
                                      style={{ borderRadius: '18px' }}
                                      placeholder="Поиск по отделам"
                                    />
                                  </div>
                                  <div className="max-h-60 overflow-y-auto">
                                    {filteredDepartments.length === 0 && (
                                      <div className="px-3 py-2 text-xs text-[var(--text-muted)]">Отделы не найдены</div>
                                    )}
                                    {filteredDepartments.map((dept) => (
                                      <button
                                        key={dept}
                                        type="button"
                                        onClick={() => {
                                          setDepartment(dept);
                                          setIsDepartmentDropdownOpen(false);
                                        }}
                                        className={`w-full px-3 py-2 text-left transition-colors text-xs flex items-center justify-between ${
                                          dept === department
                                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                            : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-900 dark:text-[var(--text-primary)]'
                                        }`}
                                      >
                                        <span className="truncate">{dept}</span>
                                        {dept === department && <Check className="w-3 h-3" />}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                          {shareTarget === 'user' && (
                            <div className="space-y-1">
                              <label className="text-[10px] text-gray-500 dark:text-white/50">Контакт</label>
                              <PersonSelector
                                selectedId={userId || undefined}
                                selectedName={selectedShareUserName}
                                people={contactPeople.length > 0 ? contactPeople : people}
                                placeholder="Выберите контакт"
                                onChange={(id, _name) => setUserId(id || '')}
                              />
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => createShareLink({ copyToken: shareTarget === 'link' })}
                            disabled={isLoading}
                            className="w-full px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
                          >
                            <LinkIcon className="w-3.5 h-3.5" />
                            {isLoading ? 'Сохранение...' : shareTarget === 'link' ? 'Создать ссылку' : 'Сохранить доступ'}
                          </button>
                        </div>
                      </FormField>
                    </div>

                    {shareLinks.length > 0 && (
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-500 dark:text-white/60">
                          Выданные доступы ({shareLinks.length})
                        </label>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {shareLinks.map(link => {
                            const shareTargetInfo = getShareTargetInfo(link);
                            return (
                              <div
                                key={link.id}
                                className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      {link.permission === 'viewer' ? (
                                        <span className="text-[10px] px-2 py-1 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white/70 rounded-lg font-medium">
                                          Читатель
                                        </span>
                                      ) : (
                                        <span className="text-[10px] px-2 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-lg font-medium">
                                          Редактор
                                        </span>
                                      )}
                                      <span className="text-[10px] text-gray-500 dark:text-white/40">
                                        {new Date(link.createdAt).toLocaleDateString('ru-RU', { 
                                          day: 'numeric', 
                                          month: 'short',
                                          year: 'numeric'
                                        })}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-gray-500 dark:text-white/50">
                                      {shareTargetInfo.label}
                                    </div>
                                    {shareTargetInfo.target === 'link' && (
                                      <div className="text-[10px] font-mono text-gray-500 dark:text-white/40 truncate bg-white dark:bg-black/20 px-2.5 py-2 rounded-lg mt-2">
                                        {window.location.origin}/{shareResourceType}?share={link.token}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {shareTargetInfo.target === 'link' && (
                                      <button
                                        type="button"
                                        onClick={() => copyToClipboard(link.token)}
                                        className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                                        title="Копировать ссылку"
                                      >
                                        {copiedToken === link.token ? (
                                          <Check className="w-4 h-4 text-green-500" />
                                        ) : (
                                          <Copy className="w-4 h-4 text-gray-500 dark:text-white/50" />
                                        )}
                                      </button>
                                    )}
                                    
                                    <button
                                      type="button"
                                      onClick={() => deleteShareLink(link.id)}
                                      className="p-2 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                                      title="Удалить ссылку"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </button>
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

              {/* Resize handle between left and center */}
              <div 
                className="hidden lg:block w-1 cursor-col-resize bg-transparent hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors relative z-10 flex-shrink-0 group"
                onMouseDown={(e) => {
                  e.preventDefault();
                  resizeStartXRef.current = e.clientX;
                  resizeStartWidthsRef.current = columnWidths;
                  setIsResizing(0);
                }}
                title="Перетащите для изменения ширины"
              >
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 flex items-center justify-center">
                  <div className="w-0.5 h-6 bg-gray-300 dark:bg-white/20 group-hover:bg-blue-500 transition-colors rounded-full"></div>
                </div>
              </div>

              {/* Средний блок - Название и Описание */}
              <div 
                className="w-full lg:w-[var(--col-center)] flex flex-col bg-white dark:bg-[var(--bg-secondary)] border-b-0 lg:border-b-0 lg:border-r border-gray-200 dark:border-[var(--border-color)] order-1 lg:order-2 overflow-y-auto min-h-0 min-w-0 transition-[width] duration-100"
              >
                {/* Название задачи */}
                <div className="px-2 sm:px-3 pt-2 sm:pt-3 pb-1.5 sm:pb-2">
                  <input
                    ref={titleInputRef}
                    type="text"
                    defaultValue={editingTodo.title}
                    className="no-mobile-scale w-full px-2 sm:px-3 py-3 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-[20px] text-lg sm:text-xl font-semibold focus:outline-none focus:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-white/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm"
                    placeholder="Название задачи..."
                  />
                </div>
                
                {/* Заголовок с кнопками форматирования */}
                <div className="px-2 sm:px-3 py-1 sm:py-1.5 md:border-b border-gray-200 dark:border-[var(--border-color)]">
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
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <FormField label="Исполнитель">
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
                      </FormField>
                      <FormField label="Срок">
                        <DateTimePicker
                          value={activeStageMeta.dueDate}
                          onChange={(dueDate) => updateStageMeta(activeTechSpecTab, { dueDate })}
                          placeholder="Выберите срок"
                        />
                      </FormField>
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

                  <div className="flex-1 px-2 sm:px-3 pb-2 sm:pb-3 overflow-y-auto flex flex-col gap-2 min-h-[400px]">
                    <div className="flex-1 flex flex-col relative min-h-[150px]">
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
                    
                    <div
                      ref={descriptionEditorRef}
                      id={descriptionEditorId}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => {
                                        if (!stagesEnabled) return;
                                        const html = (e.currentTarget as HTMLDivElement).innerHTML || '';
                                        updateStageMeta(activeTechSpecTab, { description: html });
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
                    >
                    </div>
                  </div>

                  {/* Ответ исполнителя */}
                  <div className="flex-1 flex flex-col border-t border-gray-200 dark:border-[var(--border-color)] pt-2 sm:pt-3">
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1.5 uppercase tracking-wide select-none">
                      Ответ исполнителя
                    </label>
                    <div
                      ref={assigneeResponseEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => {
                        if (!stagesEnabled) return;
                        const html = (e.currentTarget as HTMLDivElement).innerHTML || '';
                        updateStageMeta(activeTechSpecTab, { assigneeResponse: html });
                      }}
                      data-placeholder="Ответ исполнителя на задачу..."
                      className="w-full min-h-[150px] flex-1 px-2 sm:px-3 py-2 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-[var(--text-primary)] focus:outline-none focus:border-blue-500/30 transition-all whitespace-pre-wrap break-words overflow-y-auto empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:dark:text-white/30"
                    />
                  </div>
                </div>

                {/* Вложения - файлы (не картинки) */}
                <div className="px-1.5 sm:px-2 py-1.5 sm:py-2 border-t border-gray-200 dark:border-[var(--border-color)]">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 dark:text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-xs text-gray-500 dark:text-white/50 select-none">Вложения</span>
                    {editingTodo.attachments && editingTodo.attachments.length > 0 && (
                      <span className="text-[10px] bg-[var(--bg-glass-hover)] text-white/50 px-1.5 py-0.5 rounded-full">
                        {editingTodo.attachments.length}
                      </span>
                    )}
                    <label className="ml-auto cursor-pointer px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-colors flex items-center gap-1">
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                        className="hidden"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            // Показываем индикатор загрузки
                            const loadingToast = document.createElement('div');
                            loadingToast.className = 'fixed top-4 right-4 bg-blue-500/20 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-lg text-sm z-50';
                            loadingToast.textContent = `Загрузка ${files.length} файл${files.length === 1 ? 'а' : 'ов'}...`;
                            document.body.appendChild(loadingToast);
                            
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
                            
                            const uploadedAttachments = (await Promise.all(uploadPromises)).filter(Boolean) as Attachment[];
                            
                            // Обновляем индикатор загрузки
                            if (loadingToast) {
                              loadingToast.textContent = `✓ Загружено ${uploadedAttachments.length} файл${uploadedAttachments.length === 1 ? '' : uploadedAttachments.length < 5 ? 'а' : 'ов'}`;
                              loadingToast.className = 'fixed top-4 right-4 bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-2 rounded-lg text-sm z-50';
                              setTimeout(() => loadingToast.remove(), 2000);
                            }
                            
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
                            className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 dark:bg-[var(--bg-glass)] border border-gray-200 dark:border-[var(--border-color)] rounded-lg hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] transition-colors w-[120px]"
                          >
                            <svg className="w-4 h-4 text-gray-500 dark:text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[10px] text-gray-700 dark:text-[var(--text-secondary)] truncate flex-1 min-w-0">{att.name}</span>
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
            {/* Resize handle between center and right */}
            <div 
              className="hidden lg:block w-1 cursor-col-resize bg-transparent hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors relative z-10 flex-shrink-0 group"
              onMouseDown={(e) => {
                e.preventDefault();
                resizeStartXRef.current = e.clientX;
                resizeStartWidthsRef.current = columnWidths;
                setIsResizing(1);
              }}
              title="Перетащите для изменения ширины"
            >
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 flex items-center justify-center">
                <div className="w-0.5 h-6 bg-gray-300 dark:bg-white/20 group-hover:bg-blue-500 transition-colors rounded-full"></div>
              </div>
            </div>

              {/* Правый блок - Обсуждение */}
              <div 
                className="w-full lg:w-[var(--col-right)] flex flex-col bg-[var(--bg-secondary)] order-3 lg:order-3 overflow-hidden min-h-0 transition-all duration-300 ease-in-out border-l border-gray-200 dark:border-[var(--border-color)]"
              >
                {/* Заголовок */}
                <div className="px-3 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between bg-gradient-to-br from-white/5 to-white/2 flex-shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span 
                      className={`text-xs font-medium text-[var(--text-secondary)] select-none transition-all duration-300 whitespace-nowrap ${
                        isDiscussionCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                      }`}
                    >
                      Обсуждение
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDiscussionCollapsed(!isDiscussionCollapsed)}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-all flex-shrink-0 group"
                    title={isDiscussionCollapsed ? 'Развернуть обсуждение' : 'Свернуть обсуждение'}
                  >
                    {isDiscussionCollapsed ? (
                      <ChevronLeft className="w-4 h-4 group-hover:text-blue-400 transition-colors" />
                    ) : (
                      <ChevronRight className="w-4 h-4 group-hover:text-blue-400 transition-colors" />
                    )}
                  </button>
                </div>

                {/* Кнопка создания/открытия чата */}
                <div 
                  className={`flex-1 flex items-center justify-center p-4 overflow-y-auto transition-all duration-300 ${
                    isDiscussionCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  {editingTodo.chatId ? (
                    <a
                      href={`/messages?chat=${editingTodo.chatId}`}
                      className="px-6 py-3 bg-gradient-to-br from-green-500/20 to-green-600/30 hover:from-green-500/30 hover:to-green-600/40 text-green-400 hover:text-green-300 rounded-2xl transition-all border border-green-500/30 hover:border-green-400/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_4px_12px_rgba(34,197,94,0.15)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_6px_16px_rgba(34,197,94,0.25)] backdrop-blur-xl flex items-center gap-2 text-sm font-medium"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Открыть обсуждение
                    </a>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          // Собираем всех причастных к задаче
                          const participantIds = new Set<string>();
                          
                          // Добавляем заказчика
                          if (editingTodo.assignedById) participantIds.add(editingTodo.assignedById);
                          
                          // Добавляем исполнителей
                          if (editingTodo.assignedToIds && editingTodo.assignedToIds.length > 0) {
                            editingTodo.assignedToIds.forEach(id => participantIds.add(id));
                          } else if (editingTodo.assignedToId) {
                            participantIds.add(editingTodo.assignedToId);
                          }
                          
                          // Добавляем текущего пользователя
                          if (myAccountId) participantIds.add(myAccountId);
                          
                          const participantsArray = Array.from(participantIds);
                          
                          if (participantsArray.length === 0) {
                            alert('Невозможно создать чат: нет участников');
                            return;
                          }
                          
                          // Создаем чат
                          const chatRes = await fetch('/api/chats', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              isGroup: participantsArray.length > 2,
                              participantIds: participantsArray,
                              name: `Обсуждение: ${editingTodo.title}`,
                              taskId: editingTodo.id,
                              taskTitle: editingTodo.title
                            })
                          });
                          
                          if (chatRes.ok) {
                            const newChat = await chatRes.json();
                            // Проверяем что чат создался успешно
                            if (!newChat || !newChat.id) {
                              console.error('[createChat] Invalid response:', newChat);
                              alert('Ошибка создания чата');
                              return;
                            }
                            // Сохраняем chatId в задаче
                            const updatedTodo = { ...editingTodo, chatId: newChat.id };
                            const saveRes = await fetch('/api/todos', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(updatedTodo)
                            });
                            if (saveRes.ok) {
                              setEditingTodo(updatedTodo);
                              // Используем router.push вместо window.location.href
                              router.push(`/messages?chat=${newChat.id}`);
                            }
                          } else {
                            alert('Ошибка создания чата');
                          }
                        } catch (error) {
                          console.error('Error creating task chat:', error);
                          alert('Ошибка создания чата');
                        }
                      }}
                      className="px-6 py-3 bg-gradient-to-br from-blue-500/20 to-blue-600/30 hover:from-blue-500/30 hover:to-blue-600/40 text-blue-400 hover:text-blue-300 rounded-2xl transition-all border border-blue-500/30 hover:border-blue-400/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_4px_12px_rgba(59,130,246,0.15)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_6px_16px_rgba(59,130,246,0.25)] backdrop-blur-xl flex items-center gap-2 text-sm font-medium"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Начать обсуждение
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Футер */}
            <div className="sticky bottom-0 flex flex-col sm:flex-row justify-between items-center gap-2 px-4 py-3 md:border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/95 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                {stagesEnabled ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] font-medium select-none">
                      Статус этапа
                    </span>
                    <StatusButtonGroup
                      value={activeStageMeta.status || 'pending'}
                      options={statusOptions}
                      onChange={(status) => updateStageMeta(activeTechSpecTab, { status: status as Todo['status'] })}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] font-medium select-none">
                      Статус задачи
                    </span>
                    <StatusButtonGroup
                      value={editingTodo.status || 'todo'}
                      options={statusOptions}
                      onChange={(status) => handleUpdate({ status: status as Todo['status'] })}
                    />
                  </div>
                )}
                <div className="text-[10px] text-[var(--text-muted)] text-center sm:text-left">
                  Создано: {new Date(editingTodo.createdAt).toLocaleDateString('ru-RU')}
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={closeTodoModal}
                  className="flex-1 sm:flex-none px-6 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass)] transition-all text-sm font-medium shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm bg-gradient-to-br from-white/5 to-white/10 border border-white/10"
                  style={{ borderRadius: '50px' }}
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    const updatedTodo = { ...editingTodo };
                    if (titleInputRef.current) {
                      updatedTodo.title = titleInputRef.current.value.trim() || updatedTodo.title;
                    }
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

                    updateTodo(updatedTodo);
                  }}
                  className="flex-1 sm:flex-none px-8 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all text-sm font-medium shadow-lg"
                  style={{ borderRadius: '50px' }}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
    

  );
});

export default Editingtodo;
