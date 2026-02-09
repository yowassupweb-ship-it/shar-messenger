import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Todo, Person } from '@/types/todos';

interface UseTodoUrlHandlersProps {
  todos: Todo[];
  people: Person[];
  isLoading: boolean;
  myAccountId: string | null;
  setEditingTodo: (todo: Todo | null) => void;
  setAddingToList: (listId: string | null) => void;
  setNewTodoTitle: (title: string) => void;
  setNewTodoAssigneeId: (id: string | null) => void;
  setReturnUrl: (url: string) => void;
}

export function useTodoUrlHandlers({
  todos,
  people,
  isLoading,
  myAccountId,
  setEditingTodo,
  setAddingToList,
  setNewTodoTitle,
  setNewTodoAssigneeId,
  setReturnUrl
}: UseTodoUrlHandlersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isClosingModalRef = useRef(false);
  const hasOpenedFromUrlRef = useRef(false);

  // Автоматическое открытие модалки создания задачи из URL параметров
  useEffect(() => {
    const createTask = searchParams.get('createTask');
    const listId = searchParams.get('listId');
    const assignTo = searchParams.get('assignTo');
    const assignToName = searchParams.get('assignToName');
    const taskTitle = searchParams.get('taskTitle');
    const returnUrlParam = searchParams.get('returnUrl');

    if (createTask && listId) {
      setAddingToList(listId);
      if (assignTo) {
        setNewTodoAssigneeId(assignTo);
      }
      if (taskTitle) {
        setNewTodoTitle(decodeURIComponent(taskTitle));
      }
      if (returnUrlParam) {
        setReturnUrl(returnUrlParam);
      }
      // Убираем параметры из URL
      router.replace('/todos');
    }
  }, [searchParams, setAddingToList, setNewTodoTitle, setNewTodoAssigneeId, setReturnUrl, router]);

  // Открытие задачи по параметру URL ?task=ID
  useEffect(() => {
    const taskId = searchParams.get('task');
    
    console.log('[URL Task] taskId:', taskId, 'todos:', todos.length, 'isLoading:', isLoading, 'isClosing:', isClosingModalRef.current, 'hasOpened:', hasOpenedFromUrlRef.current);
    
    // Если есть taskId в URL и данные загружены
    if (taskId && !isLoading && !isClosingModalRef.current && !hasOpenedFromUrlRef.current) {
      const todo = todos.find(t => t.id === taskId);
      console.log('[URL Task] Found todo:', todo?.title);
      if (todo) {
        hasOpenedFromUrlRef.current = true; // Помечаем что уже открыли
        // Автозаполнение "От кого" если не указано и myAccount - заказчик
        const myAccount = myAccountId ? people.find(p => p.id === myAccountId) : null;
        let updatedTodo = todo;
        if (!todo.assignedById && myAccount && myAccount.role === 'customer') {
          updatedTodo = { ...todo, assignedById: myAccount.id };
        }
        setEditingTodo(updatedTodo);
      }
    }
    
    // Сбрасываем флаги когда taskId убран из URL
    if (!taskId) {
      isClosingModalRef.current = false;
      hasOpenedFromUrlRef.current = false;
    }
  }, [searchParams, todos, isLoading, myAccountId, people, setEditingTodo]);

  return { isClosingModalRef };
}
