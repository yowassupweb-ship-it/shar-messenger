import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    // Читаем данные из файла data/quota.json
    const dataPath = path.join(process.cwd(), 'data', 'quota.json');
    
    try {
      const fileContent = await fs.readFile(dataPath, 'utf-8');
      const quota = JSON.parse(fileContent);
      
      return NextResponse.json({
        remaining: quota.remaining || 1024,
        total: quota.total || 1024,
        used: quota.used || 0
      });
    } catch (fileError) {
      // Если файл не найден, возвращаем дефолтные значения
      console.warn('Quota file not found, using defaults');
      return NextResponse.json({
        remaining: 1024,
        total: 1024,
        used: 0
      });
    }
  } catch (error) {
    console.error('Error fetching quota:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quota' },
      { status: 500 }
    );
  }
}
