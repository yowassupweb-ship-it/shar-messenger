import { useCallback } from 'react';

interface Person {
  id: string;
  name: string;
  telegramId?: string;
  telegramUsername?: string;
  role: 'executor' | 'customer' | 'universal';
  todoPersonId?: string;
  canSeeAllTasks?: boolean;
}

interface UsePeopleActionsProps {
  people: Person[];
  setPeople: React.Dispatch<React.SetStateAction<Person[]>>;
  setEditingPerson: (person: Person | null) => void;
}

export function usePeopleActions({
  people,
  setPeople,
  setEditingPerson
}: UsePeopleActionsProps) {
  
  // Добавление человека (исполнитель/заказчик)
  const addPerson = useCallback(async (
    newPersonName: string,
    newPersonTelegramId: string,
    newPersonTelegramUsername: string,
    newPersonRole: 'executor' | 'customer' | 'universal',
    setNewPersonName: (name: string) => void,
    setNewPersonTelegramId: (id: string) => void,
    setNewPersonTelegramUsername: (username: string) => void
  ) => {
    if (!newPersonName.trim()) return;
    
    try {
      const res = await fetch('/api/todos/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPersonName,
          telegramId: newPersonTelegramId || undefined,
          telegramUsername: newPersonTelegramUsername || undefined,
          role: newPersonRole
        })
      });
      
      if (res.ok) {
        const newPerson = await res.json();
        setPeople(prev => [...prev, newPerson]);
        setNewPersonName('');
        setNewPersonTelegramId('');
        setNewPersonTelegramUsername('');
      }
    } catch (error) {
      console.error('Error adding person:', error);
    }
  }, [setPeople]);

  // Обновление человека
  const updatePerson = useCallback(async (person: Person) => {
    try {
      const res = await fetch('/api/todos/people', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(person)
      });
      
      if (res.ok) {
        const updated = await res.json();
        setPeople(prev => prev.map(p => p.id === person.id ? updated : p));
        setEditingPerson(null);
      }
    } catch (error) {
      console.error('Error updating person:', error);
    }
  }, [setPeople, setEditingPerson]);

  // Удаление человека
  const deletePerson = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/todos/people?id=${id}`, { method: 'DELETE' });
      
      if (res.ok) {
        setPeople(prev => prev.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Error deleting person:', error);
    }
  }, [setPeople]);

  return {
    addPerson,
    updatePerson,
    deletePerson
  };
}
