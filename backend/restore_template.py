import json
from pathlib import Path

# Загружаем database.json
db_path = Path(__file__).parent / 'database.json'
with open(db_path, 'r', encoding='utf-8') as f:
    db = json.load(f)

# Удаляем старый шаблон с автогенерированным ID
db['templates'] = [t for t in db['templates'] if t['id'] != 'tpl_1763482520.271434']

# Создаем новый шаблон с правильным ID
new_template = {
    'id': 'yandex_direct_yml',
    'name': 'Яндекс.Директ',
    'type': 'feed',
    'description': 'Готовый YML шаблон для Яндекс.Директ с обязательными полями',
    'content': '''<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="{{date}}">
  <shop>
    <name>{{shop_name}}</name>
    <company>{{company}}</company>
    <url>{{url}}</url>
    <currencies>
      <currency id="RUB" rate="1"/>
    </currencies>
    <categories>
{{#categories}}      <category id="{{id}}">{{name}}</category>
{{/categories}}    </categories>
    <offers>
{{#offers}}      <offer id="{{id}}" available="true">
        <url>{{url}}</url>
        <price>{{price}}</price>
        <currencyId>RUB</currencyId>
        <categoryId>{{categoryId}}</categoryId>
        <picture>{{picture}}</picture>
        <name>{{name}}</name>
        <description>{{description}}</description>
      </offer>
{{/offers}}    </offers>
  </shop>
</yml_catalog>''',
    'createdAt': '2025-11-18T19:10:00.000000',
    'updatedAt': '2025-11-18T19:10:00.000000'
}

db['templates'].append(new_template)

# Обновляем feedTemplateId в feed_004
for feed in db.get('feeds', []):
    if feed.get('id') == 'feed_004':
        feed['settings']['feedTemplateId'] = 'yandex_direct_yml'
        print(f"✓ Feed {feed['name']} обновлен: feedTemplateId = yandex_direct_yml")
        break

# Сохраняем
with open(db_path, 'w', encoding='utf-8') as f:
    json.dump(db, f, ensure_ascii=False, indent=2)

print('✓ Шаблон yandex_direct_yml восстановлен')
print('✓ Database обновлена')
