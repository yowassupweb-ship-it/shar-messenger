'use client';

import { useEffect, useState } from 'react';
import { User, Mail, Phone, Briefcase, Shield, Calendar, MessageCircle, CheckSquare, Plus, X, Inbox, Search, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import Avatar from '@/components/Avatar';

interface Contact {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  position?: string;
  department?: string;
  workSchedule?: string;
  phone?: string;
  avatar?: string;
  role: 'admin' | 'user';
  todoRole?: 'executor' | 'customer' | 'universal';
  telegramId?: string;
  telegramUsername?: string;
  createdAt: string;
  isOnline?: boolean;
  lastSeen?: string;
}

interface TodoList {
  id: string;
  name: string;
  color: string;
  creatorId?: string;
  allowedUsers?: string[];
}

interface ContactTodo {
  id: string;
  title: string;
  completed: boolean;
  status?: 'todo' | 'in-progress' | 'pending' | 'review' | 'cancelled' | 'stuck';
  dueDate?: string;
  assignedToId?: string;
  assignedToIds?: string[];
  assignedById?: string;
  listId?: string;
  archived?: boolean;
}

interface CurrentUserInfo {
  id: string;
  role?: 'admin' | 'user';
  department?: string;
  isDepartmentHead?: boolean;
}

export default function ContactsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactCard, setShowContactCard] = useState(false);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [lists, setLists] = useState<TodoList[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);
  const [contactTodos, setContactTodos] = useState<ContactTodo[]>([]);
  const [isContactTodosLoading, setIsContactTodosLoading] = useState(false);
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState('#3b82f6');
  const [coloredBackgrounds, setColoredBackgrounds] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('contacts_colored_backgrounds');
      return saved === null ? true : saved === 'true';
    }
    return true;
  });

  useEffect(() => {
    loadContacts();
    loadLists();
  }, []);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const username = localStorage.getItem('username');
      if (!username) return;

      try {
        const res = await fetch(`/api/auth/me?username=${encodeURIComponent(username)}`);
        if (!res.ok) return;
        const data = await res.json();
        setCurrentUser({
          id: data.id,
          role: data.role,
          department: data.department,
          isDepartmentHead: data.isDepartmentHead === true
        });
      } catch (error) {
        console.error('Error loading current user:', error);
      }
    };

    loadCurrentUser();
  }, []);

  useEffect(() => {
    const loadContactTodos = async () => {
      if (!showContactCard || !viewingContact || !currentUser?.id) return;

      const canView =
        currentUser.role === 'admin' ||
        (currentUser.isDepartmentHead &&
          currentUser.department &&
          currentUser.department === viewingContact.department);

      if (!canView) return;

      setIsContactTodosLoading(true);
      try {
        const res = await fetch(`/api/todos?userId=${currentUser.id}`);
        if (!res.ok) return;
        const data = await res.json();
        const todosList = Array.isArray(data?.todos) ? data.todos : [];
        const filtered = todosList.filter((todo: ContactTodo) => {
          const isAssignee = todo.assignedToId === viewingContact.id || todo.assignedToIds?.includes(viewingContact.id);
          const isCreator = todo.assignedById === viewingContact.id;
          return isAssignee || isCreator;
        });
        setContactTodos(filtered);
      } catch (error) {
        console.error('Error loading contact todos:', error);
      } finally {
        setIsContactTodosLoading(false);
      }
    };

    loadContactTodos();
  }, [showContactCard, viewingContact?.id, currentUser?.id, currentUser?.role, currentUser?.department, currentUser?.isDepartmentHead]);

  // Управление классом modal-open для скрытия нижнего меню
  useEffect(() => {
    if (showListModal || showContactCard) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showListModal, showContactCard]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('contacts_colored_backgrounds', String(coloredBackgrounds));
    }
  }, [coloredBackgrounds]);

  const loadContacts = async () => {
    try {
      console.log('[Contacts] Loading contacts...');
      const res = await fetch('/api/users');
      console.log('[Contacts] Response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[Contacts] Loaded users:', data);
        setContacts(data);
      } else {
        console.error('[Contacts] Failed to load:', await res.text());
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLists = async () => {
    try {
      const res = await fetch('/api/todos');
      if (res.ok) {
        const data = await res.json();
        setLists(data.lists || []);
      }
    } catch (error) {
      console.error('Error loading lists:', error);
    }
  };

  const createNewList = async () => {
    if (!newListName.trim()) return;
    
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'list',
          name: newListName,
          color: newListColor
        })
      });
      
      if (res.ok) {
        await loadLists();
        setNewListName('');
        setNewListColor('#3b82f6');
        setShowNewListForm(false);
      }
    } catch (error) {
      console.error('Error creating list:', error);
    }
  };

  const createTaskInList = (listId: string) => {
    if (!selectedContact) return;
    
    // Получаем текущего пользователя для заказчика
    const myAccountStr = localStorage.getItem('myAccount');
    if (!myAccountStr) return;
    const myAccount = JSON.parse(myAccountStr);
    
    // Переходим на страницу задач с предзаполненными полями
    router.push(`/todos?createTask=true&listId=${listId}&assignTo=${selectedContact.id}&assignToName=${encodeURIComponent(selectedContact.name || selectedContact.username || '')}&authorId=${myAccount.id}&authorName=${encodeURIComponent(myAccount.name || myAccount.username || '')}`);
  };

  const getTodoStatusLabel = (status?: ContactTodo['status']) => {
    switch (status) {
      case 'todo':
        return 'К выполнению';
      case 'in-progress':
        return 'В работе';
      case 'pending':
        return 'В ожидании';
      case 'review':
        return 'Готово к проверке';
      case 'cancelled':
        return 'Отменена';
      case 'stuck':
        return 'Застряла';
      default:
        return 'Без статуса';
    }
  };

  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.name?.toLowerCase().includes(query) ||
      contact.username?.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query) ||
      contact.position?.toLowerCase().includes(query) ||
      contact.department?.toLowerCase().includes(query)
    );
  });

  // Группировка контактов по отделам
  const contactsByDepartment = filteredContacts.reduce((acc, contact) => {
    const dept = contact.department || 'Без отдела';
    if (!acc[dept]) {
      acc[dept] = [];
    }
    acc[dept].push(contact);
    return acc;
  }, {} as Record<string, Contact[]>);

  // Сортировка отделов (сначала с названием, потом "Без отдела")
  const sortedDepartments = Object.keys(contactsByDepartment).sort((a, b) => {
    if (a === 'Без отдела') return 1;
    if (b === 'Без отдела') return -1;
    return a.localeCompare(b, 'ru');
  });

  const canViewContactTodos = Boolean(
    currentUser &&
      viewingContact &&
      (currentUser.role === 'admin' ||
        (currentUser.isDepartmentHead &&
          currentUser.department &&
          currentUser.department === viewingContact.department))
  );

  // Функция для уменьшения яркости цвета на заданный процент
  const reduceBrightness = (hex: string, percent: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.floor(((num >> 16) & 0xff) * (1 - percent / 100));
    const g = Math.floor(((num >> 8) & 0xff) * (1 - percent / 100));
    const b = Math.floor((num & 0xff) * (1 - percent / 100));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  // Функция для получения стиля фона отдела (Pantone)
  const getDepartmentStyle = (index: number) => {
    const pantoneColors = [
      '#0F4C81', '#FF6F61', '#5F4B8B', '#88B04B', '#955251',
      '#B565A7', '#009B77', '#DD4124', '#D65076', '#45B5AA',
      '#EFC050', '#5A5B9F', '#9B1B30', '#7FCDCD', '#BC243C'
    ];
    
    let backgroundColor = pantoneColors[index % pantoneColors.length];
    
    // Если цветные фоны выключены - уменьшаем яркость на 70%
    if (!coloredBackgrounds) {
      backgroundColor = reduceBrightness(backgroundColor, 70);
    }
    
    return {
        backgroundColor
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-[var(--text-tertiary)]">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="h-full text-[var(--text-primary)] bg-[var(--bg-primary)] flex flex-col overflow-hidden relative">
      {/* Header - поиск как хедер */}
      <div className="absolute top-0 left-0 right-0 z-10 flex-shrink-0 px-3 md:px-4 py-2 md:py-3 border-none">
        <div className="flex items-center gap-2 w-full md:justify-center">
          {/* Search */}
          <div className="relative flex-1 md:flex-none">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white flex items-center justify-center z-10 pointer-events-none">
              <Search className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-[200px] h-10 pl-10 pr-3 bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 border border-white/20 rounded-[20px] text-sm focus:outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-white/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-xl"
            />
          </div>
          
          {/* Color Toggle Button */}
          <button
            onClick={() => setColoredBackgrounds(!coloredBackgrounds)}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 border border-white/20 flex items-center justify-center transition-all duration-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-xl"
            title={coloredBackgrounds ? 'Выключить цветные фоны' : 'Включить цветные фоны'}
          >
            {coloredBackgrounds ? (
              <Eye className="w-5 h-5 text-white" strokeWidth={2.5} />
            ) : (
              <EyeOff className="w-5 h-5 text-white" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>

      {/* Main Content - только один скролл */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-[60px] md:pt-[70px]">
        <div className="p-0 md:p-3">
          <div className="max-w-6xl mx-auto">

        {/* Contacts grouped by department */}
        <div className="space-y-4 md:space-y-6 pb-20">
          {sortedDepartments.map((department, index) => (
            <div key={department} className="rounded-xl border border-white/20 p-2 md:p-4 shadow-lg md:mx-0 mx-2 mt-[10px]" style={getDepartmentStyle(index)}>
              {/* Department Header */}
              <div className="flex items-center gap-2 md:gap-3 px-1 md:px-2 py-1.5 md:py-2 mb-3">
                <div className="flex items-center gap-2">
                  <div>
                    <h2 className="font-semibold text-sm md:text-base text-white drop-shadow-md">{department}</h2>
                    <p className="text-[10px] md:text-xs text-white/90 drop-shadow-sm">{contactsByDepartment[department].length} сотрудник{contactsByDepartment[department].length === 1 ? '' : contactsByDepartment[department].length < 5 ? 'а' : 'ов'}</p>
                  </div>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-white/30 to-transparent"></div>
              </div>

              {/* Department Contacts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-2">
                {contactsByDepartment[department].map(contact => (
                  <div
                    key={contact.id}
                    onClick={() => {
                      setViewingContact(contact);
                      setShowContactCard(true);
                    }}
                    className="bg-white/90 dark:bg-black/40 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-[50px] p-2 md:p-3 hover:bg-white dark:hover:bg-black/60 transition-all duration-200 group cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-2 md:gap-3">
                      {/* Avatar */}
                      <Avatar
                        type="user"
                        name={contact.name || contact.username || ''}
                        src={contact.avatar}
                        size="md"
                        isOnline={contact.isOnline}
                      />

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-xs md:text-sm truncate">
                          {contact.name || contact.username || 'Без имени'}
                        </h3>
                        <p className="text-[10px] md:text-xs text-[var(--text-muted)] truncate">
                          {contact.position || 'Должность не указана'}
                        </p>
                      </div>

                      {/* Quick Actions - всегда видны */}
                      <div className="flex gap-1 md:gap-1.5 transition-opacity">
                        {contact.email && (
                          <a 
                            href={`mailto:${contact.email}`}
                            className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-white/15 to-white/5 hover:from-white/25 hover:to-white/10 border border-white/20 flex items-center justify-center transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_4px_rgba(0,0,0,0.1)] backdrop-blur-md"
                            title={contact.email}
                          >
                            <Mail className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" />
                          </a>
                        )}
                        <button
                          onClick={async () => {
                            try {
                              const myAccountStr = localStorage.getItem('myAccount');
                              if (!myAccountStr) {
                                console.error('[Contacts] myAccount not found in localStorage');
                                return;
                              }
                              const myAccount = JSON.parse(myAccountStr);
                              if (!myAccount.id) {
                                console.error('[Contacts] myAccount.id is missing');
                                return;
                              }
                              
                              console.log('[Contacts] Opening chat with contact:', contact.id);
                              console.log('[Contacts] My account ID:', myAccount.id);
                              
                              // Если это тот же пользователь - открываем избранное
                              if (contact.id === myAccount.id) {
                                console.log('[Contacts] Same user, opening favorites');
                                router.push(`/account?tab=messages&chat=favorites_${myAccount.id}`);
                                return;
                              }
                              
                              console.log('[Contacts] Creating/opening chat...');
                              const res = await fetch('/api/chats', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  participantIds: [myAccount.id, contact.id],
                                  isGroup: false
                                })
                              });
                              
                              if (res.ok) {
                                const chat = await res.json();
                                if (chat && chat.id) {
                                  console.log('[Contacts] Chat created/retrieved:', chat.id);
                                  router.push(`/account?tab=messages&chat=${chat.id}`);
                                } else {
                                  console.error('[Contacts] Invalid chat response:', chat);
                                }
                              } else {
                                console.error('[Contacts] Failed to create chat:', res.status, await res.text());
                              }
                            } catch (error) {
                              console.error('[Contacts] Error opening chat:', error);
                            }
                          }}
                          className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-white/15 to-white/5 hover:from-white/25 hover:to-white/10 border border-white/20 flex items-center justify-center transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_4px_rgba(0,0,0,0.1)] backdrop-blur-md"
                          title="Написать сообщение"
                        >
                          <MessageCircle className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedContact(contact);
                            setShowListModal(true);
                          }}
                          className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-white/15 to-white/5 hover:from-white/25 hover:to-white/10 border border-white/20 flex items-center justify-center transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_4px_rgba(0,0,0,0.1)] backdrop-blur-md"
                          title="Поставить задачу"
                        >
                          <CheckSquare className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredContacts.length === 0 && (
          <div className="text-center py-12 text-[var(--text-muted)]">
            {searchQuery ? 'Ничего не найдено' : 'Нет контактов'}
          </div>
        )}
        </div>
        </div>
      </div>

      {/* Модалка выбора списка */}
      {showListModal && selectedContact && (
        <div className="fixed !inset-0 !p-0 !m-0 bg-black/60 backdrop-blur-sm md:flex md:items-center md:justify-center z-[100] !overflow-hidden md:p-4">
          <div className="!w-full !h-full md:relative md:inset-auto bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl md:border md:border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_4px_24px_rgba(0,0,0,0.4)] rounded-none md:rounded-[24px] md:w-full md:max-w-md md:h-auto md:min-h-0">
            {/* Заголовок */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div>
                <h3 className="font-semibold text-sm text-white">Выберите список</h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Задача для: {selectedContact.name || selectedContact.username}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowListModal(false);
                  setSelectedContact(null);
                  setShowNewListForm(false);
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-all"
              >
                <X className="w-4 h-4 text-white/80" />
              </button>
            </div>

            {/* Списки */}
            <div className="p-4 max-h-[60vh] md:max-h-[80vh] overflow-y-auto">
              {!showNewListForm ? (
                <>
                  <div className="space-y-2">
                    {(() => {
                      const myAccountStr = localStorage.getItem('myAccount');
                      if (!myAccountStr) return [];
                      const myAccount = JSON.parse(myAccountStr);
                      return lists
                        .filter(list => {
                          // Показываем только списки к которым есть доступ
                          if (!myAccount) return false;
                          const isCreator = list.creatorId === myAccount.id;
                          const hasAccess = list.allowedUsers?.includes(myAccount.id);
                          return isCreator || hasAccess;
                        });
                    })().map((list) => (
                      <button
                        key={list.id}
                        onClick={() => {
                          createTaskInList(list.id);
                          setShowListModal(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[20px] transition-all text-left backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                      >
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: list.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Inbox className="w-4 h-4 text-white/50" />
                            <span className="font-medium text-sm truncate text-white">{list.name}</span>
                          </div>
                        </div>
                        <CheckSquare className="w-4 h-4 text-green-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>

                  {/* Кнопка создания нового списка */}
                  <button
                    onClick={() => setShowNewListForm(true)}
                    className="w-full mt-4 flex items-center justify-center gap-2 p-3 bg-[#007aff]/10 hover:bg-[#007aff]/20 text-white border border-[#007aff]/30 rounded-[20px] transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Создать новый список</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Форма создания нового списка */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-2">Название списка</label>
                      <input
                        type="text"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="Введите название..."
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-[20px] text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-white/40 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-2">Цвет</label>
                      <div className="flex gap-2 flex-wrap">
                        {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map((color) => (
                          <button
                            key={color}
                            onClick={() => setNewListColor(color)}
                            className={`w-10 h-10 rounded-lg transition-all ${
                              newListColor === color ? 'ring-2 ring-white/50 scale-110' : ''
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowNewListForm(false)}
                        className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[20px] transition-all text-sm text-white"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={createNewList}
                        disabled={!newListName.trim()}
                        className="flex-1 px-4 py-2.5 bg-[#007aff]/20 hover:bg-[#007aff]/30 disabled:bg-white/5 disabled:text-white/30 text-white border border-[#007aff]/30 rounded-[20px] transition-all text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Создать
                      </button>
                    </div>
                  </div>
                </>
              )}

              {lists.length === 0 && !showNewListForm && (
                <div className="text-center py-8 text-white/50 text-sm">
                  <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Нет доступных списков</p>
                  <p className="text-xs mt-1">Создайте первый список</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модалка карточки контакта */}
      {showContactCard && viewingContact && (
        <div 
          className="fixed !inset-0 !p-0 !m-0 bg-black/60 backdrop-blur-sm md:flex md:items-center md:justify-center z-[100] !overflow-hidden md:p-4"
          onClick={() => {
            setShowContactCard(false);
            setViewingContact(null);
          }}
        >
          <div 
            className="w-full h-full md:h-auto md:relative md:inset-auto bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl md:border md:border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_4px_24px_rgba(0,0,0,0.4)] rounded-none md:rounded-[24px] md:max-w-md overflow-hidden relative md:max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowContactCard(false);
                setViewingContact(null);
              }}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Header with Avatar */}
            <div className="relative bg-gradient-to-br from-white/10 to-white/5 border-b border-white/10 px-6 pt-6 pb-4">
              <div className="flex justify-center">
                <Avatar
                  type="user"
                  name={viewingContact.name || viewingContact.username || ''}
                  src={viewingContact.avatar}
                  size="2xl"
                  isOnline={viewingContact.isOnline}
                />
              </div>
            </div>

            {/* Content */}
            <div className="pb-6 px-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              {/* Name & Status */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {viewingContact.name || viewingContact.username || 'Без имени'}
                </h2>
                {viewingContact.position && (
                  <p className="text-sm text-white/70 mt-1">{viewingContact.position}</p>
                )}
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                    viewingContact.isOnline 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${viewingContact.isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
                    {viewingContact.isOnline ? 'В сети' : 'Не в сети'}
                  </span>
                  {viewingContact.role === 'admin' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400">
                      <Shield className="w-3 h-3" />
                      Админ
                    </span>
                  )}
                </div>
              </div>

              {/* Info Grid */}
              <div className="space-y-3">
                {viewingContact.email && (
                  <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-[20px] backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/60">Email</p>
                      <p className="text-sm text-white truncate">{viewingContact.email}</p>
                    </div>
                    <a 
                      href={`mailto:${viewingContact.email}`}
                      className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                    >
                      <Mail className="w-4 h-4 text-blue-400" />
                    </a>
                  </div>
                )}

                {viewingContact.phone && (
                  <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-[20px] backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                    <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/60">Телефон</p>
                      <p className="text-sm text-white">{viewingContact.phone}</p>
                    </div>
                    <a 
                      href={`tel:${viewingContact.phone}`}
                      className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                    >
                      <Phone className="w-4 h-4 text-green-400" />
                    </a>
                  </div>
                )}

                {viewingContact.department && (
                  <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-[20px] backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/60">Отдел</p>
                      <p className="text-sm text-white">{viewingContact.department}</p>
                    </div>
                  </div>
                )}

                {viewingContact.workSchedule && (
                  <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-[20px] backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/60">График работы</p>
                      <p className="text-sm text-white">{viewingContact.workSchedule}</p>
                    </div>
                  </div>
                )}

                {viewingContact.telegramUsername && (
                  <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-[20px] backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/60">Telegram</p>
                      <p className="text-sm text-white">{viewingContact.telegramUsername}</p>
                    </div>
                    <a 
                      href={`https://t.me/${viewingContact.telegramUsername.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-cyan-500/20 rounded-lg transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 text-cyan-400" />
                    </a>
                  </div>
                )}
              </div>

              {canViewContactTodos && (
                <div className="mt-6">
                  <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Задачи контакта</div>
                  <div className="space-y-2">
                    {isContactTodosLoading && (
                      <div className="text-xs text-white/50">Загрузка задач...</div>
                    )}
                    {!isContactTodosLoading && contactTodos.length === 0 && (
                      <div className="text-xs text-white/50">Нет задач для отображения</div>
                    )}
                    {!isContactTodosLoading && contactTodos.map(todo => {
                      const listName = lists.find(list => list.id === todo.listId)?.name;
                      return (
                        <div
                          key={todo.id}
                          className="p-3 bg-white/5 border border-white/10 rounded-[18px] backdrop-blur-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm text-white truncate">
                                {todo.title}
                              </div>
                              <div className="text-[10px] text-white/50 mt-1">
                                {getTodoStatusLabel(todo.status)}
                                {listName ? ` • ${listName}` : ''}
                              </div>
                            </div>
                            {todo.dueDate && (
                              <div className="text-[10px] text-white/40 whitespace-nowrap">
                                {new Date(todo.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                              </div>
                            )}
                          </div>
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => {
                                router.push(`/account?tab=tasks&task=${todo.id}`);
                                setShowContactCard(false);
                                setViewingContact(null);
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] text-blue-200 hover:text-blue-100 bg-blue-500/20 hover:bg-blue-500/30 rounded-full border border-blue-500/30 transition-all"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Перейти к задаче
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={async () => {
                    try {
                      const myAccountStr = localStorage.getItem('myAccount');
                      if (!myAccountStr) return;
                      const myAccount = JSON.parse(myAccountStr);
                      if (!myAccount.id || viewingContact.id === myAccount.id) return;
                      
                      const res = await fetch('/api/chats', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          participantIds: [myAccount.id, viewingContact.id],
                          isGroup: false
                        })
                      });
                      
                      if (res.ok) {
                        const chat = await res.json();
                        if (chat && chat.id) {
                          router.push(`/account?tab=messages&chat=${chat.id}`);
                        } else {
                          console.error('[Contacts] Invalid chat response:', chat);
                        }
                      }
                    } catch (error) {
                      console.error('Error opening chat:', error);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-[20px] bg-purple-500/20 hover:bg-purple-500/30 text-white font-medium transition-all flex items-center justify-center gap-2 border border-purple-500/30"
                >
                  <MessageCircle className="w-4 h-4" />
                  Написать
                </button>
                <button
                  onClick={() => {
                    setSelectedContact(viewingContact);
                    setShowContactCard(false);
                    setShowListModal(true);
                  }}
                  className="flex-1 py-2.5 rounded-[20px] bg-green-500/20 hover:bg-green-500/30 text-white font-medium transition-all flex items-center justify-center gap-2 border border-green-500/30"
                >
                  <CheckSquare className="w-4 h-4" />
                  Задача
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
