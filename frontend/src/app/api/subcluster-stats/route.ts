import { NextResponse } from 'next/server';
import { readJsonFile } from '@/lib/dataStore';

interface SubclusterResult {
  subclusterId: string;
  queries?: any[];
  filteredQueries?: any[];
  totalImpressions?: number;
  updatedAt?: string;
}

interface SubclusterResultsData {
  subclusterResults: SubclusterResult[];
}

interface SubclusterStats {
  subclusterId: string;
  queriesCount: number;
  filteredCount: number;
  totalImpressions: number;
  updatedAt: string | null;
}

export async function GET() {
  try {
    const data = readJsonFile<SubclusterResultsData>('subcluster-results.json', { subclusterResults: [] });
    const stats: Record<string, SubclusterStats> = {};
    
    for (const result of data.subclusterResults) {
      if (result.subclusterId) {
        stats[result.subclusterId] = {
          subclusterId: result.subclusterId,
          queriesCount: result.queries?.length || 0,
          filteredCount: result.filteredQueries?.length || 0,
          totalImpressions: result.totalImpressions || 0,
          updatedAt: result.updatedAt || null,
        };
      }
    }
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error reading subcluster stats:', error);
    return NextResponse.json({});
  }
}
