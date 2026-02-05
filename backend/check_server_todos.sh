#!/bin/bash
cd /var/www/feed-editor/backend
python3 << 'EOF'
import json
with open('database.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    print(f"Todos: {len(data.get('todos', []))}")
    print(f"Tasks: {len(data.get('tasks', []))}")
    if data.get('todos'):
        print(f"\nFirst todo: {data['todos'][0].get('title', 'No title')}")
EOF
