'use client';

import { useState, useMemo, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '@/store/store';
import MainLayout from '@/components/MainLayout';
import AddButton from '@/components/AddButton';

function FiltersPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { filters, selectedFilter, setSelectedFilter, updateFilter, addFilter, loadData } = useStore();
  const [newItemText, setNewItemText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Drag-and-drop состояния
  const [draggedFilter, setDraggedFilter] = useState<string | null>(null);
  const [dragOverFilter, setDragOverFilter] = useState<string | null>(null);

  // Обработка URL параметра id и localStorage
  useEffect(() => {
    if (filters.length === 0) return;
    
    const filterId = searchParams.get('id');
    if (filterId) {
      // Ищем фильтр по id или по имени
      const filter = filters.find(f => f.id === filterId || f.name === filterId || f.id.includes(filterId));
      if (filter && filter.id !== selectedFilter) {
        setSelectedFilter(filter.id);
        localStorage.setItem('lastSelectedFilter', filter.id);
      }
    } else if (!selectedFilter) {
      // Если нет id в URL, проверяем localStorage
      const savedFilterId = localStorage.getItem('lastSelectedFilter');
      const savedFilter = savedFilterId ? filters.find(f => f.id === savedFilterId) : null;
      
      if (savedFilter) {
        setSelectedFilter(savedFilter.id);
        router.replace(`/slovolov-pro/filters?id=${encodeURIComponent(savedFilter.id)}`, { scroll: false });
      } else if (filters.length > 0) {
        // Если нет сохранённого фильтра, выбираем первый
        setSelectedFilter(filters[0].id);
        localStorage.setItem('lastSelectedFilter', filters[0].id);
        router.replace(`/slovolov-pro/filters?id=${encodeURIComponent(filters[0].id)}`, { scroll: false });
      }
    }
  }, [searchParams, filters, selectedFilter, setSelectedFilter, router]);

  // Drag-and-drop handlers для фильтров
  const handleFilterDragStart = (e: React.DragEvent, filterId: string) => {
    setDraggedFilter(filterId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFilterDragOver = (e: React.DragEvent, filterId: string) => {
    e.preventDefault();
    if (draggedFilter && draggedFilter !== filterId) {
      setDragOverFilter(filterId);
    }
  };

  const handleFilterDragLeave = () => {
    setDragOverFilter(null);
  };

  const handleFilterDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedFilter || draggedFilter === targetId) {
      setDraggedFilter(null);
      setDragOverFilter(null);
      return;
    }

    const currentOrder = filters.map(f => f.id);
    const draggedIndex = currentOrder.indexOf(draggedFilter);
    const targetIndex = currentOrder.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Переставляем элементы
    currentOrder.splice(draggedIndex, 1);
    currentOrder.splice(targetIndex, 0, draggedFilter);

    // Сохраняем на сервер
    try {
      await fetch('/api/filters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: currentOrder }),
      });
      loadData(); // Перезагружаем данные
    } catch (error) {
      console.error('Error reordering filters:', error);
    }

    setDraggedFilter(null);
    setDragOverFilter(null);
  };

  const handleFilterDragEnd = () => {
    setDraggedFilter(null);
    setDragOverFilter(null);
  };

  const selectedFilterData = filters.find((f) => f.id === selectedFilter);

  // Фильтрация списка фильтров
  const filteredFilters = useMemo(() => {
    if (!searchText) return filters;
    const lower = searchText.toLowerCase();
    return filters.filter((f) => f.name.toLowerCase().includes(lower));
  }, [filters, searchText]);

  // Фильтрация элементов внутри фильтра
  const filteredItems = useMemo(() => {
    if (!selectedFilterData) return [];
    if (!filterSearch) return selectedFilterData.items;
    const lower = filterSearch.toLowerCase();
    return selectedFilterData.items.filter((item) => item.toLowerCase().includes(lower));
  }, [selectedFilterData, filterSearch]);

  // Автосохранение на сервер
  const saveToServer = useCallback(async (filterId: string, items: string[]) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/filters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: filterId, items }),
      });
      if (response.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Обновление с автосохранением
  const updateAndSave = useCallback((filterId: string, newItems: string[]) => {
    updateFilter(filterId, newItems);
    
    // Отменяем предыдущий таймаут
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Сохраняем с небольшой задержкой для группировки изменений
    saveTimeoutRef.current = setTimeout(() => {
      saveToServer(filterId, newItems);
    }, 500);
  }, [updateFilter, saveToServer]);

  // Очистка таймаута при размонтировании
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleAddItem = () => {
    if (!selectedFilter || !newItemText.trim()) return;
    const filter = filters.find((f) => f.id === selectedFilter);
    if (filter) {
      updateAndSave(selectedFilter, [...filter.items, newItemText.trim()]);
      setNewItemText('');
    }
  };

  const handleAddMultiple = () => {
    if (!selectedFilter || !newItemText.trim()) return;
    const filter = filters.find((f) => f.id === selectedFilter);
    if (filter) {
      const newItems = newItemText.split('\n').map((s) => s.trim()).filter(Boolean);
      updateAndSave(selectedFilter, [...filter.items, ...newItems]);
      setNewItemText('');
    }
  };

  const handleRemoveItem = (index: number) => {
    if (!selectedFilter) return;
    const filter = filters.find((f) => f.id === selectedFilter);
    if (filter) {
      const actualIndex = filter.items.indexOf(filteredItems[index]);
      if (actualIndex !== -1) {
        const newItems = filter.items.filter((_, i) => i !== actualIndex);
        updateAndSave(selectedFilter, newItems);
      }
    }
  };

  const handleSaveFilter = async () => {
    if (!selectedFilter || !selectedFilterData) return;
    await saveToServer(selectedFilter, selectedFilterData.items);
  };

  // Переименование фильтра
  const handleStartRename = () => {
    if (!selectedFilterData) return;
    setRenameValue(selectedFilterData.name);
    setIsRenaming(true);
  };

  const handleCancelRename = () => {
    setIsRenaming(false);
    setRenameValue('');
  };

  const handleRename = async () => {
    if (!selectedFilter || !renameValue.trim()) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/filters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedFilter, name: renameValue.trim() }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const oldId = selectedFilter;
        const newId = data.filter.id;
        
        // Обновляем subclusterConfigs если ID изменился
        if (oldId !== newId) {
          const savedConfigs = localStorage.getItem('subclusterConfigs');
          if (savedConfigs) {
            try {
              const configs = JSON.parse(savedConfigs);
              const updatedConfigs = configs.map((cfg: { subclusterId: string; models: string[]; filters: string[] }) => ({
                ...cfg,
                filters: cfg.filters.map((fid: string) => fid === oldId ? newId : fid)
              }));
              localStorage.setItem('subclusterConfigs', JSON.stringify(updatedConfigs));
            } catch (e) {
              console.error('Error updating subcluster configs:', e);
            }
          }
        }
        
        // Обновляем выбранный фильтр на новый id
        setSelectedFilter(data.filter.id);
        router.push(`/slovolov-pro/filters?id=${encodeURIComponent(data.filter.id)}`, { scroll: false });
        await loadData();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        setIsRenaming(false);
        setRenameValue('');
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка переименования');
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Rename error:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Удаление фильтра
  const handleDeleteFilter = async () => {
    if (!selectedFilter || !selectedFilterData) return;
    
    const confirmed = window.confirm(`Удалить фильтр "${selectedFilterData.name}"?`);
    if (!confirmed) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/filters?id=${encodeURIComponent(selectedFilter)}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setSelectedFilter(null);
        await loadData();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка удаления');
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Создание нового фильтра
  const handleCreateFilter = async () => {
    if (!newFilterName.trim()) {
      alert('Введите название фильтра');
      return;
    }
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newFilterName.trim(),
          items: []
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        await loadData();
        setSelectedFilter(data.filter.id);
        router.push(`/slovolov-pro/filters?id=${encodeURIComponent(data.filter.id)}`, { scroll: false });
        setNewFilterName('');
        setIsCreating(false);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка создания фильтра');
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Create error:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Копирование ссылки на фильтр
  const handleCopyLink = useCallback(() => {
    if (!selectedFilter) return;
    const url = `${window.location.origin}/slovolov-pro/filters?id=${encodeURIComponent(selectedFilter)}`;
    navigator.clipboard.writeText(url);
    alert('Ссылка скопирована в буфер обмена');
  }, [selectedFilter]);

  return (
    <MainLayout>
      <div className="h-full flex p-4 gap-4">
        {/* Filter list */}
        <div 
          className="w-72 rounded-3xl border border-white/20 overflow-hidden flex flex-col"
          style={{
            background: '#1a1a1a',
            WebkitBoxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3), 0 0 0 0.5px rgba(255, 255, 255, 0.1) inset, 0 1px 0 0 rgba(255, 255, 255, 0.15) inset'
          }}
        >
          <div className="p-3 border-b border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-white/60">Фильтры</span>
              <div 
                className="flex items-center gap-1 rounded-full px-1.5 py-1 border border-white/20"
                style={{
                  background: '#1a1a1a',
                  WebkitBoxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.2), 0 0 0 0.5px rgba(255, 255, 255, 0.1) inset, 0 1px 0 0 rgba(255, 255, 255, 0.15) inset'
                }}
              >
                <AddButton 
                  onClick={() => setIsCreating(true)}
                  title="Добавить фильтр"
                />
                <span className="w-6 h-6 flex items-center justify-center bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-medium">{filters.length}</span>
              </div>
            </div>
            
            {isCreating && (
              <div className="mb-3 p-2 bg-white/5 rounded-xl border border-white/10">
                <input
                  type="text"
                  value={newFilterName}
                  onChange={(e) => setNewFilterName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFilter();
                    if (e.key === 'Escape') {
                      setIsCreating(false);
                      setNewFilterName('');
                    }
                  }}
                  placeholder="Название нового фильтра..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/50 mb-2"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button 
                    onClick={handleCreateFilter} 
                    className="flex-1 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-xs hover:bg-green-500/30 disabled:opacity-50"
                    style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset' }}
                    disabled={isSaving || !newFilterName.trim()}
                  >
                    Создать
                  </button>
                  <button 
                    onClick={() => {
                      setIsCreating(false);
                      setNewFilterName('');
                    }}
                    className="px-3 py-1.5 bg-white/5 text-white/60 rounded-full text-xs hover:bg-white/10"
                    style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset' }}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
            
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Поиск..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-white/30"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredFilters.length === 0 ? (
              <div className="px-4 py-8 text-center text-white/30 text-xs">
                {searchText ? (
                  <p>Ничего не найдено</p>
                ) : (
                  <>
                    <p>Фильтры не найдены</p>
                    <p className="text-[10px] mt-2">Нажмите + для создания</p>
                  </>
                )}
              </div>
            ) : (
              filteredFilters.map((filter) => (
                <div
                  key={filter.id}
                  draggable={!searchText}
                  onDragStart={(e) => handleFilterDragStart(e, filter.id)}
                  onDragOver={(e) => handleFilterDragOver(e, filter.id)}
                  onDragLeave={handleFilterDragLeave}
                  onDrop={(e) => handleFilterDrop(e, filter.id)}
                  onDragEnd={handleFilterDragEnd}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-all ${
                    draggedFilter === filter.id
                      ? 'opacity-50 scale-95'
                      : dragOverFilter === filter.id
                        ? 'border-t-2 border-green-400 bg-green-500/10'
                        : selectedFilter === filter.id 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'hover:bg-white/5 text-white/70'
                  }`}
                  onClick={() => {
                    setSelectedFilter(filter.id);
                    setFilterSearch('');
                    localStorage.setItem('lastSelectedFilter', filter.id);
                    router.push(`/slovolov-pro/filters?id=${encodeURIComponent(filter.id)}`, { scroll: false });
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
                  <span className="flex-1 font-medium text-xs truncate">{filter.name}</span>
                  <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[9px]">{filter.items.length}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Filter items */}
        <div 
          className="flex-1 rounded-3xl border border-white/20 overflow-hidden flex flex-col"
          style={{
            background: '#1a1a1a',
            WebkitBoxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3), 0 0 0 0.5px rgba(255, 255, 255, 0.1) inset, 0 1px 0 0 rgba(255, 255, 255, 0.15) inset'
          }}
        >
          {selectedFilterData ? (
            <>
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 mr-4">
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename();
                            if (e.key === 'Escape') handleCancelRename();
                          }}
                          className="input flex-1 text-lg font-medium"
                          autoFocus
                        />
                        <button onClick={handleRename} className="btn btn-primary btn-sm" disabled={isSaving}>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                        <button onClick={handleCancelRename} className="btn btn-secondary btn-sm">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-medium">{selectedFilterData.name}</h2>
                        <button 
                          onClick={handleStartRename} 
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                          title="Переименовать"
                        >
                          <svg className="w-4 h-4 text-white/40 hover:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button 
                          onClick={handleCopyLink}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                          title="Скопировать ссылку на фильтр"
                        >
                          <svg className="w-4 h-4 text-white/40 hover:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                        </button>
                        <button 
                          onClick={handleDeleteFilter} 
                          className="p-1 hover:bg-red-500/20 rounded transition-colors"
                          title="Удалить фильтр"
                        >
                          <svg className="w-4 h-4 text-white/40 hover:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                          </svg>
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-white/40 mt-0.5">
                      {selectedFilterData.items.length} элементов
                      {filterSearch && ` (показано ${filteredItems.length})`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSaving && (
                      <span className="text-xs text-white/40">Сохранение...</span>
                    )}
                    {saveStatus === 'saved' && (
                      <span className="text-xs text-green-500">Сохранено</span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="text-xs text-red-500">Ошибка</span>
                    )}
                    <button 
                      onClick={handleSaveFilter} 
                      disabled={isSaving}
                      className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 rounded-xl text-xs text-green-400 transition-colors disabled:opacity-50"
                      style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset' }}
                    >
                      {isSaving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                  </div>
                </div>
                
                {/* Search within filter */}
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Поиск элементов..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-white/30"
                />
              </div>
              
              {/* Add new items */}
              <div className="p-4 border-b border-white/10">
                <div className="flex gap-2">
                  <textarea
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleAddMultiple();
                      }
                    }}
                    placeholder="Добавить элементы (по одному на строку)&#10;Ctrl+Enter для добавления"
                    className="input flex-1 rounded-xl border-white/10 min-h-[60px] max-h-[120px] resize-y"
                    rows={2}
                  />
                  <button 
                    onClick={handleAddMultiple} 
                    className="btn btn-secondary rounded-full self-end h-8"
                    title="Добавить все строки как отдельные элементы"
                  >
                    Добавить
                  </button>
                </div>
              </div>

              {/* Items table */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-black/50 backdrop-blur-sm z-10">
                    <tr className="border-b border-white/10">
                      <th className="text-left px-4 py-2 text-xs font-medium text-white/40 w-16">#</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-white/40">Значение</th>
                      <th className="w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, index) => (
                      <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2 text-xs text-white/40">{index + 1}</td>
                        <td className="px-4 py-2 text-sm font-mono">{item}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredItems.length === 0 && (
                  <div className="p-8 text-center text-white/40">
                    {filterSearch ? 'Ничего не найдено' : 'Нет элементов'}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/40">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                <p>Выберите фильтр</p>
                <p className="text-xs mt-2">для просмотра и редактирования</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default function FiltersPage() {
  return (
    <Suspense fallback={<MainLayout><div className="h-full flex items-center justify-center"><div className="text-white/50">Загрузка...</div></div></MainLayout>}>
      <FiltersPageContent />
    </Suspense>
  );
}
