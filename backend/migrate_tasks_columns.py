#!/usr/bin/env python3
"""Migration: Add missing columns to tasks table"""

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
        
        # Add missing columns to tasks table
        migrations = [
            # Add list_id column
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'tasks' AND column_name = 'list_id'
                ) THEN
                    ALTER TABLE tasks ADD COLUMN list_id VARCHAR(255);
                    ALTER TABLE tasks ADD CONSTRAINT fk_tasks_list_id 
                        FOREIGN KEY (list_id) REFERENCES todo_lists(id) ON DELETE SET NULL;
                    CREATE INDEX idx_tasks_list_id ON tasks(list_id);
                END IF;
            END $$;
            """,
            # Add assigned_to_ids column
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'tasks' AND column_name = 'assigned_to_ids'
                ) THEN
                    ALTER TABLE tasks ADD COLUMN assigned_to_ids JSONB DEFAULT '[]';
                END IF;
            END $$;
            """,
            # Add metadata column (stores stages + recurrence)
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'tasks' AND column_name = 'metadata'
                ) THEN
                    ALTER TABLE tasks ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
                END IF;
            END $$;
            """,
            # Add category_id column
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'tasks' AND column_name = 'category_id'
                ) THEN
                    ALTER TABLE tasks ADD COLUMN category_id VARCHAR(255);
                    CREATE INDEX idx_tasks_category_id ON tasks(category_id);
                END IF;
            END $$;
            """,
            # Add archived column
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'tasks' AND column_name = 'archived'
                ) THEN
                    ALTER TABLE tasks ADD COLUMN archived BOOLEAN DEFAULT false;
                    CREATE INDEX idx_tasks_archived ON tasks(archived);
                END IF;
            END $$;
            """,
            # Add assignee_response column
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'tasks' AND column_name = 'assignee_response'
                ) THEN
                    ALTER TABLE tasks ADD COLUMN assignee_response TEXT;
                END IF;
            END $$;
            """,
            # Add calendar linkage columns
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'tasks' AND column_name = 'calendar_event_id'
                ) THEN
                    ALTER TABLE tasks ADD COLUMN calendar_event_id VARCHAR(255);
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'tasks' AND column_name = 'calendar_list_id'
                ) THEN
                    ALTER TABLE tasks ADD COLUMN calendar_list_id VARCHAR(255);
                END IF;
            END $$;
            """,
            # Add tags column
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'tasks' AND column_name = 'tags'
                ) THEN
                    ALTER TABLE tasks ADD COLUMN tags JSONB DEFAULT '[]';
                END IF;
            END $$;
            """,
            # Add is_completed column
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'tasks' AND column_name = 'is_completed'
                ) THEN
                    ALTER TABLE tasks ADD COLUMN is_completed BOOLEAN DEFAULT false;
                    CREATE INDEX idx_tasks_is_completed ON tasks(is_completed);
                END IF;
            END $$;
            """,
            # Add add_to_calendar column
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'tasks' AND column_name = 'add_to_calendar'
                ) THEN
                    ALTER TABLE tasks ADD COLUMN add_to_calendar BOOLEAN DEFAULT false;
                END IF;
            END $$;
            """,
            # Add task_order column
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'tasks' AND column_name = 'task_order'
                ) THEN
                    ALTER TABLE tasks ADD COLUMN task_order INTEGER DEFAULT 0;
                END IF;
            END $$;
            """,
            # Add missing author/assignee columns if needed
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'tasks' AND column_name = 'author_id'
                ) THEN
                    ALTER TABLE tasks ADD COLUMN author_id VARCHAR(255);
                    CREATE INDEX idx_tasks_author_id ON tasks(author_id);
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'tasks' AND column_name = 'assigned_by_id'
                ) THEN
                    ALTER TABLE tasks ADD COLUMN assigned_by_id VARCHAR(255);
                    CREATE INDEX idx_tasks_assigned_by_id ON tasks(assigned_by_id);
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'tasks' AND column_name = 'assigned_to'
                ) THEN
                    ALTER TABLE tasks ADD COLUMN assigned_to VARCHAR(255);
                END IF;
            END $$;
            """,
        ]
        
        for migration in migrations:
            print(f"Executing migration...")
            cursor.execute(migration)
            conn.commit()
            print("✓ Migration step completed")
        
        print("\n✓ All migrations completed successfully: tasks table updated")
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
