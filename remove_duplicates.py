import json

# Загружаем базу данных
with open('backend/database.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

products = data.get('products', [])
print(f'Всего товаров до очистки: {len(products)}')

# Удаляем дубликаты по комбинации id + sourceId
seen = {}
unique = []

for p in products:
    key = (p['id'], p.get('sourceId'))
    if key not in seen:
        seen[key] = True
        unique.append(p)

print(f'Удалено дубликатов: {len(products) - len(unique)}')
print(f'Осталось товаров: {len(unique)}')

# Сохраняем обратно
data['products'] = unique
with open('backend/database.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('✓ База данных очищена от дубликатов')
