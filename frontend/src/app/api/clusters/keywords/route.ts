import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { convertMultilineFormulas } from '@/lib/formula-converter';

// Путь к папке с моделями поиска
const MODELS_DIR = path.join(process.cwd(), '..', 'Модели поиска');

interface ClusterKeywords {
  clusterName: string;
  formulas: string[];
  keywords: string[];
  totalFormulas: number;
  totalKeywords: number;
}

// Get keywords for a cluster (convert formulas to keywords)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clusterName = searchParams.get('cluster');
    
    if (!clusterName) {
      // Return list of all available clusters
      const files = fs.readdirSync(MODELS_DIR)
        .filter(f => f.endsWith('.txt'))
        .map(f => f.replace('.txt', ''));
      
      return NextResponse.json({ 
        success: true, 
        clusters: files 
      });
    }
    
    // Get keywords for specific cluster
    const filePath = path.join(MODELS_DIR, `${clusterName}.txt`);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ 
        success: false, 
        error: `Кластер "${clusterName}" не найден` 
      }, { status: 404 });
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = convertMultilineFormulas(content);
    
    const clusterData: ClusterKeywords = {
      clusterName,
      formulas: content.split('\n').filter(l => l.trim()),
      keywords: result.queries,
      totalFormulas: content.split('\n').filter(l => l.trim()).length,
      totalKeywords: result.queries.length
    };
    
    return NextResponse.json({ 
      success: true, 
      ...clusterData 
    });
  } catch (error) {
    console.error('Error reading cluster:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to read cluster' 
    }, { status: 500 });
  }
}

// Convert formulas to keywords (POST with custom formulas)
export async function POST(request: Request) {
  try {
    const { formulas } = await request.json();
    
    if (!formulas || !Array.isArray(formulas)) {
      return NextResponse.json({ 
        success: false, 
        error: 'formulas array required' 
      }, { status: 400 });
    }
    
    const text = formulas.join('\n');
    const result = convertMultilineFormulas(text);
    
    return NextResponse.json({ 
      success: true, 
      keywords: result.queries,
      totalFormulas: formulas.length,
      totalKeywords: result.queries.length,
      variantGroups: result.variantGroups
    });
  } catch (error) {
    console.error('Error converting formulas:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to convert formulas' 
    }, { status: 500 });
  }
}
