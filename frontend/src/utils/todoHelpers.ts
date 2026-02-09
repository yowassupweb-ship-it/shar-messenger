import { Todo, TodoList, Category, Person, TodoFilter } from '@/types/todos';

export function getPersonNameById(people: Person[], id?: string, fallbackName?: string): string {
  if (!id) return fallbackName || '';
  return people.find(p => p.id === id)?.name || fallbackName || id;
}

export function formatLastSeen(lastSeen?: string): { text: string; isOnline: boolean; color: string } {
  if (!lastSeen) return { text: 'Никогда', isOnline: false, color: 'text-[var(--text-muted)]' };
  
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  
  if (diffMinutes < 2) {
    return { text: 'Онлайн', isOnline: true, color: 'text-green-400' };
  } else if (diffMinutes < 5) {
    return { text: 'Был(а) только что', isOnline: false, color: 'text-green-400/70' };
  } else if (diffMinutes < 60) {
    return { text: `Был(а) ${diffMinutes} мин. назад`, isOnline: false, color: 'text-white/50' };
  } else if (diffMinutes < 1440) { // меньше суток
    const hours = Math.floor(diffMinutes / 60);
    return { text: `Был(а) ${hours} ч. назад`, isOnline: false, color: 'text-[var(--text-muted)]' };
  } else {
    const days = Math.floor(diffMinutes / 1440);
    return { text: `Был(а) ${days} дн. назад`, isOnline: false, color: 'text-[var(--text-muted)]' };
  }
}

export function getCategoryNameById(categories: Category[], id?: string): string {
  if (!id) return '';
  return categories.find(c => c.id === id)?.name || '';
}

export function filterTodos(
  todos: Todo[],
  filter: TodoFilter,
  searchQuery: string,
  myAccountId: string | null
): Todo[] {
  return todos.filter(todo => {
    // Фильтр по статусу
    if (filter.status && todo.status !== filter.status) return false;
    
    // Фильтр по заказчику (assignedById)
    if (filter.assignedById && todo.assignedById !== filter.assignedById) return false;
    
    // Фильтр по исполнителю (assignedToId)
    if (filter.assignedToId) {
      const isAssigned = todo.assignedToId === filter.assignedToId || 
                         todo.assignedToIds?.includes(filter.assignedToId);
      if (!isAssigned) return false;
    }
    
    // Фильтр "Только мои"
    if (filter.onlyMy && myAccountId) {
      const isMyTask = todo.assignedToId === myAccountId || 
                       todo.assignedToIds?.includes(myAccountId) ||
                       todo.assignedById === myAccountId;
      if (!isMyTask) return false;
    }
    
    // Фильтр по категории
    if (filter.categoryId && todo.categoryId !== filter.categoryId) return false;
    
    // Фильтр по приоритету
    if (filter.priority && todo.priority !== filter.priority) return false;
    
    // Фильтр по поиску
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = todo.title.toLowerCase().includes(query);
      const matchDescription = todo.description?.toLowerCase().includes(query);
    const matchTags = todo.tags.some((tag: string) => tag.toLowerCase().includes(query));
      if (!matchTitle && !matchDescription && !matchTags) return false;
    }
    
    return true;
  });
}

export function getTodosForList(
  todos: Todo[],
  listId: string,
  filter: TodoFilter,
  searchQuery: string,
  myAccountId: string | null
): Todo[] {
  const listTodos = todos.filter(t => t.listId === listId && !t.archived);
  const filtered = filterTodos(listTodos, filter, searchQuery, myAccountId);
  return filtered.sort((a, b) => a.order - b.order);
}

export function getArchivedTodos(todos: Todo[]): Todo[] {
  return todos
    .filter(t => t.archived)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getArchivedLists(lists: TodoList[]): TodoList[] {
  return lists
    .filter(l => l.archived)
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
}

export function getListById(lists: TodoList[], id: string): TodoList | undefined {
  return lists.find(l => l.id === id);
}

export function getTasksCount(todos: Todo[], listId: string): number {
  return todos.filter(t => t.listId === listId && !t.archived).length;
}

export function getCompletedCount(todos: Todo[], listId: string): number {
  return todos.filter(t => t.listId === listId && !t.archived && t.completed).length;
}

export function getProgressPercentage(todos: Todo[], listId: string): number {
  const total = getTasksCount(todos, listId);
  if (total === 0) return 0;
  const completed = getCompletedCount(todos, listId);
  return Math.round((completed / total) * 100);
}

export function getTodoById(todos: Todo[], id: string): Todo | undefined {
  return todos.find(t => t.id === id);
}

export function getUnreadCommentsCount(
  todo: Todo,
  myAccountId: string | null
): number {
  if (!todo.comments || !myAccountId) return 0;
  
  const lastReadId = todo.readCommentsByUser?.[myAccountId];
  if (!lastReadId) return todo.comments.length;
  
  const lastReadIndex = todo.comments.findIndex((c: any) => c.id === lastReadId);
  if (lastReadIndex === -1) return todo.comments.length;
  
  return todo.comments.length - lastReadIndex - 1;
}

export function hasOverdueDeadline(todo: Todo): boolean {
  if (!todo.dueDate || todo.completed) return false;
  const now = new Date();
  const dueDate = new Date(todo.dueDate);
  dueDate.setHours(23, 59, 59, 999);
  return dueDate < now;
}

export function isDeadlineToday(todo: Todo): boolean {
  if (!todo.dueDate) return false;
  const now = new Date();
  const dueDate = new Date(todo.dueDate);
  return dueDate.toDateString() === now.toDateString();
}

export function isDeadlineTomorrow(todo: Todo): boolean {
  if (!todo.dueDate) return false;
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDate = new Date(todo.dueDate);
  return dueDate.toDateString() === tomorrow.toDateString();
}

export function formatDeadline(dueDate: string): string {
  const date = new Date(dueDate);
  const now = new Date();
  
  if (isDeadlineToday({ dueDate } as Todo)) {
    return 'Сегодня';
  }
  
  if (isDeadlineTomorrow({ dueDate } as Todo)) {
    return 'Завтра';
  }
  
  const daysDiff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff < 0) {
    return `Просрочено на ${Math.abs(daysDiff)} дн.`;
  }
  
  if (daysDiff <= 7) {
    return `Через ${daysDiff} дн.`;
  }
  
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function getChecklistProgress(todo: Todo): { completed: number; total: number } {
  if (!todo.checklist) return { completed: 0, total: 0 };
  const total = todo.checklist.length;
  const completed = todo.checklist.filter((item: any) => item.completed).length;
  return { completed, total };
}

export function hasAttachments(todo: Todo): boolean {
  return !!todo.attachments && todo.attachments.length > 0;
}

export function getAttachmentsCount(todo: Todo): number {
  return todo.attachments?.length || 0;
}

export function canUserEditTodo(
  todo: Todo,
  myAccountId: string | null,
  userRole: string | null
): boolean {
  if (!myAccountId) return false;
  if (userRole === 'admin') return true;
  
  // Создатель (заказчик) может редактировать
  if (todo.assignedById === myAccountId) return true;
  
  // Исполнитель может редактировать
  if (todo.assignedToId === myAccountId) return true;
  if (todo.assignedToIds?.includes(myAccountId)) return true;
  
  return false;
}

export function canUserDeleteTodo(
  todo: Todo,
  myAccountId: string | null,
  userRole: string | null
): boolean {
  if (!myAccountId) return false;
  if (userRole === 'admin') return true;
  
  // Только создатель может удалять
  return todo.assignedById === myAccountId;
}

export function getListColor(list: TodoList): string {
  return list.color || '#3b82f6';
}

export function sortListsByOrder(lists: TodoList[]): TodoList[] {
  return [...lists].sort((a, b) => a.order - b.order);
}

export function getVisibleLists(lists: TodoList[]): TodoList[] {
  return sortListsByOrder(lists.filter(l => !l.archived));
}

export function getMyTodos(todos: Todo[], myAccountId: string | null): Todo[] {
  if (!myAccountId) return [];
  return todos.filter(t => 
    !t.archived && (
      t.assignedToId === myAccountId || 
      t.assignedToIds?.includes(myAccountId) ||
      t.assignedById === myAccountId
    )
  );
}

export function getMyActiveTasks(todos: Todo[], myAccountId: string | null): Todo[] {
  return getMyTodos(todos, myAccountId).filter(t => !t.completed);
}

export function getMyCompletedTasks(todos: Todo[], myAccountId: string | null): Todo[] {
  return getMyTodos(todos, myAccountId).filter(t => t.completed);
}

export function getTasksByStatus(
  todos: Todo[],
  status: Todo['status']
): Todo[] {
  return todos.filter(t => !t.archived && t.status === status);
}

export function getHighPriorityTasks(todos: Todo[]): Todo[] {
  return todos.filter(t => !t.archived && !t.completed && t.priority === 'high');
}

export function getOverdueTasks(todos: Todo[]): Todo[] {
  return todos.filter(t => !t.archived && !t.completed && hasOverdueDeadline(t));
}

export function getTodayTasks(todos: Todo[]): Todo[] {
  return todos.filter(t => !t.archived && !t.completed && isDeadlineToday(t));
}
