import { NextResponse } from 'next/server';
import { readJsonFile } from '@/lib/dataStore';

interface Query {
  id: string;
  text: string;
  impressions?: number;
  source?: string;
}

interface QueriesData {
  queries: Query[];
}

export async function GET() {
  try {
    const data = readJsonFile<QueriesData>('queries.json', { queries: [] });
    
    // Sort by impressions (descending)
    const sortedQueries = [...data.queries].sort((a, b) => (b.impressions || 0) - (a.impressions || 0));

    return NextResponse.json(sortedQueries);
  } catch (error) {
    console.error('Error reading queries:', error);
    return NextResponse.json([]);
  }
}
