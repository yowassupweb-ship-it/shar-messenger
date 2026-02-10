import { NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile, generateId } from '@/lib/dataStore';

const SLOVOLOV_API = 'https://slovolov.vercel.app/api/yandex-wordstat/top-requests';
const AUTH_HEADER = 'Basic YWRtaW46dnN0cmF2ZWw5OTU=';

interface HistoryData {
  history: Array<{ id: string; timestamp: number; type: string; description: string; details?: string }>;
}

interface ResultsData {
  results: any[];
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
    
    // Ограничиваем историю 1000 записями
    if (data.history.length > 1000) {
      data.history = data.history.slice(0, 1000);
    }
    
    writeJsonFile('history.json', data);
  } catch (error) {
    console.error('Failed to save history:', error);
  }
}

export async function POST(request: Request) {
  try {
    const { query, modelName, saveResults = true } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Разбиваем многострочный запрос на отдельные строки (1 строка = 1 запрос)
    const queries = query.split('\n').map((q: string) => q.trim()).filter((q: string) => q.length > 0);
    
    const allItems: Array<{ query: string; count: number }> = [];
    
    // Выполняем поиск по каждой строке с лимитом 2000 на каждую
    for (const singleQuery of queries) {
      try {
        const response = await fetch(SLOVOLOV_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': AUTH_HEADER,
          },
          body: JSON.stringify({
            phrase: singleQuery,
            numPhrases: 2000, // Максимум 2000 на каждый запрос
            regionId: 213, // Moscow
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const items = data.topRequests || [];
          items.forEach((item: { phrase?: string; query?: string; count: number }) => {
            allItems.push({
              query: item.phrase || item.query || '',
              count: item.count,
            });
          });
        }
        
        // Небольшая пауза между запросами
        if (queries.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (err) {
        console.error(`Search error for "${singleQuery}":`, err);
      }
    }

    // Удаляем дубликаты по query, оставляя с максимальным count
    const uniqueItems = Array.from(
      allItems.reduce((map, item) => {
        const key = item.query.toLowerCase();
        const existing = map.get(key);
        if (!existing || existing.count < item.count) {
          map.set(key, item);
        }
        return map;
      }, new Map<string, { query: string; count: number }>()).values()
    );

    // Сортируем по count (от большего к меньшему)
    uniqueItems.sort((a, b) => b.count - a.count);

    // НЕ ограничиваем количество результатов - отдаём все
    const finalItems = uniqueItems;
    
    // Сохраняем результаты
    let resultId: string | undefined;
    if (saveResults && finalItems.length > 0) {
      try {
        const resultsData = readJsonFile<ResultsData>('results.json', { results: [] });
        
        resultId = generateId();
        const resultData = {
          id: resultId,
          modelName: modelName || 'Manual search',
          query,
          createdAt: new Date().toISOString(),
          items: finalItems,
        };
        
        resultsData.results.push(resultData);
        writeJsonFile('results.json', resultsData);
        
        // Сохраняем в историю
        saveToHistory({
          type: 'search',
          description: `Поиск: ${modelName || query.split('\n')[0]}`,
          details: `${finalItems.length} запросов найдено`,
        });
      } catch (saveError) {
        console.error('Failed to save results:', saveError);
      }
    }
    
    const totalCount = finalItems.reduce((sum, item) => sum + item.count, 0);
    
    return NextResponse.json({
      query,
      count: finalItems.length,
      totalCount,
      results: finalItems,
      resultId,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
