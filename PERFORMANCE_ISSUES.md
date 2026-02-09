# 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ ПРОИЗВОДИТЕЛЬНОСТИ

## Найденные проблемы в `/frontend/src/app/todos/page.tsx`:

### 1. ❌ ДВА POLLING'А КАЖДЫЕ 10 СЕКУНД
**Lines: 940, 1099**

```typescript
// Line 940
const interval = setInterval(pollTodos, 10000); // Обновляет todos каждые 10s

// Line 1099  
const interval = setInterval(() => {
  loadNotifications(true);
}, 10000); // Обновляет notifications каждые 10s
```

**Проблема**: Каждые 10 секунд происходит:
- 2 fetch запроса
- 2 setState  
- Полный re-render всего компонента (6200+ строк!)

**Решение**: Увеличить до 30-60 секунд:
```typescript
setInterval(pollTodos, 30000); // 30s
setInterval(() => loadNotifications(true), 30000); // 30s
```

---

### 2. ❌ ВЫЧИСЛЕНИЯ БЕЗ useMemo ПРИ КАЖДОМ RENDER
**Lines: 1415-1416**

```typescript
const myNotifications = notifications.filter(n => n.toUserId === myAccountId);
const unreadCount = myNotifications.filter(n => !n.read).length;
```

**Проблема**: 
- Выполняется при КАЖДОМ render (каждые 10s из-за polling + любой setState)
- Если 100 notifications → 100 проверок каждый раз!

**Решение**:
```typescript
const myNotifications = useMemo(
  () => notifications.filter(n => n.toUserId === myAccountId),
  [notifications, myAccountId]
);
const unreadCount = useMemo(
  () => myNotifications.filter(n => !n.read).length,
  [myNotifications]
);
```

---

### 3. ❌ МНОЖЕСТВЕННАЯ ФИЛЬТРАЦИЯ БЕЗ КЭША
**Lines: 2813-2814, 3426-3427**

```typescript
// В .map() для каждого списка:
const listTodos = getTodosForList(list.id, showArchive);
const completedCount = todos.filter(t => t.listId === list.id && t.completed).length;
const totalCount = todos.filter(t => t.listId === list.id).length;
```

**Проблема**:
- При 10 списках и 100 задачах: 10 × 100 × 2 = **2000 filter операций за render**!
- Уже есть мемо данные `filteredAndSortedTodos`, но не используются!

**Решение**: Считать из мемоизированных данных:
```typescript
const memoizedListCounts = useMemo(() => {
  return lists.map(list => {
    const listTodos = getTodosForList(list.id, showArchive);
    return {
      listId: list.id,
      completedCount: listTodos.filter(t => t.completed).length,
      totalCount: listTodos.length
    };
  });
}, [lists, getTodosForList, showArchive]);

// В render:
const counts = memoizedListCounts.find(c => c.listId === list.id);
const completedCount = counts?.completedCount || 0;
const totalCount = counts?.totalCount || 0;
```

---

### 4. ❌ МНОЖЕСТВЕННЫЕ lists.filter БЕЗ МЕМО
**Lines: 2658-2659 (3 раза подряд!)**

```typescript
const nonArchivedLists = lists.filter(l => !l.archived).sort((a, b) => a.order - b.order);
...
disabled={selectedColumnIndex >= lists.filter(l => !l.archived).length - 1}
...
selectedColumnIndex >= lists.filter(l => !l.archived).length - 1
```

**Проблема**: `lists.filter(l => !l.archived)` вызывается 3+ раза в одном месте!

**Решение**:
```typescript
const nonArchivedLists = useMemo(
  () => lists.filter(l => !l.archived).sort((a, b) => a.order - b.order),
  [lists]
);
```

---

## ИТОГО: Почему страница тяжелая?

1. **Постоянные re-renders**: Каждые 10s polling вызывает setState → полный render компонента
2. **Избыточные вычисления**: Тысячи filter/map операций без кэширования
3. **Нет мемоизации**: Критичные данные (notifications, counts) пересчитываются каждый раз
4. **Дублирование**: Одни и те же фильтры вызываются многократно

## ПЛАН ИСПРАВЛЕНИЯ:

✅ 1. Увеличить polling: 10s → 30-60s (снизит renders в 3-6 раз)
✅ 2. useMemo для myNotifications и unreadCount
✅ 3. useMemo для nonArchivedLists
✅ 4. useMemo для listCounts (completedCount/totalCount)
✅ 5. Проверить debounce на description editor (уже исправлено)
✅ 6. CSS variables для адаптивности (уже исправлено)

## ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:

- ❌ Было: ~200-600 фильтраций за render × каждые 10s
- ✅ Станет: Мемоизированные данные + render каждые 30-60s
- 🚀 Ускорение: **5-10x меньше нагрузки**
