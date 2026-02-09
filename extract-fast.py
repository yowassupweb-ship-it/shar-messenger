#!/usr/bin/env python3
"""
Быстрое извлечение компонентов - простой и эффективный подход
Использует регулярки и простой подсчет скобок
"""

import re
from pathlib import Path
from collections import defaultdict

SOURCE = "frontend/src/app/todos/page.tsx"
OUTPUT = "frontend/src/components/todos-auto"

def extract_blocks_simple(content: str):
    """Быстрое извлечение блоков по паттернам"""
    blocks = []
    
    # Паттерн 1: Модальные окна {showXxxModal && (
    pattern1 = r'\{(show\w+(?:Modal|Panel))\s+&&\s+\(\s*<div[^>]*>(.+?)</div>\s*\)'
    for match in re.finditer(pattern1, content, re.DOTALL):
        name = match.group(1).replace('show', '').replace('Modal', '').replace('Panel', '')
        blocks.append({
            'name': f'{name}Modal',
            'content': match.group(0),
            'lines': match.group(0).count('\n'),
            'type': 'modal'
        })
    
    # Паттерн 2: .map() блоки
    pattern2 = r'(\w+)\.map\(\(?(\w+)\)?\s*=>\s*\(\s*<(\w+)[^>]*key=\{[^}]+\}(.+?)</\3>'
    for match in re.finditer(pattern2, content, re.DOTALL):
        collection = match.group(1)
        item = match.group(2)
        tag = match.group(3)
        
        if match.group(0).count('\n') > 8:  # Минимум 8 строк
            blocks.append({
                'name': f'{collection.capitalize()}Item',
                'content': match.group(0),
                'lines': match.group(0).count('\n'),
                'type': 'item',
                'collection': collection,
                'item_var': item
            })
    
    # Паттерн 3: Секции с комментариями
    pattern3 = r'/\*\s*([А-Яа-я\s]+)\s*\*/\s*\n\s*<div(.+?)(?=\n\s*(?:/\*|</div>\s*\n\s*</div>))'
    for match in re.finditer(pattern3, content, re.DOTALL):
        section_name = match.group(1).strip()
        
        if len(section_name) < 30 and match.group(0).count('\n') > 10:
            blocks.append({
                'name': ''.join(w.capitalize() for w in section_name.split()),
                'content': match.group(0),
                'lines': match.group(0).count('\n'),
                'type': 'section'
            })
    
    return blocks

def find_conditional_blocks(content: str):
    """Найти все условные блоки"""
    blocks = []
    
    # {isOpen && <div>...</div>}
    # Использовать простой подсчет вложенности
    pos = 0
    while pos < len(content):
        # Ищем начало условного блока
        match = re.search(r'\{(\w+)\s+&&\s+\(', content[pos:])
        if not match:
            break
        
        var_name = match.group(1)
        start = pos + match.start()
        block_start = pos + match.end()
        
        # Найти закрывающую скобку
        depth = 1
        i = block_start
        block_end = -1
        
        while i < len(content) and depth > 0:
            if content[i] == '(' and (i == 0 or content[i-1] != '\\'):
                depth += 1
            elif content[i] == ')' and (i == 0 or content[i-1] != '\\'):
                depth -= 1
                if depth == 0:
                    block_end = i + 1
                    break
            i += 1
        
        if block_end > 0:
            block_content = content[start:block_end]
            lines = block_content.count('\n')
            
            if lines > 15:  # Только большие блоки
                blocks.append({
                    'name': var_name.replace('show', '').replace('Modal', '').replace('Panel', '').replace('Open', ''),
                    'content': block_content,
                    'lines': lines,
                    'type': 'conditional',
                    'var': var_name
                })
        
        pos = block_end if block_end > 0 else (pos + match.end())
    
    return blocks

def generate_component(block: dict, idx: int) -> tuple:
    """Генерация кода компонента"""
    name = block['name']
    if not name or name == 'Component':
        name = f"Component{idx}"
    
    # Очистить имя
    name = re.sub(r'[^A-Za-z0-9]', '', name)
    if not name[0].isupper():
        name = name.capitalize()
    
    # Определить props
    props = []
    content = block['content']
    
    # Найти используемые переменные
    vars_used = set(re.findall(r'\{(\w+)(?:\.\w+)*\}', content))
    
    for var in sorted(vars_used):
        if var in ['map', 'filter', 'find', 'length']:
            continue
        
        if var in ['todo', 'editingTodo']:
            props.append(f"  {var}: Todo;")
        elif 'list' in var.lower():
            props.append(f"  {var}: TodoList[];")
        elif 'people' in var.lower() or 'person' in var.lower():
            props.append(f"  {var}: Person[];")
        elif var.startswith('show') or var.startswith('is'):
            props.append(f"  {var}: boolean;")
        elif var.startswith('set') or var.startswith('on') or var.startswith('handle'):
            props.append(f"  {var}: () => void;")
    
    # Найти иконки Lucide
    icons = set()
    all_icons = ['X', 'Check', 'ChevronDown', 'Plus', 'Edit', 'Trash', 'User', 'Calendar', 'Clock']
    for icon in all_icons:
        if f'<{icon}' in content or f'{{{icon}}}' in content:
            icons.add(icon)
    
    # Генерация кода
    imports = ""
    if icons:
        imports = f"import {{ {', '.join(sorted(icons))} }} from 'lucide-react';\n"
    
    props_interface = ""
    props_destructure = ""
    
    if props:
        props_interface = f"interface {name}Props {{\n" + "\n".join(props) + "\n}}\n\n"
        prop_names = [p.split(':')[0].strip() for p in props]
        props_destructure = f"{{{', '.join(prop_names)}}}: {name}Props"
    
    code = f"""'use client';

import React, {{ memo }} from 'react';
{imports}
{props_interface}const {name} = memo(function {name}({props_destructure}) {{
  return (
{content}
  );
}});

export default {name};
"""
    
    return name, code

def main():
    print("⚡ Быстрое извлечение компонентов\n")
    
    # Загрузить файл
    with open(SOURCE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines_total = content.count('\n')
    print(f"📄 Файл: {len(content):,} символов, {lines_total} строк\n")
    
    # Найти блоки разными методами
    print("🔍 Поиск блоков...")
    
    blocks = []
    
    # Метод 1: Простые паттерны
    simple_blocks = extract_blocks_simple(content)
    blocks.extend(simple_blocks)
    print(f"  ✓ Простые паттерны: {len(simple_blocks)} блоков")
    
    # Метод 2: Условные блоки
    conditional_blocks = find_conditional_blocks(content)
    blocks.extend(conditional_blocks)
    print(f"  ✓ Условные блоки: {len(conditional_blocks)} блоков")
    
    print(f"\n📦 Всего найдено: {len(blocks)} блоков\n")
    
    # Группировка по размеру
    by_size = defaultdict(list)
    for block in blocks:
        by_size[block['lines'] // 10 * 10].append(block)
    
    # Показать распределение
    print("📊 Распределение по размеру:")
    for size in sorted(by_size.keys(), reverse=True):
        print(f"  {size}-{size+10} строк: {len(by_size[size])} блоков")
    
    # Сохранить компоненты
    output_dir = Path(OUTPUT)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"\n💾 Сохранение компонентов...\n")
    
    saved = []
    for idx, block in enumerate(sorted(blocks, key=lambda b: b['lines'], reverse=True)):
        if block['lines'] < 15:  # Пропустить маленькие
            continue
        
        try:
            name, code = generate_component(block, idx)
            
            # Сохранить
            filename = f"{name}.tsx"
            filepath = output_dir / filename
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(code)
            
            saved.append({
                'name': name,
                'file': filename,
                'lines': block['lines'],
                'type': block['type']
            })
            
            print(f"  ✅ {filename:40} ({block['lines']:3} строк, {block['type']})")
            
            if len(saved) >= 25:  # Максимум 25 компонентов
                break
                
        except Exception as e:
            print(f"  ⚠️  Ошибка {block.get('name', '?')}: {e}")
    
    # Создать index.ts
    if saved:
        with open(output_dir / 'index.ts', 'w') as f:
            for comp in saved:
                f.write(f"export {{ default as {comp['name']} }} from './{comp['name']}';\n")
        
        print(f"\n📄 Создан index.ts")
    
    # Статистика
    total_lines = sum(c['lines'] for c in saved)
    
    print(f"\n✅ Готово!")
    print(f"   Компонентов: {len(saved)}")
    print(f"   Всего строк: {total_lines}")
    print(f"   Папка: {OUTPUT}")

if __name__ == "__main__":
    main()
