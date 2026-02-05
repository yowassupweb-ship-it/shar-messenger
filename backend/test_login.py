import sys
sys.path.insert(0, '.')

from db_adapter import db

# Тестируем получение пользователя
print("=== Test get_user ===")
user = db.get_user('admin')
print(f"User found: {user is not None}")
if user:
    print(f"ID: {user.get('id')}")
    print(f"Username: {user.get('username')}")
    print(f"Name: {user.get('name')}")
    print(f"Password: {user.get('password')}")
    print(f"Telegram ID: {user.get('telegram_id')}")
    print(f"Role: {user.get('role')}")
    print()

# Тестируем верификацию
print("=== Test verify_user ===")
passwords_to_test = [
    'vstraveltourmsk1995yearVS!',
    'admin',
    'Traplord999!',
]

for pwd in passwords_to_test:
    result = db.verify_user('admin', pwd)
    print(f"Password '{pwd}': {result}")
