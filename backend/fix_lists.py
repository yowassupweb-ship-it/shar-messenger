from db_adapter import DatabaseAdapter

db = DatabaseAdapter()

# Удаляем все списки кроме первого
print('Deleting wrong lists...')
lists = db.get_todo_lists()
for lst in lists:
    if lst['id'] != '6f0001d5-4153-4af0-a419-5e1d16ae219d':
        db.delete_todo_list(lst['id'])
        print(f"Deleted: {lst.get('name', lst['id'])}")

# Создаём списки с правильными ID
lists_to_create = [
    {'id': 'work', 'name': 'Работа', 'color': '#3b82f6', 'icon': 'briefcase', 'order': 0},
    {'id': 'tz-list', 'name': 'ТЗ', 'color': '#10b981', 'icon': 'file-text', 'order': 1},
    {'id': '20260112_074219_lfmfmx', 'name': 'Разработка', 'color': '#8b5cf6', 'icon': 'code', 'order': 2},
    {'id': '20260127_072425_8d4fvz', 'name': 'Задачи', 'color': '#f59e0b', 'icon': 'check-square', 'order': 3},
    {'id': '20260202_093527_hqa69r', 'name': 'Новые задачи', 'color': '#ef4444', 'icon': 'plus-circle', 'order': 4},
    {'id': '20260202_093642_m987yf', 'name': 'Проекты', 'color': '#06b6d4', 'icon': 'folder', 'order': 5},
    {'id': '20260202_094413_xgl1ep', 'name': 'Архив', 'color': '#6b7280', 'icon': 'archive', 'order': 6},
    {'id': '20260202_094137_qdxx9v', 'name': 'Идеи', 'color': '#ec4899', 'icon': 'lightbulb', 'order': 7},
    {'id': '20260202_093921_ujv7c0', 'name': 'Планы', 'color': '#14b8a6', 'icon': 'calendar', 'order': 8},
    {'id': '20260126_161933_gmquii', 'name': 'Важное', 'color': '#dc2626', 'icon': 'star', 'order': 9},
    {'id': '20260114_145409_ttre7n', 'name': 'Обсуждение', 'color': '#7c3aed', 'icon': 'message-circle', 'order': 10},
    {'id': '20260114_145419_wutg2d', 'name': 'Завершено', 'color': '#059669', 'icon': 'check-circle', 'order': 11},
    {'id': '20260128_130248_pzhzpi', 'name': 'Прочее', 'color': '#9ca3af', 'icon': 'inbox', 'order': 12},
]

print('\nCreating lists with correct IDs...')
for lst in lists_to_create:
    result = db.add_todo_list(lst)
    if result:
        print(f"✓ {lst['name']} (ID: {lst['id']})")
    else:
        print(f"✗ Failed: {lst['name']}")

print(f'\n✅ Done! Created {len(lists_to_create)} lists')

# Проверка
final_lists = db.get_todo_lists()
print(f'\nTotal lists in DB: {len(final_lists)}')
