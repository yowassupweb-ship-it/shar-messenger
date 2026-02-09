import { Todo } from '@/types/todos';

interface UnreadInfo {
  count: number;
  firstUnreadId: string | null;
}

export function getUnreadCommentsInfo(
  todo: Todo,
  myAccountId: string | null
): UnreadInfo {
  if (!todo.comments || !myAccountId) {
    return { count: 0, firstUnreadId: null };
  }

  const lastReadId = todo.readCommentsByUser?.[myAccountId];
  
  if (!lastReadId) {
    // Все комментарии непрочитанные
    return {
      count: todo.comments.length,
      firstUnreadId: todo.comments[0]?.id || null
    };
  }

  const lastReadIndex = todo.comments.findIndex(c => c.id === lastReadId);
  
  if (lastReadIndex === -1) {
    // lastReadId не найден - все непрочитанные
    return {
      count: todo.comments.length,
      firstUnreadId: todo.comments[0]?.id || null
    };
  }

  const unreadComments = todo.comments.slice(lastReadIndex + 1);
  
  return {
    count: unreadComments.length,
    firstUnreadId: unreadComments[0]?.id || null
  };
}

export function markCommentsAsRead(
  todoId: string,
  myAccountId: string | null,
  lastCommentId: string
) {
  if (!myAccountId) return;

  fetch(`/api/todos/${todoId}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: myAccountId,
      lastReadCommentId: lastCommentId
    })
  }).catch(() => {});
}

export function scrollToUnread(firstUnreadId: string | null) {
  if (!firstUnreadId) return;

  setTimeout(() => {
    const unreadDivider = document.getElementById('unread-divider');
    if (unreadDivider) {
      unreadDivider.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      const firstUnread = document.getElementById(`comment-${firstUnreadId}`);
      if (firstUnread) {
        firstUnread.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, 100);
}
