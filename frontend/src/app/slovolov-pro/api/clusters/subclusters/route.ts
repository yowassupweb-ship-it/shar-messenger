import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { topvisorRequest } from '@/lib/topvisor';

// Пути к файлам данных
const DATA_DIR = path.join(process.cwd(), 'data');
const CLUSTERS_FILE = path.join(DATA_DIR, 'clusters.json');
const SUBCLUSTER_RESULTS_FILE = path.join(DATA_DIR, 'subcluster-results.json');
const FILTERS_FILE = path.join(DATA_DIR, 'filters.json');
const SUBCLUSTER_CONFIGS_FILE = path.join(DATA_DIR, 'subcluster-configs.json');

interface QueryItem {
  query: string;
  count?: number;
}

interface SubclusterResult {
  subclusterId: string;
  subclusterName: string;
  clusterId?: string;
  clusterName?: string;
  models?: string[];
  filters?: string[];
  queries: QueryItem[];
  filteredQueries?: QueryItem[];
}

interface SubclusterConfig {
  subclusterId: string;
  models: string[];
  filters: string[];
  applyFilters?: boolean;
  minFrequency?: number;
}

interface FilterData {
  id: string;
  name: string;
  items: string[];
}

interface ClusterType {
  id: string;
  name: string;
}

interface ClusterData {
  id: string;
  name: string;
  types: ClusterType[];
}

interface Subcluster {
  id: string;
  name: string;
  keywords: string[];
  keywordsWithCount: Array<{ query: string; count: number }>;
  keywordCount: number;
  isFiltered: boolean;
}

interface ClusterInfo {
  id: string;
  name: string;
  subclusters: Subcluster[];
}

// Читает clusters.json
function getClustersData(): ClusterData[] {
  try {
    const content = fs.readFileSync(CLUSTERS_FILE, 'utf-8');
    const data = JSON.parse(content);
    return data.clusters || [];
  } catch {
    return [];
  }
}

// Читает subcluster-results.json
function getSubclusterResults(): SubclusterResult[] {
  try {
    const content = fs.readFileSync(SUBCLUSTER_RESULTS_FILE, 'utf-8');
    const data = JSON.parse(content);
    return data.subclusterResults || [];
  } catch {
    return [];
  }
}

// Читает filters.json
function getFilters(): FilterData[] {
  try {
    const content = fs.readFileSync(FILTERS_FILE, 'utf-8');
    const data = JSON.parse(content);
    return data.filters || [];
  } catch {
    return [];
  }
}

// Читает subcluster-configs.json (серверные конфигурации)
function getSubclusterConfigs(): SubclusterConfig[] {
  try {
    const content = fs.readFileSync(SUBCLUSTER_CONFIGS_FILE, 'utf-8');
    const data = JSON.parse(content);
    return data.configs || [];
  } catch {
    return [];
  }
}

// Применяет фильтры к запросам (как делает редактор)
function applyFiltersToQueries(
  queries: QueryItem[], 
  filterIds: string[], 
  allFilters: FilterData[],
  minFrequency: number = 0
): QueryItem[] {
  if (!queries || queries.length === 0) {
    return [];
  }
  
  // Сначала применяем фильтр по минимальной частоте
  let filtered = queries;
  if (minFrequency > 0) {
    filtered = filtered.filter(q => (q.count || 0) >= minFrequency);
  }
  
  // Затем применяем минус-слова
  if (filterIds && filterIds.length > 0) {
    const minusWords = new Set<string>();
    
    for (const filterId of filterIds) {
      const filter = allFilters.find(f => f.id === filterId);
      if (filter && filter.items) {
        for (const item of filter.items) {
          if (item && item.trim() && !item.startsWith('#')) {
            minusWords.add(item.toLowerCase());
          }
        }
      }
    }
    
    if (minusWords.size > 0) {
      const minusWordsArray = Array.from(minusWords);
      filtered = filtered.filter(q => {
        if (!q || !q.query) return false;
        const queryLower = q.query.toLowerCase();
        for (const word of minusWordsArray) {
          if (queryLower.includes(word)) {
            return false;
          }
        }
        return true;
      });
    }
  }
  
  return filtered;
}

// Получает список всех кластеров с подкластерами
// Применяет фильтры на лету к queries (как делает редактор)
// Использует конфигурации из subcluster-configs.json
function getAllClustersWithSubclusters(): ClusterInfo[] {
  const clustersData = getClustersData();
  const subclusterResults = getSubclusterResults();
  const allFilters = getFilters();
  const configs = getSubclusterConfigs();
  
  const clusters: ClusterInfo[] = [];
  
  for (const cluster of clustersData) {
    const clusterInfo: ClusterInfo = {
      id: cluster.id,
      name: cluster.name,
      subclusters: []
    };
    
    for (const type of cluster.types) {
      // Ищем данные для этого подкластера
      const result = subclusterResults.find(r => 
        r.subclusterId === type.id || 
        r.subclusterId === `${cluster.name}/${type.name}` ||
        (r.subclusterName === type.name && r.clusterId === cluster.id)
      );
      
      if (result && result.queries && result.queries.length > 0) {
        // Ищем конфигурацию для этого подкластера (из серверного файла)
        const config = configs.find(c => c.subclusterId === type.id);
        
        // Используем фильтры из конфига, или из результата как fallback
        const filterIds = config?.filters || result.filters || [];
        const minFrequency = config?.minFrequency || 0;
        const applyFilters = config?.applyFilters !== false; // По умолчанию true
        
        // Применяем фильтры на лету (как редактор)
        const filteredQueries = applyFilters 
          ? applyFiltersToQueries(result.queries, filterIds, allFilters, minFrequency)
          : result.queries.filter(q => (q.count || 0) >= minFrequency);
        
        // Показываем только если есть результаты после фильтрации
        if (filteredQueries.length > 0) {
          const keywords = filteredQueries.map(q => q.query);
          const keywordsWithCount = filteredQueries.map(q => ({ 
            query: q.query, 
            count: q.count || 0 
          }));
          
          clusterInfo.subclusters.push({
            id: type.id,
            name: type.name,
            keywords,
            keywordsWithCount,
            keywordCount: keywords.length,
            isFiltered: applyFilters && filterIds.length > 0
          });
        }
      }
    }
    
    // Добавляем кластер
    clusters.push(clusterInfo);
  }
  
  return clusters;
}

// GET - получить список кластеров и подкластеров
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clusterId = searchParams.get('clusterId');
    const clusterName = searchParams.get('cluster');
    const subclusterId = searchParams.get('subclusterId');
    const subclusterName = searchParams.get('subcluster');
    
    const allClusters = getAllClustersWithSubclusters();
    
    // Если указан конкретный подкластер
    if ((clusterId || clusterName) && (subclusterId || subclusterName)) {
      const cluster = allClusters.find(c => 
        c.id === clusterId || c.name === clusterName
      );
      if (!cluster) {
        return NextResponse.json({ 
          success: false, 
          error: `Кластер не найден` 
        }, { status: 404 });
      }
      
      const subcluster = cluster.subclusters.find(s => 
        s.id === subclusterId || s.name === subclusterName
      );
      if (!subcluster) {
        return NextResponse.json({ 
          success: false, 
          error: `Подкластер не найден` 
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        success: true, 
        subcluster
      });
    }
    
    // Если указан только кластер
    if (clusterId || clusterName) {
      const cluster = allClusters.find(c => 
        c.id === clusterId || c.name === clusterName
      );
      if (!cluster) {
        return NextResponse.json({ 
          success: false, 
          error: `Кластер не найден` 
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        success: true, 
        cluster: {
          id: cluster.id,
          name: cluster.name,
          subclusters: cluster.subclusters.map(s => ({
            id: s.id,
            name: s.name,
            keywordCount: s.keywordCount,
            isFiltered: s.isFiltered
          }))
        }
      });
    }
    
    // Возвращаем все кластеры
    return NextResponse.json({ 
      success: true, 
      clusters: allClusters.map(c => ({
        id: c.id,
        name: c.name,
        subclusterCount: c.subclusters.length,
        totalKeywords: c.subclusters.reduce((sum, s) => sum + s.keywordCount, 0),
        subclusters: c.subclusters.map(s => ({
          id: s.id,
          name: s.name,
          keywords: s.keywords,
          keywordsWithCount: s.keywordsWithCount, // Добавляем ключевые слова с частотностью
          keywordCount: s.keywordCount,
          isFiltered: s.isFiltered
        }))
      }))
    });
  } catch (error) {
    console.error('Error reading subclusters:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to read subclusters' 
    }, { status: 500 });
  }
}

// POST - загрузить подкластеры как группы в Topvisor
export async function POST(request: Request) {
  try {
    const { projectId, clusterId, clusterName, subclusterIds, subclusterNames, createAsGroups, customKeywords } = await request.json();
    
    if (!projectId) {
      return NextResponse.json({ 
        success: false, 
        error: 'projectId required' 
      }, { status: 400 });
    }
    
    const allClusters = getAllClustersWithSubclusters();
    
    // Находим нужный кластер
    const cluster = allClusters.find(c => 
      c.id === clusterId || c.name === clusterName
    );
    
    if (!cluster) {
      return NextResponse.json({ 
        success: false, 
        error: 'Кластер не найден' 
      }, { status: 400 });
    }
    
    // Собираем подкластеры для загрузки
    let subclustersToUpload: Subcluster[] = [];
    
    if (subclusterIds && Array.isArray(subclusterIds)) {
      // По ID
      subclustersToUpload = cluster.subclusters.filter(s => 
        subclusterIds.includes(s.id)
      );
    } else if (subclusterNames && Array.isArray(subclusterNames)) {
      // По имени
      subclustersToUpload = cluster.subclusters.filter(s => 
        subclusterNames.includes(s.name)
      );
    } else {
      // Все подкластеры из кластера
      subclustersToUpload = cluster.subclusters;
    }
    
    if (subclustersToUpload.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Нет подкластеров с данными. Сначала выполните фильтрацию.' 
      }, { status: 404 });
    }
    
    const results: { 
      id: string;
      name: string; 
      groupId?: number; 
      keywordsAdded: number; 
      isFiltered: boolean;
      error?: string 
    }[] = [];
    
    // Сначала получаем список существующих групп, чтобы не создавать дубликаты
    interface ExistingGroup {
      id: number;
      name: string;
      count_keywords?: number;
    }
    
    let existingGroups: ExistingGroup[] = [];
    
    try {
      interface GroupsResponse {
        result?: ExistingGroup[];
      }
      const groupsResponse = await topvisorRequest<GroupsResponse>('get/keywords_2/groups', {
        project_id: parseInt(projectId),
        fields: ['id', 'name', 'count_keywords'],
        limit: 10000
      });
      existingGroups = groupsResponse.result || [];
      console.log(`[subclusters] Found ${existingGroups.length} existing groups in project`);
    } catch (e) {
      console.error('[subclusters] Error fetching existing groups:', e);
    }
    
    for (const subcluster of subclustersToUpload) {
      try {
        let groupId: number | undefined;
        
        if (createAsGroups !== false) {
          // Проверяем, существует ли уже группа с таким именем
          const existingGroup = existingGroups.find(g => g.name === subcluster.name);
          
          if (existingGroup) {
            // Используем существующую группу
            groupId = existingGroup.id;
            console.log(`[subclusters] Using existing group "${subcluster.name}" (id: ${groupId})`);
          } else {
            // Создаём новую группу
            interface GroupResponse {
              result?: Array<{ id: number }>;
            }
            const groupResponse = await topvisorRequest<GroupResponse>('add/keywords_2/groups', {
              project_id: parseInt(projectId),
              name: [subcluster.name],
            });
            
            groupId = groupResponse.result?.[0]?.id;
            console.log(`[subclusters] Created new group "${subcluster.name}" (id: ${groupId})`);
            
            // Добавляем в список существующих, чтобы следующие итерации могли найти её
            if (groupId) {
              existingGroups.push({ id: groupId, name: subcluster.name, count_keywords: 0 });
            }
          }
        }
        
        // Определяем какие ключевые слова использовать
        // Если переданы customKeywords для этого подкластера - используем их
        // Иначе используем все слова из подкластера
        const keywordsToUpload: string[] = customKeywords && customKeywords[subcluster.name] 
          ? customKeywords[subcluster.name] 
          : subcluster.keywords;
        
        // Добавляем ключевые слова через import (CSV формат)
        if (keywordsToUpload.length > 0) {
          interface ImportResponse {
            result?: { 
              countSended?: number;
              countAdded?: number;
              countDuplicated?: number;
            };
          }
          
          // Формируем CSV: первая строка - заголовок, остальные - ключевые слова
          const csvLines = ['name', ...keywordsToUpload];
          const csvData = csvLines.join('\n');
          
          const keywordsBody: Record<string, unknown> = {
            project_id: parseInt(projectId),
            keywords: csvData,
          };
          
          if (groupId) {
            keywordsBody.group_id = groupId;
          }
          
          const keywordsResponse = await topvisorRequest<ImportResponse>(
            'add/keywords_2/keywords/import', 
            keywordsBody
          );
          
          results.push({
            id: subcluster.id,
            name: subcluster.name,
            groupId,
            keywordsAdded: keywordsResponse.result?.countAdded || 0,
            isFiltered: subcluster.isFiltered
          });
        } else {
          results.push({
            id: subcluster.id,
            name: subcluster.name,
            groupId,
            keywordsAdded: 0,
            isFiltered: subcluster.isFiltered
          });
        }
      } catch (error) {
        results.push({
          id: subcluster.id,
          name: subcluster.name,
          keywordsAdded: 0,
          isFiltered: subcluster.isFiltered,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const totalAdded = results.reduce((sum, r) => sum + r.keywordsAdded, 0);
    const successCount = results.filter(r => !r.error).length;
    
    return NextResponse.json({ 
      success: true, 
      message: `Загружено ${totalAdded} ключевых слов в ${successCount} групп`,
      results,
      totalKeywordsAdded: totalAdded,
      groupsCreated: successCount
    });
  } catch (error) {
    console.error('Error uploading subclusters:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to upload subclusters' 
    }, { status: 500 });
  }
}
