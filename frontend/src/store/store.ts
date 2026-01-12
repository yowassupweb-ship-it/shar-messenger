import { create } from 'zustand';
import type { Cluster, Filter, Query, SearchModel } from '@/types';

interface SubclusterResult {
  subclusterId: string;
  queries: Array<{ query: string; count: number }>;
  totalImpressions: number;
  filteredCount: number;
}

interface StoreState {
  // Data
  clusters: Cluster[];
  filters: Filter[];
  queries: Query[];
  searchModels: SearchModel[];
  
  // Filtered results for each subcluster
  subclusterResults: Record<string, SubclusterResult>;
  
  // Quota
  remainingQuota: number;
  totalQuota: number;
  
  // Selection
  selectedCluster: string | null;
  selectedType: string | null;
  selectedFilter: string | null;
  selectedQueries: string[];
  
  // Loading
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadData: () => Promise<void>;
  setSelectedCluster: (id: string | null) => void;
  setSelectedType: (id: string | null) => void;
  setSelectedFilter: (id: string | null) => void;
  toggleQuerySelection: (id: string) => void;
  selectAllQueries: () => void;
  clearQuerySelection: () => void;
  addFilter: (filter: Filter) => void;
  updateFilter: (id: string, items: string[]) => void;
  removeFilter: (id: string) => void;
  addQuery: (query: Query) => void;
  removeQueries: (ids: string[]) => void;
  
  // Subcluster results
  loadSubclusterResults: () => Promise<void>;
  updateSubclusterResult: (subclusterId: string, minFrequency: number, filterIds: string[]) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  // Initial state
  clusters: [],
  filters: [],
  queries: [],
  searchModels: [],
  subclusterResults: {},
  remainingQuota: 10000,
  totalQuota: 10000,
  selectedCluster: null,
  selectedType: null,
  selectedFilter: null,
  selectedQueries: [],
  isLoading: false,
  error: null,

  // Load data from API
  loadData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [clustersRes, filtersRes, queriesRes, modelsRes, quotaRes] = await Promise.all([
        fetch('/api/clusters'),
        fetch('/api/filters'),
        fetch('/api/queries'),
        fetch('/api/models'),
        fetch('/api/quota').catch(() => null),
      ]);
      
      const clusters = clustersRes.ok ? await clustersRes.json() : [];
      const filters = filtersRes.ok ? await filtersRes.json() : [];
      const queries = queriesRes.ok ? await queriesRes.json() : [];
      const searchModels = modelsRes.ok ? await modelsRes.json() : [];
      
      let remainingQuota = 10000;
      let totalQuota = 10000;
      
      if (quotaRes && quotaRes.ok) {
        const quotaData = await quotaRes.json();
        if (quotaData && typeof quotaData.remaining === 'number') {
          remainingQuota = quotaData.remaining;
          totalQuota = quotaData.total || 1024;
        }
      }
      
      set({ 
        clusters, 
        filters, 
        queries,
        searchModels,
        remainingQuota,
        totalQuota,
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Ошибка загрузки',
        isLoading: false 
      });
    }
  },

  // Selection
  setSelectedCluster: (id) => set({ selectedCluster: id, selectedType: null }),
  setSelectedType: (id) => set({ selectedType: id }),
  setSelectedFilter: (id) => set({ selectedFilter: id }),
  
  toggleQuerySelection: (id) => set((state) => ({
    selectedQueries: state.selectedQueries.includes(id)
      ? state.selectedQueries.filter((qid) => qid !== id)
      : [...state.selectedQueries, id]
  })),
  
  selectAllQueries: () => set((state) => ({
    selectedQueries: state.queries.map((q) => q.id)
  })),
  
  clearQuerySelection: () => set({ selectedQueries: [] }),

  // Filter operations
  addFilter: (filter) => set((state) => ({
    filters: [...state.filters, filter]
  })),
  
  updateFilter: (id, items) => set((state) => ({
    filters: state.filters.map((f) => 
      f.id === id ? { ...f, items } : f
    )
  })),
  
  removeFilter: (id) => set((state) => ({
    filters: state.filters.filter((f) => f.id !== id)
  })),

  // Query operations
  addQuery: (query) => set((state) => ({
    queries: [...state.queries, query]
  })),
  
  removeQueries: (ids) => set((state) => ({
    queries: state.queries.filter((q) => !ids.includes(q.id)),
    selectedQueries: state.selectedQueries.filter((id) => !ids.includes(id))
  })),

  // Subcluster results operations
  loadSubclusterResults: async () => {
    try {
      const res = await fetch('/api/subcluster-results', {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (res.ok) {
        const data = await res.json();
        const results: Record<string, SubclusterResult> = {};
        
        // Загружаем конфигурации из localStorage
        const savedConfigs = localStorage.getItem('subclusterConfigs');
        const configs = savedConfigs ? JSON.parse(savedConfigs) : [];
        
        // Получаем фильтры из store (не из localStorage!)
        const allFilters = get().filters;
        
        console.log('[Store] Loading subcluster results with configs:', configs);
        console.log('[Store] Available filters from store:', allFilters.length);
        
        data.forEach((result: any) => {
          if (result.subclusterId && result.queries) {
            const cfg = configs.find((c: any) => c.subclusterId === result.subclusterId);
            const minFreq = cfg?.minFrequency || 0;
            const filterIds = cfg?.filters || [];
            
            // 1. Сначала применяем фильтр по частоте к ВСЕМ запросам
            let filtered = result.queries.filter((q: any) => q.count >= minFreq);
            
            // 2. Затем применяем клиентскую фильтрацию по минус-словам из выбранных фильтров
            if (filterIds.length > 0 && allFilters.length > 0) {
              console.log(`[Store] ${result.subclusterId} - filterIds:`, filterIds);
              
              // Собираем все минус-слова из выбранных фильтров
              const minusWords = new Set<string>();
              filterIds.forEach((filterId: string) => {
                const filter = allFilters.find((f: any) => f.id === filterId);
                if (filter && filter.items) {
                  console.log(`[Store] ${result.subclusterId} - filter ${filterId} items:`, filter.items.length);
                  filter.items.forEach((item: string) => {
                    if (item && item.trim() && !item.startsWith('#')) {
                      minusWords.add(item.toLowerCase());
                    }
                  });
                }
              });
              
              console.log(`[Store] ${result.subclusterId} - total minus words:`, minusWords.size);
              
              // Применяем фильтрацию
              if (minusWords.size > 0) {
                const beforeFilter = filtered.length;
                const minusWordsArray = Array.from(minusWords);
                filtered = filtered.filter((q: any) => {
                  const queryLower = q.query.toLowerCase();
                  for (const word of minusWordsArray) {
                    if (queryLower.includes(word)) return false;
                  }
                  return true;
                });
                console.log(`[Store] ${result.subclusterId} - after minus-words filter: ${beforeFilter} -> ${filtered.length}`);
              }
            }
            
            const totalImpressions = filtered.reduce((sum: number, q: any) => sum + q.count, 0);
            
            console.log(`[Store] ${result.subclusterId}: ${result.queries.length} -> ${filtered.length} (minFreq: ${minFreq}, filters: ${filterIds.length})`);
            
            results[result.subclusterId] = {
              subclusterId: result.subclusterId,
              queries: filtered,
              totalImpressions,
              filteredCount: filtered.length
            };
          }
        });
        
        console.log('[Store] Final results:', results);
        set({ subclusterResults: results });
      }
    } catch (error) {
      console.error('Error loading subcluster results:', error);
    }
  },
  
  updateSubclusterResult: (subclusterId, minFrequency, filterIds) => {
    // Перезагружаем результаты при изменении конфигурации
    get().loadSubclusterResults();
  },
}));
