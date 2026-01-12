import { NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile } from '@/lib/dataStore';

interface SearchResult {
  query: string;
  count: number;
}

interface SubclusterResult {
  subclusterId: string;
  subclusterName: string;
  clusterId: string;
  clusterName: string;
  models: string[];
  filters: string[];
  queries: SearchResult[];
  filteredQueries: SearchResult[];
  totalImpressions: number;
  updatedAt: string;
  sourceResultId?: string;
}

interface FiltersData {
  filters: Array<{ id: string; items: string[] }>;
}

interface ResultsData {
  results: Array<{ id: string; items: SearchResult[] }>;
}

interface SubclusterResultsData {
  subclusterResults: SubclusterResult[];
}

// Загрузка фильтра (минус-слов)
function loadFilter(filterId: string): string[] {
  try {
    const data = readJsonFile<FiltersData>('filters.json', { filters: [] });
    const filter = data.filters.find(f => f.id === filterId);
    return filter ? filter.items.filter(item => item != null && item !== '' && !item.startsWith('#')).map(item => item.toLowerCase()) : [];
  } catch {
    return [];
  }
}

// Фильтрация запросов
function filterQueries(queries: SearchResult[], minusWords: Set<string>): SearchResult[] {
  if (minusWords.size === 0) return queries;
  
  const wordsArray = Array.from(minusWords).filter(w => w != null && w !== '');
  
  return queries.filter(item => {
    if (!item || !item.query) return false;
    const queryLower = item.query.toLowerCase();
    for (let i = 0; i < wordsArray.length; i++) {
      if (queryLower.includes(wordsArray[i])) {
        return false;
      }
    }
    return true;
  });
}

// Сохранение результата подкластера
function saveSubclusterResult(result: SubclusterResult) {
  try {
    const data = readJsonFile<SubclusterResultsData>('subcluster-results.json', { subclusterResults: [] });
    
    // Удаляем старый результат если есть
    const index = data.subclusterResults.findIndex(r => r.subclusterId === result.subclusterId);
    if (index !== -1) {
      data.subclusterResults[index] = result;
    } else {
      data.subclusterResults.push(result);
    }
    
    writeJsonFile('subcluster-results.json', data);
    console.log(`[sync-to-subcluster] Saved result for: ${result.subclusterId}`);
    return true;
  } catch (error) {
    console.error('Error saving subcluster result:', error);
    return false;
  }
}

/**
 * POST /api/sync-to-subcluster
 * 
 * Синхронизирует результаты поиска с подкластером.
 * Принимает:
 * - resultId: ID результата поиска (из папки Результаты)
 * - subclusterId: ID подкластера (например "Кластер 1 - Тип тура_На 1 день")
 * - subclusterName: Название подкластера
 * - clusterId: ID кластера
 * - clusterName: Название кластера
 * - models: массив ID моделей
 * - filters: массив ID фильтров
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resultId, subclusterId, subclusterName, clusterId, clusterName, models, filters } = body;

    console.log('[sync-to-subcluster] Request:', { resultId, subclusterId, subclusterName, models, filters });

    if (!resultId) {
      return NextResponse.json({ error: 'resultId is required' }, { status: 400 });
    }

    if (!subclusterId) {
      return NextResponse.json({ error: 'subclusterId is required' }, { status: 400 });
    }

    // Загружаем результат поиска
    const resultsData = readJsonFile<ResultsData>('results.json', { results: [] });
    const resultData = resultsData.results.find(r => r.id === resultId);
    
    if (!resultData) {
      console.log(`[sync-to-subcluster] Result not found: ${resultId}`);
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    const queries: SearchResult[] = resultData.items || [];

    console.log(`[sync-to-subcluster] Loaded ${queries.length} queries from result`);

    // Загружаем все фильтры и собираем минус-слова
    const allMinusWords = new Set<string>();
    
    if (filters && filters.length > 0) {
      for (const filterId of filters) {
        const words = loadFilter(filterId);
        words.forEach(w => allMinusWords.add(w));
      }
      console.log(`[sync-to-subcluster] Loaded ${allMinusWords.size} minus words from ${filters.length} filters`);
    }

    // Фильтруем запросы
    const filteredQueries = filterQueries(queries, allMinusWords);
    const totalImpressions = filteredQueries.reduce((sum, q) => sum + q.count, 0);

    console.log(`[sync-to-subcluster] After filtering: ${filteredQueries.length} queries, ${totalImpressions} impressions`);

    // Формируем результат для подкластера
    const subclusterResult: SubclusterResult = {
      subclusterId,
      subclusterName: subclusterName || subclusterId,
      clusterId: clusterId || '',
      clusterName: clusterName || '',
      models: models || [],
      filters: filters || [],
      queries,
      filteredQueries,
      totalImpressions,
      updatedAt: new Date().toISOString(),
      sourceResultId: resultId,
    };

    // Сохраняем
    const saved = saveSubclusterResult(subclusterResult);

    if (!saved) {
      return NextResponse.json({ error: 'Failed to save subcluster result' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      subclusterId,
      queriesCount: queries.length,
      filteredCount: filteredQueries.length,
      totalImpressions,
    });
  } catch (error) {
    console.error('[sync-to-subcluster] Error:', error);
    return NextResponse.json(
      { error: 'Sync failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
