'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Spinner } from '@/components/Spinner/Spinner';
import { 
  ArrowLeft, Loader2, Search, Plus, Trash2, FolderOpen, 
  Upload, RefreshCw, AlertCircle, CheckCircle, X, Globe, ChevronDown
} from 'lucide-react';

interface Project {
  id: number;
  name: string;
  site: string;
}

interface Group {
  id: number;
  name: string;
}

interface Keyword {
  id: number;
  name: string;
  group_id: number;
}

export default function KeywordsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  
  // Selection state
  const [selectedKeywords, setSelectedKeywords] = useState<number[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);
  
  // Add keywords modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKeywords, setNewKeywords] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<{ success: boolean; message: string } | null>(null);
  const [groupsExpanded, setGroupsExpanded] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadGroups();
      loadKeywords();
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

  const loadGroups = async () => {
    if (!selectedProject) return;
    try {
      const res = await fetch(`/api/topvisor/groups?projectId=${selectedProject}`);
      const data = await res.json();
      if (data.success) {
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadKeywords = async () => {
    if (!selectedProject) return;
    setLoadingKeywords(true);
    try {
      const res = await fetch(`/api/topvisor/keywords?projectId=${selectedProject}`);
      const data = await res.json();
      if (data.success) {
        setKeywords(data.keywords || []);
      }
    } catch (error) {
      console.error('Error loading keywords:', error);
    } finally {
      setLoadingKeywords(false);
    }
  };

  const addKeywords = async () => {
    if (!selectedProject || !newKeywords.trim()) return;
    
    setAdding(true);
    setAddResult(null);
    
    try {
      const keywordsList = newKeywords.split('\n').filter(k => k.trim());
      
      let groupId = selectedGroup;
      
      // Create new group if name provided
      if (newGroupName.trim()) {
        const groupRes = await fetch('/api/topvisor/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: selectedProject,
            name: newGroupName.trim()
          })
        });
        const groupData = await groupRes.json();
        if (groupData.success && groupData.group) {
          groupId = groupData.group.id;
          await loadGroups();
        }
      }

      if (!groupId && groups.length > 0) {
        groupId = groups[0].id;
      }

      if (!groupId) {
        setAddResult({ success: false, message: 'Сначала создайте группу' });
        setAdding(false);
        return;
      }

      const res = await fetch('/api/topvisor/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          groupId,
          keywords: keywordsList
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setAddResult({ success: true, message: `Добавлено ${keywordsList.length} ключевых слов` });
        setNewKeywords('');
        setNewGroupName('');
        await loadKeywords();
        setTimeout(() => {
          setShowAddModal(false);
          setAddResult(null);
        }, 1500);
      } else {
        setAddResult({ success: false, message: data.error || 'Ошибка добавления' });
      }
    } catch (error) {
      console.error('Error adding keywords:', error);
      setAddResult({ success: false, message: 'Ошибка подключения' });
    } finally {
      setAdding(false);
    }
  };

  // Delete selected keywords
  const deleteSelectedKeywords = async () => {
    if (!selectedProject || selectedKeywords.length === 0) return;
    
    if (!confirm(`Удалить ${selectedKeywords.length} ключевых слов? Они будут перемещены в корзину на 3 дня.`)) {
      return;
    }
    
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/topvisor/keywords?projectId=${selectedProject}&keywordIds=${selectedKeywords.join(',')}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      
      if (data.success) {
        setSelectedKeywords([]);
        await loadKeywords();
      } else {
        alert('Ошибка удаления: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Error deleting keywords:', error);
      alert('Ошибка подключения');
    } finally {
      setDeleting(false);
    }
  };

  // Delete selected groups
  const deleteSelectedGroups = async () => {
    if (!selectedProject || selectedGroups.length === 0) return;
    
    const groupsToDelete = groups.filter(g => selectedGroups.includes(g.id));
    const keywordsCount = keywords.filter(k => selectedGroups.includes(k.group_id)).length;
    
    if (!confirm(`Удалить ${groupsToDelete.length} групп(ы)? Это также удалит ${keywordsCount} ключевых слов. Они будут перемещены в корзину на 3 дня.`)) {
      return;
    }
    
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/topvisor/groups?projectId=${selectedProject}&groupIds=${selectedGroups.join(',')}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      
      if (data.success) {
        setSelectedGroups([]);
        setSelectedGroup(null);
        await loadGroups();
        await loadKeywords();
      } else {
        alert('Ошибка удаления: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Error deleting groups:', error);
      alert('Ошибка подключения');
    } finally {
      setDeleting(false);
    }
  };

  // Toggle keyword selection
  const toggleKeywordSelection = (id: number) => {
    setSelectedKeywords(prev => 
      prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
    );
  };

  // Toggle group selection
  const toggleGroupSelection = (id: number) => {
    setSelectedGroups(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  // Select all filtered keywords
  const selectAllKeywords = () => {
    if (selectedKeywords.length === filteredKeywords.length) {
      setSelectedKeywords([]);
    } else {
      setSelectedKeywords(filteredKeywords.map(k => k.id));
    }
  };

  const filteredKeywords = keywords.filter(kw => {
    const matchesSearch = kw.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === null || kw.group_id === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const selectedProjectData = projects.find(p => p.id === selectedProject);

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
        {/* Header */}
        <div className="flex-none p-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/slovolov-pro/topvisor')}
                className="p-2 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="p-2 rounded-xl bg-blue-400/10 text-blue-400">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Ключевые слова</h1>
                <p className="text-white/40 text-xs">Управление ключевыми словами проектов</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Delete buttons */}
              {selectedKeywords.length > 0 && (
                <button
                  onClick={deleteSelectedKeywords}
                  disabled={deleting}
                  className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-medium hover:bg-red-500/20 transition-all text-sm"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Удалить ({selectedKeywords.length})
                </button>
              )}
              {selectedGroups.length > 0 && (
                <button
                  onClick={deleteSelectedGroups}
                  disabled={deleting}
                  className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-xl font-medium hover:bg-orange-500/20 transition-all text-sm"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Удалить группы ({selectedGroups.length})
                </button>
              )}
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-cyan-400 text-black rounded-xl font-medium hover:bg-cyan-300 transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
              <button
                onClick={loadKeywords}
                disabled={loadingKeywords}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loadingKeywords ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Project & Filters */}
        <div className="flex-none p-4 border-b border-white/5">
          <div className="flex items-center gap-4">
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(parseInt(e.target.value))}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-400/50 appearance-none cursor-pointer"
            >
              {projects.map(project => (
                <option key={project.id} value={project.id} className="bg-[#1a1a1a]">
                  {project.name} ({project.site})
                </option>
              ))}
            </select>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск ключевых слов..."
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 text-sm"
              />
            </div>

            <select
              value={selectedGroup || ''}
              onChange={(e) => setSelectedGroup(e.target.value ? parseInt(e.target.value) : null)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-400/50 appearance-none cursor-pointer min-w-[150px]"
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

        {/* Stats */}
        <div className="flex-none p-4 border-b border-white/5">
          <div className="flex items-center gap-6 text-sm">
            <span className="text-white/40">
              Всего: <span className="text-white font-medium">{keywords.length}</span>
            </span>
            <span className="text-white/40">
              Показано: <span className="text-cyan-400 font-medium">{filteredKeywords.length}</span>
            </span>
            <span className="text-white/40">
              Групп: <span className="text-white font-medium">{groups.length}</span>
            </span>
            {selectedKeywords.length > 0 && (
              <span className="text-blue-400">
                Выбрано слов: <span className="font-medium">{selectedKeywords.length}</span>
              </span>
            )}
            {selectedGroups.length > 0 && (
              <span className="text-orange-400">
                Выбрано групп: <span className="font-medium">{selectedGroups.length}</span>
              </span>
            )}
          </div>
        </div>

        {/* Groups Section - collapsible */}
        {groups.length > 0 && (
          <div className="flex-none border-b border-white/5">
            <button 
              onClick={() => setGroupsExpanded(!groupsExpanded)}
              className="w-full flex items-center gap-2 p-4 hover:bg-white/5 transition-colors"
            >
              <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${groupsExpanded ? '' : '-rotate-90'}`} />
              <FolderOpen className="w-4 h-4 text-white/40" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Группы (выберите для удаления)</span>
              <span className="text-xs text-white/30">({groups.length})</span>
            </button>
            {groupsExpanded && (
              <div className="px-4 pb-4">
                <div className="flex flex-wrap gap-2">
                  {groups.map(group => {
                    const isSelected = selectedGroups.includes(group.id);
                    const keywordsInGroup = keywords.filter(k => k.group_id === group.id).length;
                    
                    return (
                      <button
                        key={group.id}
                        onClick={() => toggleGroupSelection(group.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                          isSelected 
                            ? 'bg-orange-500/20 border border-orange-500/50 text-orange-400' 
                            : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-3 h-3 accent-orange-500"
                        />
                        {group.name}
                        <span className="text-white/30">({keywordsInGroup})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingKeywords ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Spinner size="lg" className="mx-auto mb-2" />
                <p className="text-white/50 text-sm">Загрузка ключевых слов...</p>
              </div>
            </div>
          ) : filteredKeywords.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">Ключевые слова не найдены</p>
                <p className="text-white/30 text-sm mt-1">Добавьте ключевые слова или измените фильтры</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs text-white/40 uppercase tracking-wider">
                <div className="col-span-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedKeywords.length === filteredKeywords.length && filteredKeywords.length > 0}
                    onChange={selectAllKeywords}
                    className="w-3 h-3 accent-cyan-500"
                  />
                  ID
                </div>
                <div className="col-span-8">Ключевое слово</div>
                <div className="col-span-3">Группа</div>
              </div>
              
              {/* Table Body */}
              {filteredKeywords.map(keyword => {
                const group = groups.find(g => g.id === keyword.group_id);
                const isSelected = selectedKeywords.includes(keyword.id);
                
                return (
                  <div
                    key={keyword.id}
                    onClick={() => toggleKeywordSelection(keyword.id)}
                    className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all items-center ${
                      isSelected 
                        ? 'bg-blue-500/10 border border-blue-500/30' 
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="col-span-1 flex items-center gap-2 text-white/30 text-xs font-mono">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-3 h-3 accent-cyan-500"
                      />
                      {keyword.id}
                    </div>
                    <div className={`col-span-8 text-sm font-medium ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                      {keyword.name}
                    </div>
                    <div className="col-span-3 flex items-center gap-2 text-white/40 text-sm">
                      <FolderOpen className="w-3 h-3" />
                      {group?.name || '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Keywords Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 w-full max-w-lg max-h-[80vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">Добавить ключевые слова</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setAddResult(null);
                  }}
                  className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {/* Project Info */}
                {selectedProjectData && (
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Globe className="w-4 h-4" />
                    Проект: {selectedProjectData.name}
                  </div>
                )}

                {/* Group Selection */}
                <div className="space-y-2">
                  <label className="text-sm text-white/70">Группа</label>
                  <select
                    value={selectedGroup || ''}
                    onChange={(e) => setSelectedGroup(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-400/50 appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#1a1a1a]">Выберите группу</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id} className="bg-[#1a1a1a]">
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Or create new group */}
                <div className="space-y-2">
                  <label className="text-sm text-white/70">Или создайте новую группу</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Название новой группы"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50"
                  />
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <label className="text-sm text-white/70">Ключевые слова (по одному на строку)</label>
                  <textarea
                    value={newKeywords}
                    onChange={(e) => setNewKeywords(e.target.value)}
                    placeholder="туры в москву&#10;экскурсии по москве&#10;автобусные туры"
                    rows={8}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 resize-none"
                  />
                  <p className="text-xs text-white/40">
                    Количество: {newKeywords.split('\n').filter(k => k.trim()).length}
                  </p>
                </div>

                {/* Result Message */}
                {addResult && (
                  <div className={`p-3 rounded-xl flex items-center gap-2 ${
                    addResult.success 
                      ? 'bg-green-500/10 text-green-400' 
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    {addResult.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    {addResult.message}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-3 p-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setAddResult(null);
                  }}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all"
                >
                  Отмена
                </button>
                <button
                  onClick={addKeywords}
                  disabled={adding || !newKeywords.trim() || (!selectedGroup && !newGroupName.trim())}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cyan-400 text-black font-medium rounded-xl hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {adding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Добавить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
