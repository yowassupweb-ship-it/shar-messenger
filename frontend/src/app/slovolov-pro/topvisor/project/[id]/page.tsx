'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Spinner } from '@/components/Spinner/Spinner';
import { 
  ArrowLeft, Loader2, Search, TrendingUp, TrendingDown, Minus, 
  Calendar, RefreshCw, Filter, ChevronDown, FolderOpen, Plus,
  BarChart3, Globe, AlertCircle, Trash2, CheckSquare, Square, X, CheckCircle
} from 'lucide-react';

interface Keyword {
  id: number;
  name: string;
  group_id: number;
  group_name?: string;
}

interface Group {
  id: number;
  name: string;
  keywords_count?: number;
}

interface Position {
  keyword_id: number;
  position: number | null;
  date: string;
  change?: number;
}

interface Project {
  id: number;
  name: string;
  site: string;
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [positions, setPositions] = useState<Record<number, Position>>({});
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'keywords' | 'groups'>('keywords');
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set());
  const [deletingGroups, setDeletingGroups] = useState(false);
  const [checkingPositions, setCheckingPositions] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error' | 'info'; title: string; text: string } | null>(null);
  const [showPositionConfirm, setShowPositionConfirm] = useState(false);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  // Auto-load positions when keywords are loaded
  useEffect(() => {
    if (keywords.length > 0 && Object.keys(positions).length === 0 && !loadingPositions) {
      loadPositions();
    }
  }, [keywords]);

  const loadProjectData = async () => {
    setLoading(true);
    try {
      // Load project info
      const projectsRes = await fetch('/api/topvisor/projects');
      const projectsData = await projectsRes.json();
      if (projectsData.success) {
        const proj = projectsData.projects.find((p: Project) => p.id.toString() === projectId);
        if (proj) setProject(proj);
      }

      // Load groups
      const groupsRes = await fetch(`/api/topvisor/groups?projectId=${projectId}`);
      const groupsData = await groupsRes.json();
      if (groupsData.success) {
        setGroups(groupsData.groups || []);
      }

      // Load keywords
      const keywordsRes = await fetch(`/api/topvisor/keywords?projectId=${projectId}`);
      const keywordsData = await keywordsRes.json();
      if (keywordsData.success) {
        setKeywords(keywordsData.keywords || []);
      }
    } catch (error) {
      console.error('Error loading project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPositions = async () => {
    if (keywords.length === 0) return;
    
    setLoadingPositions(true);
    try {
      const keywordIds = keywords.map(k => k.id);
      const res = await fetch('/api/topvisor/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: parseInt(projectId),
          keywordIds
        })
      });
      const data = await res.json();
      if (data.success && data.positions) {
        const posMap: Record<number, Position> = {};
        data.positions.forEach((pos: any) => {
          posMap[pos.keyword_id] = pos;
        });
        setPositions(posMap);
      }
    } catch (error) {
      console.error('Error loading positions:', error);
    } finally {
      setLoadingPositions(false);
    }
  };

  const filteredKeywords = keywords.filter(kw => {
    const matchesSearch = kw.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === null || kw.group_id === selectedGroup;
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

  const getChangeIcon = (change?: number) => {
    if (!change || change === 0) return <Minus className="w-3 h-3 text-white/30" />;
    if (change > 0) return <TrendingDown className="w-3 h-3 text-red-400" />;
    return <TrendingUp className="w-3 h-3 text-green-400" />;
  };

  const toggleGroupSelection = (groupId: number) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const selectAllGroups = () => {
    if (selectedGroups.size === groups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(groups.map(g => g.id)));
    }
  };

  const deleteSelectedGroups = async () => {
    if (selectedGroups.size === 0) return;
    
    const confirmed = window.confirm(`Удалить ${selectedGroups.size} групп? Ключевые слова в них также будут удалены.`);
    if (!confirmed) return;
    
    setDeletingGroups(true);
    try {
      const groupIds = Array.from(selectedGroups).join(',');
      const res = await fetch(`/api/topvisor/groups?projectId=${projectId}&groupIds=${groupIds}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (data.success) {
        setSelectedGroups(new Set());
        await loadProjectData(); // Перезагрузить данные
      } else {
        alert('Ошибка удаления: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Error deleting groups:', error);
      alert('Ошибка удаления групп');
    } finally {
      setDeletingGroups(false);
    }
  };

  const startPositionCheck = async () => {
    setShowPositionConfirm(false);
    setCheckingPositions(true);
    try {
      const res = await fetch('/api/topvisor/check-positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: parseInt(projectId) })
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
              <div className="p-2 rounded-xl bg-cyan-400/10 text-cyan-400">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{project?.name || 'Проект'}</h1>
                <div className="flex items-center gap-1 text-white/40 text-xs">
                  <Globe className="w-3 h-3" />
                  {project?.site}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadPositions}
                disabled={loadingPositions || keywords.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black rounded-xl font-medium hover:from-cyan-400 hover:to-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-lg shadow-cyan-500/20"
              >
                {loadingPositions ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                Загрузить позиции
              </button>
              <button
                onClick={loadProjectData}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowPositionConfirm(true)}
                disabled={checkingPositions || keywords.length === 0}
                className="flex items-center gap-1 px-2 py-2 bg-white/5 border border-white/10 text-white/40 rounded-xl hover:text-white/70 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs"
                title="Снять позиции (расходует квоту)"
              >
                {checkingPositions ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <BarChart3 className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex-none p-4 border-b border-white/5">
          <div className="flex items-center gap-6">
            <div className="text-sm">
              <span className="text-white/40">Ключевых слов:</span>
              <span className="text-white ml-2 font-medium">{keywords.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-white/40">Групп:</span>
              <span className="text-white ml-2 font-medium">{groups.length}</span>
            </div>
            {Object.keys(positions).length > 0 && (
              <div className="text-sm">
                <span className="text-white/40">С позициями:</span>
                <span className="text-cyan-400 ml-2 font-medium">{Object.keys(positions).length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-none px-4 pt-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('keywords')}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${
                activeTab === 'keywords'
                  ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/30'
                  : 'bg-white/5 text-white/50 hover:text-white border border-white/10'
              }`}
            >
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Ключевые слова
              </span>
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${
                activeTab === 'groups'
                  ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/30'
                  : 'bg-white/5 text-white/50 hover:text-white border border-white/10'
              }`}
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Группы
              </span>
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        {activeTab === 'keywords' && (
          <div className="flex-none p-4">
            <div className="flex items-center gap-3">
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
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-400/50 appearance-none cursor-pointer"
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
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 pt-0">
          {activeTab === 'keywords' ? (
            keywords.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50">Ключевые слова не найдены</p>
                  <p className="text-white/30 text-sm mt-1">Добавьте ключевые слова в проект Топвизор</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs text-white/40 uppercase tracking-wider">
                  <div className="col-span-6">Ключевое слово</div>
                  <div className="col-span-3">Группа</div>
                  <div className="col-span-2 text-center">Позиция</div>
                  <div className="col-span-1 text-center">Δ</div>
                </div>
                
                {/* Table Body */}
                {filteredKeywords.map(keyword => {
                  const pos = positions[keyword.id];
                  const group = groups.find(g => g.id === keyword.group_id);
                  
                  return (
                    <div
                      key={keyword.id}
                      className="grid grid-cols-12 gap-4 px-4 py-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all items-center"
                    >
                      <div className="col-span-6 text-white text-sm font-medium truncate">
                        {keyword.name}
                      </div>
                      <div className="col-span-3 text-white/40 text-sm truncate">
                        {group?.name || '-'}
                      </div>
                      <div className={`col-span-2 text-center font-mono font-medium ${getPositionColor(pos?.position ?? null)}`}>
                        {pos?.position ?? '-'}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {pos && getChangeIcon(pos.change)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            // Groups Tab
            groups.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50">Группы не найдены</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Actions Bar */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAllGroups}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm"
                  >
                    {selectedGroups.size === groups.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    {selectedGroups.size === groups.length ? 'Снять выбор' : 'Выбрать все'}
                  </button>
                  
                  {selectedGroups.size > 0 && (
                    <button
                      onClick={deleteSelectedGroups}
                      disabled={deletingGroups}
                      className="flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/30 disabled:opacity-50 transition-all text-sm"
                    >
                      {deletingGroups ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Удалить ({selectedGroups.size})
                    </button>
                  )}
                  
                  <span className="text-white/40 text-sm ml-auto">
                    Всего групп: {groups.length}
                  </span>
                </div>
                
                {/* Groups Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups.map(group => {
                    const isSelected = selectedGroups.has(group.id);
                    return (
                      <div
                        key={group.id}
                        className={`p-4 border rounded-xl transition-all ${
                          isSelected 
                            ? 'bg-red-500/10 border-red-500/30' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleGroupSelection(group.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              isSelected 
                                ? 'bg-red-500/20 text-red-400' 
                                : 'bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20'
                            }`}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <FolderOpen className="w-5 h-5" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedGroup(group.id);
                              setActiveTab('keywords');
                            }}
                            className="flex-1 text-left"
                          >
                            <h3 className={`font-medium transition-colors ${
                              isSelected ? 'text-red-400' : 'text-white hover:text-cyan-400'
                            }`}>
                              {group.name}
                            </h3>
                            <p className="text-white/40 text-sm">
                              {keywords.filter(k => k.group_id === group.id).length} ключевых слов
                            </p>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Position Check Confirm Modal */}
      {showPositionConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
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
                className="p-1 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowPositionConfirm(false)}
                className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all text-sm font-medium"
              >
                Отмена
              </button>
              <button
                onClick={startPositionCheck}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black rounded-xl hover:from-cyan-400 hover:to-cyan-300 transition-all text-sm font-medium"
              >
                Да, снять позиции
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${
                modalMessage.type === 'success' ? 'bg-green-500/10 text-green-400' :
                modalMessage.type === 'error' ? 'bg-red-500/10 text-red-400' :
                'bg-cyan-500/10 text-cyan-400'
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
                className="p-1 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setModalMessage(null)}
                className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all text-sm font-medium"
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
