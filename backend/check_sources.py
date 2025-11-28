import json

# Загрузка базы данных
with open('database.json', encoding='utf-8') as f:
    data = json.load(f)

products = data.get('products', [])

# Группировка по источникам
sources = {}
for p in products:
    source_id = p.get('sourceId', 'unknown')
    if source_id not in sources:
        sources[source_id] = []
    sources[source_id].append(p)

print(f"Всего продуктов: {len(products)}")
print(f"\nПо источникам:")

# Найдём информацию об источниках
data_sources = {ds['id']: ds for ds in data.get('dataSources', [])}

for source_id, items in sorted(sources.items(), key=lambda x: len(x[1]), reverse=True):
    source_info = data_sources.get(source_id, {})
    source_name = source_info.get('name', source_id)
    source_url = source_info.get('url', '')
    
    # Подсчёт уникальных названий
    unique_names = set(p.get('name') for p in items)
    
    print(f"\n{source_name} ({source_id}):")
    print(f"  URL: {source_url[:80] if source_url else 'N/A'}")
    print(f"  Всего ведомостей: {len(items)}")
    print(f"  Уникальных туров: {len(unique_names)}")
