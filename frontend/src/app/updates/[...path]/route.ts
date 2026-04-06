import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

// Отдаём файлы обновлений из /var/www/shar/updates/ (продакшн)
// или из frontend/native/electron/release/ (локально)
function getUpdatesDir(): string {
  if (process.env.UPDATES_DIR) return process.env.UPDATES_DIR;
  if (process.env.NODE_ENV === 'production') return '/var/www/shar/updates';
  return path.join(process.cwd(), '..', 'native', 'electron', 'release');
}

const MIME: Record<string, string> = {
  '.yml':     'application/x-yaml',
  '.yaml':    'application/x-yaml',
  '.exe':     'application/octet-stream',
  '.blockmap':'application/octet-stream',
  '.7z':      'application/x-7z-compressed',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  // Защита от path traversal
  const fileName = segments.join('/').replace(/\.\./g, '');
  const filePath = path.join(getUpdatesDir(), fileName);

  try {
    await stat(filePath);
    const data = await readFile(filePath);
    const ext = path.extname(fileName).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';

    return new NextResponse(data, {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(data.length),
        'Cache-Control': ext === '.yml' ? 'no-cache, no-store' : 'public, max-age=31536000',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
