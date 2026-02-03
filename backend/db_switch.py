#!/usr/bin/env python3
"""
Quick switcher between JSON and PostgreSQL databases
Allows seamless switching without code changes
"""

import os
import sys
import subprocess
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

class DatabaseSwitcher:
    def __init__(self):
        self.env_file = '.env'
        self.backend_dir = Path(__file__).parent
        
    def read_env(self):
        """Read current .env settings"""
        if not os.path.exists(self.env_file):
            return {}
        
        env_vars = {}
        with open(self.env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
        return env_vars
    
    def write_env(self, env_vars):
        """Write .env settings"""
        with open(self.env_file, 'w') as f:
            for key, value in env_vars.items():
                f.write(f"{key}={value}\n")
    
    def is_using_postgres(self):
        """Check if currently using PostgreSQL"""
        env_vars = self.read_env()
        return env_vars.get('USE_POSTGRES', 'false').lower() == 'true'
    
    def switch_to_postgres(self):
        """Switch to PostgreSQL database"""
        print("\n🔄 Switching to PostgreSQL...")
        print("-" * 60)
        
        env_vars = self.read_env()
        
        # Validate PostgreSQL settings
        if not self._validate_postgres_connection():
            print("\n❌ Cannot connect to PostgreSQL. Check your settings:")
            print(f"   DB_HOST: {env_vars.get('DB_HOST', 'localhost')}")
            print(f"   DB_PORT: {env_vars.get('DB_PORT', '5432')}")
            print(f"   DB_NAME: {env_vars.get('DB_NAME', 'shar_messenger')}")
            print(f"   DB_USER: {env_vars.get('DB_USER', 'postgres')}")
            return False
        
        # Update .env
        env_vars['USE_POSTGRES'] = 'true'
        self.write_env(env_vars)
        
        print("✅ Updated .env: USE_POSTGRES=true")
        print("\n⚠️  Remember to:")
        print("   1. Update main.py import: from db_adapter import db")
        print("   2. Restart the backend application")
        print("   3. Test all API endpoints")
        
        return True
    
    def switch_to_json(self):
        """Switch back to JSON database"""
        print("\n🔄 Switching to JSON database...")
        print("-" * 60)
        
        env_vars = self.read_env()
        env_vars['USE_POSTGRES'] = 'false'
        self.write_env(env_vars)
        
        print("✅ Updated .env: USE_POSTGRES=false")
        print("\n⚠️  Remember to:")
        print("   1. Update main.py import: from database import Database")
        print("   2. Restart the backend application")
        print("   3. Check that database.json exists and is valid")
        
        return True
    
    def _validate_postgres_connection(self):
        """Validate PostgreSQL connection"""
        try:
            import psycopg2
            env_vars = self.read_env()
            
            conn = psycopg2.connect(
                host=env_vars.get('DB_HOST', 'localhost'),
                port=int(env_vars.get('DB_PORT', '5432')),
                database=env_vars.get('DB_NAME', 'shar_messenger'),
                user=env_vars.get('DB_USER', 'postgres'),
                password=env_vars.get('DB_PASSWORD', 'postgres'),
                connect_timeout=5
            )
            conn.close()
            return True
        except Exception as e:
            print(f"Connection error: {e}")
            return False
    
    def show_status(self):
        """Show current database status"""
        print("\n" + "=" * 60)
        print("📊 DATABASE STATUS")
        print("=" * 60)
        
        env_vars = self.read_env()
        current_db = "PostgreSQL" if self.is_using_postgres() else "JSON"
        
        print(f"\n✓ Current Database: {current_db}")
        print(f"✓ Configuration:")
        print(f"  - USE_POSTGRES: {env_vars.get('USE_POSTGRES', 'not set')}")
        
        if self.is_using_postgres():
            print(f"  - DB_HOST: {env_vars.get('DB_HOST', 'not set')}")
            print(f"  - DB_PORT: {env_vars.get('DB_PORT', 'not set')}")
            print(f"  - DB_NAME: {env_vars.get('DB_NAME', 'not set')}")
            print(f"  - DB_USER: {env_vars.get('DB_USER', 'not set')}")
            
            # Try to show record counts
            try:
                from db_postgres import PostgresConnection, PostgresDatabase
                conn = PostgresConnection(
                    host=env_vars.get('DB_HOST', 'localhost'),
                    port=int(env_vars.get('DB_PORT', '5432')),
                    database=env_vars.get('DB_NAME', 'shar_messenger'),
                    user=env_vars.get('DB_USER', 'postgres'),
                    password=env_vars.get('DB_PASSWORD', 'postgres')
                )
                
                if conn.connect():
                    print(f"\n✓ Record Counts:")
                    
                    tables = ['users', 'chats', 'messages', 'products', 'data_sources', 'feeds']
                    for table in tables:
                        result = conn.fetch_one(f"SELECT COUNT(*) as count FROM {table}")
                        if result:
                            print(f"  - {table}: {result['count']}")
                    
                    conn.disconnect()
            except Exception as e:
                print(f"\n⚠️  Could not fetch record counts: {e}")
        else:
            # Check JSON database
            if os.path.exists('database.json'):
                import json
                try:
                    with open('database.json', 'r') as f:
                        data = json.load(f)
                    print(f"\n✓ JSON Database File: database.json")
                    print(f"✓ Record Counts:")
                    for key in ['users', 'chats', 'messages', 'products', 'dataSources', 'feeds']:
                        count = len(data.get(key, []))
                        print(f"  - {key}: {count}")
                except Exception as e:
                    print(f"\n❌ Error reading database.json: {e}")
            else:
                print(f"\n⚠️  database.json not found!")
        
        print("\n" + "=" * 60)
    
    def run_migration(self):
        """Run the migration script"""
        print("\n🔄 Running migration from JSON to PostgreSQL...")
        print("-" * 60)
        
        # Check if PostgreSQL is available
        if not self._validate_postgres_connection():
            print("❌ PostgreSQL is not available. Please set it up first.")
            print("\nQuick setup:")
            print("  docker-compose up -d  # Start PostgreSQL")
            print("  Then run migration again")
            return False
        
        # Run migrate_to_postgres.py
        try:
            result = subprocess.run(
                [sys.executable, 'migrate_to_postgres.py'],
                capture_output=True,
                text=True
            )
            
            print(result.stdout)
            if result.stderr:
                print("Errors/Warnings:")
                print(result.stderr)
            
            return result.returncode == 0
        except Exception as e:
            print(f"❌ Error running migration: {e}")
            return False
    
    def show_help(self):
        """Show help message"""
        print("\n" + "=" * 60)
        print("Database Switcher - Manage JSON/PostgreSQL switching")
        print("=" * 60)
        print("\nUsage: python db_switch.py [COMMAND]\n")
        print("Commands:")
        print("  status          Show current database status")
        print("  to-postgres     Switch to PostgreSQL database")
        print("  to-json         Switch back to JSON database")
        print("  migrate         Run migration from JSON to PostgreSQL")
        print("  help            Show this help message\n")
        print("Examples:")
        print("  python db_switch.py status")
        print("  python db_switch.py migrate")
        print("  python db_switch.py to-postgres")
        print("=" * 60 + "\n")

def main():
    switcher = DatabaseSwitcher()
    
    if len(sys.argv) < 2:
        switcher.show_help()
        return
    
    command = sys.argv[1].lower()
    
    if command == 'status':
        switcher.show_status()
    elif command == 'to-postgres':
        if switcher.switch_to_postgres():
            print("\n✅ Ready to switch! Don't forget to restart the app.")
        else:
            sys.exit(1)
    elif command == 'to-json':
        if switcher.switch_to_json():
            print("\n✅ Ready to switch! Don't forget to restart the app.")
    elif command == 'migrate':
        if switcher.run_migration():
            print("\n✅ Migration completed!")
            print("\nNext steps:")
            print("  1. Review the summary above")
            print("  2. Test in UI that all data is there")
            print("  3. Run: python db_switch.py to-postgres")
            print("  4. Restart the application")
        else:
            print("\n❌ Migration failed. Check errors above.")
            sys.exit(1)
    elif command == 'help':
        switcher.show_help()
    else:
        print(f"❌ Unknown command: {command}\n")
        switcher.show_help()
        sys.exit(1)

if __name__ == '__main__':
    main()
