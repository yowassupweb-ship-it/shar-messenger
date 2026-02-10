import { NextResponse } from 'next/server';
import { topvisorRequest } from '@/lib/topvisor';

interface PositionData {
  position?: number | string;
  relevant_url?: string;
}

interface KeywordWithPositions {
  id: number;
  name: string;
  group_id?: number;
  group_name?: string;
  positionsData?: Record<string, PositionData>;
}

interface TopvisorPositionsResponse {
  result?: {
    keywords?: KeywordWithPositions[];
    dates?: string[];
    existsDates?: string[];
    headers?: {
      projects?: Array<{
        id: number;
        name: string;
        site: string;
      }>;
    };
  };
}

interface CompetitorInfo {
  id: number;
  name: string;
  url?: string;
  domain?: string;
  site?: string;
  on: number; // 0 = enabled, -1 = disabled, -10 = deleted
}

interface TopvisorCompetitorsListResponse {
  result?: CompetitorInfo[];
}

interface ProjectWithRegions {
  id: number;
  name: string;
  site?: string;
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

// Get project info including region
async function getProjectInfo(projectId: number): Promise<{ regionIndex: number; site: string } | null> {
  try {
    const data = await topvisorRequest<ProjectsResponse>('get/projects_2/projects', {
      fields: ['id', 'name', 'site'],
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
          return { 
            regionIndex: firstSearcher.regions[0].index, 
            site: project.site || '' 
          };
        }
      }
    }
    return null;
  } catch (error) {
    console.error('[Competitors] Error getting project info:', error);
    return null;
  }
}

// Get list of competitors added to project
async function getProjectCompetitors(projectId: number): Promise<CompetitorInfo[]> {
  try {
    const data = await topvisorRequest<TopvisorCompetitorsListResponse>('get/projects_2/competitors', {
      project_id: projectId,
      only_enabled: 0,
      include_project: 1
    });
    console.log('[Competitors] Competitors list:', JSON.stringify(data.result || []).slice(0, 500));
    return data.result || [];
  } catch (error) {
    console.error('[Competitors] Error getting competitors list:', error);
    return [];
  }
}

// Main GET handler
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    const projectIdNum = parseInt(projectId);

    // Get project info
    const projectInfo = await getProjectInfo(projectIdNum);
    if (!projectInfo) {
      return NextResponse.json({ 
        success: false, 
        error: 'Не удалось получить информацию о проекте',
        competitors: []
      });
    }

    console.log('[Competitors] Project info:', projectInfo);

    // Get list of competitors
    const competitorsList = await getProjectCompetitors(projectIdNum);
    // on === 0 means enabled, on === -1 means disabled, on === -10 means deleted
    const enabledCompetitors = competitorsList.filter(c => c.on === 0);
    
    console.log('[Competitors] Found competitors:', competitorsList.length, 'enabled:', enabledCompetitors.length);
    
    if (enabledCompetitors.length === 0) {
      return NextResponse.json({ 
        success: true, 
        competitors: [],
        competitorsList: [],
        message: 'Конкуренты не добавлены в проект. Добавьте конкурентов в Топвизор → Проверка позиций → ⚙️ → Настройка конкурентов'
      });
    }

    // Get positions for project AND competitors
    // competitors_ids should contain competitor IDs (which are project IDs of competitor sites)
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const dateFrom = weekAgo.toISOString().split('T')[0];
    const dateTo = today.toISOString().split('T')[0];

    // Request positions with competitors
    const requestBody = {
      project_id: projectIdNum,
      regions_indexes: [projectInfo.regionIndex],
      date1: dateFrom,
      date2: dateTo,
      type_range: 3, // Две даты
      show_exists_dates: 1,
      show_headers: 1, // Important! To get project/competitor info
      fields: ['id', 'name'],
      positions_fields: ['position'],
      competitors_ids: enabledCompetitors.map(c => c.id),
      limit: 1000
    };

    console.log('[Competitors] Requesting positions with body:', JSON.stringify(requestBody));

    const positionsData = await topvisorRequest<TopvisorPositionsResponse>('get/positions_2/history', requestBody);

    console.log('[Competitors] Response result keys:', Object.keys(positionsData.result || {}));
    console.log('[Competitors] Headers:', JSON.stringify(positionsData.result?.headers || {}).slice(0, 500));
    
    const dates = positionsData.result?.existsDates || positionsData.result?.dates || [];
    const lastDate = dates.length > 0 ? dates[dates.length - 1] : null;
    const keywords = positionsData.result?.keywords || [];

    console.log('[Competitors] Dates:', dates, 'Keywords count:', keywords.length);

    // Parse positionsData keys to understand structure
    // Key format: "YYYY-MM-DD:projectId:regionIndex"
    // For our site: "2025-12-08:25882986:1"
    // For competitor: "2025-12-08:12345678:1" (competitor's project ID)
    
    // Build competitor stats based on positionsData
    interface CompetitorStat {
      id: number;
      domain: string;
      name: string;
      isOurSite: boolean;
      positions: number[];
      top3_count: number;
      top10_count: number;
      top30_count: number;
      visibility: number;
      avg_position: number;
      keywords_count: number;
    }

    const competitorStats: Record<number, CompetitorStat> = {};

    // Initialize our site
    competitorStats[projectIdNum] = {
      id: projectIdNum,
      domain: projectInfo.site,
      name: 'Наш сайт',
      isOurSite: true,
      positions: [],
      top3_count: 0,
      top10_count: 0,
      top30_count: 0,
      visibility: 0,
      avg_position: 0,
      keywords_count: keywords.length
    };

    // Initialize competitors
    for (const comp of enabledCompetitors) {
      competitorStats[comp.id] = {
        id: comp.id,
        domain: comp.url || comp.domain || comp.site || comp.name,
        name: comp.name,
        isOurSite: false,
        positions: [],
        top3_count: 0,
        top10_count: 0,
        top30_count: 0,
        visibility: 0,
        avg_position: 0,
        keywords_count: keywords.length
      };
    }

    // Process each keyword
    for (const kw of keywords) {
      if (!kw.positionsData) continue;

      // Check each key in positionsData
      for (const [key, data] of Object.entries(kw.positionsData)) {
        // Parse key: "date:projectId:regionIndex"
        const parts = key.split(':');
        if (parts.length < 2) continue;

        const dateStr = parts[0];
        const compProjectId = parseInt(parts[1]);

        // Only use last date for stats
        if (dateStr !== lastDate) continue;

        // Get position
        const pos = data.position;
        if (pos === undefined || pos === null || pos === '--' || pos === '‑‑') continue;
        
        const position = typeof pos === 'string' ? parseInt(pos) : pos;
        if (isNaN(position) || position <= 0) continue;

        // Update stats for this competitor/site
        if (competitorStats[compProjectId]) {
          competitorStats[compProjectId].positions.push(position);
          if (position <= 3) competitorStats[compProjectId].top3_count++;
          if (position <= 10) competitorStats[compProjectId].top10_count++;
          if (position <= 30) competitorStats[compProjectId].top30_count++;
        }
      }
    }

    // Calculate averages and visibility
    for (const stat of Object.values(competitorStats)) {
      if (stat.positions.length > 0) {
        stat.avg_position = stat.positions.reduce((a, b) => a + b, 0) / stat.positions.length;
        stat.visibility = (stat.top10_count / stat.keywords_count) * 100;
      }
    }

    // Sort by visibility
    const competitors = Object.values(competitorStats)
      .sort((a, b) => b.visibility - a.visibility);

    console.log('[Competitors] Final stats:', competitors.map(c => ({
      domain: c.domain,
      visibility: c.visibility.toFixed(1),
      top10: c.top10_count,
      positions: c.positions.length
    })));

    return NextResponse.json({ 
      success: true, 
      competitors,
      competitorsList: enabledCompetitors.map(c => ({
        id: c.id,
        name: c.name,
        domain: c.domain || c.site || c.name,
        enabled: c.on === 1
      })),
      dates,
      totalKeywords: keywords.length,
      projectSite: projectInfo.site
    });
  } catch (error) {
    console.error('[Competitors] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get competitors',
      competitors: []
    }, { status: 400 });
  }
}
