import { useCallback } from 'react';
import type { User, Message, Chat } from '@/components/features/messages/types';

interface UseMessageActionsParams {
  currentUser: User | null;
  selectedChat: Chat | null;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  setEditingMessageId: (id: string | null) => void;
  setEditingMessageText: (text: string) => void;
  setSavedMessageText: (text: string) => void;
  setNewMessage: (text: string) => void;
  setReplyToMessage: (msg: Message | null) => void;
  setAttachments: (att: any[]) => void;
  messageInputRef: React.RefObject<HTMLTextAreaElement>;
}

export function useMessageActions({
  currentUser,
  selectedChat,
  setMessages,
  setChats,
  setEditingMessageId,
  setEditingMessageText,
  setSavedMessageText,
  setNewMessage,
  setReplyToMessage,
  setAttachments,
  messageInputRef
}: UseMessageActionsParams) {

  const sendMessage = useCallback(async (content: string, attachments: any[], replyTo?: Message | null) => {
    if (!selectedChat || !currentUser || !content.trim() && attachments.length === 0) return;

    const newMsg: Message = {
      id: `temp-${Date.now()}`,
      chatId: selectedChat.id,
      authorId: currentUser.id,
      authorName: currentUser.name || currentUser.username || 'User',
      content: content.trim(),
      mentions: [],
      replyToId: replyTo?.id,
      createdAt: new Date().toISOString(),
      isEdited: false,
      attachments: attachments.length > 0 ? attachments : undefined
    };

    setMessages(prev => [...prev, newMsg]);
    setNewMessage('');
    setReplyToMessage(null);
    setAttachments([]);
    
    if (messageInputRef.current) {
      messageInputRef.current.value = '';
      messageInputRef.current.style.height = 'auto';
    }

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMsg,
          id: undefined
        })
      });

      if (response.ok) {
        const savedMessage = await response.json();
        setMessages(prev => prev.map(m => m.id === newMsg.id ? savedMessage : m));
        
        // Обновляем lastMessage в чате
        setChats(prev => prev.map(chat => 
          chat.id === selectedChat.id 
            ? { ...chat, lastMessage: savedMessage } 
            : chat
        ));
      }
    } catch (error) {
      console.error('[sendMessage] Error:', error);
    }
  }, [selectedChat, currentUser, setMessages, setNewMessage, setReplyToMessage, setAttachments, messageInputRef, setChats]);

  const updateMessage = useCallback(async (messageId: string, content: string) => {
    if (!selectedChat || !content.trim()) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: messageId,
          content: content.trim(),
          editedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        const updatedMessage = await response.json();
        setMessages(prev => prev.map(m => m.id === messageId ? updatedMessage : m));
        setEditingMessageId(null);
        setEditingMessageText('');
        
        // Восстанавливаем сохранённый текст инпута
        const savedText = messageInputRef.current?.dataset.savedText || '';
        setNewMessage(savedText);
        if (messageInputRef.current) {
          messageInputRef.current.value = savedText;
          delete messageInputRef.current.dataset.savedText;
        }
        setSavedMessageText('');
      }
    } catch (error) {
      console.error('[updateMessage] Error:', error);
    }
  }, [selectedChat, setMessages, setEditingMessageId, setEditingMessageText, setNewMessage, messageInputRef, setSavedMessageText]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!selectedChat) return;

    try {
      const response = await fetch(`/api/messages?id=${messageId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch (error) {
      console.error('[deleteMessage] Error:', error);
    }
  }, [selectedChat, setMessages]);

  const togglePinMessage = useCallback(async (messageId: string) => {
    if (!selectedChat || !currentUser) return;

    // Note: pinnedMessages functionality needs backend support
    const pinnedByUser = selectedChat.pinnedByUser || {};
    const isPinned = pinnedByUser[currentUser.id];
    
    // This would need API endpoint for pinning messages
    console.warn('Pin message functionality needs backend implementation');
    return;

    /*
    try {
      const response = await fetch('/api/chats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedChat.id,
          pinnedMessages: []
        })
      });

      if (response.ok) {
        setChats(prev => prev.map(chat =>
          chat.id === selectedChat.id
            ? { ...chat, pinnedMessages: [] }
            : chat
        ));
      }
    } catch (error) {
      console.error('[togglePinMessage] Error:', error);
    }
    */
  }, [selectedChat, setChats]);

  return {
    sendMessage,
    updateMessage,
    deleteMessage,
    togglePinMessage
  };
}
