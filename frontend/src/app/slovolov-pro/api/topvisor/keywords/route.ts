import { NextResponse } from 'next/server';
import { topvisorRequest } from '@/lib/topvisor';

interface TopvisorKeywordsResponse {
  result: Array<{
    id: number;
    name: string;
    group_id?: number;
    group_name?: string;
    tags?: string;
    target?: string;
  }>;
  total?: number;
  nextOffset?: number;
}

interface TopvisorAddKeywordsResponse {
  result?: Array<{ id: number }>;
}

// Get keywords from project
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const groupId = searchParams.get('groupId');
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    const body: Record<string, unknown> = {
      project_id: parseInt(projectId),
      fields: ['id', 'name', 'group_id', 'group_name', 'tags', 'target'],
      limit,
      offset,
    };

    if (groupId) {
      body.filters = [{
        name: 'group_id',
        operator: 'EQUALS',
        values: [parseInt(groupId)]
      }];
    }

    const data = await topvisorRequest<TopvisorKeywordsResponse>('get/keywords_2/keywords', body);
    
    return NextResponse.json({ 
      success: true, 
      keywords: data.result || [],
      total: data.total,
      nextOffset: data.nextOffset
    });
  } catch (error) {
    console.error('Topvisor keywords error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get keywords' 
    }, { status: 400 });
  }
}

// Add keywords to project
export async function POST(request: Request) {
  try {
    const { projectId, groupId, keywords } = await request.json();

    if (!projectId || !keywords || !Array.isArray(keywords)) {
      return NextResponse.json({ error: 'projectId and keywords array required' }, { status: 400 });
    }

    const body: Record<string, unknown> = {
      project_id: parseInt(projectId),
      keywords: keywords.map((k: string | { name: string }) => typeof k === 'string' ? { name: k } : k),
    };

    if (groupId) {
      body.group_id = parseInt(groupId);
    }

    const data = await topvisorRequest<TopvisorAddKeywordsResponse>('add/keywords_2/keywords', body);
    
    return NextResponse.json({ 
      success: true, 
      added: data.result?.length || 0
    });
  } catch (error) {
    console.error('Topvisor add keywords error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to add keywords' 
    }, { status: 400 });
  }
}

// Delete keywords
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const keywordIds = searchParams.get('keywordIds');

    if (!projectId || !keywordIds) {
      return NextResponse.json({ error: 'projectId and keywordIds required' }, { status: 400 });
    }

    const ids = keywordIds.split(',').map(id => parseInt(id.trim()));
    
    interface DeleteResponse {
      result?: number;
    }
    
    const data = await topvisorRequest<DeleteResponse>('del/keywords_2/keywords', {
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
    console.error('Topvisor delete keywords error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete keywords' 
    }, { status: 400 });
  }
}
