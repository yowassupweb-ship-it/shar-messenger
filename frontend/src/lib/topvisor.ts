import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'topvisor-config.json');

export interface TopvisorConfig {
  apiKey: string;
  userId: string;
  projectId?: string;
  projectName?: string;
}

/**
 * Get Topvisor configuration from server-side storage
 */
export function getTopvisorConfig(): TopvisorConfig | null {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (error) {
    console.error('Error reading Topvisor config:', error);
  }
  return null;
}

/**
 * Save Topvisor configuration to server-side storage
 */
export function saveTopvisorConfig(config: TopvisorConfig): boolean {
  try {
    const dataDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving Topvisor config:', error);
    return false;
  }
}

/**
 * Make a request to Topvisor API
 */
export async function topvisorRequest<T = unknown>(
  endpoint: string, 
  body: object = {}
): Promise<T> {
  const config = getTopvisorConfig();
  if (!config?.apiKey || !config?.userId) {
    throw new Error('Topvisor not configured');
  }

  console.log(`[Topvisor] Request to: ${endpoint}`);
  console.log(`[Topvisor] Body:`, JSON.stringify(body).slice(0, 500));

  const response = await fetch(`https://api.topvisor.com/v2/json/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Id': config.userId,
      'Authorization': `bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  
  console.log(`[Topvisor] Response status: ${response.status}`);
  
  if (data.errors && data.errors.length > 0) {
    const errorCode = data.errors[0].code;
    // Код 4002 = "проверка уже запущена" - это не критическая ошибка
    if (errorCode !== 4002) {
      console.error(`[Topvisor] API Error:`, data.errors);
    }
    const error = new Error(data.errors[0].string || data.errors[0].message || 'Topvisor API error');
    (error as any).code = errorCode;
    throw error;
  }

  return data;
}

/**
 * Get current project ID from config
 */
export function getCurrentProjectId(): string | undefined {
  const config = getTopvisorConfig();
  return config?.projectId;
}
