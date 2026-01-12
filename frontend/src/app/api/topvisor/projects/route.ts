import { NextResponse } from 'next/server';
import { topvisorRequest } from '@/lib/topvisor';

interface TopvisorProjectsResponse {
  result: Array<{ id: number; name: string; site: string }>;
}

// Get list of projects
export async function GET() {
  try {
    const data = await topvisorRequest<TopvisorProjectsResponse>('get/projects_2/projects', {
      fields: ['id', 'name', 'site'],
      orders: [{ name: 'name', direction: 'ASC' }]
    });
    
    return NextResponse.json({ 
      success: true, 
      projects: data.result || []
    });
  } catch (error) {
    console.error('Topvisor projects error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get projects' 
    }, { status: 400 });
  }
}
