#!/usr/bin/env python3
"""
Финальная версия - умное извлечение с анализом повторяющихся структур
Парсит JSX правильно, находит все дубликаты
"""

import re
import os
from pathlib import Path
from typing import List, Dict, Set, Tuple
from collections import defaultdict
import hashlib

SOURCE_FILE = "frontend/src/app/todos/page.tsx"
OUTPUT_DIR = "frontend/src/components/todos-final"

class JSXParser:
    """Парсер JSX блоков"""
    
    def __init__(self, content: str):
        self.content = content
        self.pos = 0
    
    def find_all_jsx_blocks(self) -> List[Dict]:
        """Найти все JSX блоки размером 10+ строк"""
        blocks = []
        
        # Найти все позиции открывающих тегов
        for match in re.finditer(r'<(\w+)[\s>]', self.content):
            tag_name = match.group(1)
            
            # Пропустить самозакрывающиеся теги и маленькие элементы
            if tag_name in ['br', 'hr', 'img', 'input']:
                continue
            
            start = match.start()
            
            # Попробовать извлечь полный блок
            block = self.extract_block_from_position(start)
            
            if block:
                lines_count = block.count('\n') + 1
                
                # Только блоки 10+ строк
                if lines_count >= 10:
                    blocks.append({
                        'content': block,
                        'start': start,
                        'end': start + len(block),
                        'lines': lines_count,
                        'tag': tag_name,
                        'signature': self.get_signature(block)
                    })
        
        return blocks
    
    def extract_block_from_position(self, start: int) -> str:
        """Извлечь сбалансированный JSX блок от позиции"""
        depth = 0
        in_string = False
        string_char = None
        i = start
        tag_stack = []
        
        # Определить первый тег
        tag_match = re.match(r'<(\w+)', self.content[start:])
        if not tag_match:
            return ""
        
        first_tag = tag_match.group(1)
        
        while i < len(self.content):
            # Обработка строк
            if self.content[i] in ('"', "'", '`') and (i == 0 or self.content[i-1] != '\\'):
                if not in_string:
                    in_string = True
                    string_char = self.content[i]
                elif self.content[i] == string_char:
                    in_string = False
            
            if not in_string:
                # Открывающий тег
                tag_match = re.match(r'<(\w+)', self.content[i:])
                if tag_match:
                    tag = tag_match.group(1)
                    # Проверить, не самозакрывающийся ли
                    if not re.match(r'<\w+[^>]*/>', self.content[i:i+100]):
                        tag_stack.append(tag)
                        depth += 1
                
                # Закрывающий тег
                close_match = re.match(r'</(\w+)>', self.content[i:])
                if close_match:
                    close_tag = close_match.group(1)
                    if tag_stack and tag_stack[-1] == close_tag:
                        tag_stack.pop()
                        depth -= 1
                        
                        # Если это закрывающий тег для первого тега - конец блока
                        if depth == 0 and close_tag == first_tag:
                            end = i + len(close_match.group(0))
                            return self.content[start:end]
            
            i += 1
        
        return ""
    
    def get_signature(self, block: str) -> str:
        """Получить структурную подпись блока (для поиска дубликатов)"""
        # Нормализация: убрать конкретные значения
        normalized = block
        
        # Заменить строки
        normalized = re.sub(r'["\']([^"\']{3,})["\']', '"STR"', normalized)
        
        # Заменить числа
        normalized = re.sub(r'\b\d+\b', '0', normalized)
        
        # Заменить переменные в фигурных скобках (но сохранить ключевые слова)
        def replace_var(match):
            var = match.group(1)
            if var in ['map', 'filter', 'find', 'onClick', 'onChange', 'className']:
                return match.group(0)
            return '{VAR}'
        
        normalized = re.sub(r'\{([a-z]\w*)\}', replace_var, normalized)
        
        # Убрать лишние пробелы
        normalized = re.sub(r'\s+', ' ', normalized)
        
        # Хэш
        return hashlib.md5(normalized.encode()).hexdigest()[:12]

class ComponentGenerator:
    """Генератор компонентов из дубликатов"""
    
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def group_duplicates(self, blocks: List[Dict]) -> Dict[str, List[Dict]]:
        """Группировать блоки по структурной подписи"""
        groups = defaultdict(list)
        
        for block in blocks:
            groups[block['signature']].append(block)
        
        # Только группы с повторениями (2+)
        duplicates = {sig: blks for sig, blks in groups.items() if len(blks) >= 2}
        
        return duplicates
    
    def infer_component_name(self, block: str) -> str:
        """Определить имя компонента по содержимому"""
        # Попробовать найти в комментариях
        comment_match = re.search(r'/\*\s*([А-Яа-яA-Za-z\s]+)\s*\*/', block[:200])
        if comment_match:
            name = comment_match.group(1).strip()
            return self.to_pascal_case(name)
        
        # По label или заголовку
        label_match = re.search(r'<label[^>]*>([А-Яа-яA-Za-z\s]+)</label>', block[:300])
        if label_match:
            return self.to_pascal_case(label_match.group(1).strip())
        
        # По className
        class_match = re.search(r'className="([^"]+)"', block[:200])
        if class_match:
            classes = class_match.group(1).split()
            for cls in classes:
                if not cls.startswith('w-') and not cls.startswith('p-') and not cls.startswith('m-'):
                    return self.to_pascal_case(cls.replace('-', ' '))
        
        # По контенту
        if 'button' in block.lower():
            return 'Button'
        elif 'input' in block.lower():
            return 'InputField'
        elif 'modal' in block.lower():
            return 'Modal'
        elif 'dropdown' in block.lower():
            return 'Dropdown'
        
        return 'Component'
    
    def to_pascal_case(self, text: str) -> str:
        """PascalCase"""
        words = re.split(r'[\s\-_]+', text)
        return ''.join(w.capitalize() for w in words if w and len(w) > 1)
    
    def extract_props(self, blocks: List[Dict]) -> List[Dict]:
        """Извлечь props из группы блоков"""
        props = []
        
        # Собрать все переменные из всех блоков
        all_vars = set()
        for block in blocks:
            # Переменные в {}
            vars_in_jsx = re.findall(r'\{(\w+)(?:\.\w+)*\}', block['content'])
            all_vars.update(vars_in_jsx)
            
            # onClick handlers
            handlers = re.findall(r'onClick=\{(?:\(\)?\s*=>)?\s*(\w+)', block['content'])
            all_vars.update(handlers)
        
        # Определить типы
        for var in sorted(all_vars):
            if var in ['map', 'filter', 'find', 'includes', 'length']:
                continue
            
            var_type = 'any'
            
            if var in ['todo', 'editingTodo']:
                var_type = 'Todo'
            elif var in ['list', 'todoList']:
                var_type = 'TodoList'
            elif var in ['lists', 'todoLists']:
                var_type = 'TodoList[]'
            elif var in ['person']:
                var_type = 'Person'
            elif var in ['people']:
                var_type = 'Person[]'
            elif var.startswith('show') or var.startswith('is') or var.endswith('Open'):
                var_type ='boolean'
            elif var.startswith('set') or var.startswith('handle') or var.startswith('on'):
                var_type = '() => void'
            elif var.endswith('Id'):
                var_type = 'string'
            elif var.endswith('Name'):
                var_type = 'string'
            
            props.append({'name': var, 'type': var_type})
        
        return props[:15]  # Максимум 15 props
    
    def extract_icons(self, content: str) -> Set[str]:
        """Извлечь used Lucide icons"""
        icons = set()
        
        all_icons = ['X', 'Check', 'ChevronDown', 'ChevronUp', 'ChevronLeft', 'ChevronRight',
                     'Plus', 'Minus', 'Edit', 'Trash', 'Trash2', 'User', 'Users', 'Calendar',
                     'Clock', 'Search', 'Filter', 'Settings', 'MoreHorizontal', 'MoreVertical',
                     'ArrowLeft', 'ArrowRight', 'Star', 'Heart', 'Bell', 'Info', 'AlertTriangle']
        
        for icon in all_icons:
            if f'<{icon}' in content or f'{{{icon}}}' in content:
                icons.add(icon)
        
        return icons
    
    def generate_component(self, blocks: List[Dict], index: int) -> Tuple[str, str]:
        """Сгенерировать файл компонента"""
        template_block = blocks[0]
        content = template_block['content']
        
        # Имя
        base_name = self.infer_component_name(content)
        component_name = f"{base_name}{index}" if index > 0 else base_name
        
        # Props
        props = self.extract_props(blocks)
        
        # Icons
        icons = self.extract_icons(content)
        
        # Генерация кода
        imports_code = ""
        if icons:
            imports_code += f"import {{ {', '.join(sorted(icons))} }} from 'lucide-react';\n"
        
        props_interface = ""
        props_destructure = ""
        
        if props:
            props_lines = [f"  {p['name']}: {p['type']};" for p in props]
            props_interface = f"interface {component_name}Props {{\n" + "\n".join(props_lines) + "\n}}\n\n"
            props_names = [p['name'] for p in props]
            props_destructure = f"{{{', '.join(props_names)}}}: {component_name}Props"
        
        code = f"""'use client';

import React, {{ memo }} from 'react';
{imports_code}
{props_interface}const {component_name} = memo(function {component_name}({props_destructure}) {{
  return (
{content}
  );
}});

export default {component_name};
"""
        
        return component_name, code
    
    def save_components(self, duplicates: Dict[str, List[Dict]]) -> List[Dict]:
        """Сохранить все компоненты"""
        saved = []
        
        # Сортировать по популярности
        sorted_groups = sorted(duplicates.items(), key=lambda x: len(x[1]), reverse=True)
        
        for idx, (sig, blocks) in enumerate(sorted_groups[:50]):  # Максимум 50
            try:
                # Пропустить слишком маленькие
                if blocks[0]['lines'] < 10:
                    continue
                
                name, code = self.generate_component(blocks, idx if idx >= 3 else 0)
                
                # Сохранить
                filename = f"{name}.tsx"
                filepath = self.output_dir / filename
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(code)
                
                saved.append({
                    'name': name,
                    'file': filename,
                    'occurrences': len(blocks),
                    'lines': blocks[0]['lines'],
                    'savings': (len(blocks) - 1) * blocks[0]['lines']
                })
                
                print(f"  ✅ {filename:40} ({len(blocks):2}x повторений, {blocks[0]['lines']:3} строк)")
                
            except Exception as e:
                print(f"  ⚠️  Ошибка: {e}")
        
        return saved
    
    def create_index(self, components: List[Dict]):
        """Создать index.ts"""
        exports = [f"export {{ default as {c['name']} }} from './{c['name']}';" for c in components]
        
        content = '\n'.join(exports) + '\n'
        
        with open(self.output_dir / 'index.ts', 'w') as f:
            f.write(content)
    
    def create_readme(self, components: List[Dict]):
        """Создать README"""
        total_savings = sum(c['savings'] for c in components)
        
        readme = f"""# 🎯 Автоматически извлеченные компоненты

## 📊 Статистика

- **Компонентов создано**: {len(components)}
- **Всего повторений**: {sum(c['occurrences'] for c in components)}
- **Строк кода сэкономлено**: **{total_savings:,}**

## 📋 Компоненты

| # | Компонент | Повторений | Строк | Экономия |
|---|-----------|-----------|-------|----------|
"""
        
        for i, comp in enumerate(sorted(components, key=lambda c: c['savings'], reverse=True), 1):
            readme += f"| {i} | `{comp['name']}` | {comp['occurrences']}x | {comp['lines']} | {comp['savings']} |\n"
        
        readme += f"""

## 🚀 Использование

```tsx
import {{ {components[0]['name']}, {components[1]['name']} }} from '@/components/todos-final';

// Заменить дублирующийся код на:
<{components[0]['name']} {{...props}} />
```

## ⚡ Улучшение

- **До**: {sum(c['occurrences'] * c['lines'] for c in components):,} строк дублирующегося кода  
- **После**: {len(components)} переиспользуемых компонентов  
- **Экономия**: {total_savings:,} строк ({(total_savings / sum(c['occurrences'] * c['lines'] for c in components) * 100):.1f}%)
"""
        
        with open(self.output_dir / 'README.md', 'w', encoding='utf-8') as f:
            f.write(readme)

def main():
    print("🚀 Финальное умное извлечение компонентов\n")
    
    # Загрузить файл
    with open(SOURCE_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"📄 Файл: {len(content)} символов, {content.count(chr(10))} строк\n")
    
    # Парсить JSX
    print("🔍 Парсинг JSX блоков...")
    parser = JSXParser(content)
    blocks = parser.find_all_jsx_blocks()
    print(f"📦 Найдено {len(blocks)} JSX блоков (10+ строк)\n")
    
    # Группировка дубликатов
    print("🔄 Поиск дубликатов...")
    generator = ComponentGenerator(OUTPUT_DIR)
    duplicates = generator.group_duplicates(blocks)
    print(f"✨ Найдено {len(duplicates)} групп дубликатов\n")
    
    if not duplicates:
        print("❌ Дубликатов не найдено")
        return
    
    # Сохранить
    print("💾 Генерация компонентов...\n")
    components = generator.save_components(duplicates)
    
    print(f"\n📁 Создание служебных файлов...")
    generator.create_index(components)
    generator.create_readme(components)
    
    print(f"\n✅ Готово!")
    print(f"   Создано: {len(components)} компонентов")
    print(f"   Сэкономлено: {sum(c['savings'] for c in components):,} строк")
    print(f"   Папка: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
