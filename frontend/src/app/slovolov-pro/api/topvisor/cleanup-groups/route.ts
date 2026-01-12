import { NextResponse } from 'next/server';
import { topvisorRequest } from '@/lib/topvisor';

interface Group {
  id: number;
  name: string;
  count_keywords?: number;
}

interface GroupsResponse {
  result?: Group[];
}

interface DeleteResponse {
  result?: number;
}

// POST - удалить пустые группы из проекта
export async function POST(request: Request) {
  try {
    const { projectId, deleteEmpty = true, deleteByName } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    // Получаем все группы с количеством ключевых слов
    const groupsData = await topvisorRequest<GroupsResponse>('get/keywords_2/groups', {
      project_id: parseInt(projectId),
      fields: ['id', 'name', 'count_keywords'],
      limit: 10000
    });

    const allGroups = groupsData.result || [];
    console.log(`[cleanup-groups] Found ${allGroups.length} groups in project ${projectId}`);

    // Находим группы для удаления
    let groupsToDelete: Group[] = [];

    if (deleteEmpty) {
      // Удаляем группы с 0 ключевых слов
      groupsToDelete = allGroups.filter(g => (g.count_keywords || 0) === 0);
      console.log(`[cleanup-groups] Found ${groupsToDelete.length} empty groups`);
    }

    if (deleteByName && typeof deleteByName === 'string') {
      // Удаляем группы с определённым именем (для очистки дубликатов)
      const matchingGroups = allGroups.filter(g => g.name === deleteByName);
      // Оставляем первую группу, удаляем остальные дубликаты
      if (matchingGroups.length > 1) {
        const duplicates = matchingGroups.slice(1);
        groupsToDelete = [...groupsToDelete, ...duplicates];
      }
    }

    if (groupsToDelete.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Пустых групп не найдено',
        deleted: 0,
        groups: []
      });
    }

    // Удаляем группы
    const groupIds = groupsToDelete.map(g => g.id);
    
    const deleteResult = await topvisorRequest<DeleteResponse>('del/keywords_2/groups', {
      project_id: parseInt(projectId),
      filters: [{
        name: 'id',
        operator: 'IN',
        values: groupIds
      }]
    });

    const deletedCount = deleteResult.result || 0;
    console.log(`[cleanup-groups] Deleted ${deletedCount} groups`);

    return NextResponse.json({ 
      success: true, 
      message: `Удалено ${deletedCount} пустых групп`,
      deleted: deletedCount,
      groups: groupsToDelete.map(g => ({ id: g.id, name: g.name }))
    });
  } catch (error) {
    console.error('Topvisor cleanup groups error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to cleanup groups' 
    }, { status: 400 });
  }
}

// GET - получить информацию о пустых группах (без удаления)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    // Получаем все группы с количеством ключевых слов
    const groupsData = await topvisorRequest<GroupsResponse>('get/keywords_2/groups', {
      project_id: parseInt(projectId),
      fields: ['id', 'name', 'count_keywords'],
      limit: 10000
    });

    const allGroups = groupsData.result || [];
    
    // Находим пустые группы
    const emptyGroups = allGroups.filter(g => (g.count_keywords || 0) === 0);
    
    // Находим дубликаты по имени
    const nameCount = new Map<string, Group[]>();
    allGroups.forEach(g => {
      const existing = nameCount.get(g.name) || [];
      existing.push(g);
      nameCount.set(g.name, existing);
    });
    
    const duplicates: { name: string; count: number; groups: Group[] }[] = [];
    nameCount.forEach((groups, name) => {
      if (groups.length > 1) {
        duplicates.push({ name, count: groups.length, groups });
      }
    });

    return NextResponse.json({ 
      success: true, 
      totalGroups: allGroups.length,
      emptyGroups: emptyGroups.length,
      duplicateNames: duplicates.length,
      empty: emptyGroups.map(g => ({ id: g.id, name: g.name })),
      duplicates
    });
  } catch (error) {
    console.error('Topvisor get empty groups error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get empty groups' 
    }, { status: 400 });
  }
}
