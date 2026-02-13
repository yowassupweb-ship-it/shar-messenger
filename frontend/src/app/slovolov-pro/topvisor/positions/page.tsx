'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import PositionSparkline from '@/components/charts/PositionSparkline';
import PositionsChart from '@/components/charts/PositionsChart';
import { Spinner } from '@/components/Spinner/Spinner';
import { 
  ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus,
  RefreshCw, AlertCircle, Calendar, Globe, Search, ChevronRight, 
  BarChart3, X, CheckCircle, FolderOpen, ExternalLink, ArrowUpDown, 
  Table, LineChart, Activity, Target, Award, Zap, Filter, Eye, EyeOff
} from 'lucide-react';

type ViewMode = 'chart' | 'table';

interface Project {
  id: number;
  name: string;
  site: string;
}

interface Keyword {
  id: number;
  name: string;
  group_id: number;
}

interface Group {
  id: number;
  name: string;
}

interface PositionData {
  keyword_id: number;
  keyword_name?: string;
  positions: {
    date: string;
    position: number | null;
    relevant_url?: string;
  }[];
  current_position: number | null;
  change: number;
  relevant_url?: string;
  volume?: number; // Частота запроса Wordstat
  topvisorVolume?: number; // Частота запроса Topvisor
  urlChanged?: boolean; // URL изменился
  previousUrl?: string; // Предыдущий URL
  urlHistory?: Array<{ date: string; url: string }>; // История URL
}

interface UrlChange {
  changed: boolean;
  previousUrl?: string;
  history: Array<{ date: string; url: string }>;
}

type SortType = 'alpha' | 'volume' | 'topvisorVolume' | 'position';
type SortDirection = 'asc' | 'desc';

export default function PositionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [wordstatVolumes, setWordstatVolumes] = useState<Record<number, number>>({}); // Частота Wordstat
  const [topvisorVolumes, setTopvisorVolumes] = useState<Record<number, number>>({}); // Частота Topvisor
  const [urlChanges, setUrlChanges] = useState<Record<number, UrlChange>>({});
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [checkingPositions, setCheckingPositions] = useState(false);
  const [collectingVolumes, setCollectingVolumes] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error' | 'info'; title: string; text: string } | null>(null);
  const [showPositionConfirm, setShowPositionConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '14d' | '30d' | '90d' | 'custom'>('7d');
  const [customDateFrom, setCustomDateFrom] = useState<string>('');
  const [customDateTo, setCustomDateTo] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [sortType, setSortType] = useState<SortType>('alpha');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Загружаем сохранённые настройки периода и сортировки
  useEffect(() => {
    const savedDateRange = localStorage.getItem('topvisor-date-range');
    const savedDateFrom = localStorage.getItem('topvisor-date-from');
    const savedDateTo = localStorage.getItem('topvisor-date-to');
    const savedSortType = localStorage.getItem('topvisor-sort-type');
    const savedSortDirection = localStorage.getItem('topvisor-sort-direction');
    
    if (savedDateRange) {
      setDateRange(savedDateRange as any);
    }
    if (savedDateFrom) {
      setCustomDateFrom(savedDateFrom);
    }
    if (savedDateTo) {
      setCustomDateTo(savedDateTo);
    }
    if (savedSortType) {
      setSortType(savedSortType as SortType);
    }
    if (savedSortDirection) {
      setSortDirection(savedSortDirection as SortDirection);
    }
  }, []);

  // Сохраняем настройки периода при изменении
  const handleDateRangeChange = (value: '7d' | '14d' | '30d' | '90d' | 'custom') => {
    setDateRange(value);
    localStorage.setItem('topvisor-date-range', value);
  };

  const handleCustomDateFromChange = (value: string) => {
    setCustomDateFrom(value);
    localStorage.setItem('topvisor-date-from', value);
  };

  const handleCustomDateToChange = (value: string) => {
    setCustomDateTo(value);
    localStorage.setItem('topvisor-date-to', value);
  };

  // Сохраняем настройки сортировки
  const handleSortChange = (type: SortType) => {
    if (sortType === type) {
      // Если тот же тип - меняем направление
      const newDir = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDir);
      localStorage.setItem('topvisor-sort-direction', newDir);
    } else {
      setSortType(type);
      setSortDirection('asc');
      localStorage.setItem('topvisor-sort-type', type);
      localStorage.setItem('topvisor-sort-direction', 'asc');
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectData();
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/topvisor/projects');
      const data = await res.json();
      if (data.success && data.projects) {
        setProjects(data.projects);
        if (data.projects.length > 0) {
          setSelectedProject(data.projects[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectData = async () => {
    if (!selectedProject) return;
    
    try {
      // Load groups
      const groupsRes = await fetch(`/api/topvisor/groups?projectId=${selectedProject}`);
      const groupsData = await groupsRes.json();
      if (groupsData.success) {
        setGroups(groupsData.groups || []);
      }

      // Load keywords
      const keywordsRes = await fetch(`/api/topvisor/keywords?projectId=${selectedProject}`);
      const keywordsData = await keywordsRes.json();
      if (keywordsData.success) {
        setKeywords(keywordsData.keywords || []);
        
        // Загружаем частоту для всех ключевых слов из локальной базы Wordstat
        if (keywordsData.keywords?.length > 0) {
          loadVolumes(keywordsData.keywords);
          loadTopvisorVolumes(keywordsData.keywords);
          
          // Автоматически загружаем позиции (используется кэш)
          await loadPositionsAuto(keywordsData.keywords);
        }
      }
    } catch (error) {
      console.error('Error loading project data:', error);
    }
  };

  const loadVolumes = async (kws: Keyword[]) => {
    if (kws.length === 0) return;
    
    try {
      // Загружаем частоты из локальных файлов Wordstat
      const res = await fetch('/api/topvisor/local-volumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: kws.map(k => ({ id: k.id, name: k.name }))
        })
      });
      
      const data = await res.json();
      
      if (data.success && data.volumes) {
        setWordstatVolumes(data.volumes);
        console.log(`[Wordstat] Загружено ${data.matched} из ${kws.length} (всего в базе: ${data.totalInDatabase})`);
      }
    } catch (error) {
      console.error('Error loading volumes:', error);
    }
  };

  const loadTopvisorVolumes = async (kws: Keyword[]) => {
    if (!selectedProject || kws.length === 0) return;
    
    try {
      // Загружаем частоты из API Topvisor
      const res = await fetch('/api/topvisor/volumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          keywordIds: kws.map(k => k.id)
        })
      });
      
      const data = await res.json();
      
      if (data.success && data.volumes) {
        setTopvisorVolumes(data.volumes);
        console.log(`[Topvisor] Загружено частот: ${Object.keys(data.volumes).length}`);
      }
    } catch (error) {
      console.error('Error loading Topvisor volumes:', error);
    }
  };

  const loadPositionsAuto = async (kws: Keyword[]) => {
    if (!selectedProject || kws.length === 0) return;
    
    setLoadingPositions(true);
    try {
      const keywordIds = kws.map(k => k.id);
      
      const res = await fetch('/api/topvisor/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          keywordIds
        })
      });
      
      const data = await res.json();
      
      if (data.success && data.positions) {
        processPositionsData(data.positions, kws);
        setIsCached(data.cached || false);
        setLastUpdated(data.lastUpdated || null);
        
        // Сохраняем изменения URL
        if (data.urlChanges) {
          setUrlChanges(data.urlChanges);
        }
      }
    } catch (error) {
      console.error('Error auto-loading positions:', error);
    } finally {
      setLoadingPositions(false);
    }
  };

  const processPositionsData = (positionsData: any[], kws: Keyword[]) => {
    const positionMap: Record<number, PositionData> = {};
    
    kws.forEach(kw => {
      positionMap[kw.id] = {
        keyword_id: kw.id,
        keyword_name: kw.name,
        positions: [],
        current_position: null,
        change: 0
      };
    });
    
    positionsData.forEach((pos: any) => {
      if (positionMap[pos.keyword_id]) {
        positionMap[pos.keyword_id].positions.push({
          date: pos.date,
          position: pos.position,
          relevant_url: pos.relevant_url
        });
      }
    });
    
    // Calculate current position and change (comparing first vs last date in period)
    Object.values(positionMap).forEach(pd => {
      if (pd.positions.length > 0) {
        // Сортируем по дате: от новых к старым
        pd.positions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latest = pd.positions[0]; // Самая свежая позиция
        const oldest = pd.positions[pd.positions.length - 1]; // Самая старая позиция в периоде
        
        pd.current_position = latest.position;
        pd.relevant_url = latest.relevant_url;
        
        // Изменение = старая позиция - новая позиция (положительное = рост)
        if (pd.positions.length > 1 && pd.current_position !== null && oldest.position !== null) {
          pd.change = oldest.position - pd.current_position;
        }
      }
    });
    
    setPositions(Object.values(positionMap));
  };

  const loadPositions = async () => {
    if (!selectedProject || keywords.length === 0) return;
    
    setLoadingPositions(true);
    try {
      let dateFrom: string;
      let dateTo: string;
      
      if (dateRange === 'custom') {
        if (!customDateFrom || !customDateTo) {
          setModalMessage({
            type: 'error',
            title: 'Ошибка',
            text: 'Укажите обе даты для произвольного периода'
          });
          setLoadingPositions(false);
          return;
        }
        dateFrom = customDateFrom;
        dateTo = customDateTo;
      } else {
        const days = parseInt(dateRange);
        dateTo = new Date().toISOString().split('T')[0];
        dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }
      
      const keywordIds = keywords.map(k => k.id);
      
      const res = await fetch('/api/topvisor/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          keywordIds,
          dateFrom,
          dateTo,
          forceRefresh: true // Принудительное обновление кэша
        })
      });
      
      const data = await res.json();
      
      if (data.success && data.positions) {
        processPositionsData(data.positions, keywords);
        setIsCached(false);
        setLastUpdated(new Date().toISOString());
        
        // Сохраняем изменения URL
        if (data.urlChanges) {
          setUrlChanges(data.urlChanges);
          
          // Показываем уведомление если есть изменения URL
          const changedCount = Object.values(data.urlChanges as Record<number, UrlChange>).filter(c => c.changed).length;
          if (changedCount > 0) {
            setModalMessage({
              type: 'info',
              title: 'Обнаружены изменения URL',
              text: `У ${changedCount} ключевых слов изменился релевантный URL. Измененные URL отмечены оранжевым цветом.`
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading positions:', error);
    } finally {
      setLoadingPositions(false);
    }
  };

  const startPositionCheck = async () => {
    if (!selectedProject) return;
    
    setShowPositionConfirm(false);
    setCheckingPositions(true);
    try {
      const res = await fetch('/api/topvisor/check-positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject })
      });
      const data = await res.json();
      
      if (data.success) {
        if (data.alreadyRunning) {
          setModalMessage({
            type: 'info',
            title: 'Проверка уже запущена',
            text: 'Проверка позиций уже выполняется. Подождите несколько минут и нажмите "Загрузить".'
          });
        } else {
          setModalMessage({
            type: 'success',
            title: 'Проверка запущена',
            text: 'Проверка позиций запущена! Результаты появятся через несколько минут. Нажмите "Загрузить" после завершения.'
          });
        }
      } else {
        setModalMessage({
          type: 'error',
          title: 'Ошибка',
          text: data.error || 'Неизвестная ошибка'
        });
      }
    } catch (error) {
      console.error('Error starting position check:', error);
      setModalMessage({
        type: 'error',
        title: 'Ошибка',
        text: 'Ошибка запуска проверки позиций'
      });
    } finally {
      setCheckingPositions(false);
    }
  };

  // Перезагрузить частоту из локальной базы Wordstat
  const reloadLocalVolumes = async () => {
    if (keywords.length === 0) return;
    
    setCollectingVolumes(true);
    try {
      const res = await fetch('/api/topvisor/local-volumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keywords.map(k => ({ id: k.id, name: k.name }))
        })
      });
      
      const data = await res.json();
      
      if (data.success && data.volumes) {
        setWordstatVolumes(data.volumes);
        setModalMessage({
          type: 'success',
          title: 'Частота Wordstat загружена',
          text: `Найдено ${data.matched} из ${keywords.length} запросов (всего в базе: ${data.totalInDatabase})`
        });
      } else {
        setModalMessage({
          type: 'error',
          title: 'Ошибка',
          text: data.error || 'Не удалось загрузить частоту'
        });
      }
    } catch (error) {
      console.error('Error loading local volumes:', error);
      setModalMessage({
        type: 'error',
        title: 'Ошибка',
        text: 'Ошибка загрузки частоты из локальной базы'
      });
    } finally {
      setCollectingVolumes(false);
    }
  };

  // Перезагрузить частоту из Topvisor API
  const reloadTopvisorVolumes = async () => {
    if (!selectedProject || keywords.length === 0) return;
    
    setCollectingVolumes(true);
    try {
      const res = await fetch('/api/topvisor/volumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          keywordIds: keywords.map(k => k.id)
        })
      });
      
      const data = await res.json();
      
      if (data.success && data.volumes) {
        setTopvisorVolumes(data.volumes);
        setModalMessage({
          type: 'success',
          title: 'Частота Topvisor загружена',
          text: `Загружено частот: ${Object.keys(data.volumes).length}`
        });
      } else {
        setModalMessage({
          type: 'error',
          title: 'Ошибка',
          text: data.error || 'Не удалось загрузить частоту Topvisor'
        });
      }
    } catch (error) {
      console.error('Error loading Topvisor volumes:', error);
      setModalMessage({
        type: 'error',
        title: 'Ошибка',
        text: 'Ошибка загрузки частоты из Topvisor'
      });
    } finally {
      setCollectingVolumes(false);
    }
  };

  const filteredPositions = positions.filter(pos => {
    const keyword = keywords.find(k => k.id === pos.keyword_id);
    const matchesSearch = pos.keyword_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === null || keyword?.group_id === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const getPositionColor = (pos: number | null) => {
    if (pos === null) return 'text-white/30';
    if (pos <= 3) return 'text-green-400';
    if (pos <= 10) return 'text-cyan-400';
    if (pos <= 30) return 'text-yellow-400';
    if (pos <= 100) return 'text-orange-400';
    return 'text-red-400';
  };

  const getChangeColor = (change: number) => {
    if (change === 0) return 'text-white/30';
    if (change > 0) return 'text-green-400';
    return 'text-red-400';
  };

  const getChangeIcon = (change: number) => {
    if (change === 0) return <Minus className="w-3 h-3" />;
    if (change > 0) return <TrendingUp className="w-3 h-3" />;
    return <TrendingDown className="w-3 h-3" />;
  };

  const toggleGroup = (groupId: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const expandAllGroups = () => {
    setExpandedGroups(new Set(groups.map(g => g.id)));
  };

  const collapseAllGroups = () => {
    setExpandedGroups(new Set());
  };

  // Функция сортировки позиций
  const sortPositions = (positionsToSort: PositionData[]) => {
    return [...positionsToSort].sort((a, b) => {
      let comparison = 0;
      
      switch (sortType) {
        case 'alpha':
          comparison = (a.keyword_name || '').localeCompare(b.keyword_name || '', 'ru');
          break;
        case 'volume':
          const volA = wordstatVolumes[a.keyword_id] || 0;
          const volB = wordstatVolumes[b.keyword_id] || 0;
          comparison = volB - volA; // По умолчанию от большего к меньшему
          break;
        case 'topvisorVolume':
          const tvVolA = topvisorVolumes[a.keyword_id] || 0;
          const tvVolB = topvisorVolumes[b.keyword_id] || 0;
          comparison = tvVolB - tvVolA; // По умолчанию от большего к меньшему
          break;
        case 'position':
          const posA = a.current_position ?? 999;
          const posB = b.current_position ?? 999;
          comparison = posA - posB; // По умолчанию от лучшей к худшей
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Группируем позиции по группам
  const groupedPositions = groups.map(group => {
    const groupKeywords = keywords.filter(k => k.group_id === group.id);
    const groupPositions = filteredPositions.filter(pos => {
      const keyword = keywords.find(k => k.id === pos.keyword_id);
      return keyword?.group_id === group.id;
    });
    
    // Добавляем частоту и данные об изменении URL к позициям и сортируем
    const positionsWithVolume = groupPositions.map(p => {
      const urlChange = urlChanges[p.keyword_id];
      return {
        ...p,
        volume: wordstatVolumes[p.keyword_id] || 0,
        topvisorVolume: topvisorVolumes[p.keyword_id] || 0,
        urlChanged: urlChange?.changed || false,
        previousUrl: urlChange?.previousUrl,
        urlHistory: urlChange?.history || []
      };
    });
    const sortedPositions = sortPositions(positionsWithVolume);
    
    const groupStats = {
      total: groupPositions.length,
      top3: groupPositions.filter(p => p.current_position !== null && p.current_position <= 3).length,
      top10: groupPositions.filter(p => p.current_position !== null && p.current_position <= 10).length,
      top30: groupPositions.filter(p => p.change > 0).length,
      improved: groupPositions.filter(p => p.change > 0).length,
      declined: groupPositions.filter(p => p.change < 0).length,
    };
    
    return {
      group,
      positions: sortedPositions,
      stats: groupStats
    };
  }).filter(g => g.positions.length > 0);

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  // Уникальные даты из всех позиций (для таблицы в стиле Топвизора)
  const allDates = Array.from(
    new Set(
      filteredPositions.flatMap(p => p.positions.map(pos => pos.date))
    )
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // От новых к старым

  // Форматирование даты для заголовка (короткое)
  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  // Получить позицию для конкретной даты
  const getPositionForDate = (pos: PositionData, dateStr: string) => {
    const found = pos.positions.find(p => p.date === dateStr);
    return found?.position ?? null;
  };

  // Цвет позиции
  const getPositionBgColor = (pos: number | null) => {
    if (pos === null) return '';
    if (pos <= 3) return 'bg-emerald-500/20 text-emerald-400';
    if (pos <= 10) return 'bg-green-500/20 text-green-400';
    if (pos <= 30) return 'bg-yellow-500/20 text-yellow-400';
    if (pos <= 50) return 'bg-orange-500/20 text-orange-400';
    if (pos <= 100) return 'bg-red-500/20 text-red-400';
    return 'bg-red-900/20 text-red-500';
  };

  // Stats
  const stats = {
    total: filteredPositions.length,
    top3: filteredPositions.filter(p => p.current_position !== null && p.current_position <= 3).length,
    top10: filteredPositions.filter(p => p.current_position !== null && p.current_position <= 10).length,
    top30: filteredPositions.filter(p => p.current_position !== null && p.current_position <= 30).length,
    improved: filteredPositions.filter(p => p.change > 0).length,
    declined: filteredPositions.filter(p => p.change < 0).length,
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
      <div className="h-full flex flex-col">
        {/* Header - компактный */}
        <div className="flex-none px-4 py-2 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/slovolov-pro/topvisor')}
                className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="p-1.5 rounded-lg bg-green-400/10 text-green-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h1 className="text-sm font-bold text-white">Позиции</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value as any)}
                className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-400/50 appearance-none cursor-pointer"
              >
                <option value="7d" className="bg-[#1a1a1a]">7д</option>
                <option value="14d" className="bg-[#1a1a1a]">14д</option>
                <option value="30d" className="bg-[#1a1a1a]">30д</option>
                <option value="90d" className="bg-[#1a1a1a]">90д</option>
                <option value="custom" className="bg-[#1a1a1a]">...</option>
              </select>
              {dateRange === 'custom' && (
                <>
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => handleCustomDateFromChange(e.target.value)}
                    className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-400/50 w-28"
                  />
                  <span className="text-white/30 text-xs">—</span>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => handleCustomDateToChange(e.target.value)}
                    className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-400/50 w-28"
                  />
                </>
              )}
              <button
                onClick={() => setShowPositionConfirm(true)}
                disabled={checkingPositions || !selectedProject}
                className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 text-white/40 rounded-lg hover:text-white/70 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs"
                title="Снять позиции (расходует квоту)"
              >
                {checkingPositions ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart3 className="w-3 h-3" />}
              </button>
              <button
                onClick={loadPositions}
                disabled={loadingPositions || keywords.length === 0}
                className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 text-white/70 rounded-lg hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs"
                title="Обновить данные"
              >
                {loadingPositions ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              </button>
              <button
                onClick={reloadLocalVolumes}
                disabled={collectingVolumes || keywords.length === 0}
                className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-medium"
                title="Частота Wordstat"
              >
                WS
              </button>
              <button
                onClick={reloadTopvisorVolumes}
                disabled={collectingVolumes || keywords.length === 0}
                className="px-2 py-1 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-medium"
                title="Частота Topvisor"
              >
                TV
              </button>
              {lastUpdated && (
                <span className="text-[10px] text-white/30 hidden lg:inline" title={`${isCached ? 'Из кэша' : 'Обновлено'}: ${new Date(lastUpdated).toLocaleString('ru-RU')}`}>
                  {new Date(lastUpdated).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Project & Filters - компактно */}
        <div className="flex-none px-4 py-1.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(parseInt(e.target.value))}
              className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-400/50 appearance-none cursor-pointer max-w-[150px]"
            >
              {projects.map(project => (
                <option key={project.id} value={project.id} className="bg-[#1a1a1a]">
                  {project.name}
                </option>
              ))}
            </select>

            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="w-full pl-7 pr-3 py-1 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 text-xs"
              />
            </div>

            <select
              value={selectedGroup || ''}
              onChange={(e) => setSelectedGroup(e.target.value ? parseInt(e.target.value) : null)}
              className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-400/50 appearance-none cursor-pointer max-w-[120px]"
            >
              <option value="" className="bg-[#1a1a1a]">Все группы</option>
              {groups.map(group => (
                <option key={group.id} value={group.id} className="bg-[#1a1a1a]">
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats & Tabs - компактно */}
        {positions.length > 0 && (
          <div className="flex-none px-4 py-1.5 border-b border-white/5">
            <div className="flex items-center justify-between">
              {/* Stats */}
              <div className="flex items-center gap-3 text-xs">
                <span className="text-white/60">{stats.total}</span>
                <span className="text-green-400">T3:{stats.top3}</span>
                <span className="text-cyan-400">T10:{stats.top10}</span>
                <span className="text-yellow-400">T30:{stats.top30}</span>
                <span className="text-green-400">↑{stats.improved}</span>
                <span className="text-red-400">↓{stats.declined}</span>
              </div>
              
              {/* View Mode Tabs */}
              <div className="flex items-center gap-0.5 p-0.5 bg-white/5 rounded-lg">
                <button
                  onClick={() => setViewMode('chart')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                    viewMode === 'chart'
                      ? 'bg-cyan-400 text-black'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <LineChart className="w-3 h-3" />
                  <span className="hidden sm:inline">График</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                    viewMode === 'table'
                      ? 'bg-cyan-400 text-black'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Table className="w-3 h-3" />
                  <span className="hidden sm:inline">Таблица</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingPositions ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Spinner size="lg" className="mx-auto mb-2" />
                <p className="text-white/50 text-sm">Загрузка позиций...</p>
              </div>
            </div>
          ) : positions.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">Нажмите "Проверить" для загрузки позиций</p>
                <p className="text-white/30 text-sm mt-1">Позиции загружаются из снимков Топвизор</p>
              </div>
            </div>
          ) : filteredPositions.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">Ничего не найдено</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chart View */}
              {viewMode === 'chart' && (
                <div className="space-y-6">
                  {/* Сводный график - улучшенный */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.08] backdrop-blur-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5" />
                    <div className="relative p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-400/20 to-cyan-400/5 border border-cyan-400/20">
                          <Activity className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">Сводная динамика</h3>
                          <p className="text-white/40 text-xs">Распределение позиций по датам</p>
                        </div>
                      </div>
                      <PositionsChart 
                        positions={filteredPositions} 
                        height={180}
                      />
                    </div>
                  </div>
                  
                  {/* Графики по группам - улучшенные карточки */}
                  {groupedPositions.map(({ group, positions: groupPos, stats: groupStats }) => {
                    const progressTop10 = groupStats.total > 0 ? ((groupStats.top10) / groupStats.total) * 100 : 0;
                    
                    return (
                      <div 
                        key={group.id} 
                        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.06] backdrop-blur-xl transition-all hover:border-white/[0.1]"
                      >
                        {/* Gradient accent */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500/50 via-purple-500/50 to-pink-500/50" />
                        
                        <div className="p-5">
                          {/* Header группы */}
                          <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-400/15 to-cyan-400/5 border border-cyan-400/20">
                                  <FolderOpen className="w-5 h-5 text-cyan-400" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0d0d0d] border-2 border-cyan-400/30 flex items-center justify-center">
                                  <span className="text-[9px] font-bold text-cyan-400">{groupStats.total}</span>
                                </div>
                              </div>
                              <div>
                                <h3 className="text-white font-semibold text-lg">{group.name}</h3>
                                <div className="flex items-center gap-4 mt-1.5">
                                  {/* Progress bar */}
                                  <div className="flex items-center gap-2">
                                    <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-cyan-400 to-green-400 rounded-full transition-all duration-500"
                                        style={{ width: `${progressTop10}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-white/40">{progressTop10.toFixed(0)}% в TOP-10</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Stats badges */}
                            <div className="flex items-center gap-2">
                              {groupStats.top3 > 0 && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-xs font-semibold text-emerald-400">{groupStats.top3}</span>
                                </div>
                              )}
                              {groupStats.top10 > 0 && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                                  <Target className="w-3.5 h-3.5 text-cyan-400" />
                                  <span className="text-xs font-semibold text-cyan-400">{groupStats.top10}</span>
                                </div>
                              )}
                              {groupStats.improved > 0 && (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                                  <span className="text-xs font-semibold text-green-400">{groupStats.improved}</span>
                                </div>
                              )}
                              {groupStats.declined > 0 && (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
                                  <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                                  <span className="text-xs font-semibold text-red-400">{groupStats.declined}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Мини-графики ключевых слов - улучшенные карточки */}
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                            {groupPos.slice(0, 24).map(pos => (
                              <div 
                                key={pos.keyword_id}
                                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/[0.05] p-3 hover:border-white/[0.15] hover:from-white/[0.08] transition-all duration-300"
                              >
                                {/* Position badge */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-lg ${
                                    pos.current_position === null ? 'bg-white/5 text-white/30 border border-white/5' :
                                    pos.current_position <= 3 ? 'bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 text-emerald-300 border border-emerald-500/30' :
                                    pos.current_position <= 10 ? 'bg-gradient-to-br from-cyan-500/30 to-cyan-500/10 text-cyan-300 border border-cyan-500/30' :
                                    pos.current_position <= 30 ? 'bg-gradient-to-br from-yellow-500/30 to-yellow-500/10 text-yellow-300 border border-yellow-500/30' :
                                    pos.current_position <= 100 ? 'bg-gradient-to-br from-orange-500/30 to-orange-500/10 text-orange-300 border border-orange-500/30' :
                                    'bg-gradient-to-br from-red-500/30 to-red-500/10 text-red-300 border border-red-500/30'
                                  }`}>
                                    {pos.current_position ?? '—'}
                                  </div>
                                  <div className={`flex items-center gap-0.5 text-xs font-semibold ${
                                    pos.change === 0 ? 'text-white/20' :
                                    pos.change > 0 ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {pos.change !== 0 && (pos.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
                                    {pos.change === 0 ? '—' : pos.change > 0 ? `+${pos.change}` : pos.change}
                                  </div>
                                </div>
                                
                                {/* Sparkline */}
                                <div className="mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                  <PositionSparkline 
                                    positions={pos.positions} 
                                    width={120} 
                                    height={36}
                                    className="w-full"
                                  />
                                </div>
                                
                                {/* Keyword name */}
                                <p className="text-white/70 text-xs truncate group-hover:text-white/90 transition-colors" title={pos.keyword_name}>
                                  {pos.keyword_name}
                                </p>
                                
                                {/* Volume */}
                                {(pos.volume || pos.topvisorVolume) && (
                                  <div className="flex items-center gap-2 mt-1">
                                    {pos.volume && pos.volume > 0 && (
                                      <span className="text-purple-400/60 text-[10px] font-mono">
                                        WS:{pos.volume.toLocaleString('ru-RU')}
                                      </span>
                                    )}
                                    {pos.topvisorVolume && pos.topvisorVolume > 0 && (
                                      <span className="text-cyan-400/60 text-[10px] font-mono">
                                        TV:{pos.topvisorVolume.toLocaleString('ru-RU')}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          {groupPos.length > 24 && (
                            <div className="mt-4 text-center">
                              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-white/40 text-xs">
                                <span>... и ещё {groupPos.length - 24} ключевых слов</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Table View - Улучшенный стиль */}
              {viewMode === 'table' && (
                <div className="space-y-4">
                  {/* Панель инструментов */}
                  <div className="flex items-center gap-3 flex-wrap p-3 rounded-xl bg-gradient-to-r from-white/[0.04] to-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={expandAllGroups}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 text-white/60 rounded-lg hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/10 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Развернуть
                      </button>
                      <button
                        onClick={collapseAllGroups}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 text-white/60 rounded-lg hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/10 transition-all"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        Свернуть
                      </button>
                    </div>
                    
                    <div className="h-5 w-px bg-white/10" />
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/40 flex items-center gap-1">
                        <Filter className="w-3 h-3" />
                        Сортировка:
                      </span>
                      <button
                        onClick={() => handleSortChange('alpha')}
                        className={`px-2.5 py-1 text-xs rounded-lg transition-all border ${
                          sortType === 'alpha' 
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' 
                            : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10 hover:border-white/10'
                        }`}
                      >
                        А-Я {sortType === 'alpha' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </button>
                      <button
                        onClick={() => handleSortChange('position')}
                        className={`px-2.5 py-1 text-xs rounded-lg transition-all border ${
                          sortType === 'position' 
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' 
                            : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10 hover:border-white/10'
                        }`}
                      >
                        Позиция {sortType === 'position' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-auto text-xs text-white/30">
                      <span className="px-2 py-0.5 rounded bg-white/5">{allDates.length} дат</span>
                      <span className="px-2 py-0.5 rounded bg-white/5">{filteredPositions.length} запросов</span>
                    </div>
                  </div>

                  {/* Таблица - улучшенная */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] backdrop-blur-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                            <th className="text-left px-2 py-2 text-white/50 font-medium text-xs w-8">#</th>
                            <th className="text-left px-2 py-2 text-white/50 font-medium text-xs min-w-[180px]">Ключевое слово</th>
                            <th className="text-center px-1.5 py-2 text-purple-400/70 font-medium text-[10px] whitespace-nowrap">WS</th>
                            <th className="text-center px-1.5 py-2 text-white/50 font-medium text-[10px] whitespace-nowrap">Δ</th>
                            {allDates.slice(0, 10).map(date => (
                              <th key={date} className="text-center px-0.5 py-1.5 text-white/30 font-medium text-[9px] whitespace-nowrap min-w-[28px]">
                                {formatDateShort(date)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {groupedPositions.map(({ group, positions: groupPos, stats: groupStats }) => {
                            const isExpanded = expandedGroups.has(group.id);
                            const progressTop10 = groupStats.total > 0 ? ((groupStats.top10) / groupStats.total) * 100 : 0;
                            
                            return (
                              <React.Fragment key={group.id}>
                                {/* Заголовок группы */}
                                <tr 
                                  className="bg-gradient-to-r from-white/[0.04] to-transparent cursor-pointer hover:from-white/[0.08] transition-all border-t border-white/[0.04]"
                                  onClick={() => toggleGroup(group.id)}
                                >
                                  <td colSpan={4 + Math.min(allDates.length, 10)} className="px-3 py-2">
                                    <div className="flex items-center gap-3">
                                      <div className={`p-1.5 rounded-lg bg-white/5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                                        <ChevronRight className="w-4 h-4 text-white/40" />
                                      </div>
                                      <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400/15 to-cyan-400/5 border border-cyan-400/20">
                                        <FolderOpen className="w-4 h-4 text-cyan-400" />
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                          <span className="text-white font-semibold">{group.name}</span>
                                          <span className="text-white/30 text-xs px-2 py-0.5 rounded-full bg-white/5">{groupStats.total}</span>
                                        </div>
                                        {/* Mini progress bar */}
                                        <div className="flex items-center gap-2 mt-1">
                                          <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                              className="h-full bg-gradient-to-r from-cyan-400 to-green-400 rounded-full"
                                              style={{ width: `${progressTop10}%` }}
                                            />
                                          </div>
                                          <span className="text-[9px] text-white/30">{progressTop10.toFixed(0)}%</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs">
                                        {groupStats.top3 > 0 && (
                                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            <Award className="w-3 h-3" />{groupStats.top3}
                                          </span>
                                        )}
                                        {groupStats.top10 > 0 && (
                                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                            <Target className="w-3 h-3" />{groupStats.top10}
                                          </span>
                                        )}
                                        {groupStats.improved > 0 && (
                                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
                                            <TrendingUp className="w-3 h-3" />{groupStats.improved}
                                          </span>
                                        )}
                                        {groupStats.declined > 0 && (
                                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                                            <TrendingDown className="w-3 h-3" />{groupStats.declined}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                                
                                {/* Ключевые слова группы */}
                                {isExpanded && groupPos.map((pos, idx) => (
                                  <tr 
                                    key={pos.keyword_id}
                                    className="border-t border-white/[0.03] hover:bg-white/[0.03] transition-all group"
                                  >
                                    <td className="px-3 py-1.5 text-white/20 text-[10px] font-mono">
                                      {idx + 1}
                                    </td>
                                    <td className="px-3 py-1.5">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-white/80 text-sm group-hover:text-white transition-colors" title={pos.keyword_name}>
                                          {pos.keyword_name}
                                        </span>
                                        {pos.relevant_url && (
                                          <a
                                            href={pos.relevant_url.startsWith('http') ? pos.relevant_url : `https://${pos.relevant_url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-cyan-400/50 hover:text-cyan-400 transition-colors text-[10px] truncate max-w-[280px] flex items-center gap-1"
                                            title={pos.relevant_url}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                                            <span className="truncate">{pos.relevant_url.replace(/^https?:\/\//, '').split('/').slice(0, 3).join('/')}</span>
                                          </a>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span className="text-purple-400/60 text-xs font-mono">
                                        {pos.volume ? pos.volume.toLocaleString('ru-RU') : '—'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                                        pos.change === 0 ? 'text-white/20' :
                                        pos.change > 0 ? 'text-green-400' : 'text-red-400'
                                      }`}>
                                        {pos.change !== 0 && (pos.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
                                        {pos.change === 0 ? '—' : pos.change > 0 ? `+${pos.change}` : pos.change}
                                      </span>
                                    </td>
                                    {allDates.slice(0, 10).map(date => {
                                      const position = getPositionForDate(pos, date);
                                      return (
                                        <td key={date} className="px-0 py-1 text-center">
                                          <span className={`inline-flex items-center justify-center w-6 h-5 rounded text-[9px] font-mono font-semibold ${
                                            position === null ? 'text-white/15' : 
                                            position <= 3 ? 'bg-emerald-500/20 text-emerald-300' :
                                            position <= 10 ? 'bg-cyan-500/20 text-cyan-300' :
                                            position <= 30 ? 'bg-yellow-500/20 text-yellow-300' :
                                            position <= 50 ? 'bg-orange-500/20 text-orange-300' :
                                            position <= 100 ? 'bg-red-500/15 text-red-300' :
                                            'text-red-400/50'
                                          }`}>
                                            {position ?? '—'}
                                          </span>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {allDates.length > 10 && (
                      <div className="px-3 py-2 border-t border-white/[0.05] text-center bg-white/[0.02]">
                        <span className="text-white/30 text-xs">
                          Показано 10 из {allDates.length} дат
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Position Check Confirm Modal */}
      {showPositionConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500" />
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 text-amber-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">Снять позиции?</h3>
                <p className="text-white/60 text-sm mb-3">
                  Эта операция <span className="text-amber-400 font-medium">расходует квоту</span> Топвизора. 
                  Убедитесь, что это действительно необходимо.
                </p>
                <p className="text-white/40 text-xs">
                  Ключевых слов для проверки: <span className="text-white">{keywords.length}</span>
                </p>
              </div>
              <button
                onClick={() => setShowPositionConfirm(false)}
                className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowPositionConfirm(false)}
                className="px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all text-sm font-medium"
              >
                Отмена
              </button>
              <button
                onClick={startPositionCheck}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:shadow-lg hover:shadow-cyan-500/20 transition-all text-sm font-medium"
              >
                Да, снять позиции
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {modalMessage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            {/* Gradient accent */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] ${
              modalMessage.type === 'success' ? 'bg-gradient-to-r from-green-500 via-emerald-400 to-green-500' :
              modalMessage.type === 'error' ? 'bg-gradient-to-r from-red-500 via-pink-500 to-red-500' :
              'bg-gradient-to-r from-cyan-500 via-blue-400 to-cyan-500'
            }`} />
            
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${
                modalMessage.type === 'success' ? 'bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20 text-green-400' :
                modalMessage.type === 'error' ? 'bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/20 text-red-400' :
                'bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20 text-cyan-400'
              }`}>
                {modalMessage.type === 'success' ? <CheckCircle className="w-6 h-6" /> :
                 modalMessage.type === 'error' ? <AlertCircle className="w-6 h-6" /> :
                 <BarChart3 className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">{modalMessage.title}</h3>
                <p className="text-white/60 text-sm">{modalMessage.text}</p>
              </div>
              <button
                onClick={() => setModalMessage(null)}
                className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setModalMessage(null)}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  modalMessage.type === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/20' :
                  modalMessage.type === 'error' ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:shadow-lg hover:shadow-red-500/20' :
                  'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/20'
                }`}
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
