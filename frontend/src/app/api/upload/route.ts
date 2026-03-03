import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE_URL = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000')
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const backendForm = new FormData();
    backendForm.append('file', file);

    const backendRes = await fetch(`${BACKEND_BASE_URL}/api/upload`, {
      method: 'POST',
      body: backendForm,
    });

    if (!backendRes.ok) {
      const errorText = await backendRes.text();
      console.error('Backend upload failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to upload file to backend storage' },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();

    return NextResponse.json({
      success: true,
      url: data.url,
      filename: data.filename || file.name,
      size: data.size || file.size,
      type: file.type.startsWith('image/') ? 'image' : 'file'
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
