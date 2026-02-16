"""
PostgreSQL Database Connection Module
Handles connections and basic operations with PostgreSQL
"""
import os
import asyncio
import json
try:
    # Try psycopg3 first (better Windows UTF-8 support)
    import psycopg as psycopg_module
    from psycopg.rows import dict_row
    from psycopg.types.json import Jsonb as Json
    PSYCOPG_VERSION = 3
    print("Using psycopg3")
except ImportError:
    # Fallback to psycopg2
    import psycopg2 as psycopg_module
    from psycopg2.extras import RealDictCursor, Json
    PSYCOPG_VERSION = 2
    print("Using psycopg2")

from contextlib import contextmanager
from typing import Optional, List, Dict, Any
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class PostgresConnection:
    """PostgreSQL connection wrapper"""
    
    def __init__(
        self,
        host: str = os.getenv('DB_HOST', 'localhost'),
        port: int = int(os.getenv('DB_PORT', '5432')),
        database: str = os.getenv('DB_NAME', 'shar_messenger'),
        user: str = os.getenv('DB_USER', 'postgres'),
        password: str = os.getenv('DB_PASSWORD', 'postgres')
    ):
        self.host = host
        self.port = port
        self.database = database
        self.user = user
        self.password = password
        self.connection = None
        
    def connect(self) -> bool:
        """Establish connection to PostgreSQL"""
        try:
            if PSYCOPG_VERSION == 3:
                # psycopg3 - modern, better Windows support
                self.connection = psycopg_module.connect(
                    host=self.host,
                    port=self.port,
                    dbname=self.database,
                    user=self.user,
                    password=self.password,
                    autocommit=True,
                    row_factory=dict_row
                )
                print(f"✓ Connected to PostgreSQL via psycopg3: {self.user}@{self.host}:{self.port}/{self.database}")
            else:
                # psycopg2 - legacy with Windows encoding workarounds
                os.environ['PGPASSFILE'] = 'nul'
                os.environ['PGCLIENTENCODING'] = 'UTF8'
                
                dsn = f"host={self.host} port={self.port} dbname={self.database} user={self.user} password={self.password} client_encoding=UTF8"
                self.connection = psycopg_module.connect(dsn)
                self.connection.set_client_encoding('UTF8')
                self.connection.autocommit = True
                print(f"✓ Connected to PostgreSQL via psycopg2: {self.user}@{self.host}:{self.port}/{self.database}")
            
            return True
        except Exception as e:
            print(f"❌ Failed to connect to PostgreSQL: {e}")
            return False
    
    def disconnect(self):
        """Close connection to PostgreSQL"""
        if self.connection:
            self.connection.close()
            print("✅ Disconnected from PostgreSQL")
    
    def is_connected(self) -> bool:
        """Check if connection is alive"""
        if not self.connection or self.connection.closed:
            return False
        try:
            # Try to execute a simple query to verify connection
            with self.connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            return True
        except (psycopg2.Error, psycopg2.InterfaceError):
            return False
    
    def ensure_connection(self):
        """Ensure connection is alive, reconnect if needed"""
        if not self.is_connected():
            print("⚠️ Connection lost, reconnecting...")
            self.connect()
    
    def execute_query(self, query: str, params: tuple = None) -> bool:
        """Execute INSERT/UPDATE/DELETE query"""
        try:
            self.ensure_connection()
            with self.connection.cursor() as cursor:
                cursor.execute(query, params or ())
                return True
        except psycopg2.Error as e:
            print(f"❌ Query execution error: {e}")
            self.connection.rollback()
            return False
    
    def fetch_all(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Fetch all results from SELECT query"""
        try:
            self.ensure_connection()
            if PSYCOPG_VERSION == 3:
                with self.connection.cursor() as cursor:
                    cursor.execute(query, params or ())
                    return cursor.fetchall()
            else:
                with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(query, params or ())
                    return cursor.fetchall()
        except Exception as e:
            print(f"❌ Query fetch error: {e}")
            return []
    
    def fetch_one(self, query: str, params: tuple = None) -> Optional[Dict[str, Any]]:
        """Fetch one result from SELECT query"""
        try:
            self.ensure_connection()
            if PSYCOPG_VERSION == 3:
                with self.connection.cursor() as cursor:
                    cursor.execute(query, params or ())
                    return cursor.fetchone()
            else:
                with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(query, params or ())
                    return cursor.fetchone()
        except Exception as e:
            print(f"❌ Query fetch error: {e}")
            return None
    
    def execute_batch(self, query: str, data: List[tuple]) -> bool:
        """Execute batch INSERT/UPDATE/DELETE"""
        try:
            with self.connection.cursor() as cursor:
                for params in data:
                    cursor.execute(query, params)
                return True
        except psycopg2.Error as e:
            print(f"❌ Batch execution error: {e}")
            return False
    
    def table_exists(self, table_name: str) -> bool:
        """Check if table exists in database"""
        query = """
            SELECT EXISTS(
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = %s
            )
        """
        result = self.fetch_one(query, (table_name,))
        return result['exists'] if result else False
    
    def execute_sql_file(self, file_path: str) -> bool:
        """Execute SQL script from file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                sql_script = f.read()
            
            with self.connection.cursor() as cursor:
                cursor.execute(sql_script)
                print(f"✅ SQL script executed: {file_path}")
                return True
        except Exception as e:
            print(f"❌ Error executing SQL script: {e}")
            return False


class PostgresDatabase:
    """High-level database operations compatible with existing API"""
    
    def __init__(self, connection: PostgresConnection):
        self.conn = connection
    
    # ==================== SETTINGS ====================
    def get_settings(self) -> Dict[str, Any]:
        """Get all settings"""
        query = "SELECT key, value FROM settings"
        results = self.conn.fetch_all(query)
        return {row['key']: row['value'] for row in results}
    
    def update_settings(self, settings: Dict[str, Any]):
        """Update settings"""
        for key, value in settings.items():
            query = """
                INSERT INTO settings (key, value, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
            """
            self.conn.execute_query(query, (key, Json(value)))
    
    # ==================== DATA SOURCES ====================
    def get_data_sources(self) -> List[Dict[str, Any]]:
        """Get all data sources"""
        query = "SELECT * FROM data_sources ORDER BY created_at DESC"
        return self.conn.fetch_all(query)
    
    def get_data_source(self, source_id: str) -> Optional[Dict[str, Any]]:
        """Get single data source"""
        query = "SELECT * FROM data_sources WHERE id = %s"
        return self.conn.fetch_one(query, (source_id,))
    
    def add_data_source(self, source: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Add new data source"""
        query = """
            INSERT INTO data_sources 
            (id, name, url, source_type, enabled, auto_sync, sync_interval, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        params = (
            source.get('id'),
            source.get('name'),
            source.get('url'),
            source.get('source_type'),
            source.get('enabled', True),
            source.get('autoSync', False),
            source.get('syncInterval', 3600),
            Json(source.get('metadata', {}))
        )
        result = self.conn.fetch_one(query, params)
        return dict(result) if result else None
    
    def update_data_source(self, source_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update data source"""
        set_clauses = []
        params = []
        
        for key, value in updates.items():
            if key == 'metadata':
                set_clauses.append(f"{key} = %s")
                params.append(Json(value))
            else:
                set_clauses.append(f"{key.replace('_', '')} = %s")
                params.append(value)
        
        params.append(source_id)
        
        query = f"UPDATE data_sources SET {', '.join(set_clauses)}, updated_at = NOW() WHERE id = %s RETURNING *"
        result = self.conn.fetch_one(query, tuple(params))
        return dict(result) if result else None
    
    def delete_data_source(self, source_id: str) -> bool:
        """Delete data source"""
        query = "DELETE FROM data_sources WHERE id = %s"
        return self.conn.execute_query(query, (source_id,))
    
    # ==================== FEEDS ====================
    def get_feeds(self) -> List[Dict[str, Any]]:
        """Get all feeds"""
        query = "SELECT * FROM feeds ORDER BY created_at DESC"
        return self.conn.fetch_all(query)
    
    def get_feed(self, feed_id: str) -> Optional[Dict[str, Any]]:
        """Get single feed by ID or slug"""
        query = "SELECT * FROM feeds WHERE id = %s OR slug = %s"
        result = self.conn.fetch_one(query, (feed_id, feed_id))
        return dict(result) if result else None
    
    def add_feed(self, feed: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Add new feed"""
        query = """
            INSERT INTO feeds (id, name, slug, description, source_id, template_type, enabled, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        params = (
            feed.get('id'),
            feed.get('name'),
            feed.get('slug'),
            feed.get('description'),
            feed.get('source_id'),
            feed.get('template_type'),
            feed.get('enabled', True),
            Json(feed.get('metadata', {}))
        )
        result = self.conn.fetch_one(query, params)
        return dict(result) if result else None
    
    def update_feed(self, feed_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update feed"""
        query = """
            UPDATE feeds 
            SET name = COALESCE(%s, name),
                slug = COALESCE(%s, slug),
                description = COALESCE(%s, description),
                enabled = COALESCE(%s, enabled),
                metadata = COALESCE(%s, metadata),
                updated_at = NOW()
            WHERE id = %s
            RETURNING *
        """
        params = (
            updates.get('name'),
            updates.get('slug'),
            updates.get('description'),
            updates.get('enabled'),
            Json(updates.get('metadata')) if 'metadata' in updates else None,
            feed_id
        )
        result = self.conn.fetch_one(query, params)
        return dict(result) if result else None
    
    def delete_feed(self, feed_id: str) -> bool:
        """Delete feed"""
        query = "DELETE FROM feeds WHERE id = %s"
        return self.conn.execute_query(query, (feed_id,))
    
    # ==================== PRODUCTS ====================
    def get_products(self, source_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get products, optionally filtered by source"""
        if source_id:
            query = "SELECT * FROM products WHERE source_id = %s ORDER BY created_at DESC"
            return self.conn.fetch_all(query, (source_id,))
        else:
            query = "SELECT * FROM products ORDER BY created_at DESC"
            return self.conn.fetch_all(query)
    
    def get_product(self, product_id: str) -> Optional[Dict[str, Any]]:
        """Get single product"""
        query = "SELECT * FROM products WHERE id = %s"
        result = self.conn.fetch_one(query, (product_id,))
        return dict(result) if result else None
    
    def add_products(self, products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Add multiple products"""
        query = """
            INSERT INTO products 
            (id, source_id, name, description, price, currency, url, image_url, metadata, dates)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            updated_at = NOW()
            RETURNING *
        """
        
        data = []
        for p in products:
            data.append((
                p.get('id'),
                p.get('source_id'),
                p.get('name'),
                p.get('description'),
                p.get('price'),
                p.get('currency'),
                p.get('url'),
                p.get('image_url'),
                Json(p.get('metadata', {})),
                Json(p.get('dates', []))
            ))
        
        self.conn.execute_batch(query, data)
        
        # Fetch and return inserted products
        ids = [p.get('id') for p in products]
        query = "SELECT * FROM products WHERE id = ANY(%s)"
        return self.conn.fetch_all(query, (ids,))
    
    def update_product(self, product_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update product"""
        query = """
            UPDATE products 
            SET name = COALESCE(%s, name),
                description = COALESCE(%s, description),
                price = COALESCE(%s, price),
                metadata = COALESCE(%s, metadata),
                updated_at = NOW()
            WHERE id = %s
            RETURNING *
        """
        params = (
            updates.get('name'),
            updates.get('description'),
            updates.get('price'),
            Json(updates.get('metadata')) if 'metadata' in updates else None,
            product_id
        )
        result = self.conn.fetch_one(query, params)
        return dict(result) if result else None
    
    def delete_product(self, product_id: str) -> bool:
        """Delete product"""
        query = "DELETE FROM products WHERE id = %s"
        return self.conn.execute_query(query, (product_id,))
    
    def delete_products_by_source(self, source_id: str) -> int:
        """Delete all products from source"""
        # First count
        count_query = "SELECT COUNT(*) as count FROM products WHERE source_id = %s"
        result = self.conn.fetch_one(count_query, (source_id,))
        count = result['count'] if result else 0
        
        # Then delete
        query = "DELETE FROM products WHERE source_id = %s"
        self.conn.execute_query(query, (source_id,))
        return count
    
    # ==================== USERS ====================
    def get_users(self) -> List[Dict[str, Any]]:
        """Get all users"""
        query = "SELECT * FROM users ORDER BY created_at"
        return self.conn.fetch_all(query)
    
    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get single user by ID, username or email"""
        # Try ID, username or email
        query = "SELECT * FROM users WHERE id = %s OR username = %s OR email = %s"
        result = self.conn.fetch_one(query, (user_id, user_id, user_id))
        return dict(result) if result else None
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get single user by ID"""
        query = "SELECT * FROM users WHERE id = %s"
        result = self.conn.fetch_one(query, (user_id,))
        return dict(result) if result else None
    
    def verify_user(self, username: str, password: str) -> bool:
        """Verify user credentials"""
        user = self.get_user(username)
        if user is None:
            return False
        return user.get("password") == password
    
    def add_user(self, user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Add new user"""
        import uuid
        
        # Generate ID if not provided
        user_id = user.get('id', str(uuid.uuid4()))
        
        # Support both camelCase and snake_case
        username = user.get('username', user.get('email', '').split('@')[0])
        
        query = """
            INSERT INTO users 
            (id, name, username, email, password, role, todo_role, position, department,
             phone, work_schedule, enabled_tools, can_see_all_tasks, avatar)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (email) DO UPDATE SET
                name = EXCLUDED.name,
                username = EXCLUDED.username,
                password = EXCLUDED.password,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        """
        params = (
            user_id,
            user.get('name'),
            username,
            user.get('email'),
            user.get('password'),
            user.get('role', 'user'),
            user.get('todo_role', user.get('todoRole', 'universal')),
            user.get('position'),
            user.get('department'),
            user.get('phone'),
            user.get('work_schedule', user.get('workSchedule')),
            Json(user.get('enabled_tools', user.get('enabledTools', []))),
            user.get('can_see_all_tasks', user.get('canSeeAllTasks', False)),
            user.get('avatar')
        )
        result = self.conn.fetch_one(query, params)
        return dict(result) if result else None
    
    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update user"""
        # Mapping camelCase to snake_case
        field_map = {
            'enabledTools': 'enabled_tools',
            'canSeeAllTasks': 'can_see_all_tasks',
            'isDepartmentHead': 'is_department_head',
            'todoRole': 'todo_role',
            'workSchedule': 'work_schedule',
            'telegramId': 'telegram_id',
            'telegramUsername': 'telegram_username',
            'isOnline': 'is_online',
            'lastSeen': 'last_seen',
            'createdAt': 'created_at',
            'updatedAt': 'updated_at',
            'visibleTabs': 'visible_tabs',
            'toolsOrder': 'tools_order',
            'isActive': 'is_active',
            'pinnedTools': 'pinned_tools',
            'chatSettings': 'chat_settings'
        }
        
        set_clauses = []
        params = []
        
        for key, value in updates.items():
            # Convert to snake_case
            db_key = field_map.get(key, key)
            
            # Handle JSON fields
            if db_key in ['enabled_tools', 'metadata', 'visible_tabs', 'tools_order', 'pinned_tools', 'chat_settings']:
                set_clauses.append(f"{db_key} = %s")
                params.append(Json(value))
            else:
                set_clauses.append(f"{db_key} = %s")
                params.append(value)
        
        set_clauses.append("updated_at = NOW()")
        params.append(user_id)
        
        query = f"UPDATE users SET {', '.join(set_clauses)} WHERE id = %s RETURNING *"
        result = self.conn.fetch_one(query, tuple(params))
        return dict(result) if result else None
    
    def get_departments(self) -> List[Dict[str, Any]]:
        """Get list of unique departments from users"""
        query = """
            SELECT DISTINCT department, COUNT(*) as employee_count
            FROM users 
            WHERE department IS NOT NULL AND department != ''
            GROUP BY department
            ORDER BY department
        """
        results = self.conn.fetch_all(query)
        
        # Format as department objects with id, name, and count
        departments = []
        for idx, row in enumerate(results):
            departments.append({
                'id': row['department'].lower().replace(' ', '_'),
                'name': row['department'],
                'employee_count': row['employee_count'],
                'order': idx
            })
        
        return departments
    
    # ==================== CHATS ====================
    def get_chats(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get chats, optionally filtered by user"""
        if user_id:
            query = """
                SELECT DISTINCT c.*, 
                    ARRAY_AGG(DISTINCT cp.user_id) AS participant_ids
                FROM chats c
                INNER JOIN chat_participants cp ON c.id = cp.chat_id
                WHERE c.id IN (
                    SELECT chat_id FROM chat_participants WHERE user_id = %s
                )
                GROUP BY c.id
                ORDER BY c.updated_at DESC
            """
            chats = self.conn.fetch_all(query, (user_id,))
        else:
            query = """
                SELECT c.*, 
                    ARRAY_AGG(DISTINCT cp.user_id) AS participant_ids
                FROM chats c
                LEFT JOIN chat_participants cp ON c.id = cp.chat_id
                GROUP BY c.id
                ORDER BY c.updated_at DESC
            """
            chats = self.conn.fetch_all(query)
        
        # Convert participant_ids from list to array if needed
        for chat in chats:
            if chat.get('participant_ids') is None:
                chat['participant_ids'] = []
        
        return chats
    
    def get_user_chats(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all chats for a specific user (alias for get_chats)"""
        return self.get_chats(user_id=user_id)
    
    def get_chat(self, chat_id: str) -> Optional[Dict[str, Any]]:
        """Get single chat"""
        query = """
            SELECT c.*, 
                ARRAY_AGG(DISTINCT cp.user_id) AS participant_ids
            FROM chats c
            LEFT JOIN chat_participants cp ON c.id = cp.chat_id
            WHERE c.id = %s
            GROUP BY c.id
        """
        result = self.conn.fetch_one(query, (chat_id,))
        if result:
            chat = dict(result)
            if chat.get('participant_ids') is None:
                chat['participant_ids'] = []
            return chat
        return None
    
    def update_chat(self, chat_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update chat"""
        set_clauses = []
        params = []
        
        field_mapping = {
            'title': 'title',
            'is_group': 'is_group',
            'isGroup': 'is_group',
            'todo_id': 'todo_id',
            'todoId': 'todo_id',
            'is_notifications_chat': 'is_notifications_chat',
            'isNotificationsChat': 'is_notifications_chat',
            'is_system_chat': 'is_system_chat',
            'isSystemChat': 'is_system_chat',
            'is_favorites_chat': 'is_favorites_chat',
            'isFavoritesChat': 'is_favorites_chat',
            'read_messages_by_user': 'read_messages_by_user',
            'readMessagesByUser': 'read_messages_by_user',
            'pinned_by_user': 'pinned_by_user',
            'pinnedByUser': 'pinned_by_user',
            'updated_at': 'updated_at',
            'updatedAt': 'updated_at'
        }
        
        for key, value in update_data.items():
            db_field = field_mapping.get(key, key)
            if db_field in ['read_messages_by_user', 'pinned_by_user']:
                set_clauses.append(f"{db_field} = %s")
                params.append(Json(value))
            else:
                set_clauses.append(f"{db_field} = %s")
                params.append(value)
        
        if not set_clauses:
            return self.get_chat(chat_id)
        
        params.append(chat_id)
        query = f"""
            UPDATE chats
            SET {', '.join(set_clauses)}
            WHERE id = %s
            RETURNING *
        """
        
        result = self.conn.fetch_one(query, tuple(params))
        return dict(result) if result else None
    
    def find_private_chat(self, user_id1: str, user_id2: str) -> Optional[Dict[str, Any]]:
        """Find existing private chat between two users"""
        query = """
            SELECT c.*, 
                ARRAY_AGG(DISTINCT cp.user_id) AS participant_ids
            FROM chats c
            INNER JOIN chat_participants cp ON c.id = cp.chat_id
            WHERE c.is_group = false
            GROUP BY c.id
            HAVING COUNT(DISTINCT cp.user_id) = 2
                AND ARRAY_AGG(DISTINCT cp.user_id) @> ARRAY[%s, %s]::varchar[]
            LIMIT 1
        """
        result = self.conn.fetch_one(query, (user_id1, user_id2))
        if result:
            chat = dict(result)
            if chat.get('participant_ids') is None:
                chat['participant_ids'] = []
            return chat
        return None
    
    def add_chat(self, chat: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Add new chat"""
        query = """
            INSERT INTO chats 
            (id, title, is_group, todo_id, is_notifications_chat, is_system_chat, is_favorites_chat, 
             creator_id, read_messages_by_user, pinned_by_user)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        params = (
            chat.get('id'),
            chat.get('title'),
            chat.get('is_group', chat.get('isGroup', False)),
            chat.get('todo_id', chat.get('todoId')),
            chat.get('is_notifications_chat', chat.get('isNotificationsChat', False)),
            chat.get('is_system_chat', chat.get('isSystemChat', False)),
            chat.get('is_favorites_chat', chat.get('isFavoritesChat', False)),
            chat.get('creator_id', chat.get('creatorId')),
            Json(chat.get('read_messages_by_user', chat.get('readMessagesByUser', {}))),
            Json(chat.get('pinned_by_user', chat.get('pinnedByUser', {})))
        )
        result = self.conn.fetch_one(query, params)
        
        # Add participants
        participant_ids = chat.get('participant_ids', chat.get('participantIds', []))
        if result and participant_ids:
            for participant_id in participant_ids:
                self._add_chat_participant(chat.get('id'), participant_id)
        
        return dict(result) if result else None
    
    def create_chat(self, chat: Dict[str, Any]) -> Dict[str, Any]:
        """Create new chat (alias for add_chat)"""
        return self.add_chat(chat)
    
    def find_chat_by_todo(self, todo_id: str) -> Optional[Dict[str, Any]]:
        """Find chat associated with a task"""
        query = """
            SELECT c.*, 
                ARRAY_AGG(DISTINCT cp.user_id) FILTER (WHERE cp.user_id IS NOT NULL) AS participant_ids
            FROM chats c
            LEFT JOIN chat_participants cp ON c.id = cp.chat_id
            WHERE c.todo_id = %s
            GROUP BY c.id
            LIMIT 1
        """
        result = self.conn.fetch_one(query, (todo_id,))
        if result:
            chat = dict(result)
            if chat.get('participant_ids') is None:
                chat['participant_ids'] = []
            return chat
        return None
    
    def delete_chat(self, chat_id: str) -> bool:
        """Delete chat (cascade deletes messages and participants)"""
        query = "DELETE FROM chats WHERE id = %s"
        self.conn.execute_query(query, (chat_id,))
        return True
    
    def _add_chat_participant(self, chat_id: str, user_id: str):
        """Add participant to chat"""
        query = "INSERT INTO chat_participants (chat_id, user_id) VALUES (%s, %s)"
        self.conn.execute_query(query, (chat_id, user_id))
    
    # ==================== MESSAGES ====================
    def get_messages(self, chat_id: str) -> List[Dict[str, Any]]:
        """Get messages from chat"""
        query = """
            SELECT * FROM messages 
            WHERE chat_id = %s AND is_deleted = false
            ORDER BY created_at ASC
        """
        return self.conn.fetch_all(query, (chat_id,))
    
    def get_chat_messages(self, chat_id: str) -> List[Dict[str, Any]]:
        """Get messages from chat (alias for get_messages)"""
        return self.get_messages(chat_id)
    
    def add_message(self, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Add new message"""
        query = """
            INSERT INTO messages 
            (id, chat_id, author_id, author_name, content, mentions, reply_to_id,
             is_edited, is_deleted, is_system_message, notification_type,
             linked_chat_id, linked_message_id, linked_task_id, linked_post_id,
             attachments, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        params = (
            message.get('id'),
            message.get('chat_id') or message.get('chatId'),
            message.get('author_id') or message.get('authorId'),
            message.get('author_name') or message.get('authorName'),
            message.get('content'),
            Json(message.get('mentions', [])),
            message.get('reply_to_id') or message.get('replyToId'),
            message.get('is_edited') or message.get('isEdited', False),
            message.get('is_deleted') or message.get('isDeleted', False),
            message.get('is_system_message') or message.get('isSystemMessage', False),
            message.get('notification_type') or message.get('notificationType'),
            message.get('linked_chat_id') or message.get('linkedChatId'),
            message.get('linked_message_id') or message.get('linkedMessageId'),
            message.get('linked_task_id') or message.get('linkedTaskId'),
            message.get('linked_post_id') or message.get('linkedPostId'),
            Json(message.get('attachments', [])),
            Json(message.get('metadata', {}))
        )
        result = self.conn.fetch_one(query, params)
        return dict(result) if result else None
    
    def update_message(self, message_id: str, content: str) -> bool:
        """Update message content"""
        query = """
            UPDATE messages
            SET content = %s, is_edited = true, updated_at = NOW()
            WHERE id = %s
        """
        return self.conn.execute_query(query, (content, message_id))
    
    def delete_message(self, message_id: str) -> bool:
        """Mark message as deleted"""
        query = """
            UPDATE messages
            SET is_deleted = true, updated_at = NOW()
            WHERE id = %s
        """
        return self.conn.execute_query(query, (message_id,))
    
    # ==================== TEMPLATES ====================
    def get_templates(self) -> List[Dict[str, Any]]:
        """Get all templates"""
        query = "SELECT * FROM templates ORDER BY created_at DESC"
        return self.conn.fetch_all(query)
    
    def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get single template"""
        query = "SELECT * FROM templates WHERE id = %s"
        result = self.conn.fetch_one(query, (template_id,))
        return dict(result) if result else None
    
    def add_template(self, template: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Add new template"""
        query = """
            INSERT INTO templates 
            (id, name, template_type, content, variables, is_system, creator_id, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        params = (
            template.get('id'),
            template.get('name'),
            template.get('templateType') or template.get('type'),
            template.get('content'),
            Json(template.get('variables', {})),
            template.get('isSystem', False),
            template.get('creatorId'),
            Json(template.get('metadata', {}))
        )
        result = self.conn.fetch_one(query, params)
        return dict(result) if result else None
    
    def update_template(self, template_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update template"""
        set_clauses = []
        params = []
        
        for key, value in updates.items():
            if key in ['variables', 'metadata']:
                set_clauses.append(f"{key} = %s")
                params.append(Json(value))
            elif key == 'templateType':
                set_clauses.append("template_type = %s")
                params.append(value)
            elif key == 'isSystem':
                set_clauses.append("is_system = %s")
                params.append(value)
            elif key == 'creatorId':
                set_clauses.append("creator_id = %s")
                params.append(value)
            else:
                set_clauses.append(f"{key} = %s")
                params.append(value)
        
        params.append(template_id)
        
        query = f"UPDATE templates SET {', '.join(set_clauses)}, updated_at = NOW() WHERE id = %s RETURNING *"
        result = self.conn.fetch_one(query, tuple(params))
        return dict(result) if result else None
    
    def delete_template(self, template_id: str) -> bool:
        """Delete template"""
        query = "DELETE FROM templates WHERE id = %s"
        return self.conn.execute_query(query, (template_id,))
    
    # ==================== COLLECTIONS ====================
    def get_collections(self) -> List[Dict[str, Any]]:
        """Get all collections"""
        query = "SELECT * FROM collections ORDER BY created_at DESC"
        return self.conn.fetch_all(query)
    
    def get_collection(self, collection_id: str) -> Optional[Dict[str, Any]]:
        """Get single collection"""
        query = "SELECT * FROM collections WHERE id = %s"
        result = self.conn.fetch_one(query, (collection_id,))
        return dict(result) if result else None
    
    def add_collection(self, collection: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Add new collection"""
        query = """
            INSERT INTO collections 
            (id, name, description, product_ids, created_by, metadata)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        params = (
            collection.get('id'),
            collection.get('name'),
            collection.get('description'),
            Json(collection.get('productIds', [])),
            collection.get('createdBy'),
            Json(collection.get('metadata', {}))
        )
        result = self.conn.fetch_one(query, params)
        return dict(result) if result else None
    
    def update_collection(self, collection_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update collection"""
        set_clauses = []
        params = []
        
        for key, value in updates.items():
            if key in ['productIds', 'metadata']:
                snake_key = 'product_ids' if key == 'productIds' else key
                set_clauses.append(f"{snake_key} = %s")
                params.append(Json(value))
            elif key == 'createdBy':
                set_clauses.append("created_by = %s")
                params.append(value)
            else:
                set_clauses.append(f"{key} = %s")
                params.append(value)
        
        params.append(collection_id)
        
        query = f"UPDATE collections SET {', '.join(set_clauses)}, updated_at = NOW() WHERE id = %s RETURNING *"
        result = self.conn.fetch_one(query, tuple(params))
        return dict(result) if result else None
    
    def delete_collection(self, collection_id: str) -> bool:
        """Delete collection"""
        query = "DELETE FROM collections WHERE id = %s"
        return self.conn.execute_query(query, (collection_id,))
    
    # ==================== TASKS (TODOS) ====================
    def get_tasks(self, user_id: Optional[str] = None, list_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all tasks, optionally filtered by user or list"""
        if user_id:
            # Проверяем права пользователя
            user_query = "SELECT can_see_all_tasks, is_department_head, department, role FROM users WHERE id = %s"
            user_result = self.conn.fetch_one(user_query, (user_id,))
            can_see_all = user_result and user_result.get('can_see_all_tasks', False)
            is_admin = user_result and user_result.get('role') == 'admin'
            is_dept_head = user_result and user_result.get('is_department_head', False)
            user_dept = user_result.get('department') if user_result else None
            
            if can_see_all or is_admin:
                # Пользователь видит все задачи
                query = "SELECT * FROM tasks ORDER BY created_at DESC"
                return self.conn.fetch_all(query)
            elif is_dept_head and user_dept:
                # Руководитель отдела видит все задачи участников своего отдела
                dept_users_query = "SELECT id, name FROM users WHERE department = %s"
                dept_users = self.conn.fetch_all(dept_users_query, (user_dept,))
                dept_user_ids = [u['id'] for u in dept_users]
                dept_user_names = [u['name'] for u in dept_users if u.get('name')]

                if not dept_user_ids:
                    query = "SELECT * FROM tasks WHERE assigned_by_id = %s OR author_id = %s ORDER BY created_at DESC"
                    return self.conn.fetch_all(query, (user_id, user_id))

                placeholders_ids = ','.join(['%s'] * len(dept_user_ids))
                placeholders_names = ','.join(['%s'] * len(dept_user_names)) if dept_user_names else '%s'

                assigned_to_ids_checks = []
                assigned_to_ids_params = []
                for uid in dept_user_ids:
                    assigned_to_ids_checks.append("assigned_to_ids::jsonb @> %s::jsonb")
                    assigned_to_ids_params.append(f'["{uid}"]')

                query = f"""
                    SELECT * FROM tasks
                    WHERE assigned_by_id IN ({placeholders_ids})
                    OR author_id IN ({placeholders_ids})
                    OR assigned_to IN ({placeholders_names})
                    OR ({' OR '.join(assigned_to_ids_checks)})
                    ORDER BY created_at DESC
                """

                names_params = dept_user_names if dept_user_names else ['']
                params = tuple(dept_user_ids + dept_user_ids + names_params + assigned_to_ids_params)
                return self.conn.fetch_all(query, params)
            else:
                # Фильтруем только по связанным задачам (заказчик или исполнитель)
                query = """
                    SELECT * FROM tasks 
                    WHERE assigned_by_id = %s 
                    OR assigned_to = %s
                    OR assigned_to_ids::jsonb @> %s::jsonb
                    ORDER BY created_at DESC
                """
                return self.conn.fetch_all(query, (user_id, user_id, f'["{user_id}"]'))
        elif list_id:
            query = "SELECT * FROM tasks WHERE list_id = %s ORDER BY task_order, created_at DESC"
            return self.conn.fetch_all(query, (list_id,))
        else:
            query = "SELECT * FROM tasks ORDER BY created_at DESC"
            return self.conn.fetch_all(query)
    
    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get single task"""
        query = "SELECT * FROM tasks WHERE id = %s"
        result = self.conn.fetch_one(query, (task_id,))
        return dict(result) if result else None
    
    def add_task(self, task: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Add new task"""
        query = """
            INSERT INTO tasks 
            (id, title, description, status, review_comment, priority, due_date, assigned_to, assigned_to_ids, 
             author_id, assigned_by_id, list_id, category_id, tags, is_completed, add_to_calendar, calendar_event_id, calendar_list_id, task_order, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        params = (
            task.get('id'),
            task.get('title'),
            task.get('description'),
            task.get('status', 'pending'),
            task.get('review_comment') or task.get('reviewComment'),
            task.get('priority', 'medium'),
            task.get('due_date'),  # snake_case
            task.get('assigned_to'),  # snake_case
            Json(task.get('assigned_to_ids', [])),  # snake_case
            task.get('author_id'),  # snake_case
            task.get('assigned_by_id'),  # snake_case
            task.get('list_id'),  # snake_case
            task.get('category_id'),  # snake_case
            Json(task.get('tags', [])),
            task.get('is_completed', False),  # snake_case
            task.get('add_to_calendar', False),  # snake_case
            task.get('calendar_event_id'),  # snake_case
            task.get('calendar_list_id'),  # snake_case
            task.get('task_order', 0),  # snake_case
            Json(task.get('metadata', {}))
        )
        result = self.conn.fetch_one(query, params)
        return dict(result) if result else None
    
    def update_task(self, task_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update task"""
        # Поддержка и camelCase и snake_case
        field_map = {
            'title': 'title',
            'description': 'description',
            'assigneeResponse': 'assignee_response',
            'assignee_response': 'assignee_response',
            'status': 'status',
            'reviewComment': 'review_comment',
            'review_comment': 'review_comment',
            'priority': 'priority',
            'dueDate': 'due_date',
            'due_date': 'due_date',
            'assignedTo': 'assigned_to',
            'assigned_to': 'assigned_to',
            'assignedToIds': 'assigned_to_ids',
            'assigned_to_ids': 'assigned_to_ids',
            'authorId': 'author_id',
            'author_id': 'author_id',
            'assignedById': 'assigned_by_id',
            'assigned_by_id': 'assigned_by_id',
            'listId': 'list_id',
            'list_id': 'list_id',
            'categoryId': 'category_id',
            'category_id': 'category_id',
            'tags': 'tags',
            'completed': 'is_completed',
            'isCompleted': 'is_completed',
            'is_completed': 'is_completed',
            'addToCalendar': 'add_to_calendar',
            'add_to_calendar': 'add_to_calendar',
            'calendarEventId': 'calendar_event_id',
            'calendar_event_id': 'calendar_event_id',
            'calendarListId': 'calendar_list_id',
            'calendar_list_id': 'calendar_list_id',
            'order': 'task_order',
            'task_order': 'task_order',
            'taskOrder': 'task_order',
            'archived': 'archived',
            'isArchived': 'archived',
            'metadata': 'metadata'
        }
        
        # Логирование для assigned_to_ids
        if 'assignedToIds' in updates or 'assigned_to_ids' in updates:
            print(f"[DB] 👥 Updating assigned_to_ids for task {task_id}")
            print(f"[DB]    Input assignedToIds: {updates.get('assignedToIds')}")
            print(f"[DB]    Input assigned_to_ids: {updates.get('assigned_to_ids')}")
        
        # Собираем уникальные db_field -> value
        db_updates = {}
        for key, value in updates.items():
            if key in field_map:
                db_field = field_map[key]
                # Для JSONB полей применяем Json()
                if key in ['tags', 'assignedToIds', 'assigned_to_ids', 'metadata']:
                    db_updates[db_field] = Json(value)
                else:
                    db_updates[db_field] = value
        
        if not db_updates:
            return self.get_task(task_id)
        
        print(f"[DB] DB updates to apply: {list(db_updates.keys())}")
        if 'assigned_to_ids' in db_updates:
            print(f"[DB]    assigned_to_ids value: {db_updates['assigned_to_ids']}")
        
        # Формируем set_clauses и params из уникальных полей
        set_clauses = [f"{field} = %s" for field in db_updates.keys()]
        params = list(db_updates.values())
        
        set_clauses.append("updated_at = NOW()")
        params.append(task_id)
        
        query = f"UPDATE tasks SET {', '.join(set_clauses)} WHERE id = %s RETURNING *"
        result = self.conn.fetch_one(query, tuple(params))
        
        if result and 'assigned_to_ids' in dict(result):
            print(f"[DB] ✅ Task {task_id} updated with assigned_to_ids: {dict(result)['assigned_to_ids']}")
        
        return dict(result) if result else None
    
    def delete_task(self, task_id: str) -> bool:
        """Delete task"""
        query = "DELETE FROM tasks WHERE id = %s"
        return self.conn.execute_query(query, (task_id,))
    
    # ==================== TODO LISTS ====================
    def get_todo_lists(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all todo lists, optionally filtered by user"""
        if user_id:
            # Получаем информацию о пользователе
            user_query = "SELECT can_see_all_tasks, department, is_department_head, role FROM users WHERE id = %s"
            user_result = self.conn.fetch_one(user_query, (user_id,))
            
            if not user_result:
                return []
            
            can_see_all = user_result.get('can_see_all_tasks', False)
            is_admin = user_result.get('role') == 'admin'
            is_dept_head = user_result.get('is_department_head', False)
            user_dept = user_result.get('department')
            
            # Админы и пользователи с can_see_all_tasks видят все списки
            if is_admin or can_see_all:
                query = "SELECT * FROM todo_lists ORDER BY list_order, created_at"
                return self.conn.fetch_all(query)
            
            # Начальники отдела видят списки своих подчиненных
            if is_dept_head and user_dept:
                # Получаем ID всех пользователей отдела
                dept_users_query = "SELECT id FROM users WHERE department = %s"
                dept_users = self.conn.fetch_all(dept_users_query, (user_dept,))
                dept_user_ids = [u['id'] for u in dept_users]
                
                # Списки созданные сотрудниками отдела + списки с задачами где участвуют сотрудники отдела
                if dept_user_ids:
                    placeholders_creator = ','.join(['%s'] * len(dept_user_ids))
                    placeholders_assigned_by = ','.join(['%s'] * len(dept_user_ids))
                    placeholders_names = ','.join(['%s'] * len(dept_user_ids))
                    
                    # Для assigned_to_ids используем OR для каждого ID
                    assigned_to_checks = []
                    assigned_to_params = []
                    for uid in dept_user_ids:
                        assigned_to_checks.append("assigned_to_ids::jsonb @> %s::jsonb")
                        assigned_to_params.append(f'["{uid}"]')
                    
                    query = f"""
                        SELECT DISTINCT l.* FROM todo_lists l
                        WHERE l.creator_id IN ({placeholders_creator})
                        OR l.id IN (
                            SELECT DISTINCT list_id FROM tasks 
                            WHERE assigned_by_id IN ({placeholders_assigned_by})
                            OR assigned_to IN (SELECT name FROM users WHERE id IN ({placeholders_names}))
                            OR ({' OR '.join(assigned_to_checks)})
                        )
                        ORDER BY l.list_order, l.created_at
                    """
                    params = tuple(dept_user_ids + dept_user_ids + dept_user_ids + assigned_to_params)
                    return self.conn.fetch_all(query, tuple(params))
            
            # Обычные пользователи видят списки где:
            # 1. Они создатели (даже если список пустой)
            # 2. Есть задачи где они участники
            query = """
                SELECT DISTINCT l.* FROM todo_lists l
                WHERE l.creator_id = %s
                OR l.id IN (
                    SELECT DISTINCT list_id FROM tasks 
                    WHERE assigned_by_id = %s
                    OR assigned_to = (SELECT name FROM users WHERE id = %s)
                    OR assigned_to_ids::jsonb @> %s::jsonb
                )
                ORDER BY l.list_order, l.created_at
            """
            return self.conn.fetch_all(query, (user_id, user_id, user_id, f'["{user_id}"]'))
        else:
            query = "SELECT * FROM todo_lists ORDER BY list_order, created_at"
            return self.conn.fetch_all(query)
    
    def add_todo_list(self, list_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Add new todo list"""
        # Сначала проверяем наличие обязательных колонок
        try:
            self.conn.execute_query("ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS creator_id VARCHAR(255)")
            self.conn.execute_query("ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS default_executor_id VARCHAR(255)")
            self.conn.execute_query("ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS default_customer_id VARCHAR(255)")
            self.conn.execute_query("ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS default_add_to_calendar BOOLEAN DEFAULT FALSE")
            self.conn.execute_query("ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS stages_enabled BOOLEAN DEFAULT FALSE")
            self.conn.execute_query("ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS allowed_users TEXT[] DEFAULT ARRAY[]::TEXT[]")
            self.conn.execute_query("ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS allowed_departments TEXT[] DEFAULT ARRAY[]::TEXT[]")
        except Exception as e:
            print(f"Error checking/adding todo_lists columns: {e}")
        
        query = """
            INSERT INTO todo_lists 
            (id, name, color, icon, department, list_order, creator_id, default_executor_id, default_customer_id, default_add_to_calendar, stages_enabled, allowed_users, allowed_departments)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        allowed_users = list_data.get('allowedUsers', list_data.get('allowed_users', [])) or []
        allowed_departments = list_data.get('allowedDepartments', list_data.get('allowed_departments', [])) or []
        params = (
            list_data.get('id'),
            list_data.get('name'),
            list_data.get('color', '#3b82f6'),
            list_data.get('icon'),
            list_data.get('department'),
            list_data.get('order', 0),
            list_data.get('creatorId') or list_data.get('creator_id'),
            list_data.get('defaultExecutorId') or list_data.get('default_executor_id') or list_data.get('defaultAssigneeId'),
            list_data.get('defaultCustomerId') or list_data.get('default_customer_id'),
            bool(list_data.get('defaultAddToCalendar') or list_data.get('default_add_to_calendar', False)),
            bool(list_data.get('stagesEnabled') or list_data.get('stages_enabled', False)),
            allowed_users,
            allowed_departments,
        )
        result = self.conn.fetch_one(query, params)
        if result:
            return dict(result)

        # Fallback для старой схемы БД (без новых колонок)
        fallback_query = """
            INSERT INTO todo_lists
            (id, name, color, icon, department, list_order)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        fallback_params = (
            list_data.get('id'),
            list_data.get('name'),
            list_data.get('color', '#3b82f6'),
            list_data.get('icon'),
            list_data.get('department'),
            list_data.get('order', 0),
        )
        fallback_result = self.conn.fetch_one(fallback_query, fallback_params)
        return dict(fallback_result) if fallback_result else None
    
    def update_todo_list(self, list_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update todo list"""
        # На проде схема могла быть частично мигрирована.
        # Гарантируем наличие колонок перед UPDATE, чтобы не получать ложный 404
        # из-за SQL ошибки "column does not exist".
        try:
            self.conn.execute_query("ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS creator_id VARCHAR(255)")
            self.conn.execute_query("ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS default_executor_id VARCHAR(255)")
            self.conn.execute_query("ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS default_customer_id VARCHAR(255)")
            self.conn.execute_query("ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS default_add_to_calendar BOOLEAN DEFAULT FALSE")
            self.conn.execute_query("ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS stages_enabled BOOLEAN DEFAULT FALSE")
            self.conn.execute_query("ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS allowed_users TEXT[] DEFAULT ARRAY[]::TEXT[]")
            self.conn.execute_query("ALTER TABLE todo_lists ADD COLUMN IF NOT EXISTS allowed_departments TEXT[] DEFAULT ARRAY[]::TEXT[]")
        except Exception as e:
            print(f"Error checking/adding todo_lists columns before update: {e}")

        set_clauses = []
        params = []
        
        field_mapping = {
            'name': 'name',
            'color': 'color',
            'icon': 'icon',
            'department': 'department',
            'order': 'list_order',
            'archived': 'archived',
            'defaultExecutorId': 'default_executor_id',
            'default_executor_id': 'default_executor_id',
            'defaultCustomerId': 'default_customer_id',
            'default_customer_id': 'default_customer_id',
            'defaultAddToCalendar': 'default_add_to_calendar',
            'default_add_to_calendar': 'default_add_to_calendar',
            'stagesEnabled': 'stages_enabled',
            'stages_enabled': 'stages_enabled',
            'allowedUsers': 'allowed_users',
            'allowed_users': 'allowed_users',
            'allowedDepartments': 'allowed_departments',
            'allowed_departments': 'allowed_departments',
        }
        
        for key, db_field in field_mapping.items():
            if key in updates:
                set_clauses.append(f"{db_field} = %s")
                params.append(updates[key])
        
        if not set_clauses:
            return None
        
        params.append(list_id)
        query = f"""
            UPDATE todo_lists 
            SET {', '.join(set_clauses)}, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING *
        """
        result = self.conn.fetch_one(query, tuple(params))
        return dict(result) if result else None
    
    def delete_todo_list(self, list_id: str) -> bool:
        """Delete todo list"""
        query = "DELETE FROM todo_lists WHERE id = %s"
        return self.conn.execute_query(query, (list_id,))
    
    # ==================== TODO CATEGORIES ====================
    def get_todo_categories(self) -> List[Dict[str, Any]]:
        """Get all todo categories"""
        query = "SELECT * FROM todo_categories ORDER BY category_order, created_at"
        return self.conn.fetch_all(query)
    
    def add_todo_category(self, category_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Add new todo category"""
        query = """
            INSERT INTO todo_categories 
            (id, name, color, icon, category_order)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
        """
        params = (
            category_data.get('id'),
            category_data.get('name'),
            category_data.get('color', '#6366f1'),
            category_data.get('icon'),
            category_data.get('order', 0)
        )
        result = self.conn.fetch_one(query, params)
        return dict(result) if result else None
    
    def update_todo_category(self, category_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update todo category"""
        set_clauses = []
        params = []
        
        field_mapping = {
            'name': 'name',
            'color': 'color',
            'icon': 'icon',
            'order': 'category_order'
        }
        
        for key, db_field in field_mapping.items():
            if key in updates:
                set_clauses.append(f"{db_field} = %s")
                params.append(updates[key])
        
        if not set_clauses:
            return None
        
        params.append(category_id)
        query = f"""
            UPDATE todo_categories 
            SET {', '.join(set_clauses)}, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING *
        """
        result = self.conn.fetch_one(query, tuple(params))
        return dict(result) if result else None
    
    def delete_todo_category(self, category_id: str) -> bool:
        """Delete todo category"""
        query = "DELETE FROM todo_categories WHERE id = %s"
        return self.conn.execute_query(query, (category_id,))
    
    # ==================== LINKS ====================
    def get_links(self, user_id: Optional[str] = None, list_id: Optional[str] = None, department: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all links, optionally filtered"""
        conditions = []
        params = []
        
        if list_id:
            conditions.append("list_id = %s")
            params.append(list_id)
        
        if department:
            conditions.append("department = %s")
            params.append(department)
        
        if conditions:
            query = f"SELECT * FROM links WHERE {' AND '.join(conditions)} ORDER BY link_order, created_at DESC"
            return self.conn.fetch_all(query, tuple(params))
        else:
            query = "SELECT * FROM links ORDER BY link_order, created_at DESC"
            return self.conn.fetch_all(query)
    
    def get_link(self, link_id: str) -> Optional[Dict[str, Any]]:
        """Get single link"""
        query = "SELECT * FROM links WHERE id = %s"
        return self.conn.fetch_one(query, (link_id,))
    
    def add_link(self, link: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Add new link"""
        query = """
            INSERT INTO links 
            (id, url, title, description, list_id, tags, department, 
             is_bookmarked, is_pinned, click_count, link_order, favicon, image, site_name)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        params = (
            link.get('id'),
            link.get('url'),
            link.get('title'),
            link.get('description'),
            link.get('listId'),
            Json(link.get('tags', [])),
            link.get('department'),
            link.get('isBookmarked', False),
            link.get('isPinned', False),
            link.get('clicks', 0),
            link.get('order', 0),
            link.get('favicon'),
            link.get('image'),
            link.get('siteName')
        )
        result = self.conn.fetch_one(query, params)
        return dict(result) if result else None
    
    def update_link(self, link_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update link"""
        set_clauses = []
        params = []
        
        field_map = {
            'url': 'url',
            'title': 'title',
            'description': 'description',
            'listId': 'list_id',
            'tags': 'tags',
            'department': 'department',
            'isBookmarked': 'is_bookmarked',
            'isPinned': 'is_pinned',
            'clicks': 'click_count',
            'order': 'link_order'
        }
        
        for key, value in updates.items():
            if key in field_map:
                db_field = field_map[key]
                if key == 'tags':
                    set_clauses.append(f"{db_field} = %s")
                    params.append(Json(value))
                else:
                    set_clauses.append(f"{db_field} = %s")
                    params.append(value)
        
        if not set_clauses:
            return self.get_link(link_id)
        
        set_clauses.append("updated_at = NOW()")
        params.append(link_id)
        
        query = f"UPDATE links SET {', '.join(set_clauses)} WHERE id = %s RETURNING *"
        result = self.conn.fetch_one(query, tuple(params))
        return dict(result) if result else None
    
    def delete_link(self, link_id: str) -> bool:
        """Delete link"""
        query = "DELETE FROM links WHERE id = %s"
        return self.conn.execute_query(query, (link_id,))
    
    # ==================== LINK LISTS ====================
    def get_link_lists(self, department: Optional[str] = None, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all link lists with optional legacy department and access filters"""
        def normalize_department(value: Optional[str]) -> str:
            if not value:
                return ''
            return value.strip().lower().replace('ё', 'е').replace(' ', '_')

        normalized_department = normalize_department(department)
        lists = self.conn.fetch_all("SELECT * FROM link_lists ORDER BY list_order, created_at")

        if not user_id and not department:
            return lists

        visible_lists: List[Dict[str, Any]] = []
        for list_item in lists:
            allowed_users = list_item.get('allowed_users') or []
            allowed_departments = list_item.get('allowed_departments') or []
            is_public = list_item.get('is_public')

            if is_public is None:
                is_public = len(allowed_users) == 0 and len(allowed_departments) == 0

            if is_public:
                visible_lists.append(list_item)
                continue

            if user_id and user_id in allowed_users:
                visible_lists.append(list_item)
                continue

            if normalized_department:
                allowed_dep_match = any(
                    normalize_department(dep) == normalized_department or dep == department
                    for dep in allowed_departments
                )
                legacy_dep = list_item.get('department')
                legacy_dep_match = (
                    normalize_department(legacy_dep) == normalized_department or legacy_dep == department
                )
                if allowed_dep_match or legacy_dep_match:
                    visible_lists.append(list_item)
                    continue

        return visible_lists
    
    def add_link_list(self, list_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Add new link list"""
        query = """
            INSERT INTO link_lists 
            (id, name, color, icon, department, list_order, created_by, allowed_users, allowed_departments, is_public)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        allowed_users = list_data.get('allowed_users', list_data.get('allowedUsers', [])) or []
        allowed_departments = list_data.get('allowed_departments', list_data.get('allowedDepartments', [])) or []
        is_public = list_data.get('is_public')
        if is_public is None:
            is_public = len(allowed_users) == 0 and len(allowed_departments) == 0

        params = (
            list_data.get('id'),
            list_data.get('name'),
            list_data.get('color', '#3b82f6'),
            list_data.get('icon'),
            list_data.get('department'),
            list_data.get('order', 0),
            list_data.get('created_by', list_data.get('createdBy')),
            allowed_users,
            allowed_departments,
            is_public,
        )
        result = self.conn.fetch_one(query, params)
        return dict(result) if result else None
    
    def update_link_list(self, list_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update link list"""
        set_clauses = []
        params = []
        
        field_map = {
            'name': 'name',
            'color': 'color',
            'icon': 'icon',
            'department': 'department',
            'order': 'list_order',
            'allowed_users': 'allowed_users',
            'allowedUsers': 'allowed_users',
            'allowed_departments': 'allowed_departments',
            'allowedDepartments': 'allowed_departments',
            'created_by': 'created_by',
            'createdBy': 'created_by',
            'is_public': 'is_public',
            'isPublic': 'is_public',
        }

        for key, db_field in field_map.items():
            if key in updates:
                set_clauses.append(f"{db_field} = %s")
                params.append(updates[key])
        
        if not set_clauses:
            return self.get_link_list(list_id)
        
        set_clauses.append("updated_at = NOW()")
        params.append(list_id)
        
        query = f"UPDATE link_lists SET {', '.join(set_clauses)} WHERE id = %s RETURNING *"
        result = self.conn.fetch_one(query, tuple(params))
        return dict(result) if result else None
    
    def get_link_list(self, list_id: str) -> Optional[Dict[str, Any]]:
        """Get single link list"""
        query = "SELECT * FROM link_lists WHERE id = %s"
        return self.conn.fetch_one(query, (list_id,))
    
    def delete_link_list(self, list_id: str) -> bool:
        """Delete link list"""
        query = "DELETE FROM link_lists WHERE id = %s"
        return self.conn.execute_query(query, (list_id,))
    
    # ==================== CONTENT PLANS ====================
    def get_content_plans(self, user_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all content plans, optionally filtered"""
        conditions = []
        params = []
        
        if user_id:
            conditions.append("(author_id = %s OR %s = ANY(COALESCE((assigned_to_ids::text)::varchar[], ARRAY[]::varchar[])))")
            params.extend([user_id, user_id])
        
        if status:
            conditions.append("status = %s")
            params.append(status)
        
        if conditions:
            query = f"SELECT * FROM content_plans WHERE {' AND '.join(conditions)} ORDER BY scheduled_date DESC NULLS LAST, created_at DESC"
            return self.conn.fetch_all(query, tuple(params))
        else:
            query = "SELECT * FROM content_plans ORDER BY scheduled_date DESC NULLS LAST, created_at DESC"
            return self.conn.fetch_all(query)
    
    def get_content_plan(self, plan_id: str) -> Optional[Dict[str, Any]]:
        """Get single content plan"""
        query = "SELECT * FROM content_plans WHERE id = %s"
        return self.conn.fetch_one(query, (plan_id,))
    
    def add_content_plan(self, plan: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Add new content plan"""
        query = """
            INSERT INTO content_plans 
            (id, title, description, content, status, post_type, scheduled_date, 
             platform, tags, author_id, assigned_to_ids, attachments, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        params = (
            plan.get('id'),
            plan.get('title'),
            plan.get('description'),
            plan.get('content'),
            plan.get('status', 'draft'),
            plan.get('postType'),
            plan.get('scheduledDate'),
            plan.get('platform'),
            Json(plan.get('tags', [])),
            plan.get('authorId'),
            Json(plan.get('assignedToIds', [])),
            Json(plan.get('attachments', [])),
            Json(plan.get('metadata', {}))
        )
        result = self.conn.fetch_one(query, params)
        return dict(result) if result else None
    
    def update_content_plan(self, plan_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update content plan"""
        set_clauses = []
        params = []
        
        field_map = {
            'title': 'title',
            'description': 'description',
            'content': 'content',
            'status': 'status',
            'postType': 'post_type',
            'scheduledDate': 'scheduled_date',
            'publishedDate': 'published_date',
            'platform': 'platform',
            'tags': 'tags',
            'authorId': 'author_id',
            'assignedToIds': 'assigned_to_ids',
            'attachments': 'attachments',
            'metadata': 'metadata'
        }
        
        for key, value in updates.items():
            if key in field_map:
                db_field = field_map[key]
                if key in ['tags', 'assignedToIds', 'attachments', 'metadata']:
                    set_clauses.append(f"{db_field} = %s")
                    params.append(Json(value))
                else:
                    set_clauses.append(f"{db_field} = %s")
                    params.append(value)
        
        if not set_clauses:
            return self.get_content_plan(plan_id)
        
        set_clauses.append("updated_at = NOW()")
        params.append(plan_id)
        
        query = f"UPDATE content_plans SET {', '.join(set_clauses)} WHERE id = %s RETURNING *"
        result = self.conn.fetch_one(query, tuple(params))
        return dict(result) if result else None
    
    def delete_content_plan(self, plan_id: str) -> bool:
        """Delete content plan"""
        query = "DELETE FROM content_plans WHERE id = %s"
        return self.conn.execute_query(query, (plan_id,))
    
    # ==================== SHARED LINKS ====================
    def _ensure_shared_links_table(self) -> None:
        """Ensure shared_links table exists"""
        table_query = """
            CREATE TABLE IF NOT EXISTS shared_links (
                id VARCHAR(255) PRIMARY KEY,
                token VARCHAR(255) UNIQUE NOT NULL,
                resource_type VARCHAR(50) NOT NULL,
                resource_id VARCHAR(255),
                permission VARCHAR(50) NOT NULL DEFAULT 'viewer',
                created_by VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                metadata JSONB DEFAULT '{}'
            )
        """
        self.conn.execute_query(table_query)
        self.conn.execute_query("CREATE INDEX IF NOT EXISTS idx_shared_links_token ON shared_links(token)")
        self.conn.execute_query("CREATE INDEX IF NOT EXISTS idx_shared_links_resource ON shared_links(resource_type, resource_id)")
        self.conn.execute_query("CREATE INDEX IF NOT EXISTS idx_shared_links_created_by ON shared_links(created_by)")

    def create_shared_link(self, link_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create shared link for resource"""
        self._ensure_shared_links_table()
        query = """
            INSERT INTO shared_links 
            (id, token, resource_type, resource_id, permission, created_by, expires_at, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        params = (
            link_data.get('id'),
            link_data.get('token'),
            link_data.get('resource_type'),
            link_data.get('resource_id'),
            link_data.get('permission', 'viewer'),
            link_data.get('created_by'),
            link_data.get('expires_at'),
            Json(link_data.get('metadata', {}))
        )
        result = self.conn.fetch_one(query, params)
        return dict(result) if result else None
    
    def get_shared_link_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Get shared link by token"""
        self._ensure_shared_links_table()
        query = """
            SELECT * FROM shared_links 
            WHERE token = %s AND is_active = true
            AND (expires_at IS NULL OR expires_at > NOW())
        """
        result = self.conn.fetch_one(query, (token,))
        return dict(result) if result else None
    
    def get_shared_links_by_resource(self, resource_type: str, resource_id: str = None) -> List[Dict[str, Any]]:
        """Get all shared links for a resource"""
        self._ensure_shared_links_table()
        if resource_id:
            query = "SELECT * FROM shared_links WHERE resource_type = %s AND resource_id = %s AND is_active = true ORDER BY created_at DESC"
            return self.conn.fetch_all(query, (resource_type, resource_id))
        else:
            query = "SELECT * FROM shared_links WHERE resource_type = %s AND resource_id IS NULL AND is_active = true ORDER BY created_at DESC"
            return self.conn.fetch_all(query, (resource_type,))
    
    def update_shared_link(self, link_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update shared link"""
        self._ensure_shared_links_table()
        set_clauses = []
        params = []
        
        if 'permission' in updates:
            set_clauses.append("permission = %s")
            params.append(updates['permission'])
        if 'is_active' in updates:
            set_clauses.append("is_active = %s")
            params.append(updates['is_active'])
        if 'expires_at' in updates:
            set_clauses.append("expires_at = %s")
            params.append(updates['expires_at'])
        
        if not set_clauses:
            return None
        
        params.append(link_id)
        query = f"UPDATE shared_links SET {', '.join(set_clauses)} WHERE id = %s RETURNING *"
        result = self.conn.fetch_one(query, tuple(params))
        return dict(result) if result else None
    
    def delete_shared_link(self, link_id: str) -> bool:
        """Delete shared link"""
        self._ensure_shared_links_table()
        query = "DELETE FROM shared_links WHERE id = %s"
        return self.conn.execute_query(query, (link_id,))

    # ==================== DIRECT ACCESS ====================
    def create_direct_access(self, access_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create direct access for resource"""
        query = """
            INSERT INTO direct_access 
            (id, resource_type, resource_id, user_ids, department_ids, permission, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING *
        """
        params = (
            access_data.get('id'),
            access_data.get('resource_type'),
            access_data.get('resource_id'),
            access_data.get('user_ids', []),
            access_data.get('department_ids', []),
            access_data.get('permission', 'viewer')
        )
        result = self.conn.fetch_one(query, params)
        return dict(result) if result else None
    
    def get_direct_access(self, resource_type: str, resource_id: str) -> Optional[Dict[str, Any]]:
        """Get direct access for resource"""
        query = """
            SELECT * FROM direct_access 
            WHERE resource_type = %s AND resource_id = %s
        """
        result = self.conn.fetch_one(query, (resource_type, resource_id))
        return dict(result) if result else None
    
    def update_direct_access(self, access_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update direct access"""
        set_clauses = ['updated_at = NOW()']
        params = []
        
        if 'user_ids' in updates:
            set_clauses.append("user_ids = %s")
            params.append(updates['user_ids'])
        if 'department_ids' in updates:
            set_clauses.append("department_ids = %s")
            params.append(updates['department_ids'])
        if 'permission' in updates:
            set_clauses.append("permission = %s")
            params.append(updates['permission'])
        
        params.append(access_id)
        query = f"UPDATE direct_access SET {', '.join(set_clauses)} WHERE id = %s RETURNING *"
        result = self.conn.fetch_one(query, tuple(params))
        return dict(result) if result else None
    
    def delete_direct_access(self, access_id: str) -> bool:
        """Delete direct access"""
        query = "DELETE FROM direct_access WHERE id = %s"
        return self.conn.execute_query(query, (access_id,))
    
    # Telegram Auth Codes
    def add_telegram_auth_code(self, code: str, data: Dict[str, Any]) -> None:
        """Добавить код авторизации Telegram"""
        query = """
            INSERT INTO telegram_auth_codes 
            (code, authenticated, user_data, created_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (code) DO UPDATE SET
                authenticated = EXCLUDED.authenticated,
                user_data = EXCLUDED.user_data,
                created_at = NOW()
        """
        user_json = Json(data.get('user')) if data.get('user') else None
        self.conn.execute_query(query, (code, data.get('authenticated', False), user_json))
    
    def get_telegram_auth_code(self, code: str) -> Optional[Dict[str, Any]]:
        """Получить данные кода авторизации"""
        query = "SELECT * FROM telegram_auth_codes WHERE code = %s"
        result = self.conn.fetch_one(query, (code,))
        if result:
            return {
                'code': result.get('code'),
                'authenticated': result.get('authenticated'),
                'user': result.get('user_data'),
                'created_at': result.get('created_at').isoformat() if result.get('created_at') else None
            }
        return None
    
    def update_telegram_auth_code(self, code: str, data: Dict[str, Any]) -> bool:
        """Обновить данные кода авторизации"""
        query = """
            UPDATE telegram_auth_codes 
            SET authenticated = %s, user_data = %s
            WHERE code = %s
        """
        user_json = Json(data.get('user')) if data.get('user') else None
        return self.conn.execute_query(query, (data.get('authenticated', False), user_json, code))
    
    def delete_telegram_auth_code(self, code: str) -> bool:
        """Удалить использованный код"""
        query = "DELETE FROM telegram_auth_codes WHERE code = %s"
        return self.conn.execute_query(query, (code,))
    
    def cleanup_old_telegram_codes(self, hours: int = 24) -> int:
        """Очистить устаревшие коды (старше указанного времени)"""
        query = f"""
            DELETE FROM telegram_auth_codes 
            WHERE created_at < NOW() - INTERVAL '{hours} hours'
        """
        self.conn.execute_query(query)
        # Получаем количество удаленных записей
        count_query = "SELECT ROW_COUNT()"
        result = self.conn.fetch_one(count_query)
        return result.get('row_count', 0) if result else 0
