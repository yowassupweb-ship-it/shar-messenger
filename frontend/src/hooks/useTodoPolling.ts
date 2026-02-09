import { useEffect, useCallback } from 'react';
import { Todo, Toast } from '@/types/todos';

interface UseTodoPollingProps {
  myAccountId: string | null;
  soundEnabled: boolean;
  editingTodo: Todo | null;
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
  setEditingTodo: React.Dispatch<React.SetStateAction<Todo | null>>;
  notificationSoundRef: React.RefObject<HTMLAudioElement | null>;
}

export function useTodoPolling({
  myAccountId,
  soundEnabled,
  editingTodo,
  setTodos,
  setToasts,
  setEditingTodo,
  notificationSoundRef
}: UseTodoPollingProps) {
  
  useEffect(() => {
    const pollTodos = async () => {
      // Не запрашиваем данные если вкладка не активна
      if (typeof document !== 'undefined' && document.hidden) return;
      
      try {
        const userId = myAccountId;
        const res = await fetch(`/api/todos${userId ? `?userId=${userId}` : ''}`);
        if (res.ok) {
          const data = await res.json();
          const newTodos: Todo[] = data.todos || [];
          
          // Проверяем, есть ли новые задачи или комментарии
          setTodos(prev => {
            const prevMap = new Map(prev.map(t => [t.id, t]));
            
            if (myAccountId) {
              newTodos.forEach((newTodo: Todo) => {
                const oldTodo = prevMap.get(newTodo.id);
                
                // Не показываем уведомления если модалка с этой задачей уже открыта
                const isModalOpenForThis = editingTodo?.id === newTodo.id;
                
                // Новая задача назначена мне (и модалка не открыта)
                if (!oldTodo && newTodo.assignedToId === myAccountId && !isModalOpenForThis) {
                  const toast: Toast = {
                    id: `toast-new-${newTodo.id}`,
                    type: 'info',
                    title: '📋 Новая задача',
                    message: newTodo.title,
                    todoId: newTodo.id,
                    createdAt: Date.now()
                  };
                  setToasts(toastPrev => [...toastPrev.slice(-2), toast]);
                  
                  if (soundEnabled && notificationSoundRef.current) {
                    notificationSoundRef.current.currentTime = 0;
                    notificationSoundRef.current.play().catch(() => {});
                  }
                }
                
                // Новый комментарий в моей задаче (я заказчик или исполнитель)
                const isMyTask = newTodo.assignedToId === myAccountId || newTodo.assignedById === myAccountId;
                // Не показываем уведомление о комментарии если модалка открыта
                if (oldTodo && isMyTask && newTodo.comments && oldTodo.comments && !isModalOpenForThis) {
                  const oldCommentsCount = oldTodo.comments.length;
                  const newCommentsCount = newTodo.comments.length;
                  
                  if (newCommentsCount > oldCommentsCount) {
                    const lastComment = newTodo.comments[newTodo.comments.length - 1];
                    // Не показываем уведомление о своём комментарии
                    if (lastComment && lastComment.authorId !== myAccountId) {
                      const toast: Toast = {
                        id: `toast-comment-${lastComment.id}`,
                        type: 'info',
                        title: '💬 Новый комментарий',
                        message: `${lastComment.authorName}: ${lastComment.content.slice(0, 50)}${lastComment.content.length > 50 ? '...' : ''}`,
                        todoId: newTodo.id,
                        createdAt: Date.now()
                      };
                      setToasts(toastPrev => [...toastPrev.slice(-2), toast]);
                      
                      if (soundEnabled && notificationSoundRef.current) {
                        notificationSoundRef.current.currentTime = 0;
                        notificationSoundRef.current.play().catch(() => {});
                      }
                    }
                  }
                }
                
                // Статус изменён на "review" - уведомляем заказчика (если модалка не открыта)
                if (oldTodo && newTodo.status === 'review' && oldTodo.status !== 'review' && newTodo.assignedById === myAccountId && !isModalOpenForThis) {
                  const toast: Toast = {
                    id: `toast-review-${newTodo.id}`,
                    type: 'success',
                    title: '✅ Готово к проверке',
                    message: newTodo.title,
                    todoId: newTodo.id,
                    createdAt: Date.now()
                  };
                  setToasts(toastPrev => [...toastPrev.slice(-2), toast]);
                  
                  if (soundEnabled && notificationSoundRef.current) {
                    notificationSoundRef.current.currentTime = 0;
                    notificationSoundRef.current.play().catch(() => {});
                  }
                }
              });
            }
            
            // Обновляем editingTodo если модалка открыта и пришли изменения
            if (editingTodo) {
              const updatedTodo = newTodos.find(t => t.id === editingTodo.id);
              if (updatedTodo) {
                setEditingTodo((prev: Todo | null) => {
                  if (!prev) return prev;
                  
                  // Если комментариев стало больше - обновляем
                  const oldCommentsCount = prev.comments?.length || 0;
                  const newCommentsCount = updatedTodo.comments?.length || 0;
                  
                  if (newCommentsCount > oldCommentsCount) {
                    // Обновляем только комментарии и readCommentsByUser
                    return {
                      ...prev,
                      comments: updatedTodo.comments,
                      readCommentsByUser: updatedTodo.readCommentsByUser
                    };
                  }
                  
                  // Если комментариев не изменилось, но status или другие поля - обновляем их
                  if (prev.status !== updatedTodo.status || 
                      prev.completed !== updatedTodo.completed ||
                      prev.dueDate !== updatedTodo.dueDate) {
                    return {
                      ...prev,
                      status: updatedTodo.status,
                      completed: updatedTodo.completed,
                      dueDate: updatedTodo.dueDate
                    };
                  }
                  
                  return prev;
                });
              }
            }
            
            return newTodos;
          });
        }
      } catch (error) {
        // Silently fail
      }
    };

    // Polling каждые 30 секунд
    const interval = setInterval(pollTodos, 30000);
    
    return () => clearInterval(interval);
  }, [myAccountId, soundEnabled, editingTodo?.id, setTodos, setToasts, setEditingTodo, notificationSoundRef]);
}
