import { NextResponse } from 'next/server';
import { topvisorRequest } from '@/lib/topvisor';

// Запуск проверки позиций
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    console.log('[CheckPositions] Starting position check for project:', projectId);

    // Запускаем проверку позиций
    // API: edit/positions_2/checker/go
    interface CheckResponse {
      result?: {
        projectsIds?: number[];
      };
    }

    const result = await topvisorRequest<CheckResponse>('edit/positions_2/checker/go', {
      filters: [{
        name: 'id',
        operator: 'EQUALS',
        values: [projectId]
      }]
    });

    console.log('[CheckPositions] Result:', JSON.stringify(result));

    if (result.result?.projectsIds && result.result.projectsIds.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Position check started',
        projectsIds: result.result.projectsIds
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Position check requested',
      result
    });

  } catch (error: any) {
    // Ошибка 4002 = проверка уже запущена - это не ошибка
    if (error.code === 4002) {
      console.log('[CheckPositions] Check already running, this is normal');
      return NextResponse.json({
        success: true,
        alreadyRunning: true,
        message: 'Проверка позиций уже запущена'
      });
    }
    
    console.error('Error starting position check:', error);
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Получить статус проверки
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Получаем информацию о последней проверке
    interface StatusResponse {
      result?: {
        id?: number;
        state?: number;
        state_string?: string;
        date_start?: string;
        date_end?: string;
      }[];
    }

    const result = await topvisorRequest<StatusResponse>('get/positions_2/gets', {
      project_id: parseInt(projectId),
      limit: 1,
      orders: [{ name: 'id', direction: 'DESC' }]
    });

    console.log('[CheckPositions] Status:', JSON.stringify(result));

    return NextResponse.json({
      success: true,
      checks: result.result || []
    });

  } catch (error) {
    console.error('Error getting position check status:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
