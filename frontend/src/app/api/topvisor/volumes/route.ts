import { NextResponse } from 'next/server';
import { topvisorRequest } from '@/lib/topvisor';

interface KeywordWithVolume {
  id: number;
  name: string;
  [key: string]: unknown;
}

interface TopvisorKeywordsResponse {
  result?: KeywordWithVolume[];
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
      key: number;
      name: string;
    }>;
  }>;
}

interface ProjectsResponse {
  result?: ProjectWithRegions[];
}

// Get search volumes for keywords
// Сначала определяем регион проекта, потом запрашиваем частоту
export async function POST(request: Request) {
  try {
    const { projectId, keywordIds } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    // Сначала получаем регионы проекта
    const projectData = await topvisorRequest<ProjectsResponse>('get/projects_2/projects', {
      fields: ['id', 'name'],
      show_searchers_and_regions: 1,
      filters: [{
        name: 'id',
        operator: 'EQUALS',
        values: [parseInt(projectId)]
      }]
    });

    let regionKey = 213; // По умолчанию Москва
    
    if (projectData.result && projectData.result.length > 0) {
      const project = projectData.result[0];
      console.log('[Volumes] Project searchers:', JSON.stringify(project.searchers));
      
      if (project.searchers && project.searchers.length > 0) {
        // Ищем Яндекс (searcher_key = 0)
        const yandexSearcher = project.searchers.find(s => s.searcher_key === 0);
        if (yandexSearcher && yandexSearcher.regions && yandexSearcher.regions.length > 0) {
          regionKey = yandexSearcher.regions[0].key || yandexSearcher.regions[0].id;
          console.log('[Volumes] Found region key:', regionKey);
        }
      }
    }

    // Пробуем разные типы частоты
    const volumeFields = [
      `volume:0:${regionKey}:1`,  // Базовая частота Ч
      `volume:0:${regionKey}:2`,  // Точная "Ч"
    ];

    const body: Record<string, unknown> = {
      project_id: parseInt(projectId),
      fields: ['id', 'name', ...volumeFields],
      limit: 1000,
      offset: 0
    };

    if (keywordIds && Array.isArray(keywordIds) && keywordIds.length > 0) {
      body.filters = [{
        name: 'id',
        operator: 'IN',
        values: keywordIds
      }];
    }

    console.log('[Volumes] Request with regionKey', regionKey, ':', JSON.stringify(body));

    const data = await topvisorRequest<TopvisorKeywordsResponse>('get/keywords_2/keywords', body);
    
    console.log('[Volumes] Response count:', data.result?.length || 0);
    if (data.result && data.result.length > 0) {
      console.log('[Volumes] First item:', JSON.stringify(data.result[0]));
    }

    // Преобразуем в удобный формат
    const volumes: Record<number, number> = {};
    
    if (data.result && Array.isArray(data.result)) {
      data.result.forEach((kw) => {
        let vol: number | null = null;
        
        for (const field of volumeFields) {
          const value = kw[field];
          if (value !== undefined && value !== null && typeof value === 'number') {
            vol = value;
            break;
          }
        }
        
        if (vol !== null) {
          volumes[kw.id] = vol;
        }
      });
    }

    console.log('[Volumes] Parsed volumes:', Object.keys(volumes).length, 'keywords');

    return NextResponse.json({ 
      success: true, 
      volumes
    });
  } catch (error) {
    console.error('Topvisor volumes error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get volumes' 
    }, { status: 400 });
  }
}
