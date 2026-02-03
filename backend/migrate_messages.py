"""
Миграция чатов и сообщений из database.json в PostgreSQL
"""
import json
import os
import psycopg2
from psycopg2.extras import Json
from datetime import datetime

DB_HOST = 'localhost'
DB_PORT = 5432
DB_NAME = 'shar_messenger'
DB_USER = 'postgres'
DB_PASSWORD = 'Traplord999!'

def load_database_json():
    """Загрузить database.json"""
    json_path = os.path.join(os.path.dirname(__file__), 'database.json')
    if not os.path.exists(json_path):
        print(f"⚠️  Файл не найден: {json_path}")
        return {}
    
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def migrate_chats(conn, data):
    """Миграция чатов"""
    chats = data.get('chats', [])
    if not chats:
        print("⚠️  Чаты не найдены")
        return 0
    
    print(f"\n📦 Миграция {len(chats)} чатов...")
    cur = conn.cursor()
    migrated = 0
    
    for chat in chats:
        try:
            conn.rollback()  # Сброс состояния транзакции
            
            # Вставка чата
            cur.execute("""
                INSERT INTO chats (
                    id, title, is_group, is_notifications_chat, is_system_chat, 
                    is_favorites_chat, creator_id, created_at, read_messages_by_user, 
                    pinned_by_user
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (
                chat.get('id'),
                chat.get('title'),
                chat.get('isGroup', False),
                chat.get('isNotificationsChat', False),
                chat.get('isSystemChat', False),
                chat.get('isFavoritesChat', False),
                chat.get('creatorId'),
                chat.get('createdAt') or datetime.now().isoformat(),
                Json(chat.get('readMessagesByUser', {})),
                Json(chat.get('pinnedByUser', {}))
            ))
            
            # Добавление участников чата
            participant_ids = chat.get('participantIds', [])
            for participant_id in participant_ids:
                try:
                    cur.execute("""
                        INSERT INTO chat_participants (chat_id, user_id)
                        VALUES (%s, %s)
                        ON CONFLICT (chat_id, user_id) DO NOTHING
                    """, (chat.get('id'), participant_id))
                except Exception:
                    pass  # Пропускаем участников, которых нет в базе
            
            conn.commit()
            migrated += 1
            participants_str = ', '.join(participant_ids) if len(participant_ids) <= 3 else f"{len(participant_ids)} участников"
            print(f"   ✓ {chat.get('title', chat.get('id'))} ({participants_str})")
        except Exception as e:
            conn.rollback()
            print(f"   ❌ {chat.get('id')}: {e}")
    
    cur.close()
    print(f"✅ Мигрировано чатов: {migrated}/{len(chats)}\n")
    return migrated

def migrate_messages(conn, data):
    """Миграция сообщений"""
    messages = data.get('messages', [])
    if not messages:
        print("⚠️  Сообщения не найдены")
        return 0
    
    print(f"\n📦 Миграция {len(messages)} сообщений...")
    cur = conn.cursor()
    migrated = 0
    skipped = 0
    
    for msg in messages:
        try:
            conn.rollback()  # Сброс состояния транзакции
            
            # Проверяем существование чата
            cur.execute("SELECT id FROM chats WHERE id = %s", (msg.get('chatId'),))
            if not cur.fetchone():
                skipped += 1
                continue
            
            # Обрабатываем system автора
            author_id = msg.get('authorId')
            if author_id == 'system':
                author_id = None
            
            cur.execute("""
                INSERT INTO messages (
                    id, chat_id, author_id, author_name, content, mentions,
                    reply_to_id, is_edited, is_deleted, is_system_message,
                    notification_type, linked_chat_id, linked_message_id,
                    linked_task_id, linked_post_id, attachments, metadata,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (
                msg.get('id'),
                msg.get('chatId'),
                author_id,
                msg.get('authorName'),
                msg.get('content'),
                Json(msg.get('mentions', [])),
                msg.get('replyToId'),
                msg.get('isEdited', False),
                msg.get('isDeleted', False),
                msg.get('isSystemMessage', False),
                msg.get('notificationType'),
                msg.get('linkedChatId'),
                msg.get('linkedMessageId'),
                msg.get('linkedTaskId'),
                msg.get('linkedPostId'),
                Json(msg.get('attachments', [])),
                Json(msg.get('metadata', {})),
                msg.get('createdAt') or datetime.now().isoformat(),
                msg.get('updatedAt')
            ))
            
            conn.commit()
            migrated += 1
            if migrated % 20 == 0:
                print(f"   ... {migrated} сообщений")
        except Exception as e:
            conn.rollback()
            pass  # Молча пропускаем ошибки
    
    cur.close()
    print(f"✅ Мигрировано сообщений: {migrated}/{len(messages)} (пропущено {skipped} без чата)\n")
    return migrated

def main():
    """Основная функция миграции"""
    print("🚀 Начало миграции чатов и сообщений\n")
    
    # Загрузка данных
    data = load_database_json()
    
    # Подключение к PostgreSQL
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        print(f"✅ Подключено к PostgreSQL: {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}\n")
    except Exception as e:
        print(f"❌ Ошибка подключения: {e}")
        return
    
    # Миграция
    total_chats = migrate_chats(conn, data)
    total_messages = migrate_messages(conn, data)
    
    # Закрытие подключения
    conn.close()
    
    print("\n" + "="*50)
    print(f"✅ Миграция завершена!")
    print(f"   Чатов: {total_chats}")
    print(f"   Сообщений: {total_messages}")
    print("="*50 + "\n")

if __name__ == '__main__':
    main()
