import psycopg2
import sys
import os
from dotenv import load_dotenv

load_dotenv()

try:
    password = os.getenv('DB_PASSWORD', 'Traplord999!')
    host = os.getenv('DB_HOST', 'localhost')
    port = os.getenv('DB_PORT', '5432')
    dbname = os.getenv('DB_NAME', 'shar_messenger')
    user = os.getenv('DB_USER', 'postgres')
    
    conn = psycopg2.connect(
        dbname=dbname,
        user=user,
        password=password,
        host=host,
        port=port
    )
    cur = conn.cursor()
    
    queries = [
        'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_response TEXT'
    ]
    
    for query in queries:
        print(f"Executing: {query}")
        cur.execute(query)
    
    conn.commit()
    print("\nColumn assignee_response added successfully!")
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
finally:
    if 'conn' in locals() and conn:
        conn.close()
