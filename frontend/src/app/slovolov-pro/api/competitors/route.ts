import { NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile } from '@/lib/dataStore';

export interface CompetitorSnapshot {
  date: string; // ISO date string
  subclusterResults: {
    subclusterId: string;
    subclusterName: string;
    queriesCount: number;
    filteredCount: number;
    totalImpressions: number;
  }[];
}

export interface CompetitorGroup {
  id: string;
  name: string;
  subclusters: string[]; // subcluster IDs
  snapshots: CompetitorSnapshot[];
  lastUpdated: string | null;
}

interface CompetitorsData {
  groups: CompetitorGroup[];
}

// GET - получить все группы конкурентов
export async function GET() {
  try {
    const data = readJsonFile<CompetitorsData>('competitors.json', { groups: [] });
    return NextResponse.json(data.groups);
  } catch (error) {
    console.error('Error reading competitors:', error);
    return NextResponse.json({ error: 'Failed to read competitors' }, { status: 500 });
  }
}

// POST - создать новую группу или обновить снимок
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, groupId, name, subclusters, snapshotData } = body;
    
    const data = readJsonFile<CompetitorsData>('competitors.json', { groups: [] });
    
    if (action === 'create') {
      // Создать новую группу
      const newGroup: CompetitorGroup = {
        id: Date.now().toString(),
        name,
        subclusters: subclusters || [],
        snapshots: [],
        lastUpdated: null,
      };
      data.groups.push(newGroup);
      writeJsonFile('competitors.json', data);
      return NextResponse.json(newGroup);
    }
    
    if (action === 'update') {
      // Обновить группу (добавить снимок)
      const groupIndex = data.groups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }
      
      const snapshot: CompetitorSnapshot = {
        date: new Date().toISOString(),
        subclusterResults: snapshotData,
      };
      
      data.groups[groupIndex].snapshots.push(snapshot);
      data.groups[groupIndex].lastUpdated = snapshot.date;
      
      writeJsonFile('competitors.json', data);
      return NextResponse.json(data.groups[groupIndex]);
    }
    
    if (action === 'edit') {
      // Редактировать группу (название или подкластеры)
      const groupIndex = data.groups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }
      
      if (name) data.groups[groupIndex].name = name;
      if (subclusters) data.groups[groupIndex].subclusters = subclusters;
      
      writeJsonFile('competitors.json', data);
      return NextResponse.json(data.groups[groupIndex]);
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating competitors:', error);
    return NextResponse.json({ error: 'Failed to update competitors' }, { status: 500 });
  }
}

// DELETE - удалить группу
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('id');
    
    if (!groupId) {
      return NextResponse.json({ error: 'Group ID required' }, { status: 400 });
    }
    
    const data = readJsonFile<CompetitorsData>('competitors.json', { groups: [] });
    data.groups = data.groups.filter(g => g.id !== groupId);
    writeJsonFile('competitors.json', data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting competitor group:', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
