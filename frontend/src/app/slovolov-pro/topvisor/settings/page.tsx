'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { Spinner } from '@/components/Spinner';
import { Settings, Key, User, CheckCircle, XCircle, Loader2, Wallet, Save, ChevronDown, ArrowLeft } from 'lucide-react';

interface TopvisorConfig {
  userId: string;
  apiKey: string;
  projectId: string;
}

interface Project {
  id: number;
  name: string;
  site: string;
}

interface TestResult {
  success: boolean;
  balance?: number;
  currency?: string;
  error?: string;
}

export default function TopvisorSettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<TopvisorConfig>({
    userId: '',
    apiKey: '',
    projectId: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/topvisor');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/topvisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true });
        setTimeout(() => setTestResult(null), 3000);
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setTestResult({ success: false, error: 'Ошибка сохранения' });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/topvisor/test');
      const data = await res.json();
      setTestResult(data);
      
      // If connection successful, load projects
      if (data.success) {
        loadProjects();
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestResult({ success: false, error: 'Ошибка подключения' });
    } finally {
      setTesting(false);
    }
  };

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch('/api/topvisor/projects');
      const data = await res.json();
      if (data.success && data.projects) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="h-full flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => router.push('/slovolov-pro/topvisor')}
              className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-3 rounded-xl bg-cyan-400/10 text-cyan-400">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Настройки Топвизор</h1>
              <p className="text-white/50 text-sm">Подключите ваш аккаунт Топвизор для отслеживания позиций</p>
            </div>
          </div>

          {/* Config Form */}
          <div className="space-y-6">
            {/* User ID */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-white/70">
                <User className="w-4 h-4" />
                User ID
              </label>
              <input
                type="text"
                value={config.userId}
                onChange={(e) => setConfig(prev => ({ ...prev, userId: e.target.value }))}
                placeholder="Введите User ID"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 transition-colors"
              />
              <p className="text-xs text-white/40">
                Найти User ID можно в настройках профиля Топвизор
              </p>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-white/70">
                <Key className="w-4 h-4" />
                API Ключ
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Введите API ключ"
                  className="w-full px-4 py-3 pr-20 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 transition-colors"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-xs"
                >
                  {showApiKey ? 'Скрыть' : 'Показать'}
                </button>
              </div>
              <p className="text-xs text-white/40">
                API ключ генерируется в разделе API Топвизор
              </p>
            </div>

            {/* Test Connection Button */}
            <button
              onClick={testConnection}
              disabled={!config.userId || !config.apiKey || testing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Проверить подключение
            </button>

            {/* Test Result */}
            {testResult && (
              <div className={`p-4 rounded-xl border ${
                testResult.success 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <div>
                        <span className="font-medium">Подключение успешно!</span>
                        {testResult.balance !== undefined && (
                          <div className="flex items-center gap-1 mt-1 text-sm opacity-80">
                            <Wallet className="w-4 h-4" />
                            Баланс: {testResult.balance} {testResult.currency || 'RUB'}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      <span>Ошибка: {testResult.error}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Project Selection */}
            {projects.length > 0 && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-white/70">
                  <ChevronDown className="w-4 h-4" />
                  Проект по умолчанию
                </label>
                <select
                  value={config.projectId}
                  onChange={(e) => setConfig(prev => ({ ...prev, projectId: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-400/50 transition-colors appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#1a1a1a]">Выберите проект</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id} className="bg-[#1a1a1a]">
                      {project.name} ({project.site})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {loadingProjects && (
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Загрузка проектов...
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={saveConfig}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-400 text-black font-medium rounded-xl hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Сохранить настройки
            </button>
          </div>

          {/* Help Section */}
          <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
            <h3 className="text-sm font-medium text-white mb-2">Как получить API ключ?</h3>
            <ol className="text-sm text-white/50 space-y-1 list-decimal list-inside">
              <li>Войдите в аккаунт Топвизор</li>
              <li>Перейдите в Настройки → API</li>
              <li>Создайте новый API ключ</li>
              <li>Скопируйте User ID и API ключ</li>
            </ol>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
