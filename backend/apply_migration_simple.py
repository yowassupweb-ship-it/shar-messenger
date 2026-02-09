"""
Упрощенное применение миграции без проблем кодировки
Используем прямое подключение с явным указанием кодировки клиента
"""
import os
import sys

# Устанавливаем кодировку клиента ПЕРЕД импортом psycopg2
os.environ['PGCLIENTENCODING'] = 'UTF8'
os.environ['LANG'] = 'en_US.UTF-8'

import psycopg2
from psycopg2 import sql

# Настройки подключения НАПРЯМУЮ (без .env чтобы избежать проблем)
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'shar_messenger',
    'user': 'postgres',
    'password': 'postgres',
    'client_encoding': 'UTF8'
}

def main():
    print("="*70)
    print("  ПРИМЕНЕНИЕ МИГРАЦИИ: СИСТЕМА ПРАВ ДОСТУПА")
    print("="*70)
    print()
    
    # Читаем файл миграции
    migration_file = os.path.join(os.path.dirname(__file__), 'migrations', '001_access_control_system.sql')
    
    if not os.path.exists(migration_file):
        print(f"❌ Файл миграции не найден: {migration_file}")
        return False
    
    print(f"📄 Читаю миграцию: {migration_file}")
    with open(migration_file, 'r', encoding='utf-8') as f:
        migration_sql = f.read()
    
    print(f"📏 Размер миграции: {len(migration_sql)} символов")
    
    try:
        print(f"\n🔌 Подключаюсь к PostgreSQL...")
        print(f"   {DB_CONFIG['user']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
        
        conn = psycopg2.connect(**DB_CONFIG)
        conn.set_client_encoding('UTF8')
        
        print(f"✅ Подключение установлено!")
        
        cursor = conn.cursor()
        
        # Получаем версию PostgreSQL
        cursor.execute("SELECT version()")
        version = cursor.fetchone()[0]
        print(f"\n📊 PostgreSQL: {version.split(',')[0]}")
        
        # Получаем список существующих таблиц
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables_before = [row[0] for row in cursor.fetchall()]
        print(f"\n📋 Существующих таблиц: {len(tables_before)}")
        
        print(f"\n⚙️  Выполняю миграцию...")
        print(f"-" * 70)
        
        # Выполняем миграцию целиком
        cursor.execute(migration_sql)
        conn.commit()
        
        print(f"✅ Миграция выполнена успешно!")
        
        # Проверяем созданные таблицы
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables_after = [row[0] for row in cursor.fetchall()]
        new_tables = set(tables_after) - set(tables_before)
        
        if new_tables:
            print(f"\n✨ Создано новых таблиц: {len(new_tables)}")
            for table in sorted(new_tables):
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"   + {table} ({count} записей)")
        
        # Проверяем функции
        cursor.execute("""
            SELECT proname, pronargs
            FROM pg_proc
            WHERE proname LIKE 'check_%_access'
            ORDER BY proname
        """)
        functions = cursor.fetchall()
        
        if functions:
            print(f"\n🔧 Создано функций: {len(functions)}")
            for func_name, arg_count in functions:
                print(f"   ✓ {func_name}()")
        
        cursor.close()
        conn.close()
        
        print(f"\n" + "="*70)
        print(f"  ✅ МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!")
        print(f"="*70)
        print(f"\n📝 Следующие шаги:")
        print(f"   1. Обновить код для работы с новыми таблицами")
        print(f"   2. Создать API endpoints для отделов/должностей")
        print(f"   3. Интегрировать проверку прав в существующие endpoints")
        print()
        
        return True
        
    except psycopg2.Error as e:
        print(f"\n❌ Ошибка PostgreSQL:")
        print(f"   {e}")
        return False
    except Exception as e:
        print(f"\n❌ Ошибка:")
        print(f"   {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
