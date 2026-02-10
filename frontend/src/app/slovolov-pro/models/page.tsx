'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import MainLayout from '@/components/MainLayout';
import AddButton from '@/components/AddButton';
import { Spinner } from '@/components/Spinner';
import { useRouter, useSearchParams } from 'next/navigation';

interface SearchModel {
  id: string;
  name: string;
  content: string;
}

interface Cluster {
  id: string;
  name: string;
  types: Subcluster[];
}

interface Subcluster {
  id: string;
  name: string;
}

interface SubclusterConfig {
  subclusterId: string;
  models: string[];
  filters: string[];
}

function ModelsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [models, setModels] = useState<SearchModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ query: string; count: number; resultId?: string } | null>(null);
  
  // CRUD состояния
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Состояния для подкластеров
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [subclusterConfigs, setSubclusterConfigs] = useState<SubclusterConfig[]>([]);
  const [showSubclusterModal, setShowSubclusterModal] = useState(false);
  
  // Drag-and-drop состояния
  const [draggedModel, setDraggedModel] = useState<string | null>(null);
  const [dragOverModel, setDragOverModel] = useState<string | null>(null);

  const loadModels = useCallback(async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      setModels(data);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Загрузка кластеров и подкластеров
  useEffect(() => {
    const loadClusters = async () => {
      try {
        const res = await fetch('/api/clusters');
        if (res.ok) {
          const data = await res.json();
          setClusters(data);
        }
      } catch (error) {
        console.error('Load clusters error:', error);
      }
    };
    
    loadClusters();
    
    // Загрузка конфигов подкластеров из localStorage
    const savedConfigs = localStorage.getItem('subclusterConfigs');
    if (savedConfigs) {
      setSubclusterConfigs(JSON.parse(savedConfigs));
    }
    
    // Слушаем изменения в localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'subclusterConfigs' && e.newValue) {
        setSubclusterConfigs(JSON.parse(e.newValue));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Drag-and-drop handlers для моделей
  const handleModelDragStart = (e: React.DragEvent, modelId: string) => {
    setDraggedModel(modelId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleModelDragOver = (e: React.DragEvent, modelId: string) => {
    e.preventDefault();
    if (draggedModel && draggedModel !== modelId) {
      setDragOverModel(modelId);
    }
  };

  const handleModelDragLeave = () => {
    setDragOverModel(null);
  };

  const handleModelDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedModel || draggedModel === targetId) {
      setDraggedModel(null);
      setDragOverModel(null);
      return;
    }

    const currentOrder = models.map(m => m.id);
    const draggedIndex = currentOrder.indexOf(draggedModel);
    const targetIndex = currentOrder.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Переставляем элементы
    currentOrder.splice(draggedIndex, 1);
    currentOrder.splice(targetIndex, 0, draggedModel);

    // Сохраняем на сервер
    try {
      await fetch('/api/models', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: currentOrder }),
      });
      loadModels(); // Перезагружаем данные
    } catch (error) {
      console.error('Error reordering models:', error);
    }

    setDraggedModel(null);
    setDragOverModel(null);
  };

  const handleModelDragEnd = () => {
    setDraggedModel(null);
    setDragOverModel(null);
  };

  // Синхронизация selectedModel с URL и localStorage
  useEffect(() => {
    if (models.length === 0) return;
    
    const modelId = searchParams.get('id');
    if (modelId) {
      const model = models.find((m: SearchModel) => m.id === modelId || m.name === modelId || m.id.includes(modelId));
      if (model && model.id !== selectedModel) {
        setSelectedModel(model.id);
        // Сохраняем в localStorage
        localStorage.setItem('lastSelectedModel', model.id);
      }
    } else if (!selectedModel) {
      // Если нет выбранной модели и нет ID в URL, проверяем localStorage
      const savedModelId = localStorage.getItem('lastSelectedModel');
      const savedModel = savedModelId ? models.find((m: SearchModel) => m.id === savedModelId) : null;
      
      if (savedModel) {
        setSelectedModel(savedModel.id);
        router.replace(`/slovolov-pro/models?id=${encodeURIComponent(savedModel.id)}`, { scroll: false });
      } else {
        // Если нет сохранённой модели, выбираем первую
        setSelectedModel(models[0].id);
        localStorage.setItem('lastSelectedModel', models[0].id);
        router.replace(`/slovolov-pro/models?id=${encodeURIComponent(models[0].id)}`, { scroll: false });
      }
    }
  }, [searchParams, models, selectedModel, router]);

  const selectedModelData = useMemo(() => 
    models.find((m) => m.id === selectedModel), 
    [models, selectedModel]
  );

  // Стабильные значения для предотвращения мерцания при переключении
  const modelName = selectedModelData?.name || '';
  const modelContent = selectedModelData?.content || '';

  // При выборе модели - выходим из режима редактирования
  const prevSelectedModelRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedModel !== prevSelectedModelRef.current) {
      prevSelectedModelRef.current = selectedModel;
      if (selectedModelData) {
        setEditContent(selectedModelData.content);
        setIsEditing(false);
        setIsRenaming(false);
      }
    }
  }, [selectedModel, selectedModelData]);

  // Фильтрация моделей по поиску
  const filteredModels = useMemo(() => {
    if (!searchText) return models;
    const lower = searchText.toLowerCase();
    return models.filter((m) => 
      m.name.toLowerCase().includes(lower) ||
      m.content.toLowerCase().includes(lower)
    );
  }, [models, searchText]);

  // Создание новой модели
  const handleCreate = async () => {
    if (!newModelName.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newModelName.trim(), content: '' }),
      });
      if (res.ok) {
        const newModel = await res.json();
        setModels((prev) => [...prev, newModel].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedModel(newModel.id);
        router.push(`/slovolov-pro/models?id=${encodeURIComponent(newModel.id)}`, { scroll: false });
        setIsCreating(false);
        setNewModelName('');
      } else if (res.status === 409) {
        alert(`Модель с именем "${newModelName.trim()}" уже существует`);
      } else {
        alert('Ошибка при создании модели');
      }
    } catch (error) {
      console.error('Create error:', error);
      alert('Ошибка при создании модели');
    } finally {
      setActionLoading(false);
    }
  };

  // Сохранение контента модели
  const handleSaveContent = async () => {
    if (!selectedModel) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedModel, content: editContent }),
      });
      if (res.ok) {
        setModels((prev) =>
          prev.map((m) => (m.id === selectedModel ? { ...m, content: editContent } : m))
        );
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Переименование модели
  const handleRename = async () => {
    if (!selectedModel || !renameValue.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedModel, name: renameValue.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setModels((prev) =>
          prev.map((m) => (m.id === selectedModel ? { ...m, id: updated.id, name: updated.name } : m))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setSelectedModel(updated.id);
        router.push(`/slovolov-pro/models?id=${encodeURIComponent(updated.id)}`, { scroll: false });
        setIsRenaming(false);
        setRenameValue('');
      } else if (res.status === 409) {
        alert(`Модель с именем "${renameValue.trim()}" уже существует`);
      } else {
        alert('Ошибка при переименовании модели');
      }
    } catch (error) {
      console.error('Rename error:', error);
      alert('Ошибка при переименовании модели');
    } finally {
      setActionLoading(false);
    }
  };

  // Удаление модели
  const handleDelete = async () => {
    if (!selectedModel) return;
    if (!confirm(`Удалить модель "${modelName}"?`)) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`/api/models?id=${encodeURIComponent(selectedModel)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setModels((prev) => prev.filter((m) => m.id !== selectedModel));
        setSelectedModel(models.length > 1 ? models.find((m) => m.id !== selectedModel)?.id || null : null);
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Синхронизация результатов с подкластером если модель привязана
  const syncToSubcluster = async (resultId: string, modelNameOrId: string) => {
    try {
      // Находим модель по ID или по названию
      const modelData = models.find(m => m.id === modelNameOrId || m.name === modelNameOrId);
      if (!modelData) {
        console.log('[syncToSubcluster] Model not found:', modelNameOrId);
        console.log('[syncToSubcluster] Available models:', models.map(m => ({ id: m.id, name: m.name })));
        return;
      }
      
      const modelId = modelData.id;
      console.log('[syncToSubcluster] Model ID:', modelId, 'Name:', modelData.name);
      
      // Получаем конфиги подкластеров из localStorage
      const savedConfigs = localStorage.getItem('subclusterConfigs');
      if (!savedConfigs) {
        console.log('[syncToSubcluster] No subcluster configs in localStorage');
        alert('Нет конфигураций подкластеров. Пожалуйста, привяжите модель к подкластеру в разделе Кластеры.');
        return;
      }
      
      const configs: { subclusterId: string; models: string[]; filters: string[] }[] = JSON.parse(savedConfigs);
      console.log('[syncToSubcluster] All configs:', configs.length);
      console.log('[syncToSubcluster] Searching for modelId:', modelId);
      
      // Ищем подкластеры, к которым привязана эта модель (по ID)
      const linkedSubclusters = configs.filter(c => 
        c.models && c.models.includes(modelId)
      );
      
      if (linkedSubclusters.length === 0) {
        console.log('[syncToSubcluster] No linked subclusters found for model:', modelData.name, 'ID:', modelId);
        console.log('[syncToSubcluster] Sample config models:', configs.slice(0, 3).map(c => ({ subId: c.subclusterId, models: c.models })));
        alert(`Модель "${modelData.name}" не привязана ни к одному подкластеру. Привяжите её в разделе Кластеры.`);
        return;
      }
      
      console.log('[syncToSubcluster] Found linked subclusters:', linkedSubclusters);
      
      // Получаем данные кластеров из API
      const clustersResponse = await fetch('/api/clusters');
      const clustersData: { id: string; name: string; types: { id: string; name: string }[] }[] = 
        clustersResponse.ok ? await clustersResponse.json() : [];
      
      // Синхронизируем с каждым привязанным подкластером
      for (const subConfig of linkedSubclusters) {
        // Находим информацию о кластере и подкластере
        let clusterName = '';
        let subclusterName = subConfig.subclusterId;
        let clusterId = '';
        
        for (const cluster of clustersData) {
          const subcluster = cluster.types?.find(t => t.id === subConfig.subclusterId);
          if (subcluster) {
            clusterId = cluster.id;
            clusterName = cluster.name;
            subclusterName = subcluster.name;
            break;
          }
        }
        
        console.log('[syncToSubcluster] Syncing to:', { 
          subclusterId: subConfig.subclusterId, 
          subclusterName,
          clusterName,
          models: subConfig.models,
          filters: subConfig.filters
        });
        
        const syncResponse = await fetch('/api/sync-to-subcluster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resultId,
            subclusterId: subConfig.subclusterId,
            subclusterName,
            clusterId,
            clusterName,
            models: subConfig.models,
            filters: subConfig.filters,
          }),
        });
        
        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          console.log('[syncToSubcluster] Synced successfully:', syncData);
        } else {
          console.error('[syncToSubcluster] Sync failed:', await syncResponse.text());
        }
      }
    } catch (error) {
      console.error('[syncToSubcluster] Error:', error);
    }
  };

  // Получить подкластеры, к которым привязана модель
  const getLinkedSubclusters = useCallback((modelId: string): string[] => {
    return subclusterConfigs
      .filter(config => config.models.includes(modelId))
      .map(config => config.subclusterId);
  }, [subclusterConfigs]);

  // Переключить привязку модели к подкластеру
  const toggleSubclusterLink = (subclusterId: string) => {
    if (!selectedModel) return;
    
    const newConfigs = [...subclusterConfigs];
    const configIndex = newConfigs.findIndex(c => c.subclusterId === subclusterId);
    
    if (configIndex === -1) {
      // Создаем новую конфигурацию
      newConfigs.push({
        subclusterId,
        models: [selectedModel],
        filters: []
      });
    } else {
      // Обновляем существующую
      const config = newConfigs[configIndex];
      if (config.models.includes(selectedModel)) {
        // Удаляем модель
        config.models = config.models.filter(id => id !== selectedModel);
      } else {
        // Добавляем модель
        config.models.push(selectedModel);
      }
    }
    
    setSubclusterConfigs(newConfigs);
    localStorage.setItem('subclusterConfigs', JSON.stringify(newConfigs));
  };

  // Мемоизируем вычисление привязанных подкластеров для текущей модели
  const linkedSubclusters = useMemo(() => {
    if (!selectedModel) return [];
    
    const linkedIds = getLinkedSubclusters(selectedModel);
    return clusters.flatMap(cluster => 
      cluster.types
        .filter(sub => linkedIds.includes(sub.id))
        .map(sub => ({ cluster: cluster.name, subcluster: sub.name, id: sub.id }))
    );
  }, [selectedModel, clusters, getLinkedSubclusters]);

  // Запуск поиска по модели
  const handleRunSearch = async () => {
    if (!selectedModelData) return;
    
    setIsSearching(true);
    setSearchResults(null);
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: modelContent,
          modelName: modelName,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults({
          query: modelContent,
          count: data.count || 0,
          resultId: data.resultId,
        });
        
        // Автоматически синхронизируем с подкластером если модель привязана
        if (data.resultId && selectedModel) {
          await syncToSubcluster(data.resultId, selectedModel);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Переход к результатам
  const handleViewResults = () => {
    if (searchResults?.resultId) {
      router.push(`/slovolov-pro/editor/${searchResults.resultId}`);
    } else {
      router.push('/slovolov-pro/editor');
    }
  };

  // Копирование модели в буфер обмена
  const handleCopyModel = async () => {
    if (!selectedModelData) return;
    try {
      await navigator.clipboard.writeText(modelContent);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = modelContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  // Копирование ссылки на модель
  const handleCopyLink = useCallback(() => {
    if (!selectedModel) return;
    const url = `${window.location.origin}/slovolov-pro/models?id=${encodeURIComponent(selectedModel)}`;
    navigator.clipboard.writeText(url);
    alert('Ссылка скопирована в буфер обмена');
  }, [selectedModel]);

  return (
    <MainLayout>
      <div className="h-full flex p-4 gap-4">
        {/* Models list */}
        <div 
          className="w-72 rounded-3xl border border-white/20 overflow-hidden flex flex-col"
          style={{
            background: '#1a1a1a',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className="p-3 border-b border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-white/60">Модели</span>
              <div 
                className="flex items-center gap-1 rounded-full px-1.5 py-1 border border-white/20"
                style={{
                  background: '#1a1a1a',
                  boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.2)'
                }}
              >
                <AddButton 
                  onClick={() => { setIsCreating(true); setNewModelName(''); }}
                  title="Добавить модель"
                />
                <span className="w-6 h-6 flex items-center justify-center bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-medium">{models.length}</span>
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

          {/* Create model form */}
          {isCreating && (
            <div className="p-3 border-b border-white/10 bg-black/20">
              <input
                type="text"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="Название модели..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/50 mb-2"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleCreate} 
                  disabled={actionLoading || !newModelName.trim()}
                  className="flex-1 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-xs hover:bg-green-500/30 disabled:opacity-50"
                  style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset' }}
                >
                  Создать
                </button>
                <button 
                  onClick={() => setIsCreating(false)} 
                  className="px-3 py-1.5 bg-white/5 text-white/60 rounded-full text-xs hover:bg-white/10"
                  style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset' }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 flex items-center justify-center">
                <Spinner size="sm" />
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="p-4 text-center text-white/40 text-xs">
                {searchText ? (
                  <p>Ничего не найдено</p>
                ) : (
                  <>
                    <p>Модели не найдены</p>
                    <p className="text-[10px] mt-2 text-white/30">Используйте кнопку добавления</p>
                  </>
                )}
              </div>
            ) : (
              filteredModels.map((model, index) => (
                <div
                  key={model.id}
                  draggable={!searchText}
                  onDragStart={(e) => handleModelDragStart(e, model.id)}
                  onDragOver={(e) => handleModelDragOver(e, model.id)}
                  onDragLeave={handleModelDragLeave}
                  onDrop={(e) => handleModelDrop(e, model.id)}
                  onDragEnd={handleModelDragEnd}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-all ${
                    draggedModel === model.id
                      ? 'opacity-50 scale-95'
                      : dragOverModel === model.id
                        ? 'border-t-2 border-green-400 bg-green-500/10'
                        : selectedModel === model.id 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'hover:bg-white/5 text-white/70'
                  }`}
                  onClick={() => {
                    localStorage.setItem('lastSelectedModel', model.id);
                    router.push(`/slovolov-pro/models?id=${encodeURIComponent(model.id)}`, { scroll: false });
                  }}
                >
                  {!searchText && (
                    <svg className="w-3 h-3 text-white/20 flex-shrink-0 cursor-grab" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="6" r="1.5"/>
                      <circle cx="15" cy="6" r="1.5"/>
                      <circle cx="9" cy="12" r="1.5"/>
                      <circle cx="15" cy="12" r="1.5"/>
                      <circle cx="9" cy="18" r="1.5"/>
                      <circle cx="15" cy="18" r="1.5"/>
                    </svg>
                  )}
                  <span className="w-5 h-5 flex items-center justify-center rounded bg-white/5 text-[10px] text-white/40">
                    {index + 1}
                  </span>
                  <span className="font-medium text-xs truncate">{model.name}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Model content */}
        <div 
          className="flex-1 rounded-3xl border border-white/20 overflow-hidden flex flex-col"
          style={{
            background: '#1a1a1a',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
          }}
        >
          {selectedModelData ? (
            <div key={selectedModelData.id} className="flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename();
                            if (e.key === 'Escape') setIsRenaming(false);
                          }}
                        />
                        <button onClick={handleRename} disabled={actionLoading} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-xs hover:bg-blue-500/30" style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset' }}>
                          Сохранить
                        </button>
                        <button onClick={() => setIsRenaming(false)} className="px-3 py-1.5 bg-white/5 text-white/60 rounded-full text-xs hover:bg-white/10" style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset' }}>
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <>
                        <h2 key={`name-${selectedModel}`} className="text-sm font-semibold">{modelName}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-white/40">Построчные формулы для Wordstat</p>
                          <span className="text-white/20">•</span>
                          <button
                            onClick={handleCopyLink}
                            className="text-[10px] text-blue-400/60 hover:text-blue-400 flex items-center gap-1"
                            title="Скопировать ссылку на модель"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                            </svg>
                            Ссылка
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {!isRenaming && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setIsRenaming(true); setRenameValue(modelName); }}
                        className="px-3 py-1.5 bg-white/5 text-white/60 rounded-full text-xs hover:bg-white/10"
                        style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset' }}
                        title="Переименовать"
                      >
                        Переименовать
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full text-xs hover:bg-red-500/30"
                        style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset' }}
                        title="Удалить"
                      >
                        Удалить
                      </button>
                    </div>
                )}
                </div>
              </div>

              {/* Actions bar */}
              <div className="p-3 border-b border-white/10 flex gap-2 flex-shrink-0">
                <button onClick={handleCopyModel} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-xs text-white/60" style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset' }}>
                  Копировать
                </button>
                <button
                  onClick={handleRunSearch}
                  disabled={isSearching}
                  className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 rounded-full text-xs text-blue-400 flex items-center gap-2"
                  style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset' }}
                >
                  {isSearching ? (
                    <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  )}
                  {isSearching ? 'Поиск...' : 'Запустить'}
                </button>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-white/60">
                    Редактировать
                  </button>
                ) : (
                  <>
                    <button onClick={handleSaveContent} disabled={actionLoading} className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 rounded-xl text-xs text-green-400">
                      Сохранить
                    </button>
                    <button onClick={() => { setIsEditing(false); setEditContent(modelContent); }} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-white/60">
                      Отмена
                    </button>
                  </>
                )}
              </div>
              
              <div className="flex-1 overflow-auto p-4">
                {/* Subclusters binding section */}
                <div key={`subclusters-${selectedModel}`} className="bg-black/30 rounded-2xl overflow-hidden mb-4">
                  <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
                    <span className="text-xs text-white/40">Привязка к подкластерам</span>
                    <button
                      onClick={() => setShowSubclusterModal(!showSubclusterModal)}
                      className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-[10px] text-blue-400"
                    >
                      {showSubclusterModal ? 'Скрыть' : 'Управление'}
                    </button>
                  </div>
                  <div className="p-4">
                    {linkedSubclusters.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {linkedSubclusters.map(item => (
                          <div
                            key={item.id}
                            className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 flex items-center gap-2"
                          >
                            <span className="text-white/40">{item.cluster}</span>
                            <span>→</span>
                            <span>{item.subcluster}</span>
                            <button
                              onClick={() => toggleSubclusterLink(item.id)}
                              className="ml-1 text-red-400/60 hover:text-red-400"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/30">
                        Модель не привязана к подкластерам. Нажмите "Управление" для привязки.
                      </p>
                    )}
                    
                    {/* Modal for managing subclusters */}
                    {showSubclusterModal && (
                      <div className="mt-4 pt-4 border-t border-white/10 max-h-64 overflow-auto">
                        {clusters.map(cluster => (
                          <div key={cluster.id} className="mb-3">
                            <div className="text-xs font-medium text-white/60 mb-2">{cluster.name}</div>
                            <div className="space-y-1 pl-3">
                              {cluster.types.map(subcluster => {
                                const isLinked = getLinkedSubclusters(selectedModel!).includes(subcluster.id);
                                return (
                                  <label
                                    key={subcluster.id}
                                    className="flex items-center gap-2 cursor-pointer hover:bg-white/5 rounded-lg px-2 py-1.5"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isLinked}
                                      onChange={() => toggleSubclusterLink(subcluster.id)}
                                      className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 checked:bg-blue-500"
                                    />
                                    <span className="text-xs text-white/70">{subcluster.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Model formula */}
                <div className="bg-black/30 rounded-2xl overflow-hidden mb-4">
                  <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
                    <span className="text-xs text-white/40">Формулы запросов</span>
                    <span className="text-[10px] text-white/30">
                      {(isEditing ? editContent : modelContent).split('\n').filter(l => l.trim()).length} строк
                    </span>
                  </div>
                  <div className="p-4">
                    {isEditing ? (
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-64 bg-transparent border-0 text-xs font-mono text-green-400 focus:outline-none resize-none leading-relaxed"
                        placeholder="Каждая строка — отдельная формула запроса..."
                      />
                    ) : (
                      <pre className="text-xs whitespace-pre-wrap font-mono text-green-400 leading-relaxed">
                        {modelContent || 'Пустая модель — нажмите "Редактировать"'}
                      </pre>
                    )}
                  </div>
                </div>

                {/* Search results */}
                {searchResults && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-green-400">Результаты поиска</span>
                      <span className="text-lg font-bold text-green-400">
                        {searchResults.count.toLocaleString('ru-RU')}
                      </span>
                    </div>
                    <button onClick={handleViewResults} className="w-full px-3 py-2 bg-green-500/20 hover:bg-green-500/30 rounded-xl text-xs text-green-400 flex items-center justify-center gap-2">
                      Посмотреть результаты
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </button>
                  </div>
                )}

                {/* Help section */}
                <div className="mt-6 bg-white/5 rounded-2xl p-4">
                  <p className="text-xs font-medium text-white/60 mb-3">Формат модели</p>
                  <div className="space-y-2 text-[11px]">
                    <p className="text-white/40">Каждая строка — отдельная формула запроса для Wordstat.</p>
                    <div className="bg-black/30 rounded-xl p-3 font-mono text-green-400 text-[10px] space-y-1">
                      <div>экскурсия +из +москвы</div>
                      <div>тур (однодневный | на день)</div>
                      <div>путешествие +выходного +дня</div>
                    </div>
                    <p className="text-white/30">Результаты всех строк объединяются.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/30">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-4 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <p className="text-sm">Выберите модель</p>
                <p className="text-xs mt-2 text-white/20">или создайте новую</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default function ModelsPage() {
  return (
    <Suspense fallback={<MainLayout><div className="h-full flex items-center justify-center"><div className="text-white/50">Загрузка...</div></div></MainLayout>}>
      <ModelsPageContent />
    </Suspense>
  );
}