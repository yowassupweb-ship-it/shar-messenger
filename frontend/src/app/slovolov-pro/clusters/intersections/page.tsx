'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { Spinner } from '@/components/Spinner';

interface SubclusterResult {
  id: string;
  name: string;
  cluster: string;
  queries: string[];
  filteredQueries?: string[];
  timestamp: string;
}

interface IntersectionQuery {
  query: string;
  count1: number;
  count2: number;
  staysIn: 1 | 2;
}

interface IntersectionPair {
  id1: string;
  id2: string;
  name1: string;
  name2: string;
  cluster1: string;
  cluster2: string;
  count1: number;
  count2: number;
  intersection: IntersectionQuery[];
  intersectionCount: number;
  removeFrom1: number;
  removeFrom2: number;
}

interface SavedIntersections {
  lastUpdated: string;
  pairs: IntersectionPair[];
}

export default function IntersectionsPage() {
  const router = useRouter();
  
  const [subclusters, setSubclusters] = useState<SubclusterResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [allIntersections, setAllIntersections] = useState<SavedIntersections | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [selectedPair, setSelectedPair] = useState<IntersectionPair | null>(null);
  const [filterOnlyWithIntersections, setFilterOnlyWithIntersections] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Manual overrides for staysIn: key = "pairId1|pairId2|query", value = 1 | 2
  const [overrides, setOverrides] = useState<Record<string, 1 | 2>>({});

  // Load subclusters
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/subcluster-results');
        if (res.ok) {
          const data = await res.json();
          const filtered = data.filter((s: SubclusterResult) => s.filteredQueries && s.filteredQueries.length > 0);
          setSubclusters(filtered);
        }
      } catch (error) {
        console.error('Failed to load subclusters:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Load cached intersections on mount
  useEffect(() => {
    const loadCached = async () => {
      try {
        const res = await fetch('/api/clusters/compare-all', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.pairs && data.pairs.length > 0) {
            setAllIntersections(data);
          }
        }
      } catch (error) {
        console.error('Failed to load cached intersections:', error);
      }
    };
    loadCached();
  }, []);

  // Compare all subclusters
  const compareAll = useCallback(async () => {
    setLoadingAll(true);
    try {
      const res = await fetch('/api/clusters/compare-all');
      if (res.ok) {
        const data = await res.json();
        setAllIntersections(data);
        setSelectedPair(null);
      }
    } catch (error) {
      console.error('Failed to compare all:', error);
    } finally {
      setLoadingAll(false);
    }
  }, []);

  // Filter and sort pairs
  const filteredPairs = allIntersections?.pairs
    .filter((pair: IntersectionPair) => {
      if (filterOnlyWithIntersections && pair.intersectionCount === 0) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          pair.name1.toLowerCase().includes(query) ||
          pair.name2.toLowerCase().includes(query) ||
          pair.cluster1.toLowerCase().includes(query) ||
          pair.cluster2.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a: IntersectionPair, b: IntersectionPair) => b.intersectionCount - a.intersectionCount) || [];

  // Stats
  const totalIntersections = allIntersections?.pairs.reduce((sum, p) => sum + p.intersectionCount, 0) || 0;
  const pairsWithIntersections = allIntersections?.pairs.filter(p => p.intersectionCount > 0).length || 0;

  // Get effective staysIn value (with override if exists)
  const getStaysIn = (pairId1: string, pairId2: string, query: string, defaultValue: 1 | 2): 1 | 2 => {
    const key = `${pairId1}|${pairId2}|${query}`;
    return overrides[key] ?? defaultValue;
  };

  // Toggle staysIn for a query
  const toggleStaysIn = (pairId1: string, pairId2: string, query: string, currentValue: 1 | 2) => {
    const key = `${pairId1}|${pairId2}|${query}`;
    const newValue: 1 | 2 = currentValue === 1 ? 2 : 1;
    setOverrides(prev => ({ ...prev, [key]: newValue }));
  };

  // Get counts with overrides applied
  const getRemoveCounts = (pair: IntersectionPair): { removeFrom1: number; removeFrom2: number } => {
    let removeFrom1 = 0;
    let removeFrom2 = 0;
    for (const item of pair.intersection) {
      const staysIn = getStaysIn(pair.id1, pair.id2, item.query, item.staysIn);
      if (staysIn === 1) {
        removeFrom2++;
      } else {
        removeFrom1++;
      }
    }
    return { removeFrom1, removeFrom2 };
  };

  const copyQueries = (pair: IntersectionPair, type: 'all' | 'from1' | 'from2') => {
    let text = '';
    if (type === 'all') {
      text = pair.intersection.map(q => q.query).join('\n');
    } else if (type === 'from1') {
      // Queries that stay in 2 should be removed from 1
      text = pair.intersection
        .filter(q => getStaysIn(pair.id1, pair.id2, q.query, q.staysIn) === 2)
        .map(q => q.query)
        .join('\n');
    } else {
      // Queries that stay in 1 should be removed from 2
      text = pair.intersection
        .filter(q => getStaysIn(pair.id1, pair.id2, q.query, q.staysIn) === 1)
        .map(q => q.query)
        .join('\n');
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        <div className="flex-shrink-0 px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/slovolov-pro/clusters')}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-base font-medium text-white/90">Анализ пересечений</h1>
              <p className="text-xs text-white/40">Найти и удалить дубли запросов между подкластерами</p>
            </div>
            
            {/* Action button */}
            <button
              onClick={compareAll}
              disabled={loadingAll || subclusters.length < 2}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm text-blue-400"
            >
              {loadingAll ? (
                <Spinner size="sm" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {loadingAll ? 'Анализ...' : 'Анализировать'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex min-h-0">
          {!allIntersections ? (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-white/70 mb-1">Анализ не запущен</h3>
                <p className="text-sm text-white/40 mb-4">
                  Нажмите «Анализировать» чтобы найти дублирующиеся запросы между всеми подкластерами
                </p>
                <p className="text-xs text-white/30">
                  Подкластеров с данными: {subclusters.length}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Left sidebar - pairs list */}
              <div className="w-80 border-r border-white/10 flex flex-col">
                {/* Summary stats */}
                <div className="p-3 border-b border-white/10 bg-white/5">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-medium text-white/80">{allIntersections.pairs.length}</div>
                      <div className="text-[10px] text-white/40">пар</div>
                    </div>
                    <div>
                      <div className="text-lg font-medium text-orange-400">{pairsWithIntersections}</div>
                      <div className="text-[10px] text-white/40">с дублями</div>
                    </div>
                    <div>
                      <div className="text-lg font-medium text-red-400">{totalIntersections}</div>
                      <div className="text-[10px] text-white/40">дублей</div>
                    </div>
                  </div>
                  {allIntersections.lastUpdated && (
                    <div className="text-[10px] text-white/30 text-center mt-2">
                      {formatDate(allIntersections.lastUpdated)}
                    </div>
                  )}
                </div>

                {/* Filters */}
                <div className="p-2 border-b border-white/10 flex gap-2">
                  <div className="flex-1 relative">
                    <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Поиск..."
                      className="w-full pl-8 pr-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/80 placeholder-white/30 focus:outline-none focus:border-white/20"
                    />
                  </div>
                  <button
                    onClick={() => setFilterOnlyWithIntersections(!filterOnlyWithIntersections)}
                    className={`px-2 py-1.5 rounded-lg text-xs transition-colors border ${
                      filterOnlyWithIntersections 
                        ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' 
                        : 'bg-white/5 border-white/10 text-white/50'
                    }`}
                    title={filterOnlyWithIntersections ? 'Показать все пары' : 'Только с дублями'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </button>
                </div>

                {/* Pairs list */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {filteredPairs.length === 0 ? (
                    <div className="text-center py-8 text-white/30 text-sm">
                      {filterOnlyWithIntersections ? 'Дублей не найдено 🎉' : 'Нет результатов'}
                    </div>
                  ) : (
                    filteredPairs.map((pair: IntersectionPair) => (
                      <button
                        key={`${pair.id1}-${pair.id2}`}
                        onClick={() => setSelectedPair(pair)}
                        className={`w-full text-left p-2.5 rounded-lg transition-all ${
                          selectedPair?.id1 === pair.id1 && selectedPair?.id2 === pair.id2
                            ? 'bg-white/15 ring-1 ring-white/30'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {/* Names */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="flex-1 truncate text-white/80 font-medium">{pair.name1}</span>
                          <span className="text-white/20">↔</span>
                          <span className="flex-1 truncate text-white/80 font-medium text-right">{pair.name2}</span>
                        </div>
                        
                        {/* Clusters */}
                        <div className="flex items-center gap-1.5 text-[10px] text-white/30 mt-0.5">
                          <span className="flex-1 truncate">{pair.cluster1}</span>
                          <span className="flex-1 truncate text-right">{pair.cluster2}</span>
                        </div>

                        {/* Stats */}
                        {pair.intersectionCount > 0 ? (
                          <div className="flex items-center justify-between mt-2 text-[10px]">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                                −{getRemoveCounts(pair).removeFrom1}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                                −{getRemoveCounts(pair).removeFrom2}
                              </span>
                            </div>
                            <span className="text-orange-400 font-medium">
                              {pair.intersectionCount} дубл.
                            </span>
                          </div>
                        ) : (
                          <div className="mt-2 text-[10px] text-green-400/60 text-center">
                            ✓ нет дублей
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Right panel - selected pair details */}
              <div className="flex-1 flex flex-col min-h-0">
                {selectedPair ? (
                  <>
                    {/* Pair header */}
                    <div className="flex-shrink-0 p-4 border-b border-white/10">
                      <div className="grid grid-cols-2 gap-6">
                        {/* Subcluster 1 */}
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-medium text-sm">
                            1
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white/90 truncate">{selectedPair.name1}</div>
                            <div className="text-xs text-white/40 truncate">{selectedPair.cluster1}</div>
                            <div className="flex items-center gap-3 mt-1 text-xs">
                              <span className="text-white/50">{selectedPair.count1} запросов</span>
                              {getRemoveCounts(selectedPair).removeFrom1 > 0 && (
                                <span className="text-red-400">−{getRemoveCounts(selectedPair).removeFrom1} удалить</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Subcluster 2 */}
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-medium text-sm">
                            2
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white/90 truncate">{selectedPair.name2}</div>
                            <div className="text-xs text-white/40 truncate">{selectedPair.cluster2}</div>
                            <div className="flex items-center gap-3 mt-1 text-xs">
                              <span className="text-white/50">{selectedPair.count2} запросов</span>
                              {getRemoveCounts(selectedPair).removeFrom2 > 0 && (
                                <span className="text-red-400">−{getRemoveCounts(selectedPair).removeFrom2} удалить</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Legend and copy buttons */}
                      {selectedPair.intersectionCount > 0 && (
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded bg-cyan-500/30 border border-cyan-500/50"></span>
                              <span className="text-white/50">Остаётся в <span className="text-cyan-400">1</span></span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded bg-purple-500/30 border border-purple-500/50"></span>
                              <span className="text-white/50">Остаётся в <span className="text-purple-400">2</span></span>
                            </div>
                            <span className="text-white/30 italic">← кликните →N чтобы изменить</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {copied && (
                              <span className="text-xs text-green-400">Скопировано!</span>
                            )}
                            <button
                              onClick={() => copyQueries(selectedPair, 'from1')}
                              className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs hover:bg-cyan-500/20 transition-colors max-w-[200px] truncate"
                              title={`Скопировать запросы для удаления из "${selectedPair.name1}"`}
                            >
                              Удалить из «{selectedPair.name1}» ({getRemoveCounts(selectedPair).removeFrom1})
                            </button>
                            <button
                              onClick={() => copyQueries(selectedPair, 'from2')}
                              className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs hover:bg-purple-500/20 transition-colors max-w-[200px] truncate"
                              title={`Скопировать запросы для удаления из "${selectedPair.name2}"`}
                            >
                              Удалить из «{selectedPair.name2}» ({getRemoveCounts(selectedPair).removeFrom2})
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Queries list */}
                    <div className="flex-1 overflow-y-auto p-4">
                      {selectedPair.intersectionCount > 0 ? (
                        <div className="space-y-1">
                          {selectedPair.intersection.map((item: IntersectionQuery, idx: number) => {
                            const effectiveStaysIn = getStaysIn(selectedPair.id1, selectedPair.id2, item.query, item.staysIn);
                            return (
                              <div
                                key={idx}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                                  effectiveStaysIn === 1 
                                    ? 'bg-cyan-500/5 border border-cyan-500/20' 
                                    : 'bg-purple-500/5 border border-purple-500/20'
                                }`}
                              >
                                {/* Query text */}
                                <span className="flex-1 text-white/80">{item.query}</span>
                                
                                {/* Frequencies */}
                                <div className="flex items-center gap-1 text-xs">
                                  <span className={effectiveStaysIn === 1 ? 'text-cyan-400 font-medium' : 'text-white/30'}>
                                    {item.count1.toLocaleString()}
                                  </span>
                                  <span className="text-white/20 mx-1">vs</span>
                                  <span className={effectiveStaysIn === 2 ? 'text-purple-400 font-medium' : 'text-white/30'}>
                                    {item.count2.toLocaleString()}
                                  </span>
                                </div>

                                {/* Clickable toggle button */}
                                <button
                                  onClick={() => toggleStaysIn(selectedPair.id1, selectedPair.id2, item.query, effectiveStaysIn)}
                                  className={`text-[10px] px-2 py-1 rounded-full font-medium transition-all hover:scale-105 ${
                                    effectiveStaysIn === 1 
                                      ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30' 
                                      : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                                  }`}
                                  title="Нажмите, чтобы изменить, где остаётся запрос"
                                >
                                  →{effectiveStaysIn}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-4xl mb-2">🎉</div>
                            <div className="text-lg font-medium text-green-400">Дублей нет!</div>
                            <div className="text-sm text-white/40 mt-1">Эти подкластеры не пересекаются</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                      </div>
                      <div className="text-sm text-white/40">Выберите пару для просмотра деталей</div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
