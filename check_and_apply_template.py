import json

with open('backend/database.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=== YML Шаблоны в базе данных ===\n")
templates = data.get('templates', [])
yml_templates = [t for t in templates if t.get('type') == 'feed']

for t in yml_templates:
    print(f"ID: {t['id']}")
    print(f"Название: {t['name']}")
    print(f"Описание: {t.get('description', 'нет')}")
    print()

print(f"\n=== Фид 'Новый год [ТО]' ===\n")
feeds = data.get('feeds', [])
feed = next((f for f in feeds if 'Новый год' in f['name'] and 'ТО' in f['name']), None)

if feed:
    print(f"ID фида: {feed['id']}")
    print(f"Название: {feed['name']}")
    print(f"Текущий шаблон: {feed.get('settings', {}).get('feedTemplateId', 'не установлен')}")
    
    # Находим шаблон "Яндекс.Директ"
    yandex_template = next((t for t in yml_templates if 'Яндекс' in t['name'] or 'Директ' in t['name']), None)
    
    if yandex_template:
        print(f"\n✓ Найден шаблон '{yandex_template['name']}' (ID: {yandex_template['id']})")
        
        # Применяем шаблон
        if 'settings' not in feed:
            feed['settings'] = {}
        feed['settings']['feedTemplateId'] = yandex_template['id']
        
        # Сохраняем
        with open('backend/database.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"✓ Шаблон '{yandex_template['name']}' применен к фиду '{feed['name']}'")
    else:
        print("\n⚠ Шаблон Яндекс.Директ не найден")
        print("Доступные шаблоны:", [t['name'] for t in yml_templates])
else:
    print("⚠ Фид 'Новый год [ТО]' не найден")
