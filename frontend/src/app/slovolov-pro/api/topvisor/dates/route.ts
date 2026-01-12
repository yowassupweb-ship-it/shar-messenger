import { NextResponse } from 'next/server';
import { topvisorRequest } from '@/lib/topvisor';

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

interface DatesResponse {
  result?: string[];
}

// Получить доступные даты съёмов позиций
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    // Сначала получаем регион
    const projectData = await topvisorRequest<ProjectsResponse>('get/projects_2/projects', {
      fields: ['id', 'name'],
      show_searchers_and_regions: 1,
      filters: [{
        name: 'id',
        operator: 'EQUALS',
        values: [parseInt(projectId)]
      }]
    });

    let regionIndex = 1;
    if (projectData.result && projectData.result.length > 0) {
      const project = projectData.result[0];
      if (project.searchers && project.searchers.length > 0) {
        const firstSearcher = project.searchers[0];
        if (firstSearcher.regions && firstSearcher.regions.length > 0) {
          regionIndex = firstSearcher.regions[0].index;
        }
      }
    }

    console.log('[Dates] Using region index:', regionIndex);

    // Получаем доступные даты
    const datesData = await topvisorRequest<DatesResponse>('get/positions_2/dates', {
      project_id: parseInt(projectId),
      regions_indexes: [regionIndex]
    });

    console.log('[Dates] Available dates:', JSON.stringify(datesData));

    return NextResponse.json({ 
      success: true, 
      dates: datesData.result || [],
      regionIndex
    });
  } catch (error) {
    console.error('Error getting dates:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get dates' 
    }, { status: 400 });
  }
}
