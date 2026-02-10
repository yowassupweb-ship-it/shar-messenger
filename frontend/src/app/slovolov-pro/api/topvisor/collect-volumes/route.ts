import { NextResponse } from 'next/server';
import { topvisorRequest } from '@/lib/topvisor';

interface CollectVolumesResponse {
  result?: number; // task_id или количество
}

// Запустить сбор частоты для ключевых слов
// API: edit/keywords_2/volumes/go
export async function POST(request: Request) {
  try {
    const { projectId, keywordIds } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    // Параметры для сбора частоты
    // qualifiers - массив объектов с region_key, searcher_key, type
    const body: Record<string, unknown> = {
      project_id: parseInt(projectId),
      qualifiers: [
        {
          searcher_key: 0, // Yandex
          region_key: 213, // Moscow
          type: 1, // Базовая частота (Ч)
        }
      ],
      target_type: 'keywords',
    };

    // Если указаны конкретные ключевые слова
    if (keywordIds && Array.isArray(keywordIds) && keywordIds.length > 0) {
      body.filters = [{
        name: 'id',
        operator: 'IN',
        values: keywordIds
      }];
    }

    console.log('[CollectVolumes] Starting volume collection:', JSON.stringify(body));

    const data = await topvisorRequest<CollectVolumesResponse>('edit/keywords_2/volumes/go', body);
    
    console.log('[CollectVolumes] Response:', JSON.stringify(data));

    return NextResponse.json({ 
      success: true, 
      message: 'Сбор частоты запущен. Данные появятся через несколько минут.',
      result: data.result
    });
  } catch (error) {
    console.error('Topvisor collect volumes error:', error);
    
    // Специальная обработка ошибки "уже выполняется"
    if (error instanceof Error && error.message.includes('already')) {
      return NextResponse.json({ 
        success: true,
        alreadyRunning: true,
        message: 'Сбор частоты уже выполняется'
      });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to start volume collection' 
    }, { status: 400 });
  }
}
