import { useCallback } from 'react';
import { TodoCategory } from '@/types/todos';

interface UseCategoryActionsProps {
  categories: TodoCategory[];
  setCategories: React.Dispatch<React.SetStateAction<TodoCategory[]>>;
  loadData: () => Promise<void>;
  setEditingCategory: (category: TodoCategory | null) => void;
  setShowAddCategory: (show: boolean) => void;
}

export function useCategoryActions({
  categories,
  setCategories,
  loadData,
  setEditingCategory,
  setShowAddCategory
}: UseCategoryActionsProps) {
  
  // Добавление категории
  const addCategory = useCallback(async (
    newCategoryName: string,
    newCategoryColor: string,
    newCategoryIcon: string,
    setNewCategoryName: (name: string) => void,
    setNewCategoryColor: (color: string) => void,
    setNewCategoryIcon: (icon: string) => void
  ) => {
    if (!newCategoryName.trim()) return;
    
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'category',
          name: newCategoryName,
          color: newCategoryColor,
          icon: newCategoryIcon
        })
      });
      
      if (res.ok) {
        const newCat = await res.json();
        setCategories(prev => [...prev, newCat]);
        setNewCategoryName('');
        setNewCategoryColor('#6366f1');
        setNewCategoryIcon('tag');
        setShowAddCategory(false);
      }
    } catch (error) {
      console.error('Error adding category:', error);
    }
  }, [setCategories, setShowAddCategory]);

  // Обновление категории
  const updateCategory = useCallback(async (category: TodoCategory) => {
    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: category.id,
          type: 'category',
          name: category.name,
          color: category.color,
          icon: category.icon
        })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setCategories(prev => prev.map(c => c.id === category.id ? updated : c));
        setEditingCategory(null);
      }
    } catch (error) {
      console.error('Error updating category:', error);
    }
  }, [setCategories, setEditingCategory]);

  // Удаление категории
  const deleteCategory = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/todos?id=${id}&type=category`, { method: 'DELETE' });
      
      if (res.ok) {
        setCategories(prev => prev.filter(c => c.id !== id));
        loadData();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  }, [setCategories, loadData]);

  return {
    addCategory,
    updateCategory,
    deleteCategory
  };
}
