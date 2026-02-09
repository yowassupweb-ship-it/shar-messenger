# 📦 Components Structure

Организованная структура компонентов для удобного переиспользования и масштабирования.

## 🏗️ Структура папок

```
components/
├── common/              # Переиспользуемые UI компоненты
│   ├── buttons/         # Кнопки (AddButton, GlassButton)
│   ├── feedback/        # Обратная связь (Toast, Spinner, Loading, Error)
│   ├── overlays/        # Оверлеи (Modal, Portal, EmojiPicker)
│   └── data-display/    # Отображение данных (Avatar, Timeline, TaskCard)
│
├── forms/               # Форм-элементы
│   ├── inputs/          # Инпуты (TokenInput, AvatarUpload)
│   ├── editors/         # Редакторы (DescriptionEditor)
│   ├── selectors/       # Селекторы и фильтры (StyledSelect, FilterPanel)
│   └── ui/              # UI компоненты форм (DateTimePicker, PersonSelector)
│
├── layout/              # Layout компоненты
│   └── Sidebar, MainLayout, Toolbar, ChatListSkeleton
│
├── api/                 # API и аутентификация
│   └── ApiStatus, ApiInitializer, AuthGuard, ApiWarning
│
├── charts/              # Графики и визуализация
│   └── DynamicsChart, PositionsChart, RegionsPanel, ClusterTree
│
└── features/            # Feature-specific компоненты
    ├── messages/        # Мессенджер (ChatHeader, MessageItem, ChatSidebar)
    ├── todos/           # Задачи (TodoItem, TaskStatusSection)
    ├── todos-auto/      # Автоматизация задач
    ├── ai/              # AI функционал (AIChat, AIAnalysis)
    └── analytics/       # Аналитика (KeywordSearch, BatchProcessor, Boards)
```

## 📚 Использование

### Импорт из категорий

```typescript
// Common компоненты
import { Avatar, Timeline, Toast } from '@/components/common';
import { Modal, EmojiPicker } from '@/components/common/overlays';

// Form компоненты
import { TokenInput, StyledSelect } from '@/components/forms';
import { DateTimePicker, PersonSelector } from '@/components/forms/ui';

// Layout
import { Sidebar, MainLayout } from '@/components/layout';

// Features
import { ChatHeader, MessageItem } from '@/components/features/messages';
import { TodoItem } from '@/components/features/todos';

// Charts
import { DynamicsChart, PositionsChart } from '@/components/charts';

// API
import { ApiStatus, AuthGuard } from '@/components/api';
```

## 🎯 Принципы организации

### 1. **common/** - Переиспользуемые компоненты
- Не зависят от бизнес-логики
- Могут использоваться в любой части приложения
- Полностью настраиваемы через props

### 2. **forms/** - Форм-элементы
- Инпуты, селекторы, редакторы
- Валидация и обработка данных
- Интеграция с form libraries (react-hook-form)

### 3. **layout/** - Layout системы
- Структура страниц
- Навигация
- Общие обёртки

### 4. **features/** - Фича-специфичные компоненты
- Привязаны к конкретной функциональности
- Могут использовать бизнес-логику
- Организованы по доменам (messages, todos, analytics)

### 5. **api/** - API интеграция
- Компоненты для работы с API
- Аутентификация и авторизация
- Обработка статусов загрузки

### 6. **charts/** - Визуализация данных
- Графики и диаграммы
- Панели с метриками
- Интерактивные визуализации

## 🔄 Миграция импортов

При рефакторинге обновите импорты:

```typescript
// ❌ Старый способ
import Avatar from '@/components/Avatar';
import Toast from '@/components/Toast';

// ✅ Новый способ
import { Avatar } from '@/components/common';
import { Toast } from '@/components/common/feedback';
```

## 📝 Соглашения

1. **Index файлы** - каждая папка экспортирует компоненты через `index.ts`
2. **Named exports** - используйте named exports для лучшей tree-shaking
3. **Типы** - храните типы рядом с компонентами или в `types.ts`
4. **Документация** - добавляйте JSDoc комментарии к props

## 🚀 Примеры использования

### Создание нового компонента

```typescript
// components/common/buttons/ConfirmButton.tsx
export default function ConfirmButton({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>;
}

// components/common/buttons/index.ts
export { default as ConfirmButton } from './ConfirmButton';

// Использование
import { ConfirmButton } from '@/components/common/buttons';
```

### Feature-specific компонент

```typescript
// components/features/todos/TaskList.tsx
import { TodoItem } from './TodoItem';
import { Avatar } from '@/components/common';

export default function TaskList({ tasks }) {
  return tasks.map(task => <TodoItem key={task.id} task={task} />);
}
```

## 🔍 Поиск компонентов

- **Кнопка?** → `common/buttons/`
- **Модальное окно?** → `common/overlays/`
- **Инпут/форма?** → `forms/`
- **График?** → `charts/`
- **Чат/сообщения?** → `features/messages/`
- **Задачи?** → `features/todos/`
- **AI функции?** → `features/ai/`

## ⚡ Преимущества новой структуры

1. ✅ **Легко найти** - логичная группировка по назначению
2. ✅ **Удобно импортировать** - короткие пути через index файлы
3. ✅ **Масштабируемо** - добавление новых фичей не захламляет структуру
4. ✅ **Переиспользуемо** - чёткое разделение common и feature-specific
5. ✅ **Tree-shaking friendly** - named exports для оптимизации бандла
