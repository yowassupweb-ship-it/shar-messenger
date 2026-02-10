import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// URL бэкенда для проксирования
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

// Директория для хранения аватарок - в backend/uploads для постоянного хранения
const AVATARS_DIR = path.join(process.cwd(), '..', 'backend', 'uploads', 'avatars');

// Максимальный размер файла (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Разрешенные типы файлов
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Функция для удаления старой аватарки с диска
async function deleteOldAvatar(oldAvatarUrl: string | undefined): Promise<void> {
  if (!oldAvatarUrl) return;
  
  try {
    // Извлекаем имя файла из URL: /api/avatars/file/filename.jpg -> filename.jpg
    const match = oldAvatarUrl.match(/\/api\/avatars\/file\/(.+)$/);
    if (match && match[1]) {
      const oldFileName = match[1];
      const oldFilePath = path.join(AVATARS_DIR, oldFileName);
      
      if (existsSync(oldFilePath)) {
        await unlink(oldFilePath);
        console.log(`[Avatar API] Deleted old avatar: ${oldFileName}`);
      }
    }
  } catch (err) {
    console.error(`[Avatar API] Error deleting old avatar:`, err);
    // Не прерываем процесс если не удалось удалить старый файл
  }
}

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

    // Получаем старую аватарку для удаления через бэкенд
    let oldAvatarUrl: string | undefined;
    try {
      const userRes = await fetch(`${BACKEND_URL}/api/users/${userId}`);
      if (userRes.ok) {
        const user = await userRes.json();
        oldAvatarUrl = user?.avatar;
      }
    } catch (err) {
      console.error('[Avatar API] Error fetching user:', err);
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

    // Удаляем старую аватарку с диска
    await deleteOldAvatar(oldAvatarUrl);

    // Обновляем пользователя через бэкенд API (проксирование)
    console.log(`[Avatar API] Updating user ${userId} with avatar ${avatarUrl} via backend`);
    
    const updateRes = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: avatarUrl })
    });
    
    if (!updateRes.ok) {
      console.error('[Avatar API] Failed to update user via backend:', await updateRes.text());
    } else {
      console.log(`[Avatar API] User avatar updated successfully via backend`);
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

    // Обновляем пользователя через бэкенд API
    const updateRes = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: null })
    });
    
    if (!updateRes.ok) {
      console.error('[Avatar API] Failed to clear avatar via backend');
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
