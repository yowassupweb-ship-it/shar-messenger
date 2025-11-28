import json

# Читаем базу данных
with open('backend/database.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Создаем минималистичный шаблон YML
minimal_template = {
    "id": "minimal_yml",
    "name": "Минималистичный YML",
    "type": "feed",
    "description": "Упрощенный YML шаблон с базовыми полями",
    "content": {
        "template": """<?xml version="1.0" encoding="utf-8"?>
<yml_catalog date="{{date}}">
  <shop>
    <name>{{shop_name}}</name>
    <company>{{company}}</company>
    <url>{{url}}</url>
    <currencies>
      <currency id="{{currency}}" rate="1"/>
    </currencies>
    <categories>
{{#categories}}      <category id="{{id}}">{{name}}</category>
{{/categories}}    </categories>
    <offers>
{{#offers}}      <offer id="{{id}}" available="{{available}}">
        <url>{{url}}</url>
        <price>{{price}}</price>
        <currencyId>{{currency}}</currencyId>
        <categoryId>{{categoryId}}</categoryId>
        <picture>{{picture}}</picture>
        <name>{{name}}</name>
        <description>{{description}}</description>
      </offer>
{{/offers}}    </offers>
  </shop>
</yml_catalog>"""
    },
    "createdAt": "2025-11-18T19:00:00.000000"
}

# Добавляем шаблон
if 'templates' not in data:
    data['templates'] = []

# Удаляем старый шаблон с таким же ID если есть
data['templates'] = [t for t in data['templates'] if t.get('id') != 'minimal_yml']

# Добавляем новый
data['templates'].append(minimal_template)

# Сохраняем
with open('backend/database.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"✓ Шаблон '{minimal_template['name']}' создан (ID: {minimal_template['id']})")
print(f"  Всего шаблонов в базе: {len(data['templates'])}")
