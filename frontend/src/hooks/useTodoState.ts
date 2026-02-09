import { useState, useRef } from 'react';
import type { Todo, TodoList, TodoCategory, Person, CalendarList, Notification, Toast } from '@/types/todos';

export function useTodoState() {
  // Data state
  const [todos, setTodos] = useState<Todo[]>([]);
  const [lists, setLists] = useState<TodoList[]>([]);
  const [categories, setCategories] = useState<TodoCategory[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [calendarLists, setCalendarLists] = useState<CalendarList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [returnUrl, setReturnUrl] = useState<string>('/account?tab=tasks');

  // Modal states
  const [showAddList, setShowAddList] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showPeopleManager, setShowPeopleManager] = useState(false);
  const [showTelegramSettings, setShowTelegramSettings] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showEditPersonModal, setShowEditPersonModal] = useState(false);
  const [showMobileFiltersModal, setShowMobileFiltersModal] = useState(false);
  const [showMobileArchiveModal, setShowMobileArchiveModal] = useState(false);

  // Editing states
  const [editingCategory, setEditingCategory] = useState<TodoCategory | null>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');

  // Form states - List
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListColor, setNewListColor] = useState('#6366f1');
  const [newListAssigneeId, setNewListAssigneeId] = useState<string | null>(null);
  const [showNewListAssigneeDropdown, setShowNewListAssigneeDropdown] = useState(false);

  // Form states - Category
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6366f1');
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag');

  // Form states - Person
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonTelegramId, setNewPersonTelegramId] = useState('');
  const [newPersonTelegramUsername, setNewPersonTelegramUsername] = useState('');
  const [newPersonRole, setNewPersonRole] = useState<'executor' | 'customer' | 'universal'>('executor');

  // Form states - Todo
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDescription, setNewTodoDescription] = useState('');
  const [newTodoAssigneeId, setNewTodoAssigneeId] = useState<string | null>(null);
  const [showNewTodoAssigneeDropdown, setShowNewTodoAssigneeDropdown] = useState(false);
  const [addingToList, setAddingToList] = useState<string | null>(null);

  // Telegram settings
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-progress' | 'pending' | 'review' | 'cancelled' | 'stuck'>('all');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [executorFilter, setExecutorFilter] = useState<string>('all');
  const [showExecutorFilter, setShowExecutorFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'todo' | 'pending' | 'in-progress' | 'review' | 'stuck'>('all');
  const [filterExecutor, setFilterExecutor] = useState<string | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [executorDropdownOpen, setExecutorDropdownOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Archive
  const [showArchive, setShowArchive] = useState(false);

  // User settings
  const [myAccountId, setMyAccountId] = useState<string | null>(null);
  const [myDepartment, setMyDepartment] = useState<string | null>(null);
  const [canSeeAllTasks, setCanSeeAllTasks] = useState<boolean>(false);
  const [isDepartmentHead, setIsDepartmentHead] = useState<boolean>(false);

  // Mobile UI
  const [mobileHeaderMenuOpen, setMobileHeaderMenuOpen] = useState(false);

  // List settings
  const [showListSettings, setShowListSettings] = useState<string | null>(null);
  const [showListMenu, setShowListMenu] = useState<string | null>(null);
  const [listSettingsDropdown, setListSettingsDropdown] = useState<'executor' | 'customer' | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showInbox, setShowInbox] = useState(false);
  const [inboxTab, setInboxTab] = useState<'new' | 'history'>('new');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Dropdown states
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchAssignedBy, setSearchAssignedBy] = useState('');
  const [searchDelegatedBy, setSearchDelegatedBy] = useState('');
  const [searchAssignedTo, setSearchAssignedTo] = useState('');

  // Drag and Drop - Todo
  const [draggedTodo, setDraggedTodo] = useState<Todo | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);
  const [dragOverTodoId, setDragOverTodoId] = useState<string | null>(null);

  // Drag and Drop - List
  const [draggedList, setDraggedList] = useState<TodoList | null>(null);
  const [dragOverListOrder, setDragOverListOrder] = useState<number | null>(null);

  // Board scroll
  const [isDraggingBoard, setIsDraggingBoard] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Refs
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionEditorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTodoRef = useRef<string | null>(null);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  const lastNotificationCountRef = useRef<number>(0);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const executorFilterRef = useRef<HTMLDivElement>(null);
  const isClosingModalRef = useRef(false);
  const hasOpenedFromUrlRef = useRef(false);
  const dragCounter = useRef(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  return {
    // Data
    todos, setTodos,
    lists, setLists,
    categories, setCategories,
    people, setPeople,
    calendarLists, setCalendarLists,
    isLoading, setIsLoading,
    returnUrl, setReturnUrl,

    // Modals
    showAddList, setShowAddList,
    showAddCategory, setShowAddCategory,
    showCategoryManager, setShowCategoryManager,
    showPeopleManager, setShowPeopleManager,
    showTelegramSettings, setShowTelegramSettings,
    showSettingsMenu, setShowSettingsMenu,
    showEditPersonModal, setShowEditPersonModal,
    showMobileFiltersModal, setShowMobileFiltersModal,
    showMobileArchiveModal, setShowMobileArchiveModal,

    // Editing
    editingCategory, setEditingCategory,
    editingPerson, setEditingPerson,
    editingTodo, setEditingTodo,
    editingListId, setEditingListId,
    editingListName, setEditingListName,

    // Forms
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

    // Telegram
    telegramToken, setTelegramToken,
    telegramEnabled, setTelegramEnabled,

    // Filters
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

    // User
    myAccountId, setMyAccountId,
    myDepartment, setMyDepartment,
    canSeeAllTasks, setCanSeeAllTasks,
    isDepartmentHead, setIsDepartmentHead,

    // Mobile
    mobileHeaderMenuOpen, setMobileHeaderMenuOpen,

    // List UI
    showListSettings, setShowListSettings,
    showListMenu, setShowListMenu,
    listSettingsDropdown, setListSettingsDropdown,

    // Notifications
    notifications, setNotifications,
    showInbox, setShowInbox,
    inboxTab, setInboxTab,
    soundEnabled, setSoundEnabled,
    toasts, setToasts,

    // Dropdowns
    openDropdown, setOpenDropdown,
    searchAssignedBy, setSearchAssignedBy,
    searchDelegatedBy, setSearchDelegatedBy,
    searchAssignedTo, setSearchAssignedTo,

    // Drag & Drop
    draggedTodo, setDraggedTodo,
    dragOverListId, setDragOverListId,
    dragOverTodoId, setDragOverTodoId,
    draggedList, setDraggedList,
    dragOverListOrder, setDragOverListOrder,
    isDraggingBoard, setIsDraggingBoard,
    startX, setStartX,
    scrollLeft, setScrollLeft,

    // Refs
    titleInputRef,
    descriptionEditorRef,
    autoSaveTimerRef,
    lastSavedTodoRef,
    notificationSoundRef,
    lastNotificationCountRef,
    statusFilterRef,
    executorFilterRef,
    isClosingModalRef,
    hasOpenedFromUrlRef,
    dragCounter,
    boardRef,
    settingsRef
  };
}
