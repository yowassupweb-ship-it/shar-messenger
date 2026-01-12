import { NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile, generateId } from '@/lib/dataStore';

const SLOVOLOV_API = 'https://slovolov.vercel.app/api/yandex-wordstat/top-requests';
const AUTH_HEADER = 'Basic YWRtaW46dnN0cmF2ZWw5OTU=';

interface SubclusterConfig {
  subclusterId: string;
  models: string[];
  filters: string[];
}

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
}

interface HistoryData {
  history: any[];
}

interface ModelsData {
  models: Array<{ id: string; content: string }>;
}

interface FiltersData {
  filters: Array<{ id: string; items: string[] }>;
}

interface SubclusterResultsData {
  subclusterResults: SubclusterResult[];
}

// Сохранение в историю
function saveToHistory(entry: { type: string; description: string; details?: string }) {
  try {
    const data = readJsonFile<HistoryData>('history.json', { history: [] });
    
    data.history.unshift({
      id: generateId(),
      timestamp: Date.now(),
      type: entry.type,
      description: entry.description,
      details: entry.details,
    });
    
    if (data.history.length > 1000) {
      data.history = data.history.slice(0, 1000);
    }
    
    writeJsonFile('history.json', data);
  } catch (error) {
    console.error('Failed to save history:', error);
  }
}

// Загрузка модели поиска
function loadModel(modelId: string): string | null {
  try {
    const data = readJsonFile<ModelsData>('models.json', { models: [] });
    const model = data.models.find(m => m.id === modelId);
    
    if (model) {
      console.log(`[loadModel] Loaded model ${modelId}, content length: ${model.content.length}`);
      return model.content.trim();
    }
    
    console.log(`[loadModel] Model not found: ${modelId}`);
    return null;
  } catch (error) {
    console.error(`[loadModel] Error loading model ${modelId}:`, error);
    return null;
  }
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

// Поиск запросов через API
async function searchQueries(query: string, numPhrases: number = 200): Promise<SearchResult[]> {
  try {
    const response = await fetch(SLOVOLOV_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AUTH_HEADER,
      },
      body: JSON.stringify({
        phrase: query,
        numPhrases,
        regionId: 213,
      }),
    });

    if (!response.ok) {
      console.error(`API error for "${query}": ${response.status}`);
      return [];
    }

    const data = await response.json();
    // API может возвращать данные в поле phrase или query
    const results = (data.topRequests || []).map((item: { phrase?: string; query?: string; count: number }) => ({
      query: item.phrase || item.query || '',
      count: item.count,
    }));
    
    if (results.length === 0) {
      console.warn(`[searchQueries] No results for "${query}". Response data:`, JSON.stringify(data).substring(0, 200));
    }
    
    return results;
  } catch (error) {
    console.error(`Search error for "${query}":`, error);
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
    return true;
  } catch (error) {
    console.error('Error saving subcluster result:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { configs, clusters } = await request.json() as { 
      configs: SubclusterConfig[]; 
      clusters: { id: string; name: string; types: { id: string; name: string }[] }[] 
    };

    if (!configs || !Array.isArray(configs) || configs.length === 0) {
      return NextResponse.json({ error: 'No configs provided' }, { status: 400 });
    }

    const results: {
      subclusterId: string;
      subclusterName: string;
      status: 'success' | 'error' | 'skipped';
      queriesCount: number;
      filteredCount: number;
      totalImpressions: number;
      error?: string;
    }[] = [];

    for (const config of configs) {
      // Пропускаем если нет моделей
      if (!config.models || config.models.length === 0) {
        results.push({
          subclusterId: config.subclusterId,
          subclusterName: config.subclusterId,
          status: 'skipped',
          queriesCount: 0,
          filteredCount: 0,
          totalImpressions: 0,
          error: 'No models configured',
        });
        continue;
      }

      try {
        // Находим информацию о подкластере
        let clusterName = '';
        let subclusterName = '';
        let clusterId = '';
        
        for (const cluster of clusters) {
          const subcluster = cluster.types.find(t => t.id === config.subclusterId);
          if (subcluster) {
            clusterId = cluster.id;
            clusterName = cluster.name;
            subclusterName = subcluster.name;
            break;
          }
        }

        // Загружаем модели и делаем поиск
        const allQueries: SearchResult[] = [];
        const loadedModels: string[] = [];
        const missingModels: string[] = [];
        
        console.log(`[batch-update] Processing subcluster: ${config.subclusterId}`);
        console.log(`[batch-update] Models to load: ${config.models.join(', ')}`);
        
        for (const modelId of config.models) {
          const modelContent = loadModel(modelId);
          if (modelContent) {
            loadedModels.push(modelId);
            // Модель может содержать несколько запросов (по строкам)
            const searchTerms = modelContent.split('\n').map(s => s.trim()).filter(Boolean);
            console.log(`[batch-update] Model ${modelId} has ${searchTerms.length} search terms`);
            
            for (const term of searchTerms) {
              console.log(`[batch-update] Searching for: "${term}"`);
              const queries = await searchQueries(term, 200);
              console.log(`[batch-update] Got ${queries.length} results for "${term}"`);
              allQueries.push(...queries);
              
              // Небольшая пауза между запросами
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          } else {
            missingModels.push(modelId);
            console.warn(`[batch-update] Model not found: ${modelId}`);
          }
        }
        
        console.log(`[batch-update] Total queries: ${allQueries.length}, loaded models: ${loadedModels.length}, missing: ${missingModels.length}`);

        // Если все модели не найдены, пропускаем
        if (loadedModels.length === 0 && missingModels.length > 0) {
          results.push({
            subclusterId: config.subclusterId,
            subclusterName: subclusterName || config.subclusterId,
            status: 'error',
            queriesCount: 0,
            filteredCount: 0,
            totalImpressions: 0,
            error: `Модели не найдены: ${missingModels.join(', ')}`,
          });
          continue;
        }

        // Проверяем сырые запросы
        console.log(`[batch-update] Sample raw queries:`, allQueries.slice(0, 3));
        
        // Удаляем дубликаты по query
        const filteredBeforeDedupe = allQueries.filter(q => q && q.query && typeof q.query === 'string' && q.query.trim() !== '');
        console.log(`[batch-update] After basic filter: ${filteredBeforeDedupe.length}`);
        
        const uniqueQueries = Array.from(
          new Map(
            filteredBeforeDedupe.map(q => [q.query.toLowerCase(), q])
          ).values()
        );

        console.log(`[batch-update] Unique queries: ${uniqueQueries.length}`);

        // Загружаем фильтры и объединяем минус-слова
        const minusWords = new Set<string>();
        try {
          for (const filterId of config.filters) {
            console.log(`[batch-update] Loading filter: ${filterId}`);
            const words = loadFilter(filterId);
            console.log(`[batch-update] Filter ${filterId} loaded: ${words.length} words`);
            words.forEach(w => {
              if (w && typeof w === 'string') {
                minusWords.add(w);
              }
            });
          }
          console.log(`[batch-update] Total minus words: ${minusWords.size}`);
        } catch (filterError) {
          console.error(`[batch-update] Error loading filters:`, filterError);
          throw filterError;
        }

        // Фильтруем
        console.log(`[batch-update] Filtering queries...`);
        const filteredQueries = filterQueries(uniqueQueries, minusWords);
        const totalImpressions = filteredQueries.reduce((sum, q) => sum + q.count, 0);

        // Сохраняем результат
        const result: SubclusterResult = {
          subclusterId: config.subclusterId,
          subclusterName,
          clusterId,
          clusterName,
          models: config.models,
          filters: config.filters,
          queries: uniqueQueries,
          filteredQueries,
          totalImpressions,
          updatedAt: new Date().toISOString(),
        };

        saveSubclusterResult(result);

        results.push({
          subclusterId: config.subclusterId,
          subclusterName,
          status: 'success',
          queriesCount: uniqueQueries.length,
          filteredCount: filteredQueries.length,
          totalImpressions,
        });

      } catch (error) {
        console.error(`[batch-update] Error processing subcluster ${config.subclusterId}:`, error);
        if (error instanceof Error) {
          console.error(`[batch-update] Error stack:`, error.stack);
        }
        results.push({
          subclusterId: config.subclusterId,
          subclusterName: config.subclusterId,
          status: 'error',
          queriesCount: 0,
          filteredCount: 0,
          totalImpressions: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Сохраняем в историю
    const successCount = results.filter(r => r.status === 'success').length;
    const totalQueries = results.reduce((sum, r) => sum + r.queriesCount, 0);
    const totalFiltered = results.reduce((sum, r) => sum + r.filteredCount, 0);
    const subclusterNames = results.map(r => r.subclusterName).join(', ');
    
    saveToHistory({
      type: 'batch_update',
      description: `Массовое обновление ${results.length} подкластеров (${successCount} успешно)`,
      details: `Всего запросов: ${totalQueries}, после фильтрации: ${totalFiltered}. Подкластеры: ${subclusterNames}`,
    });

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });

  } catch (error) {
    console.error('Batch update error:', error);
    
    // Сохраняем ошибку в историю
    saveToHistory({
      type: 'batch_update',
      description: 'Ошибка массового обновления',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return NextResponse.json(
      { error: 'Batch update failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET - получить результаты подкластера
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subclusterId = searchParams.get('subclusterId');

    const data = readJsonFile<SubclusterResultsData>('subcluster-results.json', { subclusterResults: [] });

    if (!subclusterId) {
      // Вернуть все результаты
      return NextResponse.json(data.subclusterResults);
    }

    // Вернуть конкретный результат
    const result = data.subclusterResults.find(r => r.subclusterId === subclusterId);
    
    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Get results error:', error);
    return NextResponse.json(
      { error: 'Failed to get results', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
