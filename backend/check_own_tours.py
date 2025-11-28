import json
from collections import defaultdict

# Загрузка базы данных
with open('database.json', encoding='utf-8') as f:
    data = json.load(f)

products = data.get('products', [])

# Исключаем Magput
magput_source_id = 'src_1763490659.837642'
own_products = [p for p in products if p.get('sourceId') != magput_source_id]

print(f"Всего продуктов (с Magput): {len(products)}")
print(f"Ваших ведомостей (без Magput): {len(own_products)}")
print()

# Группировка по названию тура
tours_by_name = defaultdict(list)
for p in own_products:
    name = p.get('name', 'Без названия')
    tours_by_name[name].append(p.get('id'))

print(f"Уникальных туров (по названию): {len(tours_by_name)}")
print()

# Статистика по количеству ведомостей на тур
tours_with_dates = {}
for name, product_ids in tours_by_name.items():
    count = len(product_ids)
    if count not in tours_with_dates:
        tours_with_dates[count] = 0
    tours_with_dates[count] += 1

print("Распределение туров по количеству ведомостей:")
for dates_count in sorted(tours_with_dates.keys()):
    tours_count = tours_with_dates[dates_count]
    print(f"  {dates_count} ведомость: {tours_count} туров")

# Топ-10 туров с наибольшим количеством ведомостей
top_tours = sorted(tours_by_name.items(), key=lambda x: len(x[1]), reverse=True)[:10]
print("\nТоп-10 туров с наибольшим количеством ведомостей:")
for name, product_ids in top_tours:
    print(f"  {name[:70]}: {len(product_ids)} ведомостей")
