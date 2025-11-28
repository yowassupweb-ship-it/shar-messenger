import json
from collections import defaultdict

# Загрузка базы данных
with open('database.json', encoding='utf-8') as f:
    data = json.load(f)

products = data.get('products', [])

# Группировка по названию
tours_by_name = defaultdict(list)
for p in products:
    name = p.get('name', 'Без названия')
    tours_by_name[name].append(p.get('id'))

print(f"Всего продуктов: {len(products)}")
print(f"Уникальных названий туров: {len(tours_by_name)}")
print()

# Топ-10 туров по количеству дат
top_tours = sorted(tours_by_name.items(), key=lambda x: len(x[1]), reverse=True)[:10]
print("Топ-10 туров с наибольшим количеством дат:")
for name, product_ids in top_tours:
    print(f"  {name[:70]}: {len(product_ids)} дат")

print()
print(f"Туров с 1 датой: {sum(1 for ids in tours_by_name.values() if len(ids) == 1)}")
print(f"Туров с 2+ датами: {sum(1 for ids in tours_by_name.values() if len(ids) > 1)}")
