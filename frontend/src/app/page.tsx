'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Languages, Search, TrendingUp, ShoppingBag, Tag, Settings } from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

const tools: Tool[] = [
  {
    id: 'feed-editor',
    name: 'Редактор фидов',
    description: 'Заливка, редактирование и просмотр фидов в таблице и карточках',
    href: '/feed-editor',
    icon: <FileText className="w-6 h-6" />,
    color: 'bg-blue-500'
  },
  {
    id: 'transliterator',
    name: 'Транслитератор',
    description: 'Правильная транслитерация как на сайте',
    href: '/transliterator',
    icon: <Languages className="w-6 h-6" />,
    color: 'bg-green-500'
  },
  {
    id: 'competitor-parser',
    name: 'Парсер Я.Директ',
    description: 'Анализ и извлечение данных из рекламы конкурентов',
    href: '/competitor-parser',
    icon: <Search className="w-6 h-6" />,
    color: 'bg-orange-500'
  },
  {
    id: 'slovolov',
    name: 'Словолов',
    description: 'Подбор поисковых слов и ключевых фраз для рекламных кампаний',
    href: '/slovolov',
    icon: <TrendingUp className="w-6 h-6" />,
    color: 'bg-pink-500'
  },
  {
    id: 'competitor-spy',
    name: 'Товары конкурентов',
    description: 'Парсинг и анализ ассортимента конкурентов по датам',
    href: '/competitors/timeline',
    icon: <ShoppingBag className="w-6 h-6" />,
    color: 'bg-indigo-500'
  },
  {
    id: 'utm-creator',
    name: 'Генератор UTM',
    description: 'Создание и отслеживание UTM меток с помощью Я.Метрики',
    href: '/utm-generator',
    icon: <Tag className="w-6 h-6" />,
    color: 'bg-purple-500'
  }
];

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const username = localStorage.getItem('username') || '';
    const userRole = localStorage.getItem('userRole') || '';
    
    // Обязательная авторизация - редирект если не авторизован
    if (!isAuthenticated || !username) {
      router.push('/login');
      return;
    }
    
    console.log('Username from localStorage:', username);
    console.log('User role from localStorage:', userRole);
    console.log('Is authenticated:', isAuthenticated);
    setCurrentUser(username);
    setIsAdmin(userRole === 'admin');
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header with User Info */}
      <div className="bg-[var(--card)] border-b border-[var(--border)]">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-xl font-bold text-[var(--foreground)]">
            Вокруг света
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 bg-[var(--button)] text-[#1b1b2b] rounded-lg hover:opacity-90 transition-all font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Админ-панель
              </Link>
            )}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                  {mounted && currentUser ? currentUser.charAt(0).toUpperCase() : ''}
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-[var(--foreground)]">
                    {mounted ? currentUser : 'Загрузка...'}
                  </div>
                  {mounted && isAdmin && (
                    <div className="text-xs text-[var(--button)] font-medium">Администратор</div>
                  )}
                </div>
                <svg className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg py-1 z-50">
                  <button
                    onClick={() => {
                      localStorage.removeItem('authToken');
                      localStorage.removeItem('username');
                      localStorage.removeItem('userSession');
                      localStorage.removeItem('isAuthenticated');
                      localStorage.removeItem('userRole');
                      window.location.href = '/login';
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[var(--background)] flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-4">
            Доступные инструменты
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tools.map((tool) => (
            <Link key={tool.id} href={tool.href}>
              <div className="group relative bg-[#252538] border border-[var(--border)] rounded-lg p-6 hover:shadow-lg transition-shadow duration-300 cursor-pointer">
                <div className="flex items-start space-x-4 mb-4">
                  <div className={`p-3 rounded-lg text-white group-hover:scale-110 transition-transform duration-300 ${tool.color}`}>
                    {tool.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2 group-hover:text-[var(--primary)] transition-colors duration-300">
                      {tool.name}
                    </h3>
                    <p className="text-[var(--muted)] text-sm">
                      {tool.description}
                    </p>
                  </div>
                </div>

                <div className="absolute bottom-4 right-4 text-[var(--muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all duration-300">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
