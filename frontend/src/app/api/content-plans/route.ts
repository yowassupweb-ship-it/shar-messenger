import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'content-plans');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');

export const dynamic = 'force-dynamic';

interface ContentPlan {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
}

interface ContentPlansIndex {
  plans: ContentPlan[];
  activePlanId: string;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getDefaultIndex(): ContentPlansIndex {
  return {
    plans: [{
      id: 'default',
      name: 'Основной план',
      description: 'Основной контент-план',
      color: '#8B5CF6',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: true
    }],
    activePlanId: 'default'
  };
}

function readIndex(): ContentPlansIndex {
  ensureDataDir();
  if (!fs.existsSync(INDEX_FILE)) {
    const defaultIndex = getDefaultIndex();
    fs.writeFileSync(INDEX_FILE, JSON.stringify(defaultIndex, null, 2));
    return defaultIndex;
  }
  const content = fs.readFileSync(INDEX_FILE, 'utf-8');
  return JSON.parse(content);
}

function writeIndex(data: ContentPlansIndex) {
  ensureDataDir();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(data, null, 2));
}

function generateId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Миграция старых данных если нужно
function migrateOldData() {
  const oldDataFile = path.join(process.cwd(), 'data', 'content-plan.json');
  const defaultPlanFile = path.join(DATA_DIR, 'default.json');
  
  // Если старый файл существует и новый ещё не создан
  if (fs.existsSync(oldDataFile) && !fs.existsSync(defaultPlanFile)) {
    try {
      const oldData = fs.readFileSync(oldDataFile, 'utf-8');
      fs.writeFileSync(defaultPlanFile, oldData);
      console.log('Migrated old content-plan.json to content-plans/default.json');
    } catch (error) {
      console.error('Error migrating old data:', error);
    }
  }
}

// GET - получить все контент-планы
export async function GET() {
  try {
    migrateOldData();
    const index = readIndex();
    return NextResponse.json(index);
  } catch (error) {
    console.error('Error reading content plans:', error);
    return NextResponse.json(getDefaultIndex());
  }
}

// POST - создать новый контент-план
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const index = readIndex();
    
    const newPlan: ContentPlan = {
      id: generateId(),
      name: body.name || 'Новый план',
      description: body.description || '',
      color: body.color || '#8B5CF6',
      createdBy: body.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: false
    };
    
    index.plans.push(newPlan);
    writeIndex(index);
    
    // Создаём пустой файл для нового плана
    const planFile = path.join(DATA_DIR, `${newPlan.id}.json`);
    fs.writeFileSync(planFile, JSON.stringify({ posts: [] }, null, 2));
    
    return NextResponse.json(newPlan);
  } catch (error) {
    console.error('Error creating content plan:', error);
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}

// PUT - обновить контент-план (переименовать и т.д.)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const index = readIndex();
    
    const planIndex = index.plans.findIndex(p => p.id === body.id);
    if (planIndex === -1) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    
    index.plans[planIndex] = {
      ...index.plans[planIndex],
      name: body.name ?? index.plans[planIndex].name,
      description: body.description ?? index.plans[planIndex].description,
      color: body.color ?? index.plans[planIndex].color,
      updatedAt: new Date().toISOString()
    };
    
    writeIndex(index);
    
    return NextResponse.json(index.plans[planIndex]);
  } catch (error) {
    console.error('Error updating content plan:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

// PATCH - установить активный план
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const index = readIndex();
    
    if (body.activePlanId) {
      const plan = index.plans.find(p => p.id === body.activePlanId);
      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }
      index.activePlanId = body.activePlanId;
      writeIndex(index);
    }
    
    return NextResponse.json(index);
  } catch (error) {
    console.error('Error setting active plan:', error);
    return NextResponse.json({ error: 'Failed to set active plan' }, { status: 500 });
  }
}

// DELETE - удалить контент-план
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
    }
    
    const index = readIndex();
    const plan = index.plans.find(p => p.id === id);
    
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    
    if (plan.isDefault) {
      return NextResponse.json({ error: 'Cannot delete default plan' }, { status: 400 });
    }
    
    // Удаляем план из индекса
    index.plans = index.plans.filter(p => p.id !== id);
    
    // Если удаляем активный план, переключаемся на default
    if (index.activePlanId === id) {
      index.activePlanId = 'default';
    }
    
    writeIndex(index);
    
    // Удаляем файл с данными плана
    const planFile = path.join(DATA_DIR, `${id}.json`);
    if (fs.existsSync(planFile)) {
      fs.unlinkSync(planFile);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting content plan:', error);
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
  }
}
