from db_adapter import db

print("Connecting to remote PostgreSQL server...")
users = db.get_user_by_id('user_001')
print(f"Connection successful!")
print(f"Test user: {users.get('username') if users else 'not found'}")

chats = db.get_chats()
print(f"Chats in database: {len(chats)}")

messages = db.get_chat_messages(chats[0]['id']) if chats else []
print(f"Messages in first chat: {len(messages)}")
