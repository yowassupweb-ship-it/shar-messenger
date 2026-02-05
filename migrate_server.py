#!/usr/bin/python3
import json
import psycopg2
from psycopg2.extras import RealDictCursor
import sys

def connect_to_postgres():
    """Подключение к удалённой PostgreSQL"""
    return psycopg2.connect(
        host='81.90.31.129',
        port=5432,
        database='shar_messenger',
        user='postgres',
        password='Traplord999!'
    )

def migrate_tasks():
    """Миграция задач из JSON в PostgreSQL"""
    try:
        # Читаем JSON файл
        with open('frontend/data/database.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        tasks = data.get('tasks', [])
        todo_lists = data.get('todoLists', [])
        todo_categories = data.get('todoCategories', [])
        
        print(f"Найдено в JSON:")
        print(f"- Задач: {len(tasks)}")
        print(f"- Списков: {len(todo_lists)}")
        print(f"- Категорий: {len(todo_categories)}")
        
        if not tasks and not todo_lists and not todo_categories:
            print("Нет данных для миграции")
            return
        
        # Подключаемся к PostgreSQL
        conn = connect_to_postgres()
        cursor = conn.cursor()
        
        # Мигрируем категории
        for category in todo_categories:
            cursor.execute("""
                INSERT INTO todo_categories (id, name, color, icon, description, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """, (
                category.get('id'),
                category.get('name', ''),
                category.get('color', '#3b82f6'),
                category.get('icon', ''),
                category.get('description', '')
            ))
        
        # Мигрируем списки
        for todo_list in todo_lists:
            cursor.execute("""
                INSERT INTO todo_lists (id, name, color, icon, description, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """, (
                todo_list.get('id'),
                todo_list.get('name', ''),
                todo_list.get('color', '#3b82f6'),
                todo_list.get('icon', ''),
                todo_list.get('description', '')
            ))
        
        # Мигрируем задачи
        for task in tasks:
            cursor.execute("""
                INSERT INTO tasks (
                    id, title, description, status, priority, due_date,
                    author_id, assigned_by_id, assigned_to_id, list_id,
                    tags, is_completed, add_to_calendar, order_index,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (
                task.get('id'),
                task.get('title', ''),
                task.get('description', ''),
                task.get('status', 'todo'),
                task.get('priority', 'medium'),
                task.get('dueDate'),
                task.get('authorId'),
                task.get('assignedById'),
                task.get('assignedToId'),
                task.get('listId'),
                json.dumps(task.get('tags', [])),
                task.get('completed', False),
                task.get('addToCalendar', False),
                task.get('order', 0),
                task.get('createdAt', 'NOW()'),
                task.get('updatedAt', 'NOW()')
            ))
        
        conn.commit()
        print(f"✅ Миграция завершена:")
        print(f"- Категорий: {len(todo_categories)}")
        print(f"- Списков: {len(todo_lists)}")  
        print(f"- Задач: {len(tasks)}")
        
    except Exception as e:
        print(f"❌ Ошибка миграции: {e}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    migrate_tasks()