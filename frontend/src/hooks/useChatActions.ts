import { useCallback } from 'react';
import type { Chat, User } from '@/components/features/messages/types';

interface UseChatActionsParams {
  currentUser: User | null;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  setSelectedChat: (chat: Chat | null) => void;
  selectedChat: Chat | null;
}

export function useChatActions({
  currentUser,
  chats,
  setChats,
  setSelectedChat,
  selectedChat
}: UseChatActionsParams) {

  const createChat = useCallback(async (participants: string[], title?: string, isGroup: boolean = false) => {
    if (!currentUser || participants.length === 0) return null;

    const allParticipants = [currentUser.id, ...participants];

    const newChat: Chat = {
      id: `temp-chat-${Date.now()}`,
      participantIds: allParticipants,
      isGroup,
      title: isGroup ? title : undefined,
      createdAt: new Date().toISOString(),
      unreadCount: 0
    };

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newChat,
          id: undefined
        })
      });

      if (response.ok) {
        const savedChat = await response.json();
        setChats(prev => [savedChat, ...prev]);
        return savedChat;
      }
    } catch (error) {
      console.error('[createChat] Error:', error);
    }
    return null;
  }, [currentUser, setChats]);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats?id=${chatId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setChats(prev => prev.filter(c => c.id !== chatId));
        if (selectedChat?.id === chatId) {
          setSelectedChat(null);
        }
      }
    } catch (error) {
      console.error('[deleteChat] Error:', error);
    }
  }, [setChats, selectedChat, setSelectedChat]);

  const togglePinChat = useCallback(async (chatId: string) => {
    if (!currentUser) return;
    
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    const pinnedByUser = chat.pinnedByUser || {};
    const isPinned = pinnedByUser[currentUser.id] || false;
    const newPinned = !isPinned;

    try {
      const response = await fetch('/api/chats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: chatId,
          isPinned: newPinned
        })
      });

      if (response.ok) {
        setChats(prev => prev.map(c =>
          c.id === chatId ? { ...c, isPinned: newPinned } : c
        ));
      }
    } catch (error) {
      console.error('[togglePinChat] Error:', error);
    }
  }, [chats, setChats]);

  const renameChat = useCallback(async (chatId: string, newTitle: string) => {
    try {
      const response = await fetch('/api/chats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: chatId,
          title: newTitle
        })
      });

      if (response.ok) {
        setChats(prev => prev.map(c =>
          c.id === chatId ? { ...c, title: newTitle } : c
        ));
      }
    } catch (error) {
      console.error('[renameChat] Error:', error);
    }
  }, [setChats]);

  const addParticipant = useCallback(async (chatId: string, userId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    const newParticipants = [...chat.participantIds, userId];

    try {
      const response = await fetch('/api/chats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: chatId,
          participants: newParticipants
        })
      });

      if (response.ok) {
        setChats(prev => prev.map(c =>
          c.id === chatId ? { ...c, participants: newParticipants } : c
        ));
      }
    } catch (error) {
      console.error('[addParticipant] Error:', error);
    }
  }, [chats, setChats]);

  const removeParticipant = useCallback(async (chatId: string, userId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat || !currentUser) return;

    const newParticipants = chat.participantIds.filter((id: string) => id !== userId);

    try {
      const response = await fetch('/api/chats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: chatId,
          participants: newParticipants
        })
      });

      if (response.ok) {
        if (userId === currentUser.id) {
          setChats(prev => prev.filter(c => c.id !== chatId));
          if (selectedChat?.id === chatId) {
            setSelectedChat(null);
          }
        } else {
          setChats(prev => prev.map(c =>
            c.id === chatId ? { ...c, participants: newParticipants } : c
          ));
        }
      }
    } catch (error) {
      console.error('[removeParticipant] Error:', error);
    }
  }, [chats, currentUser, setChats, selectedChat, setSelectedChat]);

  return {
    createChat,
    deleteChat,
    togglePinChat,
    renameChat,
    addParticipant,
    removeParticipant
  };
}
