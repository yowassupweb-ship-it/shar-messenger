"""Скрипт для исправления VK шаблона в базе данных"""
import json
import os

DB_PATH = "database.json"

# Правильный шаблон VK с циклом по товарам
VK_TEMPLATE = '''<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:g="http://base.google.com/ns/1.0">
{{#offers}}
  <entry>
    <g:id>{{id}}</g:id>
    <g:title>{{title}}</g:title>
    <g:description>{{description}}</g:description>
    <g:link>{{link}}</g:link>
    <g:image_link>{{image_link}}</g:image_link>
    <g:condition>{{condition}}</g:condition>
    <g:availability>{{availability}}</g:availability>
    <g:price>{{price}} {{currency}}</g:price>
    {{#oldPrice}}<g:sale_price>{{price}} {{currency}}</g:sale_price>{{/oldPrice}}
    <g:brand>{{brand}}</g:brand>
    <g:product_type>{{product_type}}</g:product_type>
  </entry>
{{/offers}}
</feed>'''

def fix_vk_template():
    if not os.path.exists(DB_PATH):
        print(f"Database not found: {DB_PATH}")
        return
    
    with open(DB_PATH, 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    templates = db.get('templates', [])
    updated = False
    
    for template in templates:
        # Ищем VK шаблон по разным признакам
        name = template.get('name', '').lower()
        content = template.get('content', '')
        
        if isinstance(content, str) and 'g:id' in content and 'xmlns:g="http://base.google.com' in content:
            print(f"Found VK/Google template: {template.get('name')} (ID: {template.get('id')})")
            
            # Проверяем, есть ли уже цикл
            if '{{#offers}}' not in content and '{{#entries}}' not in content:
                print(f"  -> Template missing loop, fixing...")
                template['content'] = VK_TEMPLATE
                updated = True
                print(f"  -> Fixed!")
            else:
                print(f"  -> Template already has loop, skipping")
    
    if updated:
        with open(DB_PATH, 'w', encoding='utf-8') as f:
            json.dump(db, f, ensure_ascii=False, indent=2)
        print("\nDatabase updated successfully!")
    else:
        print("\nNo templates needed fixing")

if __name__ == "__main__":
    fix_vk_template()
