import { NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile, generateId } from '@/lib/dataStore';

interface ResultData {
  id: string;
  modelName: string;
  query: string;
  createdAt: string;
  items: Array<{ query: string; count: number }>;
  filters?: string[];
}

interface ResultsData {
  results: ResultData[];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const data = readJsonFile<ResultsData>('results.json', { results: [] });

    // Получить конкретный результат
    if (id) {
      const result = data.results.find(r => r.id === id);
      if (!result) {
        return NextResponse.json({ error: 'Result not found' }, { status: 404 });
      }
      return NextResponse.json(result);
    }

    // Список всех результатов
    const results = data.results.map(r => ({
      id: r.id,
      modelName: r.modelName,
      createdAt: r.createdAt,
      count: r.items?.length || 0,
    }));

    // Сортировка по дате (новые первые)
    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error reading results:', error);
    return NextResponse.json({ error: 'Failed to read results' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { modelName, query, items, filters } = body;
    
    const data = readJsonFile<ResultsData>('results.json', { results: [] });
    
    const id = generateId();
    const newResult: ResultData = {
      id,
      modelName: modelName || 'Unknown',
      query: query || '',
      createdAt: new Date().toISOString(),
      items: items || [],
      filters: filters || [],
    };
    
    data.results.push(newResult);
    writeJsonFile('results.json', data);
    
    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error('Error saving result:', error);
    return NextResponse.json({ error: 'Failed to save result' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const data = readJsonFile<ResultsData>('results.json', { results: [] });
    const index = data.results.findIndex(r => r.id === id);
    
    if (index === -1) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }
    
    data.results.splice(index, 1);
    writeJsonFile('results.json', data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting result:', error);
    return NextResponse.json({ error: 'Failed to delete result' }, { status: 500 });
  }
}
