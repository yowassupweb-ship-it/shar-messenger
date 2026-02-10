import { NextResponse } from 'next/server';
import { topvisorRequest } from '@/lib/topvisor';

interface TopvisorProjectsResponse {
  result?: Array<{ id: number; name: string }>;
}

// Test connection by getting user profile
export async function GET() {
  try {
    // Use projects list to test connection - simpler and more reliable
    const data = await topvisorRequest<TopvisorProjectsResponse>('get/projects_2/projects', {
      fields: ['id', 'name'],
      limit: 1
    });
    
    return NextResponse.json({ 
      success: true, 
      projectsCount: data.result?.length || 0,
      message: 'Подключение успешно!'
    });
  } catch (error) {
    console.error('Topvisor test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    }, { status: 400 });
  }
}
