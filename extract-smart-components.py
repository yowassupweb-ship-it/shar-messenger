#!/usr/bin/env python3
"""
Продвинутое извлечение компонентов с определением дублирующихся паттернов
Анализирует AST-подобную структуру JSX и находит похожие блоки
"""

import re
import os
import hashlib
from pathlib import Path
from typing import List, Dict, Tuple, Set
from collections import defaultdict, Counter

SOURCE_FILE = "frontend/src/app/todos/page.tsx"
OUTPUT_DIR = "frontend/src/components/todos-extracted"

class AdvancedComponentExtractor:
    def __init__(self, source_path: str, output_dir: str):
        self.source_path = source_path
        self.output_dir = output_dir
        self.content = ""
        self.lines = []
        
    def load_file(self):
        """Загрузить файл"""
        with open(self.source_path, 'r', encoding='utf-8') as f:
            self.content = f.read()
            self.lines = self.content.splitlines()
        print(f"📄 Загружено {len(self.lines)} строк")
    
    def find_jsx_blocks(self) -> List[Dict]:
        """Найти все JSX блоки в файле"""
        blocks = []
        i = 0
        
        while i < len(self.lines):
            line = self.lines[i]
            
            # Найти начало JSX блока
            if '<div' in line or '<button' in line or '<input' in line or '<form' in line:
                # Определить уровень вложенности
                indent = len(line) - len(line.lstrip())
                
                # Собрать весь блок с этим уровнем вложенности
                block_lines = [line]
                j = i + 1
                
                while j < len(self.lines):
                    next_line = self.lines[j]
                    next_indent = len(next_line) - len(next_line.lstrip())
                    
                    # Если строка менее вложена - конец блока
                    if next_line.strip() and next_indent <= indent:
                        # Проверить, закрывающий ли это тег
                        if '</div>' in next_line or '</button>' in next_line:
                            block_lines.append(next_line)
                            j += 1
                        break
                    
                    block_lines.append(next_line)
                    j += 1
                
                block_content = '\n'.join(block_lines)
                
                # Только значимые блоки (>5 строк)
                if len(block_lines) > 5:
                    blocks.append({
                        'content': block_content,
                        'start_line': i,
                        'end_line': j,
                        'lines_count': len(block_lines),
                        'indent': indent,
                        'hash': self.get_structure_hash(block_content)
                    })
                
                i = j
            else:
                i += 1
        
        print(f"📦 Найдено {len(blocks)} JSX блоков")
        return blocks
    
    def get_structure_hash(self, content: str) -> str:
        """Получить структурный хэш блока (игнорируя конкретные значения)"""
        # Заменить все строки на placeholder
        normalized = re.sub(r'["\']([^"\']+)["\']', '"TEXT"', content)
        # Заменить числа
        normalized = re.sub(r'\d+', '0', normalized)
        # Заменить переменные на placeholder
        normalized = re.sub(r'\b[a-z]\w*\b', 'var', normalized)
        # Убрать пробелы
        normalized = re.sub(r'\s+', '', normalized)
        
        return hashlib.md5(normalized.encode()).hexdigest()[:8]
    
    def find_similar_blocks(self, blocks: List[Dict]) -> Dict[str, List[Dict]]:
        """Группировать похожие блоки по структуре"""
        groups = defaultdict(list)
        
        for block in blocks:
            groups[block['hash']].append(block)
        
        # Только группы с повтореениями
        duplicates = {k: v for k, v in groups.items() if len(v) > 1}
        
        print(f"🔄 Найдено {len(duplicates)} групп дублирующихся блоков")
        for hash_val, group in sorted(duplicates.items(), key=lambda x: len(x[1]), reverse=True)[:10]:
            print(f"  • {len(group)} повторений, ~{group[0]['lines_count']} строк")
        
        return duplicates
    
    def extract_component_from_pattern(self, blocks: List[Dict], index: int) -> Dict:
        """Извлечь компонент из группы похожих блоков"""
        # Взять первый блок как шаблон
        template = blocks[0]
        content = template['content']
        
        # Определить название компонента
        component_name = self.infer_component_name(content)
        
        # Определить props
        props = self.extract_props(blocks)
        
        # Определить imports
        imports = self.extract_imports(content)
        
        return {
            'name': component_name,
            'content': content,
            'props': props,
            'imports': imports,
            'occurrences': len(blocks),
            'template': template
        }
    
    def infer_component_name(self, content: str) -> str:
        """Определить название компонента по содержимому"""
        # По className
        class_match = re.search(r'className="([^"]+)"', content)
        if class_match:
            classes = class_match.group(1).split()
            if classes:
                return self.to_pascal_case(classes[0].replace('-', ' '))
        
        # По тексту внутри
        text_match = re.search(r'>\s*([А-Яа-яA-Za-z\s]+)\s*<', content)
        if text_match:
            return self.to_pascal_case(text_match.group(1).strip())
        
        # По типу элемента
        tag_match = re.search(r'<(\w+)', content)
        if tag_match:
            tag = tag_match.group(1)
            if 'button' in content.lower():
                return 'Button'
            elif 'input' in content.lower():
                return 'Input'
            elif 'modal' in content.lower():
                return 'Modal'
        
        return 'Component'
    
    def to_pascal_case(self, text: str) -> str:
        """Преобразовать в PascalCase"""
        words = re.split(r'[\s\-_]+', text)
        return ''.join(w.capitalize() for w in words if w)
    
    def extract_props(self, blocks: List[Dict]) -> List[Tuple[str, str]]:
        """Извлечь props из группы блоков"""
        props = []
        
        # Найти все переменные, которые различаются между блоками
        all_vars = set()
        for block in blocks:
            # Найти все переменные в фигурных скобках
            vars_in_block = re.findall(r'\{(\w+)(?:\.\w+)*\}', block['content'])
            all_vars.update(vars_in_block)
        
        # Определить типы props
        for var in sorted(all_vars):
            if var in ['todo', 'editingTodo']:
                props.append((var, 'Todo'))
            elif var in ['list', 'lists']:
                props.append((var, 'TodoList[]'))
            elif var in ['person', 'people']:
                props.append((var, 'Person[]'))
            elif var.startswith('show') or var.startswith('is'):
                props.append((var, 'boolean'))
            elif var.startswith('set') or var.startswith('on'):
                props.append((var, '() => void'))
            else:
                props.append((var, 'any'))
        
        return props[:10]  # Максимум 10 props
    
    def extract_imports(self, content: str) -> Set[str]:
        """Извлечь необходимые импорты"""
        imports = set()
        
        # Lucide icons
        lucide_icons = ['X', 'Check', 'ChevronDown', 'ChevronUp', 'Plus', 'Edit', 'Trash', 
                        'User', 'Calendar', 'Clock', 'Search', 'Filter', 'Settings']
        for icon in lucide_icons:
            if f'<{icon}' in content or f'{{{icon}}}' in content:
                imports.add(icon)
        
        return imports
    
    def generate_component_file(self, component: Dict) -> str:
        """Сгенерировать код файла компонента"""
        name = component['name']
        props = component['props']
        imports = component['imports']
        content = component['content']
        
        # Imports
        imports_code = ""
        if imports:
            lucide_imports = sorted(list(imports))
            imports_code = f"import {{ {', '.join(lucide_imports)} }} from 'lucide-react';\n"
        
        # Props interface
        props_code = ""
        if props:
            props_lines = [f"  {name}: {type};" for name, type in props]
            props_code = f"interface {name}Props {{\n" + "\n".join(props_lines) + "\n}}\n\n"
        
        # Props destructuring
        props_names = [p[0] for p in props]
        props_destructure = f"{{{', '.join(props_names)}}}: {name}Props" if props else ""
        
        # Component
        component_code = f"""'use client';

import React, {{ memo }} from 'react';
{imports_code}
{props_code}const {name} = memo(function {name}({props_destructure}) {{
  return (
{content}
  );
}});

export default {name};
"""
        
        return component_code
    
    def save_all_components(self, duplicates: Dict[str, List[Dict]]):
        """Сохранить все извлеченные компоненты"""
        output_path = Path(self.output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        saved_count = 0
        components_info = []
        
        for i, (hash_val, blocks) in enumerate(sorted(duplicates.items(), 
                                                       key=lambda x: len(x[1]), 
                                                       reverse=True)):
            try:
                component = self.extract_component_from_pattern(blocks, i)
                
                # Пропустить слишком маленькие компоненты
                if blocks[0]['lines_count'] < 10:
                    continue
                
                code = self.generate_component_file(component)
                
                # Сохранить файл
                filename = f"{component['name']}{i+1}.tsx"
                if saved_count < 3:  # Первые 3 без номера
                    filename = f"{component['name']}.tsx"
                
                file_path = output_path / filename
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(code)
                
                print(f"  ✅ {filename} ({component['occurrences']} повторений)")
                
                components_info.append({
                    'name': component['name'],
                    'file': filename,
                    'occurrences': component['occurrences'],
                    'lines': blocks[0]['lines_count']
                })
                
                saved_count += 1
                
                if saved_count >= 30:  # Максимум 30 компонентов
                    break
                    
            except Exception as e:
                print(f"  ⚠️  Ошибка: {e}")
        
        print(f"\n✨ Сохранено {saved_count} компонентов")
        return components_info
    
    def generate_index_file(self, components_info: List[Dict]):
        """Создать index.ts для экспорта всех компонентов"""
        output_path = Path(self.output_dir)
        
        exports = []
        for comp in components_info:
            name = comp['name']
            file = comp['file'].replace('.tsx', '')
            exports.append(f"export {{ default as {name} }} from './{file}';")
        
        index_content = '\n'.join(exports) + '\n'
        
        with open(output_path / 'index.ts', 'w', encoding='utf-8') as f:
            f.write(index_content)
        
        print(f"📄 Создан index.ts")
    
    def generate_usage_guide(self, components_info: List[Dict]):
        """Создать руководство по использованию"""
        output_path = Path(self.output_dir)
        
        guide = f"""# 🎯 Извлеченные компоненты

Автоматически извлечено **{len(components_info)}** переиспользуемых компонентов.

## 📋 Список компонентов

| Компонент | Повторений | Строк | Использование |
|-----------|-----------|-------|---------------|
"""
        
        for comp in sorted(components_info, key=lambda c: c['occurrences'], reverse=True):
            guide += f"| {comp['name']} | {comp['occurrences']}x | {comp['lines']} | `import {comp['name']} from '@/components/todos-extracted'` |\n"
        
        guide += f"""

## 🚀 Интеграция

### 1. Импортировать компоненты
```tsx
import {{ Button, Modal, Dropdown }} from '@/components/todos-extracted';
```

### 2. Заменить дублирующийся код
```tsx
// Было (повторялось {components_info[0]['occurrences']} раз):
{components_info[0]['lines']} строк JSX

// Стало:
<{components_info[0]['name']} {{...props}} />
```

## ⚡ Улучшение производительности

- **До**: {sum(c['occurrences'] * c['lines'] for c in components_info)} строк дублирующегося кода
- **После**: {len(components_info)} изолированных компонентов
- **Экономия**: {sum((c['occurrences'] - 1) * c['lines'] for c in components_info)} строк

## 📈 Статистика

- Самый популярный: **{components_info[0]['name']}** ({components_info[0]['occurrences']} повторений)
- Самый большой: **{max(components_info, key=lambda c: c['lines'])['name']}** ({max(components_info, key=lambda c: c['lines'])['lines']} строк)
- Всего сэкономлено: **{sum((c['occurrences'] - 1) * c['lines'] for c in components_info)}** строк кода
"""
        
        with open(output_path / 'README.md', 'w', encoding='utf-8') as f:
            f.write(guide)
        
        print(f"📄 Создан README.md")
    
    def run(self):
        """Запустить извлечение"""
        print("🚀 Продвинутое извлечение компонентов\n")
        
        self.load_file()
        
        # Найти все JSX блоки
        blocks = self.find_jsx_blocks()
        
        # Найти похожие блоки
        duplicates = self.find_similar_blocks(blocks)
        
        if not duplicates:
            print("❌ Не найдено дублирующихся блоков")
            return
        
        # Сохранить компоненты
        print(f"\n💾 Сохранение компонентов...\n")
        components_info = self.save_all_components(duplicates)
        
        # Создать служебные файлы
        self.generate_index_file(components_info)
        self.generate_usage_guide(components_info)
        
        print(f"\n✅ Готово! Извлечено {len(components_info)} компонентов")
        print(f"📁 Папка: {self.output_dir}")

def main():
    extractor = AdvancedComponentExtractor(SOURCE_FILE, OUTPUT_DIR)
    extractor.run()

if __name__ == "__main__":
    main()
