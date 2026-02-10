import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Создаем папку uploads если её нет
    const uploadsDir = join(process.cwd(), '..', 'data', 'uploads', 'todos');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2, 11);
    const ext = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomStr}.${ext}`;
    const filePath = join(uploadsDir, fileName);

    // Сохраняем файл
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Возвращаем URL для доступа
    const fileUrl = `/api/todos/files/${fileName}`;

    return NextResponse.json({
      id: `${timestamp}-${randomStr}`,
      name: file.name,
      url: fileUrl,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      size: file.size,
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
