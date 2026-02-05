import os
import json
os.environ['USE_POSTGRES'] = 'true'

from db_postgres import PostgresConnection, PostgresDatabase

# Load JSON
with open('database.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Connect
conn = PostgresConnection()
conn.connect()

db = PostgresDatabase(conn)

# Try to add first user
user = data['users'][0]
print(f"\n📦 Trying to add user: {user['name']} ({user['username']})")
print(f"   ID: {user['id']}")
print(f"   Email: {user.get('email', 'NO EMAIL')}")

try:
    result = db.add_user(user)
    print(f"   ✅ Result: {result}")
    
    # Check if user was added
    check = db.get_user(user['id'])
    print(f"   ✅ Verification: {check is not None}")
    if check:
        print(f"      Found: {check['username']} - {check['name']}")
    
except Exception as e:
    print(f"   ❌ Error: {e}")
    import traceback
    traceback.print_exc()

# Check all users
users = db.get_users()
print(f"\n📊 Total users in database: {len(users)}")

conn.disconnect()
