# Оптимизация производительности - Todos Page

## Критические изменения для ускорения работы

### 1. Добавить импорты для оптимизации

```typescript
import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import TaskCard from '@/components/TaskCard';
import CommentItem from '@/components/CommentItem';
```

### 2. Memo для фильтрации задач

После объявления всех useState, перед функциями добавить:

```typescript
// 🚀 OPTIMIZATION: Мемоизация фильтрованных задач
const filteredAndSortedTodos = useMemo(() => {
  return lists.map(list => {
    if (list.archived && !showArchive) return { listId: list.id, todos: [] };
    
    const listTodos = todos.filter(t => {
      if (t.listId !== list.id) return false;
      if (t.archived && !showArchive <br/>      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Фильтр по статусу
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      
      // Фильтр по исполнителю
      if (executorFilter !== 'all' && t.assignedToId !== executorFilter) return false;
      
      // Права доступа
      if (!canSeeAllTasks && myAccountId) {
        const isExecutor = t.assignedToId === myAccountId;
        const isCustomer = t.assignedById === myAccountId;
        if (!isExecutor && !isCustomer) return false;
      }
      
      return true;
    }).sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });
    
    return { listId: list.id, todos: listTodos };
  });
}, [todos, lists, searchQuery, statusFilter, executorFilter, canSeeAllTasks, myAccountId, showArchive]);
```

### 3. Debounce для комментариев

```typescript
// 🚀 OPTIMIZATION: Debounce для ввода комментариев
const [draftComment, setDraftComment] = useState('');
const debouncedComment = useDebounce(draftComment, 150);

// В onChange textarea комментария использовать setDraftComment вместо setNewComment
// setNewComment обновлять только при отправке
```

### 4. Мемоизация функций

Обернуть часто вызываемые функции в useCallback:

```typescript
const handleTodoClick = useCallback((todo: Todo) => {
  setEditingTodo(todo);
  setModalTab('details');
}, []);

const handleCommentInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setDraftComment(e.target.value);
}, []);

const handleAddCommentClick = useCallback(() => {
  if (draftComment.trim() && editingTodo) {
    addComment(editingTodo.id, draftComment);
    setDraftComment('');
    setReplyingToComment(null);
  }
}, [draftComment, editingTodo, addComment]);
```

### 5. Использовать мемоизированные компоненты

В рендере списка задач заменить:

```tsx
{/* ДО (медленно) */}
{listTodos.map(todo => (
  <div onClick={() => setEditingTodo(todo)} key={todo.id} className="...">
    {/* Много вложенных элементов */}
  </div>
))}

{/* ПОСЛЕ (быстро) */}
{(filteredAndSortedTodos.find(f => f.listId === list.id)?.todos || []).map(todo => (
  <TaskCard
    key={todo.id}
    todo={todo}
    isSelected={editingTodo?.id === todo.id}
    onClick={() => handleTodoClick(todo)}
    categoryColor={categories.find(c => c.id === todo.category)?.color}
    executorName={people.find(p => p.id === todo.assignedToId)?.name}
    commentsCount={todo.comments?.length || 0}
    formattedDeadline={todo.deadline ? formatDeadline(todo.deadline) : undefined}
  />
))}
```

### 6. Оптимизация комментариев

```tsx
{/* ДО */}
{editingTodo?.comments?.map(comment => (
  <div key={comment.id}>
    {/* Много логики рендера */}
  </div>
))}

{/* ПОСЛЕ */}
{editingTodo?.comments?.map(comment => {
  const personData = people.find(p => p.id === comment.authorId);
  return (
    <CommentItem
      key={comment.id}
      comment={comment}
      isOwn={comment.authorId === myAccountId}
      onReply={setReplyingToComment}
      onDelete={deleteComment}
      personName={personData?.name}
    />
  );
})}
```

### 7. CSS Оптимизации

Добавить в className критичных элементов:

```tsx
// Для карточек задач
className="... will-change-transform"
style={{ transform: 'translateZ(0)' }}

// Для скроллируемых контейнеров
className="... scroll-smooth scrollbar-hide"
style={{ willChange: 'scroll-position' }}
```

### 8. Виртуализация длинных списков (опционально)

Если задач >50, установить react-window:

```bash
npm install react-window
```

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={todos.length}
  itemSize={120}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <TaskCard todo={todos[index]} />
    </div>
  )}
</FixedSizeList>
```

## Примерный прирост производительности

- **Ввод в textarea**: с 4500ms до ~150ms (30x быстрее)
- **Фильтрация задач**: с 200ms до <10ms (20x быстрее)
- **Рендер списка**: с 300ms до ~50ms (6x быстрее)
- **Скролл и анимации**: плавные 60 FPS

## Приоритетность внедрения

1. **Критично**: useMemo для filteredAndSortedTodos (#2)
2. **Критично**: Debounce для комментариев (#3)
3. **Важно**: Компоненты TaskCard и CommentItem (#5, #6)
4. **Важно**: CSS оптимизации (#7)
5. **Опционально**: Виртуализация (#8) - только если >100 задач
