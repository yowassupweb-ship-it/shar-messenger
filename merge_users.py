import json

# Читаем серверную базу
with open('/var/www/feed-editor/backend/database.json', 'r', encoding='utf-8') as f:
    server_db = json.load(f)

# Читаем новых пользователей
with open('/tmp/users-to-deploy.json', 'r', encoding='utf-8') as f:
    new_users = json.load(f)

# Создаем словарь существующих пользователей по username
existing_users = {u['username']: u for u in server_db.get('users', [])}

# Добавляем/обновляем пользователей
updated_count = 0
added_count = 0
for user in new_users:
    if user['username'] in existing_users:
        # Обновляем существующего
        for i, eu in enumerate(server_db['users']):
            if eu['username'] == user['username']:
                server_db['users'][i] = user
                updated_count += 1
                break
    else:
        # Добавляем нового
        server_db['users'].append(user)
        added_count += 1

# Создаем бэкап
import shutil
shutil.copy('/var/www/feed-editor/backend/database.json', '/var/www/feed-editor/backend/database.json.users.bak')

# Сохраняем
with open('/var/www/feed-editor/backend/database.json', 'w', encoding='utf-8') as f:
    json.dump(server_db, f, ensure_ascii=False, indent=2)

print(f"Updated: {updated_count}, Added: {added_count}, Total: {len(server_db['users'])}")
