'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import * as XLSX from 'xlsx';

interface ResultItem {
  query: string;
  count: number;
}

interface SubclusterResult {
  subclusterId: string;
  subclusterName: string;
  clusterId: string;
  clusterName: string;
  queries: ResultItem[];
  filteredQueries: ResultItem[];
  totalImpressions: number;
  updatedAt: string;
}

interface Cluster {
  id: string;
  name: string;
  types: { id: string; name: string; path: string }[];
}

interface Filter {
  id: string;
  name: string;
  items: string[];
}

interface SubclusterStats {
  subclusterId: string;
  queriesCount: number;
  filteredCount: number;
  totalImpressions: number;
  updatedAt: string | null;
}

type FrequencyCategory = 'all' | 'high' | 'medium' | 'low';

function ResultPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [subclusterStats, setSubclusterStats] = useState<Record<string, SubclusterStats>>({});
  
  const [selectedSubcluster, setSelectedSubcluster] = useState<string | null>(null);
  const [subclusterData, setSubclusterData] = useState<SubclusterResult | null>(null);
  
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [applyFilters, setApplyFilters] = useState(false);
  
  const [searchText, setSearchText] = useState('');
  const [filterSearchText, setFilterSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FrequencyCategory>('all');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});
  
  // Модалка с минус-словами
  const [showMinusWordsModal, setShowMinusWordsModal] = useState(false);
  
  // Контекстное меню для добавления в фильтры
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, text: string} | null>(null);
  const [selectedText, setSelectedText] = useState('');
  
  // Минимальная частотность (сохраняется в конфигурации подкластера)
  const [minFrequency, setMinFrequency] = useState<number>(0);
  
  // Флаг для предотвращения сохранения сразу после загрузки
  const isLoadingRef = useRef(false);
  
  // Состояние для отслеживания изменений фильтров
  const [hasFilterChanges, setHasFilterChanges] = useState(false);
  const lastSavedFiltersRef = useRef<{filters: string[], apply: boolean}>({filters: [], apply: false});

  const loadData = useCallback(async () => {
    try {
      const [clustersRes, filtersRes, statsRes] = await Promise.all([
        fetch('/api/clusters'),
        fetch('/api/filters'),
        fetch('/api/subcluster-stats'),
      ]);
      
      const clustersData = await clustersRes.json();
      const filtersData = await filtersRes.json();
      const statsData = await statsRes.json();
      
      setClusters(Array.isArray(clustersData) ? clustersData : []);
      setFilters(Array.isArray(filtersData) ? filtersData : []);
      setSubclusterStats(statsData || {});
      
      // Раскрываем все кластеры по умолчанию
      const expanded: Record<string, boolean> = {};
      clustersData.forEach((c: Cluster) => { expanded[c.id] = true; });
      setExpandedClusters(expanded);
      
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSubclusterData = useCallback(async (subclusterId: string) => {
    setIsLoadingResult(true);
    try {
      const res = await fetch(`/api/subcluster-results?id=${encodeURIComponent(subclusterId)}`);
      if (res.ok) {
        const data = await res.json();
        setSubclusterData(data);
        
        // Загружаем настройки из конфигурации подкластера
        if (typeof window !== 'undefined') {
          const configs = localStorage.getItem('subclusterConfigs');
          if (configs) {
            const parsed = JSON.parse(configs);
            const config = parsed.find((c: any) => c.subclusterId === subclusterId);
            if (config) {
              isLoadingRef.current = true;
              
              // Загружаем minFrequency
              if (config.minFrequency !== undefined) {
                setMinFrequency(config.minFrequency);
              } else {
                setMinFrequency(0);
              }
              
              // Автоматически загружаем и включаем фильтры подкластера
              if (config.filters && Array.isArray(config.filters) && config.filters.length > 0) {
                setSelectedFilters(config.filters);
                // Если есть фильтры - автоматически включаем applyFilters
                // Миграция: если applyFilters === false но есть фильтры, включаем их
                let shouldApply = config.applyFilters !== undefined ? config.applyFilters : true;
                if (shouldApply === false && config.filters.length > 0) {
                  shouldApply = true;
                  // Автоматически исправляем конфиг
                  config.applyFilters = true;
                  localStorage.setItem('subclusterConfigs', JSON.stringify(parsed));
                }
                setApplyFilters(shouldApply);
                // Сохраняем текущее состояние как последнее сохранённое
                lastSavedFiltersRef.current = {filters: [...config.filters], apply: shouldApply};
                setHasFilterChanges(false);
              } else {
                setSelectedFilters([]);
                setApplyFilters(false);
                lastSavedFiltersRef.current = {filters: [], apply: false};
                setHasFilterChanges(false);
              }
              
              // Снимаем флаг через небольшую задержку
              setTimeout(() => {
                isLoadingRef.current = false;
              }, 150);
            } else {
              setSelectedFilters([]);
              setApplyFilters(false);
              lastSavedFiltersRef.current = {filters: [], apply: false};
              setHasFilterChanges(false);
              setMinFrequency(0);
            }
          }
        }
      } else {
        setSubclusterData(null);
      }
    } catch (error) {
      console.error('Load subcluster error:', error);
      setSubclusterData(null);
    } finally {
      setIsLoadingResult(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  
  // Обработка URL параметра id
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && clusters.length > 0) {
      // Проверяем существует ли такой подкластер
      const exists = clusters.some(c => c.types.some(t => t.id === id));
      if (exists) {
        setSelectedSubcluster(id);
        // Раскрываем нужный кластер
        const cluster = clusters.find(c => c.types.some(t => t.id === id));
        if (cluster) {
          setExpandedClusters(prev => ({ ...prev, [cluster.id]: true }));
        }
      }
    }
  }, [searchParams, clusters]);
  
  useEffect(() => { 
    if (selectedSubcluster) loadSubclusterData(selectedSubcluster); 
  }, [selectedSubcluster, loadSubclusterData]);
  
  // Отслеживание изменений в фильтрах (без автосохранения)
  useEffect(() => {
    // Пропускаем проверку во время загрузки
    if (isLoadingRef.current) {
      return;
    }
    if (!selectedSubcluster) return;
    
    // Проверяем изменились ли фильтры
    const filtersChanged = 
      JSON.stringify([...selectedFilters].sort()) !== JSON.stringify([...lastSavedFiltersRef.current.filters].sort()) ||
      applyFilters !== lastSavedFiltersRef.current.apply;
    
    setHasFilterChanges(filtersChanged);
  }, [selectedFilters, applyFilters, selectedSubcluster]);

  const minusWords = useMemo(() => {
    if (!applyFilters || selectedFilters.length === 0) {
      return new Set<string>();
    }
    const words = new Set<string>();
    selectedFilters.forEach((filterId) => {
      const filter = filters.find((f) => f.id === filterId);
      if (filter) filter.items.forEach((item) => words.add(item.toLowerCase()));
    });
    return words;
  }, [filters, selectedFilters, applyFilters]);

  // Используем queries (неотфильтрованные) из подкластера как базу для автоматического применения фильтров
  const baseItems = useMemo(() => {
    if (!subclusterData) return [];
    // Используем queries (все запросы), клиентская фильтрация применится ниже
    // Сортируем от большего к меньшему
    return (subclusterData.queries || []).sort((a, b) => b.count - a.count);
  }, [subclusterData]);

  const filteredItems = useMemo(() => {
    let items = baseItems;
    
    // Фильтр по минимальной частотности
    if (minFrequency > 0) {
      items = items.filter(item => item.count >= minFrequency);
    }
    
    // Дополнительная фильтрация минус-словами (если выбраны новые фильтры)
    if (applyFilters && minusWords.size > 0) {
      items = items.filter((item) => {
        const queryLower = item.query.toLowerCase();
        const wordsArray = Array.from(minusWords);
        for (let i = 0; i < wordsArray.length; i++) {
          if (queryLower.includes(wordsArray[i])) return false;
        }
        return true;
      });
    }
    
    if (categoryFilter !== 'all') {
      items = items.filter((item) => {
        if (categoryFilter === 'high') return item.count >= 10000;
        if (categoryFilter === 'medium') return item.count >= 2000 && item.count < 10000;
        if (categoryFilter === 'low') return item.count < 2000;
        return true;
      });
    }
    
    if (searchText) {
      const lower = searchText.toLowerCase();
      items = items.filter((item) => item.query.toLowerCase().includes(lower));
    }
    
    return items;
  }, [baseItems, categoryFilter, searchText, applyFilters, minusWords, minFrequency]);

  // Подсчёт по категориям
  const categoryCounts = useMemo(() => {
    let items = baseItems;
    
    // Фильтр по минимальной частотности
    if (minFrequency > 0) {
      items = items.filter(item => item.count >= minFrequency);
    }
    
    if (applyFilters && minusWords.size > 0) {
      items = items.filter((item) => {
        const queryLower = item.query.toLowerCase();
        const wordsArray = Array.from(minusWords);
        for (let i = 0; i < wordsArray.length; i++) {
          if (queryLower.includes(wordsArray[i])) return false;
        }
        return true;
      });
    }
    
    if (searchText) {
      const lower = searchText.toLowerCase();
      items = items.filter((item) => item.query.toLowerCase().includes(lower));
    }
    
    return {
      all: items.length,
      high: items.filter(i => i.count >= 10000).length,
      medium: items.filter(i => i.count >= 2000 && i.count < 10000).length,
      low: items.filter(i => i.count < 2000).length,
    };
  }, [baseItems, applyFilters, minusWords, searchText, minFrequency]);

  const stats = useMemo(() => {
    return {
      total: baseItems.length,
      filtered: filteredItems.length,
      removed: baseItems.length - filteredItems.length,
      totalFreq: filteredItems.reduce((sum, i) => sum + i.count, 0),
    };
  }, [baseItems, filteredItems]);

  const resultText = useMemo(() => filteredItems.map((i) => i.query).join('\n'), [filteredItems]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = resultText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([resultText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${subclusterData?.subclusterName || 'keywords'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadXlsx = () => {
    if (!subclusterData) return;
    const data = filteredItems.map((item, i) => ({ '#': i + 1, 'Запрос': item.query, 'Частотность': item.count }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Keywords');
    ws['!cols'] = [{ wch: 5 }, { wch: 50 }, { wch: 12 }];
    XLSX.writeFile(wb, `${subclusterData.subclusterName}.xlsx`);
  };

  const toggleFilter = (id: string) => {
    setSelectedFilters((prev) => {
      const newFilters = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // Автоматически включаем applyFilters если есть выбранные фильтры
      if (newFilters.length > 0 && !applyFilters) {
        setApplyFilters(true);
      }
      return newFilters;
    });
  };

  const selectAllFilters = () => {
    setSelectedFilters(filters.map(f => f.id));
    if (!applyFilters) {
      setApplyFilters(true);
    }
  };
  
  const clearFilters = () => setSelectedFilters([]);
  
  const handleTextSelection = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0) {
      setSelectedText(text.toLowerCase());
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        text: text.toLowerCase()
      });
    }
  };
  
  const addToFilter = async (filterId: string) => {
    if (!selectedText) return;
    
    try {
      const filter = filters.find(f => f.id === filterId);
      if (!filter) return;
      
      // Проверяем что слово ещё не добавлено
      if (filter.items.includes(selectedText)) {
        setContextMenu(null);
        return;
      }
      
      // Добавляем слово в фильтр
      const res = await fetch('/api/filters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: filterId,
          name: filter.name,
          items: [...filter.items, selectedText]
        })
      });
      
      if (res.ok) {
        // Перезагружаем фильтры
        await loadData();
        
        // Автоматически включаем этот фильтр
        if (!selectedFilters.includes(filterId)) {
          setSelectedFilters(prev => [...prev, filterId]);
        }
        if (!applyFilters) {
          setApplyFilters(true);
        }
      }
      
      setContextMenu(null);
      setSelectedText('');
    } catch (e) {
      console.error('Error adding to filter:', e);
    }
  };
  
  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);
  
  const saveFilters = async () => {
    if (typeof window !== 'undefined' && selectedSubcluster) {
      const configsStr = localStorage.getItem('subclusterConfigs');
      let configs: any[] = [];
      
      try {
        configs = configsStr ? JSON.parse(configsStr) : [];
      } catch (e) {
        configs = [];
      }
      
      try {
        const configIndex = configs.findIndex((c: any) => c.subclusterId === selectedSubcluster);
        
        if (configIndex !== -1) {
          // Обновляем существующую конфигурацию
          configs[configIndex].filters = selectedFilters;
          configs[configIndex].applyFilters = applyFilters;
          configs[configIndex].minFrequency = minFrequency;
        } else {
          // Создаём новую конфигурацию
          configs.push({
            subclusterId: selectedSubcluster,
            models: [],
            filters: selectedFilters,
            applyFilters: applyFilters,
            minFrequency: minFrequency
          });
        }
        
        localStorage.setItem('subclusterConfigs', JSON.stringify(configs));
        lastSavedFiltersRef.current = {filters: [...selectedFilters], apply: applyFilters};
        setHasFilterChanges(false);
        
        // Синхронизируем с сервером для API Топвизора
        try {
          const res = await fetch('/api/subcluster-configs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ configs })
          });
          if (res.ok) {
            console.log('[result] Filters saved to server successfully');
          } else {
            console.error('[result] Failed to save to server:', await res.text());
          }
        } catch (e) {
          console.error('Error syncing configs to server:', e);
        }
      } catch (e) {
        console.error('Error saving filter config:', e);
      }
    }
  };

  const toggleCluster = (id: string) => {
    setExpandedClusters(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectSubcluster = (subclusterId: string) => {
    setSelectedSubcluster(subclusterId);
    router.push(`/slovolov-pro/result?id=${encodeURIComponent(subclusterId)}`, { scroll: false });
  };

  return (
    <MainLayout>
      <div className="h-full flex gap-3 p-3">
        {/* Left sidebar - Подкластеры */}
        <div 
          className="w-64 rounded-3xl border border-white/20 overflow-hidden flex flex-col"
          style={{
            background: '#1a1a1a',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-medium text-white/60">Подкластеры</span>
          </div>
          <div className="flex-1 overflow-y-auto scroll-rounded">
            {isLoading ? (
              <div className="p-3 flex justify-center"><div className="spinner"></div></div>
            ) : clusters.length === 0 ? (
              <div className="p-3 text-center text-white/30 text-[10px]">Нет кластеров</div>
            ) : (
              clusters.map((cluster) => (
                <div key={cluster.id}>
                  {/* Заголовок кластера */}
                  <div 
                    className="px-3 py-1.5 bg-white/3 text-white/50 text-[10px] font-medium cursor-pointer hover:bg-white/5 flex items-center gap-1"
                    onClick={() => toggleCluster(cluster.id)}
                  >
                    <svg 
                      className={`w-2.5 h-2.5 transition-transform ${expandedClusters[cluster.id] ? 'rotate-90' : ''}`} 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                    >
                      <path d="M8 5l10 7-10 7V5z"/>
                    </svg>
                    <span className="flex-1 truncate">{cluster.name.replace(/^Кластер \d+ - /, '')}</span>
                    <span className="text-white/30">{cluster.types.length}</span>
                  </div>
                  
                  {/* Подкластеры */}
                  {expandedClusters[cluster.id] && cluster.types.map((type) => {
                    const typeStat = subclusterStats[type.id];
                    const hasData = typeStat && typeStat.filteredCount > 0;
                    const isSelected = selectedSubcluster === type.id;
                    
                    return (
                      <label
                        key={type.id}
                        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-[10px] transition-all ${
                          isSelected 
                            ? 'bg-blue-500/15 border-l-2 border-l-blue-500' 
                            : hasData 
                              ? 'hover:bg-white/5' 
                              : 'opacity-40 hover:bg-white/3'
                        }`}
                        onClick={() => handleSelectSubcluster(type.id)}
                      >
                        {/* Радиокнопка */}
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-500' 
                            : hasData 
                              ? 'border-white/30' 
                              : 'border-white/15'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                        </div>
                        
                        <span className={`flex-1 truncate ${isSelected ? 'text-blue-400' : 'text-white/70'}`}>
                          {type.name}
                        </span>
                        
                        {/* Счётчик запросов */}
                        {hasData && (
                          <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[9px]">
                            {typeStat.filteredCount.toLocaleString()}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Filters */}
        <div 
          className="w-48 rounded-3xl border border-white/20 overflow-hidden flex flex-col"
          style={{
            background: '#1a1a1a',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-medium text-white/60">Фильтры</span>
            <label className="flex items-center gap-1 text-[10px] cursor-pointer">
              <input type="checkbox" checked={applyFilters} onChange={(e) => setApplyFilters(e.target.checked)} className="w-3 h-3 accent-blue-500" />
              <span className="text-white/40">Вкл</span>
            </label>
          </div>
          <div className="px-2 py-1.5 border-b border-white/10">
            <input
              type="text"
              value={filterSearchText}
              onChange={(e) => setFilterSearchText(e.target.value)}
              placeholder="Поиск фильтра..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-1 text-[10px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div className="px-2 py-1.5 border-b border-white/10 flex gap-1">
            <button onClick={selectAllFilters} className="flex-1 text-[9px] py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/50" style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset' }}>Все</button>
            <button onClick={clearFilters} className="flex-1 text-[9px] py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/50" style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset' }}>Сбросить</button>
          </div>
          
          {/* Минимальная частотность */}
          <div className="px-2 py-1.5 border-b border-white/10">
            <div className="text-[9px] text-white/40 mb-1">Мин. частота</div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={minFrequency === 0 ? '' : minFrequency}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setMinFrequency(0);
                  } else {
                    setMinFrequency(Math.max(0, parseInt(val) || 0));
                  }
                }}
                min="0"
                step="100"
                placeholder="0"
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-white/80 focus:outline-none focus:border-blue-500/50"
              />
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && selectedSubcluster) {
                    const configs = localStorage.getItem('subclusterConfigs');
                    if (configs) {
                      const parsed = JSON.parse(configs);
                      const configIndex = parsed.findIndex((c: any) => c.subclusterId === selectedSubcluster);
                      if (configIndex !== -1) {
                        parsed[configIndex].minFrequency = minFrequency;
                        localStorage.setItem('subclusterConfigs', JSON.stringify(parsed));
                      }
                    }
                  }
                }}
                className="w-6 h-6 flex items-center justify-center bg-cyan-500/20 text-cyan-400 rounded-full hover:bg-cyan-500/30 transition-colors"
                style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset' }}
                title="Сохранить"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={() => setMinFrequency(0)}
                className="w-6 h-6 flex items-center justify-center bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                title="Очистить"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto scroll-rounded">
            {filters
              .filter(f => {
                if (!filterSearchText) return true;
                return f.name.toLowerCase().includes(filterSearchText.toLowerCase());
              })
              .map((f) => (
              <label
                key={f.id}
                className={`flex items-center gap-2 px-2 py-1 cursor-pointer text-[10px] transition-all ${
                  selectedFilters.includes(f.id) ? 'bg-blue-500/10' : 'hover:bg-white/3'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedFilters.includes(f.id)}
                  onChange={() => toggleFilter(f.id)}
                  className="w-3 h-3 accent-blue-500"
                />
                <span className="flex-1 truncate text-white/70">− {f.name.replace('.txt', '')}</span>
                <span className="text-white/30">{f.items.length}</span>
              </label>
            ))}
          </div>
          {applyFilters && selectedFilters.length > 0 && (
            <div className="px-3 py-2 border-t border-white/10 text-[10px] space-y-0.5">
              <div className="text-white/40">Минус-слов: <span className="text-white/70">{minusWords.size}</span></div>
              <div className="text-red-400/80">Удалено: {stats.removed}</div>
              <button
                onClick={() => setShowMinusWordsModal(true)}
                className="mt-1 w-full px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-[9px] hover:bg-blue-500/30 transition-colors"
              >
                Список минус-слов
              </button>
            </div>
          )}
          {hasFilterChanges && (
            <div className="px-2 py-2 border-t border-white/10">
              <button 
                onClick={saveFilters}
                className="w-full text-[10px] py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 font-medium transition-colors"
              >
                Сохранить изменения
              </button>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Top bar */}
          <div 
            className="rounded-3xl border border-white/20 px-4 py-2.5 flex items-center gap-4"
            style={{
              background: '#1a1a1a',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="flex items-center gap-6 text-[11px]">
              <div><span className="text-white/40">Всего</span> <span className="font-semibold text-white/90">{stats.total}</span></div>
              <div><span className="text-white/40">Показано</span> <span className="font-semibold text-cyan-400">{stats.filtered}</span></div>
              <div><span className="text-white/40">Охват</span> <span className="font-semibold text-blue-400">{stats.totalFreq.toLocaleString('ru-RU')}</span></div>
              {minFrequency > 0 && (
                <button
                  onClick={() => setMinFrequency(0)}
                  className="text-[10px] text-red-400/70 hover:text-red-400"
                  title="Сбросить фильтр"
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="flex-1" />
            <div className="flex gap-1">
              {([
                { key: 'all', label: 'Все', color: 'blue' },
                { key: 'high', label: 'ВЧ', color: 'red' },
                { key: 'medium', label: 'СЧ', color: 'yellow' },
                { key: 'low', label: 'НЧ', color: 'green' },
              ] as const).map(({ key, label, color }) => {
                const count = categoryCounts[key];
                const isActive = categoryFilter === key;
                const colorClasses = {
                  blue: isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/40 hover:bg-white/8',
                  red: isActive ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/40 hover:bg-white/8',
                  yellow: isActive ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-white/40 hover:bg-white/8',
                  green: isActive ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/40 hover:bg-white/8',
                };
                return (
                  <button
                    key={key}
                    onClick={() => setCategoryFilter(key)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${colorClasses[color]}`}
                  >
                    {label} <span className="opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions bar */}
          <div 
            className="rounded-3xl border border-white/20 px-3 py-2 flex items-center gap-2"
            style={{
              background: '#1a1a1a',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
            }}
          >
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Поиск..."
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-3 py-1.5 text-[11px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
            />
            <button
              onClick={handleCopy}
              disabled={!subclusterData}
              className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all ${
                copied ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
              style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset' }}
            >
              {copied ? 'OK!' : 'Копировать'}
            </button>
            <button onClick={handleDownloadTxt} disabled={!subclusterData} className="px-3 py-1.5 rounded-full text-[10px] font-medium bg-white/5 text-white/60 hover:bg-white/10" style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset' }}>.txt</button>
            <button onClick={handleDownloadXlsx} disabled={!subclusterData} className="px-3 py-1.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset' }}>.xlsx</button>
          </div>

          {/* Content area */}
          <div 
            className="flex-1 rounded-3xl border border-white/20 overflow-hidden flex flex-col"
            style={{
              background: '#1a1a1a',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
            }}
          >
            {isLoadingResult ? (
              <div className="flex-1 flex items-center justify-center"><div className="spinner"></div></div>
            ) : subclusterData ? (
              <>
                <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium">{subclusterData.subclusterName}</span>
                    <span className="text-[10px] text-white/30 ml-2">{subclusterData.clusterName}</span>
                  </div>
                  <span className="text-[10px] text-white/30">Цифры не копируются</span>
                </div>
                <div className="flex-1 overflow-y-auto scroll-rounded p-2">
                  <div className="bg-black/30 border border-white/10 rounded-xl p-2 min-h-full">
                    {filteredItems.length === 0 ? (
                      <div className="text-center text-white/30 text-[11px] py-8">Нет данных</div>
                    ) : (
                      <div className="space-y-0.5">
                        {filteredItems.map((item, idx) => {
                          const isCold = item.count === 0;
                          const isHigh = item.count >= 10000;
                          const isMedium = item.count >= 2000 && item.count < 10000;
                          const colorClass = isCold
                            ? 'text-cyan-300'
                            : isHigh 
                              ? 'text-red-400' 
                              : isMedium 
                                ? 'text-yellow-400' 
                                : 'text-cyan-400';
                          
                          return (
                            <div 
                              key={idx}
                              className="flex items-center gap-2 px-2 py-0.5 hover:bg-white/5 rounded text-[11px] font-mono group"
                              onMouseUp={handleTextSelection}
                            >
                              <span 
                                className={`${colorClass} text-[10px] min-w-[60px] text-right select-none`}
                                style={{ userSelect: 'none' }}
                              >
                                {item.count.toLocaleString('ru-RU')}
                              </span>
                              <span className="text-white/70 flex-1">{item.query}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/20 text-[11px]">
                {selectedSubcluster 
                  ? 'Нет данных для этого подкластера. Обновите его на странице "Кластеры".'
                  : 'Выберите подкластер с данными (с циановым счётчиком)'
                }
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Контекстное меню */}
      {contextMenu && (
        <div 
          className="fixed rounded-2xl shadow-2xl z-50 py-1 min-w-[200px] border border-white/20"
          style={{ 
            left: contextMenu.x, 
            top: contextMenu.y,
            background: '#1a1a1a',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-white/10">
            <div className="text-[10px] text-white/40">Добавить в фильтр:</div>
            <div className="text-[11px] text-white/90 font-mono mt-0.5">− {contextMenu.text}</div>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {filters.map(filter => (
              <button
                key={filter.id}
                onClick={() => addToFilter(filter.id)}
                className="w-full px-3 py-1.5 text-left text-[10px] text-white/70 hover:bg-white/5 transition-colors flex items-center justify-between"
              >
                <span>− {filter.name.replace('.txt', '')}</span>
                <span className="text-white/30 text-[9px]">{filter.items.length}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Модалка с минус-словами */}
      {showMinusWordsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-3xl max-w-3xl w-full max-h-[80vh] flex flex-col border border-white/20"
            style={{
              background: '#1a1a1a',
              boxShadow: '0 16px 64px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Заголовок */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white/90">Минус-слова из фильтров</h3>
                <p className="text-xs text-white/40 mt-0.5">Всего: {minusWords.size} слов</p>
              </div>
              <button
                onClick={() => setShowMinusWordsModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            {/* Список активных фильтров */}
            <div className="px-5 py-3 border-b border-white/10 bg-white/5">
              <div className="text-[10px] text-white/40 mb-2">Активные фильтры:</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedFilters.map(filterId => {
                  const filter = filters.find(f => f.id === filterId);
                  return filter ? (
                    <span key={filterId} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-[10px]">
                      {filter.name.replace('.txt', '')} ({filter.items.filter(item => item != null && item !== '').length})
                    </span>
                  ) : null;
                })}
              </div>
            </div>
            
            {/* Список минус-слов */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-0.5">
                {Array.from(minusWords).sort().map((word, idx) => (
                  <div key={idx} className="text-[11px] text-white/70 font-mono py-0.5">
                    − {word}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Футер */}
            <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
              <div className="text-[10px] text-white/40">
                Эти слова исключаются из результатов при включённых фильтрах
              </div>
              <button
                onClick={() => setShowMinusWordsModal(false)}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-xs hover:bg-blue-500/30 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<MainLayout><div className="h-full flex items-center justify-center"><div className="text-white/50">Загрузка...</div></div></MainLayout>}>
      <ResultPageContent />
    </Suspense>
  );
}