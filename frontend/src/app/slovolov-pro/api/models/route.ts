import { NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile, generateId } from '@/lib/dataStore';

interface SearchModel {
  id: string;
  name: string;
  content: string;
  order?: number;
}

interface ModelsData {
  models: SearchModel[];
}

export async function GET() {
  try {
    const data = readJsonFile<ModelsData>('models.json', { models: [] });

    // Сортировка по order, затем по имени
    data.models.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(data.models);
  } catch (error) {
    console.error('Error reading models:', error);
    return NextResponse.json([]);
  }
}

// Создание новой модели
export async function POST(request: Request) {
  try {
    const { name, content } = await request.json();
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const data = readJsonFile<ModelsData>('models.json', { models: [] });
    
    if (data.models.some(m => m.name === name.trim())) {
      return NextResponse.json({ error: 'Model already exists' }, { status: 409 });
    }
    
    const newModel: SearchModel = {
      id: generateId(),
      name: name.trim(),
      content: content || '',
    };
    
    data.models.push(newModel);
    writeJsonFile('models.json', data);
    
    return NextResponse.json(newModel);
  } catch (error) {
    console.error('Error creating model:', error);
    return NextResponse.json({ error: 'Failed to create model' }, { status: 500 });
  }
}

// Обновление модели (переименование или изменение контента)
export async function PUT(request: Request) {
  try {
    const { id, name, content } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const data = readJsonFile<ModelsData>('models.json', { models: [] });
    const model = data.models.find(m => m.id === id);
    
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }
    
    // Если новое имя
    if (name && name.trim() !== model.name) {
      if (data.models.some(m => m.name === name.trim() && m.id !== id)) {
        return NextResponse.json({ error: 'Model with this name already exists' }, { status: 409 });
      }
      model.name = name.trim();
    }
    
    // Обновляем контент
    if (content !== undefined) {
      model.content = content;
    }
    
    writeJsonFile('models.json', data);
    return NextResponse.json(model);
  } catch (error) {
    console.error('Error updating model:', error);
    return NextResponse.json({ error: 'Failed to update model' }, { status: 500 });
  }
}

// Удаление модели
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const data = readJsonFile<ModelsData>('models.json', { models: [] });
    const index = data.models.findIndex(m => m.id === id);
    
    if (index === -1) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }
    
    data.models.splice(index, 1);
    writeJsonFile('models.json', data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting model:', error);
    return NextResponse.json({ error: 'Failed to delete model' }, { status: 500 });
  }
}

// Переупорядочивание моделей
export async function PATCH(request: Request) {
  try {
    const { orderedIds } = await request.json();
    
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds array is required' }, { status: 400 });
    }

    const data = readJsonFile<ModelsData>('models.json', { models: [] });
    
    // Устанавливаем order для каждой модели
    orderedIds.forEach((id, index) => {
      const model = data.models.find(m => m.id === id);
      if (model) {
        model.order = index;
      }
    });
    
    writeJsonFile('models.json', data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering models:', error);
    return NextResponse.json({ error: 'Failed to reorder models' }, { status: 500 });
  }
}
