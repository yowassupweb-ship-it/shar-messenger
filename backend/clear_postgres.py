"""
Очистка PostgreSQL базы данных перед повторной миграцией
"""
import psycopg2

DB_HOST = 'localhost'
DB_PORT = 5432
DB_NAME = 'shar_messenger'
DB_USER = 'postgres'
DB_PASSWORD = 'Traplord999!'

def clear_database():
    print("🗑️  Очистка базы данных...")
    
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    conn.autocommit = True
    cur = conn.cursor()
    
    # Отключаем проверку внешних ключей
    cur.execute("SET session_replication_role = 'replica';")
    
    # Получаем список таблиц
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    """)
    tables = cur.fetchall()
    
    # Очищаем каждую таблицу
    for (table_name,) in tables:
        print(f"   Очистка {table_name}...")
        cur.execute(f"TRUNCATE TABLE {table_name} CASCADE")
    
    # Включаем проверку внешних ключей обратно
    cur.execute("SET session_replication_role = 'origin';")
    
    print(f"✅ Очищено таблиц: {len(tables)}")
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    clear_database()
