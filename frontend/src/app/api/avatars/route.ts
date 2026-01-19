import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { readDB, writeDB } from '@/lib/db';

// Директория для хранения аватарок - в backend/uploads для постоянного хранения
const AVATARS_DIR = path.join(process.cwd(), '..', 'backend', 'uploads', 'avatars');

// Максимальный размер файла (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Разрешенные типы файлов
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Файл не выбран' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'ID пользователя не указан' }, { status: 400 });
    }

    // Проверка типа файла
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Неподдерживаемый формат. Разрешены: JPG, PNG, GIF, WebP' },
        { status: 400 }
      );
    }

    // Проверка размера файла
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Файл слишком большой. Максимум 5MB' },
        { status: 400 }
      );
    }

    // Создаем директорию если не существует
    if (!existsSync(AVATARS_DIR)) {
      await mkdir(AVATARS_DIR, { recursive: true });
    }

    // Генерируем уникальное имя файла
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${userId}_${Date.now()}.${fileExtension}`;
    const filePath = path.join(AVATARS_DIR, fileName);

    // Преобразуем файл в буфер и сохраняем
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // URL для доступа к файлу через API
    const avatarUrl = `/api/avatars/file/${fileName}`;

    // Обновляем пользователя в базе данных
    const db = await readDB();
    const users = db.users || [];
    const userIndex = users.findIndex((u: any) => u.id === userId);

    if (userIndex !== -1) {
      users[userIndex].avatar = avatarUrl;
      users[userIndex].updatedAt = new Date().toISOString();
      db.users = users;
      await writeDB(db);
    }

    console.log(`Avatar uploaded for user ${userId}: ${avatarUrl}`);

    return NextResponse.json({
      success: true,
      avatarUrl,
      message: 'Аватар успешно загружен'
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке аватара' },
      { status: 500 }
    );
  }
}

// DELETE - удалить аватар
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'ID пользователя не указан' }, { status: 400 });
    }

    // Обновляем пользователя в базе данных
    const db = await readDB();
    const users = db.users || [];
    const userIndex = users.findIndex((u: any) => u.id === userId);

    if (userIndex !== -1) {
      users[userIndex].avatar = null;
      users[userIndex].updatedAt = new Date().toISOString();
      db.users = users;
      await writeDB(db);
    }

    return NextResponse.json({
      success: true,
      message: 'Аватар удален'
    });

  } catch (error) {
    console.error('Error deleting avatar:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении аватара' },
      { status: 500 }
    );
  }
}
