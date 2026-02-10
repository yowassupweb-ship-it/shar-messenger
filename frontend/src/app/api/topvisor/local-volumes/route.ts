import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface QueryItem {
  query: string;
  count: number;
}

interface ResultFile {
  items?: QueryItem[];
  queries?: QueryItem[];
}

// Простой русский стемминг - убираем окончания
function stemWord(word: string): string {
  if (word.length < 3) return word;
  
  // Убираем типичные русские окончания (от длинных к коротким)
  return word
    // Длинные окончания сначала
    .replace(/(ами|ями|ого|его|ому|ему|ыми|ими|ами|ями|ния|ние|ией|иях|иям|ией)$/i, '')
    .replace(/(ах|ях|ой|ей|ом|ем|ов|ев|ий|ый|ая|яя|ое|ее|ие|ые|ую|юю|их|ых|ым|им|ам|ям)$/i, '')
    // Короткие окончания
    .replace(/(а|я|о|е|и|ы|у|ю|ь)$/i, '')
    // Глагольные
    .replace(/(ть|ти|тся|ться|ет|ют|ит|ят|ал|ял|ала|яла|али|яли|ил|ила|или|ать|ять|ить|еть|уть)$/i, '')
    // Суффиксы
    .replace(/(ость|ност|ние|ния|ению|нию|ением|нием)$/i, '')
    .replace(/(ный|ная|ное|ные|ного|ной|ному|ных|ным|ными)$/i, 'н')
    .replace(/(ский|ская|ское|ские|ского|ской|скому|ских|ским|скими)$/i, 'ск');
}

// Получить стеммированный ключ для запроса
function getStemKey(query: string): string {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map(stemWord)
    .filter(w => w.length > 1)
    .sort()
    .join(' ');
}

// Рекурсивно получить все файлы в директории
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  }
  
  return arrayOfFiles;
}

// Парсить файл с данными (поддержка разных форматов)
// Формат 1: запрос\tчастота (tab-separated)
// Формат 2: запрос 12345 (пробел + число в конце строки)
function parseFrequencyFile(filePath: string): Record<string, number> {
  const volumes: Record<string, number> = {};
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      let query = '';
      let count = 0;
      
      // Пробуем tab-separated формат
      if (trimmedLine.includes('\t')) {
        const parts = trimmedLine.split('\t');
        if (parts.length >= 2) {
          query = parts[0].toLowerCase().trim();
          count = parseInt(parts[1], 10);
        }
      } else {
        // Пробуем формат "запрос 12345" (число в конце)
        const match = trimmedLine.match(/^(.+?)\s+(\d+)$/);
        if (match) {
          query = match[1].toLowerCase().trim();
          count = parseInt(match[2], 10);
        }
      }
      
      if (query && !isNaN(count) && count > 0) {
        if (!volumes[query] || volumes[query] < count) {
          volumes[query] = count;
        }
      }
    }
  } catch (e) {
    // Ignore errors for individual files
  }
  
  return volumes;
}

// Получить частоты из локальных файлов (Wordstat)
export async function POST(request: Request) {
  try {
    const { keywords } = await request.json();

    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json({ error: 'keywords array required' }, { status: 400 });
    }

    // Собираем все частоты из локальных файлов
    const volumes: Record<string, number> = {};
    
    // Путь к папкам с результатами (относительно корня проекта)
    const basePath = path.join(process.cwd(), '..');
    
    // 1. JSON файлы из Результаты и Результаты подкластеров
    const jsonPaths = [
      path.join(basePath, 'Результаты'),
      path.join(basePath, 'Результаты подкластеров'),
    ];

    for (const resultsPath of jsonPaths) {
      if (!fs.existsSync(resultsPath)) continue;

      const files = fs.readdirSync(resultsPath).filter(f => f.endsWith('.json'));

      for (const file of files) {
        try {
          const filePath = path.join(resultsPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const data: ResultFile = JSON.parse(content);
          
          const items = data.items || data.queries || [];
          
          for (const item of items) {
            if (item.query && item.count !== undefined) {
              const normalizedQuery = item.query.toLowerCase().trim();
              if (!volumes[normalizedQuery] || volumes[normalizedQuery] < item.count) {
                volumes[normalizedQuery] = item.count;
              }
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    }

    // 2. Tab-separated файлы из папок Кластер
    const clusterPaths = [
      path.join(basePath, 'Кластер 1 - Тип тура'),
      path.join(basePath, 'Кластер 2 - Гео'),
      path.join(basePath, 'Кластер 3 - Брендовые'),
      path.join(basePath, 'Кластер 4 - События'),
      path.join(basePath, 'Кластер 5 - Коллекция'),
    ];

    for (const clusterPath of clusterPaths) {
      const allFiles = getAllFiles(clusterPath);
      
      for (const filePath of allFiles) {
        // Пропускаем JSON файлы, парсим только текстовые
        if (filePath.endsWith('.json')) continue;
        
        const fileVolumes = parseFrequencyFile(filePath);
        for (const [query, count] of Object.entries(fileVolumes)) {
          if (!volumes[query] || volumes[query] < count) {
            volumes[query] = count;
          }
        }
      }
    }

    console.log('[LocalVolumes] Total unique queries with volumes:', Object.keys(volumes).length);

    // Создаём индекс по отсортированным словам для поиска без учёта порядка
    const wordIndex: Record<string, { query: string; count: number }[]> = {};
    for (const [query, count] of Object.entries(volumes)) {
      const sortedWords = query.split(/\s+/).sort().join(' ');
      if (!wordIndex[sortedWords]) {
        wordIndex[sortedWords] = [];
      }
      wordIndex[sortedWords].push({ query, count });
    }

    // Создаём индекс по стеммированным словам для нечёткого поиска
    const stemIndex: Record<string, { query: string; count: number }[]> = {};
    for (const [query, count] of Object.entries(volumes)) {
      const stemKey = getStemKey(query);
      if (!stemIndex[stemKey]) {
        stemIndex[stemKey] = [];
      }
      stemIndex[stemKey].push({ query, count });
    }

    // Сопоставляем с запрошенными ключевыми словами
    const result: Record<string, number> = {};
    let matched = 0;
    let matchedByWords = 0;
    let matchedByStem = 0;
    const notFound: string[] = [];

    for (const kw of keywords) {
      const normalizedKw = kw.name?.toLowerCase().trim() || kw.toLowerCase().trim();
      
      // 1. Сначала точное совпадение
      if (volumes[normalizedKw]) {
        result[kw.id || kw] = volumes[normalizedKw];
        matched++;
      } else {
        // 2. Поиск по словам без учёта порядка
        const sortedWords = normalizedKw.split(/\s+/).sort().join(' ');
        const candidates = wordIndex[sortedWords];
        
        if (candidates && candidates.length > 0) {
          // Берём с максимальной частотой
          const best = candidates.reduce((a, b) => a.count > b.count ? a : b);
          result[kw.id || kw] = best.count;
          matched++;
          matchedByWords++;
        } else {
          // 3. Поиск по стеммированным словам (нечёткий)
          const stemKey = getStemKey(normalizedKw);
          const stemCandidates = stemIndex[stemKey];
          
          if (stemCandidates && stemCandidates.length > 0) {
            const best = stemCandidates.reduce((a, b) => a.count > b.count ? a : b);
            result[kw.id || kw] = best.count;
            matched++;
            matchedByStem++;
          } else {
            notFound.push(normalizedKw);
          }
        }
      }
    }

    console.log('[LocalVolumes] Matched keywords:', matched, 'of', keywords.length, 
      `(${matchedByWords} by word order, ${matchedByStem} by stem)`);
    if (notFound.length > 0) {
      console.log('[LocalVolumes] Not found:', notFound);
    }

    return NextResponse.json({ 
      success: true, 
      volumes: result,
      totalInDatabase: Object.keys(volumes).length,
      matched
    });
  } catch (error) {
    console.error('Local volumes error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get local volumes' 
    }, { status: 400 });
  }
}
