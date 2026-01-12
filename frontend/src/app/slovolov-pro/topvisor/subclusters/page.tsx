'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { Spinner } from '@/components/Spinner';
import { 
  Upload, Loader2, Check, X, FolderOpen, FileText, 
  ChevronDown, ChevronRight, RefreshCw, AlertCircle, ArrowLeft,
  Search, Eye, CheckSquare, Square, Minus
} from 'lucide-react';

interface KeywordWithCount {
  query: string;
  count: number;
}

interface SubclusterData {
  id: string;
  name: string;
  keywords: string[];
  keywordsWithCount?: KeywordWithCount[];
  keywordCount: number;
  isFiltered?: boolean;
}

interface Cluster {
  id: string;
  name: string;
  subclusterCount: number;
  totalKeywords: number;
  subclusters: SubclusterData[];
}

interface Project {
  id: number;
  name: string;
  site: string;
}

interface UploadResult {
  name: string;
  groupId?: number;
  keywordsAdded: number;
  error?: string;
}

export default function SubclustersPage() {
  const router = useRouter();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Детальные данные подкластера
  const [loadingSubcluster, setLoadingSubcluster] = useState(false);
  const [activeSubcluster, setActiveSubcluster] = useState<{
    clusterId: string;
    clusterName: string;
    subclusterId: string;
    subclusterName: string;
  } | null>(null);
  const [subclusterKeywords, setSubclusterKeywords] = useState<KeywordWithCount[]>([]);
  
  // Выбор ключевых слов
  // Map<`${clusterName}/${subclusterName}`, Set<keyword>>
  const [selectedKeywords, setSelectedKeywords] = useState<Map<string, Set<string>>>(new Map());
  
  // Поиск по ключевым словам
  const [keywordSearch, setKeywordSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [clustersRes, projectsRes] = await Promise.all([
        fetch('/api/clusters/subclusters'),
        fetch('/api/topvisor/projects')
      ]);
      
      const clustersData = await clustersRes.json();
      const projectsData = await projectsRes.json();
      
      if (clustersData.success) {
        setClusters(clustersData.clusters || []);
      }
      
      if (projectsData.success) {
        setProjects(projectsData.projects || []);
        if (projectsData.projects?.length === 1) {
          setSelectedProject(projectsData.projects[0].id);
        }
      }
    } catch (err) {
      setError('Ошибка загрузки данных');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCluster = (clusterName: string) => {
    setExpandedClusters(prev => {
      const next = new Set(prev);
      if (next.has(clusterName)) {
        next.delete(clusterName);
      } else {
        next.add(clusterName);
      }
      return next;
    });
  };

  // Загрузить ключевые слова подкластера
  const loadSubclusterKeywords = async (cluster: Cluster, subcluster: SubclusterData) => {
    setLoadingSubcluster(true);
    setActiveSubcluster({
      clusterId: cluster.id,
      clusterName: cluster.name,
      subclusterId: subcluster.id,
      subclusterName: subcluster.name
    });
    
    try {
      // Если keywordsWithCount уже есть в данных - используем их
      if (subcluster.keywordsWithCount && subcluster.keywordsWithCount.length > 0) {
        setSubclusterKeywords(subcluster.keywordsWithCount);
      } else if (subcluster.keywords && subcluster.keywords.length > 0) {
        // Fallback на старый формат
        setSubclusterKeywords(subcluster.keywords.map(k => ({ query: k, count: 0 })));
      } else {
        // Иначе загружаем с сервера
        const res = await fetch(`/api/clusters/subclusters?cluster=${encodeURIComponent(cluster.name)}&subcluster=${encodeURIComponent(subcluster.name)}`);
        const data = await res.json();
        if (data.success && data.subcluster) {
          if (data.subcluster.keywordsWithCount) {
            setSubclusterKeywords(data.subcluster.keywordsWithCount);
          } else {
            setSubclusterKeywords((data.subcluster.keywords || []).map((k: string) => ({ query: k, count: 0 })));
          }
        } else {
          setSubclusterKeywords([]);
        }
      }
    } catch (err) {
      console.error('Error loading subcluster keywords:', err);
      setSubclusterKeywords([]);
    } finally {
      setLoadingSubcluster(false);
    }
  };

  // Получить ключ для хранения выбранных слов
  const getSubclusterKey = (clusterName: string, subclusterName: string) => 
    `${clusterName}/${subclusterName}`;

  // Выбрать/снять выбор слова
  const toggleKeyword = (keyword: string) => {
    if (!activeSubcluster) return;
    const key = getSubclusterKey(activeSubcluster.clusterName, activeSubcluster.subclusterName);
    
    setSelectedKeywords(prev => {
      const next = new Map(prev);
      const set = next.get(key) || new Set();
      const newSet = new Set(set);
      
      if (newSet.has(keyword)) {
        newSet.delete(keyword);
      } else {
        newSet.add(keyword);
      }
      
      if (newSet.size === 0) {
        next.delete(key);
      } else {
        next.set(key, newSet);
      }
      
      return next;
    });
  };

  // Фильтрованные и отсортированные ключевые слова (сверху самые частотные)
  const filteredKeywords = useMemo(() => {
    let result = subclusterKeywords;
    
    // Фильтрация по поиску
    if (keywordSearch.trim()) {
      const search = keywordSearch.toLowerCase();
      result = result.filter(kw => kw.query.toLowerCase().includes(search));
    }
    
    // Сортировка по частотности (от большего к меньшему)
    return [...result].sort((a, b) => (b.count || 0) - (a.count || 0));
  }, [subclusterKeywords, keywordSearch]);

  // Выбрать все видимые слова
  const selectAllVisible = () => {
    if (!activeSubcluster) return;
    const key = getSubclusterKey(activeSubcluster.clusterName, activeSubcluster.subclusterName);
    
    setSelectedKeywords(prev => {
      const next = new Map(prev);
      const currentSet = next.get(key) || new Set();
      const newSet = new Set(currentSet);
      filteredKeywords.forEach(kw => newSet.add(kw.query));
      next.set(key, newSet);
      return next;
    });
  };

  // Снять выбор всех видимых слов
  const deselectAllVisible = () => {
    if (!activeSubcluster) return;
    const key = getSubclusterKey(activeSubcluster.clusterName, activeSubcluster.subclusterName);
    
    setSelectedKeywords(prev => {
      const next = new Map(prev);
      const set = next.get(key) || new Set();
      const newSet = new Set(set);
      
      filteredKeywords.forEach(kw => newSet.delete(kw.query));
      
      if (newSet.size === 0) {
        next.delete(key);
      } else {
        next.set(key, newSet);
      }
      
      return next;
    });
  };

  // Выбрать весь подкластер целиком (все слова)
  const selectEntireSubcluster = (cluster: Cluster, subcluster: SubclusterData) => {
    const key = getSubclusterKey(cluster.name, subcluster.name);
    
    setSelectedKeywords(prev => {
      const next = new Map(prev);
      const keywords = subcluster.keywords || [];
      
      if (keywords.length > 0) {
        next.set(key, new Set(keywords));
      }
      
      return next;
    });
  };

  // Снять выбор всего подкластера
  const deselectEntireSubcluster = (cluster: Cluster, subcluster: SubclusterData) => {
    const key = getSubclusterKey(cluster.name, subcluster.name);
    
    setSelectedKeywords(prev => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  // Выбрать все подкластеры в кластере
  const selectAllInCluster = (cluster: Cluster) => {
    setSelectedKeywords(prev => {
      const next = new Map(prev);
      
      cluster.subclusters.forEach(sub => {
        if (sub.keywords && sub.keywords.length > 0) {
          const key = getSubclusterKey(cluster.name, sub.name);
          next.set(key, new Set(sub.keywords));
        }
      });
      
      return next;
    });
  };

  // Снять выбор всех подкластеров в кластере
  const deselectAllInCluster = (cluster: Cluster) => {
    setSelectedKeywords(prev => {
      const next = new Map(prev);
      
      cluster.subclusters.forEach(sub => {
        const key = getSubclusterKey(cluster.name, sub.name);
        next.delete(key);
      });
      
      return next;
    });
  };

  // Получить количество выбранных слов для подкластера
  const getSelectedCount = (clusterName: string, subclusterName: string): number => {
    const key = getSubclusterKey(clusterName, subclusterName);
    return selectedKeywords.get(key)?.size || 0;
  };

  // Получить количество выбранных слов в кластере
  const getClusterSelectedCount = (cluster: Cluster): number => {
    let count = 0;
    cluster.subclusters.forEach(sub => {
      count += getSelectedCount(cluster.name, sub.name);
    });
    return count;
  };

  // Общее количество выбранных слов
  const getTotalSelectedKeywords = (): number => {
    let count = 0;
    selectedKeywords.forEach(set => {
      count += set.size;
    });
    return count;
  };

  // Количество групп с выбранными словами
  const getTotalSelectedGroups = (): number => {
    return selectedKeywords.size;
  };

  // Загрузить в Топвизор
  const uploadSelected = async () => {
    if (!selectedProject || selectedKeywords.size === 0) return;
    
    setUploading(true);
    setUploadResults(null);
    setError(null);
    
    const allResults: UploadResult[] = [];
    
    try {
      // Группируем по кластерам
      const byCluster = new Map<string, Map<string, string[]>>();
      
      selectedKeywords.forEach((keywords, key) => {
        const [clusterName, subclusterName] = key.split('/');
        if (!byCluster.has(clusterName)) {
          byCluster.set(clusterName, new Map());
        }
        byCluster.get(clusterName)!.set(subclusterName, Array.from(keywords));
      });
      
      // Загружаем по кластерам
      const clusterEntries = Array.from(byCluster.entries());
      for (const [clusterName, subclusters] of clusterEntries) {
        const subclusterEntries = Array.from(subclusters.entries());
        for (const [subclusterName, keywords] of subclusterEntries) {
          const res = await fetch('/api/clusters/subclusters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: selectedProject,
              clusterName,
              subclusterNames: [subclusterName],
              customKeywords: { [subclusterName]: keywords },
              createAsGroups: true
            })
          });
          
          const data = await res.json();
          if (data.results) {
            allResults.push(...data.results);
          }
        }
      }
      
      setUploadResults(allResults);
      
      // Очищаем выбор после успешной загрузки
      if (allResults.every(r => !r.error)) {
        setSelectedKeywords(new Map());
      }
    } catch (err) {
      setError('Ошибка загрузки');
      console.error(err);
    } finally {
      setUploading(false);
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
                className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="p-2 rounded-xl bg-purple-400/10 text-purple-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Загрузка подкластеров</h1>
                <p className="text-white/40 text-xs">
                  Выберите ключевые слова для загрузки в Топвизор
                </p>
              </div>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Обновить
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Clusters */}
          <div className="w-80 flex-none overflow-y-auto p-4 border-r border-white/5">
            {clusters.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50">Кластеры не найдены</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {clusters.map(cluster => {
                  const clusterSelected = getClusterSelectedCount(cluster);
                  const allSelected = clusterSelected === cluster.totalKeywords && cluster.totalKeywords > 0;
                  
                  return (
                    <div 
                      key={cluster.name}
                      className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
                    >
                      {/* Cluster Header */}
                      <div 
                        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-white/5 transition-colors"
                        onClick={() => toggleCluster(cluster.name)}
                      >
                        {expandedClusters.has(cluster.name) ? (
                          <ChevronDown className="w-4 h-4 text-white/40" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-white/40" />
                        )}
                        <FolderOpen className="w-4 h-4 text-amber-400" />
                        <span className="flex-1 text-white text-sm font-medium truncate">
                          {cluster.name}
                        </span>
                        {clusterSelected > 0 && (
                          <span className="px-1.5 py-0.5 bg-cyan-400/20 text-cyan-400 text-[10px] rounded">
                            {clusterSelected}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (allSelected) {
                              deselectAllInCluster(cluster);
                            } else {
                              selectAllInCluster(cluster);
                            }
                          }}
                          className={`p-1 rounded transition-colors ${
                            allSelected
                              ? 'text-cyan-400 hover:text-cyan-300'
                              : 'text-white/30 hover:text-white/60'
                          }`}
                          title={allSelected ? 'Снять все' : 'Выбрать все'}
                        >
                          {allSelected ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : clusterSelected > 0 ? (
                            <Minus className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      
                      {/* Subclusters */}
                      {expandedClusters.has(cluster.name) && (
                        <div className="border-t border-white/5 p-2 space-y-1">
                          {cluster.subclusters.map(sub => {
                            const selectedCount = getSelectedCount(cluster.name, sub.name);
                            const isFullySelected = selectedCount === sub.keywordCount && sub.keywordCount > 0;
                            const isPartiallySelected = selectedCount > 0 && selectedCount < sub.keywordCount;
                            const isActive = activeSubcluster?.clusterName === cluster.name && 
                                           activeSubcluster?.subclusterName === sub.name;
                            
                            return (
                              <div
                                key={sub.name}
                                className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                                  isActive 
                                    ? 'bg-purple-400/20 border border-purple-400/30' 
                                    : selectedCount > 0
                                      ? 'bg-cyan-400/10 border border-cyan-400/20'
                                      : 'hover:bg-white/5 border border-transparent'
                                }`}
                              >
                                {/* Checkbox */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isFullySelected) {
                                      deselectEntireSubcluster(cluster, sub);
                                    } else {
                                      selectEntireSubcluster(cluster, sub);
                                    }
                                  }}
                                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                    isFullySelected 
                                      ? 'bg-cyan-400 border-cyan-400' 
                                      : isPartiallySelected
                                        ? 'bg-cyan-400/50 border-cyan-400'
                                        : 'border-white/30 hover:border-white/50'
                                  }`}
                                >
                                  {isFullySelected && <Check className="w-3 h-3 text-black" />}
                                  {isPartiallySelected && <Minus className="w-2.5 h-2.5 text-black" />}
                                </button>
                                
                                {/* Info */}
                                <div 
                                  className="flex-1 min-w-0 cursor-pointer"
                                  onClick={() => loadSubclusterKeywords(cluster, sub)}
                                >
                                  <div className="flex items-center gap-1">
                                    <FileText className="w-3 h-3 text-white/40 flex-shrink-0" />
                                    <span className="text-white/70 text-sm truncate">{sub.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {sub.isFiltered && (
                                      <span className="px-1 py-0.5 bg-green-400/20 text-green-400 text-[9px] rounded">
                                        фильтр
                                      </span>
                                    )}
                                    <span className="text-white/30 text-[10px]">
                                      {selectedCount > 0 ? `${selectedCount}/` : ''}{sub.keywordCount} слов
                                    </span>
                                  </div>
                                </div>
                                
                                {/* View button */}
                                <button
                                  onClick={() => loadSubclusterKeywords(cluster, sub)}
                                  className={`p-1 rounded transition-colors ${
                                    isActive 
                                      ? 'text-purple-400' 
                                      : 'text-white/30 hover:text-white/60'
                                  }`}
                                  title="Просмотреть слова"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Middle Panel - Keywords */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-white/5">
            {activeSubcluster ? (
              <>
                {/* Subcluster Header */}
                <div className="flex-none p-4 border-b border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-white font-medium">{activeSubcluster.subclusterName}</h2>
                      <p className="text-white/40 text-xs">{activeSubcluster.clusterName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={selectAllVisible}
                        className="px-2 py-1 text-xs bg-white/5 text-white/60 rounded hover:bg-white/10 hover:text-white transition-colors"
                      >
                        Выбрать все
                      </button>
                      <button
                        onClick={deselectAllVisible}
                        className="px-2 py-1 text-xs bg-white/5 text-white/60 rounded hover:bg-white/10 hover:text-white transition-colors"
                      >
                        Снять все
                      </button>
                    </div>
                  </div>
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      value={keywordSearch}
                      onChange={(e) => setKeywordSearch(e.target.value)}
                      placeholder="Поиск по словам..."
                      className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 text-xs text-white/40">
                    <span>Найдено: {filteredKeywords.length}</span>
                    <span>Выбрано: {getSelectedCount(activeSubcluster.clusterName, activeSubcluster.subclusterName)}</span>
                  </div>
                </div>
                
                {/* Keywords List */}
                <div className="flex-1 overflow-y-auto p-2">
                  {loadingSubcluster ? (
                    <div className="flex items-center justify-center h-32">
                      <Spinner size="md" />
                    </div>
                  ) : filteredKeywords.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-white/40 text-sm">
                      {keywordSearch ? 'Ничего не найдено' : 'Нет ключевых слов'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredKeywords.map((keyword, idx) => {
                        const key = getSubclusterKey(activeSubcluster.clusterName, activeSubcluster.subclusterName);
                        const isSelected = selectedKeywords.get(key)?.has(keyword.query) || false;
                        
                        // Определяем цвет по частотности (как в редакторе)
                        const getFrequencyColor = (count: number) => {
                          if (count >= 10000) return 'text-red-400 bg-red-400/10'; // Высокочастотный
                          if (count >= 1000) return 'text-orange-400 bg-orange-400/10'; // Среднечастотный
                          if (count >= 100) return 'text-yellow-400 bg-yellow-400/10'; // Низкочастотный
                          if (count > 0) return 'text-green-400 bg-green-400/10'; // Микрочастотный
                          return 'text-white/30 bg-white/5'; // Нет данных
                        };
                        
                        const frequencyColor = getFrequencyColor(keyword.count);
                        
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleKeyword(keyword.query)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-cyan-400/20 border border-cyan-400/30' 
                                : 'hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              isSelected 
                                ? 'bg-cyan-400 border-cyan-400' 
                                : 'border-white/30'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-black" />}
                            </div>
                            {/* Частотность */}
                            <span className={`text-xs font-mono px-1.5 py-0.5 rounded min-w-[50px] text-right ${frequencyColor}`}>
                              {keyword.count > 0 ? keyword.count.toLocaleString('ru-RU') : '—'}
                            </span>
                            {/* Ключевое слово */}
                            <span className="text-white/80 text-sm flex-1">{keyword.query}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Eye className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">Выберите подкластер для просмотра слов</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Upload */}
          <div className="w-72 flex-none p-4 space-y-4">
            {/* Project Select */}
            <div className="space-y-2">
              <label className="text-sm text-white/70">Проект Топвизор</label>
              <select
                value={selectedProject || ''}
                onChange={(e) => setSelectedProject(Number(e.target.value) || null)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-400/50"
              >
                <option value="">Выберите проект</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.site})</option>
                ))}
              </select>
            </div>

            {/* Selection Summary */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Выбрано групп:</span>
                <span className="text-white font-medium">{getTotalSelectedGroups()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Ключевых слов:</span>
                <span className="text-white font-medium">{getTotalSelectedKeywords().toLocaleString()}</span>
              </div>
            </div>

            {/* Selected Groups Preview */}
            {selectedKeywords.size > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-white/50">Выбранные группы:</h3>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {Array.from(selectedKeywords.entries()).map(([key, keywords]) => {
                    const parts = key.split('/');
                    const subcluster = parts.slice(1).join('/');
                    return (
                      <div 
                        key={key}
                        className="flex items-center justify-between p-2 bg-white/5 rounded-lg text-xs"
                      >
                        <span className="text-white/70 truncate flex-1">{subcluster}</span>
                        <span className="text-cyan-400 ml-2">{keywords.size}</span>
                        <button
                          onClick={() => {
                            setSelectedKeywords(prev => {
                              const next = new Map(prev);
                              next.delete(key);
                              return next;
                            });
                          }}
                          className="ml-2 p-0.5 text-white/30 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={uploadSelected}
              disabled={!selectedProject || getTotalSelectedKeywords() === 0 || uploading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-400 text-black font-medium rounded-xl hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? 'Загрузка...' : 'Загрузить в Топвизор'}
            </button>

            {/* Clear Selection */}
            {selectedKeywords.size > 0 && (
              <button
                onClick={() => setSelectedKeywords(new Map())}
                className="w-full px-4 py-2 text-sm text-white/50 hover:text-white/70 transition-colors"
              >
                Очистить выбор
              </button>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-400/10 border border-red-400/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Results */}
            {uploadResults && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white">Результаты загрузки</h3>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {uploadResults.map((result, i) => (
                    <div 
                      key={i}
                      className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                        result.error 
                          ? 'bg-red-400/10 text-red-400' 
                          : 'bg-green-400/10 text-green-400'
                      }`}
                    >
                      {result.error ? (
                        <X className="w-4 h-4 flex-none" />
                      ) : (
                        <Check className="w-4 h-4 flex-none" />
                      )}
                      <span className="flex-1 truncate">{result.name}</span>
                      {result.error ? (
                        <span className="text-xs">{result.error}</span>
                      ) : (
                        <span className="text-xs">+{result.keywordsAdded}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
