from backend.db_postgres import PostgresConnection

conn = PostgresConnection()
conn.connect()

# Проверяем какие таблицы есть
tables = conn.fetch_all("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
print('Таблицы в БД:')
for table in tables:
    print(f'- {table["tablename"]}')

# Проверяем задачи
try:
    tasks = conn.fetch_all('SELECT COUNT(*) as count FROM tasks')
    print(f'\nВсего задач в БД: {tasks[0]["count"] if tasks else 0}')
except Exception as e:
    print(f'\nОшибка при проверке tasks: {e}')

# Проверяем списки задач
try:
    lists = conn.fetch_all('SELECT COUNT(*) as count FROM todo_lists')  
    print(f'Списков задач: {lists[0]["count"] if lists else 0}')
except Exception as e:
    print(f'Ошибка при проверке todo_lists: {e}')

# Проверяем категории
try:
    categories = conn.fetch_all('SELECT COUNT(*) as count FROM todo_categories')
    print(f'Категорий: {categories[0]["count"] if categories else 0}')
except Exception as e:
    print(f'Ошибка при проверке todo_categories: {e}')

conn.disconnect()