#!/usr/bin/env python3
"""
Автоматическое извлечение компонентов из монолитного React файла
Находит паттерны: модалки, dropdown-ы, карточки, формы, панели
"""

import re
import os
from pathlib import Path
from typing import List, Dict, Tuple, Set

# Путь к файлу
SOURCE_FILE = "frontend/src/app/todos/page.tsx"
OUTPUT_DIR = "frontend/src/components/todos"

# Паттерны для поиска компонентов
PATTERNS = {
    'modals': [
        # {showModal && <div>...</div>}
        r'\{(show\w+Modal)\s+&&\s+\(',
        r'\{(show\w+)\s+&&\s+\(',
    ],
    'dropdowns': [
        # {openDropdown === 'name' && <div>...</div>}
        r'\{openDropdown\s*===\s*[\'"](\w+)[\'"]\s*&&\s+\(',
        r'\{(\w+DropdownOpen)\s*&&\s*\(',
    ],
    'cards': [
        # {items.map(item => <div key={item.id}>...</div>)}
        r'(\w+)\.map\(\(?(\w+)\)?\s*=>\s*\(',
    ],
    'forms': [
        # <input> с onChange, <textarea>, <select>
        r'<(input|textarea|select)[^>]*onChange=\{[^}]+\}[^>]*>',
    ],
    'sections': [
        # Комментарии секций
        r'\/\*\s*(.+?)\s*\*\/',
    ]
}

class ComponentExtractor:
    def __init__(self, source_path: str, output_dir: str):
        self.source_path = source_path
        self.output_dir = output_dir
        self.content = ""
        self.components = []
        self.imports = set()
        
    def load_file(self):
        """Загрузить исходный файл"""
        with open(self.source_path, 'r', encoding='utf-8') as f:
            self.content = f.read()
        print(f"📄 Загружено {len(self.content)} символов, {len(self.content.splitlines())} строк")
    
    def extract_imports(self):
        """Извлечь все импорты из файла"""
        import_pattern = r"import\s+(?:{[^}]+}|\w+)\s+from\s+['\"][^'\"]+['\"]"
        imports = re.findall(import_pattern, self.content, re.MULTILINE)
        self.imports = set(imports)
        print(f"📦 Найдено {len(self.imports)} импортов")
    
    def find_modals(self) -> List[Dict]:
        """Найти все модальные окна"""
        modals = []
        
        # Паттерн: {showXxxModal && (
        pattern = r'\{(show\w+(?:Modal|Panel))\s+&&\s+\('
        matches = re.finditer(pattern, self.content)
        
        for match in matches:
            var_name = match.group(1)
            start_pos = match.start()
            
            # Найти закрывающий блок
            jsx_block = self.extract_balanced_jsx(start_pos, '{', '}')
            if jsx_block:
                modals.append({
                    'type': 'modal',
                    'name': var_name,
                    'content': jsx_block,
                    'start': start_pos,
                    'end': start_pos + len(jsx_block)
                })
        
        print(f"🪟 Найдено {len(modals)} модальных окон")
        return modals
    
    def find_dropdowns(self) -> List[Dict]:
        """Найти все dropdown меню"""
        dropdowns = []
        
        # Паттерн 1: {openDropdown === 'name' && (
        pattern1 = r'\{openDropdown\s*===\s*[\'"](\w+)[\'"]\s*&&\s+\('
        matches1 = re.finditer(pattern1, self.content)
        
        for match in matches1:
            dropdown_name = match.group(1)
            start_pos = match.start()
            jsx_block = self.extract_balanced_jsx(start_pos, '{', '}')
            
            if jsx_block:
                dropdowns.append({
                    'type': 'dropdown',
                    'name': f'{dropdown_name}Dropdown',
                    'content': jsx_block,
                    'start': start_pos,
                    'end': start_pos + len(jsx_block)
                })
        
        # Паттерн 2: {statusDropdownOpen && (
        pattern2 = r'\{(\w+DropdownOpen)\s*&&\s+\('
        matches2 = re.finditer(pattern2, self.content)
        
        for match in matches2:
            var_name = match.group(1)
            start_pos = match.start()
            jsx_block = self.extract_balanced_jsx(start_pos, '{', '}')
            
            if jsx_block and not any(d['start'] == start_pos for d in dropdowns):
                dropdowns.append({
                    'type': 'dropdown',
                    'name': var_name.replace('Open', ''),
                    'content': jsx_block,
                    'start': start_pos,
                    'end': start_pos + len(jsx_block)
                })
        
        print(f"📋 Найдено {len(dropdowns)} dropdown меню")
        return dropdowns
    
    def find_list_items(self) -> List[Dict]:
        """Найти все элементы списков (карточки в map)"""
        list_items = []
        
        # Паттерн: items.map(item => (<div>...</div>))
        pattern = r'(\w+)\.map\(\(?(\w+)\)?\s*=>\s*\('
        matches = re.finditer(pattern, self.content)
        
        for match in matches:
            collection_name = match.group(1)
            item_name = match.group(2)
            start_pos = match.start()
            
            # Извлечь JSX блок внутри map
            jsx_block = self.extract_balanced_jsx(start_pos + len(match.group(0)) - 1, '(', ')')
            
            if jsx_block and len(jsx_block) > 100:  # Только значимые блоки
                list_items.append({
                    'type': 'list_item',
                    'name': f'{collection_name.capitalize()}Item',
                    'collection': collection_name,
                    'item_var': item_name,
                    'content': jsx_block,
                    'start': start_pos,
                    'end': start_pos + len(jsx_block)
                })
        
        print(f"📌 Найдено {len(list_items)} элементов списков")
        return list_items
    
    def find_form_sections(self) -> List[Dict]:
        """Найти секции форм (по комментариям)"""
        sections = []
        
        # Паттерн: {/* Название секции */}
        pattern = r'\/\*\s*(.+?)\s*\*\/'
        matches = re.finditer(pattern, self.content)
        
        section_map = {}
        for match in matches:
            section_name = match.group(1).strip()
            if len(section_name) < 50 and not section_name.startswith('='):
                section_map[match.start()] = section_name
        
        # Для каждой секции найти её содержимое
        positions = sorted(section_map.keys())
        for i, pos in enumerate(positions):
            section_name = section_map[pos]
            
            # Определить конец секции (до следующей секции или до конца блока)
            next_pos = positions[i + 1] if i + 1 < len(positions) else len(self.content)
            
            # Извлечь содержимое между комментариями
            section_content = self.content[pos:next_pos]
            
            # Проверить, есть ли значимый JSX
            if '<div' in section_content or '<input' in section_content or '<button' in section_content:
                sections.append({
                    'type': 'form_section',
                    'name': section_name,
                    'content': section_content,
                    'start': pos,
                    'end': next_pos
                })
        
        print(f"📝 Найдено {len(sections)} секций форм")
        return sections
    
    def extract_balanced_jsx(self, start_pos: int, open_char: str, close_char: str) -> str:
        """Извлечь сбалансированный JSX блок"""
        depth = 0
        in_string = False
        string_char = None
        i = start_pos
        
        while i < len(self.content):
            char = self.content[i]
            
            # Обработка строк
            if char in ('"', "'", '`') and (i == 0 or self.content[i-1] != '\\'):
                if not in_string:
                    in_string = True
                    string_char = char
                elif char == string_char:
                    in_string = False
                    string_char = None
            
            # Подсчет скобок вне строк
            if not in_string:
                if char == open_char:
                    depth += 1
                elif char == close_char:
                    depth -= 1
                    if depth == 0:
                        return self.content[start_pos:i+1]
            
            i += 1
        
        return ""
    
    def analyze_component_dependencies(self, content: str) -> Set[str]:
        """Определить зависимости компонента"""
        deps = set()
        
        # Найти используемые иконки
        icon_pattern = r'<(\w+)\s+className='
        icons = re.findall(icon_pattern, content)
        for icon in icons:
            if icon[0].isupper():  # Компонент (не HTML тег)
                deps.add(icon)
        
        # Найти используемые переменные состояния
        state_pattern = r'\b(todos|lists|people|categories|editingTodo|setEditingTodo|showArchive|setShowArchive)\b'
        states = re.findall(state_pattern, content)
        deps.update(states)
        
        return deps
    
    def generate_component_code(self, comp: Dict) -> str:
        """Сгенерировать код компонента"""
        comp_name = self.sanitize_component_name(comp['name'])
        
        # Определить зависимости
        deps = self.analyze_component_dependencies(comp['content'])
        
        # Определить props
        props = []
        if 'editingTodo' in deps or 'setEditingTodo' in deps:
            props.append('todo: Todo')
            props.append('onUpdate: (updates: Partial<Todo>) => void')
        if 'todos' in deps:
            props.append('todos: Todo[]')
        if 'lists' in deps:
            props.append('lists: TodoList[]')
        if 'people' in deps:
            props.append('people: Person[]')
        if comp['type'] == 'modal':
            props.append('isOpen: boolean')
            props.append('onClose: () => void')
        
        # Генерация интерфейса props
        props_interface = f"interface {comp_name}Props {{\n  " + ";\n  ".join(props) + ";\n}}" if props else ""
        
        # Генерация импортов
        imports = self.generate_imports(deps)
        
        # Генерация компонента
        code = f"""'use client';

import React, {{ memo }} from 'react';
{imports}

{props_interface}

const {comp_name} = memo(function {comp_name}({{{', '.join([p.split(':')[0].strip() for p in props])}}}: {comp_name}Props) {{
  return (
    {comp['content']}
  );
}});

export default {comp_name};
"""
        
        return code
    
    def generate_imports(self, deps: Set[str]) -> str:
        """Сгенерировать строки импортов"""
        imports = []
        
        # Lucide icons
        lucide_icons = [d for d in deps if d in ['X', 'Check', 'ChevronDown', 'User', 'Calendar', 'Clock', 'Edit', 'Trash']]
        if lucide_icons:
            imports.append(f"import {{ {', '.join(lucide_icons)} }} from 'lucide-react';")
        
        # Types
        if any(t in deps for t in ['Todo', 'TodoList', 'Person', 'Category']):
            types = [t for t in ['Todo', 'TodoList', 'Person', 'Category'] if t in deps]
            imports.append(f"import type {{ {', '.join(types)} }} from '@/types';")
        
        return '\n'.join(imports)
    
    def sanitize_component_name(self, name: str) -> str:
        """Очистить имя компонента"""
        # Удалить show, Modal, Open и т.д.
        name = re.sub(r'^show', '', name)
        name = re.sub(r'Modal$', '', name)
        name = re.sub(r'Open$', '', name)
        name = re.sub(r'Dropdown$', '', name)
        
        # Преобразовать в PascalCase
        name = ''.join(word.capitalize() for word in re.split(r'[_\-\s]+', name))
        
        # Добавить суффикс если нужно
        if not name.endswith('Modal') and not name.endswith('Panel') and not name.endswith('Item'):
            name += 'Component'
        
        return name
    
    def save_component(self, comp: Dict, code: str):
        """Сохранить компонент в файл"""
        comp_name = self.sanitize_component_name(comp['name'])
        
        # Определить подпапку
        subfolder = {
            'modal': 'modals',
            'dropdown': 'dropdowns',
            'list_item': 'items',
            'form_section': 'sections'
        }.get(comp['type'], 'components')
        
        output_path = Path(self.output_dir) / subfolder
        output_path.mkdir(parents=True, exist_ok=True)
        
        file_path = output_path / f"{comp_name}.tsx"
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(code)
        
        print(f"  ✅ {file_path}")
    
    def extract_all(self):
        """Извлечь все компоненты"""
        self.load_file()
        self.extract_imports()
        
        # Найти все компоненты
        all_components = []
        all_components.extend(self.find_modals())
        all_components.extend(self.find_dropdowns())
        all_components.extend(self.find_list_items())
        
        # Сортировать по размеру (большие первыми)
        all_components.sort(key=lambda c: len(c['content']), reverse=True)
        
        print(f"\n🎯 Всего найдено {len(all_components)} компонентов\n")
        
        # Генерировать и сохранять компоненты
        saved_count = 0
        for comp in all_components:
            try:
                # Пропустить слишком маленькие блоки
                if len(comp['content']) < 200:
                    continue
                
                # Пропустить блоки без значимого JSX
                if not re.search(r'<\w+', comp['content']):
                    continue
                
                code = self.generate_component_code(comp)
                self.save_component(comp, code)
                saved_count += 1
            except Exception as e:
                print(f"  ⚠️  Ошибка при генерации {comp['name']}: {e}")
        
        print(f"\n✨ Сохранено {saved_count} компонентов")
        self.generate_summary(all_components)
    
    def generate_summary(self, components: List[Dict]):
        """Генерировать сводку"""
        summary = f"""# 🎯 Результаты извлечения компонентов

## 📊 Статистика

- **Всего компонентов**: {len(components)}
- **Модальные окна**: {len([c for c in components if c['type'] == 'modal'])}
- **Dropdown меню**: {len([c for c in components if c['type'] == 'dropdown'])}
- **Элементы списков**: {len([c for c in components if c['type'] == 'list_item'])}
- **Секции форм**: {len([c for c in components if c['type'] == 'form_section'])}

## 📁 Структура файлов

```
{self.output_dir}/
├── modals/          # Модальные окна
├── dropdowns/       # Выпадающие меню
├── items/           # Элементы списков (карточки)
└── sections/        # Секции форм
```

## 📋 Список компонентов

"""
        
        for comp in sorted(components, key=lambda c: c['type']):
            comp_name = self.sanitize_component_name(comp['name'])
            lines = len(comp['content'].splitlines())
            summary += f"- **{comp_name}** ({comp['type']}) - {lines} строк\n"
        
        summary_path = Path(self.output_dir) / "EXTRACTION_SUMMARY.md"
        with open(summary_path, 'w', encoding='utf-8') as f:
            f.write(summary)
        
        print(f"\n📄 Сводка сохранена: {summary_path}")

def main():
    print("🚀 Автоматическое извлечение компонентов\n")
    
    extractor = ComponentExtractor(SOURCE_FILE, OUTPUT_DIR)
    extractor.extract_all()
    
    print("\n✅ Готово!")

if __name__ == "__main__":
    main()
