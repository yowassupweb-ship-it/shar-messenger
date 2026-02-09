#!/usr/bin/env python3
"""
Скрипт для разбиения огромного компонента todos/page.tsx на мелкие компоненты
Анализирует структуру, находит логические блоки и создает отдельные файлы
"""

import re
import os
from pathlib import Path

# Пути
FRONTEND_DIR = Path(__file__).parent / 'frontend'
TODOS_PAGE = FRONTEND_DIR / 'src' / 'app' / 'todos' / 'page.tsx'
COMPONENTS_DIR = FRONTEND_DIR / 'src' / 'components' / 'todos'

# Создаем директорию для компонентов
COMPONENTS_DIR.mkdir(parents=True, exist_ok=True)

# Шаблон компонента
COMPONENT_TEMPLATE = """'use client';

import React, {{ memo }} from 'react';
{imports}

{interfaces}

const {component_name} = memo(function {component_name}({{
{props}
}}) {{
{content}
}});

export default {component_name};
"""

# Секции для извлечения (комментарии-маркеры → имя компонента)
SECTIONS = {
    # Левая панель
    '/* Статус */': {
        'name': 'TaskStatusSection',
        'end_marker': '/* Исполнитель */|/* От кого */',
        'props': ['todo', 'onUpdate'],
    },
    '/* Исполнитель */': {
        'name': 'TaskExecutorSection',
        'end_marker': '/* От кого */|/* Дата создания */',
        'props': ['todo', 'people', 'onUpdate'],
    },
    '/* От кого */': {
        'name': 'TaskAssignedBySection',
        'end_marker': '/* Дата создания */|/* Срок */',
        'props': ['todo', 'people', 'onUpdate'],
    },
    '/* Дата создания */': {
        'name': 'TaskCreatedDateSection',
        'end_marker': '/* Срок */|/* Делегировать */',
        'props': ['todo', 'onUpdate'],
    },
    '/* Срок */': {
        'name': 'TaskDueDateSection',
        'end_marker': '/* Делегировать */|/* Важность */',
        'props': ['todo', 'onUpdate'],
    },
    '/* Важность */': {
        'name': 'TaskPrioritySection',
        'end_marker': '/* Комментарий оценки */|</div>',
        'props': ['todo', 'onUpdate'],
    },
    
    # Центральная панель
    '/* Название задачи */': {
        'name': 'TaskTitleInput',
        'end_marker': '/* Заголовок с кнопками форматирования */|/* Панель форматирования */',
        'props': ['titleInputRef', 'defaultValue', 'placeholder'],
    },
    
    # Правая панель
    '/* История изменений */': {
        'name': 'TaskHistoryPanel',
        'end_marker': '/* Начать обсуждение */|</div>',
        'props': ['todo', 'people'],
    },
}

def extract_imports_from_section(content):
    """Извлекает используемые импорты из JSX кода"""
    imports = set()
    
    # Lucide React icons
    icon_pattern = r'<([A-Z][a-zA-Z]+)\s'
    icons = re.findall(icon_pattern, content)
    if icons:
        imports.add(f"import {{ {', '.join(sorted(set(icons)))} }} from 'lucide-react';")
    
    # Link from next/link
    if 'Link ' in content or '<Link' in content:
        imports.add("import Link from 'next/link';")
    
    # useState, useEffect etc
    hooks = []
    if 'useState' in content:
        hooks.append('useState')
    if 'useEffect' in content:
        hooks.append('useEffect')
    if 'useCallback' in content:
        hooks.append('useCallback')
    if 'useMemo' in content:
        hooks.append('useMemo')
    if hooks:
        imports.add(f"import {{ {', '.join(hooks)} }} from 'react';")
    
    return sorted(imports)

def extract_interfaces_from_section(content):
    """Извлекает используемые интерфейсы"""
    interfaces = []
    
    # Проверяем упоминания типов
    if 'Person' in content and 'people' in content.lower():
        interfaces.append("""
interface Person {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
}
""")
    
    if 'Todo' in content or 'todo' in content.lower():
        interfaces.append("""
interface Todo {
  id: string;
  title: string;
  description?: string;
  status?: string;
  completed: boolean;
  priority?: string;
  dueDate?: string;
  createdAt?: string;
  assignedToIds?: string[];
  assignedToNames?: string[];
  assignedById?: string;
  assignedBy?: string;
  delegatedById?: string;
  delegatedBy?: string;
  reviewComment?: string;
  attachments?: Attachment[];
  [key: string]: any;
}

interface Attachment {
  id: string;
  type: string;
  url: string;
  name?: string;
}
""")
    
    return '\n'.join(interfaces)

def find_section_bounds(content, start_marker, end_markers):
    """Находит границы секции по маркерам"""
    start_idx = content.find(start_marker)
    if start_idx == -1:
        return None, None
    
    # Ищем конец секции
    min_end_idx = len(content)
    for end_marker in end_markers.split('|'):
        end_idx = content.find(end_marker, start_idx + len(start_marker))
        if end_idx != -1 and end_idx < min_end_idx:
            min_end_idx = end_idx
    
    if min_end_idx == len(content):
        return None, None
    
    return start_idx, min_end_idx

def extract_jsx_block(content, start_idx):
    """Извлекает JSX блок с правильным балансом тегов"""
    # Находим открывающий <div
    div_start = content.find('<div', start_idx)
    if div_start == -1:
        return None
    
    # Считаем вложенность
    depth = 0
    i = div_start
    while i < len(content):
        if content[i:i+4] == '<div':
            depth += 1
            i += 4
        elif content[i:i+6] == '</div>':
            depth -= 1
            if depth == 0:
                return content[div_start:i+6]
            i += 6
        else:
            i += 1
    
    return None

def create_component_file(name, content, props, imports, interfaces):
    """Создает файл компонента"""
    
    # Форматируем props
    props_str = ',\n  '.join([f"{prop}" for prop in props])
    
    # Оборачиваем контент в return
    formatted_content = f"  return (\n{content}\n  );"
    
    # Форматируем импорты
    imports_str = '\n'.join(imports) if imports else ''
    
    # Создаем файл
    component_code = COMPONENT_TEMPLATE.format(
        component_name=name,
        imports=imports_str,
        interfaces=interfaces,
        props=props_str,
        content=formatted_content
    )
    
    file_path = COMPONENTS_DIR / f"{name}.tsx"
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(component_code)
    
    print(f"✅ Создан компонент: {file_path}")
    return file_path

def analyze_file():
    """Анализирует файл и показывает статистику"""
    with open(TODOS_PAGE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    print(f"\n📊 Анализ файла {TODOS_PAGE.name}")
    print(f"  📏 Всего строк: {len(lines)}")
    
    # Ищем маркеры
    found_markers = []
    for marker in SECTIONS.keys():
        if marker in content:
            found_markers.append(marker)
    
    print(f"  🎯 Найдено маркеров: {len(found_markers)}/{len(SECTIONS)}")
    for marker in found_markers:
        print(f"     - {marker}")
    
    # Считаем JSX блоки
    divs = content.count('<div')
    print(f"  📦 <div> элементов: {divs}")
    
    # Считаем useState
    states = len(re.findall(r'useState', content))
    print(f"  🔧 useState вызовов: {states}")
    
    # Считаем setEditingTodo
    set_editing = len(re.findall(r'setEditingTodo', content))
    print(f"  ⚠️  setEditingTodo вызовов: {set_editing} (каждый триггерит re-render!)")
    
    return content, lines

def extract_components(content):
    """Извлекает компоненты из файла"""
    
    print(f"\n🔧 Начинаю извлечение компонентов...")
    
    created_components = []
    
    for marker, config in SECTIONS.items():
        print(f"\n🔍 Ищу секцию: {marker}")
        
        start_idx, end_idx = find_section_bounds(
            content, 
            marker, 
            config['end_marker']
        )
        
        if start_idx is None:
            print(f"  ❌ Не найдена секция {marker}")
            continue
        
        # Извлекаем JSX блок
        jsx_block = extract_jsx_block(content, start_idx)
        if not jsx_block:
            print(f"  ❌ Не удалось извлечь JSX для {marker}")
            continue
        
        print(f"  ✅ Найден блок ({len(jsx_block)} символов)")
        
        # Создаем компонент
        imports = extract_imports_from_section(jsx_block)
        interfaces = extract_interfaces_from_section(jsx_block)
        
        # Добавляем отступы
        indented_jsx = '\n'.join(['    ' + line for line in jsx_block.split('\n')])
        
        component_file = create_component_file(
            config['name'],
            indented_jsx,
            config['props'],
            imports,
            interfaces
        )
        
        created_components.append({
            'name': config['name'],
            'file': component_file,
            'marker': marker,
            'props': config['props']
        })
    
    return created_components

def generate_usage_guide(components):
    """Генерирует гайд по использованию компонентов"""
    
    guide_path = COMPONENTS_DIR / 'README.md'
    
    guide = f"""# Todo Components

Автоматически созданные компоненты из монолитного todos/page.tsx

## 📦 Созданные компоненты ({len(components)})

"""
    
    for comp in components:
        guide += f"""
### {comp['name']}

- **Файл**: `{comp['file'].name}`
- **Props**: `{', '.join(comp['props'])}`
- **Источник**: `{comp['marker']}`

**Использование:**
```tsx
import {comp['name']} from '@/components/todos/{comp['name']}';

<{comp['name']} 
  {' '.join([f'{prop}={{...}}' for prop in comp['props']])}
/>
```

"""
    
    guide += f"""
## 🔄 Как использовать в page.tsx

1. Импортируйте компоненты:
```tsx
{chr(10).join([f"import {comp['name']} from '@/components/todos/{comp['name']}';" for comp in components])}
```

2. Замените соответствующие секции на компоненты

3. Используйте useCallback для обработчиков:
```tsx
const handleUpdate = useCallback((updates: Partial<Todo>) => {{
  setEditingTodo(prev => prev ? {{ ...prev, ...updates }} : prev);
}}, []);
```

4. Оберните в React.memo для предотвращения лишних ре-рендеров

## ⚡ Ожидаемый прирост производительности

- **До**: ~6219 строк в одном компоненте → полный re-render при любом изменении (240ms)
- **После**: изолированные компоненты → re-render только измененной части (~30-50ms)

"""
    
    with open(guide_path, 'w', encoding='utf-8') as f:
        f.write(guide)
    
    print(f"\n📖 Гайд создан: {guide_path}")

def main():
    print("=" * 60)
    print("🚀 Разбиение монолитного компонента на части")
    print("=" * 60)
    
    # Анализируем файл
    content, lines = analyze_file()
    
    # Извлекаем компоненты
    components = extract_components(content)
    
    # Генерируем гайд
    if components:
        generate_usage_guide(components)
        
        print(f"\n✅ Готово! Создано {len(components)} компонентов")
        print(f"\n📂 Компоненты находятся в: {COMPONENTS_DIR}")
        print(f"\n💡 Следующий шаг: интегрируйте компоненты в {TODOS_PAGE.name}")
        print(f"   Смотрите {COMPONENTS_DIR / 'README.md'} для инструкций")
    else:
        print(f"\n⚠️  Компоненты не созданы. Проверьте маркеры в файле.")

if __name__ == '__main__':
    main()
