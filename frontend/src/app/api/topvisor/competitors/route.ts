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
    const keywords = positionsData.result?.keywords || [];
    
    // Find actual last date from positionsData keys (more reliable than dates array)
    let actualLastDate: string | null = null;
    if (keywords.length > 0 && keywords[0].positionsData) {
      const allDates = new Set<string>();
      for (const key of Object.keys(keywords[0].positionsData)) {
        const parts = key.split(':');
        if (parts.length >= 1) {
          allDates.add(parts[0]);
        }
      }
      const sortedDates = Array.from(allDates).sort();
      actualLastDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
    }
    const lastDate = actualLastDate || (dates.length > 0 ? dates[dates.length - 1] : null);

    console.log('[Competitors] Dates from API:', dates, 'Actual last date from keys:', actualLastDate, 'Using lastDate:', lastDate, 'Keywords count:', keywords.length);

    // Log first keyword's positionsData keys to understand structure
    if (keywords.length > 0 && keywords[0].positionsData) {
      const firstKwKeys = Object.keys(keywords[0].positionsData);
      console.log('[Competitors] First keyword name:', keywords[0].name);
      console.log('[Competitors] First keyword ALL positionsData keys:', firstKwKeys);
      console.log('[Competitors] First keyword positionsData FULL:', JSON.stringify(keywords[0].positionsData));
      
      // Analyze key formats - look for our project ID
      const allIds = new Set<string>();
      for (const key of firstKwKeys) {
        const parts = key.split(':');
        if (parts.length >= 2) {
          allIds.add(parts[1]); // The ID part
        }
      }
      console.log('[Competitors] All unique IDs found in keys:', Array.from(allIds));
      console.log('[Competitors] Our project ID:', projectIdNum);
      console.log('[Competitors] Region index:', projectInfo.regionIndex);
      console.log('[Competitors] Competitor IDs:', enabledCompetitors.map(c => c.id));
    }

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

    // Initialize competitors from API response
    console.log('[Competitors] Initializing competitor stats for:', enabledCompetitors.map(c => ({
      id: c.id,
      name: c.name,
      url: c.url,
      domain: c.domain,
      site: c.site
    })));
    
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

    // Process each keyword for COMPETITORS only
    // Key format in Topvisor: "date:projectOrCompetitorId:regionIndex"
    // For our project: date:projectId:regionIndex
    // For competitors: date:competitorId:regionIndex
    
    // First, let's understand what IDs we're looking for
    const competitorIdSet = new Set(enabledCompetitors.map(c => c.id));
    console.log('[Competitors] Looking for competitor IDs:', Array.from(competitorIdSet));
    console.log('[Competitors] Our project ID:', projectIdNum);
    
    // Debug: analyze key structure in detail
    const foundEntityIds = new Map<string, number>(); // "type:id" -> count
    const dateStats = new Map<string, number>(); // date -> count of valid positions
    
    // Also track our project's positions in this combined response
    let ourTop3Combined = 0, ourTop10Combined = 0, ourTop30Combined = 0;
    const ourPositionsCombined: number[] = [];
    
    // First pass: count positions by date to understand data distribution
    let totalPositionsProcessed = 0;
    for (const kw of keywords) {
      if (!kw.positionsData) continue;
      for (const [key, data] of Object.entries(kw.positionsData)) {
        const parts = key.split(':');
        if (parts.length < 2) continue;
        const dateStr = parts[0];
        const pos = data.position;
        if (pos !== undefined && pos !== null && pos !== '--' && pos !== '‑‑') {
          dateStats.set(dateStr, (dateStats.get(dateStr) || 0) + 1);
          totalPositionsProcessed++;
        }
      }
    }
    console.log('[Competitors] Positions by date:', Array.from(dateStats.entries()).map(([d, c]) => `${d}:${c}`).join(', '));
    console.log('[Competitors] Total positions found:', totalPositionsProcessed, 'Using lastDate:', lastDate);
    
    // Second pass: collect actual stats
    for (const kw of keywords) {
      if (!kw.positionsData) continue;

      for (const [key, data] of Object.entries(kw.positionsData)) {
        const parts = key.split(':');
        if (parts.length < 2) continue;

        const dateStr = parts[0];
        
        // Only use last date for stats
        if (dateStr !== lastDate) continue;
        
        const pos = data.position;
        if (pos === undefined || pos === null || pos === '--' || pos === '‑‑') continue;
        
        const position = typeof pos === 'string' ? parseInt(pos) : pos;
        if (isNaN(position) || position <= 0) continue;

        // Key format:
        // - Our project: "date:regionIndex" (2 parts)
        // - Competitor: "date:competitorId:regionIndex" (3 parts)
        
        if (parts.length === 2) {
          // This is OUR project's position
          foundEntityIds.set('our:project', (foundEntityIds.get('our:project') || 0) + 1);
          ourPositionsCombined.push(position);
          if (position <= 3) ourTop3Combined++;
          if (position <= 10) ourTop10Combined++;
          if (position <= 30) ourTop30Combined++;
        } else if (parts.length >= 3) {
          // This is a competitor's position
          const competitorId = parseInt(parts[1]);
          foundEntityIds.set(`comp:${competitorId}`, (foundEntityIds.get(`comp:${competitorId}`) || 0) + 1);
          
          // Check if this is a known competitor
          if (competitorStats[competitorId]) {
            competitorStats[competitorId].positions.push(position);
            if (position <= 3) competitorStats[competitorId].top3_count++;
            if (position <= 10) competitorStats[competitorId].top10_count++;
            if (position <= 30) competitorStats[competitorId].top30_count++;
          }
        }
      }
    }
    
    // Log all found entity IDs vs what we expected
    console.log('[Competitors] All entity IDs found in data:', 
      Array.from(foundEntityIds.entries()).map(([id, count]) => `${id}=${count}`).join(', '));
    console.log('[Competitors] Expected competitor IDs:', Array.from(competitorIdSet));
    
    console.log('[Competitors] From combined response - our positions:', ourPositionsCombined.length, 
      'top3:', ourTop3Combined, 'top10:', ourTop10Combined, 'top30:', ourTop30Combined);

    // Use data from combined response if we got our positions there
    // Otherwise, make a separate request for our site
    let ourTop3 = ourTop3Combined;
    let ourTop10 = ourTop10Combined;
    let ourTop30 = ourTop30Combined;
    let ourPositions = ourPositionsCombined;
    
    // If we didn't get our positions from combined response, make separate request
    if (ourPositions.length === 0) {
      console.log('[Competitors] Our positions not in combined response, making separate request...');
      
      const ourSiteRequest = {
        project_id: projectIdNum,
        regions_indexes: [projectInfo.regionIndex],
        date1: lastDate,
        date2: lastDate,
        type_range: 1, // Только последняя дата
        show_exists_dates: 1,
        fields: ['id', 'name'],
        positions_fields: ['position'],
        limit: 1000
      };

      const ourSiteData = await topvisorRequest<TopvisorPositionsResponse>('get/positions_2/history', ourSiteRequest);
      const ourKeywords = ourSiteData.result?.keywords || [];
      
      for (const kw of ourKeywords) {
        if (!kw.positionsData) continue;
        
        // Our site keys can be "date:regionIndex" (2 parts) or "date:projectId:regionIndex" (3 parts)
        for (const [key, data] of Object.entries(kw.positionsData)) {
          const pos = data.position;
          if (pos === undefined || pos === null || pos === '--' || pos === '‑‑') continue;
          
          const position = typeof pos === 'string' ? parseInt(pos) : pos;
          if (isNaN(position) || position <= 0) continue;
          
          ourPositions.push(position);
          if (position <= 3) ourTop3++;
          if (position <= 10) ourTop10++;
          if (position <= 30) ourTop30++;
          break; // Only first position per keyword (avoid duplicates from different dates/regions)
        }
      }
      
      console.log('[Competitors] From separate request - our positions:', ourPositions.length,
        'top3:', ourTop3, 'top10:', ourTop10, 'top30:', ourTop30);
    }

    // Add our site to stats
    competitorStats[projectIdNum] = {
      id: projectIdNum,
      domain: projectInfo.site,
      name: 'Наш сайт',
      isOurSite: true,
      positions: ourPositions,
      top3_count: ourTop3,
      top10_count: ourTop10,
      top30_count: ourTop30,
      visibility: keywords.length > 0 ? (ourTop10 / keywords.length) * 100 : 0,
      avg_position: ourPositions.length > 0 ? ourPositions.reduce((a, b) => a + b, 0) / ourPositions.length : 0,
      keywords_count: keywords.length
    };

    console.log('[Competitors] Our site stats:', {
      domain: projectInfo.site,
      positions: ourPositions.length,
      top3: ourTop3,
      top10: ourTop10,
      top30: ourTop30,
      visibility: competitorStats[projectIdNum].visibility.toFixed(1)
    });

    // Calculate averages and visibility for competitors
    for (const stat of Object.values(competitorStats)) {
      if (!stat.isOurSite && stat.positions.length > 0) {
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

    // Debug info for client
    const debugInfo = {
      foundEntityIds: Array.from(foundEntityIds.entries()),
      expectedCompetitorIds: Array.from(competitorIdSet),
      lastDate,
      keywordsCount: keywords.length,
      totalPositionsProcessed,
      positionsByDate: Array.from(dateStats.entries()),
      sampleKey: keywords.length > 0 && keywords[0].positionsData 
        ? Object.keys(keywords[0].positionsData).slice(0, 5) 
        : []
    };

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
      projectSite: projectInfo.site,
      debug: debugInfo
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
