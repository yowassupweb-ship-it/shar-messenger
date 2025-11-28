import json

with open('backend/database.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Создаем шаблон Яндекс.Директ точно как вы показали
yandex_template = {
    "id": "yandex_direct_yml",
    "name": "Яндекс.Директ",
    "type": "feed",
    "description": "Готовый YML шаблон для Яндекс.Директ с обязательными полями",
    "content": {
        "template": """<?xml version="1.0" encoding="UTF-8"?>
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
</yml_catalog>"""
    },
    "createdAt": "2025-11-18T19:10:00.000000"
}

# Добавляем/обновляем шаблон
if 'templates' not in data:
    data['templates'] = []

# Удаляем старый если есть
data['templates'] = [t for t in data['templates'] if t.get('id') != 'yandex_direct_yml']
data['templates'].append(yandex_template)

# Применяем к фиду "Новый год [ТО]"
feeds = data.get('feeds', [])
feed = next((f for f in feeds if 'Новый год' in f['name'] and 'ТО' in f['name']), None)

if feed:
    if 'settings' not in feed:
        feed['settings'] = {}
    feed['settings']['feedTemplateId'] = 'yandex_direct_yml'
    print(f"✓ Шаблон применен к фиду '{feed['name']}'")
else:
    print("⚠ Фид не найден")

# Сохраняем
with open('backend/database.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"✓ Шаблон '{yandex_template['name']}' создан (ID: {yandex_template['id']})")
print(f"  Всего шаблонов: {len(data['templates'])}")
