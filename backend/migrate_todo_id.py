#!/usr/bin/env python3
"""Migration: Add todo_id column to chats table"""

import psycopg2

def migrate():
    # Connect to PostgreSQL
    conn = psycopg2.connect(
        host="81.90.31.129",
        port=5432,
        database="shar_messenger",
        user="postgres",
        password="Traplord999!"
    )
    
    try:
        cursor = conn.cursor()
        
        # Add todo_id column if it doesn't exist
        query = """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'chats' AND column_name = 'todo_id'
            ) THEN
                ALTER TABLE chats ADD COLUMN todo_id VARCHAR(255);
                CREATE INDEX idx_chats_todo_id ON chats(todo_id);
            END IF;
        END $$;
        """
        cursor.execute(query)
        conn.commit()
        print("✓ Migration completed: todo_id column added to chats table")
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
