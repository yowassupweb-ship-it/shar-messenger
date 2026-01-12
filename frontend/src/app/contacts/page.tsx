'use client';

import { useEffect, useState } from 'react';
import { User, Mail, Phone, Briefcase, Shield, Calendar, MessageCircle, CheckSquare, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Contact {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  position?: string;
  department?: string;
  role: 'admin' | 'user';
  todoRole?: 'executor' | 'customer' | 'universal';
  telegramId?: string;
  createdAt: string;
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadContacts();
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

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium">Админ</span>;
    }
    return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium">Пользователь</span>;
  };

  const getTodoRoleBadge = (todoRole?: string) => {
    if (!todoRole) return null;
    const colors = {
      executor: 'bg-green-500/20 text-green-400',
      customer: 'bg-blue-500/20 text-blue-400',
      universal: 'bg-purple-500/20 text-purple-400'
    };
    const labels = {
      executor: 'Исполнитель',
      customer: 'Заказчик',
      universal: 'Универсальный'
    };
    return (
      <span className={`px-2 py-1 ${colors[todoRole as keyof typeof colors]} rounded-lg text-xs font-medium`}>
        {labels[todoRole as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-[var(--text-tertiary)]">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      {/* Header */}
      <header className="h-12 bg-[var(--bg-secondary)] border-b border-[var(--border-secondary)] flex items-center px-4 flex-shrink-0">
        <Link
          href="/"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-white/70 hover:bg-[var(--bg-glass)] transition-all mr-3"
          title="На главную"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
        </Link>
        
        <div className="flex items-center gap-2 mr-4">
          <User className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="font-medium text-sm">Контакты</span>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени, email, должности, отделу..."
            className="w-full pl-3 pr-3 py-1.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-xs placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-3 overflow-auto">
        <div className="max-w-6xl mx-auto">

        {/* Contacts List - компактный построчный вид */}
        <div className="space-y-2">
          {filteredContacts.map(contact => (
            <div
              key={contact.id}
              className="bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl p-3 hover:bg-[var(--bg-glass-hover)] transition-all flex items-center gap-3"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {(contact.name || contact.username || 'U')[0].toUpperCase()}
              </div>

              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm truncate">
                    {contact.name || contact.username || 'Без имени'}
                  </h3>
                  {getRoleBadge(contact.role)}
                  {getTodoRoleBadge(contact.todoRole)}
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
                  {contact.position && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {contact.position}
                    </span>
                  )}
                  {contact.department && (
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {contact.department}
                    </span>
                  )}
                  {contact.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {contact.email}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 flex-shrink-0">
                {contact.telegramId && (
                  <button
                    onClick={() => window.open(`https://t.me/${contact.telegramId}`, '_blank')}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-medium transition-all"
                    title="Написать в Telegram"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Telegram</span>
                  </button>
                )}
                <button
                  onClick={async () => {
                    // Создаем чат и переходим к нему
                    try {
                      // Получаем текущего пользователя из API
                      const myAccountStr = localStorage.getItem('myAccount');
                      if (!myAccountStr) {
                        return;
                      }
                      
                      const myAccount = JSON.parse(myAccountStr);
                      
                      // Проверяем, что у нас есть ID пользователя
                      if (!myAccount.id) {
                        return;
                      }
                      
                      // Если пишем себе - открываем Избранное
                      if (contact.id === myAccount.id) {
                        router.push(`/account?tab=messages&chat=favorites_${myAccount.id}`);
                        return;
                      }
                      
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
                        router.push(`/account?tab=messages&chat=${chat.id}`);
                      }
                    } catch (error) {
                      // Игнорируем ошибки создания чата
                    }
                  }}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium transition-all"
                  title="Написать сообщение"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Сообщение</span>
                </button>
                <button
                  onClick={() => router.push(`/todos?createTask=true&assignTo=${contact.id}&assignToName=${encodeURIComponent(contact.name || contact.username || '')}`)
                  }
                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg text-xs font-medium transition-all"
                  title="Поставить задачу"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Задача</span>
                </button>
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
  );
}
