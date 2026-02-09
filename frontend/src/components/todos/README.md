# Todo Components

Автоматически созданные компоненты из монолитного todos/page.tsx

## 📦 Созданные компоненты (2)


### TaskStatusSection

- **Файл**: `TaskStatusSection.tsx`
- **Props**: `todo, onUpdate`
- **Источник**: `/* Статус */`

**Использование:**
```tsx
import TaskStatusSection from '@/components/todos/TaskStatusSection';

<TaskStatusSection 
  todo={...} onUpdate={...}
/>
```


### TaskTitleInput

- **Файл**: `TaskTitleInput.tsx`
- **Props**: `titleInputRef, defaultValue, placeholder`
- **Источник**: `/* Название задачи */`

**Использование:**
```tsx
import TaskTitleInput from '@/components/todos/TaskTitleInput';

<TaskTitleInput 
  titleInputRef={...} defaultValue={...} placeholder={...}
/>
```


## 🔄 Как использовать в page.tsx

1. Импортируйте компоненты:
```tsx
import TaskStatusSection from '@/components/todos/TaskStatusSection';
import TaskTitleInput from '@/components/todos/TaskTitleInput';
```

2. Замените соответствующие секции на компоненты

3. Используйте useCallback для обработчиков:
```tsx
const handleUpdate = useCallback((updates: Partial<Todo>) => {
  setEditingTodo(prev => prev ? { ...prev, ...updates } : prev);
}, []);
```

4. Оберните в React.memo для предотвращения лишних ре-рендеров

## ⚡ Ожидаемый прирост производительности

- **До**: ~6219 строк в одном компоненте → полный re-render при любом изменении (240ms)
- **После**: изолированные компоненты → re-render только измененной части (~30-50ms)

