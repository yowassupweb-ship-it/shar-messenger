import os
from dotenv import load_dotenv

load_dotenv()

print(f"USE_POSTGRES from env: '{os.getenv('USE_POSTGRES')}'")
print(f"USE_POSTGRES lower: '{os.getenv('USE_POSTGRES', 'false').lower()}'")
print(f"USE_POSTGRES bool: {os.getenv('USE_POSTGRES', 'false').lower() == 'true'}")

if os.getenv('USE_POSTGRES', 'false').lower() == 'true':
    print("\n✅ PostgreSQL is ENABLED")
    from db_postgres import PostgresConnection
    conn = PostgresConnection()
    if conn.connect():
        print("✅ Connected to PostgreSQL successfully")
        result = conn.fetch_one("SELECT COUNT(*) as count FROM users")
        print(f"Users in PostgreSQL: {result['count'] if result else 0}")
        conn.disconnect()
else:
    print("\n❌ PostgreSQL is DISABLED - using JSON")
    from database import Database
    db = Database('database.json')
    print(f"Users in JSON: {len(db.get_users())}")
