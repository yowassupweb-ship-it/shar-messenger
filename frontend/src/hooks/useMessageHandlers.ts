import { useCallback } from 'react';
import type { Message, Chat, User } from '@/components/features/messages/types';

interface UseMessageHandlersParams {
  currentUser: User | null;
  selectedChat: Chat | null;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  setEditingMessageId: (id: string | null) => void;
  setEditingMessageText: (text: string) => void;
  setSavedMessageText: (text: string) => void;
  setReplyToMessage: (msg: Message | null) => void;
  messagesListRef: React.RefObject<HTMLDivElement>;
  messageInputRef: React.RefObject<HTMLTextAreaElement>;
  loadMessages: (chatId: string, isPolling?: boolean) => Promise<void>;
}

export function useMessageHandlers({
  currentUser,
  selectedChat,
  messages,
  setMessages,
  setChats,
  setEditingMessageId,
  setEditingMessageText,
  setSavedMessageText,
  setReplyToMessage,
  messagesListRef,
  messageInputRef,
  loadMessages
}: UseMessageHandlersParams) {
  
  const sendMessage = useCallback(async (text: string, attachments: any[] = [], replyTo: Message | null = null) => {
    if (!selectedChat || !currentUser || (!text.trim() && attachments.length === 0)) return;
    
    try {
      const res = await fetch('/api/chats/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: selectedChat.id,
          senderId: currentUser.id,
          text: text.trim(),
          attachments,
          replyToId: replyTo?.id
        })
      });
      
      if (res.ok) {
        await loadMessages(selectedChat.id, true);
        setReplyToMessage(null);
        
        if (messageInputRef.current) {
          messageInputRef.current.style.height = '44px';
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [selectedChat, currentUser, loadMessages, setReplyToMessage, messageInputRef]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!selectedChat) return;
    
    try {
      const res = await fetch(`/api/chats/messages/${messageId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        
        const chatRes = await fetch(`/api/chats?user_id=${currentUser?.id}`);
        if (chatRes.ok) {
          const allChats = await chatRes.json();
          setChats(allChats);
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }, [selectedChat, currentUser, setMessages, setChats]);

  const updateMessage = useCallback(async (messageId: string, newText: string) => {
    if (!selectedChat || !newText.trim()) return;
    
    try {
      const res = await fetch(`/api/chats/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText.trim() })
      });
      
      if (res.ok) {
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, text: newText.trim(), isEdited: true } : m
        ));
        setEditingMessageId(null);
        setEditingMessageText('');
        if (messageInputRef.current) {
          messageInputRef.current.value = '';
          messageInputRef.current.style.height = '44px';
        }
        await loadMessages(selectedChat.id, true);
      }
    } catch (error) {
      console.error('Error updating message:', error);
    }
  }, [selectedChat, setMessages, setEditingMessageId, setEditingMessageText, messageInputRef, loadMessages]);

  const pinMessage = useCallback(async (messageId: string) => {
    if (!selectedChat) return;
    
    try {
      const res = await fetch(`/api/chats/messages/${messageId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: selectedChat.id })
      });
      
      if (res.ok) {
        await loadMessages(selectedChat.id, true);
      }
    } catch (error) {
      console.error('Error pinning message:', error);
    }
  }, [selectedChat, loadMessages]);

  const unpinMessage = useCallback(async (messageId: string) => {
    if (!selectedChat) return;
    
    try {
      const res = await fetch(`/api/chats/messages/${messageId}/unpin`, {
        method: 'POST'
      });
      
      if (res.ok) {
        await loadMessages(selectedChat.id, true);
      }
    } catch (error) {
      console.error('Error unpinning message:', error);
    }
  }, [selectedChat, loadMessages]);

  const startEditMessage = useCallback((message: Message) => {
    setEditingMessageId(message.id);
    setEditingMessageText(message.content);
    setSavedMessageText(messageInputRef.current?.value || '');
    
    if (messageInputRef.current) {
      messageInputRef.current.value = message.content;
      messageInputRef.current.focus();
      messageInputRef.current.style.height = 'auto';
      const newHeight = Math.min(messageInputRef.current.scrollHeight, 120);
      messageInputRef.current.style.height = newHeight + 'px';
    }
  }, [setEditingMessageId, setEditingMessageText, setSavedMessageText, messageInputRef]);

  const cancelEditMessage = useCallback(() => {
    setEditingMessageId(null);
    setEditingMessageText('');
    
    if (messageInputRef.current) {
      messageInputRef.current.value = '';
      messageInputRef.current.style.height = '44px';
    }
  }, [setEditingMessageId, setEditingMessageText, messageInputRef]);

  return {
    sendMessage,
    deleteMessage,
    updateMessage,
    pinMessage,
    unpinMessage,
    startEditMessage,
    cancelEditMessage
  };
}
