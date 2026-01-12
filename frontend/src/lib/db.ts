import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'

// Функция для определения пути к database.json с fallback
function getDbPath(): string {
  const possiblePaths = [
    // Для development: frontend/../backend/database.json
    path.join(process.cwd(), '..', 'backend', 'database.json'),
    // Для production standalone: /var/www/feed-editor/backend/database.json
    '/var/www/feed-editor/backend/database.json',
    // Fallback на переменную окружения
    process.env.DATABASE_PATH || ''
  ].filter(Boolean)
  
  for (const p of possiblePaths) {
    try {
      if (fsSync.existsSync(p)) {
        return p
      }
    } catch {
      continue
    }
  }
  
  // Возвращаем первый путь как default
  return possiblePaths[0]
}

const DB_PATH = getDbPath()

// Экспортируем функцию для использования в API routes
export { getDbPath }

export interface Database {
  settings?: any
  dataSources?: any[]
  feeds?: any[]
  products?: any[]
  users?: any[]
  templates?: any[]
  collections?: any[]
  logs?: any[]
  analytics?: any[]
  wordstatSearches?: Array<{
    id: string
    query: string
    results: any
    timestamp: string
    userId?: string
  }>
  wordstatCache?: Array<{
    key: string
    value: any
    expiresAt: string
  }>
  [key: string]: any
}

/**
 * Читать базу данных
 */
export async function readDB(): Promise<Database> {
  try {
    console.log('[DB] Reading from:', DB_PATH)
    const data = await fs.readFile(DB_PATH, 'utf-8')
    const parsed = JSON.parse(data)
    console.log('[DB] Read successfully, keys:', Object.keys(parsed))
    return parsed
  } catch (error) {
    console.error('[DB] Error reading database from', DB_PATH, ':', error)
    return {}
  }
}

/**
 * Записать базу данных
 */
export async function writeDB(db: Database): Promise<void> {
  try {
    console.log('[DB] Writing to:', DB_PATH)
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8')
    console.log('[DB] Write successful')
  } catch (error) {
    console.error('[DB] Error writing database to', DB_PATH, ':', error)
    throw error // Пробрасываем ошибку чтобы API вернул 500
  }
}

/**
 * Обновить базу данных с помощью функции
 */
export async function updateDB(updater: (db: Database) => Database | Promise<Database>): Promise<Database> {
  const db = await readDB()
  const updated = await updater(db)
  await writeDB(updated)
  return updated
}
