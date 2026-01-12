import { promises as fs } from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');
const POSITIONS_CACHE_FILE = path.join(CACHE_DIR, 'positions-cache.json');

interface PositionCache {
  [projectId: string]: {
    positions: any[];
    lastUpdated: string;
    keywords: number[];
  };
}

async function ensureCacheDir() {
  try {
    await fs.access(CACHE_DIR);
  } catch {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  }
}

export async function getPositionsCache(projectId: number): Promise<{
  positions: any[];
  lastUpdated: string;
  keywords: number[];
} | null> {
  try {
    await ensureCacheDir();
    const data = await fs.readFile(POSITIONS_CACHE_FILE, 'utf-8');
    const cache: PositionCache = JSON.parse(data);
    return cache[projectId.toString()] || null;
  } catch {
    return null;
  }
}

export async function setPositionsCache(
  projectId: number,
  positions: any[],
  keywords: number[]
): Promise<void> {
  try {
    await ensureCacheDir();
    
    let cache: PositionCache = {};
    try {
      const data = await fs.readFile(POSITIONS_CACHE_FILE, 'utf-8');
      cache = JSON.parse(data);
    } catch {
      // File doesn't exist yet
    }
    
    cache[projectId.toString()] = {
      positions,
      lastUpdated: new Date().toISOString(),
      keywords
    };
    
    await fs.writeFile(POSITIONS_CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('Error saving positions cache:', error);
  }
}

export async function clearPositionsCache(projectId?: number): Promise<void> {
  try {
    if (projectId) {
      const data = await fs.readFile(POSITIONS_CACHE_FILE, 'utf-8');
      const cache: PositionCache = JSON.parse(data);
      delete cache[projectId.toString()];
      await fs.writeFile(POSITIONS_CACHE_FILE, JSON.stringify(cache, null, 2));
    } else {
      await fs.writeFile(POSITIONS_CACHE_FILE, '{}');
    }
  } catch {
    // Ignore errors
  }
}
