"""
Скрипт для создания базы данных и инициализации схемы PostgreSQL (без .env)
"""
import os
import sys

# Устанавливаем кодировку для Windows
if sys.platform == 'win32':
    os.environ['PGCLIENTENCODING'] = 'UTF8'

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Явные параметры подключения
DB_HOST = 'localhost'
DB_PORT = 5432
DB_NAME = 'shar_messenger'
DB_USER = 'postgres'
DB_PASSWORD = 'postgres'

def create_database():
    """Создать базу данных если не существует"""
    print(f"🔌 Подключаемся к PostgreSQL ({DB_USER}@{DB_HOST}:{DB_PORT})...")
    
    try:
        # Подключаемся к postgres для создания БД
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database='postgres',
            user=DB_USER,
            password=DB_PASSWORD,
            options='-c client_encoding=UTF8'
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Проверяем существует ли БД
        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{DB_NAME}'")
        exists = cursor.fetchone()
        
        if not exists:
            print(f"📦 Создаём базу данных {DB_NAME}...")
            cursor.execute(f'CREATE DATABASE {DB_NAME}')
            print(f"✅ База данных {DB_NAME} создана")
        else:
            print(f"ℹ️  База данных {DB_NAME} уже существует")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Ошибка при создании БД: {e}")
        return False

def init_schema():
    """Инициализировать схему из schema.sql"""
    print(f"\n📋 Инициализация схемы из schema.sql...")
    
    try:
        # Подключаемся к созданной БД
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            options='-c client_encoding=UTF8'
        )
        cursor = conn.cursor()
        
        # Читаем schema.sql
        schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        # Выполняем SQL
        cursor.execute(schema_sql)
        conn.commit()
        
        print(f"✅ Схема успешно инициализирована")
        
        # Проверяем созданные таблицы
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        print(f"\n📊 Созданные таблицы ({len(tables)}):")
        for table in tables:
            print(f"   ✓ {table[0]}")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Ошибка при инициализации схемы: {e}")
        return False
    except FileNotFoundError:
        print(f"❌ Файл schema.sql не найден")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("Инициализация PostgreSQL базы данных")
    print("=" * 60)
    
    if create_database():
        if init_schema():
            print("\n" + "=" * 60)
            print("✅ Инициализация завершена успешно!")
            print("=" * 60)
            print(f"\nТеперь можно запустить миграцию данных:")
            print(f"  python migrate_to_postgres.py")
        else:
            print("\n❌ Ошибка при инициализации схемы")
    else:
        print("\n❌ Ошибка при создании базы данных")
