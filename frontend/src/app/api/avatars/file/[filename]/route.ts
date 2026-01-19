import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Директория для хранения аватарок
const AVATARS_DIR = path.join(process.cwd(), '..', 'backend', 'uploads', 'avatars');

// Определение MIME типа по расширению
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp'
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    if (!filename) {
      return NextResponse.json({ error: 'Имя файла не указано' }, { status: 400 });
    }

    // Защита от path traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(AVATARS_DIR, sanitizedFilename);

    // Проверяем существование файла
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 });
    }

    // Читаем файл
    const fileBuffer = await readFile(filePath);
    const mimeType = getMimeType(sanitizedFilename);

    // Возвращаем файл с правильными заголовками
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="${sanitizedFilename}"`
      }
    });

  } catch (error) {
    console.error('Error serving avatar:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении аватара' },
      { status: 500 }
    );
  }
}
