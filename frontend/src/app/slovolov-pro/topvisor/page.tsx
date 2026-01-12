'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { Spinner } from '@/components/Spinner';
import { 
  BarChart3, Settings, Loader2, FolderOpen, Globe, TrendingUp, TrendingDown,
  Minus, RefreshCw, Calendar, Search, ChevronRight, AlertCircle, Upload,
  FileText, ArrowUpRight, ArrowDownRight, Users
} from 'lucide-react';

interface Project {
  id: number;
  name: string;
  site: string;
}

interface TopvisorConfig {
  userId: string;
  apiKey: string;
  projectId: string;
}

interface SummaryData {
  improved: number;
  declined: number;
  total: number;
  top10Count: number;
  top10Percent: number;
  lastCheckDate: string | null;
}

export default function TopvisorPage() {
  const router = useRouter();
  const [config, setConfig] = useState<TopvisorConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      loadSummary(projects[0].id);
    }
  }, [projects]);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/topvisor');
      const data = await res.json();
      if (data.success && data.config && data.config.userId && data.config.apiKey) {
        setConfig(data.config);
        loadProjects();
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
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

  const loadSummary = async (projectId: number) => {
    setLoadingSummary(true);
    try {
      // Загружаем позиции для сводки
      const now = new Date();
      const dateTo = now.toISOString().split('T')[0];
      const dateFrom = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const res = await fetch(`/api/topvisor/positions?projectId=${projectId}&date1=${dateFrom}&date2=${dateTo}`);
      const data = await res.json();
      
      console.log('[Summary] API response:', data);
      
      if (data.success && data.keywords && data.keywords.length > 0) {
        const keywords = data.keywords;
        const dates = data.existsDates || data.dates || [];
        
        let improved = 0;
        let declined = 0;
        let top10Count = 0;
        let lastDate: string | null = dates.length > 0 ? dates[dates.length - 1] : null;
        
        keywords.forEach((kw: any) => {
          // positionsData содержит данные в формате { "date": { position: number } }
          const positionsData = kw.positionsData || {};
          const sortedDates = Object.keys(positionsData).sort();
          
          if (sortedDates.length > 0) {
            const lastDateKey = sortedDates[sortedDates.length - 1];
            const currentPos = positionsData[lastDateKey]?.position;
            
            // Текущая позиция в TOP-10
            if (currentPos !== null && currentPos !== undefined && currentPos <= 10) {
              top10Count++;
            }
            
            // Сравниваем с предыдущей датой
            if (sortedDates.length > 1) {
              const prevDateKey = sortedDates[sortedDates.length - 2];
              const prevPos = positionsData[prevDateKey]?.position;
              
              if (currentPos !== null && currentPos !== undefined && 
                  prevPos !== null && prevPos !== undefined) {
                if (currentPos < prevPos) {
                  improved++;
                } else if (currentPos > prevPos) {
                  declined++;
                }
              }
            }
          }
        });
        
        setSummary({
          improved,
          declined,
          total: keywords.length,
          top10Count,
          top10Percent: keywords.length > 0 ? Math.round((top10Count / keywords.length) * 100) : 0,
          lastCheckDate: lastDate
        });
      } else if (data.success) {
        // API успешен, но нет данных
        setSummary({
          improved: 0,
          declined: 0,
          total: 0,
          top10Count: 0,
          top10Percent: 0,
          lastCheckDate: null
        });
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setLoadingSummary(false);
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

  // No config - show setup prompt
  if (!config || !config.userId || !config.apiKey) {
    return (
      <MainLayout>
        <div className="h-full flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="p-4 rounded-2xl bg-cyan-400/10 text-cyan-400 w-fit mx-auto mb-6">
              <BarChart3 className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Добро пожаловать в Топвизор</h1>
            <p className="text-white/50 mb-6">
              Подключите ваш аккаунт Топвизор для отслеживания позиций ключевых слов, анализа конкурентов и мониторинга видимости сайта.
            </p>
            <button
              onClick={() => router.push('/slovolov-pro/topvisor/settings')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-cyan-400 text-black font-medium rounded-xl hover:bg-cyan-300 transition-colors mx-auto"
            >
              <Settings className="w-4 h-4" />
              Настроить подключение
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-none p-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-400/10 text-cyan-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Топвизор</h1>
                <p className="text-white/40 text-xs">Мониторинг позиций и анализ конкурентов</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadProjects}
                disabled={loadingProjects}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loadingProjects ? 'animate-spin' : ''}`} />
                Обновить
              </button>
              <button
                onClick={() => router.push('/slovolov-pro/topvisor/settings')}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm"
              >
                <Settings className="w-4 h-4" />
                Настройки
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingProjects ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Spinner size="lg" className="mx-auto mb-2" />
                <p className="text-white/50 text-sm">Загрузка проектов...</p>
              </div>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">Проекты не найдены</p>
                <p className="text-white/30 text-sm mt-1">Создайте проект в Топвизор или проверьте настройки подключения</p>
              </div>
            </div>
          ) : (
            <>
              {/* Проекты */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => router.push(`/slovolov-pro/topvisor/project/${project.id}`)}
                    className="group p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all text-left"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 rounded-lg bg-cyan-400/10 text-cyan-400 group-hover:bg-cyan-400/20 transition-colors">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/50 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="font-medium text-white mb-1 group-hover:text-cyan-400 transition-colors">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-1 text-white/40 text-sm">
                      <Globe className="w-3 h-3" />
                      {project.site}
                    </div>
                  </button>
                ))}
                
                {/* Подкластеры - рядом с проектами */}
                <button
                  onClick={() => router.push('/slovolov-pro/topvisor/subclusters')}
                  className="group p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl hover:bg-amber-500/10 hover:border-amber-500/30 transition-all text-left"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-amber-400/10 text-amber-400 group-hover:bg-amber-400/20 transition-colors">
                      <Upload className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-amber-400/50 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="font-medium text-white mb-1 group-hover:text-amber-400 transition-colors">
                    Подкластеры
                  </h3>
                  <div className="text-white/40 text-sm">
                    Загрузка групп ключевых слов
                  </div>
                </button>
              </div>
            </>
          )}

          {/* Quick Actions */}
          {projects.length > 0 && (
            <div className="mt-6">
              {/* Быстрые действия - теперь выше сводки */}
              <h2 className="text-sm font-medium text-white/50 mb-4">Быстрые действия</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button
                  onClick={() => router.push('/slovolov-pro/topvisor/positions')}
                  className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-left"
                >
                  <div className="p-2 rounded-lg bg-green-400/10 text-green-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Позиции</h3>
                    <p className="text-white/40 text-sm">Проверка позиций ключевых слов</p>
                  </div>
                </button>

                <button
                  onClick={() => router.push('/slovolov-pro/topvisor/keywords')}
                  className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-left"
                >
                  <div className="p-2 rounded-lg bg-blue-400/10 text-blue-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Ключевые слова</h3>
                    <p className="text-white/40 text-sm">Управление ключевыми словами</p>
                  </div>
                </button>

                <button
                  onClick={() => router.push('/slovolov-pro/topvisor/competitors')}
                  className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-left"
                >
                  <div className="p-2 rounded-lg bg-purple-400/10 text-purple-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Конкуренты</h3>
                    <p className="text-white/40 text-sm">Анализ конкурентов</p>
                  </div>
                </button>
              </div>

              {/* Сводка - отчет об изменениях */}
              <div>
                <h2 className="text-sm font-medium text-white/50 mb-4 flex items-center gap-2">
                  Сводка
                  {loadingSummary && <Loader2 className="w-3 h-3 animate-spin" />}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Карточка: Изменения позиций */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/50 text-sm">Изменения позиций</span>
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-green-400 text-2xl font-bold">↑ {summary?.improved ?? '—'}</span>
                      <span className="text-red-400 text-lg">↓ {summary?.declined ?? '—'}</span>
                    </div>
                    <p className="text-white/30 text-xs mt-2">За последние 7 дней</p>
                  </div>

                  {/* Карточка: Видимость */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/50 text-sm">Видимость TOP-10</span>
                      <BarChart3 className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-white text-2xl font-bold">{summary?.top10Percent ?? '—'}%</span>
                      <span className="text-white/40 text-sm">({summary?.top10Count ?? 0} из {summary?.total ?? 0})</span>
                    </div>
                    <p className="text-white/30 text-xs mt-2">Доля запросов в TOP-10</p>
                  </div>

                  {/* Карточка: Всего запросов */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/50 text-sm">Всего запросов</span>
                      <Search className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-white text-2xl font-bold">
                      {summary?.total ?? '—'}
                    </div>
                    <p className="text-white/30 text-xs mt-2">Отслеживаемых ключевых слов</p>
                  </div>

                  {/* Карточка: Последняя проверка */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/50 text-sm">Последняя проверка</span>
                      <Calendar className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-white text-lg font-medium">
                      {summary?.lastCheckDate 
                        ? new Date(summary.lastCheckDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                        : '—'
                      }
                    </div>
                    <p className="text-white/30 text-xs mt-2">
                      {summary?.lastCheckDate ? 'Дата последнего снимка' : 'Снимите позиции для отчета'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
