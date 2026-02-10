import { NextResponse } from 'next/server';
import { readJsonFile } from '@/lib/dataStore';

interface SubclusterResultsData {
  subclusterResults: any[];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const data = readJsonFile<SubclusterResultsData>('subcluster-results.json', { subclusterResults: [] });
    
    // Если ID не указан, возвращаем все результаты
    if (!id) {
      return NextResponse.json(data.subclusterResults);
    }
    
    // Декодируем ID (он уже декодирован searchParams, но на всякий случай)
    const decodedId = decodeURIComponent(id);
    
    const result = data.subclusterResults.find(r => r.subclusterId === decodedId);
    
    if (!result) {
      console.log(`[subcluster-results] Result not found for ID: "${decodedId}"`);
      console.log(`[subcluster-results] Available IDs:`, data.subclusterResults.map(r => r.subclusterId).slice(0, 5));
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error reading subcluster result:', error);
    return NextResponse.json({ error: 'Failed to read result' }, { status: 500 });
  }
}
