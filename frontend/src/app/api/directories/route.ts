import { NextRequest, NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile, generateId } from '@/lib/dataStore';
import { 
  Department, 
  Position, 
  DEFAULT_DEPARTMENTS, 
  DEFAULT_POSITIONS 
} from '@/types/user';

interface DirectoriesData {
  departments: Department[];
  positions: Position[];
}

const DEFAULT_DATA: DirectoriesData = {
  departments: DEFAULT_DEPARTMENTS,
  positions: DEFAULT_POSITIONS
};

// GET - получить справочники
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'departments' | 'positions' | null (все)
    
    const data = readJsonFile<DirectoriesData>('directories.json', DEFAULT_DATA);
    
    // Убедимся что данные инициализированы
    if (!data.departments?.length) {
      data.departments = DEFAULT_DEPARTMENTS;
    }
    if (!data.positions?.length) {
      data.positions = DEFAULT_POSITIONS;
    }
    
    if (type === 'departments') {
      return NextResponse.json({ 
        success: true, 
        departments: data.departments.sort((a, b) => a.order - b.order) 
      });
    }
    
    if (type === 'positions') {
      return NextResponse.json({ 
        success: true, 
        positions: data.positions.sort((a, b) => a.order - b.order) 
      });
    }
    
    return NextResponse.json({
      success: true,
      departments: data.departments.sort((a, b) => a.order - b.order),
      positions: data.positions.sort((a, b) => a.order - b.order)
    });
  } catch (error) {
    console.error('Error reading directories:', error);
    return NextResponse.json({ error: 'Failed to read directories' }, { status: 500 });
  }
}

// POST - создать запись в справочнике
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, name, color, departmentId } = body;
    
    if (!type || !name) {
      return NextResponse.json({ error: 'type и name обязательны' }, { status: 400 });
    }
    
    const data = readJsonFile<DirectoriesData>('directories.json', DEFAULT_DATA);
    
    if (type === 'department') {
      const newDepartment: Department = {
        id: generateId(),
        name,
        color: color || '#6b7280',
        order: data.departments.length
      };
      
      data.departments.push(newDepartment);
      writeJsonFile('directories.json', data);
      
      return NextResponse.json({ success: true, department: newDepartment });
    }
    
    if (type === 'position') {
      const newPosition: Position = {
        id: generateId(),
        name,
        departmentId,
        order: data.positions.length
      };
      
      data.positions.push(newPosition);
      writeJsonFile('directories.json', data);
      
      return NextResponse.json({ success: true, position: newPosition });
    }
    
    return NextResponse.json({ error: 'Неизвестный тип' }, { status: 400 });
  } catch (error) {
    console.error('Error creating directory item:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

// PUT - обновить запись
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, ...updates } = body;
    
    if (!type || !id) {
      return NextResponse.json({ error: 'type и id обязательны' }, { status: 400 });
    }
    
    const data = readJsonFile<DirectoriesData>('directories.json', DEFAULT_DATA);
    
    if (type === 'department') {
      const idx = data.departments.findIndex(d => d.id === id);
      if (idx === -1) {
        return NextResponse.json({ error: 'Отдел не найден' }, { status: 404 });
      }
      data.departments[idx] = { ...data.departments[idx], ...updates };
      writeJsonFile('directories.json', data);
      return NextResponse.json({ success: true, department: data.departments[idx] });
    }
    
    if (type === 'position') {
      const idx = data.positions.findIndex(p => p.id === id);
      if (idx === -1) {
        return NextResponse.json({ error: 'Должность не найдена' }, { status: 404 });
      }
      data.positions[idx] = { ...data.positions[idx], ...updates };
      writeJsonFile('directories.json', data);
      return NextResponse.json({ success: true, position: data.positions[idx] });
    }
    
    return NextResponse.json({ error: 'Неизвестный тип' }, { status: 400 });
  } catch (error) {
    console.error('Error updating directory item:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// DELETE - удалить запись
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    
    if (!type || !id) {
      return NextResponse.json({ error: 'type и id обязательны' }, { status: 400 });
    }
    
    const data = readJsonFile<DirectoriesData>('directories.json', DEFAULT_DATA);
    
    if (type === 'department') {
      data.departments = data.departments.filter(d => d.id !== id);
      writeJsonFile('directories.json', data);
      return NextResponse.json({ success: true });
    }
    
    if (type === 'position') {
      data.positions = data.positions.filter(p => p.id !== id);
      writeJsonFile('directories.json', data);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Неизвестный тип' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting directory item:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
