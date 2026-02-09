"""
Применение миграции системы прав доступа
"""
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

# Настройки подключения из .env
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', '5432'))
DB_NAME = os.getenv('DB_NAME', 'shar_messenger')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')

def check_connection():
    """Проверка подключения к PostgreSQL"""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            connect_timeout=10
        )
        conn.close()
        print(f"✅ Успешное подключение к PostgreSQL")
        print(f"   Сервер: {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
        return True
    except psycopg2.Error as e:
        print(f"❌ Ошибка подключения к PostgreSQL:")
        print(f"   {e}")
        print(f"\n💡 Проверьте:")
        print(f"   1. PostgreSQL запущен на {DB_HOST}:{DB_PORT}")
        print(f"   2. База данных '{DB_NAME}' существует")
        print(f"   3. Пользователь '{DB_USER}' имеет права доступа")
        print(f"   4. Пароль корректный")
        print(f"   5. Файл .env содержит правильные настройки")
        return False

def get_existing_tables(conn):
    """Получить список существующих таблиц"""
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        return [row[0] for row in cursor.fetchall()]

def apply_migration(migration_file):
    """Применить миграцию из файла"""
    print(f"\n🔄 Применение миграции: {migration_file}")
    
    # Читаем файл миграции
    if not os.path.exists(migration_file):
        print(f"❌ Файл миграции не найден: {migration_file}")
        return False
    
    with open(migration_file, 'r', encoding='utf-8') as f:
        migration_sql = f.read()
    
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            connect_timeout=10
        )
        
        print(f"📊 Существующие таблицы ДО миграции:")
        tables_before = get_existing_tables(conn)
        for table in tables_before:
            print(f"   - {table}")
        
        print(f"\n⚙️  Выполнение миграции...")
        
        # Выполняем миграцию
        with conn.cursor() as cursor:
            # Разбиваем на отдельные команды по двойному переносу строки
            commands = [cmd.strip() for cmd in migration_sql.split(';\n') if cmd.strip()]
            
            for i, command in enumerate(commands, 1):
                if command and not command.startswith('--') and command.strip() != '':
                    try:
                        cursor.execute(command + ';' if not command.endswith(';') else command)
                        # Проверяем что именно создали/изменили
                        if 'CREATE TABLE' in command.upper():
                            table_name = command.split('IF NOT EXISTS')[1].split('(')[0].strip() if 'IF NOT EXISTS' in command.upper() else ''
                            print(f"   ✓ Таблица: {table_name}")
                        elif 'CREATE INDEX' in command.upper():
                            print(f"   ✓ Индекс создан")
                        elif 'CREATE FUNCTION' in command.upper() or 'CREATE OR REPLACE FUNCTION' in command.upper():
                            print(f"   ✓ Функция создана")
                        elif 'ALTER TABLE' in command.upper():
                            print(f"   ✓ ALTER TABLE выполнен")
                        elif 'INSERT INTO' in command.upper():
                            print(f"   ✓ Данные вставлены")
                    except psycopg2.Error as e:
                        # Игнорируем ошибки "already exists" и "duplicate"
                        if 'already exists' not in str(e) and 'duplicate' not in str(e).lower():
                            print(f"   ⚠️  Ошибка в команде {i}: {e}")
        
        conn.commit()
        
        print(f"\n📊 Существующие таблицы ПОСЛЕ миграции:")
        tables_after = get_existing_tables(conn)
        for table in tables_after:
            if table not in tables_before:
                print(f"   + {table} (новая)")
            else:
                print(f"   - {table}")
        
        conn.close()
        
        print(f"\n✅ Миграция успешно применена!")
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Ошибка при применении миграции:")
        print(f"   {e}")
        return False

def verify_migration():
    """Проверка результатов миграции"""
    print(f"\n🔍 Проверка созданных структур...")
    
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            connect_timeout=10
        )
        
        # Проверяем созданные таблицы
        required_tables = [
            'departments',
            'positions',
            'calendar_lists',
            'calendar_list_permissions',
            'task_permissions',
            'content_plan_permissions'
        ]
        
        with conn.cursor() as cursor:
            for table in required_tables:
                cursor.execute(f"""
                    SELECT COUNT(*) 
                    FROM information_schema.tables 
                    WHERE table_name = %s
                """, (table,))
                exists = cursor.fetchone()[0] > 0
                
                if exists:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    print(f"   ✓ {table}: {count} записей")
                else:
                    print(f"   ✗ {table}: не найдена")
        
        # Проверяем функции
        functions = [
            'check_calendar_access',
            'check_task_access',
            'check_content_plan_access'
        ]
        
        print(f"\n🔧 Проверка функций:")
        with conn.cursor() as cursor:
            for func in functions:
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM pg_proc 
                    WHERE proname = %s
                """, (func,))
                exists = cursor.fetchone()[0] > 0
                print(f"   {'✓' if exists else '✗'} {func}")
        
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Ошибка при проверке:")
        print(f"   {e}")
        return False

def main():
    print("="*60)
    print("  ПРИМЕНЕНИЕ МИГРАЦИИ: СИСТЕМА ПРАВ ДОСТУПА")
    print("="*60)
    
    # Проверка подключения
    if not check_connection():
        sys.exit(1)
    
    # Применение миграции
    migration_file = os.path.join(os.path.dirname(__file__), 'migrations', '001_access_control_system.sql')
    if not apply_migration(migration_file):
        sys.exit(1)
    
    # Проверка результатов
    if not verify_migration():
        sys.exit(1)
    
    print("\n" + "="*60)
    print("  ✅ МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!")
    print("="*60)
    print("\n📝 Следующие шаги:")
    print("   1. Обновите Python код для использования новых таблиц")
    print("   2. Создайте API endpoints для управления отделами/должностями")
    print("   3. Интегрируйте проверку прав в существующие endpoints")
    print("   4. Обновите frontend для работы с правами доступа")
    print()

if __name__ == '__main__':
    main()
