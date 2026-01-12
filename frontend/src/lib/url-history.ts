import { promises as fs } from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');
const URL_HISTORY_FILE = path.join(CACHE_DIR, 'url-history.json');

interface UrlChange {
  date: string;
  url: string;
}

interface KeywordUrlHistory {
  current_url: string;
  history: UrlChange[];
}

interface ProjectUrlHistory {
  [keywordId: string]: KeywordUrlHistory;
}

interface UrlHistoryData {
  [projectId: string]: ProjectUrlHistory;
}

async function ensureCacheDir() {
  try {
    await fs.access(CACHE_DIR);
  } catch {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  }
}

async function loadUrlHistory(): Promise<UrlHistoryData> {
  try {
    await ensureCacheDir();
    const data = await fs.readFile(URL_HISTORY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveUrlHistory(data: UrlHistoryData): Promise<void> {
  await ensureCacheDir();
  await fs.writeFile(URL_HISTORY_FILE, JSON.stringify(data, null, 2));
}

// Обновить URL для ключевого слова и вернуть информацию об изменении
export async function updateKeywordUrl(
  projectId: number,
  keywordId: number,
  newUrl: string | null
): Promise<{
  changed: boolean;
  previousUrl?: string;
  history: UrlChange[];
}> {
  if (!newUrl) {
    return { changed: false, history: [] };
  }

  const data = await loadUrlHistory();
  const projectKey = projectId.toString();
  const keywordKey = keywordId.toString();

  if (!data[projectKey]) {
    data[projectKey] = {};
  }

  const keywordHistory = data[projectKey][keywordKey];
  const now = new Date().toISOString();

  if (!keywordHistory) {
    // Первая запись для этого ключевого слова
    data[projectKey][keywordKey] = {
      current_url: newUrl,
      history: [{ date: now, url: newUrl }]
    };
    await saveUrlHistory(data);
    return { changed: false, history: [{ date: now, url: newUrl }] };
  }

  const previousUrl = keywordHistory.current_url;

  if (previousUrl !== newUrl) {
    // URL изменился!
    keywordHistory.history.push({ date: now, url: newUrl });
    keywordHistory.current_url = newUrl;
    await saveUrlHistory(data);
    return {
      changed: true,
      previousUrl,
      history: keywordHistory.history
    };
  }

  // URL не изменился
  return { changed: false, history: keywordHistory.history };
}

// Массовое обновление URL и получение изменений
export async function updateKeywordsUrls(
  projectId: number,
  keywordsWithUrls: Array<{ id: number; url: string | null }>
): Promise<Record<number, { changed: boolean; previousUrl?: string; history: UrlChange[] }>> {
  const data = await loadUrlHistory();
  const projectKey = projectId.toString();
  const now = new Date().toISOString();

  if (!data[projectKey]) {
    data[projectKey] = {};
  }

  const results: Record<number, { changed: boolean; previousUrl?: string; history: UrlChange[] }> = {};
  let hasChanges = false;

  for (const { id, url } of keywordsWithUrls) {
    if (!url) {
      results[id] = { changed: false, history: [] };
      continue;
    }

    const keywordKey = id.toString();
    const keywordHistory = data[projectKey][keywordKey];

    if (!keywordHistory) {
      // Первая запись
      data[projectKey][keywordKey] = {
        current_url: url,
        history: [{ date: now, url }]
      };
      results[id] = { changed: false, history: [{ date: now, url }] };
      hasChanges = true;
    } else if (keywordHistory.current_url !== url) {
      // URL изменился
      const previousUrl = keywordHistory.current_url;
      keywordHistory.history.push({ date: now, url });
      keywordHistory.current_url = url;
      results[id] = { changed: true, previousUrl, history: keywordHistory.history };
      hasChanges = true;
    } else {
      // Без изменений
      results[id] = { changed: false, history: keywordHistory.history };
    }
  }

  if (hasChanges) {
    await saveUrlHistory(data);
  }

  return results;
}

// Получить историю URL для проекта
export async function getProjectUrlHistory(projectId: number): Promise<ProjectUrlHistory> {
  const data = await loadUrlHistory();
  return data[projectId.toString()] || {};
}

// Получить историю URL для конкретного ключевого слова
export async function getKeywordUrlHistory(
  projectId: number,
  keywordId: number
): Promise<KeywordUrlHistory | null> {
  const data = await loadUrlHistory();
  const projectData = data[projectId.toString()];
  if (!projectData) return null;
  return projectData[keywordId.toString()] || null;
}
