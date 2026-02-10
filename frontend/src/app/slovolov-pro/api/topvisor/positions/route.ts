import { NextResponse } from 'next/server';
import { topvisorRequest } from '@/lib/topvisor';
import { getPositionsCache, setPositionsCache } from '@/lib/positions-cache';
import { updateKeywordsUrls, getProjectUrlHistory } from '@/lib/url-history';

interface TopvisorPositionsResponse {
  result?: {
    keywords?: Array<{
      id: number;
      name: string;
      group_name?: string;
      target?: string;
      positionsData?: Record<string, { position?: number; relevant_url?: string }>;
    }>;
    dates?: string[];
    existsDates?: string[];
  };
}

interface TopvisorSummaryResponse {
  result?: Record<string, unknown>;
}

interface ProjectWithRegions {
  id: number;
  name: string;
  searchers?: Array<{
    id: number;
    searcher_key: number;
    regions?: Array<{
      index: number;
      id: number;
      name: string;
    }>;
  }>;
}

interface ProjectsResponse {
  result?: ProjectWithRegions[];
}

// Получить первый доступный регион проекта
async function getFirstRegionIndex(projectId: number): Promise<number | null> {
  try {
    const data = await topvisorRequest<ProjectsResponse>('get/projects_2/projects', {
      fields: ['id', 'name'],
      show_searchers_and_regions: 1,
      filters: [{
        name: 'id',
        operator: 'EQUALS',
        values: [projectId]
      }]
    });
    
    if (data.result && data.result.length > 0) {
      const project = data.result[0];
      if (project.searchers && project.searchers.length > 0) {
        const firstSearcher = project.searchers[0];
        if (firstSearcher.regions && firstSearcher.regions.length > 0) {
          console.log('[Positions] Found region index:', firstSearcher.regions[0].index);
          return firstSearcher.regions[0].index;
        }
      }
      
      // Если регионов нет - добавляем Яндекс + Москва
      console.log('[Positions] No regions found, adding Yandex + Moscow...');
      
      // Добавляем поисковую систему Яндекс (key=0)
      const searcherResult = await topvisorRequest('add/positions_2/searchers', {
        project_id: projectId,
        searcher_key: 0 // Yandex
      });
      console.log('[Positions] Searcher add result:', JSON.stringify(searcherResult));
      
      // Добавляем регион Москва (id=213 для Яндекса)
      const regionResult = await topvisorRequest('add/positions_2/searchers_regions', {
        project_id: projectId,
        searcher_key: 0,
        region_key: 213, // Moscow
        lang: 'ru',
        device: 0,
        depth: 100
      });
      console.log('[Positions] Region add result:', JSON.stringify(regionResult));
      
      // Повторно запрашиваем проект чтобы получить index региона
      const updatedData = await topvisorRequest<ProjectsResponse>('get/projects_2/projects', {
        fields: ['id', 'name'],
        show_searchers_and_regions: 1,
        filters: [{
          name: 'id',
          operator: 'EQUALS',
          values: [projectId]
        }]
      });
      
      if (updatedData.result && updatedData.result.length > 0) {
        const updatedProject = updatedData.result[0];
        if (updatedProject.searchers && updatedProject.searchers.length > 0) {
          const firstSearcher = updatedProject.searchers[0];
          if (firstSearcher.regions && firstSearcher.regions.length > 0) {
            console.log('[Positions] After creation, found region index:', firstSearcher.regions[0].index);
            return firstSearcher.regions[0].index;
          }
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting/creating region index:', error);
    return null;
  }
}

// Get positions history
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const regionIndex = searchParams.get('regionIndex');
    const date1 = searchParams.get('date1');
    const date2 = searchParams.get('date2');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    // Получаем реальный индекс региона
    let regIndex: number;
    if (regionIndex) {
      regIndex = parseInt(regionIndex);
    } else {
      const firstIndex = await getFirstRegionIndex(parseInt(projectId));
      if (firstIndex === null) {
        return NextResponse.json({ 
          success: false, 
          error: 'No regions found in project. Add search engines and regions first in Topvisor.' 
        }, { status: 400 });
      }
      regIndex = firstIndex;
    }

    // Get last check dates if not provided
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const body: Record<string, unknown> = {
      project_id: parseInt(projectId),
      regions_indexes: [regIndex],
      date1: date1 || weekAgo.toISOString().split('T')[0],
      date2: date2 || today.toISOString().split('T')[0],
      type_range: 2, // период (все даты)
      show_exists_dates: 1,
      fields: ['id', 'name', 'group_name', 'target'],
      positions_fields: ['position', 'relevant_url'],
      limit: 500
    };

    const data = await topvisorRequest<TopvisorPositionsResponse>('get/positions_2/history', body);
    
    return NextResponse.json({ 
      success: true, 
      keywords: data.result?.keywords || [],
      dates: data.result?.dates || [],
      existsDates: data.result?.existsDates || []
    });
  } catch (error) {
    console.error('Topvisor positions error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get positions' 
    }, { status: 400 });
  }
}

// Get summary positions (aggregated) or positions for specific keywords
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, regionIndex, date1, date2, dateFrom, dateTo, keywordIds, forceRefresh } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    // Получаем историю URL для проекта
    const urlHistory = await getProjectUrlHistory(parseInt(projectId));

    // Проверяем кэш если не требуется принудительное обновление
    if (!forceRefresh && keywordIds && Array.isArray(keywordIds) && keywordIds.length > 0) {
      const cached = await getPositionsCache(parseInt(projectId));
      if (cached) {
        // Проверяем что кэш содержит все нужные ключи
        const cachedKeywordIds = new Set(cached.keywords);
        const allKeywordsCached = keywordIds.every((id: number) => cachedKeywordIds.has(id));
        
        if (allKeywordsCached) {
          console.log('[Positions] Using cached data from:', cached.lastUpdated);
          
          // Формируем urlChanges из истории (без флага changed, т.к. кэш)
          const urlChanges: Record<number, { changed: boolean; history: Array<{ date: string; url: string }> }> = {};
          keywordIds.forEach((id: number) => {
            const history = urlHistory[id.toString()];
            if (history) {
              urlChanges[id] = { changed: false, history: history.history };
            }
          });
          
          return NextResponse.json({ 
            success: true, 
            positions: cached.positions,
            dates: [],
            cached: true,
            lastUpdated: cached.lastUpdated,
            urlChanges
          });
        }
      }
    }

    // Получаем реальный индекс региона
    let regIndex: number;
    if (regionIndex !== undefined && regionIndex !== null) {
      regIndex = parseInt(regionIndex);
    } else {
      const firstIndex = await getFirstRegionIndex(parseInt(projectId));
      if (firstIndex === null) {
        return NextResponse.json({ 
          success: false, 
          error: 'No regions found in project. Add search engines and regions first in Topvisor.' 
        }, { status: 400 });
      }
      regIndex = firstIndex;
    }

    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Используем dateFrom/dateTo или date1/date2
    const startDate = dateFrom || date1 || weekAgo.toISOString().split('T')[0];
    const endDate = dateTo || date2 || today.toISOString().split('T')[0];

    // Если указаны keywordIds - получаем позиции для этих ключевых слов
    if (keywordIds && Array.isArray(keywordIds) && keywordIds.length > 0) {
      const requestBody: Record<string, unknown> = {
        project_id: parseInt(projectId),
        regions_indexes: [regIndex],
        date1: startDate,
        date2: endDate,
        type_range: 2, // период (все даты)
        show_exists_dates: 1,
        fields: ['id', 'name', 'group_name', 'target'],
        positions_fields: ['position', 'relevant_url'],
        filters: [{
          name: 'id',
          operator: 'IN',
          values: keywordIds
        }],
        limit: keywordIds.length
      };

      const data = await topvisorRequest<TopvisorPositionsResponse>('get/positions_2/history', requestBody);
      
      // Логируем реальный формат данных
      console.log('[Positions] Raw response:', JSON.stringify(data.result).slice(0, 2000));
      console.log('[Positions] Keywords count:', data.result?.keywords?.length);
      console.log('[Positions] ExistsDates:', data.result?.existsDates);
      if (data.result?.keywords?.[0]) {
        console.log('[Positions] First keyword FULL:', JSON.stringify(data.result.keywords[0]));
      }
      
      // Преобразуем формат данных для страницы
      const positions: Array<{ 
        keyword_id: number; 
        date: string; 
        position: number | null;
        relevant_url?: string;
      }> = [];
      
      if (data.result?.keywords) {
        data.result.keywords.forEach((kw: any) => {
          const positionsData = kw.positionsData;
          
          if (positionsData && typeof positionsData === 'object') {
            // Формат ключа: "2025-12-05:25882986:1" (дата:projectId:regionIndex)
            Object.entries(positionsData).forEach(([key, value]: [string, any]) => {
              const datePart = key.split(':')[0];
              
              if (typeof value === 'object' && value !== null && 'position' in value) {
                const positionValue = value.position;
                const position = positionValue !== null && positionValue !== undefined && positionValue !== ''
                  ? parseInt(String(positionValue), 10)
                  : null;
                
                positions.push({
                  keyword_id: kw.id,
                  date: datePart,
                  position: isNaN(position as number) ? null : position,
                  relevant_url: value.relevant_url || ''
                });
              }
            });
          }
        });
      }
      
      console.log('[Positions] Parsed positions count:', positions.length);
      console.log('[Positions] Sample positions:', JSON.stringify(positions.slice(0, 2)));
      
      // Собираем последние URL для каждого ключевого слова
      const keywordsWithUrls: Array<{ id: number; url: string | null }> = [];
      const latestUrlByKeyword: Record<number, string> = {};
      
      // Сортируем по дате чтобы взять последний URL
      const sortedPositions = [...positions].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      for (const pos of sortedPositions) {
        if (!latestUrlByKeyword[pos.keyword_id] && pos.relevant_url) {
          latestUrlByKeyword[pos.keyword_id] = pos.relevant_url;
        }
      }
      
      keywordIds.forEach((id: number) => {
        keywordsWithUrls.push({ id, url: latestUrlByKeyword[id] || null });
      });
      
      // Обновляем историю URL и получаем изменения
      const urlChanges = await updateKeywordsUrls(parseInt(projectId), keywordsWithUrls);
      console.log('[Positions] URL changes detected:', 
        Object.values(urlChanges).filter(c => c.changed).length
      );
      
      // Сохраняем в кэш
      await setPositionsCache(parseInt(projectId), positions, keywordIds);
      console.log('[Positions] Cached positions for project:', projectId);
      
      return NextResponse.json({ 
        success: true, 
        positions,
        dates: data.result?.dates || [],
        cached: false,
        urlChanges
      });
    }

    // Иначе получаем summary
    const summaryBody: Record<string, unknown> = {
      project_id: parseInt(projectId),
      regions_indexes: [regIndex],
      date1: startDate,
      date2: endDate,
      type_range: 2, // период (все даты)
      show_tops: 1,
      show_avg: 1,
      show_visibility: 1,
    };
    
    const data = await topvisorRequest<TopvisorSummaryResponse>('get/positions_2/summary', summaryBody);
    
    return NextResponse.json({ 
      success: true, 
      summary: data.result || {}
    });
  } catch (error) {
    console.error('Topvisor positions summary error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get positions summary' 
    }, { status: 400 });
  }
}
