"""
Повторная миграция пользователей из database.json в PostgreSQL
"""
import json
import psycopg2
from datetime import datetime

DB_HOST = 'localhost'
DB_PORT = 5432
DB_NAME = 'shar_messenger'
DB_USER = 'postgres'
DB_PASSWORD = 'Traplord999!'

def migrate_users():
    # Читаем JSON
    with open('database.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    users = data.get('users', [])
    print(f"📦 Найдено пользователей в JSON: {len(users)}")
    
    # Подключаемся к PostgreSQL
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    conn.autocommit = True
    cur = conn.cursor()
    
    migrated = 0
    for user in users:
        try:
            # Приводим ключи к snake_case как в БД
            cur.execute("""
                INSERT INTO users (
                    id, name, username, email, password, role, todo_role,
                    position, department, phone, work_schedule, enabled_tools,
                    can_see_all_tasks, is_online, last_seen, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    username = EXCLUDED.username,
                    email = EXCLUDED.email,
                    is_online = EXCLUDED.is_online,
                    last_seen = EXCLUDED.last_seen
            """, (
                user.get('id'),
                user.get('name'),
                user.get('username'),
                user.get('email'),
                user.get('password'),
                user.get('role', 'user'),
                user.get('todoRole', 'universal'),
                user.get('position'),
                user.get('department'),
                user.get('phone'),
                user.get('workSchedule'),
                json.dumps(user.get('enabledTools', [])),
                user.get('canSeeAllTasks', False),
                user.get('isOnline', False),
                user.get('lastSeen'),
                user.get('createdAt')
            ))
            migrated += 1
            print(f"   ✓ {user.get('name')} ({user.get('username')})")
        except Exception as e:
            print(f"   ❌ Ошибка при миграции {user.get('name')}: {e}")
    
    # Проверяем результат
    cur.execute("SELECT COUNT(*) FROM users")
    count = cur.fetchone()[0]
    print(f"\n✅ Мигрировано: {migrated}/{len(users)}")
    print(f"📊 Всего в БД: {count} пользователей")
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    migrate_users()
