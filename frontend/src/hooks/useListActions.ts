import { useCallback } from 'react';
import { TodoList } from '@/types/todos';

interface UseListActionsProps {
  lists: TodoList[];
  setLists: React.Dispatch<React.SetStateAction<TodoList[]>>;
  loadData: () => Promise<void>;
  myAccountId: string | null;
  people: any[];
  windowWidth: number;
  nonArchivedLists: TodoList[];
  setSelectedColumnIndex: (index: number) => void;
  setShowAddList: (show: boolean) => void;
  setShowListSettings: (id: string | null) => void;
}

export function useListActions({
  lists,
  setLists,
  loadData,
  myAccountId,
  people,
  windowWidth,
  nonArchivedLists,
  setSelectedColumnIndex,
  setShowAddList,
  setShowListSettings
}: UseListActionsProps) {
  
  // Добавление списка
  const addList = useCallback(async (
    newListName: string,
    newListColor: string,
    newListAssigneeId: string | null,
    setNewListName: (name: string) => void,
    setNewListAssigneeId: (id: string | null) => void
  ) => {
    console.log('[addList] === START ===');
    console.log('[addList] Called with name:', newListName);
    console.log('[addList] myAccountId:', myAccountId);
    console.log('[addList] newListColor:', newListColor);
    console.log('[addList] newListAssigneeId:', newListAssigneeId);
    
    if (!newListName.trim()) {
      console.log('[addList] Name is empty, returning');
      return;
    }
    
    // Получаем данные выбранного исполнителя
    const selectedAssignee = newListAssigneeId ? people.find(p => p.id === newListAssigneeId) : null;
    
    try {
      const payload = {
        type: 'list',
        name: newListName,
        color: newListColor,
        icon: 'folder',
        creatorId: myAccountId,
        // Добавляем исполнителя по умолчанию если выбран
        ...(selectedAssignee && { defaultAssigneeId: selectedAssignee.id, defaultAssignee: selectedAssignee.name })
      };
      console.log('[addList] Sending POST request with payload:', payload);
      
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log('[addList] Response status:', res.status);
      console.log('[addList] Response ok:', res.ok);
      
      if (res.ok) {
        const newList = await res.json();
        console.log('[addList] Created list:', newList);
        
        // Перезагружаем данные с сервера для правильной фильтрации
        await loadData();
        
        // Переключаемся на новый список на мобильных
        if (windowWidth < 768) {
          // Новый список будет последним в отфильтрованном списке
          const newIndex = nonArchivedLists.length; // Так как новый список ещё не в lists, он будет добавлен после loadData
          setSelectedColumnIndex(newIndex);
        }
        
        setNewListName('');
        setNewListAssigneeId(null);
        setShowAddList(false);
        // Сразу открываем настройки нового списка
        setShowListSettings(newList.id);
        console.log('[addList] === SUCCESS ===');
      } else {
        const errorText = await res.text();
        console.error('[addList] Response not OK:', errorText);
        console.error('[addList] === FAILED (not ok) ===');
      }
    } catch (error) {
      console.error('[addList] Error:', error);
      console.error('[addList] === FAILED (exception) ===');
    }
  }, [myAccountId, people, loadData, windowWidth, nonArchivedLists, setSelectedColumnIndex, setShowAddList, setShowListSettings]);

  // Удаление списка
  const deleteList = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/todos?id=${id}&type=list`, { method: 'DELETE' });
      
      if (res.ok) {
        setLists(prev => prev.filter(l => l.id !== id));
        loadData();
      }
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  }, [setLists, loadData]);

  // Обновление списка (переименование)
  const updateList = useCallback(async (list: TodoList) => {
    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: list.id,
          type: 'list',
          name: list.name,
          color: list.color,
          order: list.order,
          archived: list.archived,
          defaultExecutorId: list.defaultExecutorId,
          defaultCustomerId: list.defaultCustomerId,
          defaultAddToCalendar: list.defaultAddToCalendar,
          allowedDepartments: list.allowedDepartments,
          allowedUsers: list.allowedUsers
        })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setLists(prev => prev.map(l => l.id === list.id ? updated : l));
      }
    } catch (error) {
      console.error('Error updating list:', error);
    }
  }, [setLists]);

  // Архивирование/разархивирование списка
  const toggleArchiveList = useCallback(async (listId: string, archive: boolean) => {
    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: listId,
          type: 'list',
          archived: archive
        })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setLists(prev => prev.map(l => l.id === listId ? updated : l));
      }
    } catch (error) {
      console.error('Error archiving list:', error);
    }
  }, [setLists]);

  // Обновление порядка списков
  const updateListsOrder = useCallback(async (reorderedLists: TodoList[]) => {
    try {
      // Обновляем локально сразу
      setLists(reorderedLists);
      
      // Отправляем обновления на сервер
      await Promise.all(reorderedLists.map((list, index) => 
        fetch('/api/todos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: list.id,
            type: 'list',
            order: index
          })
        })
      ));
    } catch (error) {
      console.error('Error updating lists order:', error);
      loadData(); // Перезагружаем при ошибке
    }
  }, [setLists, loadData]);

  return {
    addList,
    deleteList,
    updateList,
    toggleArchiveList,
    updateListsOrder
  };
}
