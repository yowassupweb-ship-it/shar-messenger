
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Statusdropdown,
  Executordropdown,
  NewTodoAssigneeDropdown,
  Mobileheadermenu,
} from '@/components/features/todos-auto';
import TodoItem from '@/components/features/todos/todos/TodoItem';
import AddTodoForm from '@/components/features/todos/todos/AddTodoForm';
import TodoListColumn from '@/components/features/todos/TodoListColumn';
import TodoHeader from '@/components/features/todos/TodoHeader';
import ArchivedSection from '@/components/features/todos/ArchivedSection';
import TodoHoverPreview from '@/components/features/todos/TodoHoverPreview';
import TodoListHeader from '@/components/features/todos/TodoListHeader';
import { useMobileView } from '@/hooks/useMobileView';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useTodoComputedValues } from '@/hooks/useTodoComputedValues';
import { useTodoState } from '@/hooks/useTodoState';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { useNotifications } from '@/hooks/useNotifications';
import { useTodoPolling } from '@/hooks/useTodoPolling';
import { useDeadlineChecker } from '@/hooks/useDeadlineChecker';
import { useHover } from '@/hooks/useHover';
import { useTodoActions } from '@/hooks/useTodoActions';
import { useListActions } from '@/hooks/useListActions';
import { useCategoryActions } from '@/hooks/useCategoryActions';
import { usePeopleActions } from '@/hooks/usePeopleActions';
import { useTodoDragDrop } from '@/hooks/useTodoDragDrop';
import { useListDragDrop } from '@/hooks/useListDragDrop';
import { useBoardScroll } from '@/hooks/useBoardScroll';
import { useTodoDataLoader } from '@/hooks/useTodoDataLoader';
import { useTodoNotifications } from '@/hooks/useTodoNotifications';
import { useTodoUrlHandlers } from '@/hooks/useTodoUrlHandlers';
import * as Icons from '@/constants/todoIcons';
import { 
  TaskNotificationManager, 
  getTaskRelatedUsers,
  getStatusLabel 
} from '@/services/notificationService';
import type { 
  Todo, 
  TodoList, 
  Person, 
  TodoCategory, 
  Toast, 
  Notification, 
  CalendarList,
  Comment,
  ChecklistItem,
  Attachment,
  LinkItem
} from '@/types/todos';
import { PRIORITY_COLORS, PRIORITY_BG, PRIORITY_LABELS, StatusOption } from '@/types/todos';
import { LIST_COLORS, CATEGORY_ICONS, TZ_LIST_ID } from '@/utils/todoConstants';
import { Archive } from 'lucide-react';

// Вспомогательная функция для получения имени пользователя
const getPersonNameById = (people: any[], personId: string | undefined): string => {
  if (!personId) return '';
  const person = people.find(p => p.id === personId);
  return person?.name || '';
};

export default function TodosPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // All state via custom hook
  const state = useTodoState();
  const {
    todos, setTodos,
    lists, setLists,
    categories, setCategories,
    people, setPeople,
    calendarLists, setCalendarLists,
    isLoading, setIsLoading,
    returnUrl, setReturnUrl,
    showAddList, setShowAddList,
    showAddCategory, setShowAddCategory,
    showCategoryManager, setShowCategoryManager,
    showPeopleManager, setShowPeopleManager,
    showTelegramSettings, setShowTelegramSettings,
    showSettingsMenu, setShowSettingsMenu,
    showEditPersonModal, setShowEditPersonModal,
    showMobileFiltersModal, setShowMobileFiltersModal,
    showMobileArchiveModal, setShowMobileArchiveModal,
    editingCategory, setEditingCategory,
    editingPerson, setEditingPerson,
    editingTodo, setEditingTodo,
    editingListId, setEditingListId,
    editingListName, setEditingListName,
    newListName, setNewListName,
    newListDescription, setNewListDescription,
    newListColor, setNewListColor,
    newListAssigneeId, setNewListAssigneeId,
    showNewListAssigneeDropdown, setShowNewListAssigneeDropdown,
    newCategoryName, setNewCategoryName,
    newCategoryColor, setNewCategoryColor,
    newCategoryIcon, setNewCategoryIcon,
    newPersonName, setNewPersonName,
    newPersonTelegramId, setNewPersonTelegramId,
    newPersonTelegramUsername, setNewPersonTelegramUsername,
    newPersonRole, setNewPersonRole,
    newTodoTitle, setNewTodoTitle,
    newTodoDescription, setNewTodoDescription,
    newTodoAssigneeId, setNewTodoAssigneeId,
    showNewTodoAssigneeDropdown, setShowNewTodoAssigneeDropdown,
    addingToList, setAddingToList,
    telegramToken, setTelegramToken,
    telegramEnabled, setTelegramEnabled,
    searchQuery, setSearchQuery,
    showMobileSearch, setShowMobileSearch,
    showCompleted, setShowCompleted,
    statusFilter, setStatusFilter,
    showStatusFilter, setShowStatusFilter,
    executorFilter, setExecutorFilter,
    showExecutorFilter, setShowExecutorFilter,
    filterStatus, setFilterStatus,
    filterExecutor, setFilterExecutor,
    statusDropdownOpen, setStatusDropdownOpen,
    executorDropdownOpen, setExecutorDropdownOpen,
    mobileFiltersOpen, setMobileFiltersOpen,
    showArchive, setShowArchive,
    myAccountId, setMyAccountId,
    myDepartment, setMyDepartment,
    canSeeAllTasks, setCanSeeAllTasks,
    isDepartmentHead, setIsDepartmentHead,
    mobileHeaderMenuOpen, setMobileHeaderMenuOpen,
    showListSettings, setShowListSettings,
    showListMenu, setShowListMenu,
    listSettingsDropdown, setListSettingsDropdown,
    notifications, setNotifications,
    showInbox, setShowInbox,
    inboxTab, setInboxTab,
    soundEnabled, setSoundEnabled,
    toasts, setToasts,
    openDropdown, setOpenDropdown,
    searchAssignedBy, setSearchAssignedBy,
    searchDelegatedBy, setSearchDelegatedBy,
    searchAssignedTo, setSearchAssignedTo,
    draggedTodo, setDraggedTodo,
    dragOverListId, setDragOverListId,
    dragOverTodoId, setDragOverTodoId,
    draggedList, setDraggedList,
    dragOverListOrder, setDragOverListOrder,
    isDraggingBoard, setIsDraggingBoard,
    startX, setStartX,
    scrollLeft, setScrollLeft,
    titleInputRef,
    descriptionEditorRef,
    autoSaveTimerRef,
    lastSavedTodoRef,
    notificationSoundRef,
    lastNotificationCountRef,
    statusFilterRef,
    executorFilterRef,
    hasOpenedFromUrlRef,
    dragCounter,
    boardRef,
    settingsRef
  } = state;
  
  // 🚀 PERFORMANCE: Статусы для переиспользуемого компонента
  const statusOptions: StatusOption[] = [
    { value: 'pending', label: 'В ожидании', color: 'orange' },
    { value: 'in-progress', label: 'В работе', color: 'blue' },
    { value: 'review', label: 'Готово к проверке', color: 'green' },
    { value: 'cancelled', label: 'Отменена', color: 'red' },
    { value: 'stuck', label: 'Застряла', color: 'yellow' },
  ];
  
  // 🚀 PERFORMANCE: Мемоизированный обработчик обновления - изолирует ре-рендеры компонентов
  const handleUpdate = useCallback((updates: Partial<Todo>) => {
    setEditingTodo(prev => prev ? { ...prev, ...updates } : prev);
  }, []);
  
  // Mobile view and window width management
  const { windowWidth, mobileView, selectedColumnIndex, setSelectedColumnIndex } = useMobileView();
  
  // Resizable columns for modal
  const { columnWidths, isResizing, startResize } = useResizableColumns({ windowWidth });
  const resizeStartXRef = useRef<number>(0);
  const resizeStartWidthsRef = useRef<[number, number, number]>([27.5, 45, 27.5]);

  // Data loader via hook
  const { loadData } = useTodoDataLoader({
    myAccountId,
    setTodos,
    setLists,
    setCategories,
    setPeople,
    setCalendarLists,
    setIsLoading
  });

  // Функция воспроизведения звука
  const playNotificationSound = useCallback(() => {
    if (soundEnabled && notificationSoundRef.current) {
      notificationSoundRef.current.currentTime = 0;
      notificationSoundRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  // Notifications via hook
  const { loadNotifications, saveNotification } = useNotifications({
    myAccountId,
    soundEnabled,
    setNotifications,
    setToasts,
    notificationSoundRef
  });

  // Task notifications via hook
  const { createTaskNotification } = useTodoNotifications({
    myAccountId,
    people,
    setNotifications,
    playNotificationSound,
    saveNotification
  });

  // Real-time polling via hook
  useTodoPolling({
    myAccountId,
    soundEnabled,
    editingTodo,
    setTodos,
    setToasts,
    setEditingTodo,
    notificationSoundRef
  });

  // Deadline checker via hook
  useDeadlineChecker({
    myAccountId,
    todos,
    people,
    setToasts
  });

  // Computed values via hook (replaces all useMemo blocks)
  const {
    myNotifications,
    unreadCount,
    filteredAndSortedTodos,
    filterTodos,
    getTodosForList,
    getArchivedTodos,
    nonArchivedLists,
    listCounts
  } = useTodoComputedValues({
    todos,
    lists,
    notifications,
    myAccountId,
    searchQuery,
    filterStatus,
    filterExecutor,
    showCompleted,
    showArchive
  });

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

  // URL handlers via hook
  const { isClosingModalRef } = useTodoUrlHandlers({
    todos,
    people,
    isLoading,
    myAccountId,
    setEditingTodo,
    setAddingToList,
    setNewTodoTitle,
    setNewTodoAssigneeId,
    setReturnUrl
  });

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
          
          // Устанавливаем права на просмотр всех задач (по умолчанию false)
          setCanSeeAllTasks(userData.canSeeAllTasks === true);
          
          // Устанавливаем статус руководителя отдела
          setIsDepartmentHead(userData.isDepartmentHead === true);
          
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

  // Переключение звука
  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('todos_soundEnabled', String(newValue));
  };

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
    // 🚀 PERFORMANCE: Сохраняем title и description из refs перед закрытием
    if (editingTodo) {
      const title = titleInputRef.current?.value || editingTodo.title;
      const description = descriptionEditorRef.current?.innerHTML || editingTodo.description;
      
      try {
        await fetch('/api/todos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...editingTodo,
            title,
            description
          })
        });
      } catch (error) {
        console.error('Error saving title/description on close:', error);
      }
    }
    
    isClosingModalRef.current = true;
    setEditingTodo(null);
    router.push(returnUrl, { scroll: false });
    // Сбрасываем returnUrl после возврата
    setReturnUrl('/account?tab=tasks');
  };

  // Click outside handlers via hook
  useClickOutside({
    settingsRef,
    statusFilterRef,
    executorFilterRef,
    setShowSettingsMenu,
    setShowStatusFilter,
    setShowExecutorFilter
  });

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

  // Hover handling via hook
  const { hovered: hoveredTodo, position: hoverPosition, handleMouseEnter: handleTodoMouseEnter, handleMouseLeave: handleTodoMouseLeave } = useHover<Todo>(500);

  // Добавление задачи
  // Todo CRUD operations via hook
  const todoActions = useTodoActions(
    todos,
    setTodos,
    people,
    lists,
    calendarLists,
    myAccountId,
    createTaskNotification,
    closeTodoModal,
    TZ_LIST_ID
  );

  const addTodo = useCallback(async () => {
    await todoActions.addTodo(
      addingToList!,
      newTodoTitle,
      newTodoDescription,
      newTodoAssigneeId,
      () => {
        setNewTodoTitle('');
        setNewTodoDescription('');
        setNewTodoAssigneeId(null);
        setShowNewTodoAssigneeDropdown(false);
        setAddingToList(null);
      }
    );
  }, [todoActions, addingToList, newTodoTitle, newTodoDescription, newTodoAssigneeId]);

  const { updateTodo, deleteTodo, toggleTodo, moveTodo, toggleArchiveTodo } = todoActions;

  // List actions via hook
  const listActions = useListActions({
    lists,
    setLists,
    loadData,
    myAccountId,
    people,
    windowWidth,
    nonArchivedLists,
    setSelectedColumnIndex,
    setShowAddList,
    setShowListSettings
  });

  const addList = useCallback(async () => {
    await listActions.addList(
      newListName,
      newListColor,
      newListAssigneeId,
      setNewListName,
      setNewListAssigneeId
    );
  }, [listActions, newListName, newListColor, newListAssigneeId]);

  const { deleteList, updateList, toggleArchiveList, updateListsOrder } = listActions;

  // Category actions via hook
  const categoryActions = useCategoryActions({
    categories,
    setCategories,
    loadData,
    setEditingCategory,
    setShowAddCategory
  });

  const addCategory = useCallback(async () => {
    await categoryActions.addCategory(
      newCategoryName,
      newCategoryColor,
      newCategoryIcon,
      setNewCategoryName,
      setNewCategoryColor,
      setNewCategoryIcon
    );
  }, [categoryActions, newCategoryName, newCategoryColor, newCategoryIcon]);

  const { updateCategory, deleteCategory } = categoryActions;

  // People actions via hook
  const peopleActions = usePeopleActions({
    people,
    setPeople,
    setEditingPerson
  });

  const addPerson = useCallback(async () => {
    await peopleActions.addPerson(
      newPersonName,
      newPersonTelegramId,
      newPersonTelegramUsername,
      newPersonRole,
      setNewPersonName,
      setNewPersonTelegramId,
      setNewPersonTelegramUsername
    );
  }, [peopleActions, newPersonName, newPersonTelegramId, newPersonTelegramUsername, newPersonRole]);

  const { updatePerson, deletePerson } = peopleActions;

  // Todo drag & drop via hook
  const todoDragDrop = useTodoDragDrop({
    todos,
    setTodos,
    draggedTodo,
    setDraggedTodo,
    setDragOverListId,
    setDragOverTodoId,
    moveTodo
  });

  const {
    handleDragStart,
    handleDragEnd,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleTodoDragOver,
    handleTodoDrop,
    handleDrop
  } = todoDragDrop;

  // List drag & drop via hook
  const listDragDrop = useListDragDrop({
    lists,
    draggedList,
    setDraggedList,
    setDragOverListOrder,
    updateListsOrder
  });

  const {
    handleListDragStart,
    handleListDragEnd,
    handleListDragOver,
    handleListDrop
  } = listDragDrop;

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

  // Board scroll via hook
  const boardScroll = useBoardScroll({
    windowWidth,
    draggedTodo,
    draggedList,
    isDraggingBoard,
    setIsDraggingBoard,
    setStartX,
    setScrollLeft,
    boardRef
  });

  const { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } = boardScroll;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col text-gray-900 dark:text-white overflow-hidden relative" style={{ background: 'transparent' }}>
      {/* Header */}
      <TodoHeader
        selectedColumnIndex={selectedColumnIndex}
        nonArchivedListsLength={nonArchivedLists.length}
        setSelectedColumnIndex={setSelectedColumnIndex}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        mobileHeaderMenuOpen={mobileHeaderMenuOpen}
        setMobileHeaderMenuOpen={setMobileHeaderMenuOpen}
        setShowMobileFiltersModal={setShowMobileFiltersModal}
        setShowMobileArchiveModal={setShowMobileArchiveModal}
        setShowAddList={setShowAddList}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        statusDropdownOpen={statusDropdownOpen}
        setStatusDropdownOpen={setStatusDropdownOpen}
        filterExecutor={filterExecutor}
        setFilterExecutor={setFilterExecutor}
        executorDropdownOpen={executorDropdownOpen}
        setExecutorDropdownOpen={setExecutorDropdownOpen}
        people={people}
        showArchive={showArchive}
        setShowArchive={setShowArchive}
      />

      {/* Kanban Board */}
      <div className="flex-1 min-h-0 pb-20 md:pb-16 pt-[60px] overflow-y-auto md:overflow-y-auto">
        <div 
          ref={boardRef}
          className="px-0 sm:px-4 py-2 sm:py-4 flex flex-col md:flex-row gap-3 sm:gap-4 md:overflow-x-auto scrollbar-hide"
          style={{ cursor: windowWidth >= 768 ? 'grab' : 'default' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* TODO: Restore TodoKanbanBoard component */}
          <div className="text-center text-gray-500 p-8">
            <p>Компонент TodoKanbanBoard временно отключен</p>
          </div>
          {/* <TodoKanbanBoard
            lists={nonArchivedLists}
            showArchive={showArchive}
            searchQuery={searchQuery}
            myAccountId={myAccountId}
            myDepartment={myDepartment}
            canSeeAllTasks={canSeeAllTasks}
            todos={todos}
            draggedTodo={draggedTodo}
            dragOverListId={dragOverListId}
            dragOverTodoId={dragOverTodoId}
            draggedList={draggedList}
            dragOverListOrder={dragOverListOrder}
            people={people}
            categories={categories}
            windowWidth={windowWidth}
            selectedColumnIndex={selectedColumnIndex}
            listCounts={listCounts}
            addingToList={addingToList}
            newTodoTitle={newTodoTitle}
            newTodoDescription={newTodoDescription}
            newTodoAssigneeId={newTodoAssigneeId}
            showNewTodoAssigneeDropdown={showNewTodoAssigneeDropdown}
            showAddList={showAddList}
            newListName={newListName}
            newListDescription={newListDescription}
            newListColor={newListColor}
            newListAssigneeId={newListAssigneeId}
            showNewListAssigneeDropdown={showNewListAssigneeDropdown}
            showListMenu={showListMenu}
            editingListId={editingListId}
            editingListName={editingListName}
            showListSettings={showListSettings}
            LIST_COLORS={LIST_COLORS}
            getTodosForList={getTodosForList}
            handleDragStart={handleDragStart}
            handleDragEnd={handleDragEnd}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            handleDragEnter={handleDragEnter}
            handleDragLeave={handleDragLeave}
            handleTodoDragOver={handleTodoDragOver}
            handleTodoDrop={handleTodoDrop}
            handleListDragStart={handleListDragStart}
            handleListDragEnd={handleListDragEnd}
            handleListDragOver={handleListDragOver}
            handleListDrop={handleListDrop}
            handleTodoMouseEnter={handleTodoMouseEnter}
            handleTodoMouseLeave={handleTodoMouseLeave}
            toggleTodo={toggleTodo}
            openTodoModal={openTodoModal}
            toggleArchiveTodo={toggleArchiveTodo}
            deleteTodo={deleteTodo}
            setNewTodoTitle={setNewTodoTitle}
            setNewTodoDescription={setNewTodoDescription}
            setNewTodoAssigneeId={setNewTodoAssigneeId}
            setShowNewTodoAssigneeDropdown={setShowNewTodoAssigneeDropdown}
            addTodo={addTodo}
            setAddingToList={setAddingToList}
            setShowListMenu={setShowListMenu}
            setEditingListId={setEditingListId}
            setEditingListName={setEditingListName}
            updateList={updateList}
            toggleArchiveList={toggleArchiveList}
            deleteList={deleteList}
            setShowListSettings={setShowListSettings}
            setShowAddList={setShowAddList}
            setNewListName={setNewListName}
            setNewListDescription={setNewListDescription}
            setNewListColor={setNewListColor}
            setNewListAssigneeId={setNewListAssigneeId}
            setShowNewListAssigneeDropdown={setShowNewListAssigneeDropdown}
            addList={addList}
          /> */}
        </div>

        {/* Archived Section */}
        <ArchivedSection
          showArchive={showArchive}
          lists={lists}
          getArchivedTodos={getArchivedTodos}
          getTodosForList={getTodosForList}
          listCounts={listCounts}
          toggleArchiveTodo={toggleArchiveTodo}
          deleteTodo={deleteTodo}
          toggleArchiveList={toggleArchiveList}
          deleteList={deleteList}
          handleTodoMouseEnter={handleTodoMouseEnter}
          handleTodoMouseLeave={handleTodoMouseLeave}
          PRIORITY_COLORS={PRIORITY_COLORS}
        />

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
      <TodoHoverPreview
        todo={hoveredTodo}
        position={hoverPosition}
        windowWidth={windowWidth}
        people={people}
        onMouseLeave={handleTodoMouseLeave}
        getPersonNameById={getPersonNameById}
      />

      {/* All Modals */}
      {/* TODO: Restore TodoModals component */}
      {/* <TodoModals
        editingTodo={editingTodo}
        setEditingTodo={setEditingTodo}
        updateTodo={updateTodo}
        toggleTodo={toggleTodo}
        people={people}
        lists={lists}
        nonArchivedLists={nonArchivedLists}
        categories={categories}
        calendarLists={calendarLists}
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
        myAccountId={myAccountId}
        showCategoryManager={showCategoryManager}
        setShowCategoryManager={setShowCategoryManager}
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
        showPeopleManager={showPeopleManager}
        setShowPeopleManager={setShowPeopleManager}
        showEditPersonModal={showEditPersonModal}
        setShowEditPersonModal={setShowEditPersonModal}
        editingPerson={editingPerson}
        setEditingPerson={setEditingPerson}
        updatePerson={updatePerson}
        showMobileFiltersModal={showMobileFiltersModal}
        setShowMobileFiltersModal={setShowMobileFiltersModal}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterExecutor={filterExecutor}
        setFilterExecutor={setFilterExecutor}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showMobileArchiveModal={showMobileArchiveModal}
        setShowMobileArchiveModal={setShowMobileArchiveModal}
        showArchive={showArchive}
        setShowArchive={setShowArchive}
        showTelegramSettings={showTelegramSettings}
        setShowTelegramSettings={setShowTelegramSettings}
        telegramToken={telegramToken}
        setTelegramToken={setTelegramToken}
        telegramEnabled={telegramEnabled}
        setTelegramEnabled={setTelegramEnabled}
        updateTelegramSettings={updateTelegramSettings}
        showListSettings={showListSettings}
        setShowListSettings={setShowListSettings}
        setLists={setLists}
        updateList={updateList}
        listSettingsDropdown={listSettingsDropdown}
        setListSettingsDropdown={setListSettingsDropdown}
        toasts={toasts}
        setToasts={setToasts}
        removeToast={removeToast}
        openTodoModalWithFreshData={openTodoModalWithFreshData}
      /> */}
      
      {/* Placeholder for modals */}
      <div className="hidden">Компонент TodoModals временно отключен</div>
    </div>
  );
}