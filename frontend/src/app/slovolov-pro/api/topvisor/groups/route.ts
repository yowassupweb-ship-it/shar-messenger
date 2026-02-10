import { NextResponse } from 'next/server';
import { topvisorRequest } from '@/lib/topvisor';

interface TopvisorGroupsResponse {
  result: Array<{
    id: number;
    name: string;
    folder_id?: number;
    on?: boolean;
    count_keywords?: number;
  }>;
}

// Get groups from project
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    const data = await topvisorRequest<TopvisorGroupsResponse>('get/keywords_2/groups', {
      project_id: parseInt(projectId),
      fields: ['id', 'name', 'folder_id', 'on', 'count_keywords'],
      orders: [{ name: 'name', direction: 'ASC' }]
    });
    
    return NextResponse.json({ 
      success: true, 
      groups: data.result || []
    });
  } catch (error) {
    console.error('Topvisor groups error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get groups' 
    }, { status: 400 });
  }
}

// Create group
export async function POST(request: Request) {
  try {
    const { projectId, name } = await request.json();

    if (!projectId || !name) {
      return NextResponse.json({ error: 'projectId and name required' }, { status: 400 });
    }

    const data = await topvisorRequest<TopvisorGroupsResponse>('add/keywords_2/groups', {
      project_id: parseInt(projectId),
      name: [name],
    });
    
    return NextResponse.json({ 
      success: true, 
      group: data.result?.[0]
    });
  } catch (error) {
    console.error('Topvisor create group error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create group' 
    }, { status: 400 });
  }
}

// Delete groups
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const groupIds = searchParams.get('groupIds');

    if (!projectId || !groupIds) {
      return NextResponse.json({ error: 'projectId and groupIds required' }, { status: 400 });
    }

    const ids = groupIds.split(',').map(id => parseInt(id.trim()));
    
    interface DeleteResponse {
      result?: number;
    }
    
    const data = await topvisorRequest<DeleteResponse>('del/keywords_2/groups', {
      project_id: parseInt(projectId),
      filters: [{
        name: 'id',
        operator: 'IN',
        values: ids
      }]
    });
    
    return NextResponse.json({ 
      success: true, 
      deleted: data.result || 0
    });
  } catch (error) {
    console.error('Topvisor delete groups error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete groups' 
    }, { status: 400 });
  }
}
