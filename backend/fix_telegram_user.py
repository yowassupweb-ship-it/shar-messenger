from db_adapter import db
import json

print("Checking users in remote database...")

# Проверяем всех пользователей
try:
    # Пытаемся получить всех пользователей через data property
    users_data = db.data.get('users', [])
    print(f"\nUsers in database: {len(users_data)}")
    
    for user in users_data:
        telegram_id = user.get('telegramId', 'No Telegram')
        print(f"- {user.get('username')} (ID: {user.get('id')}, Telegram: {telegram_id}, Role: {user.get('role')})")
    
    # Проверяем, есть ли пользователь с нужным Telegram ID
    target_telegram = '7068591050'
    existing_user = next((u for u in users_data if u.get('telegramId') == target_telegram), None)
    
    if existing_user:
        print(f"\n✅ User with Telegram ID {target_telegram} found: {existing_user['username']}")
    else:
        print(f"\n❌ No user with Telegram ID {target_telegram}")
        print("\nCreating admin user with Telegram ID...")
        
        # Создаем пользователя admin с Telegram ID
        admin_user = {
            'id': 'user_001',
            'username': 'admin',
            'password': 'admin',  # Замените на ваш пароль
            'email': 'admin@vstools.ru',  # Добавлено обязательное поле
            'role': 'admin',
            'name': 'Администратор',
            'telegramId': target_telegram,
            'status': 'online',
            'lastSeen': None,
            'avatar': None
        }
        
        # Попытка добавить через API
        try:
            db.add_user(admin_user)
            print("✅ Admin user created successfully!")
        except Exception as e:
            print(f"❌ Error creating user: {e}")
            print("\nTrying to update existing user...")
            # Если пользователь admin уже есть, обновляем его telegramId
            try:
                db.update_user('user_001', {'telegramId': target_telegram})
                print("✅ User updated with Telegram ID!")
            except Exception as e2:
                print(f"❌ Error updating user: {e2}")

except Exception as e:
    print(f"Error: {e}")
