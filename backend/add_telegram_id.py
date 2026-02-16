#!/usr/bin/env python3
"""Добавление Telegram ID к пользователю"""

import json
import sys

def add_telegram_id(username: str, telegram_id: str):
    """Добавить Telegram ID пользователю"""
    
    # Загрузка database.json
    with open('database.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Поиск пользователя
    users = data.get('users', [])
    user_found = False
    
    for user in users:
        if user.get('username') == username:
            user['telegramId'] = telegram_id
            user_found = True
            print(f"✅ Telegram ID {telegram_id} добавлен пользователю {username}")
            break
    
    if not user_found:
        print(f"❌ Пользователь {username} не найден")
        return False
    
    # Сохранение
    with open('database.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("💾 База данных обновлена")
    return True

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Использование: python add_telegram_id.py <username> <telegram_id>")
        print("Пример: python add_telegram_id.py admin 7068591050")
        sys.exit(1)
    
    username = sys.argv[1]
    telegram_id = sys.argv[2]
    
    add_telegram_id(username, telegram_id)
