import json

# Загрузка базы данных
with open('database.json', encoding='utf-8') as f:
    data = json.load(f)

products = data.get('products', [])

# Подсчёт уникальных туров
unique_tours = {}
products_without_tourid = 0

for p in products:
    tour_id = p.get('tourId')
    if tour_id:
        if tour_id not in unique_tours:
            unique_tours[tour_id] = []
        unique_tours[tour_id].append(p.get('id'))
    else:
        products_without_tourid += 1

print(f"Всего продуктов в базе: {len(products)}")
print(f"Уникальных tourId: {len(unique_tours)}")
print(f"Продуктов без tourId: {products_without_tourid}")
print()

# Топ-5 туров с наибольшим количеством дат
top_tours = sorted(unique_tours.items(), key=lambda x: len(x[1]), reverse=True)[:5]
print("Топ-5 туров с наибольшим количеством дат:")
for tour_id, product_ids in top_tours:
    tour = next((p for p in products if p.get('tourId') == tour_id), None)
    if tour:
        print(f"  {tour.get('name', 'Без названия')[:60]}: {len(product_ids)} дат")
