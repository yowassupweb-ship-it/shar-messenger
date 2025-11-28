import json
from collections import defaultdict

# Загружаем базу данных
with open('backend/database.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

products = data.get('products', [])
print(f'Всего товаров: {len(products)}\n')

# Группируем по id
by_id = defaultdict(list)
for i, p in enumerate(products):
    by_id[p['id']].append((i, p.get('sourceId'), p.get('name')))

# Находим дубли
duplicates = {k: v for k, v in by_id.items() if len(v) > 1}

print(f'Товаров с дублирующимся ID: {len(duplicates)}\n')

for tour_id, entries in sorted(duplicates.items()):
    print(f'\n{tour_id}: {len(entries)} вхождений')
    for idx, source_id, name in entries:
        print(f'  [{idx}] sourceId: {source_id[:20]}... | {name[:50]}')

# Удаляем дубликаты - оставляем первое вхождение каждой комбинации (id, sourceId)
seen = set()
unique = []
removed_indices = []

for i, p in enumerate(products):
    key = (p['id'], p.get('sourceId'))
    if key not in seen:
        seen.add(key)
        unique.append(p)
    else:
        removed_indices.append(i)

print(f'\n\nУдалено записей: {len(removed_indices)}')
print(f'Индексы удалённых: {removed_indices}')
print(f'Осталось товаров: {len(unique)}')

if len(removed_indices) > 0:
    # Сохраняем
    data['products'] = unique
    with open('backend/database.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print('\n✓ База данных очищена')
else:
    print('\n✓ Дубликаты не найдены (все комбинации id+sourceId уникальны)')
