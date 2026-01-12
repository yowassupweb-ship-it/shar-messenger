import { NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile } from '@/lib/dataStore';

interface SubclusterConfig {
  subclusterId: string;
  models: string[];
  filters: string[];
  applyFilters?: boolean;
  minFrequency?: number;
}

interface ConfigsData {
  configs: SubclusterConfig[];
}

// GET - получить все конфигурации
export async function GET() {
  try {
    const data = readJsonFile<ConfigsData>('subcluster-configs.json', { configs: [] });
    return NextResponse.json({ success: true, configs: data.configs });
  } catch (error) {
    console.error('Error reading configs:', error);
    return NextResponse.json({ success: false, error: 'Failed to read configs' }, { status: 500 });
  }
}

// POST - сохранить конфигурации
export async function POST(request: Request) {
  try {
    const { configs } = await request.json();
    
    if (!configs || !Array.isArray(configs)) {
      return NextResponse.json({ success: false, error: 'Invalid configs' }, { status: 400 });
    }
    
    writeJsonFile('subcluster-configs.json', { configs });
    
    return NextResponse.json({ success: true, saved: configs.length });
  } catch (error) {
    console.error('Error saving configs:', error);
    return NextResponse.json({ success: false, error: 'Failed to save configs' }, { status: 500 });
  }
}

// PUT - обновить одну конфигурацию
export async function PUT(request: Request) {
  try {
    const config: SubclusterConfig = await request.json();
    
    if (!config || !config.subclusterId) {
      return NextResponse.json({ success: false, error: 'Invalid config' }, { status: 400 });
    }
    
    const data = readJsonFile<ConfigsData>('subcluster-configs.json', { configs: [] });
    
    const index = data.configs.findIndex(c => c.subclusterId === config.subclusterId);
    if (index !== -1) {
      data.configs[index] = config;
    } else {
      data.configs.push(config);
    }
    
    writeJsonFile('subcluster-configs.json', data);
    
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json({ success: false, error: 'Failed to update config' }, { status: 500 });
  }
}
