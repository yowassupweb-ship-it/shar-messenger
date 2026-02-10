import { NextResponse } from 'next/server';
import { topvisorRequest } from '@/lib/topvisor';

interface SerpResult {
  position: number;
  name: string;
  url: string;
  snippet?: string;
  domain?: string;
}

interface TopvisorSerpResponse {
  result?: {
    keywords?: Array<{
      id: number;
      name: string;
      serp?: Record<string, SerpResult[]>;
    }>;
  };
}

// Получить SERP (результаты поиска) для ключевых слов
export async function POST(request: Request) {
  try {
    const { projectId, keywordIds, regionIndex, date } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    if (!keywordIds || !Array.isArray(keywordIds) || keywordIds.length === 0) {
      return NextResponse.json({ error: 'keywordIds array required' }, { status: 400 });
    }

    // Получаем индекс региона если не указан
    let regIndex = regionIndex;
    if (!regIndex) {
      const projectData = await topvisorRequest<{
        result?: Array<{
          id: number;
          searchers?: Array<{
            regions?: Array<{ index: number }>;
          }>;
        }>;
      }>('get/projects_2/projects', {
        fields: ['id'],
        show_searchers_and_regions: 1,
        filters: [{
          name: 'id',
          operator: 'EQUALS',
          values: [projectId]
        }]
      });

      if (projectData.result?.[0]?.searchers?.[0]?.regions?.[0]) {
        regIndex = projectData.result[0].searchers[0].regions[0].index;
      } else {
        return NextResponse.json({ 
          error: 'No regions found in project' 
        }, { status: 400 });
      }
    }

    // Дата для SERP (по умолчанию сегодня)
    const serpDate = date || new Date().toISOString().split('T')[0];

    // Запрашиваем SERP данные
    const data = await topvisorRequest<TopvisorSerpResponse>('get/positions_2/serp', {
      project_id: projectId,
      regions_indexes: [regIndex],
      date: serpDate,
      fields: ['id', 'name'],
      serp_fields: ['position', 'name', 'url', 'snippet'],
      filters: [{
        name: 'id',
        operator: 'IN',
        values: keywordIds
      }],
      limit: keywordIds.length
    });

    console.log('[SERP] Response:', JSON.stringify(data.result).slice(0, 1000));

    // Преобразуем данные
    const serpResults: Record<number, {
      keyword_id: number;
      keyword_name: string;
      competitors: Array<{
        position: number;
        domain: string;
        url: string;
        title: string;
        snippet?: string;
      }>;
    }> = {};

    if (data.result?.keywords) {
      for (const kw of data.result.keywords) {
        const serpData = kw.serp;
        const competitors: Array<{
          position: number;
          domain: string;
          url: string;
          title: string;
          snippet?: string;
        }> = [];

        if (serpData && typeof serpData === 'object') {
          // Формат ключа может быть: "2025-12-05:projectId:regionIndex" или просто массив
          for (const [, value] of Object.entries(serpData)) {
            if (Array.isArray(value)) {
              for (const item of value) {
                // Извлекаем домен из URL
                let domain = '';
                try {
                  const urlObj = new URL(item.url.startsWith('http') ? item.url : `https://${item.url}`);
                  domain = urlObj.hostname;
                } catch {
                  domain = item.url.split('/')[0];
                }

                competitors.push({
                  position: item.position,
                  domain,
                  url: item.url,
                  title: item.name || '',
                  snippet: item.snippet
                });
              }
            }
          }
        }

        // Сортируем по позиции
        competitors.sort((a, b) => a.position - b.position);

        serpResults[kw.id] = {
          keyword_id: kw.id,
          keyword_name: kw.name,
          competitors
        };
      }
    }

    return NextResponse.json({
      success: true,
      serp: serpResults,
      date: serpDate
    });

  } catch (error) {
    console.error('SERP error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get SERP data' 
    }, { status: 400 });
  }
}
