import { useCallback } from 'react';
import { TodoList } from '@/types/todos';

interface UseListDragDropProps {
  lists: TodoList[];
  draggedList: TodoList | null;
  setDraggedList: (list: TodoList | null) => void;
  setDragOverListOrder: (order: number | null) => void;
  updateListsOrder: (lists: TodoList[]) => void;
}

export function useListDragDrop({
  lists,
  draggedList,
  setDraggedList,
  setDragOverListOrder,
  updateListsOrder
}: UseListDragDropProps) {
  
  const handleListDragStart = useCallback((e: React.DragEvent, list: TodoList) => {
    e.stopPropagation();
    setDraggedList(list);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', list.id);
    e.dataTransfer.setData('type', 'list');
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = '0.5';
    }, 0);
  }, [setDraggedList]);

  const handleListDragEnd = useCallback((e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedList(null);
    setDragOverListOrder(null);
  }, [setDraggedList, setDragOverListOrder]);

  const handleListDragOver = useCallback((e: React.DragEvent, targetList: TodoList) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedList && draggedList.id !== targetList.id) {
      setDragOverListOrder(targetList.order);
    }
  }, [draggedList, setDragOverListOrder]);

  const handleListDrop = useCallback((e: React.DragEvent, targetList: TodoList) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedList && draggedList.id !== targetList.id) {
      const currentNonArchivedLists = lists.filter(l => !l.archived).sort((a, b) => a.order - b.order);
      const draggedIndex = currentNonArchivedLists.findIndex(l => l.id === draggedList.id);
      const targetIndex = currentNonArchivedLists.findIndex(l => l.id === targetList.id);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const reordered = [...currentNonArchivedLists];
        const [removed] = reordered.splice(draggedIndex, 1);
        reordered.splice(targetIndex, 0, removed);
        
        // Обновляем order для каждого списка
        const updated = reordered.map((list, index) => ({ ...list, order: index }));
        updateListsOrder(updated);
      }
    }
    
    setDraggedList(null);
    setDragOverListOrder(null);
  }, [draggedList, lists, updateListsOrder, setDraggedList, setDragOverListOrder]);

  return {
    handleListDragStart,
    handleListDragEnd,
    handleListDragOver,
    handleListDrop
  };
}
