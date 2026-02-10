'use client';

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { useStore } from '@/store/store';

interface SubclusterConfig {
  subclusterId: string;
  models: string[];
  filters: string[];
}

interface SubclusterStats {
  subclusterId: string;
  queriesCount: number;
  filteredCount: number;
  totalImpressions: number;
  updatedAt: string | null;
}

export default function MapPage() {
  const router = useRouter();
  const { clusters, filters, searchModels, loadData, subclusterResults, loadSubclusterResults } = useStore();
  const [configs, setConfigs] = useState<SubclusterConfig[]>([]);
  const [subclusterStats, setSubclusterStats] = useState<Record<string, SubclusterStats>>({});
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});
  const [expandedSubclusters, setExpandedSubclusters] = useState<Record<string, boolean>>({});
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [zoom, setZoom] = useState(1.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // Загружаем сохранённый viewport из localStorage после монтирования
  useEffect(() => {
    const saved = localStorage.getItem('mapViewport');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.zoom) setZoom(data.zoom);
        if (data.pan) setPan(data.pan);
      } catch { /* ignore */ }
    }
  }, []);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{type: string; name: string; x: number; y: number}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedSubcluster, setSelectedSubcluster] = useState<{ clusterId: string; subclusterId: string } | null>(null);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [queriesExpanded, setQueriesExpanded] = useState(true);
  const [toolMode, setToolMode] = useState<'hand' | 'select'>('hand'); // Режим: рука или стрелка
  const [teleportHighlight, setTeleportHighlight] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Загрузка конфигов с сервера
  const loadConfigsFromServer = async () => {
    try {
      const res = await fetch('/api/subcluster-configs');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.configs && data.configs.length > 0) {
          setConfigs(data.configs);
          localStorage.setItem('subclusterConfigs', JSON.stringify(data.configs));
          console.log('[map] Loaded configs from server:', data.configs.length);
        }
      }
    } catch (e) {
      console.error('Error loading configs from server:', e);
    }
  };

  useEffect(() => {
    // Принудительно загружаем свежие данные при каждом открытии карты
    loadData();
    
    // 1. Загружаем конфигурации с сервера (приоритет) или из localStorage
    loadConfigsFromServer().then(() => {
      // Если с сервера ничего не пришло, загружаем из localStorage
      if (configs.length === 0) {
        const saved = localStorage.getItem('subclusterConfigs');
        if (saved) {
          try {
            setConfigs(JSON.parse(saved));
          } catch (e) {
            console.error('Error loading configs:', e);
          }
        }
      }
    });
    
    // 2. Затем загружаем результаты с применением конфигов
    loadSubclusterResults();
    
    // Загружаем статистику
    const loadStats = async () => {
      try {
        const res = await fetch('/api/subcluster-stats');
        if (res.ok) {
          const data = await res.json();
          setSubclusterStats(data);
        }
      } catch (e) {
        console.error('Error loading stats:', e);
      }
    };
    loadStats();
    
    // Перезагружаем данные при фокусе окна
    const handleFocus = () => {
      loadData();
      loadStats();
      loadSubclusterResults();
      
      // Перезагружаем конфигурации
      const savedConfigs = localStorage.getItem('subclusterConfigs');
      if (savedConfigs) {
        try {
          setConfigs(JSON.parse(savedConfigs));
        } catch (e) {
          console.error('Error reloading configs:', e);
        }
      }
    };
    
    // Слушаем изменения в localStorage
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'subclusterConfigs' && e.newValue) {
        try {
          setConfigs(JSON.parse(e.newValue));
        } catch (err) {
          console.error('Error parsing storage update:', err);
        }
      }
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadData]);

  // Перезагружаем результаты при изменении конфигураций
  useEffect(() => {
    if (configs.length > 0) {
      loadSubclusterResults();
    }
  }, [configs, loadSubclusterResults]);

  // Сохраняем позицию карты в localStorage
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      localStorage.setItem('mapViewport', JSON.stringify({ zoom, pan }));
    }, 300);
    return () => clearTimeout(saveTimeout);
  }, [zoom, pan]);

  // По умолчанию всё раскрыто
  useEffect(() => {
    if (clusters.length > 0) {
      const expClusters: Record<string, boolean> = {};
      const expSubs: Record<string, boolean> = {};
      clusters.forEach(c => {
        expClusters[c.id] = true;
        c.types.forEach(t => {
          const cfg = configs.find(x => x.subclusterId === t.id);
          if (cfg && (cfg.models.length > 0 || cfg.filters.length > 0)) {
            expSubs[t.id] = true;
          }
        });
      });
      setExpandedClusters(expClusters);
      setExpandedSubclusters(expSubs);
    }
  }, [clusters, configs]);

  const getConfig = useCallback((subclusterId: string): SubclusterConfig => {
    const existing = configs.find(c => c.subclusterId === subclusterId);
    return existing || { subclusterId, models: [], filters: [] };
  }, [configs]);

  // Сохранение конфигов на сервер
  const saveConfigsToServer = async (configsToSave: SubclusterConfig[]) => {
    try {
      await fetch('/api/subcluster-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: configsToSave })
      });
    } catch (e) {
      console.error('Error saving configs to server:', e);
    }
  };

  const saveConfig = (config: SubclusterConfig) => {
    const newConfigs = configs.filter(c => c.subclusterId !== config.subclusterId);
    if (config.models.length > 0 || config.filters.length > 0) {
      newConfigs.push(config);
    }
    setConfigs(newConfigs);
    localStorage.setItem('subclusterConfigs', JSON.stringify(newConfigs));
    saveConfigsToServer(newConfigs); // Сохраняем на сервер
    
    // Синхронизируем с clusterConfigs для страницы кластеров
    const savedClusterConfigs = localStorage.getItem('clusterConfigs');
    if (savedClusterConfigs) {
      try {
        const clusterConfigs = JSON.parse(savedClusterConfigs);
        // Находим кластер для этого подкластера
        let clusterId = '';
        for (const cluster of clusters) {
          if (cluster.types.find(t => t.id === config.subclusterId)) {
            clusterId = cluster.id;
            break;
          }
        }
        if (clusterId) {
          const newClusterConfigs = clusterConfigs.filter(
            (c: { typeId?: string }) => c.typeId !== config.subclusterId
          );
          if (config.models.length > 0 || config.filters.length > 0) {
            newClusterConfigs.push({
              clusterId,
              typeId: config.subclusterId,
              models: config.models,
              filters: config.filters,
            });
          }
          localStorage.setItem('clusterConfigs', JSON.stringify(newClusterConfigs));
        }
      } catch (e) {
        console.error('Error syncing clusterConfigs:', e);
      }
    }
  };

  const toggleModel = (modelId: string) => {
    if (!selectedSubcluster) return;
    const config = getConfig(selectedSubcluster.subclusterId);
    const models = config.models.includes(modelId)
      ? config.models.filter(m => m !== modelId)
      : [...config.models, modelId];
    saveConfig({ ...config, models });
  };

  const toggleFilter = (filterId: string) => {
    if (!selectedSubcluster) return;
    const config = getConfig(selectedSubcluster.subclusterId);
    const filtersList = config.filters.includes(filterId)
      ? config.filters.filter(f => f !== filterId)
      : [...config.filters, filterId];
    saveConfig({ ...config, filters: filtersList });
  };

  const toggleCluster = useCallback((id: string) => {
    setExpandedClusters(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleSubcluster = useCallback((id: string) => {
    setExpandedSubclusters(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const expandAll = () => {
    const newClusters: Record<string, boolean> = {};
    const newSubs: Record<string, boolean> = {};
    clusters.forEach(c => {
      newClusters[c.id] = true;
      c.types.forEach(t => {
        const cfg = getConfig(t.id);
        if (cfg.models.length > 0 || cfg.filters.length > 0) {
          newSubs[t.id] = true;
        }
      });
    });
    setExpandedClusters(newClusters);
    setExpandedSubclusters(newSubs);
  };

  const collapseAll = () => {
    setExpandedClusters({});
    setExpandedSubclusters({});
  };

  const goToResult = (clusterId: string, subclusterId: string) => {
    router.push(`/slovolov-pro/editor?cluster=${encodeURIComponent(clusterId)}&subcluster=${encodeURIComponent(subclusterId)}`);
  };

  const goToSubcluster = (clusterId: string, subclusterId: string) => {
    router.push(`/slovolov-pro/clusters?cluster=${encodeURIComponent(clusterId)}&subcluster=${encodeURIComponent(subclusterId)}`);
  };

  const goToModel = (modelId: string) => {
    router.push(`/slovolov-pro/models?id=${encodeURIComponent(modelId)}`);
  };

  const goToFilter = (filterId: string) => {
    router.push(`/slovolov-pro/filters?id=${encodeURIComponent(filterId)}`);
  };

  const clusterColors = ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

  const rafRef = useRef<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // В режиме стрелки не перетаскиваем
    if (toolMode === 'select') return;
    
    // В режиме руки не перетаскиваем только если кликнули на button или input
    if (target.closest('button') || target.closest('input')) {
      return;
    }
    
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    // Сохраняем координаты до RAF
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      setPan({ x: clientX - dragStart.x, y: clientY - dragStart.y });
      rafRef.current = null;
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    if (!containerRef.current) return;
    
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Координаты курсора относительно контейнера
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Сохраняем текущие значения
    const currentZoom = zoom;
    const currentPan = pan;
    
    // Точка под курсором в координатах SVG
    const pointX = (mouseX - currentPan.x) / currentZoom;
    const pointY = (mouseY - currentPan.y) / currentZoom;
    
    const newZoom = Math.min(Math.max(currentZoom * delta, 0.15), 5.0);
    
    // Новая позиция pan чтобы точка осталась под курсором
    const newPan = {
      x: mouseX - pointX * newZoom,
      y: mouseY - pointY * newZoom
    };
    
    requestAnimationFrame(() => {
      setZoom(newZoom);
      setPan(newPan);
    });
  };

  // Функция для измерения ширины текста (кэшированная)
  const textWidthCache = useRef<Map<string, number>>(new Map());
  const measureText = useCallback((text: string, fontSize: number): number => {
    const key = `${text}-${fontSize}`;
    if (textWidthCache.current.has(key)) {
      return textWidthCache.current.get(key)!;
    }
    const width = text.length * fontSize * 0.6 + 16;
    textWidthCache.current.set(key, width);
    return width;
  }, []);

  // Поиск
  const matchesSearch = useCallback((text: string): boolean => {
    if (!searchQuery.trim()) return false;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  }, [searchQuery]);

  // Поиск подкластера по модели или фильтру
  const findSubclusterByModelOrFilter = useCallback((query: string) => {
    if (!query.trim()) return null;
    const lower = query.toLowerCase();
    
    // Ищем модель по имени
    const matchedModel = searchModels.find(m => m.name.toLowerCase().includes(lower));
    if (matchedModel) {
      // Ищем подкластер с этой моделью
      for (const config of configs) {
        if (config.models.includes(matchedModel.id)) {
          // Находим кластер и подкластер
          for (const cluster of clusters) {
            const sub = cluster.types.find(t => t.id === config.subclusterId);
            if (sub) {
              return { clusterId: cluster.id, subclusterId: sub.id };
            }
          }
        }
      }
    }
    
    // Ищем фильтр по имени
    const matchedFilter = filters.find(f => f.name.toLowerCase().includes(lower));
    if (matchedFilter) {
      // Ищем подкластер с этим фильтром
      for (const config of configs) {
        if (config.filters.includes(matchedFilter.id)) {
          // Находим кластер и подкластер
          for (const cluster of clusters) {
            const sub = cluster.types.find(t => t.id === config.subclusterId);
            if (sub) {
              return { clusterId: cluster.id, subclusterId: sub.id };
            }
          }
        }
      }
    }
    
    return null;
  }, [searchModels, filters, configs, clusters]);

  // При поиске автоматически выбираем подкластер и раскрываем его
  useEffect(() => {
    if (searchQuery.trim()) {
      const found = findSubclusterByModelOrFilter(searchQuery);
      if (found) {
        setSelectedSubcluster(found);
        setExpandedClusters(prev => ({ ...prev, [found.clusterId]: true }));
        setExpandedSubclusters(prev => ({ ...prev, [found.subclusterId]: true }));
        setPanelOpen(true);
      }
    }
  }, [searchQuery, findSubclusterByModelOrFilter]);

  // Размеры
  const nodeH = 64; // Увеличенная высота для подкластеров (в 2 раза)
  const itemH = 32; // Стандартная высота для элементов внутри боксов моделей/фильтров
  const clusterH = 96; // Увеличенная высота для кластеров (в 3 раза)
  const gapX = 60;
  const gapY = 50; // Увеличен отступ между подкластерами
  const padding = 12;
  const viewBtnSize = 26;

  const selectedConfig = selectedSubcluster ? getConfig(selectedSubcluster.subclusterId) : null;

  // Расчёт раскладки
  const calculateLayout = () => {
    const layout: {
      clusters: { id: string; x: number; y: number; w: number; h: number; name: string; color: string; expanded: boolean; highlight: boolean }[];
      subclusters: { id: string; clusterId: string; x: number; y: number; w: number; h: number; name: string; color: string; expanded: boolean; highlight: boolean }[];
      modelBoxes: { subclusterId: string; x: number; y: number; w: number; h: number; items: { id: string; name: string; y: number; w: number; highlight: boolean }[] }[];
      filterBoxes: { subclusterId: string; x: number; y: number; w: number; h: number; items: { id: string; name: string; y: number; w: number; highlight: boolean }[]; hasFilters: boolean }[];
      resultBoxes: { subclusterId: string; x: number; y: number; w: number; h: number; minFrequency: number; filteredCount: number; totalImpressions: number; queries: Array<{ query: string; count: number }> }[];
      viewButtons: { subclusterId: string; clusterId: string; x: number; y: number }[];
      lines: { x1: number; y1: number; x2: number; y2: number; color: string }[];
      totalWidth: number;
      totalHeight: number;
    } = { clusters: [], subclusters: [], modelBoxes: [], filterBoxes: [], resultBoxes: [], viewButtons: [], lines: [], totalWidth: 800, totalHeight: 600 };

    const startX = 50; // Начальная X позиция
    const startY = 180; // Начальная Y позиция

    // Находим максимальную ширину для всех элементов
    let maxClusterW = 120;
    let maxSubW = 100;
    let maxModelW = 80;
    let maxFilterW = 80;
    
    clusters.forEach(cluster => {
      const name = cluster.name.replace(/^Кластер \d+ - /, '');
      const w = measureText(name, 33) + 60; // Увеличено в 3 раза
      maxClusterW = Math.max(maxClusterW, w);
      
      cluster.types.forEach(type => {
        const cfg = getConfig(type.id);
        const hasItems = cfg.models.length > 0 || cfg.filters.length > 0;
        const textW = measureText(type.name, 10);
        const w = (hasItems ? 28 : 12) + textW + 24 + (cfg.models.length > 0 ? 16 : 0) + (cfg.filters.length > 0 ? 16 : 0) + 12;
        maxSubW = Math.max(maxSubW, w);
      });
    });
    
    searchModels.forEach(m => {
      const w = measureText(m.name, 9) + padding * 2;
      maxModelW = Math.max(maxModelW, w);
    });
    filters.forEach(f => {
      const w = measureText(f.name, 9) + padding * 2;
      maxFilterW = Math.max(maxFilterW, w);
    });

    // Базовая ширина для подкластера
    const minSubColumnWidth = 320;

    // Для отслеживания currentX
    let currentX = startX;

    clusters.forEach((cluster, clusterIdx) => {
      // Каждый кластер получает ширину на основе своего количества подкластеров
      const subclusterCount = cluster.types.length || 1;
      const columnWidth = subclusterCount * minSubColumnWidth;
      const color = clusterColors[clusterIdx % clusterColors.length];
      const isExpanded = expandedClusters[cluster.id];
      const clusterName = cluster.name.replace(/^Кластер \d+ - /, '');
      const clusterW = measureText(clusterName, 33) + 60; // Увеличено в 3 раза
      
      let currentY = startY; // Каждый кластер начинается с одинаковой Y позиции
      const centerX = currentX + columnWidth / 2; // Центр колонки

      // Кластер в вертикальном столбце (по центру)
      layout.clusters.push({
        id: cluster.id,
        x: centerX - clusterW / 2,
        y: currentY,
        w: clusterW,
        h: clusterH,
        name: clusterName,
        color,
        expanded: isExpanded,
        highlight: matchesSearch(clusterName)
      });

      currentY += clusterH + gapY;

      if (isExpanded && cluster.types.length > 0) {
        // Рассчитываем ширину для каждого подкластера
        const subclusterCount = cluster.types.length;
        const subColumnWidth = columnWidth / subclusterCount;
        
        cluster.types.forEach((type, typeIdx) => {
          // Каждый подкластер в своей подколонке
          const subColumnX = currentX + (typeIdx * subColumnWidth);
          const subCenterX = subColumnX + subColumnWidth / 2;
          
          const subY = currentY;
          const subExpanded = expandedSubclusters[type.id];
          const config = getConfig(type.id);
          const hasModels = config.models.length > 0;
          const hasFilters = config.filters.length > 0;
          const hasItems = hasModels || hasFilters;
          const textW = measureText(type.name, 16); // Увеличенный размер шрифта
          const subW = Math.min((hasItems ? 48 : 24) + textW + 40 + (hasModels ? 24 : 0) + (hasFilters ? 24 : 0) + 20, subColumnWidth - 20); // Увеличенные отступы для элементов

          layout.subclusters.push({
            id: type.id,
            clusterId: cluster.id,
            x: subCenterX - subW / 2,
            y: subY,
            w: subW,
            h: nodeH,
            name: type.name,
            color,
            expanded: subExpanded,
            highlight: matchesSearch(type.name)
          });

          // Диагональная линия от центра кластера к подкластеру
          layout.lines.push({
            x1: centerX,
            y1: subY - gapY,
            x2: subCenterX,
            y2: subY,
            color
          });

          let subCurrentY = subY + nodeH + gapY;

          if (subExpanded && (hasModels || hasFilters)) {
            // Модели под подкластером
            if (hasModels) {
              const modelItems = config.models.map((mid, i) => {
                const m = searchModels.find(x => x.id === mid);
                const name = m?.name || mid;
                const w = measureText(name, 9);
                return { id: mid, name, y: 28 + i * (itemH - 4), w, highlight: matchesSearch(name) };
              });
              const boxW = Math.min(280, subColumnWidth - 20); // Увеличили минимальный отступ
              const boxH = 28 + modelItems.length * (itemH - 4) + padding;
              layout.modelBoxes.push({
                subclusterId: type.id,
                x: subCenterX - boxW / 2,
                y: subCurrentY,
                w: boxW,
                h: boxH,
                items: modelItems
              });
              layout.lines.push({
                x1: subCenterX,
                y1: subCurrentY - gapY,
                x2: subCenterX,
                y2: subCurrentY,
                color: '#22c55e'
              });
              subCurrentY += boxH + gapY;
            }

            // Фильтры под моделями
            if (hasFilters) {
              const filterItems = config.filters.map((fid, i) => {
                const f = filters.find(x => x.id === fid);
                const name = f?.name || fid;
                const w = measureText(name, 9);
                return { id: fid, name, y: 28 + i * (itemH - 4), w, highlight: matchesSearch(name) };
              });
              const boxW = Math.min(280, subColumnWidth - 20); // Увеличили минимальный отступ
              const boxH = 28 + filterItems.length * (itemH - 4) + padding;
              layout.filterBoxes.push({
                subclusterId: type.id,
                x: subCenterX - boxW / 2,
                y: subCurrentY,
                w: boxW,
                h: boxH,
                items: filterItems,
                hasFilters: true
              });
              layout.lines.push({
                x1: subCenterX,
                y1: subCurrentY - gapY,
                x2: subCenterX,
                y2: subCurrentY,
                color: '#f97316'
              });
              subCurrentY += boxH + gapY;
            }

            // Блок результатов под фильтрами
            const stats = subclusterStats[type.id];
            if (stats && stats.filteredCount > 0) {
              const result = subclusterResults[type.id];
              const queriesData = (result?.queries || []).slice(0, 30); // Ограничиваем 30 запросами для производительности
              const actualImpressions = result?.totalImpressions || 0;
              const actualCount = result?.filteredCount || 0;
              
              const resultsBoxW = Math.min(300, subColumnWidth - 20); // Увеличили минимальный отступ
              const headerHeight = 90;
              const rowHeight = 16;
              const resultsBoxH = headerHeight + (queriesData.length * rowHeight) + padding * 2;
              
              layout.resultBoxes.push({
                subclusterId: type.id,
                x: subCenterX - resultsBoxW / 2,
                y: subCurrentY,
                w: resultsBoxW,
                h: resultsBoxH,
                minFrequency: 0,
                filteredCount: actualCount,
                totalImpressions: actualImpressions,
                queries: queriesData
              });
              
              layout.lines.push({
                x1: subCenterX,
                y1: subCurrentY - gapY,
                x2: subCenterX,
                y2: subCurrentY,
                color: '#06b6d4'
              });
              
              subCurrentY += resultsBoxH + gapY;
              
              // Кнопка просмотра под результатом
              layout.viewButtons.push({
                subclusterId: type.id,
                clusterId: cluster.id,
                x: subCenterX - viewBtnSize / 2,
                y: subCurrentY
              });
              layout.lines.push({
                x1: subCenterX,
                y1: subCurrentY - gapY,
                x2: subCenterX,
                y2: subCurrentY,
                color: 'rgba(255,255,255,0.15)'
              });
              subCurrentY += viewBtnSize + gapY;
            } else {
              // Если нет результатов, глазик под последним элементом
              layout.viewButtons.push({
                subclusterId: type.id,
                clusterId: cluster.id,
                x: subCenterX - viewBtnSize / 2,
                y: subCurrentY
              });
              layout.lines.push({
                x1: subCenterX,
                y1: subCurrentY - gapY,
                x2: subCenterX,
                y2: subCurrentY,
                color: 'rgba(255,255,255,0.15)'
              });
              subCurrentY += viewBtnSize + gapY;
            }
          }
        });
      }

      // Переходим к следующему кластеру по горизонтали с учетом его ширины
      currentX += columnWidth + gapX;
    });

    layout.totalWidth = currentX + 100;
    layout.totalHeight = startY + 2000; // Достаточная высота для всех элементов
    return layout;
  };

  const layout = useMemo(() => calculateLayout(), [
    clusters,
    expandedClusters,
    expandedSubclusters,
    searchModels,
    filters,
    configs,
    subclusterStats,
    subclusterResults,
    searchQuery
  ]);

  // Отключаем виртуализацию - используем полный layout
  const visibleLayout = layout;

  // Поисковые подсказки с debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce для поиска - задержка 150мс
    const timeoutId = setTimeout(() => {
      const query = searchQuery.toLowerCase();
      const suggestions: Array<{type: string; name: string; x: number; y: number}> = [];

      // Поиск по кластерам
      layout.clusters.forEach(c => {
        if (c.name.toLowerCase().includes(query)) {
          suggestions.push({ type: 'Кластер', name: c.name, x: c.x, y: c.y });
        }
      });

      // Поиск по подкластерам
      layout.subclusters.forEach(s => {
        if (s.name.toLowerCase().includes(query)) {
          suggestions.push({ type: 'Подкластер', name: s.name, x: s.x, y: s.y });
        }
      });

      // Поиск по моделям
      layout.modelBoxes.forEach(box => {
        box.items.forEach(item => {
          if (item.name.toLowerCase().includes(query)) {
            suggestions.push({ type: 'Модель', name: item.name, x: box.x, y: box.y + item.y });
          }
        });
      });

      // Поиск по фильтрам
      layout.filterBoxes.forEach(box => {
        box.items.forEach(item => {
          if (item.name.toLowerCase().includes(query)) {
            suggestions.push({ type: 'Фильтр', name: item.name, x: box.x, y: box.y + item.y });
          }
        });
      });

      setSearchSuggestions(suggestions.slice(0, 10)); // Максимум 10 подсказок
      setShowSuggestions(true);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, layout]);

  // Телепортация к элементу
  const teleportTo = useCallback((x: number, y: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Центрируем элемент в видимой области
    setPan({
      x: rect.width / 2 - x * zoom,
      y: rect.height / 2 - y * zoom
    });
    setShowSuggestions(false);
    setSearchQuery('');
    
    // Подсветка места телепортации
    setTeleportHighlight({ x, y });
    setTimeout(() => setTeleportHighlight(null), 2000);
  }, [zoom]);

  return (
    <MainLayout>
      <div 
        className="h-full flex overflow-hidden bg-[#0a0a0a]" 
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        onClick={() => setShowSuggestions(false)}
      >
        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative"
          style={{
            cursor: toolMode === 'hand' 
              ? (isDragging 
                ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='5 9 2 12 5 15'/%3E%3Cpolyline points='9 5 12 2 15 5'/%3E%3Cpolyline points='15 19 12 22 9 19'/%3E%3Cpolyline points='19 9 22 12 19 15'/%3E%3Cline x1='2' y1='12' x2='22' y2='12'/%3E%3Cline x1='12' y1='2' x2='12' y2='22'/%3E%3C/svg%3E") 12 12, move`
                : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='5 9 2 12 5 15'/%3E%3Cpolyline points='9 5 12 2 15 5'/%3E%3Cpolyline points='15 19 12 22 9 19'/%3E%3Cpolyline points='19 9 22 12 19 15'/%3E%3Cline x1='2' y1='12' x2='22' y2='12'/%3E%3Cline x1='12' y1='2' x2='12' y2='22'/%3E%3C/svg%3E") 12 12, move`)
              : 'default',
            contain: 'layout style paint'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)`,
              backgroundSize: `${16 * zoom}px ${16 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          />

          {/* Панель управления */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2" style={{ isolation: 'isolate' }}>
            {/* Поиск */}
            <div 
              className="relative rounded-full px-1 py-1 border border-white/20" 
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#1a1a1a',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
              }}
            >
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowSuggestions(true)}
                placeholder="Поиск..."
                className="w-40 h-7 pl-7 pr-3 bg-transparent text-xs text-white placeholder-white/40 focus:outline-none"
              />
              {showSuggestions && searchSuggestions.length > 0 && (
                <div 
                  className="absolute top-10 left-0 w-64 rounded-2xl max-h-80 overflow-y-auto z-30 border border-white/20"
                  style={{
                    background: '#1a1a1a',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
                  }}
                  onWheel={(e) => e.stopPropagation()}
                >
                  {searchSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => teleportTo(suggestion.x, suggestion.y)}
                      className="w-full px-4 py-2.5 text-left hover:bg-white/10 border-b border-white/5 last:border-0 first:rounded-t-2xl last:rounded-b-2xl"
                    >
                      <div className="text-[10px] text-cyan-400 mb-0.5">{suggestion.type}</div>
                      <div className="text-xs text-white">{suggestion.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Зум */}
            <div 
              className="flex items-center gap-1 rounded-full px-1.5 h-9 border border-white/20 overflow-hidden"
              style={{
                background: '#1a1a1a',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
              }}
            >
              <button onClick={() => setZoom((z: number) => Math.min(z * 1.2, 5.0))} className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white bg-white/5 hover:bg-white/15 rounded-full transition-colors">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              </button>
              <span className="px-1.5 text-[11px] text-white/50 min-w-[36px] text-center font-medium">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z: number) => Math.max(z * 0.8, 0.15))} className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white bg-white/5 hover:bg-white/15 rounded-full transition-colors">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/></svg>
              </button>
            </div>

            {/* Раскрыть/Свернуть */}
            <div 
              className="flex items-center gap-1 rounded-full px-1.5 h-9 border border-white/20 overflow-hidden"
              style={{
                background: '#1a1a1a',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
              }}
            >
              <button onClick={expandAll} className="px-3 h-6 text-[11px] text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors font-medium">
                Раскрыть
              </button>
              <button onClick={collapseAll} className="px-3 h-6 text-[11px] text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors font-medium">
                Свернуть
              </button>
            </div>
          </div>

          <svg
            ref={svgRef}
            className="absolute inset-0"
            width={layout.totalWidth}
            height={layout.totalHeight}
            shapeRendering="optimizeSpeed"
            textRendering="optimizeSpeed"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              willChange: 'transform'
            }}
          >
            {/* Lines */}
            <g style={{ pointerEvents: 'none' }}>
              {visibleLayout.lines.map((line, idx) => (
                <line
                  key={idx}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={line.color}
                  strokeWidth="1.5"
                  strokeOpacity="0.35"
                />
              ))}
            </g>

            {/* Clusters */}
            {visibleLayout.clusters.map(c => (
              <g key={c.id} className="node-interactive" style={{ cursor: toolMode === 'select' ? 'pointer' : 'inherit' }} onClick={() => toolMode === 'select' && toggleCluster(c.id)}>
                <rect 
                  x={c.x} y={c.y} width={c.w} height={c.h} rx="4" 
                  fill={c.highlight ? `${c.color}60` : `${c.color}30`} 
                />
                <g transform={`translate(${c.x + 30}, ${c.y + c.h / 2}) rotate(${c.expanded ? 90 : 0})`}>
                  <polygon points="-6,-8 8,0 -6,8" fill="white" opacity="0.7" />
                </g>
                <text x={c.x + 54} y={c.y + c.h / 2 + 12} fill="white" fontSize="33" fontWeight="500">
                  {c.name}
                </text>
              </g>
            ))}

            {/* Subclusters */}
            {visibleLayout.subclusters.map(s => {
              const config = getConfig(s.id);
              const hasItems = config.models.length > 0 || config.filters.length > 0;
              const hasModels = config.models.length > 0;
              const hasFilters = config.filters.length > 0;
              const isSelected = selectedSubcluster?.subclusterId === s.id;
              
              // Получаем статистику для подкластера
              const stats = subclusterStats[s.id];
              const hasStats = stats && stats.filteredCount > 0;
              
              // Рассчитываем позиции элементов справа налево (увеличенные размеры)
              let rightOffset = 14; // Увеличенный начальный отступ справа
              const statsBadgeX = hasStats ? s.x + s.w - rightOffset - 16 : 0;
              if (hasStats) rightOffset += 40;
              const filterBadgeX = hasFilters ? s.x + s.w - rightOffset - 10 : 0;
              if (hasFilters) rightOffset += 26;
              const modelBadgeX = hasModels ? s.x + s.w - rightOffset - 10 : 0;
              if (hasModels) rightOffset += 26;
              const arrowX = s.x + s.w - rightOffset - 14;

              return (
                <g key={s.id} className="node-interactive" style={{ cursor: toolMode === 'select' ? 'pointer' : 'inherit' }}>
                  <rect
                    x={s.x} y={s.y} width={s.w} height={s.h} rx="8"
                    fill={s.highlight ? 'rgba(255,255,255,0.18)' : isSelected ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'}
                    onClick={() => setSelectedSubcluster({ clusterId: s.clusterId, subclusterId: s.id })}
                    onDoubleClick={() => goToSubcluster(s.clusterId, s.id)}
                  />
                  {hasItems && (
                    <g onClick={(e) => { e.stopPropagation(); toggleSubcluster(s.id); }} style={{ cursor: 'pointer' }}>
                      <circle cx={s.x + 20} cy={s.y + s.h / 2} r="12" fill="rgba(255,255,255,0.1)" />
                      {s.expanded ? (
                        <line x1={s.x + 14} y1={s.y + s.h / 2} x2={s.x + 26} y2={s.y + s.h / 2} stroke="white" strokeWidth="2.5" />
                      ) : (
                        <g>
                          <line x1={s.x + 14} y1={s.y + s.h / 2} x2={s.x + 26} y2={s.y + s.h / 2} stroke="white" strokeWidth="2.5" />
                          <line x1={s.x + 20} y1={s.y + s.h / 2 - 6} x2={s.x + 20} y2={s.y + s.h / 2 + 6} stroke="white" strokeWidth="2.5" />
                        </g>
                      )}
                    </g>
                  )}
                  <text
                    x={s.x + (hasItems ? 38 : 16)}
                    y={s.y + s.h / 2 + 6}
                    fill="white"
                    fontSize="16"
                    opacity="0.9"
                    onClick={() => setSelectedSubcluster({ clusterId: s.clusterId, subclusterId: s.id })}
                    onDoubleClick={() => goToSubcluster(s.clusterId, s.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {s.name}
                  </text>
                  {/* Иконка ссылки (стрелка вверх) */}
                  <g 
                    className="node-interactive" 
                    onClick={() => toolMode === 'select' && goToSubcluster(s.clusterId, s.id)}
                    style={{ cursor: toolMode === 'select' ? 'pointer' : 'inherit' }}
                  >
                    <circle cx={arrowX} cy={s.y + s.h / 2} r="12" fill="rgba(255,255,255,0.08)" />
                    <path 
                      d={`M${arrowX - 5} ${s.y + s.h / 2 + 2} l5 -5 l5 5`}
                      stroke="rgba(255,255,255,0.5)" 
                      strokeWidth="2" 
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </g>
                  {hasModels && (
                    <g>
                      <circle cx={modelBadgeX} cy={s.y + s.h / 2} r="10" fill="#22c55e" opacity="0.9" />
                      <text x={modelBadgeX} y={s.y + s.h / 2 + 4} fill="white" fontSize="11" textAnchor="middle" fontWeight="600">{config.models.length}</text>
                    </g>
                  )}
                  {hasFilters && (
                    <g>
                      <circle cx={filterBadgeX} cy={s.y + s.h / 2} r="10" fill="#f97316" opacity="0.9" />
                      <text x={filterBadgeX} y={s.y + s.h / 2 + 4} fill="white" fontSize="11" textAnchor="middle" fontWeight="600">{config.filters.length}</text>
                    </g>
                  )}
                  {hasStats && (
                    <g>
                      <rect 
                        x={statsBadgeX - 16} 
                        y={s.y + s.h / 2 - 10} 
                        width="32" 
                        height="20" 
                        rx="4" 
                        fill="#06b6d4" 
                        opacity="0.9" 
                      />
                      <text 
                        x={statsBadgeX} 
                        y={s.y + s.h / 2 + 5} 
                        fill="white" 
                        fontSize="10" 
                        textAnchor="middle" 
                        fontWeight="600"
                      >
                        {stats.filteredCount >= 1000 ? `${Math.round(stats.filteredCount / 100) / 10}k` : stats.filteredCount}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Model boxes */}
            {visibleLayout.modelBoxes.map((box, idx) => (
              <g key={`mbox-${idx}`}>
                <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="4" fill="rgba(34,197,94,0.12)" />
                {/* Заголовок */}
                <text x={box.x + 8} y={box.y + 16} fill="#22c55e" fontSize="9" opacity="0.8" fontWeight="500">Модели</text>
                {box.items.map((item) => (
                  <g key={item.id} className="node-interactive" style={{ cursor: toolMode === 'select' ? 'pointer' : 'inherit' }} onClick={() => toolMode === 'select' && goToModel(item.id)}>
                    <rect 
                      x={box.x + padding} y={box.y + item.y} width={box.w - padding * 2} height={itemH - 6} rx="3" 
                      fill={item.highlight ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.2)'} 
                    />
                    <text x={box.x + padding + 6} y={box.y + item.y + (itemH - 6) / 2 + 3} fill="#22c55e" fontSize="9">
                      {item.name}
                    </text>
                    {/* Иконка ссылки */}
                    <g transform={`translate(${box.x + box.w - padding - 10}, ${box.y + item.y + (itemH - 6) / 2})`}>
                      <path d="M-4 1 l4 -4 l4 4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
                    </g>
                  </g>
                ))}
              </g>
            ))}

            {/* Filter boxes */}
            {visibleLayout.filterBoxes.map((box, idx) => {
              const config = getConfig(box.subclusterId);
              const copyKey = `filter-${box.subclusterId}`;
              const isCopied = copiedStates[copyKey];
              return (
                <g key={`fbox-${idx}`}>
                  {/* Кнопка копирования над блоком */}
                  {box.hasFilters && (
                    <g 
                      className="node-interactive"
                      style={{ cursor: toolMode === 'select' ? 'pointer' : 'inherit' }}
                      onClick={() => {
                        if (toolMode !== 'select') return;
                        if (!config || !config.filters.length) return;
                        const minusWords: string[] = [];
                        config.filters.forEach(filterId => {
                          const filter = filters.find(f => f.id === filterId);
                          if (filter) {
                            filter.items.forEach(item => {
                              if (item && item.trim() && !item.startsWith('#')) {
                                minusWords.push(`-${item.toLowerCase()}`);
                              }
                            });
                          }
                        });
                        const text = minusWords.join('\n');
                        navigator.clipboard.writeText(text);
                        setCopiedStates(prev => ({ ...prev, [copyKey]: true }));
                        setTimeout(() => {
                          setCopiedStates(prev => ({ ...prev, [copyKey]: false }));
                        }, 2000);
                      }}
                    >
                      <rect 
                        x={box.x} 
                        y={box.y - 22} 
                        width="110" 
                        height="18" 
                        rx="3" 
                        fill={isCopied ? "rgba(34,197,94,0.3)" : "rgba(249,115,22,0.3)"} 
                      />
                      <text 
                        x={box.x + 55} 
                        y={box.y - 10} 
                        fill={isCopied ? "#22c55e" : "#f97316"} 
                        fontSize="7" 
                        textAnchor="middle"
                      >
                        {isCopied ? '✓ Скопировано' : 'Копировать минус-слова'}
                      </text>
                    </g>
                  )}
                  
                  <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="4" fill="rgba(249,115,22,0.12)" />
                  
                  {/* Заголовок */}
                  <text x={box.x + 8} y={box.y + 16} fill="#f97316" fontSize="9" opacity="0.8" fontWeight="500">Фильтры</text>
                  
                  {box.items.map((item) => (
                    <g key={item.id} className="node-interactive" style={{ cursor: toolMode === 'select' ? 'pointer' : 'inherit' }} onClick={() => toolMode === 'select' && goToFilter(item.id)}>
                      <rect 
                        x={box.x + padding} y={box.y + item.y} width={box.w - padding * 2} height={itemH - 6} rx="3" 
                        fill={item.highlight ? 'rgba(249,115,22,0.4)' : 'rgba(249,115,22,0.2)'} 
                      />
                      <text x={box.x + padding + 6} y={box.y + item.y + (itemH - 6) / 2 + 3} fill="#f97316" fontSize="9">
                        -{item.name.toLowerCase()}
                      </text>
                      {/* Иконка ссылки */}
                      <g transform={`translate(${box.x + box.w - padding - 10}, ${box.y + item.y + (itemH - 6) / 2})`}>
                        <path d="M-4 1 l4 -4 l4 4" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
                      </g>
                    </g>
                  ))}
                </g>
              );
            })}

            {/* Results boxes */}
            {visibleLayout.resultBoxes.map((box, idx) => {
              const actualQueriesCount = box.queries.length;
              const copyKey = `result-${box.subclusterId}`;
              const isCopied = copiedStates[copyKey];
              return (
                <g key={`results-${idx}`}>
                  {/* Кнопка копирования над блоком */}
                  <g 
                    className="node-interactive"
                    style={{ cursor: toolMode === 'select' ? 'pointer' : 'inherit' }}
                    onClick={() => {
                      if (toolMode !== 'select') return;
                      const text = box.queries.map(q => q.query).join('\n');
                      navigator.clipboard.writeText(text);
                      setCopiedStates(prev => ({ ...prev, [copyKey]: true }));
                      setTimeout(() => {
                        setCopiedStates(prev => ({ ...prev, [copyKey]: false }));
                      }, 2000);
                    }}
                  >
                    <rect 
                      x={box.x} 
                      y={box.y - 22} 
                      width="90" 
                      height="18" 
                      rx="3" 
                      fill={isCopied ? "rgba(34,197,94,0.3)" : "rgba(6,182,212,0.3)"} 
                    />
                    <text 
                      x={box.x + 45} 
                      y={box.y - 10} 
                      fill={isCopied ? "#22c55e" : "#06b6d4"} 
                      fontSize="7" 
                      textAnchor="middle"
                    >
                      {isCopied ? '✓ Скопировано' : 'Копировать запросы'}
                    </text>
                  </g>
                  
                  <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="4" fill="rgba(6,182,212,0.12)" />
                  
                  {/* Заголовок */}
                  <text x={box.x + 8} y={box.y + 16} fill="#06b6d4" fontSize="9" opacity="0.8" fontWeight="500">Результат (показано: {actualQueriesCount})</text>
                  
                  {/* Статистика */}
                  <g>
                    <text x={box.x + padding} y={box.y + 34} fill="rgba(255,255,255,0.6)" fontSize="9">Мин. частота: <tspan fill="#06b6d4" fontWeight="600" fontSize="10">{box.minFrequency}</tspan></text>
                    <text x={box.x + padding} y={box.y + 52} fill="rgba(255,255,255,0.6)" fontSize="9">Фраз: <tspan fill="#06b6d4" fontWeight="600" fontSize="10">{box.filteredCount.toLocaleString('ru-RU')}</tspan></text>
                    <text x={box.x + padding} y={box.y + 70} fill="rgba(255,255,255,0.6)" fontSize="9">Показов: <tspan fill="#06b6d4" fontWeight="600" fontSize="10">{box.totalImpressions.toLocaleString('ru-RU')}</tspan></text>
                  </g>
                  
                  {/* Список фраз */}
                  <g>
                    <line x1={box.x + padding} y1={box.y + 82} x2={box.x + box.w - padding} y2={box.y + 82} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                    {box.queries.map((q, i) => {
                      const textY = box.y + 95 + i * 16;
                      let displayText = q.query;
                      if (displayText.length > 32) {
                        displayText = displayText.substring(0, 32) + '...';
                      }
                      const isCold = q.count === 0;
                      const countColor = isCold ? '#67e8f9' : '#06b6d4'; // cyan-300 для холодных
                      return (
                        <g key={i}>
                          <text x={box.x + padding} y={textY} fill="rgba(255,255,255,0.6)" fontSize="8">
                            {displayText}
                          </text>
                          <text x={box.x + box.w - padding} y={textY} fill={countColor} fontSize="8" textAnchor="end" opacity="0.7">
                            {q.count.toLocaleString('ru-RU')}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </g>
              );
            })}

            {/* View buttons (маленькие кнопки с глазом) */}
            {layout.viewButtons.map((btn, idx) => (
              <g 
                key={`view-${idx}`} 
                className="node-interactive"
                style={{ cursor: toolMode === 'select' ? 'pointer' : 'inherit' }}
                onClick={() => toolMode === 'select' && goToResult(btn.clusterId, btn.subclusterId)}
              >
                <circle 
                  cx={btn.x + viewBtnSize / 2} 
                  cy={btn.y + viewBtnSize / 2} 
                  r={viewBtnSize / 2} 
                  fill="rgba(255,255,255,0.08)" 
                />
                {/* Глаз */}
                <g transform={`translate(${btn.x + viewBtnSize / 2}, ${btn.y + viewBtnSize / 2})`}>
                  <ellipse cx="0" cy="0" rx="5" ry="3.5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
                  <circle cx="0" cy="0" r="2" fill="rgba(255,255,255,0.5)" />
                </g>
              </g>
            ))}

            {/* Подсветка телепортации */}
            {teleportHighlight && (
              <g style={{ pointerEvents: 'none' }}>
                <circle 
                  cx={teleportHighlight.x} 
                  cy={teleportHighlight.y} 
                  r="80" 
                  fill="none" 
                  stroke="#06b6d4" 
                  strokeWidth="3"
                  opacity="0.8"
                >
                  <animate attributeName="r" from="20" to="100" dur="0.6s" fill="freeze" />
                  <animate attributeName="opacity" from="1" to="0" dur="2s" fill="freeze" />
                </circle>
                <circle 
                  cx={teleportHighlight.x} 
                  cy={teleportHighlight.y} 
                  r="40" 
                  fill="none" 
                  stroke="#06b6d4" 
                  strokeWidth="2"
                  opacity="0.6"
                >
                  <animate attributeName="r" from="10" to="60" dur="0.8s" fill="freeze" />
                  <animate attributeName="opacity" from="0.8" to="0" dur="2s" fill="freeze" />
                </circle>
                <circle 
                  cx={teleportHighlight.x} 
                  cy={teleportHighlight.y} 
                  r="8" 
                  fill="#06b6d4"
                  opacity="0.9"
                >
                  <animate attributeName="opacity" from="1" to="0" dur="2s" fill="freeze" />
                </circle>
              </g>
            )}
          </svg>

          {/* Кнопка переключения инструмента */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20" onClick={(e) => e.stopPropagation()}>
            <div 
              className="flex items-center gap-1.5 rounded-[50px] px-2.5 py-1.5 border border-white/20"
              style={{
                background: '#1a1a1a',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
              }}
            >
              <button
                onClick={() => setToolMode('hand')}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                  toolMode === 'hand' ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}
                title="Перемещение"
              >
                {/* Lucide Move icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="5 9 2 12 5 15"/>
                  <polyline points="9 5 12 2 15 5"/>
                  <polyline points="15 19 12 22 9 19"/>
                  <polyline points="19 9 22 12 19 15"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <line x1="12" y1="2" x2="12" y2="22"/>
                </svg>
              </button>
              <button
                onClick={() => setToolMode('select')}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                  toolMode === 'select' ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}
                title="Стрелка (выбор)"
              >
                {/* Lucide MousePointer2 icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Боковая панель редактирования (открывается по бургеру) */}
        {panelOpen && (
          <div className="w-72 bg-[#111] border-l border-white/5 flex flex-col overflow-hidden">
            {selectedSubcluster ? (
              <>
                <div className="p-3 border-b border-white/5">
                  <div className="text-[9px] text-white/30 mb-0.5">Подкластер</div>
                  <h2 className="text-sm font-medium text-white truncate">
                    {clusters.find(c => c.id === selectedSubcluster.clusterId)?.types.find(t => t.id === selectedSubcluster.subclusterId)?.name}
                  </h2>
                  <div className="text-[9px] text-white/20 mt-0.5 truncate">
                    {clusters.find(c => c.id === selectedSubcluster.clusterId)?.name}
                  </div>
                </div>

                {/* Секция Запросы (развёрнута по умолчанию) */}
                <div className="border-b border-white/5">
                  <button
                    onClick={() => setQueriesExpanded(!queriesExpanded)}
                    className="w-full px-2 py-1.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-[9px] font-medium text-cyan-400 flex items-center gap-1.5">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Запросы
                    </span>
                    <svg className={`w-3 h-3 text-white/30 transition-transform ${queriesExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {queriesExpanded && (
                    <div className="px-2 pb-2">
                      <div className="bg-white/[0.02] rounded-lg p-2">
                        <div className="text-[9px] text-white/30 mb-1">Сгенерированные запросы</div>
                        <div className="text-[10px] text-white/50">
                          Модели: {selectedConfig?.models.length || 0} × Фильтры: {selectedConfig?.filters.length || 0}
                        </div>
                        <div className="text-lg font-semibold text-cyan-400 mt-1">
                          {(selectedConfig?.models.length || 0) * (selectedConfig?.filters.length || 0)} запросов
                        </div>
                        <button
                          onClick={() => goToResult(selectedSubcluster.clusterId, selectedSubcluster.subclusterId)}
                          className="w-full mt-2 px-2 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 rounded text-[9px] text-cyan-400 transition-colors flex items-center justify-center gap-1"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <ellipse cx="12" cy="12" rx="9" ry="6" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          Просмотр запросов
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Секция Настройки (свёрнута по умолчанию) */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <button
                    onClick={() => setSettingsExpanded(!settingsExpanded)}
                    className="w-full px-2 py-1.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors border-b border-white/5"
                  >
                    <span className="text-[9px] font-medium text-white/40 flex items-center gap-1.5">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      Настройки
                      <span className="text-[8px] text-white/20">({selectedConfig?.models.length || 0}M / {selectedConfig?.filters.length || 0}F)</span>
                    </span>
                    <svg className={`w-3 h-3 text-white/30 transition-transform ${settingsExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {settingsExpanded && (
                    <div className="flex-1 overflow-y-auto">
                      <div className="p-2 border-b border-white/5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-medium text-white/40 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Модели
                          </span>
                          <span className="text-[9px] text-green-400">{selectedConfig?.models.length || 0}</span>
                        </div>
                        <div className="space-y-0.5 max-h-24 overflow-y-auto">
                          {searchModels.length === 0 ? (
                            <p className="text-[9px] text-white/20 py-1">Нет моделей</p>
                          ) : searchModels.map(m => (
                            <button
                              key={m.id}
                              onClick={() => toggleModel(m.id)}
                              className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-left transition-colors ${
                                selectedConfig?.models.includes(m.id) ? 'bg-green-500/15 text-green-400' : 'hover:bg-white/5 text-white/40'
                              }`}
                            >
                              <div className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center ${
                                selectedConfig?.models.includes(m.id) ? 'bg-green-500 border-green-500' : 'border-white/20'
                              }`}>
                                {selectedConfig?.models.includes(m.id) && (
                                  <svg className="w-1.5 h-1.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                                )}
                              </div>
                              <span className="text-[9px] truncate">{m.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-medium text-white/40 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            Фильтры
                          </span>
                          <span className="text-[9px] text-orange-400">{selectedConfig?.filters.length || 0}/{filters.length}</span>
                        </div>
                        <div className="space-y-0.5 max-h-48 overflow-y-auto pr-0.5">
                          {filters.length === 0 ? (
                            <p className="text-[9px] text-white/20 py-1">Нет фильтров</p>
                          ) : filters.map((f, idx) => (
                            <button
                              key={f.id}
                              onClick={() => toggleFilter(f.id)}
                              className={`w-full flex items-center gap-1.5 px-1.5 py-0.5 rounded text-left transition-colors ${
                                selectedConfig?.filters.includes(f.id) ? 'bg-orange-500/15 text-orange-400' : 'hover:bg-white/5 text-white/40'
                              }`}
                            >
                              <div className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                                selectedConfig?.filters.includes(f.id) ? 'bg-orange-500 border-orange-500' : 'border-white/20'
                              }`}>
                                {selectedConfig?.filters.includes(f.id) && (
                                  <svg className="w-1.5 h-1.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                                )}
                              </div>
                              <span className="text-[8px] text-white/20 w-3">{String(idx + 1).padStart(2, '0')}</span>
                              <span className="text-[9px] truncate flex-1">− {f.name}</span>
                              <span className="text-[8px] text-white/15">{f.items.length}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-2 border-t border-white/5">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              if (selectedConfig) {
                                saveConfig({ ...selectedConfig, models: [], filters: [] });
                              }
                            }}
                            className="flex-1 px-2 py-1.5 bg-red-500/15 hover:bg-red-500/25 rounded text-[9px] text-red-400 transition-colors"
                          >
                            Очистить
                          </button>
                          <button
                            onClick={() => {
                              if (selectedConfig) {
                                const allFilterIds = filters.map(f => f.id);
                                saveConfig({ ...selectedConfig, filters: allFilterIds });
                              }
                            }}
                            className="flex-1 px-2 py-1.5 bg-orange-500/15 hover:bg-orange-500/25 rounded text-[9px] text-orange-400 transition-colors"
                          >
                            Все фильтры
                          </button>
                        </div>
                      </div>
                      
                      {/* Статистика */}
                      {selectedSubcluster && subclusterStats[selectedSubcluster.subclusterId] && (
                        <div className="p-2 border-t border-white/5 space-y-2">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[9px]">
                              <span className="text-white/40">Фраз:</span>
                              <span className="text-white/70 font-medium">
                                {subclusterStats[selectedSubcluster.subclusterId].filteredCount.toLocaleString('ru-RU')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[9px]">
                              <span className="text-white/40">Показов:</span>
                              <span className="text-white/70 font-medium">
                                {subclusterStats[selectedSubcluster.subclusterId].totalImpressions.toLocaleString('ru-RU')}
                              </span>
                            </div>
                          </div>
                          
                          <button
                            onClick={async () => {
                              if (!selectedConfig || !selectedConfig.filters.length) return;
                              
                              // Собираем все минус-слова из выбранных фильтров
                              const minusWords: string[] = [];
                              selectedConfig.filters.forEach(filterId => {
                                const filter = filters.find(f => f.id === filterId);
                                if (filter) {
                                  filter.items.forEach(item => {
                                    if (item && item.trim() && !item.startsWith('#')) {
                                      minusWords.push(`− ${item}`);
                                    }
                                  });
                                }
                              });
                              
                              // Копируем в буфер обмена
                              const text = minusWords.join('\n');
                              const textarea = document.createElement('textarea');
                              textarea.value = text;
                              textarea.style.position = 'fixed';
                              textarea.style.opacity = '0';
                              document.body.appendChild(textarea);
                              textarea.select();
                              document.execCommand('copy');
                              document.body.removeChild(textarea);
                            }}
                            className="w-full px-2 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 rounded text-[9px] text-blue-400 transition-colors"
                          >
                            Копировать минус-слова
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-white/5 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white/15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                    </svg>
                  </div>
                  <p className="text-[10px] text-white/30">Выберите подкластер на карте</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
