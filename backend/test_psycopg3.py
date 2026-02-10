import psycopg

try:
    print("Connecting to PostgreSQL...")
    conn = psycopg.connect(
        host='127.0.0.1',
        port=5432,
        dbname='shar_messenger',
        user='postgres',
        password='postgres',
        autocommit=True
    )
    print("✓ Connected successfully!")
    
    # Test query
    with conn.cursor() as cur:
        cur.execute("SELECT version()")
        version = cur.fetchone()
        print(f"PostgreSQL version: {version[0]}")
    
    conn.close()
except Exception as e:
    print(f"✗ Connection failed: {e}")
    print(f"Error type: {type(e).__name__}")
