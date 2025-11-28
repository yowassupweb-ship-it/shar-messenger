import requests

# Тестируем API объединения товаров
print("=== Тест объединения товаров ===\n")

# Запрос без объединения
print("1. Запрос БЕЗ объединения (merged=false):")
response = requests.get("http://localhost:8000/api/products?merged=false")
products_raw = response.json()
print(f"   Всего товаров: {len(products_raw)}")

# Подсчитываем дубли
from collections import Counter
ids = [p['id'] for p in products_raw]
duplicates = {k: v for k, v in Counter(ids).items() if v > 1}
print(f"   Дубликатов по ID: {len(duplicates)}")
if duplicates:
    print(f"   Примеры дублей: {list(duplicates.items())[:3]}")

# Запрос с объединением
print("\n2. Запрос С объединением (merged=true, по умолчанию):")
response = requests.get("http://localhost:8000/api/products")
products_merged = response.json()
print(f"   Всего товаров: {len(products_merged)}")

# Проверяем объединенные товары
merged_items = [p for p in products_merged if len(p.get('sourceIds', [])) > 1]
print(f"   Товаров из нескольких источников: {len(merged_items)}")

if merged_items:
    print("\n3. Примеры объединенных товаров:")
    for item in merged_items[:3]:
        print(f"\n   ID: {item['id']}")
        print(f"   Название: {item['name'][:50]}")
        print(f"   Источников: {len(item['sourceIds'])}")
        print(f"   SourceIds: {item['sourceIds']}")

print("\n✓ Тест завершен")
