import { useCallback } from 'react';
import type { Chat, User } from '@/components/features/messages/types';

interface UseChatHandlersParams {
  currentUser: User | null;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  setSelectedChat: (chat: Chat | null) => void;
  loadChats: () => Promise<void>;
}

export function useChatHandlers({
  currentUser,
  chats,
  setChats,
  setSelectedChat,
  loadChats
}: UseChatHandlersParams) {
  
  const createChat = useCallback(async (participantIds: string[], isGroup: boolean, title?: string) => {
    if (!currentUser) return null;
    
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds: [currentUser.id, ...participantIds],
          isGroup,
          title: isGroup ? title : undefined
        })
      });
      
      if (res.ok) {
        const newChat = await res.json();
        await loadChats();
        return newChat;
      }
      return null;
    } catch (error) {
      console.error('Error creating chat:', error);
      return null;
    }
  }, [currentUser, loadChats]);

  const renameChat = useCallback(async (chatId: string, newName: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newName })
      });
      
      if (res.ok) {
        setChats(prev => prev.map(c => 
          c.id === chatId ? { ...c, title: newName } : c
        ));
      }
    } catch (error) {
      console.error('Error renaming chat:', error);
    }
  }, [setChats]);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setChats(prev => prev.filter(c => c.id !== chatId));
        setSelectedChat(null);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  }, [setChats, setSelectedChat]);

  const togglePinChat = useCallback(async (chatId: string) => {
    if (!currentUser) return;
    
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    const pinnedByUser = chat.pinnedByUser || {};
    const isPinned = pinnedByUser[currentUser.id] || false;
    
    if (chat.isSystemChat) {
      // Для системных чатов используем localStorage
      const storageKey = `chat_pin_${chatId}`;
      if (isPinned) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, 'true');
      }
      
      setChats(prev => prev.map(c => {
        if (c.id !== chatId) return c;
        const currentPinnedByUser = c.pinnedByUser || {};
        return {
          ...c,
          pinnedByUser: {
            ...currentPinnedByUser,
            [currentUser.id]: !isPinned
          }
        };
      }));
    } else {
      // Для обычных чатов используем API
      try {
        const res = await fetch(`/api/chats/${chatId}/pin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id })
        });
        
        if (res.ok) {
          await loadChats();
        }
      } catch (error) {
        console.error('Error toggling pin:', error);
      }
    }
  }, [currentUser, chats, setChats, loadChats]);

  const addParticipant = useCallback(async (chatId: string, userId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      if (res.ok) {
        await loadChats();
      }
    } catch (error) {
      console.error('Error adding participant:', error);
    }
  }, [loadChats]);

  const removeParticipant = useCallback(async (chatId: string, userId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/participants/${userId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        await loadChats();
      }
    } catch (error) {
      console.error('Error removing participant:', error);
    }
  }, [loadChats]);

  return {
    createChat,
    renameChat,
    deleteChat,
    togglePinChat,
    addParticipant,
    removeParticipant
  };
}
