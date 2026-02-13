import psycopg2

try:
    conn = psycopg2.connect(
        dbname='shar_messenger',
        user='postgres',
        password='Traplord999!',
        host='localhost'
    )
    cur = conn.cursor()
    
    # 1. Добавляем department в links
    print("Adding department to links...")
    cur.execute('ALTER TABLE links ADD COLUMN IF NOT EXISTS department VARCHAR(255)')
    
    # 2. Добавляем author_id в tasks
    print("Adding author_id to tasks...")
    cur.execute('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS author_id VARCHAR(255)')
    
    # 3. Создаем таблицу link_lists для списков ссылок
    print("Creating link_lists table...")
    cur.execute('''
        CREATE TABLE IF NOT EXISTS link_lists (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            color VARCHAR(50) DEFAULT '#3b82f6',
            icon VARCHAR(255),
            department VARCHAR(255),
            created_by VARCHAR(255),
            allowed_users TEXT[] DEFAULT '{}',
            allowed_departments TEXT[] DEFAULT '{}',
            is_public BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            list_order INTEGER DEFAULT 0
        )
    ''')
    
    # 4. Создаем таблицу todo_lists для списков задач
    print("Creating todo_lists table...")
    cur.execute('''
        CREATE TABLE IF NOT EXISTS todo_lists (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            color VARCHAR(50) DEFAULT '#3b82f6',
            icon VARCHAR(255),
            department VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            list_order INTEGER DEFAULT 0
        )
    ''')
    
    # 5. Создаем таблицу todo_categories для категорий задач
    print("Creating todo_categories table...")
    cur.execute('''
        CREATE TABLE IF NOT EXISTS todo_categories (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            color VARCHAR(50) DEFAULT '#3b82f6',
            icon VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            category_order INTEGER DEFAULT 0
        )
    ''')
    
    # 6. Создаем таблицу content_plans (контент-план)
    print("Creating content_plans table...")
    cur.execute('''
        CREATE TABLE IF NOT EXISTS content_plans (
            id VARCHAR(255) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            content TEXT,
            status VARCHAR(50) DEFAULT 'draft',
            post_type VARCHAR(100),
            scheduled_date TIMESTAMP,
            published_date TIMESTAMP,
            platform VARCHAR(100),
            tags JSONB DEFAULT '[]',
            author_id VARCHAR(255),
            assigned_to_ids JSONB DEFAULT '[]',
            attachments JSONB DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            metadata JSONB DEFAULT '{}',
            FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
        )
    ''')
    
    cur.execute('CREATE INDEX IF NOT EXISTS idx_content_plans_author_id ON content_plans(author_id)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_content_plans_status ON content_plans(status)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_content_plans_scheduled_date ON content_plans(scheduled_date)')
    
    conn.commit()
    print("\n✅ All tables created/updated successfully!")
    
    # Проверяем результат
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('links', 'link_lists', 'todo_lists', 'todo_categories', 'content_plans')
        ORDER BY table_name
    """)
    
    print("\n=== Created/Updated tables ===")
    for row in cur.fetchall():
        print(f"  ✓ {row[0]}")
    
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
