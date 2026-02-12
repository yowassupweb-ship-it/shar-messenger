'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/store';
import MainLayout from '@/components/layout/MainLayout';
import AddButton from '@/components/common/buttons/AddButton';
import { Spinner } from '@/components/Spinner/Spinner';

interface ClusterConfig {
  clusterId: string;
  typeId?: string;
  models: string[];
  filters: string[];
}

interface SubclusterConfig {
  subclusterId: string;
  models: string[];
  filters: string[];
}

interface UpdateResult {
  subclusterId: string;
  subclusterName: string;
  status: 'success' | 'error' | 'skipped';
  queriesCount: number;
  filteredCount: number;
  totalImpressions: number;
  error?: string;
}

interface SubclusterStats {
  subclusterId: string;
  queriesCount: number;
  filteredCount: number;
  totalImpressions: number;
  updatedAt: string | null;
}

export default function ClustersPage() {
  const router = useRouter();
  const { clusters, filters, searchModels, loadData } = useStore();
  
  // Восстанавливаем состояние из localStorage
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('expandedClusters');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  
  const [selectedCluster, setSelectedCluster] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedCluster');
    }
    return null;
  });
  
  const [selectedType, setSelectedType] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedType');
    }
    return null;
  });
  
  const [searchText, setSearchText] = useState('');
  const [clusterConfigs, setClusterConfigs] = useState<ClusterConfig[]>([]);
  const [subclusterConfigs, setSubclusterConfigs] = useState<SubclusterConfig[]>([]);
  
  // Модальные состояния
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<{ id: string; name: string; isSubcluster: boolean; parentId?: string } | null>(null);
  
  // Состояние обновления
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<{ current: number; total: number; currentName: string } | null>(null);
  const [updateResults, setUpdateResults] = useState<UpdateResult[] | null>(null);
  
  // Реальная статистика результатов
  const [subclusterStats, setSubclusterStats] = useState<Record<string, SubclusterStats>>({});
  
  // Drag-and-drop для моделей
  const [modelsOrder, setModelsOrder] = useState<string[]>([]);
  const [draggedModel, setDraggedModel] = useState<string | null>(null);
  const [dragOverModel, setDragOverModel] = useState<string | null>(null);
  
  // Поиск по моделям и фильтрам
  const [modelSearchText, setModelSearchText] = useState('');
  const [filterSearchText, setFilterSearchText] = useState('');
  
  // Dropdown меню для кластеров
  const [clusterMenuOpen, setClusterMenuOpen] = useState<string | null>(null);
  
  // Выбранная модель при создании подкластера
  const [newSubclusterModel, setNewSubclusterModel] = useState<string>('');

  const loadSubclusterStats = async () => {
    try {
      const res = await fetch('/api/subcluster-stats');
      if (res.ok) {
        const data = await res.json();
        setSubclusterStats(data);
      }
    } catch (e) {
      console.error('Error loading subcluster stats:', e);
    }
  };

  const loadModelsOrder = async () => {
    try {
      const res = await fetch('/api/models-order');
      if (res.ok) {
        const data = await res.json();
        setModelsOrder(data.order || []);
      }
    } catch (e) {
      console.error('Error loading models order:', e);
    }
  };

  const saveModelsOrder = async (order: string[]) => {
    try {
      await fetch('/api/models-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
    } catch (e) {
      console.error('Error saving models order:', e);
    }
  };

  // Получаем текущий конфиг для сортировки выбранных элементов вверх
  const currentConfig = useMemo(() => {
    if (!selectedCluster) return { models: [], filters: [] };
    const config = clusterConfigs.find(c => 
      selectedType ? c.typeId === selectedType : c.clusterId === selectedCluster && !c.typeId
    );
    return config || { models: [], filters: [] };
  }, [selectedCluster, selectedType, clusterConfigs]);

  // Сортированные и отфильтрованные модели (выбранные вверху)
  const sortedModels = useMemo(() => {
    let models = searchModels;
    
    // Фильтруем по поисковому запросу
    if (modelSearchText.trim()) {
      const search = modelSearchText.toLowerCase();
      models = models.filter(m => m.name.toLowerCase().includes(search));
    }
    
    // Сначала сортируем по порядку (если есть)
    if (modelsOrder.length > 0) {
      const orderMap = new Map(modelsOrder.map((id, idx) => [id, idx]));
      models = [...models].sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? 999999;
        const orderB = orderMap.get(b.id) ?? 999999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });
    }
    
    // Затем выносим выбранные вверх
    const selectedSet = new Set(currentConfig.models);
    const selected = models.filter(m => selectedSet.has(m.id));
    const notSelected = models.filter(m => !selectedSet.has(m.id));
    
    return [...selected, ...notSelected];
  }, [searchModels, modelsOrder, modelSearchText, currentConfig.models]);
  
  // Отфильтрованные фильтры (выбранные вверху)
  const filteredFilters = useMemo(() => {
    let result = filters;
    
    if (filterSearchText.trim()) {
      const search = filterSearchText.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(search));
    }
    
    // Выносим выбранные вверх
    const selectedSet = new Set(currentConfig.filters);
    const selected = result.filter(f => selectedSet.has(f.id));
    const notSelected = result.filter(f => !selectedSet.has(f.id));
    
    return [...selected, ...notSelected];
  }, [filters, filterSearchText, currentConfig.filters]);

  // Загрузка конфигов с сервера
  const loadConfigsFromServer = async () => {
    try {
      const res = await fetch('/api/subcluster-configs');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.configs) {
          setSubclusterConfigs(data.configs);
          localStorage.setItem('subclusterConfigs', JSON.stringify(data.configs));
          console.log('[clusters] Loaded configs from server:', data.configs.length);
          
          // Синхронизируем clusterConfigs из subclusterConfigs
          // subclusterId в subclusterConfigs соответствует typeId в clusterConfigs
          const newClusterConfigs: ClusterConfig[] = data.configs.map((sc: SubclusterConfig) => ({
            clusterId: '', // Будет заполнено при сопоставлении с кластерами
            typeId: sc.subclusterId,
            models: sc.models || [],
            filters: sc.filters || []
          }));
          
          // Сохраняем также в localStorage и state
          setClusterConfigs(newClusterConfigs);
          localStorage.setItem('clusterConfigs', JSON.stringify(newClusterConfigs));
        }
      }
    } catch (e) {
      console.error('Error loading configs from server:', e);
    }
  };

  // Сохранение конфигов на сервер
  const saveConfigsToServer = async (configs: SubclusterConfig[]) => {
    try {
      const res = await fetch('/api/subcluster-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs })
      });
      if (res.ok) {
        console.log('[clusters] Saved configs to server:', configs.length);
      }
    } catch (e) {
      console.error('Error saving configs to server:', e);
    }
  };

  useEffect(() => {
    loadData();
    loadSubclusterStats();
    loadModelsOrder();
    loadConfigsFromServer(); // Загружаем конфиги с сервера
    
    // Закрытие dropdown меню при клике вне
    const handleClickOutside = () => setClusterMenuOpen(null);
    document.addEventListener('click', handleClickOutside);
    
    const loadLocalConfigs = () => {
      const saved = localStorage.getItem('clusterConfigs');
      if (saved) {
        try {
          setClusterConfigs(JSON.parse(saved));
        } catch (e) {
          console.error('Error loading cluster configs:', e);
        }
      }
    };
    
    loadLocalConfigs();
    
    // Слушаем изменения в localStorage от других вкладок
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'subclusterConfigs' || e.key === 'clusterConfigs') {
        loadLocalConfigs();
        loadConfigsFromServer();
      }
    };
    
    // Перезагружаем при фокусе окна
    const handleFocus = () => {
      loadData();
      loadSubclusterStats();
      loadConfigsFromServer();
    };
    
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [loadData]);

  // Сохранение состояния выбора в localStorage
  useEffect(() => {
    if (selectedCluster) {
      localStorage.setItem('selectedCluster', selectedCluster);
    } else {
      localStorage.removeItem('selectedCluster');
    }
  }, [selectedCluster]);

  useEffect(() => {
    if (selectedType) {
      localStorage.setItem('selectedType', selectedType);
    } else {
      localStorage.removeItem('selectedType');
    }
  }, [selectedType]);

  useEffect(() => {
    localStorage.setItem('expandedClusters', JSON.stringify(expandedClusters));
  }, [expandedClusters]);

  // Множество валидных ID моделей
  const validModelIds = useMemo(() => new Set(searchModels.map(m => m.id)), [searchModels]);
  const validFilterIds = useMemo(() => new Set(filters.map(f => f.id)), [filters]);

  // Автоматическая очистка невалидных моделей при загрузке (только один раз после загрузки моделей)
  const cleanedOnceRef = useRef(false);
  useEffect(() => {
    if (searchModels.length === 0 || subclusterConfigs.length === 0 || cleanedOnceRef.current) return;
    
    let hasInvalid = false;
    const cleanedConfigs = subclusterConfigs.map(config => {
      const validModels = config.models.filter(m => validModelIds.has(m));
      const validFilters = config.filters.filter(f => validFilterIds.has(f));
      
      if (validModels.length !== config.models.length || validFilters.length !== config.filters.length) {
        hasInvalid = true;
        console.log(`[clusters] Cleaning invalid refs from ${config.subclusterId}: models ${config.models.length} -> ${validModels.length}, filters ${config.filters.length} -> ${validFilters.length}`);
      }
      
      return { ...config, models: validModels, filters: validFilters };
    });
    
    cleanedOnceRef.current = true;
    
    if (hasInvalid) {
      setSubclusterConfigs(cleanedConfigs);
      localStorage.setItem('subclusterConfigs', JSON.stringify(cleanedConfigs));
      saveConfigsToServer(cleanedConfigs); // Сохраняем на сервер
    }
  }, [searchModels, filters, subclusterConfigs, validModelIds, validFilterIds]);

  // Подсчет запросов для подкластера
  const getSubclusterStats = (subclusterId: string) => {
    const config = subclusterConfigs.find(c => c.subclusterId === subclusterId);
    const realStats = subclusterStats[subclusterId];
    
    const modelsCount = config?.models.length || 0;
    const filtersCount = config?.filters.length || 0;
    const invalidModelsCount = config?.models.filter(m => !validModelIds.has(m)).length || 0;
    
    // Используем реальное количество запросов из сохранённых результатов
    const queries = realStats?.filteredCount || 0;
    const totalImpressions = realStats?.totalImpressions || 0;
    
    return { queries, models: modelsCount, filters: filtersCount, totalImpressions, invalidModels: invalidModelsCount };
  };

  // Обновить все подкластеры
  const handleUpdateAll = async () => {
    // Валидируем конфигурации - оставляем только существующие модели
    const validatedConfigs = subclusterConfigs
      .map(config => ({
        ...config,
        models: config.models.filter(m => validModelIds.has(m)),
        filters: config.filters.filter(f => validFilterIds.has(f)),
      }))
      .filter(c => c.models.length > 0);
    
    if (validatedConfigs.length === 0) {
      alert('Нет подкластеров с настроенными моделями поиска.\n\nВозможно, файлы моделей были переименованы или удалены. Заново привяжите модели к подкластерам.');
      return;
    }
    
    // Проверяем есть ли невалидные модели
    const invalidConfigs = subclusterConfigs.filter(c => {
      const invalidModels = c.models.filter(m => !validModelIds.has(m));
      return invalidModels.length > 0;
    });
    
    if (invalidConfigs.length > 0) {
      const details = invalidConfigs.slice(0, 3).map(c => {
        const invalidModels = c.models.filter(m => !validModelIds.has(m));
        return `• ${c.subclusterId}: ${invalidModels.join(', ')}`;
      }).join('\n');
      
      if (!confirm(`Внимание! Некоторые модели не найдены:\n${details}\n\nПродолжить обновление с доступными моделями?`)) {
        return;
      }
    }
    
    if (!confirm(`Обновить ${validatedConfigs.length} подкластер(ов)?\nЭто может занять несколько минут.`)) {
      return;
    }
    
    setIsUpdating(true);
    setUpdateProgress({ current: 0, total: validatedConfigs.length, currentName: '' });
    setUpdateResults(null);
    
    try {
      const response = await fetch('/api/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: validatedConfigs,
          clusters,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Update failed');
      }
      
      const data = await response.json();
      setUpdateResults(data.results);
      await loadSubclusterStats(); // Обновляем статистику
      
    } catch (error) {
      console.error('Update error:', error);
      alert('Ошибка при обновлении: ' + (error instanceof Error ? error.message : 'Unknown'));
    } finally {
      setIsUpdating(false);
      setUpdateProgress(null);
    }
  };

  // Обновить один подкластер
  const handleUpdateSubcluster = async (subclusterId: string) => {
    const config = subclusterConfigs.find(c => c.subclusterId === subclusterId);
    if (!config || config.models.length === 0) {
      alert('Нет настроенных моделей поиска для этого подкластера');
      return;
    }
    
    // Валидируем модели
    const validModelIds = new Set(searchModels.map(m => m.id));
    const validModels = config.models.filter(m => validModelIds.has(m));
    const invalidModels = config.models.filter(m => !validModelIds.has(m));
    
    if (validModels.length === 0) {
      alert(`Модели не найдены: ${invalidModels.join(', ')}\n\nФайлы моделей были переименованы или удалены. Заново привяжите модели к подкластеру.`);
      return;
    }
    
    if (invalidModels.length > 0) {
      if (!confirm(`Некоторые модели не найдены: ${invalidModels.join(', ')}\n\nПродолжить с доступными моделями?`)) {
        return;
      }
    }
    
    const validatedConfig = {
      ...config,
      models: validModels,
    };
    
    setIsUpdating(true);
    
    try {
      const response = await fetch('/api/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: [validatedConfig],
          clusters,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Update failed');
      }
      
      const data = await response.json();
      setUpdateResults(data.results);
      await loadSubclusterStats(); // Обновляем статистику
      
    } catch (error) {
      console.error('Update error:', error);
      alert('Ошибка при обновлении: ' + (error instanceof Error ? error.message : 'Unknown'));
    } finally {
      setIsUpdating(false);
    }
  };

  // Обновить все подкластеры одного кластера
  const handleUpdateCluster = async (clusterId: string) => {
    const cluster = clusters.find(c => c.id === clusterId);
    if (!cluster) return;
    
    const validModelIds = new Set(searchModels.map(m => m.id));
    
    const configsToUpdate = subclusterConfigs.filter(c => {
      const subcluster = cluster.types.find(t => t.id === c.subclusterId);
      if (!subcluster) return false;
      const validModels = c.models.filter(m => validModelIds.has(m));
      return validModels.length > 0;
    }).map(c => ({
      ...c,
      models: c.models.filter(m => validModelIds.has(m)),
    }));
    
    if (configsToUpdate.length === 0) {
      alert('Нет подкластеров с настроенными моделями поиска');
      return;
    }
    
    setIsUpdating(true);
    setUpdateProgress({ current: 0, total: configsToUpdate.length, currentName: cluster.name });
    
    try {
      const response = await fetch('/api/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: configsToUpdate,
          clusters,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Update failed');
      }
      
      const data = await response.json();
      setUpdateResults(data.results);
      await loadSubclusterStats();
      
    } catch (error) {
      console.error('Update error:', error);
      alert('Ошибка при обновлении: ' + (error instanceof Error ? error.message : 'Unknown'));
    } finally {
      setIsUpdating(false);
      setUpdateProgress(null);
    }
  };

  const toggleCluster = (id: string) => {
    setExpandedClusters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Фильтрация кластеров по поиску
  const filteredClusters = useMemo(() => {
    if (!searchText) return clusters;
    const lower = searchText.toLowerCase();
    return clusters.filter((cluster) => 
      cluster.name.toLowerCase().includes(lower) ||
      cluster.types.some((type) => type.name.toLowerCase().includes(lower))
    );
  }, [clusters, searchText]);

  const handleSelectCluster = (id: string) => {
    setSelectedCluster(id);
    setSelectedType(null);
    if (!expandedClusters[id]) {
      setExpandedClusters((prev) => ({ ...prev, [id]: true }));
    }
  };

  const handleSelectType = (clusterId: string, typeId: string) => {
    setSelectedCluster(clusterId);
    setSelectedType(typeId);
  };

  // Добавление нового кластера/подкластера
  const handleAdd = async () => {
    if (!newItemName.trim()) return;
    
    try {
      const res = await fetch('/api/clusters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItemName.trim(),
          parentClusterId: addingTo
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Если добавляем подкластер с выбранной моделью - сохраняем конфигурацию
        if (addingTo && data.id && newSubclusterModel) {
          const subclusterId = data.id;
          const newConfig = {
            subclusterId,
            models: [newSubclusterModel],
            filters: [],
            applyFilters: false,
            minFrequency: 0
          };
          
          // Сохраняем в subclusterConfigs
          const savedConfigs = localStorage.getItem('subclusterConfigs');
          const configs = savedConfigs ? JSON.parse(savedConfigs) : [];
          configs.push(newConfig);
          localStorage.setItem('subclusterConfigs', JSON.stringify(configs));
          saveConfigsToServer(configs); // Сохраняем на сервер
          
          setSubclusterConfigs(configs);
        }
        
        setNewItemName('');
        setNewSubclusterModel('');
        setShowAddModal(false);
        setAddingTo(null);
        loadData();
      }
    } catch (e) {
      console.error('Error adding:', e);
    }
  };

  // Переименование
  const handleRename = async () => {
    if (!editingItem || !editingItem.name.trim()) return;
    
    try {
      const res = await fetch('/api/clusters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          newName: editingItem.name.trim(),
          isSubcluster: editingItem.isSubcluster,
          parentClusterId: editingItem.parentId
        })
      });
      
      if (res.ok) {
        setEditingItem(null);
        loadData();
      }
    } catch (e) {
      console.error('Error renaming:', e);
    }
  };

  // Удаление
  const handleDelete = async (id: string, isSubcluster: boolean) => {
    if (!confirm('Удалить? Это действие нельзя отменить.')) return;
    
    try {
      const res = await fetch(`/api/clusters?id=${encodeURIComponent(id)}&isSubcluster=${isSubcluster}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        if (selectedCluster === id) setSelectedCluster(null);
        if (selectedType === id) setSelectedType(null);
        loadData();
      }
    } catch (e) {
      console.error('Error deleting:', e);
    }
  };

  // Получить конфигурацию для кластера/типа
  const getConfig = (clusterId: string, typeId?: string): ClusterConfig => {
    const existing = clusterConfigs.find(c => 
      typeId ? c.typeId === typeId : c.clusterId === clusterId && !c.typeId
    );
    return existing || { clusterId, typeId, models: [], filters: [] };
  };

  // Сохранить конфигурацию
  const saveConfig = (config: ClusterConfig) => {
    const newConfigs = clusterConfigs.filter(c => 
      !(config.typeId ? c.typeId === config.typeId : c.clusterId === config.clusterId && !c.typeId)
    );
    newConfigs.push(config);
    setClusterConfigs(newConfigs);
    localStorage.setItem('clusterConfigs', JSON.stringify(newConfigs));
    
    // Синхронизируем с subclusterConfigs для карты
    if (config.typeId) {
      const newSubConfigs = subclusterConfigs.filter(c => c.subclusterId !== config.typeId);
      if (config.models.length > 0 || config.filters.length > 0) {
        newSubConfigs.push({
          subclusterId: config.typeId,
          models: config.models,
          filters: config.filters,
        });
      }
      setSubclusterConfigs(newSubConfigs);
      localStorage.setItem('subclusterConfigs', JSON.stringify(newSubConfigs));
      saveConfigsToServer(newSubConfigs); // Сохраняем на сервер
    }
  };

  // Переключение модели
  const toggleModel = (modelId: string) => {
    const config = getConfig(selectedCluster!, selectedType || undefined);
    const models = config.models.includes(modelId)
      ? config.models.filter(m => m !== modelId)
      : [...config.models, modelId];
    saveConfig({ ...config, models });
  };

  // Переключение фильтра
  const toggleFilter = (filterId: string) => {
    const config = getConfig(selectedCluster!, selectedType || undefined);
    const filtersList = config.filters.includes(filterId)
      ? config.filters.filter(f => f !== filterId)
      : [...config.filters, filterId];
    saveConfig({ ...config, filters: filtersList });
  };

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, modelId: string) => {
    setDraggedModel(modelId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, modelId: string) => {
    e.preventDefault();
    if (modelId !== draggedModel) {
      setDragOverModel(modelId);
    }
  };

  const handleDragLeave = () => {
    setDragOverModel(null);
  };

  const handleDrop = (e: React.DragEvent, targetModelId: string) => {
    e.preventDefault();
    if (!draggedModel || draggedModel === targetModelId) return;

    const currentOrder = modelsOrder.length > 0 
      ? modelsOrder 
      : sortedModels.map(m => m.id);
    
    const draggedIndex = currentOrder.indexOf(draggedModel);
    const targetIndex = currentOrder.indexOf(targetModelId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedModel);
    
    setModelsOrder(newOrder);
    saveModelsOrder(newOrder);
    setDraggedModel(null);
    setDragOverModel(null);
  };

  const handleDragEnd = () => {
    setDraggedModel(null);
    setDragOverModel(null);
  };

  const selectedClusterData = clusters.find((c) => c.id === selectedCluster);
  const selectedTypeData = selectedClusterData?.types.find((t) => t.id === selectedType);
  const currentConfigForPanel = selectedCluster ? getConfig(selectedCluster, selectedType || undefined) : null;

  return (
    <MainLayout>
      <div className="h-full flex p-4 gap-4">
        {/* Clusters tree */}
        <div 
          className="w-72 rounded-3xl border border-white/20 overflow-hidden flex flex-col"
          style={{
            background: '#1a1a1a',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className="p-3 border-b border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-white/60">Кластеры</span>
              <div 
                className="flex items-center gap-1 rounded-full px-1.5 py-1 border border-white/20"
                style={{
                  background: '#1a1a1a',
                  boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.2)'
                }}
              >
                <button 
                  onClick={handleUpdateAll}
                  disabled={isUpdating}
                  className="px-2 py-0.5 text-cyan-400 rounded-full text-[10px] hover:bg-white/10 transition-colors flex items-center gap-1 disabled:opacity-50"
                  title="Обновить запросы всех подкластеров"
                >
                  {isUpdating ? (
                    <svg className="w-2.5 h-2.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-5.07l-2.83 2.83M8.76 15.24l-2.83 2.83m11.31 0l-2.83-2.83M8.76 8.76L5.93 5.93" />
                    </svg>
                  ) : (
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                    </svg>
                  )}
                  {isUpdating ? 'Обновление...' : 'Обновить все'}
                </button>
                <button 
                  onClick={() => router.push('/slovolov-pro/clusters/intersections')}
                  className="w-6 h-6 flex items-center justify-center bg-purple-500/20 text-purple-400 rounded-full hover:bg-purple-500/30 transition-colors"
                  title="Пересечения"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="9" r="6" />
                    <circle cx="15" cy="15" r="6" />
                  </svg>
                </button>
                <AddButton 
                  onClick={() => { setShowAddModal(true); setAddingTo(null); }}
                  title="Добавить кластер"
                />
                <span className="w-6 h-6 flex items-center justify-center bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-medium">{clusters.length}</span>
              </div>
            </div>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Поиск..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-white/30"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredClusters.length === 0 ? (
              <div className="px-4 py-8 text-center text-white/30 text-xs">
                {searchText ? (
                  <p>Ничего не найдено</p>
                ) : (
                  <>
                    <p>Кластеры не найдены</p>
                    <p className="text-[10px] mt-2">Нажмите "Кластер" для создания</p>
                  </>
                )}
              </div>
            ) : (
              filteredClusters.map((cluster) => {
                const clusterConfig = getConfig(cluster.id);
                const hasModels = clusterConfig.models.length > 0;
                const hasFilters = clusterConfig.filters.length > 0;
                
                return (
                  <div key={cluster.id} className="group">
                    <div
                      className={`flex items-center gap-1 px-2 py-2 cursor-pointer transition-colors ${
                        selectedCluster === cluster.id && !selectedType 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'hover:bg-white/5'
                      }`}
                      onClick={() => handleSelectCluster(cluster.id)}
                    >
                      <button 
                        className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 rounded transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCluster(cluster.id);
                        }}
                      >
                        <svg className={`w-2.5 h-2.5 transition-transform duration-200 ${expandedClusters[cluster.id] ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l10 7-10 7V5z"/></svg>
                      </button>
                      <span className="flex-1 text-xs font-medium truncate">{cluster.name}</span>
                      
                      {/* Индикаторы */}
                      <div className="flex gap-1 mr-1">
                        {hasModels && <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>}
                        {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>}
                      </div>
                      
                      {/* Действия */}
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <AddButton
                          onClick={() => { setShowAddModal(true); setAddingTo(cluster.id); setNewSubclusterModel(''); }}
                          title="Добавить подкластер"
                          size="sm"
                        />
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setClusterMenuOpen(clusterMenuOpen === cluster.id ? null : cluster.id); }}
                            className="w-5 h-5 flex items-center justify-center text-white/40 hover:bg-white/10 rounded-full"
                            title="Ещё"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                          </button>
                          {clusterMenuOpen === cluster.id && (
                            <div 
                              className="absolute right-0 top-6 z-50 bg-[#1a1a1a] rounded-xl border border-white/10 shadow-xl py-1 min-w-[140px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => { handleUpdateCluster(cluster.id); setClusterMenuOpen(null); }}
                                disabled={isUpdating}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 disabled:opacity-50"
                              >
                                <svg className={`w-3 h-3 text-cyan-400 ${isUpdating ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
                                Обновить все
                              </button>
                              <button
                                onClick={() => { setEditingItem({ id: cluster.id, name: cluster.name, isSubcluster: false }); setClusterMenuOpen(null); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
                              >
                                <svg className="w-3 h-3 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Переименовать
                              </button>
                              <button
                                onClick={() => { handleDelete(cluster.id, false); setClusterMenuOpen(null); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                              >
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                Удалить
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/40">{cluster.types.length}</span>
                    </div>
                    
                    {expandedClusters[cluster.id] && (
                      <div className="bg-black/20">
                        {cluster.types.map((type) => {
                          const typeConfig = getConfig(cluster.id, type.id);
                          const typeHasModels = typeConfig.models.length > 0;
                          const typeHasFilters = typeConfig.filters.length > 0;
                          const stats = getSubclusterStats(type.id);
                          
                          return (
                            <div
                              key={type.id}
                              className={`group/sub flex items-center gap-1 pl-8 pr-2 py-1.5 cursor-pointer transition-colors ${
                                selectedType === type.id 
                                  ? 'bg-blue-500/20 text-blue-400' 
                                  : 'hover:bg-white/5 text-white/60'
                              }`}
                              onClick={() => handleSelectType(cluster.id, type.id)}
                            >
                              <span className="flex-1 text-xs truncate">{type.name}</span>
                              
                              {/* Статистика запросов */}
                              {stats.queries > 0 && (
                                <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[9px] font-medium">
                                  {stats.queries.toLocaleString()}
                                </span>
                              )}
                              
                              <div className="flex gap-1 mr-1">
                                {(typeHasModels || stats.models > 0) && (
                                  <span className={`w-1.5 h-1.5 rounded-full ${stats.invalidModels > 0 ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`}
                                    title={stats.invalidModels > 0 ? `${stats.invalidModels} модел(ей) не найдено` : undefined}
                                  ></span>
                                )}
                                {(typeHasFilters || stats.filters > 0) && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                                )}
                              </div>
                              
                              {/* Действия подкластера */}
                              <div className="flex gap-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingItem({ id: type.id, name: type.name, isSubcluster: true, parentId: cluster.id }); }}
                                  className="w-4 h-4 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 rounded"
                                  title="Переименовать"
                                >
                                  <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(type.id, true); }}
                                  className="w-4 h-4 flex items-center justify-center text-red-400 hover:bg-red-500/20 rounded"
                                  title="Удалить"
                                >
                                  <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          {/* Legend */}
          <div className="p-3 border-t border-white/10 text-[10px] text-white/30 flex gap-4">
            <span className="flex items-center gap-1">
              <span className="px-1 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[8px]">N</span> Запросы
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Модели
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span> Фильтры
            </span>
          </div>
        </div>

        {/* Details panel */}
        <div 
          className="flex-1 rounded-3xl border border-white/20 overflow-hidden flex flex-col"
          style={{
            background: '#1a1a1a',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
          }}
        >
          {(selectedTypeData || selectedClusterData) ? (
            <>
              <div className="p-4 border-b border-white/10">
                {selectedTypeData ? (
                  <>
                    <div className="text-[10px] text-white/40 mb-1">{selectedClusterData?.name}</div>
                    <h2 className="text-sm font-medium">{selectedTypeData.name}</h2>
                  </>
                ) : (
                  <>
                    <h2 className="text-sm font-medium">{selectedClusterData?.name}</h2>
                    <p className="text-[10px] text-white/40 mt-1">Выберите подкластер для настройки моделей и фильтров</p>
                  </>
                )}
              </div>
              
              <div className="flex-1 p-4 overflow-auto">
                {/* Секция Запросы для подкластера */}
                {selectedTypeData && (() => {
                  const stats = getSubclusterStats(selectedTypeData.id);
                  const config = subclusterConfigs.find(c => c.subclusterId === selectedTypeData.id);
                  const invalidModels = config?.models.filter(m => !validModelIds.has(m)) || [];
                  
                  return (
                    <div className="mb-4 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20">
                      {/* Предупреждение о недействительных моделях */}
                      {invalidModels.length > 0 && (
                        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <div className="flex items-center gap-2 text-red-400 text-xs">
                            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>Модели не найдены: {invalidModels.join(', ')}</span>
                            <button 
                              onClick={() => {
                                // Удаляем невалидные модели из конфига
                                const newConfigs = subclusterConfigs.map(c => 
                                  c.subclusterId === selectedTypeData.id 
                                    ? { ...c, models: c.models.filter(m => validModelIds.has(m)) }
                                    : c
                                );
                                setSubclusterConfigs(newConfigs);
                                localStorage.setItem('subclusterConfigs', JSON.stringify(newConfigs));
                                saveConfigsToServer(newConfigs); // Сохраняем на сервер
                              }}
                              className="ml-auto px-2 py-0.5 bg-red-500/20 hover:bg-red-500/30 rounded text-[10px]"
                            >
                              Очистить
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <span className="text-sm font-medium text-white">Запросы</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateSubcluster(selectedTypeData.id)}
                            disabled={isUpdating || stats.models === 0 || stats.models === stats.invalidModels}
                            className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs transition-colors flex items-center gap-1 disabled:opacity-50"
                            title={stats.models === 0 ? 'Сначала добавьте модели поиска' : stats.models === stats.invalidModels ? 'Все модели недействительны' : 'Обновить запросы'}
                          >
                            {isUpdating ? (
                              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                              </svg>
                            )}
                            Обновить
                          </button>
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}/clusters?cluster=${encodeURIComponent(selectedCluster!)}&subcluster=${encodeURIComponent(selectedTypeData.id)}`;
                              navigator.clipboard.writeText(url);
                            }}
                            className="px-3 py-1 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded-lg text-xs transition-colors flex items-center gap-1"
                            title="Скопировать ссылку"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                            Ссылка
                          </button>
                          {stats.queries > 0 && (
                            <a
                              href={`/editor?id=${encodeURIComponent(selectedTypeData.id)}`}
                              className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-xs transition-colors flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <ellipse cx="12" cy="12" rx="9" ry="6" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              Просмотр
                            </a>
                          )}
                        </div>
                      </div>
                      {stats.queries > 0 ? (
                        <>
                          <div className="grid grid-cols-4 gap-3">
                            <div 
                              className="rounded-xl p-3 text-center border border-white/10"
                              style={{
                                background: '#1a1a1a',
                                boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.2)'
                              }}
                            >
                              <div className="text-2xl font-bold text-cyan-400">{stats.queries.toLocaleString()}</div>
                              <div className="text-[10px] text-white/40 mt-1">запросов</div>
                            </div>
                            <div 
                              className="rounded-xl p-3 text-center border border-white/10"
                              style={{
                                background: '#1a1a1a',
                                boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.2)'
                              }}
                            >
                              <div className="text-2xl font-bold text-purple-400">{stats.totalImpressions.toLocaleString()}</div>
                              <div className="text-[10px] text-white/40 mt-1">охват</div>
                            </div>
                            <div 
                              className="rounded-xl p-3 text-center border border-white/10"
                              style={{
                                background: '#1a1a1a',
                                boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.2)'
                              }}
                            >
                              <div className="text-2xl font-bold text-green-400">{stats.models}</div>
                              <div className="text-[10px] text-white/40 mt-1">моделей</div>
                            </div>
                            <div 
                              className="rounded-xl p-3 text-center border border-white/10"
                              style={{
                                background: '#1a1a1a',
                                boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.2)'
                              }}
                            >
                              <div className="text-2xl font-bold text-orange-400">{stats.filters}</div>
                              <div className="text-[10px] text-white/40 mt-1">фильтров</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-4 text-white/30 text-xs">
                          {stats.models > 0 ? (
                            <>
                              <p className="text-yellow-400">Нажмите "Обновить" для загрузки запросов</p>
                              <p className="text-[10px] mt-1">{stats.models} модел{stats.models === 1 ? 'ь' : stats.models < 5 ? 'и' : 'ей'} × {stats.filters} фильтр{stats.filters === 1 ? '' : stats.filters < 5 ? 'а' : 'ов'}</p>
                            </>
                          ) : (
                            <>
                              <p>Запросы ещё не сгенерированы</p>
                              <p className="text-[10px] mt-1">Добавьте модели и фильтры, затем нажмите "Обновить"</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                {/* Модели и фильтры - только для подкластера */}
                {selectedTypeData && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Модели поиска */}
                  <div className="bg-black/20 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-green-400"></span>
                      <span className="text-xs font-medium text-white/60">Модели поиска</span>
                      <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px]">
                        {currentConfigForPanel?.models.length || 0}
                      </span>
                      <span className="text-[9px] text-white/30 ml-auto">перетаскивание</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Поиск моделей..."
                      value={modelSearchText}
                      onChange={(e) => setModelSearchText(e.target.value)}
                      className="w-full px-2 py-1.5 mb-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/30 focus:outline-none focus:border-green-400/50"
                    />
                    <div className="space-y-1 max-h-[300px] overflow-y-auto">
                      {sortedModels.length === 0 ? (
                        <p className="text-[10px] text-white/30">Модели не найдены</p>
                      ) : (
                        sortedModels.map((model) => (
                          <div
                            key={model.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, model.id)}
                            onDragOver={(e) => handleDragOver(e, model.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, model.id)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab transition-all ${
                              draggedModel === model.id
                                ? 'opacity-50 scale-95'
                                : dragOverModel === model.id
                                  ? 'border-t-2 border-green-400'
                                  : currentConfigForPanel?.models.includes(model.id)
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'hover:bg-white/5 text-white/60'
                            }`}
                          >
                            <svg className="w-3 h-3 text-white/20 flex-shrink-0 cursor-grab" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="9" cy="6" r="1.5"/>
                              <circle cx="15" cy="6" r="1.5"/>
                              <circle cx="9" cy="12" r="1.5"/>
                              <circle cx="15" cy="12" r="1.5"/>
                              <circle cx="9" cy="18" r="1.5"/>
                              <circle cx="15" cy="18" r="1.5"/>
                            </svg>
                            <label className="flex items-center gap-2 flex-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={currentConfigForPanel?.models.includes(model.id) || false}
                                onChange={() => toggleModel(model.id)}
                                className="accent-green-500 w-3 h-3"
                              />
                              <span className="text-xs truncate">{model.name}</span>
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Фильтры */}
                  <div className="bg-black/20 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                      <span className="text-xs font-medium text-white/60">Фильтры</span>
                      <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-[10px]">
                        {currentConfigForPanel?.filters.length || 0}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Поиск фильтров..."
                      value={filterSearchText}
                      onChange={(e) => setFilterSearchText(e.target.value)}
                      className="w-full px-2 py-1.5 mb-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/30 focus:outline-none focus:border-orange-400/50"
                    />
                    <div className="space-y-1 max-h-[300px] overflow-y-auto">
                      {filteredFilters.length === 0 ? (
                        <p className="text-[10px] text-white/30">Фильтры не найдены</p>
                      ) : (
                        filteredFilters.map((filter) => (
                          <label
                            key={filter.id}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                              currentConfigForPanel?.filters.includes(filter.id)
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'hover:bg-white/5 text-white/60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={currentConfigForPanel?.filters.includes(filter.id) || false}
                              onChange={() => toggleFilter(filter.id)}
                              className="accent-orange-500 w-3 h-3"
                            />
                            <span className="text-xs truncate">{filter.name}</span>
                            <span className="text-[10px] text-white/30 ml-auto">{filter.items.length}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                )}

                {/* Подкластеры */}
                {selectedClusterData && !selectedType && selectedClusterData.types.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-medium text-white/60 mb-2">Подкластеры</div>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedClusterData.types.map((type) => {
                        const typeConfig = getConfig(selectedClusterData.id, type.id);
                        const stats = getSubclusterStats(type.id);
                        return (
                          <div
                            key={type.id}
                            className="rounded-2xl p-3 cursor-pointer transition-all hover:scale-[1.02] border border-white/10"
                            style={{
                              background: '#1a1a1a',
                              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                            }}
                            onClick={() => handleSelectType(selectedClusterData.id, type.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-medium truncate flex-1">{type.name}</div>
                              {stats.queries > 0 && (
                                <div className="text-xs font-bold text-cyan-400 ml-2">{stats.queries.toLocaleString()}</div>
                              )}
                            </div>
                            
                            {/* Статистика компактная */}
                            {stats.queries > 0 && stats.totalImpressions > 0 && (
                              <div className="mt-1 text-[10px] text-white/40">
                                охват: <span className="text-white/60">{stats.totalImpressions.toLocaleString()}</span>
                              </div>
                            )}
                            
                            <div className="flex gap-3 mt-1.5 text-[10px] text-white/50">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                {stats.models || typeConfig.models.length}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                                {stats.filters || typeConfig.filters.length}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/30">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-4 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                </svg>
                <p className="text-sm">Выберите кластер или подкластер</p>
                <p className="text-xs mt-2 text-white/20">для настройки моделей и фильтров</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно добавления */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-4 w-80 border border-white/10" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-medium mb-3">
              {addingTo ? 'Новый подкластер' : 'Новый кластер'}
            </h3>
            {addingTo && (
              <p className="text-[10px] text-white/40 mb-2">в {addingTo}</p>
            )}
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={addingTo ? "Название подкластера..." : "Название кластера..."}
              className="w-full bg-white/5 border-0 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 mb-3"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            />
            
            {/* Выбор модели для подкластера (опционально) */}
            {addingTo && (
              <div className="mb-3">
                <label className="text-[10px] text-white/40 block mb-1">Модель поиска <span className="text-white/25">(опционально)</span></label>
                <select
                  value={newSubclusterModel}
                  onChange={(e) => setNewSubclusterModel(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                >
                  <option value="" className="bg-[#1a1a1a] text-white/60">Без модели</option>
                  {(modelsOrder.length > 0 ? modelsOrder : searchModels.map(m => m.id)).map(modelId => {
                    const model = searchModels.find(m => m.id === modelId);
                    if (!model) return null;
                    return (
                      <option key={model.id} value={model.id} className="bg-[#1a1a1a] text-white">{model.name}</option>
                    );
                  })}
                </select>
              </div>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddModal(false); setNewItemName(''); setNewSubclusterModel(''); }}
                className="flex-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-xl text-xs transition-colors"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно переименования */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEditingItem(null)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-4 w-80 border border-white/10" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-medium mb-3">Переименовать</h3>
            <input
              type="text"
              value={editingItem.name}
              onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
              className="w-full bg-white/5 border-0 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 mb-3"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleRename}
                className="flex-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl text-xs transition-colors"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно с результатами обновления */}
      {updateResults && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setUpdateResults(null)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-4 w-[500px] max-h-[80vh] border border-white/10 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Результаты обновления</h3>
              <button onClick={() => setUpdateResults(null)} className="text-white/40 hover:text-white">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Статистика */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-green-500/10 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-green-400">
                  {updateResults.filter(r => r.status === 'success').length}
                </div>
                <div className="text-[9px] text-green-400/60">Успешно</div>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-yellow-400">
                  {updateResults.filter(r => r.status === 'skipped').length}
                </div>
                <div className="text-[9px] text-yellow-400/60">Пропущено</div>
              </div>
              <div className="bg-red-500/10 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-red-400">
                  {updateResults.filter(r => r.status === 'error').length}
                </div>
                <div className="text-[9px] text-red-400/60">Ошибки</div>
              </div>
            </div>
            
            {/* Список результатов */}
            <div className="flex-1 overflow-y-auto space-y-1">
              {updateResults.map((result, idx) => (
                <div 
                  key={idx}
                  className={`p-2 rounded-lg ${
                    result.status === 'success' ? 'bg-green-500/5 border border-green-500/20' :
                    result.status === 'skipped' ? 'bg-yellow-500/5 border border-yellow-500/20' :
                    'bg-red-500/5 border border-red-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate">{result.subclusterName || result.subclusterId}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                      result.status === 'success' ? 'bg-green-500/20 text-green-400' :
                      result.status === 'skipped' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {result.status === 'success' ? 'OK' : result.status === 'skipped' ? 'Пропущен' : 'Ошибка'}
                    </span>
                  </div>
                  {result.status === 'success' && (
                    <div className="flex gap-3 mt-1 text-[9px] text-white/40">
                      <span>Запросов: <span className="text-cyan-400">{result.queriesCount}</span></span>
                      <span>После фильтра: <span className="text-green-400">{result.filteredCount}</span></span>
                      <span>Показов: <span className="text-blue-400">{result.totalImpressions.toLocaleString()}</span></span>
                    </div>
                  )}
                  {result.error && (
                    <div className="text-[9px] text-red-400/60 mt-1">{result.error}</div>
                  )}
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setUpdateResults(null)}
              className="mt-4 w-full px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Индикатор загрузки */}
      {isUpdating && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/10 text-center">
            <Spinner size="md" className="mx-auto mb-3" />
            <div className="text-sm font-medium text-white mb-1">Обновление подкластеров...</div>
            <div className="text-[10px] text-white/40">Это может занять несколько минут</div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
