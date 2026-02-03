"""
Полная миграция всех данных из JSON файлов в PostgreSQL
Включает данные из backend/database.json и frontend/data/*.json
"""
import json
import os
import psycopg2
from datetime import datetime
from pathlib import Path

DB_HOST = 'localhost'
DB_PORT = 5432
DB_NAME = 'shar_messenger'
DB_USER = 'postgres'
DB_PASSWORD = 'Traplord999!'

def load_json(file_path):
    """Загрузить JSON файл"""
    if not os.path.exists(file_path):
        print(f"⚠️  Файл не найден: {file_path}")
        return {}
    
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def clear_database(conn):
    """Очистить все таблицы"""
    print("\n🗑️  Очистка базы данных...")
    cur = conn.cursor()
    
    cur.execute("SET session_replication_role = 'replica';")
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    """)
    tables = cur.fetchall()
    
    for (table_name,) in tables:
        cur.execute(f"TRUNCATE TABLE {table_name} CASCADE")
    
    cur.execute("SET session_replication_role = 'origin';")
    conn.commit()
    print(f"✅ Очищено таблиц: {len(tables)}\n")
    cur.close()

def migrate_users(conn, backend_data):
    """Миграция пользователей из backend/database.json"""
    users = backend_data.get('users', [])
    if not users:
        print("⚠️  Пользователи не найдены")
        return 0
    
    print(f"📦 Миграция {len(users)} пользователей...")
    cur = conn.cursor()
    migrated = 0
    
    for user in users:
        try:
            # Генерируем username если его нет
            username = user.get('username') or user.get('email', '').split('@')[0] or f"user_{user.get('id')}"
            
            cur.execute("""
                INSERT INTO users (
                    id, name, username, email, password, role, todo_role,
                    position, department, phone, work_schedule, enabled_tools,
                    can_see_all_tasks, is_online, last_seen, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    is_online = EXCLUDED.is_online,
                    last_seen = EXCLUDED.last_seen
            """, (
                user.get('id'), user.get('name'), username,
                user.get('email'), user.get('password'), user.get('role', 'user'),
                user.get('todoRole', 'universal'), user.get('position'),
                user.get('department'), user.get('phone'), user.get('workSchedule'),
                json.dumps(user.get('enabledTools', [])),
                user.get('canSeeAllTasks', False), user.get('isOnline', False),
                user.get('lastSeen'), user.get('createdAt')
            ))
            migrated += 1
            print(f"   ✓ {user.get('name')} ({username})")
        except Exception as e:
            print(f"   ❌ {user.get('name')}: {e}")
    
    conn.commit()
    cur.close()
    print(f"✅ Мигрировано: {migrated}/{len(users)}\n")
    return migrated

def migrate_events(conn, frontend_data):
    """Миграция событий из frontend/data/events.json"""
    events_data = load_json(frontend_data / 'events.json')
    events = events_data.get('events', [])
    
    if not events:
        print("⚠️  События не найдены\n")
        return 0
    
    print(f"📦 Миграция {len(events)} событий...")
    cur = conn.cursor()
    migrated = 0
    
    for event in events:
        try:
            cur.execute("""
                INSERT INTO events (
                    id, title, description, event_type, date_type, start_date, end_date,
                    tags, participants, created_by, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    updated_at = EXCLUDED.updated_at
            """, (
                event.get('id'), event.get('title'), event.get('description'),
                event.get('type'), event.get('dateType'), event.get('startDate'),
                event.get('endDate'), json.dumps(event.get('tags', [])),
                json.dumps(event.get('participants', [])), event.get('createdBy'),
                event.get('createdAt'), event.get('updatedAt')
            ))
            migrated += 1
            print(f"   ✓ {event.get('title')}")
        except Exception as e:
            print(f"   ❌ {event.get('title')}: {e}")
    
    conn.commit()
    cur.close()
    print(f"✅ Мигрировано: {migrated}/{len(events)}\n")
    return migrated

def migrate_links(conn, frontend_data):
    """Миграция ссылок из frontend/data/links.json"""
    links_data = load_json(frontend_data / 'links.json')
    links = links_data.get('links', [])
    
    if not links:
        print("⚠️  Ссылки не найдены\n")
        return 0
    
    print(f"📦 Миграция {len(links)} ссылок...")
    cur = conn.cursor()
    migrated = 0
    
    for link in links:
        try:
            cur.execute("""
                INSERT INTO links (
                    id, url, title, description, favicon, image, site_name,
                    list_id, tags, is_bookmarked, is_pinned, click_count,
                    created_at, updated_at, link_order
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    click_count = EXCLUDED.click_count,
                    updated_at = EXCLUDED.updated_at
            """, (
                link.get('id'), link.get('url'), link.get('title'),
                link.get('description'), link.get('favicon'), link.get('image'),
                link.get('siteName'), link.get('listId'),
                json.dumps(link.get('tags', [])), link.get('isBookmarked', False),
                link.get('isPinned', False), link.get('clickCount', 0),
                link.get('createdAt'), link.get('updatedAt'), link.get('order', 0)
            ))
            migrated += 1
            print(f"   ✓ {link.get('title')[:50]}")
        except Exception as e:
            print(f"   ❌ {link.get('title')}: {e}")
    
    conn.commit()
    cur.close()
    print(f"✅ Мигрировано: {migrated}/{len(links)}\n")
    return migrated

def migrate_tasks(conn, frontend_data):
    """Миграция задач из frontend/data/todos.json"""
    todos_data = load_json(frontend_data / 'todos.json')
    todos = todos_data.get('todos', [])
    
    if not todos:
        print("⚠️  Задачи не найдены\n")
        return 0
    
    print(f"📦 Миграция {len(todos)} задач...")
    cur = conn.cursor()
    migrated = 0
    
    for todo in todos:
        try:
            cur.execute("""
                INSERT INTO tasks (
                    id, title, description, is_completed, priority, status,
                    list_id, tags, assigned_by_id, assigned_by, assigned_to,
                    add_to_calendar, created_at, updated_at, task_order,
                    assigned_to_ids, due_date
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    is_completed = EXCLUDED.is_completed,
                    status = EXCLUDED.status,
                    updated_at = EXCLUDED.updated_at
            """, (
                todo.get('id'), todo.get('title'), todo.get('description'),
                todo.get('completed', False), todo.get('priority', 'medium'),
                todo.get('status', 'pending'), todo.get('listId'),
                json.dumps(todo.get('tags', [])), todo.get('assignedById'),
                todo.get('assignedBy'), todo.get('assignedTo'),
                todo.get('addToCalendar', False), todo.get('createdAt'),
                todo.get('updatedAt'), todo.get('order', 0),
                json.dumps(todo.get('assignedToIds', [])), todo.get('dueDate')
            ))
            migrated += 1
            print(f"   ✓ {todo.get('title')[:50]}")
        except Exception as e:
            print(f"   ❌ {todo.get('title')}: {e}")
    
    conn.commit()
    cur.close()
    print(f"✅ Мигрировано: {migrated}/{len(todos)}\n")
    return migrated

def migrate_backend_data(conn, backend_data):
    """Миграция данных из backend/database.json"""
    # Data sources
    sources = backend_data.get('dataSources', [])
    if sources:
        print(f"📦 Миграция {len(sources)} источников данных...")
        cur = conn.cursor()
        migrated = 0
        for source in sources:
            try:
                cur.execute("""
                    INSERT INTO data_sources (
                        id, name, url, source_type, enabled, auto_sync,
                        sync_interval, is_parsing, last_sync, created_at, metadata
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
                """, (
                    source.get('id'), source.get('name'), source.get('url'),
                    source.get('sourceType'), source.get('enabled', True),
                    source.get('autoSync', False), source.get('syncInterval', 3600),
                    source.get('isParsing', False), source.get('lastSync'),
                    source.get('createdAt'), json.dumps(source.get('metadata', {}))
                ))
                migrated += 1
                print(f"   ✓ {source.get('name')}")
            except Exception as e:
                print(f"   ❌ {source.get('name')}: {e}")
        conn.commit()
        cur.close()
        print(f"✅ Мигрировано источников: {migrated}/{len(sources)}\n")
    
    # Products
    products = backend_data.get('products', [])
    if products:
        print(f"📦 Миграция {len(products)} продуктов (это может занять время)...")
        cur = conn.cursor()
        batch_size = 500
        migrated = 0
        
        for i in range(0, len(products), batch_size):
            batch = products[i:i+batch_size]
            for product in batch:
                try:
                    cur.execute("""
                        INSERT INTO products (
                            id, name, description, price, old_price, url, image_url,
                            category, source_id, dates, hidden, created_at, updated_at, metadata
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            price = EXCLUDED.price,
                            updated_at = EXCLUDED.updated_at
                    """, (
                        product.get('id'), product.get('name'), product.get('description'),
                        product.get('price'), product.get('oldPrice'), product.get('url'),
                        product.get('imageUrl'), product.get('category'), product.get('sourceId'),
                        json.dumps(product.get('dates', [])), product.get('hidden', False),
                        product.get('createdAt'), product.get('updatedAt'),
                        json.dumps(product.get('metadata', {}))
                    ))
                    migrated += 1
                except Exception as e:
                    print(f"   ❌ {product.get('name')}: {e}")
            
            conn.commit()
            print(f"   ✓ Обработано {min(i+batch_size, len(products))}/{len(products)}")
        
        cur.close()
        print(f"✅ Мигрировано продуктов: {migrated}/{len(products)}\n")

def main():
    print("=" * 70)
    print("ПОЛНАЯ МИГРАЦИЯ ДАННЫХ В POSTGRESQL")
    print("=" * 70)
    
    # Пути к файлам
    backend_json = Path('database.json')
    frontend_data = Path('../frontend/data')
    
    # Загружаем backend данные
    print(f"\n📂 Загрузка backend/database.json...")
    backend_data = load_json(backend_json)
    
    # Подключаемся к PostgreSQL
    print(f"🔌 Подключение к PostgreSQL...")
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    conn.autocommit = False
    print(f"✅ Подключено к {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}\n")
    
    # Очищаем базу
    clear_database(conn)
    
    # Миграция данных
    total = 0
    total += migrate_users(conn, backend_data)
    total += migrate_events(conn, frontend_data)
    total += migrate_links(conn, frontend_data)
    total += migrate_tasks(conn, frontend_data)
    migrate_backend_data(conn, backend_data)
    
    conn.close()
    
    print("=" * 70)
    print(f"✅ МИГРАЦИЯ ЗАВЕРШЕНА! Всего записей: {total}")
    print("=" * 70)

if __name__ == '__main__':
    main()
