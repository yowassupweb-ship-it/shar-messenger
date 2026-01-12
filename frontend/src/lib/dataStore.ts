import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

// Убедиться, что директория data существует
export function ensureDataDir() {
  console.log('[dataStore] DATA_DIR:', DATA_DIR);
  console.log('[dataStore] CWD:', process.cwd());
  if (!fs.existsSync(DATA_DIR)) {
    console.log('[dataStore] Creating data directory');
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Чтение JSON файла
export function readJsonFile<T>(filename: string, defaultValue: T): T {
  try {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    console.log('[dataStore] Reading:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.log('[dataStore] File not found, creating with default');
      writeJsonFile(filename, defaultValue);
      return defaultValue;
    }
    
    let content = fs.readFileSync(filePath, 'utf-8');
    // Удаляем BOM если он есть
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    // Также проверяем UTF-8 BOM в виде байтов
    if (content.startsWith('\ufeff')) {
      content = content.slice(1);
    }
    const parsed = JSON.parse(content) as T;
    console.log('[dataStore] Read success, type:', typeof parsed);
    return parsed;
  } catch (error) {
    console.error(`[dataStore] Error reading ${filename}:`, error);
    return defaultValue;
  }
}

// Запись JSON файла
export function writeJsonFile<T>(filename: string, data: T): void {
  try {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    throw error;
  }
}

// Генерация уникального ID
export function generateId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toISOString().slice(11, 19).replace(/:/g, '');
  const random = Math.random().toString(36).substring(2, 8);
  return `${date}_${time}_${random}`;
}
