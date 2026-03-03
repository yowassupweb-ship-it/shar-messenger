import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const BACKEND_BASE_URL = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000')
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    const sanitizedFilename = path.basename(filename);

    // 1) Основной источник: backend API
    try {
      const backendRes = await fetch(`${BACKEND_BASE_URL}/api/uploads/${encodeURIComponent(sanitizedFilename)}`, {
        method: 'GET',
        cache: 'no-store'
      });

      if (backendRes.ok) {
        const fileBuffer = await backendRes.arrayBuffer();
        const contentType = backendRes.headers.get('content-type') || 'application/octet-stream';

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        });
      }
    } catch (proxyError) {
      console.error('Error proxying file from backend:', proxyError);
    }

    // 2) Fallback для локальной разработки
    const filePath = path.join(process.cwd(), '..', 'backend', 'uploads', sanitizedFilename);

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    
    // Определяем MIME тип по расширению
    const ext = sanitizedFilename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'txt': 'text/plain',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg',
      'zip': 'application/zip'
    };
    
    const contentType = mimeTypes[ext || ''] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json(
      { error: 'Failed to read file' },
      { status: 500 }
    );
  }
}
