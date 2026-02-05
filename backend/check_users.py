import os
os.environ['USE_POSTGRES'] = 'true'

from db_adapter import db

users = db.get_users()
print(f'Total users in PostgreSQL: {len(users)}')
print('-' * 60)

for u in users:
    uid = u['id']
    if len(uid) > 30:
        uid = uid[:30] + '...'
    print(f"{uid} - {u['username']} ({u['name']}) - {u['role']}")
