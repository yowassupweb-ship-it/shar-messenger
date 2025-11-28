import json

with open('database.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

feeds = data.get('feeds', [])
print(f"Total feeds: {len(feeds)}")

# Ищем фид "Все туры - ТО [ВК]"
target_feed = None
for f in feeds:
    name = f.get('name', '')
    if 'vse-tury' in name.lower() or 'ТО' in name or 'ВК' in name:
        print(f"\n=== Feed: {name} ===")
        print(f"ID: {f.get('id')}")
        print(f"sourceId: {f.get('sourceId')}")
        print(f"sourceIds: {f.get('sourceIds', [])}")
        if 'vse-tury' in name.lower():
            target_feed = f

# Проверяем источники данных
if target_feed:
    source_ids = target_feed.get('sourceIds', [])
    print(f"\n=== Checking sources for '{target_feed['name']}' ===")
    print(f"Source IDs: {source_ids}")
    
    data_sources = data.get('dataSources', [])
    for src_id in source_ids:
        source = next((s for s in data_sources if s.get('id') == src_id), None)
        if source:
            print(f"\n  Source ID: {src_id}")
            print(f"  Name: {source.get('name')}")
            print(f"  Items: {source.get('itemsCount', 0)}")
        else:
            print(f"\n  Source ID: {src_id} NOT FOUND!")
    
    # Проверяем продукты
    products = data.get('products', [])
    print(f"\n=== Total products in DB: {len(products)} ===")
    
    for src_id in source_ids:
        source_products = [p for p in products if p.get('sourceId') == src_id]
        print(f"Products with sourceId={src_id}: {len(source_products)}")
