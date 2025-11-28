import json

with open('backend/database.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

feeds = data.get('feeds', [])
feed = next((f for f in feeds if 'Новый год' in f['name'] and 'ТО' in f['name']), None)

if feed:
    print(f'Found feed: {feed["id"]} - {feed["name"]}')
    if 'settings' not in feed:
        feed['settings'] = {}
    feed['settings']['feedTemplateId'] = 'minimal_yml'
    
    with open('backend/database.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f'✓ Шаблон "minimal_yml" применен к фиду')
else:
    print('x Фид не найден')
