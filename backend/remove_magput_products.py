"""
Удаление товаров Magput из database.json
"""
import json
from datetime import datetime

# ID источника Magput
MAGPUT_SOURCE_ID = "src_1763490659.837642"

# Загружаем database.json
with open('database.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Подсчитываем товары
total_before = len(data['products'])
magput_products = [p for p in data['products'] if p.get('sourceId') == MAGPUT_SOURCE_ID]
magput_count = len(magput_products)

print(f"Всего товаров: {total_before}")
print(f"Товаров Magput: {magput_count}")

# Удаляем товары Magput
data['products'] = [p for p in data['products'] if p.get('sourceId') != MAGPUT_SOURCE_ID]

total_after = len(data['products'])
print(f"Осталось товаров: {total_after}")
print(f"Удалено: {total_before - total_after}")

# Также удаляем источник Magput из dataSources
data['dataSources'] = [s for s in data.get('dataSources', []) if s.get('type') != 'magput']

# Сохраняем
with open('database.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("\n✅ Товары Magput удалены из database.json")
print(f"Ожидаемое количество товаров: {total_after}")
