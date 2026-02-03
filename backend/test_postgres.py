"""Тест подключения к PostgreSQL через адаптер"""
from dotenv import load_dotenv
load_dotenv()

from db_adapter import db

users = db.get_users()
print(f'✅ PostgreSQL работает! Найдено пользователей: {len(users)}')
print('Пользователи:')
for u in users:
    print(f"  - {u.get('username')}: {u.get('name')} ({u.get('role')})")
