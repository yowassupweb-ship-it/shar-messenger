import fs from 'fs/promises'
import path from 'path'

const DB_PATH = path.join(process.cwd(), '..', 'backend', 'database.json')

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
    const data = await fs.readFile(DB_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading database:', error)
    return {}
  }
}

/**
 * Записать базу данных
 */
export async function writeDB(db: Database): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8')
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
