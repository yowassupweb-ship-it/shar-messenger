#!/usr/bin/env python3
"""
Миграция задач из database.json сервера в удалённую PostgreSQL
"""

import json
import paramiko
from backend.db_postgres import PostgresConnection
import uuid
from datetime import datetime

def migrate_tasks():
    # Подключаемся к серверу по SSH и читаем JSON файл
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('81.90.31.129', username='root', password='<password>')
    
    # Читаем файл JSON с сервера
    stdin, stdout, stderr = ssh.exec_command('cat /var/www/feed-editor/backend/database.json')
    json_data = stdout.read().decode()
    
    ssh.close()
    
    # Парсим JSON
    data = json.loads(json_data)
    
    # Подключаемся к PostgreSQL
    conn = PostgresConnection()
    conn.connect()
    
    # Переносим задачи
    tasks = data.get('tasks', [])
    print(f"Найдено задач для миграции: {len(tasks)}")
    
    for task in tasks:
        task_id = task.get('id', str(uuid.uuid4()))
        title = task.get('title', '')
        description = task.get('description', '')
        status = task.get('status', 'todo')
        priority = task.get('priority', 'medium')
        assigned_to = task.get('assignedTo', task.get('assigned_to'))
        assigned_to_ids = json.dumps(task.get('assignedToIds', []))
        author_id = task.get('authorId', task.get('author_id'))
        assigned_by_id = task.get('assignedById', task.get('assigned_by_id'))
        created_at = task.get('createdAt', datetime.now().isoformat())
        updated_at = task.get('updatedAt', datetime.now().isoformat())
        metadata = json.dumps({
            'listId': task.get('listId'),
            'tags': task.get('tags', []),
            'isCompleted': task.get('isCompleted', False),
            'addToCalendar': task.get('addToCalendar', False),
            'order': task.get('order', 0),
            'assignedToNames': task.get('assignedToNames', [])
        })
        
        # Вставляем в PostgreSQL
        query = """
        INSERT INTO tasks (id, title, description, status, priority, 
                          assigned_to, assigned_to_ids, author_id, assigned_by_id,
                          created_at, updated_at, metadata)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
        """
        
        params = (task_id, title, description, status, priority,
                 assigned_to, assigned_to_ids, author_id, assigned_by_id,
                 created_at, updated_at, metadata)
        
        success = conn.execute_query(query, params)
        if success:
            print(f"✅ Задача '{title}' добавлена")
        else:
            print(f"❌ Ошибка добавления '{title}'")
    
    # Переносим списки задач
    todo_lists = data.get('todo_lists', [])
    print(f"\nНайдено списков для миграции: {len(todo_lists)}")
    
    for todo_list in todo_lists:
        list_id = todo_list.get('id', str(uuid.uuid4()))
        name = todo_list.get('name', '')
        color = todo_list.get('color', '#3b82f6')
        icon = todo_list.get('icon', '')
        department = todo_list.get('department')
        created_at = todo_list.get('createdAt', datetime.now().isoformat())
        updated_at = todo_list.get('updatedAt', datetime.now().isoformat())
        list_order = todo_list.get('order', 0)
        
        query = """
        INSERT INTO todo_lists (id, name, color, icon, department, 
                               created_at, updated_at, list_order)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
        """
        
        params = (list_id, name, color, icon, department, 
                 created_at, updated_at, list_order)
        
        success = conn.execute_query(query, params)
        if success:
            print(f"✅ Список '{name}' добавлен")
    
    # Переносим категории
    todo_categories = data.get('todo_categories', [])
    print(f"\nНайдено категорий для миграции: {len(todo_categories)}")
    
    for category in todo_categories:
        cat_id = category.get('id', str(uuid.uuid4()))
        name = category.get('name', '')
        color = category.get('color', '#3b82f6')
        icon = category.get('icon', '')
        created_at = category.get('createdAt', datetime.now().isoformat())
        updated_at = category.get('updatedAt', datetime.now().isoformat())
        category_order = category.get('order', 0)
        
        query = """
        INSERT INTO todo_categories (id, name, color, icon,
                                   created_at, updated_at, category_order)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
        """
        
        params = (cat_id, name, color, icon, created_at, updated_at, category_order)
        
        success = conn.execute_query(query, params)
        if success:
            print(f"✅ Категория '{name}' добавлена")
    
    conn.disconnect()
    print("\n🎉 Миграция завершена!")

if __name__ == "__main__":
    migrate_tasks()