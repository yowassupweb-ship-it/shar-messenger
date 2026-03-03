import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE_URL = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000')
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ theme: string; filePath: string[] }> }
) {
  try {
    const { theme, filePath } = await params;
    const encodedPath = (filePath || []).map((segment) => encodeURIComponent(segment)).join('/');

    const response = await fetch(`${BACKEND_BASE_URL}/api/chat-backgrounds/${encodeURIComponent(theme)}/${encodedPath}`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Not found');
      return new NextResponse(errorText, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('Error proxying chat background file:', error);
    return new NextResponse('Failed to load file', { status: 500 });
  }
}
