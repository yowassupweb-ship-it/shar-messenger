import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), '..', 'backend', 'database.json');
    
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: 'Database file not found' }, { status: 404 });
    }

    const stats = fs.statSync(dbPath);
    const sizeInBytes = stats.size;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

    // Read database to get counts
    const dbContent = fs.readFileSync(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    return NextResponse.json({
      sizeInBytes,
      sizeInKB,
      sizeInMB,
      size: parseFloat(sizeInMB) >= 1 ? `${sizeInMB} MB` : `${sizeInKB} KB`,
      lastModified: stats.mtime.toISOString(),
      counts: {
        logs: db.logs?.length || 0,
        feeds: db.feeds?.length || 0,
        products: db.products?.length || 0,
        dataSources: db.dataSources?.length || 0,
        chatSessions: Object.keys(db.chatSessions || {}).length,
        aiPresets: db.aiPresets?.length || 0
      }
    });
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return NextResponse.json(
      { error: 'Failed to get database stats' },
      { status: 500 }
    );
  }
}
