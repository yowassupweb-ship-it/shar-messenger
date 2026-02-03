import psycopg2

try:
    conn = psycopg2.connect(
        dbname='shar_messenger',
        user='postgres',
        password='Traplord999!',
        host='localhost'
    )
    cur = conn.cursor()
    
    # Список таблиц
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE' 
        ORDER BY table_name
    """)
    
    tables = [row[0] for row in cur.fetchall()]
    print("=== PostgreSQL Tables ===")
    print('\n'.join(tables))
    
    # Проверяем структуру links
    if 'links' in tables:
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'links' 
            ORDER BY ordinal_position
        """)
        print("\n=== Links columns ===")
        for row in cur.fetchall():
            print(f"{row[0]}: {row[1]}")
    
    # Проверяем структуру tasks
    if 'tasks' in tables:
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tasks' 
            ORDER BY ordinal_position
        """)
        print("\n=== Tasks columns ===")
        for row in cur.fetchall():
            print(f"{row[0]}: {row[1]}")
    
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")
