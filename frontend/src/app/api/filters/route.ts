import { NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile, generateId } from '@/lib/dataStore';

interface Filter {
  id: string;
  name: string;
  items: string[];
  category: string;
  order?: number;
}

interface FiltersData {
  filters: Filter[];
}

export async function GET() {
  try {
    const data = readJsonFile<FiltersData>('filters.json', { filters: [] });
    
    // Сортировка по order, затем по номеру в имени
    data.filters.sort((a, b) => {
      // Если есть order - сортируем по нему
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      
      // Иначе по номеру в имени
      const numA = parseInt(a.name.split('_')[0]) || 999;
      const numB = parseInt(b.name.split('_')[0]) || 999;
      return numA - numB;
    });

    return NextResponse.json(data.filters);
  } catch (error) {
    console.error('Error reading filters:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const { name, items } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const data = readJsonFile<FiltersData>('filters.json', { filters: [] });
    
    if (data.filters.some(f => f.name === name)) {
      return NextResponse.json({ error: 'Filter already exists' }, { status: 409 });
    }
    
    const nameParts = name.split('_');
    const category = nameParts.length > 1 ? nameParts[0] : 'general';

    const newFilter: Filter = {
      id: generateId(),
      name,
      items: items || [],
      category,
    };

    data.filters.push(newFilter);
    writeJsonFile('filters.json', data);

    return NextResponse.json({ success: true, filter: newFilter });
  } catch (error) {
    console.error('Error creating filter:', error);
    return NextResponse.json({ error: 'Failed to create filter' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, items } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const data = readJsonFile<FiltersData>('filters.json', { filters: [] });
    const filter = data.filters.find(f => f.id === id);
    
    if (!filter) {
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 });
    }

    // Переименование
    if (name && name !== filter.name) {
      if (data.filters.some(f => f.name === name && f.id !== id)) {
        return NextResponse.json({ error: 'Filter with this name already exists' }, { status: 409 });
      }
      
      filter.name = name;
      const nameParts = name.split('_');
      filter.category = nameParts.length > 1 ? nameParts[0] : 'general';
    }
    
    // Обновляем items
    if (items !== undefined) {
      filter.items = items;
    }
    
    writeJsonFile('filters.json', data);
    return NextResponse.json({ success: true, filter });
  } catch (error) {
    console.error('Error updating filter:', error);
    return NextResponse.json({ error: 'Failed to update filter' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const data = readJsonFile<FiltersData>('filters.json', { filters: [] });
    const index = data.filters.findIndex(f => f.id === id);
    
    if (index === -1) {
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 });
    }
    
    data.filters.splice(index, 1);
    writeJsonFile('filters.json', data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting filter:', error);
    return NextResponse.json({ error: 'Failed to delete filter' }, { status: 500 });
  }
}

// Переупорядочивание фильтров
export async function PATCH(request: Request) {
  try {
    const { orderedIds } = await request.json();
    
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds array is required' }, { status: 400 });
    }

    const data = readJsonFile<FiltersData>('filters.json', { filters: [] });
    
    // Устанавливаем order для каждого фильтра
    orderedIds.forEach((id, index) => {
      const filter = data.filters.find(f => f.id === id);
      if (filter) {
        filter.order = index;
      }
    });
    
    writeJsonFile('filters.json', data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering filters:', error);
    return NextResponse.json({ error: 'Failed to reorder filters' }, { status: 500 });
  }
}
