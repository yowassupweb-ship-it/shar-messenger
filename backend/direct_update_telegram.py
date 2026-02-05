import psycopg2
import os

DB_HOST = '81.90.31.129'
DB_PORT = 5432
DB_NAME = 'shar_messenger'
DB_USER = 'postgres'
DB_PASSWORD = 'Traplord999!'

print("Connecting to PostgreSQL...")
conn = psycopg2.connect(
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD
)

cursor = conn.cursor()

# Проверяем текущего пользователя
cursor.execute("SELECT id, username, name, telegram_id FROM users WHERE id = 'user_001';")
result = cursor.fetchone()
print(f"\nCurrent user: {result}")

# Обновляем telegram_id
print("\nUpdating telegram_id...")
cursor.execute("UPDATE users SET telegram_id = %s WHERE id = %s;", ('7068591050', 'user_001'))
conn.commit()

# Проверяем результат
cursor.execute("SELECT id, username, name, telegram_id FROM users WHERE id = 'user_001';")
result = cursor.fetchone()
print(f"Updated user: {result}")

cursor.close()
conn.close()

print("\n✅ Done!")
