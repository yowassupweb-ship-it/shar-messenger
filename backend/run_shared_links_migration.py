#!/usr/bin/env python3
"""
Выполняем миграцию: удаляем FK constraint из shared_links
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Устанавливаем USE_POSTGRES для подключения
os.environ['USE_POSTGRES'] = 'true'

from db_postgres import PostgresConnection

def main():
    conn = PostgresConnection()
    
    # Сначала создаем таблицу если ее нет (без FK constraint)
    print("Ensuring shared_links table exists...")
    from db_postgres import PostgresDatabase
    db = PostgresDatabase(conn)
    db._ensure_shared_links_table()
    print("✓ Table created/verified")
    
    # Теперь удаляем FK constraint если он существует
    print("\nRemoving FK constraint...")
    sql = "ALTER TABLE shared_links DROP CONSTRAINT IF EXISTS shared_links_created_by_fkey;"
    
    try:
        conn.execute_query(sql)
        print("✓ Migration executed successfully")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Проверяем результат
    check_sql = """
    SELECT constraint_name, constraint_type
    FROM information_schema.table_constraints
    WHERE table_name = 'shared_links'
    ORDER BY constraint_type, constraint_name;
    """
    
    print("\nCurrent constraints on shared_links:")
    results = conn.fetch_all(check_sql)
    for row in results:
        print(f"  - {row['constraint_name']}: {row['constraint_type']}")
    
    print("\n✓ Done!")

if __name__ == '__main__':
    main()
