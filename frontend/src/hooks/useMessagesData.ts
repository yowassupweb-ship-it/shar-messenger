import { useState, useCallback } from 'react';
import type { User, Message, Chat, Task } from '@/components/features/messages/types';

export function useMessagesData() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const loadCurrentUser = useCallback(async () => {
    try {
      const username = localStorage.getItem('username');
      const userRole = localStorage.getItem('userRole');
      
      if (!username) {
        console.log('[loadCurrentUser] No username found');
        return null;
      }

      const response = await fetch('/api/todos/people');
      if (!response.ok) throw new Error('Failed to fetch people');
      
      const peopleData = await response.json();
      const people = peopleData.people || [];
      
      let user = people.find((p: any) => p.username === username);
      
      if (!user) {
        const newUser: User = {
          id: `user-${Date.now()}`,
          username: username,
          name: username,
          lastSeen: new Date().toISOString(),
          isOnline: true,
          role: userRole === 'admin' ? 'admin' : 'user'
        };
        
        const createResponse = await fetch('/api/todos/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        });
        
        if (createResponse.ok) {
          user = newUser;
        }
      }
      
      setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('[loadCurrentUser] Error:', error);
      return null;
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/todos/people');
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data.people || []);
    } catch (error) {
      console.error('[loadUsers] Error:', error);
    }
  }, []);

  const loadChats = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setIsLoadingChats(true);
      const response = await fetch(`/api/chats?userId=${currentUser.id}`);
      if (!response.ok) throw new Error('Failed to fetch chats');
      
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('[loadChats] Error:', error);
    } finally {
      setIsLoadingChats(false);
    }
  }, [currentUser]);

  const loadMessages = useCallback(async (chatId: string, isPolling: boolean = false) => {
    if (!isPolling) setIsLoadingMessages(true);
    
    try {
      const response = await fetch(`/api/messages?chatId=${chatId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      
      const data = await response.json();
      setMessages(data.messages || []);
      
      // Отметить сообщения как прочитанные
      if (currentUser) {
        await fetch('/api/messages/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, userId: currentUser.id })
        });
      }
    } catch (error) {
      console.error('[loadMessages] Error:', error);
    } finally {
      if (!isPolling) setIsLoadingMessages(false);
    }
  }, [currentUser]);

  const loadTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/todos');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      
      const data = await response.json();
      setTasks(data.todos || []);
    } catch (error) {
      console.error('[loadTasks] Error:', error);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar-events');
      if (!response.ok) throw new Error('Failed to fetch events');
      
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('[loadEvents] Error:', error);
    }
  }, []);

  return {
    currentUser,
    setCurrentUser,
    users,
    setUsers,
    chats,
    setChats,
    selectedChat,
    setSelectedChat,
    messages,
    setMessages,
    tasks,
    setTasks,
    events,
    setEvents,
    isLoadingChats,
    isLoadingMessages,
    loadCurrentUser,
    loadUsers,
    loadChats,
    loadMessages,
    loadTasks,
    loadEvents
  };
}
