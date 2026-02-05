from db_adapter import db

print("Updating admin user with Telegram ID...")

target_telegram = '7068591050'

try:
    # Обновляем существующего пользователя
    db.update_user('user_001', {
        'telegramId': target_telegram
    })
    print(f"✅ User user_001 updated with Telegram ID: {target_telegram}")
    
    # Проверяем результат
    user = db.get_user_by_id('user_001')
    if user:
        print(f"\nUser details:")
        print(f"- Username: {user.get('username')}")
        print(f"- Name: {user.get('name')}")
        print(f"- Telegram ID: {user.get('telegramId')}")
        print(f"- Role: {user.get('role')}")
    
except Exception as e:
    print(f"❌ Error: {e}")
