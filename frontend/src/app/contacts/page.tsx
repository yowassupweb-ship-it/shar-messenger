'use client';

import { useEffect, useState } from 'react';
import { User, Mail, Phone, Briefcase, Shield, Calendar, MessageCircle, CheckSquare, ArrowLeft, Plus, X, Inbox } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showListModal, setShowListModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactCard, setShowContactCard] = useState(false);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [lists, setLists] = useState<TodoList[]>([]);
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState('#3b82f6');

  useEffect(() => {
    loadContacts();
    loadLists();
  }, []);

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

  // Функция для получения цвета фона отдела
  const getDepartmentColor = (index: number) => {
    const colors = [
      'bg-gradient-to-br from-purple-500/5 to-blue-500/5 border-purple-500/20',
      'bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-blue-500/20',
      'bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20',
      'bg-gradient-to-br from-orange-500/5 to-red-500/5 border-orange-500/20',
      'bg-gradient-to-br from-pink-500/5 to-purple-500/5 border-pink-500/20',
      'bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border-yellow-500/20',
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-[var(--text-tertiary)]">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col overflow-hidden pb-16 md:pb-0">
      {/* Header */}
      <header className="h-12 bg-[var(--bg-secondary)] border-b border-[var(--border-secondary)] flex items-center px-2 md:px-4 flex-shrink-0">
        <Link
          href="/"
          className="no-mobile-scale flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-glass)] text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-all mr-3 border border-[var(--border-glass)] backdrop-blur-sm"
          title="На главную"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
        </Link>
        
        <div className="flex items-center gap-2 mr-2 md:mr-4">
          <User className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="font-medium text-sm">Контакты</span>
          <span className="text-xs text-[var(--text-muted)]">({filteredContacts.length})</span>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени, email, должности, отделу..."
            className="w-full pl-2 md:pl-3 pr-2 md:pr-3 py-1.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          />
        </div>
        
        {/* Статистика по отделам */}
        <div className="hidden lg:flex items-center gap-2 ml-4">
          <span className="text-xs text-[var(--text-muted)]">{sortedDepartments.length} отделов</span>
        </div>
      </header>

      {/* Main Content - только один скролл */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 md:p-3">
        <div className="max-w-6xl mx-auto">

        {/* Contacts grouped by department */}
        <div className="space-y-4 md:space-y-6 pb-4">
          {sortedDepartments.map((department, index) => (
            <div key={department} className={`rounded-xl border p-3 md:p-4 ${getDepartmentColor(index)}`}>
              {/* Department Header */}
              <div className="flex items-center gap-2 md:gap-3 px-1 md:px-2 py-1.5 md:py-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-xs md:text-sm text-[var(--text-primary)]">{department}</h2>
                    <p className="text-[9px] md:text-[10px] text-[var(--text-muted)]">{contactsByDepartment[department].length} сотрудник{contactsByDepartment[department].length === 1 ? '' : contactsByDepartment[department].length < 5 ? 'а' : 'ов'}</p>
                  </div>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-[var(--border-color)] to-transparent"></div>
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
                    className="bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl p-2 md:p-3 hover:bg-[var(--bg-glass-hover)] transition-all group cursor-pointer"
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
                        <div className="flex items-center gap-2 mt-1">
                          {contact.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 md:w-3 md:h-3 text-blue-400" />
                              <span className="text-[9px] md:text-[10px] text-blue-400">{contact.phone}</span>
                            </div>
                          )}
                          {contact.workSchedule && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3 text-orange-400" />
                              <span className="text-[9px] md:text-[10px] text-orange-400">{contact.workSchedule}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Actions - всегда видны на мобильных, при наведении на десктопе */}
                      <div className="flex gap-1 md:gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {contact.email && (
                          <a 
                            href={`mailto:${contact.email}`}
                            className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-500/15 hover:bg-blue-500/25 flex items-center justify-center transition-colors border border-blue-500/20"
                            title={contact.email}
                          >
                            <Mail className="w-3 h-3 md:w-3.5 md:h-3.5 text-blue-400" />
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
                                console.log('[Contacts] Chat created/retrieved:', chat.id);
                                router.push(`/account?tab=messages&chat=${chat.id}`);
                              } else {
                                console.error('[Contacts] Failed to create chat:', res.status, await res.text());
                              }
                            } catch (error) {
                              console.error('[Contacts] Error opening chat:', error);
                            }
                          }}
                          className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-purple-500/15 hover:bg-purple-500/25 flex items-center justify-center transition-colors border border-purple-500/20"
                          title="Написать сообщение"
                        >
                          <MessageCircle className="w-3 h-3 md:w-3.5 md:h-3.5 text-purple-400" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedContact(contact);
                            setShowListModal(true);
                          }}
                          className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-green-500/15 hover:bg-green-500/25 flex items-center justify-center transition-colors border border-green-500/20"
                          title="Поставить задачу"
                        >
                          <CheckSquare className="w-3 h-3 md:w-3.5 md:h-3.5 text-green-400" />
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

      {/* Модалка выбора списка */}
      {showListModal && selectedContact && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#1a1a1a] to-[#151515] border border-white/10 rounded-xl w-full max-w-md shadow-2xl">
            {/* Заголовок */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
              <div>
                <h3 className="font-semibold text-sm">Выберите список</h3>
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
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Списки */}
            <div className="p-4 max-h-[60vh] overflow-y-auto">
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
                        className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-left"
                      >
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: list.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Inbox className="w-4 h-4 text-white/50" />
                            <span className="font-medium text-sm truncate">{list.name}</span>
                          </div>
                        </div>
                        <CheckSquare className="w-4 h-4 text-green-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>

                  {/* Кнопка создания нового списка */}
                  <button
                    onClick={() => setShowNewListForm(true)}
                    className="w-full mt-4 flex items-center justify-center gap-2 p-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg transition-all"
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
                        className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
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
                        className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-sm"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={createNewList}
                        disabled={!newListName.trim()}
                        className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/30 text-white rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowContactCard(false);
            setViewingContact(null);
          }}
        >
          <div 
            className="bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Avatar */}
            <div className="relative h-32 bg-gradient-to-br from-cyan-500/30 to-blue-600/30">
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                <div className="relative">
                  <Avatar
                    type="user"
                    name={viewingContact.name || viewingContact.username || ''}
                    src={viewingContact.avatar}
                    size="2xl"
                    isOnline={viewingContact.isOnline}
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  setShowContactCard(false);
                  setViewingContact(null);
                }}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="pt-14 pb-6 px-6">
              {/* Name & Status */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {viewingContact.name || viewingContact.username || 'Без имени'}
                </h2>
                {viewingContact.position && (
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{viewingContact.position}</p>
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
                  <div className="flex items-center gap-3 p-3 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--text-muted)]">Email</p>
                      <p className="text-sm text-[var(--text-primary)] truncate">{viewingContact.email}</p>
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
                  <div className="flex items-center gap-3 p-3 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--text-muted)]">Телефон</p>
                      <p className="text-sm text-[var(--text-primary)]">{viewingContact.phone}</p>
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
                  <div className="flex items-center gap-3 p-3 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--text-muted)]">Отдел</p>
                      <p className="text-sm text-[var(--text-primary)]">{viewingContact.department}</p>
                    </div>
                  </div>
                )}

                {viewingContact.workSchedule && (
                  <div className="flex items-center gap-3 p-3 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--text-muted)]">График работы</p>
                      <p className="text-sm text-[var(--text-primary)]">{viewingContact.workSchedule}</p>
                    </div>
                  </div>
                )}

                {viewingContact.telegramUsername && (
                  <div className="flex items-center gap-3 p-3 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--text-muted)]">Telegram</p>
                      <p className="text-sm text-[var(--text-primary)]">{viewingContact.telegramUsername}</p>
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
                        router.push(`/account?tab=messages&chat=${chat.id}`);
                      }
                    } catch (error) {
                      console.error('Error opening chat:', error);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-medium transition-colors flex items-center justify-center gap-2"
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
                  className="flex-1 py-2.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400 font-medium transition-colors flex items-center justify-center gap-2"
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
