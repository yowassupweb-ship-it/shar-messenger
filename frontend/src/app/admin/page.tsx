'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Users, Settings, FileText, Plus, Trash2, 
  Shield, Key, RefreshCw, Database, CheckCircle, XCircle,
  AlertTriangle, Info, Loader2, Save, X, Pencil
} from 'lucide-react';

interface User {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  role: 'admin' | 'user';
  todoRole?: 'executor' | 'customer' | 'universal';  // Роль в задачах
  position?: string;  // Должность
  department?: string;  // Отдел
  enabledTools?: string[];
  canSeeAllTasks?: boolean;  // Может видеть все задачи (не только свои)
  telegramId?: string;  // Telegram ID для уведомлений
  createdAt: string;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  path: string;
}

// Инструменты которые требуют выдачи доступа (не стандартные)
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
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  
  const [dbStats, setDbStats] = useState({
    size: '',
    lastModified: '',
    counts: { logs: 0, feeds: 0, products: 0, dataSources: 0, chatSessions: 0, aiPresets: 0 }
  });
  
  const [settings, setSettings] = useState({
    metricaCounterId: '',
    metricaToken: '',
    wordstatToken: '',
    wordstatClientId: '',
    deepseekApiKey: '',
    deepseekModel: 'deepseek-chat',
    deepseekMaxTokens: '4096',
    deepseekTemperature: '0.7',
    telegramBotToken: '',
    telegramChatId: '',
    telegramNotifications: false
  });
  
  const [newUser, setNewUser] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    todoRole: 'executor' as 'executor' | 'customer' | 'universal',
    position: '',
    department: '',
    telegramId: '',
    canSeeAllTasks: false
  });
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [editingPassword, setEditingPassword] = useState<{ userId: string; password: string } | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Проверка прав доступа с актуализацией роли с бекенда
  useEffect(() => {
    const checkAccess = async () => {
      const username = localStorage.getItem('username');
      if (!username) {
        setAccessDenied(true);
        setTimeout(() => router.push('/login'), 2000);
        return;
      }
      
      try {
        // Получаем актуальную роль с бекенда
        const res = await fetch(`/api/users`);
        if (res.ok) {
          const users = await res.json();
          const currentUser = users.find((u: User) => u.username === username || u.email === username);
          if (currentUser) {
            // Обновляем роль в localStorage
            localStorage.setItem('userRole', currentUser.role);
            if (currentUser.role !== 'admin') {
              setAccessDenied(true);
              setTimeout(() => router.push('/'), 2000);
            }
          } else {
            setAccessDenied(true);
            setTimeout(() => router.push('/'), 2000);
          }
        } else {
          // Если не удалось получить данные, используем localStorage
          const userRole = localStorage.getItem('userRole');
          if (userRole !== 'admin') {
            setAccessDenied(true);
            setTimeout(() => router.push('/'), 2000);
          }
        }
      } catch {
        // При ошибке используем localStorage
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
      loadSettings();
      loadDbStats();
    }
  }, [accessDenied]);

  // Если доступ запрещён
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Доступ запрещён</h1>
          <p className="text-white/60">У вас нет прав для просмотра этой страницы</p>
          <p className="text-white/40 text-sm mt-4">Перенаправление на главную...</p>
        </div>
      </div>
    );
  }

  const loadDbStats = async () => {
    try {
      const response = await fetch('/api/admin/database-stats');
      if (response.ok) {
        const data = await response.json();
        setDbStats(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики БД:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings({
          metricaCounterId: data.metricaCounterId || '',
          metricaToken: data.metricaToken || '',
          wordstatToken: data.wordstatToken || '',
          wordstatClientId: data.wordstatClientId || '',
          deepseekApiKey: data.deepseekApiKey || '',
          deepseekModel: data.deepseekModel || 'deepseek-chat',
          deepseekMaxTokens: data.deepseekMaxTokens || '4096',
          deepseekTemperature: data.deepseekTemperature || '0.7',
          telegramBotToken: data.telegramBotToken || '',
          telegramChatId: data.telegramChatId || '',
          telegramNotifications: data.telegramNotifications || false
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setSavingSettings(true);
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (response.ok) {
        showToast('Настройки сохранены', 'success');
      } else {
        showToast('Ошибка сохранения настроек', 'error');
      }
    } catch (error) {
      showToast('Ошибка сохранения настроек', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

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

  const updateUserPassword = async (userId: string, newPassword: string) => {
    if (!newPassword.trim()) {
      showToast('Пароль не может быть пустым', 'warning');
      return;
    }
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, password: newPassword })
      });
      if (response.ok) {
        showToast('Пароль обновлён', 'success');
        setEditingPassword(null);
        loadUsers();
      } else {
        showToast('Ошибка обновления пароля', 'error');
      }
    } catch (error) {
      showToast('Ошибка обновления пароля', 'error');
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
        body: JSON.stringify({
          username: newUser.username,
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          todoRole: newUser.todoRole,
          position: newUser.position,
          department: newUser.department,
          telegramId: newUser.telegramId,
          canSeeAllTasks: newUser.canSeeAllTasks
        })
      });

      if (response.ok) {
        showToast('Пользователь создан', 'success');
        setShowUserModal(false);
        setNewUser({ username: '', name: '', email: '', password: '', role: 'user', todoRole: 'executor', position: '', department: '', telegramId: '', canSeeAllTasks: false });
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
          telegramId: editingUser.telegramId,
          position: editingUser.position,
          department: editingUser.department,
          enabledTools: editingUser.enabledTools || []
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        showToast('Пользователь обновлён', 'success');
        setShowEditUserModal(false);
        setEditingUser(null);
        loadUsers();
      } else {
        console.error('Error updating user:', data);
        showToast(data.error || data.details || 'Ошибка обновления', 'error');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('Ошибка обновления пользователя: ' + (error instanceof Error ? error.message : 'Unknown'), 'error');
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

      console.log('Updating tools for user:', userId, 'Tools:', enabledTools);

      const response = await fetch(`/api/users/${userId}/tools`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledTools })
      });

      const data = await response.json();
      console.log('Response:', response.status, data);

      if (response.ok) {
        showToast('Доступ обновлен', 'success');
        loadUsers();
        setSelectedUser(prev => prev ? { ...prev, enabledTools } : null);
      } else {
        showToast(`Ошибка: ${data.error || 'Неизвестная ошибка'}`, 'error');
      }
    } catch (error) {
      console.error('Error updating tools:', error);
      showToast('Ошибка обновления доступа', 'error');
    }
  };

  const tabs = [
    { id: 'settings' as TabType, label: 'Настройки ENV', icon: Settings },
    { id: 'users' as TabType, label: 'Пользователи', icon: Users },
    { id: 'logs' as TabType, label: 'Логи', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 bg-[#0d0d0d] overflow-y-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border backdrop-blur-xl flex items-center gap-2 shadow-2xl ${
          toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
          toast.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
          'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
        }`}>
          {toast.type === 'success' && <CheckCircle className="w-4 h-4" />}
          {toast.type === 'error' && <XCircle className="w-4 h-4" />}
          {toast.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
          <span className="text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="h-14 bg-[#1a1a1a] border-b border-white/5 flex items-center px-6 sticky top-0 z-40">
        <Link
          href="/"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all mr-4"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/20">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Панель администратора</h1>
            <p className="text-[10px] text-white/40">Управление системой</p>
          </div>
        </div>

        {/* DB Stats */}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-white/50">БД:</span>
            <span className="text-xs text-white/80 font-medium">{dbStats.size || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs text-white/50">Логов:</span>
            <span className="text-xs text-white/80 font-medium">{dbStats.counts.logs}</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1 mb-6 p-1 bg-white/5 rounded-xl w-full md:w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                  : 'text-white/50 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Яндекс.Метрика */}
            <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <Key className="w-4 h-4 text-yellow-400" />
                </div>
                <h3 className="text-white font-medium">Яндекс.Метрика</h3>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/50 mb-2">ID счетчика</label>
                  <input
                    type="text"
                    value={settings.metricaCounterId}
                    onChange={(e) => setSettings({...settings, metricaCounterId: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    placeholder="12345678"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2">OAuth токен</label>
                  <input
                    type="password"
                    value={settings.metricaToken}
                    onChange={(e) => setSettings({...settings, metricaToken: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    placeholder="y0_..."
                  />
                </div>
              </div>
            </div>

            {/* Wordstat */}
            <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <Key className="w-4 h-4 text-purple-400" />
                </div>
                <h3 className="text-white font-medium">Yandex Wordstat API</h3>
              </div>
              <div className="p-6">
                <div>
                  <label className="block text-xs text-white/50 mb-2">OAuth токен</label>
                  <input
                    type="password"
                    value={settings.wordstatToken}
                    onChange={(e) => setSettings({...settings, wordstatToken: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    placeholder="AgA..."
                  />
                </div>
              </div>
            </div>

            {/* DeepSeek */}
            <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <Key className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="text-white font-medium">DeepSeek AI</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs text-white/50 mb-2">API ключ</label>
                  <input
                    type="password"
                    value={settings.deepseekApiKey}
                    onChange={(e) => setSettings({...settings, deepseekApiKey: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    placeholder="sk-..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-white/50 mb-2">Модель</label>
                    <select
                      value={settings.deepseekModel}
                      onChange={(e) => setSettings({...settings, deepseekModel: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="deepseek-chat">deepseek-chat</option>
                      <option value="deepseek-reasoner">deepseek-reasoner</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-2">Макс. токенов</label>
                    <input
                      type="number"
                      value={settings.deepseekMaxTokens}
                      onChange={(e) => setSettings({...settings, deepseekMaxTokens: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-2">Temperature</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.deepseekTemperature}
                      onChange={(e) => setSettings({...settings, deepseekTemperature: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Telegram */}
            <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Key className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-white font-medium">Telegram</h3>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/50 mb-2">Bot Token</label>
                  <input
                    type="password"
                    value={settings.telegramBotToken}
                    onChange={(e) => setSettings({...settings, telegramBotToken: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    placeholder="123456:ABC..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2">Chat ID</label>
                  <input
                    type="text"
                    value={settings.telegramChatId}
                    onChange={(e) => setSettings({...settings, telegramChatId: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    placeholder="-1001234567890"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50"
            >
              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Сохранить настройки
            </button>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Add User Button + Show Passwords Toggle */}
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPasswords}
                  onChange={(e) => setShowPasswords(e.target.checked)}
                  className="w-4 h-4 rounded accent-cyan-500"
                />
                <span className="text-sm text-white/60">Показать пароли</span>
              </label>
              <button
                onClick={() => setShowUserModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30 hover:bg-cyan-500/30 transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Добавить пользователя
              </button>
              <button
                onClick={() => loadUsers()}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white/60 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-sm"
                title="Обновить список пользователей"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Users List */}
            <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                <Users className="w-4 h-4 text-white/40" />
                <h3 className="text-white font-medium">Пользователи</h3>
                <span className="text-xs text-white/30 px-2 py-0.5 bg-white/5 rounded-full">{users.length}</span>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                  <p className="text-white/40 text-sm mt-3">Загрузка...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 text-white/20 mx-auto" />
                  <p className="text-white/40 text-sm mt-3">Пользователи не найдены</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {users.map(user => (
                    <div key={user.id} className="px-6 py-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          user.role === 'admin' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/10 text-white/60'
                        }`}>
                          {user.role === 'admin' ? <Shield className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{user.name || user.username || 'Без имени'}</span>
                            {user.role === 'admin' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                Админ
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-white/40">
                            <span>@{user.username || user.email}</span>
                            <span>•</span>
                            <span>{user.enabledTools?.length || 0} инструментов</span>
                            <span>•</span>
                            <span>{new Date(user.createdAt).toLocaleDateString('ru-RU')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditUserModal(user)}
                            className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-cyan-400 transition-all"
                            title="Редактировать"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setSelectedUser(user); setShowToolsModal(true); }}
                            className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
                            title="Управление доступом"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => deleteUser(user.id)}
                              className="p-2 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Password Row */}
                      {showPasswords && (
                        <div className="mt-3 ml-14 flex items-center gap-2">
                          <span className="text-xs text-white/30">Пароль:</span>
                          {editingPassword?.userId === user.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingPassword.password}
                                onChange={(e) => setEditingPassword({ ...editingPassword, password: e.target.value })}
                                className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50 w-40"
                                autoFocus
                              />
                              <button
                                onClick={() => updateUserPassword(user.id, editingPassword.password)}
                                className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingPassword(null)}
                                className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <code className="px-2 py-1 bg-white/5 rounded text-xs text-amber-400 font-mono">
                                {user.password || '—'}
                              </code>
                              <button
                                onClick={() => setEditingPassword({ userId: user.id, password: user.password || '' })}
                                className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60"
                                title="Изменить пароль"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && <LogsTab showToast={showToast} />}
      </div>

      {/* Create User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between sticky top-0 bg-[#1a1a1a] z-10">
              <h2 className="text-lg font-semibold text-white">Создать пользователя</h2>
              <button
                onClick={() => { setShowUserModal(false); setNewUser({ username: '', name: '', email: '', password: '', role: 'user', todoRole: 'executor', position: '', department: '', telegramId: '', canSeeAllTasks: false }); }}
                className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/50 mb-2">Логин *</label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    placeholder="username"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2">Имя</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    placeholder="Иван Иванов"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2">Пароль *</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2">Должность</label>
                  <input
                    type="text"
                    value={newUser.position || ''}
                    onChange={(e) => setNewUser({...newUser, position: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    placeholder="Менеджер проектов"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2">Отдел</label>
                  <input
                    type="text"
                    value={newUser.department || ''}
                    onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    placeholder="Отдел разработки"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2">Роль</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value as 'admin' | 'user'})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="user">Пользователь</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2">Роль в задачах *</label>
                  <select
                    value={newUser.todoRole}
                    onChange={(e) => setNewUser({...newUser, todoRole: e.target.value as 'executor' | 'customer' | 'universal'})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="executor">Исполнитель</option>
                    <option value="customer">Заказчик</option>
                    <option value="universal">Универсальный</option>
                  </select>
                  <p className="text-[10px] text-white/30 mt-1">Определяет, какие задачи может создавать и выполнять пользователь</p>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2">Telegram ID</label>
                  <input
                    type="text"
                    value={newUser.telegramId}
                    onChange={(e) => setNewUser({...newUser, telegramId: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    placeholder="123456789"
                  />
                  <p className="text-[10px] text-white/30 mt-1">Для авторизации через Telegram и уведомлений</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newUser.canSeeAllTasks}
                      onChange={(e) => setNewUser({...newUser, canSeeAllTasks: e.target.checked})}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/50"
                    />
                    <span className="text-sm text-white/70">Видит все задачи</span>
                  </label>
                  <p className="text-[10px] text-white/30">Суперадмин - видит все задачи и события в системе</p>
                </div>
              </div>
              <div className="flex gap-3 pt-6">
                <button
                  onClick={createUser}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all"
                >
                  Создать
                </button>
                <button
                  onClick={() => { setShowUserModal(false); setNewUser({ username: '', name: '', email: '', password: '', role: 'user', todoRole: 'executor', position: '', department: '', telegramId: '', canSeeAllTasks: false }); }}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:bg-white/10 transition-all"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tools Access Modal */}
      {showToolsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-2xl w-full shadow-2xl">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Управление доступом</h2>
                <p className="text-xs text-white/40">{selectedUser.name || selectedUser.username}</p>
              </div>
              <button
                onClick={() => { setShowToolsModal(false); setSelectedUser(null); }}
                className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableTools.map(tool => (
                  <button
                    key={tool.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleTool(selectedUser.id, tool.id);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer ${
                      selectedUser.enabledTools?.includes(tool.id)
                        ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedUser.enabledTools?.includes(tool.id)
                        ? 'bg-cyan-500 border-cyan-500'
                        : 'border-white/30'
                    }`}>
                      {selectedUser.enabledTools?.includes(tool.id) && (
                        <CheckCircle className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium block truncate">{tool.name}</span>
                      <span className="text-[10px] text-white/40 block truncate">{tool.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Редактировать пользователя</h2>
              <button
                onClick={() => { setShowEditUserModal(false); setEditingUser(null); }}
                className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); saveEditingUser(); }} className="p-6">
              {/* Три колонки */}
              <div className="grid grid-cols-3 gap-6">
                {/* Левая колонка */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-white/50 mb-2">Логин</label>
                    <input
                      type="text"
                      value={editingUser.username || ''}
                      onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      placeholder="username"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-2">Имя</label>
                    <input
                      type="text"
                      value={editingUser.name || ''}
                      onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      placeholder="Иван Иванов"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-2">Email</label>
                    <input
                      type="email"
                      value={editingUser.email || ''}
                      onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-2">Должность</label>
                    <input
                      type="text"
                      value={editingUser.position || ''}
                      onChange={(e) => setEditingUser({...editingUser, position: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      placeholder="Менеджер проектов"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-2">Отдел</label>
                    <input
                      type="text"
                      value={editingUser.department || ''}
                      onChange={(e) => setEditingUser({...editingUser, department: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      placeholder="Отдел разработки"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-2">Telegram ID</label>
                    <input
                      type="text"
                      value={editingUser.telegramId || ''}
                      onChange={(e) => setEditingUser({...editingUser, telegramId: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      placeholder="123456789"
                    />
                    <p className="text-[10px] text-white/30 mt-1">ID пользователя в Telegram для уведомлений</p>
                  </div>
                </div>

                {/* Правая колонка */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-white/50 mb-2">Пароль</label>
                    <input
                      type="text"
                      value={editingUser.password || ''}
                      onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-2">Роль</label>
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({...editingUser, role: e.target.value as 'admin' | 'user'})}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="user" className="bg-[#1a1a1a]">Пользователь</option>
                      <option value="admin" className="bg-[#1a1a1a]">Администратор</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-2">Роль в задачах</label>
                    <select
                      value={editingUser.todoRole || 'executor'}
                      onChange={(e) => setEditingUser({...editingUser, todoRole: e.target.value as 'executor' | 'customer' | 'universal'})}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="executor" className="bg-[#1a1a1a]">Исполнитель</option>
                      <option value="customer" className="bg-[#1a1a1a]">Заказчик</option>
                      <option value="universal" className="bg-[#1a1a1a]">Универсальный</option>
                    </select>
                    <p className="text-[10px] text-white/30 mt-1">Определяет, какие задачи может создавать и выполнять</p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={editingUser.canSeeAllTasks || false}
                      onChange={(e) => setEditingUser({...editingUser, canSeeAllTasks: e.target.checked})}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/20"
                    />
                    <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">
                      Может видеть все задачи
                    </span>
                  </label>
                  <p className="text-[10px] text-white/30 -mt-2 pl-7">
                    Если выключено — видит только свои задачи (исполнитель или заказчик)
                  </p>
                </div>

                {/* Третья колонка - Доступ к инструментам */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-white/50 mb-3">Доступ к инструментам</label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {availableTools.map((tool) => (
                        <label key={tool.id} className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-white/5 transition-colors">
                          <input
                            type="checkbox"
                            checked={editingUser.enabledTools?.includes(tool.id) || false}
                            onChange={(e) => {
                              const currentTools = editingUser.enabledTools || [];
                              if (e.target.checked) {
                                setEditingUser({...editingUser, enabledTools: [...currentTools, tool.id]});
                              } else {
                                setEditingUser({...editingUser, enabledTools: currentTools.filter(t => t !== tool.id)});
                              }
                            }}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/20"
                          />
                          <div>
                            <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors block">
                              {tool.name}
                            </span>
                            <span className="text-[10px] text-white/30">{tool.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-[10px] text-white/30 mt-2">Стандартные инструменты (Сообщения, Задачи, Календарь, База ссылок, Настройки) доступны всем</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-6 border-t border-white/10 mt-6">
                <button
                  type="submit"
                  disabled={savingUser}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50"
                >
                  {savingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEditUserModal(false); setEditingUser(null); }}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:bg-white/10 transition-all"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Logs Tab Component
interface Log {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  details?: any;
  status: 'success' | 'error' | 'warning' | 'info';
}

function LogsTab({ showToast }: { showToast: (msg: string, type: 'success' | 'error' | 'warning') => void }) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/logs');
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      showToast('Ошибка загрузки логов', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterType !== 'all' && log.type !== filterType) return false;
    if (filterStatus !== 'all' && log.status !== filterStatus) return false;
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default: return <Info className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-white/40" />
          <h3 className="text-white font-medium">Журнал событий</h3>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none"
          >
            <option value="all">Все типы</option>
            <option value="collection">Коллекции</option>
            <option value="feed">Фиды</option>
            <option value="parser">Парсер</option>
            <option value="system">Система</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none"
          >
            <option value="all">Все статусы</option>
            <option value="success">Успех</option>
            <option value="error">Ошибка</option>
            <option value="warning">Предупреждение</option>
            <option value="info">Информация</option>
          </select>
          <button
            onClick={fetchLogs}
            className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-white/40 text-sm mt-3">Загрузка логов...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center">
          <FileText className="w-12 h-12 text-white/20 mx-auto" />
          <p className="text-white/40 text-sm mt-3">Логи не найдены</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.04] max-h-[600px] overflow-y-auto">
          {filteredLogs.map(log => (
            <div key={log.id} className="px-6 py-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-start gap-3">
                {getStatusIcon(log.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-medium text-white/80 px-2 py-0.5 bg-white/10 rounded">{log.type}</span>
                    <span className="text-[10px] text-white/30">
                      {new Date(log.timestamp).toLocaleString('ru-RU')}
                    </span>
                  </div>
                  <p className="text-sm text-white/70">{log.message}</p>
                  {log.details && (
                    <details className="mt-2">
                      <summary className="text-[10px] text-white/40 cursor-pointer hover:text-white/60">Подробности</summary>
                      <pre className="mt-2 p-2 bg-black/30 rounded-lg text-[10px] text-white/50 overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
