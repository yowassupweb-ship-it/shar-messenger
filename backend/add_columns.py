import psycopg2
import sys
import os

try:
    password = os.getenv('DB_PASSWORD', 'Traplord999!')
    
    conn = psycopg2.connect(
        dbname='shar_messenger',
        user='postgres',
        password=password,
        host='localhost'
    )
    cur = conn.cursor()
    
    queries = [
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id VARCHAR(255)',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(255)',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_department_head BOOLEAN DEFAULT false',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true'
    ]
    
    for query in queries:
        print(f"Executing: {query}")
        cur.execute(query)
    
    conn.commit()
    print("\nAll columns added successfully!")
    
    cur.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
    """)
    
    print("\nCurrent table structure:")
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]} (nullable: {row[2]}, default: {row[3]})")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
