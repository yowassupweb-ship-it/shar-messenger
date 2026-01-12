import { NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile } from '@/lib/dataStore';

interface QueryItem {
  query: string;
  count: number;
}

interface SubclusterResult {
  subclusterId: string;
  subclusterName?: string;
  clusterName?: string;
  queries?: QueryItem[];
  filteredQueries?: QueryItem[];
  totalImpressions?: number;
}

interface SubclusterResultsData {
  subclusterResults: SubclusterResult[];
}

interface IntersectionQuery {
  query: string;
  count1: number;
  count2: number;
  staysIn: 1 | 2; // В каком подкластере остаётся (1 или 2)
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
  removeFrom1: number; // Сколько удалить из 1-го
  removeFrom2: number; // Сколько удалить из 2-го
}

interface SavedIntersections {
  lastUpdated: string;
  pairs: IntersectionPair[];
}

// Определяем где запрос остаётся: в подкластере с большей частотностью
// При равной частотности - в первом по алфавиту
function determineStaysIn(count1: number, count2: number, name1: string, name2: string): 1 | 2 {
  if (count1 > count2) return 1;
  if (count2 > count1) return 2;
  // Равная частотность - по алфавиту
  return name1.localeCompare(name2, 'ru') <= 0 ? 1 : 2;
}

// GET - вычислить все пересечения
export async function GET() {
  try {
    const data = readJsonFile<SubclusterResultsData>('subcluster-results.json', { subclusterResults: [] });
    
    // Фильтруем только подкластеры с filteredQueries
    const subclustersWithData = data.subclusterResults.filter(r => r.filteredQueries && r.filteredQueries.length > 0);
    
    const pairs: IntersectionPair[] = [];
    
    // Сравниваем все пары
    for (let i = 0; i < subclustersWithData.length; i++) {
      for (let j = i + 1; j < subclustersWithData.length; j++) {
        const sub1 = subclustersWithData[i];
        const sub2 = subclustersWithData[j];
        
        const queries1 = sub1.filteredQueries!;
        const queries2 = sub2.filteredQueries!;
        
        const name1 = sub1.subclusterName || sub1.subclusterId.split('/').pop() || sub1.subclusterId;
        const name2 = sub2.subclusterName || sub2.subclusterId.split('/').pop() || sub2.subclusterId;
        
        // Создаём Map для быстрого поиска с частотностью
        const queryMap2 = new Map(queries2.map(q => [q.query.toLowerCase(), q]));
        
        // Находим пересечения с информацией о частотности
        const intersections: IntersectionQuery[] = [];
        let removeFrom1 = 0;
        let removeFrom2 = 0;
        
        for (const q1 of queries1) {
          const q2 = queryMap2.get(q1.query.toLowerCase());
          if (q2) {
            const staysIn = determineStaysIn(q1.count, q2.count, name1, name2);
            intersections.push({
              query: q1.query,
              count1: q1.count,
              count2: q2.count,
              staysIn
            });
            
            if (staysIn === 1) {
              removeFrom2++;
            } else {
              removeFrom1++;
            }
          }
        }
        
        // Добавляем пару только если есть пересечения
        if (intersections.length > 0) {
          // Сортируем пересечения по суммарной частотности
          intersections.sort((a, b) => (b.count1 + b.count2) - (a.count1 + a.count2));
          
          pairs.push({
            id1: sub1.subclusterId,
            id2: sub2.subclusterId,
            name1,
            name2,
            cluster1: sub1.clusterName || sub1.subclusterId.split('/')[0] || '',
            cluster2: sub2.clusterName || sub2.subclusterId.split('/')[0] || '',
            count1: queries1.length,
            count2: queries2.length,
            intersection: intersections,
            intersectionCount: intersections.length,
            removeFrom1,
            removeFrom2
          });
        }
      }
    }
    
    // Сортируем по количеству пересечений (больше - выше)
    pairs.sort((a, b) => b.intersectionCount - a.intersectionCount);
    
    // Сохраняем результат
    const savedData: SavedIntersections = {
      lastUpdated: new Date().toISOString(),
      pairs
    };
    writeJsonFile('intersections-cache.json', savedData);
    
    return NextResponse.json(savedData);
  } catch (error) {
    console.error('Error comparing all subclusters:', error);
    return NextResponse.json({ error: 'Failed to compare' }, { status: 500 });
  }
}

// POST - получить сохраненные результаты (если есть)
export async function POST() {
  try {
    const cached = readJsonFile<SavedIntersections>('intersections-cache.json', { lastUpdated: '', pairs: [] });
    
    if (cached.pairs.length > 0) {
      return NextResponse.json(cached);
    }
    
    return NextResponse.json({ lastUpdated: '', pairs: [] });
  } catch (error) {
    return NextResponse.json({ lastUpdated: '', pairs: [] });
  }
}
