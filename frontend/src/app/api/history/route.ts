import { NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile } from '@/lib/dataStore';

interface HistoryItem {
  id: string;
  timestamp: number;
  type: string;
  description: string;
  details?: string;
}

interface HistoryData {
  history: HistoryItem[];
}

export async function GET() {
  try {
    const data = readJsonFile<HistoryData>('history.json', { history: [] });
    return NextResponse.json(data.history);
  } catch (error) {
    console.error('Error reading history:', error);
    return NextResponse.json([]);
  }
}

export async function DELETE() {
  try {
    writeJsonFile<HistoryData>('history.json', { history: [] });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing history:', error);
    return NextResponse.json({ error: 'Failed to clear history' }, { status: 500 });
  }
}
