'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Users, Settings, FileText, Plus, Trash2, 
  Shield, Key, RefreshCw, Database, CheckCircle, XCircle,
  AlertTriangle, Info, Loader2, Save, X, Pencil, Phone, Calendar
} from 'lucide-react';

interface User {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  role: 'admin' | 'user';
  todoRole?: 'executor' | 'customer' | 'universal';
  position?: string;
  department?: string;
  phone?: string;
  workSchedule?: string;
  enabledTools?: string[];
  canSeeAllTasks?: boolean;
  isDepartmentHead?: boolean;
  telegramId?: string;
  createdAt: string;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  path: string;
}

const availableTools: Tool[] = [
  { id: 'feed-editor', name: 'Редактор фидов', description: 'Управление фидами для Яндекс.Директ', path: '/feed-editor' },
  { id: 'transliterator', name: 'Транслитератор', description: 'Транслитерация текста', path: '/transliterator' },
  { id: 'slovolov', name: 'Словолов', description: 'Подбор поисковых слов', path: '/slovolov' },
  { id: 'slovolov-pro', name: 'Словолов PRO', description: 'Расширенный подбор ключевых слов', path: '/slovolov-pro' },
  { id: 'utm-generator', name: 'Генератор UTM', description: 'Создание UTM меток', path: '/utm-generator' },
  { id: 'content-plan', name: 'Контент-план', description: 'Планирование контента', path: '/content-plan' },
];

type TabType = 'settings' | 'users' | 'logs';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  
  const [newUser, setNewUser] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    todoRole: 'executor' as 'executor' | 'customer' | 'universal',
    position: '',
    department: '',
    phone: '',
    workSchedule: '',
    telegramId: '',
    canSeeAllTasks: false,
    isDepartmentHead: false
  });
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [dbSize, setDbSize] = useState<string>('Загрузка...');

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const checkAccess = async () => {
      const username = localStorage.getItem('username');
      if (!username) {
        setAccessDenied(true);
        setTimeout(() => router.push('/login'), 2000);
        return;
      }
      
      try {
        const res = await fetch(`/api/users`);
        if (res.ok) {
          const users = await res.json();
          const currentUser = users.find((u: User) => u.username === username || u.email === username);
          if (currentUser) {
            localStorage.setItem('userRole', currentUser.role);
            if (currentUser.role !== 'admin') {
              setAccessDenied(true);
              setTimeout(() => router.push('/'), 2000);
            }
          } else {
            setAccessDenied(true);
            setTimeout(() => router.push('/'), 2000);
          }
        }
      } catch {
        const userRole = localStorage.getItem('userRole');
        if (userRole !== 'admin') {
          setAccessDenied(true);
          setTimeout(() => router.push('/'), 2000);
        }
      }
    };
    
    checkAccess();
  }, [router]);

  useEffect(() => {
    if (!accessDenied) {
      loadUsers();
      loadDatabaseSize();
    }
  }, [accessDenied]);

  const loadDatabaseSize = async () => {
    try {
      const response = await fetch('/api/database/size');
      if (response.ok) {
        const data = await response.json();
        setDbSize(data.size || 'N/A');
      } else {
        console.warn('Database size endpoint not available:', response.status);
        setDbSize('N/A');
      }
    } catch (error) {
      console.error('Error loading database size:', error);
      setDbSize('N/A');
    }
  };

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d0d] flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Доступ запрещён</h1>
          <p className="text-gray-600 dark:text-white/60">У вас нет прав для просмотра этой страницы</p>
          <p className="text-gray-400 dark:text-white/40 text-sm mt-4">Перенаправление на главную...</p>
        </div>
      </div>
    );
  }

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users?includePasswords=true');
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.password) {
      showToast('Заполните логин и пароль', 'warning');
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        showToast('Пользователь создан', 'success');
        setShowUserModal(false);
        setNewUser({ username: '', name: '', email: '', password: '', role: 'user', todoRole: 'executor', position: '', department: '', phone: '', workSchedule: '', telegramId: '', canSeeAllTasks: false, isDepartmentHead: false });
        loadUsers();
      } else {
        const data = await response.json();
        showToast(data.error || 'Ошибка создания пользователя', 'error');
      }
    } catch (error) {
      showToast('Ошибка создания пользователя', 'error');
    }
  };

  const saveEditingUser = async () => {
    if (!editingUser) return;
    
    setSavingUser(true);
    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: editingUser.username,
          name: editingUser.name,
          email: editingUser.email,
          password: editingUser.password,
          role: editingUser.role,
          todoRole: editingUser.todoRole,
          canSeeAllTasks: editingUser.canSeeAllTasks,
          isDepartmentHead: editingUser.isDepartmentHead,
          telegramId: editingUser.telegramId,
          position: editingUser.position,
          department: editingUser.department,
          phone: editingUser.phone,
          workSchedule: editingUser.workSchedule,
          enabledTools: editingUser.enabledTools || []
        })
      });

      if (response.ok) {
        showToast('Пользователь обновлён', 'success');
        setShowEditUserModal(false);
        setEditingUser(null);
        loadUsers();
      } else {
        const data = await response.json();
        showToast(data.error || 'Ошибка обновления', 'error');
      }
    } catch (error) {
      showToast('Ошибка обновления пользователя', 'error');
    } finally {
      setSavingUser(false);
    }
  };

  const openEditUserModal = (user: User) => {
    setEditingUser({ ...user });
    setShowEditUserModal(true);
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Удалить пользователя?')) return;

    try {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (response.ok) {
        showToast('Пользователь удален', 'success');
        loadUsers();
      } else {
        showToast('Ошибка удаления пользователя', 'error');
      }
    } catch (error) {
      showToast('Ошибка удаления пользователя', 'error');
    }
  };

  const toggleTool = async (userId: string, toolId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) {
        showToast('Пользователь не найден', 'error');
        return;
      }

      const currentTools = user.enabledTools || [];
      const enabledTools = currentTools.includes(toolId)
        ? currentTools.filter(t => t !== toolId)
        : [...currentTools, toolId];

      const response = await fetch(`/api/users/${userId}/tools`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledTools })
      });

      if (response.ok) {
        showToast('Доступ обновлен', 'success');
        loadUsers();
        setSelectedUser(prev => prev ? { ...prev, enabledTools } : null);
      } else {
        const data = await response.json();
        showToast(`Ошибка: ${data.error || 'Неизвестная ошибка'}`, 'error');
      }
    } catch (error) {
      showToast('Ошибка обновления доступа', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-[#0d0d0d] overflow-y-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border backdrop-blur-xl flex items-center gap-2 shadow-2xl ${
          toast.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400' :
          toast.type === 'error' ? 'bg-red-50 dark:bg-red-500/20 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400' :
          'bg-yellow-50 dark:bg-yellow-500/20 border-yellow-200 dark:border-yellow-500/30 text-yellow-700 dark:text-yellow-400'
        }`}>
          {toast.type === 'success' && <CheckCircle className="w-4 h-4" />}
          {toast.type === 'error' && <XCircle className="w-4 h-4" />}
          {toast.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
          <span className="text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="h-14 bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-white/5 flex items-center px-6 sticky top-0 z-40">
        <Link
          href="/"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 dark:text-white/40 dark:hover:text-white/70 hover:bg-gray-100 dark:hover:bg-white/5 transition-all mr-4"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-100 to-purple-100 dark:from-cyan-500/20 dark:to-purple-500/20 border border-cyan-200 dark:border-cyan-500/20">
            <Shield className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Панель администратора</h1>
            <p className="text-[10px] text-gray-500 dark:text-white/40">Управление системой</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Users Section */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="w-4 h-4 rounded accent-cyan-600"
              />
              <span className="text-sm text-gray-600 dark:text-white/60">Показать пароли</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUserModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Добавить пользователя
              </button>
              <button
                onClick={() => loadUsers()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-white/60 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all text-sm"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-gray-500 dark:text-white/40" />
                <h3 className="text-gray-900 dark:text-white font-medium">Пользователи</h3>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <Database className="w-3.5 h-3.5 text-gray-500 dark:text-white/40" />
                <span className="text-xs text-gray-600 dark:text-white/60">База данных:</span>
                <span className="text-xs font-medium text-gray-900 dark:text-white">{dbSize}</span>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 text-cyan-600 dark:text-cyan-400 animate-spin mx-auto" />
                <p className="text-gray-500 dark:text-white/40 text-sm mt-3">Загрузка...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 dark:text-white/20 mx-auto" />
                <p className="text-gray-500 dark:text-white/40 text-sm mt-3">Пользователи не найдены</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                {users.map(user => (
                  <div key={user.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        user.role === 'admin' ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60'
                      }`}>
                        {user.role === 'admin' ? <Shield className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 dark:text-white font-medium">{user.name || user.username || 'Без имени'}</span>
                          {user.role === 'admin' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30">
                              Админ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-white/40">
                          <span>@{user.username || user.email}</span>
                          {user.phone && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {user.phone}
                              </span>
                            </>
                          )}
                          {user.schedule && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {user.schedule}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-white/30">
                          {user.position && <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/5 rounded-full">{user.position}</span>}
                          {user.department && <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/5 rounded-full">{user.department}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditUserModal(user)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-white/40 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all"
                          title="Редактировать"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedUser(user); setShowToolsModal(true); }}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white transition-all"
                          title="Управление доступом"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/20 text-gray-400 dark:text-white/40 hover:text-red-600 dark:hover:text-red-400 transition-all"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {showPasswords && user.password && (
                      <div className="mt-3 ml-14 flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-white/30">Пароль:</span>
                        <code className="px-2 py-1 bg-gray-100 dark:bg-white/5 rounded text-xs text-amber-600 dark:text-amber-400 font-mono">
                          {user.password}
                        </code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-2xl max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between sticky top-0 bg-white dark:bg-[#1a1a1a] z-10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Создать пользователя</h2>
              <button
                onClick={() => { setShowUserModal(false); setNewUser({ username: '', name: '', email: '', password: '', role: 'user', todoRole: 'executor', position: '', department: '', phone: '', workSchedule: '', telegramId: '', canSeeAllTasks: false, isDepartmentHead: false }); }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-white/50 mb-2">Логин *</label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="username"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-white/50 mb-2">Имя</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="Иван Иванов"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-white/50 mb-2">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-white/50 mb-2">Пароль *</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-white/50 mb-2">Телефон</label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-white/50 mb-2">График работы</label>
                  <input
                    type="text"
                    value={newUser.workSchedule}
                    onChange={(e) => setNewUser({...newUser, workSchedule: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="Пн-Пт 9:00-18:00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-white/50 mb-2">Должность</label>
                  <input
                    type="text"
                    value={newUser.position || ''}
                    onChange={(e) => setNewUser({...newUser, position: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="Менеджер проектов"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-white/50 mb-2">Отдел</label>
                  <input
                    type="text"
                    value={newUser.department || ''}
                    onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="Отдел разработки"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-6">
                <button
                  onClick={createUser}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-cyan-800 transition-all"
                >
                  Создать
                </button>
                <button
                  onClick={() => { setShowUserModal(false); setNewUser({ username: '', name: '', email: '', password: '', role: 'user', todoRole: 'executor', position: '', department: '', phone: '', workSchedule: '', telegramId: '', canSeeAllTasks: false, isDepartmentHead: false }); }}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-700 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-white/[0.06]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between sticky top-0 bg-white dark:bg-[#1a1a1a] z-10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Редактировать пользователя</h2>
              <button
                onClick={() => { setShowEditUserModal(false); setEditingUser(null); }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-2">Имя пользователя</label>
                <input
                  type="text"
                  value={editingUser.username || ''}
                  onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-2">Полное имя</label>
                <input
                  type="text"
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-2">Email</label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-2">Пароль (оставьте пустым, чтобы не менять)</label>
                <input
                  type="password"
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-2">Роль</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({...editingUser, role: e.target.value as 'admin' | 'user'})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">Пользователь</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-2">Роль в задачах</label>
                  <select
                    value={editingUser.todoRole || 'executor'}
                    onChange={(e) => setEditingUser({...editingUser, todoRole: e.target.value as any})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="executor">Исполнитель</option>
                    <option value="customer">Заказчик</option>
                    <option value="universal">Универсальная</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-2">Должность</label>
                  <input
                    type="text"
                    value={editingUser.position || ''}
                    onChange={(e) => setEditingUser({...editingUser, position: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-2">Отдел</label>
                  <input
                    type="text"
                    value={editingUser.department || ''}
                    onChange={(e) => setEditingUser({...editingUser, department: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-2">Телефон</label>
                  <input
                    type="text"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                    placeholder="+7 (999) 123-45-67"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-2">График работы</label>
                  <input
                    type="text"
                    value={editingUser.workSchedule || ''}
                    onChange={(e) => setEditingUser({...editingUser, workSchedule: e.target.value})}
                    placeholder="Пн-Пт 9:00-18:00"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/60 mb-2">Telegram ID</label>
                <input
                  type="text"
                  value={editingUser.telegramId || ''}
                  onChange={(e) => setEditingUser({...editingUser, telegramId: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                <input
                  type="checkbox"
                  id="editCanSeeAllTasks"
                  checked={editingUser.canSeeAllTasks || false}
                  onChange={(e) => setEditingUser({...editingUser, canSeeAllTasks: e.target.checked})}
                  className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="editCanSeeAllTasks" className="text-sm text-gray-700 dark:text-white/70 cursor-pointer">
                  Может видеть все задачи
                </label>
              </div>

              <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-500/10 rounded-xl border border-purple-200 dark:border-purple-500/20">
                <input
                  type="checkbox"
                  id="editIsDepartmentHead"
                  checked={editingUser.isDepartmentHead || false}
                  onChange={(e) => setEditingUser({...editingUser, isDepartmentHead: e.target.checked})}
                  className="w-4 h-4 rounded border-purple-300 dark:border-purple-500/30 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="editIsDepartmentHead" className="text-sm text-purple-700 dark:text-purple-300 cursor-pointer font-medium">
                  Руководитель отдела (видит все задачи своего отдела)
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-white/[0.06] flex gap-3 justify-end sticky bottom-0 bg-white dark:bg-[#1a1a1a]">
              <button
                onClick={saveEditingUser}
                disabled={savingUser}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Сохранить
              </button>
              <button
                onClick={() => { setShowEditUserModal(false); setEditingUser(null); }}
                className="px-4 py-2.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-700 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tools Modal */}
      {showToolsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-white/[0.06]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between sticky top-0 bg-white dark:bg-[#1a1a1a] z-10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Инструменты: {selectedUser.name || selectedUser.username}
              </h2>
              <button
                onClick={() => { setShowToolsModal(false); setSelectedUser(null); }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {availableTools.map((tool) => {
                const isEnabled = selectedUser.enabledTools?.includes(tool.id);
                return (
                  <div
                    key={tool.id}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isEnabled
                        ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
                        : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                    }`}
                    onClick={() => {
                      const newTools = isEnabled
                        ? selectedUser.enabledTools?.filter(t => t !== tool.id)
                        : [...(selectedUser.enabledTools || []), tool.id];
                      setSelectedUser({ ...selectedUser, enabledTools: newTools });
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">{tool.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-white/60 mt-1">{tool.description}</p>
                      </div>
                      {isEnabled && (
                        <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-white/[0.06] flex gap-3 justify-end sticky bottom-0 bg-white dark:bg-[#1a1a1a]">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/users/${selectedUser.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ enabledTools: selectedUser.enabledTools || [] })
                    });
                    
                    if (response.ok) {
                      showToast('Инструменты обновлены', 'success');
                      setShowToolsModal(false);
                      setSelectedUser(null);
                      loadUsers();
                    } else {
                      showToast('Ошибка обновления', 'error');
                    }
                  } catch (error) {
                    showToast('Ошибка сохранения', 'error');
                  }
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Сохранить
              </button>
              <button
                onClick={() => { setShowToolsModal(false); setSelectedUser(null); }}
                className="px-4 py-2.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-700 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
