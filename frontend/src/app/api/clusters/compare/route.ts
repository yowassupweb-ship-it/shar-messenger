import { NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile } from '@/lib/dataStore';

interface SubclusterResult {
  subclusterId: string;
  queries?: { query: string; count: number }[];
  filteredQueries?: { query: string; count: number }[];
  totalImpressions?: number;
}

interface SubclusterResultsData {
  subclusterResults: SubclusterResult[];
}

interface CompareResult {
  subcluster1: string;
  subcluster2: string;
  intersections: { query: string; count1: number; count2: number }[];
  uniqueIn1: number;
  uniqueIn2: number;
}

// GET - сравнить два подкластера
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id1 = searchParams.get('id1');
    const id2 = searchParams.get('id2');
    
    if (!id1 || !id2) {
      return NextResponse.json({ error: 'Both id1 and id2 are required' }, { status: 400 });
    }
    
    const data = readJsonFile<SubclusterResultsData>('subcluster-results.json', { subclusterResults: [] });
    
    const result1 = data.subclusterResults.find(r => r.subclusterId === id1);
    const result2 = data.subclusterResults.find(r => r.subclusterId === id2);
    
    // Если хотя бы одного подкластера нет или нет filteredQueries - возвращаем пустой результат
    if (!result1 || !result2 || !result1.filteredQueries || !result2.filteredQueries) {
      const emptyResult: CompareResult = {
        subcluster1: id1,
        subcluster2: id2,
        intersections: [],
        uniqueIn1: result1?.filteredQueries?.length || 0,
        uniqueIn2: result2?.filteredQueries?.length || 0,
      };
      return NextResponse.json(emptyResult);
    }
    
    // Используем ТОЛЬКО filteredQueries (отфильтрованные запросы)
    const queries1 = result1.filteredQueries;
    const queries2 = result2.filteredQueries;
    
    // Создаём Map для быстрого поиска
    const queryMap2 = new Map(queries2.map(q => [q.query.toLowerCase(), q]));
    
    // Находим пересечения
    const intersections: { query: string; count1: number; count2: number }[] = [];
    
    for (const q1 of queries1) {
      const q2 = queryMap2.get(q1.query.toLowerCase());
      if (q2) {
        intersections.push({
          query: q1.query,
          count1: q1.count,
          count2: q2.count
        });
      }
    }
    
    // Сортируем по суммарной частотности
    intersections.sort((a, b) => (b.count1 + b.count2) - (a.count1 + a.count2));
    
    const compareResult: CompareResult = {
      subcluster1: id1,
      subcluster2: id2,
      intersections,
      uniqueIn1: queries1.length - intersections.length,
      uniqueIn2: queries2.length - intersections.length,
    };
    
    return NextResponse.json(compareResult);
  } catch (error) {
    console.error('Error comparing subclusters:', error);
    return NextResponse.json({ error: 'Failed to compare' }, { status: 500 });
  }
}

// POST - удалить пересечения из одного подкластера в пользу другого
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceId, targetId, queries } = body;
    
    if (!sourceId || !targetId || !queries || !Array.isArray(queries)) {
      return NextResponse.json({ error: 'sourceId, targetId and queries array are required' }, { status: 400 });
    }
    
    const data = readJsonFile<SubclusterResultsData>('subcluster-results.json', { subclusterResults: [] });
    
    const sourceIndex = data.subclusterResults.findIndex(r => r.subclusterId === sourceId);
    
    if (sourceIndex === -1) {
      return NextResponse.json({ error: 'Source subcluster not found' }, { status: 404 });
    }
    
    const source = data.subclusterResults[sourceIndex];
    
    // Создаём Set для быстрой проверки
    const queriesToRemove = new Set(queries.map((q: string) => q.toLowerCase()));
    
    // Удаляем запросы из source
    const originalQueriesCount = source.queries?.length || 0;
    const originalFilteredCount = source.filteredQueries?.length || 0;
    
    if (source.queries) {
      source.queries = source.queries.filter(q => !queriesToRemove.has(q.query.toLowerCase()));
    }
    if (source.filteredQueries) {
      source.filteredQueries = source.filteredQueries.filter(q => !queriesToRemove.has(q.query.toLowerCase()));
    }
    
    // Пересчитываем totalImpressions
    if (source.filteredQueries) {
      source.totalImpressions = source.filteredQueries.reduce((sum, q) => sum + q.count, 0);
    } else if (source.queries) {
      source.totalImpressions = source.queries.reduce((sum, q) => sum + q.count, 0);
    }
    
    data.subclusterResults[sourceIndex] = source;
    writeJsonFile('subcluster-results.json', data);
    
    return NextResponse.json({
      success: true,
      removed: queries.length,
      sourceId,
      targetId,
      newQueriesCount: source.queries?.length || 0,
      newFilteredCount: source.filteredQueries?.length || 0,
      originalQueriesCount,
      originalFilteredCount
    });
  } catch (error) {
    console.error('Error removing intersections:', error);
    return NextResponse.json({ error: 'Failed to remove intersections' }, { status: 500 });
  }
}
