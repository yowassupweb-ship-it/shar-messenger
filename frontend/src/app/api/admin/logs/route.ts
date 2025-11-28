import { NextRequest, NextResponse } from 'next/server';
import { readDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await readDB();
    const logs = db.logs || [];

    // Sort logs by timestamp (most recent first)
    const sortedLogs = logs.sort((a: any, b: any) => {
      const dateA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const dateB = new Date(b.timestamp || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      logs: sortedLogs,
      count: sortedLogs.length
    });
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
