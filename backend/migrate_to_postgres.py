"""
Migration script to transfer data from database.json to PostgreSQL
Run this script before switching to the new database
"""
import json
import os
from datetime import datetime
from db_postgres import PostgresConnection, PostgresDatabase
import sys

def load_json_database(json_path: str = 'database.json') -> dict:
    """Load data from JSON file"""
    if not os.path.exists(json_path):
        print(f"❌ JSON database not found: {json_path}")
        return {}
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"✅ Loaded JSON database from {json_path}")
    return data

def migrate_users(db: PostgresDatabase, json_data: dict) -> int:
    """Migrate users from JSON to PostgreSQL"""
    users = json_data.get('users', [])
    migrated = 0
    
    print(f"\n📦 Migrating {len(users)} users...")
    
    for user in users:
        try:
            # Check if user exists
            existing = db.get_user(user.get('id'))
            if not existing:
                db.add_user(user)
                migrated += 1
                print(f"   ✓ {user.get('name')} ({user.get('username')})")
            else:
                print(f"   ⊘ {user.get('name')} (already exists)")
        except Exception as e:
            print(f"   ❌ Error migrating {user.get('name')}: {e}")
    
    print(f"✅ Migrated {migrated}/{len(users)} users")
    return migrated

def migrate_data_sources(db: PostgresDatabase, json_data: dict) -> int:
    """Migrate data sources from JSON to PostgreSQL"""
    sources = json_data.get('dataSources', [])
    migrated = 0
    
    print(f"\n📦 Migrating {len(sources)} data sources...")
    
    for source in sources:
        try:
            existing = db.get_data_source(source.get('id'))
            if not existing:
                db.add_data_source(source)
                migrated += 1
                print(f"   ✓ {source.get('name')}")
            else:
                print(f"   ⊘ {source.get('name')} (already exists)")
        except Exception as e:
            print(f"   ❌ Error migrating source {source.get('name')}: {e}")
    
    print(f"✅ Migrated {migrated}/{len(sources)} data sources")
    return migrated

def migrate_feeds(db: PostgresDatabase, json_data: dict) -> int:
    """Migrate feeds from JSON to PostgreSQL"""
    feeds = json_data.get('feeds', [])
    migrated = 0
    
    print(f"\n📦 Migrating {len(feeds)} feeds...")
    
    for feed in feeds:
        try:
            existing = db.get_feed(feed.get('id'))
            if not existing:
                db.add_feed(feed)
                migrated += 1
                print(f"   ✓ {feed.get('name')}")
            else:
                print(f"   ⊘ {feed.get('name')} (already exists)")
        except Exception as e:
            print(f"   ❌ Error migrating feed {feed.get('name')}: {e}")
    
    print(f"✅ Migrated {migrated}/{len(feeds)} feeds")
    return migrated

def migrate_products(db: PostgresDatabase, json_data: dict) -> int:
    """Migrate products from JSON to PostgreSQL (batch operation)"""
    products = json_data.get('products', [])
    
    if not products:
        print(f"\n📦 No products to migrate")
        return 0
    
    print(f"\n📦 Migrating {len(products)} products (batch operation)...")
    
    try:
        # Split into batches of 1000
        batch_size = 1000
        total_migrated = 0
        
        for i in range(0, len(products), batch_size):
            batch = products[i:i+batch_size]
            db.add_products(batch)
            total_migrated += len(batch)
            print(f"   ✓ Migrated {min(i+batch_size, len(products))}/{len(products)}")
        
        print(f"✅ Migrated {total_migrated} products")
        return total_migrated
    except Exception as e:
        print(f"❌ Error migrating products: {e}")
        return 0

def migrate_chats(db: PostgresDatabase, json_data: dict) -> int:
    """Migrate chats from JSON to PostgreSQL"""
    chats = json_data.get('chats', [])
    migrated = 0
    
    print(f"\n📦 Migrating {len(chats)} chats...")
    
    for chat in chats:
        try:
            existing = db.get_chat(chat.get('id'))
            if not existing:
                db.add_chat(chat)
                migrated += 1
                title = chat.get('title', 'Unknown')
                print(f"   ✓ {title} ({chat.get('id')})")
            else:
                print(f"   ⊘ {chat.get('title', 'Unknown')} (already exists)")
        except Exception as e:
            print(f"   ❌ Error migrating chat: {e}")
    
    print(f"✅ Migrated {migrated}/{len(chats)} chats")
    return migrated

def migrate_messages(db: PostgresDatabase, json_data: dict) -> int:
    """Migrate messages from JSON to PostgreSQL"""
    messages = json_data.get('messages', [])
    migrated = 0
    
    print(f"\n📦 Migrating {len(messages)} messages...")
    
    # Process in batches
    batch_size = 500
    for i in range(0, len(messages), batch_size):
        batch = messages[i:i+batch_size]
        
        for message in batch:
            try:
                db.add_message(message)
                migrated += 1
            except Exception as e:
                print(f"   ❌ Error migrating message: {e}")
        
        print(f"   ✓ Processed {min(i+batch_size, len(messages))}/{len(messages)}")
    
    print(f"✅ Migrated {migrated} messages")
    return migrated

def migrate_settings(db: PostgresDatabase, json_data: dict) -> int:
    """Migrate settings from JSON to PostgreSQL"""
    settings = json_data.get('settings', {})
    
    print(f"\n📦 Migrating settings...")
    
    try:
        if settings:
            db.update_settings(settings)
            print(f"✅ Migrated {len(settings)} settings")
            return len(settings)
        else:
            print(f"⊘ No settings to migrate")
            return 0
    except Exception as e:
        print(f"❌ Error migrating settings: {e}")
        return 0

def migrate_other_data(db: PostgresDatabase, json_data: dict) -> int:
    """Migrate other data structures"""
    migrated = 0
    
    # Templates, Collections, Logs, Analytics, etc. can be added here
    for key in ['templates', 'collections', 'logs', 'analytics', 'wordstatSearches', 
                'wordstatCache', 'trackedPosts']:
        data = json_data.get(key, [])
        if data:
            print(f"⊘ Skipping {key} ({len(data)} items) - implement specific migration if needed")
    
    return migrated

def main():
    """Main migration function"""
    print("=" * 60)
    print("PostgreSQL Migration Tool")
    print("=" * 60)
    
    # Load JSON database
    json_data = load_json_database('database.json')
    if not json_data:
        print("\n❌ Failed to load JSON database")
        sys.exit(1)
    
    # Connect to PostgreSQL
    print("\n🔌 Connecting to PostgreSQL...")
    conn = PostgresConnection()
    if not conn.connect():
        print("❌ Failed to connect to PostgreSQL")
        sys.exit(1)
    
    # Initialize database schema
    print("\n📝 Creating database schema...")
    schema_created = conn.execute_sql_file('schema.sql')
    if not schema_created:
        print("⚠️  Warning: Schema creation may have issues")
    
    # Initialize database wrapper
    db = PostgresDatabase(conn)
    
    # Migration statistics
    stats = {
        'users': 0,
        'data_sources': 0,
        'feeds': 0,
        'products': 0,
        'chats': 0,
        'messages': 0,
        'settings': 0,
        'other': 0
    }
    
    # Run migrations
    try:
        stats['users'] = migrate_users(db, json_data)
        stats['data_sources'] = migrate_data_sources(db, json_data)
        stats['feeds'] = migrate_feeds(db, json_data)
        stats['products'] = migrate_products(db, json_data)
        stats['chats'] = migrate_chats(db, json_data)
        stats['messages'] = migrate_messages(db, json_data)
        stats['settings'] = migrate_settings(db, json_data)
        stats['other'] = migrate_other_data(db, json_data)
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 MIGRATION SUMMARY")
        print("=" * 60)
        print(f"Users:          {stats['users']}")
        print(f"Data Sources:   {stats['data_sources']}")
        print(f"Feeds:          {stats['feeds']}")
        print(f"Products:       {stats['products']}")
        print(f"Chats:          {stats['chats']}")
        print(f"Messages:       {stats['messages']}")
        print(f"Settings:       {stats['settings']}")
        print("-" * 60)
        total = sum(stats.values())
        print(f"TOTAL:          {total} items migrated")
        print("=" * 60)
        
        print("\n✅ Migration completed successfully!")
        print("\n📝 Next steps:")
        print("   1. Update .env file with PostgreSQL credentials")
        print("   2. Update main.py to use new PostgreSQL database")
        print("   3. Test all API endpoints")
        print("   4. Keep database.json as backup (optional)")
        
    except Exception as e:
        print(f"\n❌ Migration error: {e}")
        sys.exit(1)
    finally:
        conn.disconnect()

if __name__ == '__main__':
    main()
