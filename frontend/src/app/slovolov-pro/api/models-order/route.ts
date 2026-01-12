import { NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile } from '@/lib/dataStore';

interface ModelsOrder {
  order: string[]; // массив ID моделей в нужном порядке
}

// Получить порядок моделей
export async function GET() {
  try {
    const data = readJsonFile<ModelsOrder>('models-order.json', { order: [] });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading models order:', error);
    return NextResponse.json({ order: [] });
  }
}

// Сохранить порядок моделей
export async function POST(request: Request) {
  try {
    const { order } = await request.json();
    
    if (!Array.isArray(order)) {
      return NextResponse.json({ error: 'Order must be an array' }, { status: 400 });
    }
    
    const data: ModelsOrder = { order };
    writeJsonFile('models-order.json', data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving models order:', error);
    return NextResponse.json({ error: 'Failed to save order' }, { status: 500 });
  }
}
