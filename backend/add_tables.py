"""Создание новых таблиц"""
import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='shar_messenger',
    user='postgres',
    password='Traplord999!'
)

cur = conn.cursor()

# Events table
cur.execute("""
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(100),
    date_type VARCHAR(50),
    start_date DATE,
    end_date DATE,
    tags JSONB DEFAULT '[]',
    participants JSONB DEFAULT '[]',
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
""")

# Links table
cur.execute("""
CREATE TABLE IF NOT EXISTS links (
    id VARCHAR(255) PRIMARY KEY,
    url TEXT NOT NULL,
    title VARCHAR(255),
    description TEXT,
    favicon TEXT,
    image TEXT,
    site_name VARCHAR(255),
    list_id VARCHAR(100),
    tags JSONB DEFAULT '[]',
    is_bookmarked BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    link_order INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_links_list_id ON links(list_id);
CREATE INDEX IF NOT EXISTS idx_links_bookmarked ON links(is_bookmarked);
""")

# Tasks table
cur.execute("""
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT false,
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    list_id VARCHAR(100),
    tags JSONB DEFAULT '[]',
    assigned_by_id VARCHAR(255),
    assigned_by VARCHAR(255),
    assigned_to VARCHAR(255),
    add_to_calendar BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    task_order INTEGER DEFAULT 0,
    assigned_to_ids JSONB DEFAULT '[]',
    due_date TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
""")

conn.commit()
print("✅ Таблицы созданы")
cur.close()
conn.close()
