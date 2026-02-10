'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { Spinner } from '@/components/Spinner';
import { 
  ArrowLeft, 
  RefreshCw,
  ExternalLink,
  Search,
  Trophy,
  Target,
  Eye,
  Users,
  AlertCircle,
  Table,
  LineChart,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface Project {
  id: number;
  name: string;
  site: string;
}

interface CompetitorStats {
  id: number;
  domain: string;
  name: string;
  isOurSite: boolean;
  visibility: number;
  avg_position: number;
  top3_count: number;
  top10_count: number;
  top30_count: number;
  keywords_count: number;
  positions: number[];
}

interface CompetitorsData {
  success: boolean;
  competitors: CompetitorStats[];
  dates: string[];
  totalKeywords: number;
  projectSite: string;
  error?: string;
  message?: string;
}

type ViewMode = 'chart' | 'table';

// Цвета для конкурентов
const COMPETITOR_COLORS = [
  '#22d3ee', // cyan-400 - наш сайт
  '#f472b6', // pink-400
  '#a78bfa', // violet-400
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#f87171', // red-400
  '#60a5fa', // blue-400
  '#4ade80', // green-400
  '#c084fc', // purple-400
  '#fb923c', // orange-400
];

export default function CompetitorsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [data, setData] = useState<CompetitorsData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'visibility' | 'avg_position' | 'top3_count' | 'top10_count' | 'top30_count'>('visibility');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load data when project selected
  useEffect(() => {
    if (selectedProject) {
      loadCompetitorsData();
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/topvisor/projects');
      const result = await res.json();
      if (result.success && result.projects) {
        setProjects(result.projects);
        if (result.projects.length > 0) {
          setSelectedProject(result.projects[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCompetitorsData = async () => {
    if (!selectedProject) return;
    
    setLoadingData(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/topvisor/competitors?projectId=${selectedProject}`);
      const result = await response.json();
      
      // Debug logging in browser console
      console.log('[Competitors Page] API Response:', result);
      console.log('[Competitors Page] DEBUG INFO:', result.debug);
      if (result.competitors) {
        console.log('[Competitors Page] Competitors data:', result.competitors.map((c: CompetitorStats) => ({
          domain: c.domain,
          visibility: c.visibility?.toFixed(1),
          positions: c.positions?.length,
          top3: c.top3_count,
          top10: c.top10_count,
          top30: c.top30_count
        })));
      }
      
      if (!result.success) {
        setError(result.error || 'Ошибка загрузки данных');
      } else {
        setData(result);
      }
    } catch (err) {
      console.error('Load competitors error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoadingData(false);
    }
  };

  // Sort competitors
  const sortedCompetitors = useMemo(() => {
    if (!data?.competitors) return [];
    
    let filtered = [...data.competitors];
    
    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.domain.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort
    return filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'avg_position') {
        if (aVal === 0) aVal = 1000;
        if (bVal === 0) bVal = 1000;
        // Для позиции - меньше лучше
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [data, sortField, sortDirection, searchQuery]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'avg_position' ? 'asc' : 'desc');
    }
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  // Calculate max values for chart scaling
  const maxVisibility = useMemo(() => {
    if (!data?.competitors) return 100;
    return Math.max(...data.competitors.map(c => c.visibility), 100);
  }, [data]);

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
        <div className="flex-none px-4 py-2 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/slovolov-pro/topvisor/positions')}
                className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              
              <div>
                <h1 className="text-base font-semibold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Анализ конкурентов
                </h1>
                {selectedProjectData && (
                  <p className="text-[10px] text-white/40">{selectedProjectData.site}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск..."
                  className="pl-7 pr-3 py-1 text-xs bg-white/5 border border-white/10 rounded-lg w-36 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/50"
                />
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('chart')}
                  className={`p-1.5 rounded transition-all ${viewMode === 'chart' ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/40 hover:text-white/60'}`}
                  title="График"
                >
                  <LineChart className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded transition-all ${viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/40 hover:text-white/60'}`}
                  title="Таблица"
                >
                  <Table className="w-3.5 h-3.5" />
                </button>
              </div>
              
              {/* Refresh */}
              <button
                onClick={loadCompetitorsData}
                disabled={loadingData}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                Обновить
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Loading */}
          {loadingData && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Spinner size="lg" className="mx-auto mb-2" />
                <p className="text-white/50 text-sm">Загрузка данных о конкурентах...</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loadingData && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-400">{error}</p>
              <button
                onClick={loadCompetitorsData}
                className="mt-3 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all text-sm"
              >
                Попробовать снова
              </button>
            </div>
          )}

          {/* Message (no competitors added) */}
          {data?.message && !loadingData && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 text-center">
              <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-yellow-400">{data.message}</p>
              <a
                href={`https://topvisor.com/positions/?projectId=${selectedProject}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-all text-sm"
              >
                Открыть в Топвизор
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Data */}
          {data && data.competitors && data.competitors.length > 0 && !loadingData && !error && !data.message && (
            <>
              {/* Summary Cards - показываем лучшего конкурента */}
              {(() => {
                const bestByVisibility = [...sortedCompetitors].sort((a, b) => b.visibility - a.visibility)[0];
                const bestByTop3 = [...sortedCompetitors].sort((a, b) => b.top3_count - a.top3_count)[0];
                const bestByTop10 = [...sortedCompetitors].sort((a, b) => b.top10_count - a.top10_count)[0];
                const bestByPosition = [...sortedCompetitors].filter(c => c.avg_position > 0).sort((a, b) => a.avg_position - b.avg_position)[0];
                
                return (
                  <div className="grid grid-cols-5 gap-3 mb-4">
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-white/40 mb-1">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">Конкурентов</span>
                      </div>
                      <p className="text-xl font-bold text-white">{sortedCompetitors.filter(c => !c.isOurSite).length}</p>
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-white/40 mb-1">
                        <Target className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">Ключевых слов</span>
                      </div>
                      <p className="text-xl font-bold text-white">{data.totalKeywords}</p>
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-green-400/60 mb-1">
                        <Trophy className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">Лучший ТОП-3</span>
                      </div>
                      <p className="text-xl font-bold text-green-400">
                        {bestByTop3?.top3_count || 0}
                      </p>
                      <p className="text-[9px] text-white/30 truncate">{bestByTop3?.domain}</p>
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-cyan-400/60 mb-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">Лучший ТОП-10</span>
                      </div>
                      <p className="text-xl font-bold text-cyan-400">
                        {bestByTop10?.top10_count || 0}
                      </p>
                      <p className="text-[9px] text-white/30 truncate">{bestByTop10?.domain}</p>
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-purple-400/60 mb-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">Лучшая видимость</span>
                      </div>
                      <p className="text-xl font-bold text-purple-400">
                        {(bestByVisibility?.visibility || 0).toFixed(1)}%
                      </p>
                      <p className="text-[9px] text-white/30 truncate">{bestByVisibility?.domain}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Chart View */}
              {viewMode === 'chart' && (
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <h3 className="text-sm font-medium text-white/70 mb-4">Сравнение видимости</h3>
                  <div className="space-y-3">
                    {sortedCompetitors.map((competitor, idx) => {
                      const color = competitor.isOurSite ? COMPETITOR_COLORS[0] : COMPETITOR_COLORS[(idx % (COMPETITOR_COLORS.length - 1)) + 1];
                      const widthPercent = (competitor.visibility / maxVisibility) * 100;
                      
                      return (
                        <div key={competitor.id} className="flex items-center gap-3">
                          <div className="w-40 flex items-center gap-2 flex-shrink-0">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className={`text-xs truncate ${competitor.isOurSite ? 'text-cyan-400 font-medium' : 'text-white/70'}`}>
                              {competitor.domain}
                            </span>
                          </div>
                          <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden relative">
                            <div 
                              className="h-full rounded-lg transition-all duration-500"
                              style={{ 
                                width: `${widthPercent}%`,
                                backgroundColor: color,
                                opacity: competitor.isOurSite ? 1 : 0.7
                              }}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/60 font-medium">
                              {competitor.visibility.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-20 text-right flex-shrink-0">
                            <span className="text-xs text-white/40">
                              Позиция: <span className="text-white/70">{competitor.avg_position > 0 ? competitor.avg_position.toFixed(1) : '—'}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Legend */}
                  <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-2 rounded bg-green-400/50" />
                      <span className="text-[10px] text-white/40">ТОП-3</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-2 rounded bg-cyan-400/50" />
                      <span className="text-[10px] text-white/40">ТОП-10</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-2 rounded bg-purple-400/50" />
                      <span className="text-[10px] text-white/40">ТОП-30</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Table View */}
              {viewMode === 'table' && (
                <div className="bg-white/5 rounded-xl overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-7 gap-2 px-4 py-2 bg-white/5 text-[10px] text-white/40 uppercase tracking-wider font-medium">
                    <div className="col-span-2">Домен</div>
                    <button 
                      onClick={() => handleSort('visibility')}
                      className={`text-left flex items-center gap-1 hover:text-white/60 ${sortField === 'visibility' ? 'text-cyan-400' : ''}`}
                    >
                      Видимость
                      {sortField === 'visibility' && (sortDirection === 'desc' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />)}
                    </button>
                    <button 
                      onClick={() => handleSort('avg_position')}
                      className={`text-left flex items-center gap-1 hover:text-white/60 ${sortField === 'avg_position' ? 'text-cyan-400' : ''}`}
                    >
                      Ср. позиция
                      {sortField === 'avg_position' && (sortDirection === 'desc' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />)}
                    </button>
                    <button 
                      onClick={() => handleSort('top3_count')}
                      className={`text-left flex items-center gap-1 hover:text-white/60 ${sortField === 'top3_count' ? 'text-cyan-400' : ''}`}
                    >
                      ТОП-3
                      {sortField === 'top3_count' && (sortDirection === 'desc' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />)}
                    </button>
                    <button 
                      onClick={() => handleSort('top10_count')}
                      className={`text-left flex items-center gap-1 hover:text-white/60 ${sortField === 'top10_count' ? 'text-cyan-400' : ''}`}
                    >
                      ТОП-10
                      {sortField === 'top10_count' && (sortDirection === 'desc' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />)}
                    </button>
                    <button 
                      onClick={() => handleSort('top30_count')}
                      className={`text-left flex items-center gap-1 hover:text-white/60 ${sortField === 'top30_count' ? 'text-cyan-400' : ''}`}
                    >
                      ТОП-30
                      {sortField === 'top30_count' && (sortDirection === 'desc' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />)}
                    </button>
                  </div>
                  
                  {/* Table Rows */}
                  <div className="divide-y divide-white/5">
                    {sortedCompetitors.map((competitor, idx) => {
                      const color = competitor.isOurSite ? COMPETITOR_COLORS[0] : COMPETITOR_COLORS[(idx % (COMPETITOR_COLORS.length - 1)) + 1];
                      
                      return (
                        <div 
                          key={competitor.id}
                          className={`grid grid-cols-7 gap-2 px-4 py-3 hover:bg-white/5 transition-colors ${competitor.isOurSite ? 'bg-cyan-500/5' : ''}`}
                        >
                          <div className="col-span-2 flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <a
                              href={`https://${competitor.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-xs hover:underline truncate ${competitor.isOurSite ? 'text-cyan-400 font-medium' : 'text-white/80'}`}
                            >
                              {competitor.domain}
                              {competitor.isOurSite && <span className="ml-1 text-[10px] text-cyan-400/60">(наш)</span>}
                            </a>
                          </div>
                          <div className="text-xs">
                            <span className={competitor.visibility >= 50 ? 'text-green-400' : competitor.visibility >= 25 ? 'text-yellow-400' : 'text-white/60'}>
                              {competitor.visibility.toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-xs text-white/70">
                            {competitor.avg_position > 0 ? competitor.avg_position.toFixed(1) : '—'}
                          </div>
                          <div className="text-xs">
                            <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                              {competitor.top3_count}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                              {competitor.top10_count}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                              {competitor.top30_count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
