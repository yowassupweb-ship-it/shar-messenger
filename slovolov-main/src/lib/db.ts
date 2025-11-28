// Use require to avoid type/export issues locally; in Vercel this resolves to pg Pool
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Pool } = require('pg') as any

let pool: any = null

export function getPool() {
  if (pool) return pool
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Configure Neon (Vercel Postgres) and set DATABASE_URL in Environment Variables.')
  }
  pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  return pool
}

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const client = await getPool().connect()
  try {
    const res = await client.query(text, params)
    return { rows: res.rows as T[] }
  } finally {
    client.release()
  }
}

export async function initSchema() {
  // idempotent DDL
  await query(`
    create table if not exists chat_sessions (
      id text primary key,
      last_updated timestamptz not null default now()
    );
    create table if not exists chat_messages (
      id text primary key,
      session_id text not null references chat_sessions(id) on delete cascade,
      role text not null check (role in ('user','assistant')),
      content text not null,
      timestamp timestamptz not null default now(),
      phrase text,
      page text
    );
    create table if not exists ai_presets (
      id text primary key,
      name text not null,
      prompt text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists ai_settings (
      id int primary key default 1,
      temperature float not null,
      max_tokens int not null,
      model text not null,
      system_prompt text
    );
    insert into ai_settings (id, temperature, max_tokens, model, system_prompt)
    values (1, 0.7, 2000, 'deepseek-chat', 'Ты - эксперт по контекстной рекламе...')
    on conflict (id) do nothing;
  `)
}
