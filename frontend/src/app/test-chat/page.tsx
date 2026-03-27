'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from '@/contexts/ThemeContext';
import { ChatTimelineV2 } from '@/components/features/messages/ChatTimelineV2';
import ChatSidebar from './ChatSidebar';
import ChatHeader from './ChatHeader';
import ChatInput, { ReplyMessage, AttachmentFile } from './ChatInput';
import ChatProfile from './ChatProfile';
import ChatActionsMenu from './ChatActionsMenu';
import ForwardMessageModal from './ForwardMessageModal';
import SelectionActionsBar from './SelectionActionsBar';
import EmptyState from './EmptyState';
import CallOverlay from './CallOverlay';
import GroupCallView from './GroupCallView';
import MessageContextMenu from '@/components/features/messages/MessageContextMenu';
import NewChatModal from '@/components/features/messages/NewChatModal';
import { X, Archive, Trash2, Pin } from 'lucide-react';
import { CallService, type CallState, type CallType, type IncomingCall } from './CallService';
import { GroupCallService, type GroupCallState } from './GroupCallService';
import type { GroupParticipantUI } from './GroupCallView';
import type { CallDebugDump } from './CallService';
import type { Message, User, Chat } from '@/components/features/messages/types';
import './globals.css';

const EventCalendarSelector = dynamic(() => import('@/components/features/messages/EventCalendarSelector'));
const TaskListSelector = dynamic(() => import('@/components/features/messages/TaskListSelector'));

export default function TestChat() {
  const { theme } = useTheme();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messageCache, setMessageCache] = useState<Record<string, Message[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyMessage | null>(null);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [isDraggingOnChat, setIsDraggingOnChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchivedChats, setShowArchivedChats] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [newChatSearchQuery, setNewChatSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [chatContextMenu, setChatContextMenu] = useState<{ chatId: string; top: number; left: number } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showMessageContextMenu, setShowMessageContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ top: 0, left: 0 });
  const [contextMenuMessage, setContextMenuMessage] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showTaskListSelector, setShowTaskListSelector] = useState(false);
  const [showEventCalendarSelector, setShowEventCalendarSelector] = useState(false);
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<Message | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [chatSettings, setChatSettings] = useState({
    bubbleStyle: 'modern' as 'modern' | 'classic' | 'minimal',
    fontSize: 13,
    fontSizeMobile: 15,
    bubbleColor: '#545190',
    bubbleColorLight: '#252546',
    bubbleColorOpponent: '#38414d',
    bubbleColorOpponentLight: '#e5e7eb',
    bubbleTextColor: '#ffffff',
    bubbleTextColorLight: '#ffffff',
    chatBackgroundDark: '#0f172a',
    chatBackgroundLight: '#f8fafc',
    chatBackgroundImageDark: '',
    chatBackgroundImageLight: '',
    chatOverlayImageDark: '',
    chatOverlayImageLight: '',
    chatOverlayScale: 100,
    chatOverlayOpacity: 1,
    bubbleOpacity: 0.92,
    colorPreset: 0
  });

  // ── Call state ──────────────────────────────────────────────
  const [callState, setCallState] = useState<CallState>('idle');
  const [callType, setCallType] = useState<CallType>('voice');
  const [callTargetUser, setCallTargetUser] = useState<User | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const callServiceRef = useRef<CallService | null>(null);

  // ── Group call state ─────────────────────────────────────────
  const [groupCallState, setGroupCallState] = useState<GroupCallState | null>(null);
  const [groupParticipants, setGroupParticipants] = useState<GroupParticipantUI[]>([]);
  const [groupLocalStream, setGroupLocalStream] = useState<MediaStream | null>(null);
  const groupCallServiceRef = useRef<GroupCallService | null>(null);

  const [isBelow768, setIsBelow768] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null!);

  // Определение мобильного устройства
  useEffect(() => {
    const handleResize = () => setIsBelow768(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Загрузка chatSettings из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('chatSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        setChatSettings(settings);
      }
    } catch (err) {
      console.error('[TEST-CHAT] Failed to load chatSettings:', err);
    }
  }, []);

  // ── Initialise CallService once currentUser is known ────────
  useEffect(() => {
    if (!currentUser) return;

    console.log('[TEST-CHAT] Initializing CallService for user:', currentUser.id, currentUser.username);

    const svc = new CallService(String(currentUser.id), {
      onStateChange: (newState) => {
        console.log('[TEST-CHAT] CallService state changed:', newState);
        setCallState(newState);
      },
      onLocalStream: setLocalStream,
      onRemoteStream: (stream) => {
        console.log('[TEST-CHAT] Remote stream received in page.tsx:', {
          id: stream.id,
          audioTracks: stream.getAudioTracks().length,
          videoTracks: stream.getVideoTracks().length,
          active: stream.active,
        });
        stream.getAudioTracks().forEach((track, idx) => {
          console.log(`  Audio track ${idx}:`, {
            kind: track.kind,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            label: track.label,
          });
        });
        setRemoteStream(stream);
      },
      onIncomingCall: (call) => {
        console.log('[TEST-CHAT] Incoming call from:', call.fromUserId, call.fromUserName);
        setIncomingCall(call);
        setCallType(call.callType);
        // Resolve caller name from user list
        const caller = users.find(u => String(u.id) === call.fromUserId);
        setCallTargetUser(caller ?? null);
      },
      onCallEnded: () => {
        console.log('[TEST-CHAT] Call ended');
        setIncomingCall(null);
        setRemoteStream(null);
        setLocalStream(null);
      },
      onError: (err) => console.error('[CallService]', err),
    });

    svc.startPolling();
    callServiceRef.current = svc;

    return () => {
      svc.destroy();
      callServiceRef.current = null;
    };
  // Re-init only if user identity changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // ── Call action handlers ─────────────────────────────────────
  const startVoiceCall = useCallback(() => {
    if (!currentUser || !callServiceRef.current) {
      console.warn('[TEST-CHAT] Cannot start call - no currentUser or callService');
      return;
    }
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) {
      console.warn('[TEST-CHAT] Cannot start call - chat not found:', currentChatId);
      return;
    }
    // Find the remote user (first participant that is not me)
    const remoteId = chat.participantIds?.find(id => String(id) !== String(currentUser.id));
    if (!remoteId) {
      console.warn('[TEST-CHAT] Cannot start call - no remote participant found');
      return;
    }
    const remote = users.find(u => String(u.id) === String(remoteId)) ?? null;
    console.log('[TEST-CHAT] Starting voice call to:', remoteId, remote?.name || remote?.username);
    setCallTargetUser(remote);
    setCallType('voice');
    callServiceRef.current.startCall(String(remoteId), String(currentChatId), 'voice', currentUser.name ?? currentUser.username);
  }, [currentUser, chats, currentChatId, users]);

  const startVideoCall = useCallback(() => {
    if (!currentUser || !callServiceRef.current) return;
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    const remoteId = chat.participantIds?.find(id => String(id) !== String(currentUser.id));
    if (!remoteId) return;
    const remote = users.find(u => String(u.id) === String(remoteId)) ?? null;
    setCallTargetUser(remote);
    setCallType('video');
    callServiceRef.current.startCall(String(remoteId), String(currentChatId), 'video', currentUser.name ?? currentUser.username);
  }, [currentUser, chats, currentChatId, users]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall || !callServiceRef.current) return;
    try {
      console.log('[TEST-CHAT] Accept call click:', incomingCall.callId);
      await callServiceRef.current.acceptCall(incomingCall);
    } catch (err) {
      console.error('[TEST-CHAT] Accept call failed:', err);
    }
  }, [incomingCall]);

  const rejectCall = useCallback(() => {
    if (!incomingCall || !callServiceRef.current) return;
    callServiceRef.current.rejectCall(incomingCall).then(() => setIncomingCall(null));
  }, [incomingCall]);

  const hangup = useCallback(() => {
    callServiceRef.current?.hangup();
    setIncomingCall(null);
    setRemoteStream(null);
    setLocalStream(null);
  }, []);

  const toggleMute = useCallback(() => callServiceRef.current?.toggleMute() ?? false, []);
  const toggleCamera = useCallback(() => callServiceRef.current?.toggleCamera() ?? false, []);
  const requestCallDump = useCallback((): Promise<CallDebugDump> => {
    if (callServiceRef.current) {
      return callServiceRef.current.getDebugDump();
    }
    return Promise.resolve({
      state: 'idle',
      localTracks: [],
      remoteTracks: [],
      connectionState: null,
    });
  }, []);
  const listCallAudioInputs = useCallback(() => callServiceRef.current?.listAudioInputDevices() ?? Promise.resolve([]), []);
  const switchCallAudioInput = useCallback((deviceId: string) => callServiceRef.current?.switchAudioInput(deviceId) ?? Promise.resolve(), []);
  const listCallAudioOutputs = useCallback(() => callServiceRef.current?.listAudioOutputDevices() ?? Promise.resolve([]), []);

  // ── Electron call window integration ────────────────────────
  // Listen for actions from call.html (answer/reject/hangup/mute/video)
  useEffect(() => {
    const w = window as any;
    if (!w.sharDesktop?.call?.onAction) return;
    const unsubscribe = w.sharDesktop.call.onAction((action: { type: string; value?: any }) => {
      switch (action.type) {
        case 'answer':  acceptCall();   break;
        case 'reject':  rejectCall();   break;
        case 'cancel':
        case 'hangup':  hangup();       break;
        case 'mute':    toggleMute();   break;
        case 'video':   toggleCamera(); break;
      }
    });
    return () => { try { (unsubscribe as () => void)(); } catch { /* ignore */ } };
  }, [acceptCall, rejectCall, hangup, toggleMute, toggleCamera]);

  // Sync callState → Electron call.html window
  useEffect(() => {
    const w = window as any;
    if (!w.sharDesktop?.call) return;

    const getInitialsFor = (name: string) => {
      const words = name.trim().split(/\s+/);
      return (words.length === 1 ? words[0][0] : words[0][0] + words[1][0]).toUpperCase();
    };

    if (callState === 'calling') {
      const name = callTargetUser?.name || callTargetUser?.username || 'Неизвестный';
      w.sharDesktop.call.open({
        direction: 'outgoing',
        callerName: name,
        callerInitials: getInitialsFor(name),
        callType: callType === 'video' ? 'video' : 'audio',
      });
    } else if (callState === 'ringing' && incomingCall) {
      const name = incomingCall.fromUserName || callTargetUser?.name || callTargetUser?.username || 'Неизвестный';
      w.sharDesktop.call.open({
        direction: 'incoming',
        callerName: name,
        callerInitials: getInitialsFor(name),
        callType: incomingCall.callType === 'video' ? 'video' : 'audio',
      });
    } else if (callState === 'connected') {
      w.sharDesktop.call.updateState?.('connected');
    } else if (callState === 'idle') {
      w.sharDesktop.call.updateState?.('idle');
    }
  }, [callState, incomingCall, callTargetUser, callType]);

  // ── Group call action handlers ───────────────────────────────
  const initGroupCallService = useCallback(() => {
    if (groupCallServiceRef.current || !currentUser) return;

    const AVATAR_COLORS = [
      'from-blue-400 to-blue-600',
      'from-green-400 to-green-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-orange-400 to-orange-600',
    ];
    const avatarFor = (uid: string) =>
      AVATAR_COLORS[uid.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
    const initialsFor = (name: string) => {
      const w = name.trim().split(/\s+/);
      return w.length === 1 ? w[0][0].toUpperCase() : (w[0][0] + w[1][0]).toUpperCase();
    };

    const svc = new GroupCallService(String(currentUser.id), currentUser.name ?? currentUser.username ?? 'Я', {
      onStateChange: setGroupCallState,
      onLocalStream: setGroupLocalStream,
      onParticipantStream: (uid, stream) => {
        setGroupParticipants(prev => {
          const existing = prev.find(p => p.userId === uid);
          if (existing) {
            return prev.map(p => p.userId === uid ? { ...p, stream } : p);
          }
          const u = users.find(u => String(u.id) === uid);
          const name = u?.name ?? u?.username ?? uid;
          return [...prev, {
            userId: uid,
            userName: name,
            initials: initialsFor(name),
            avatarColor: avatarFor(uid),
            stream,
            isMuted: false,
            isSpeaking: false,
          }];
        });
      },
      onParticipantLeft: (uid) => setGroupParticipants(prev => prev.filter(p => p.userId !== uid)),
      onError: (err) => console.error('[GroupCallService]', err),
    });

    groupCallServiceRef.current = svc;
    return svc;
  }, [currentUser, users]);

  const startGroupCall = useCallback(async () => {
    if (!currentUser || !currentChatId) return;
    const svc = initGroupCallService() ?? groupCallServiceRef.current;
    if (!svc) return;
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    const others = (chat.participantIds ?? []).map(String).filter(id => id !== String(currentUser.id));

    // Add self to participant list immediately
    const AVATAR_COLORS = ['from-blue-400 to-blue-600', 'from-green-400 to-green-600', 'from-purple-400 to-purple-600', 'from-pink-400 to-pink-600', 'from-orange-400 to-orange-600'];
    const uid = String(currentUser.id);
    const selfInitials = (() => {
      const n = currentUser.name ?? currentUser.username ?? 'Я';
      const w = n.trim().split(/\s+/);
      return w.length === 1 ? w[0][0].toUpperCase() : (w[0][0] + w[1][0]).toUpperCase();
    })();
    setGroupParticipants([{
      userId: uid,
      userName: currentUser.name ?? currentUser.username ?? 'Я',
      initials: selfInitials,
      avatarColor: AVATAR_COLORS[uid.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length],
      stream: null,
      isMuted: false,
      isSpeaking: false,
    }]);

    await svc.startGroupCall(currentChatId, others);
  }, [currentUser, currentChatId, chats, initGroupCallService]);

  const leaveGroupCall = useCallback(async () => {
    await groupCallServiceRef.current?.leaveGroupCall();
    groupCallServiceRef.current = null;
    setGroupParticipants([]);
    setGroupLocalStream(null);
  }, []);

  const toggleGroupMute = useCallback(() => groupCallServiceRef.current?.toggleMute() ?? false, []);

  // Загрузка пользователей
  useEffect(() => {
    const username = localStorage.getItem('username') || 'admin';

    fetch('/api/users')
      .then(res => res.json())
      .then((data: User[]) => {
        setUsers(data);
        const user = data.find(u => u.username === username);
        if (user) {
          console.log('[TEST-CHAT] Current user found:', user.id, user.username);
          setCurrentUser(user);
        } else {
          console.warn('[TEST-CHAT] Current user not found in users list');
        }
      })
      .catch(err => {
        console.error('[TEST-CHAT] Failed to load users:', err);
      });
  }, []);

  const loadChats = useCallback(async () => {
    if (!currentUser) {
      return;
    }

    try {
      const res = await fetch(`/api/chats?user_id=${currentUser.id}&include_archived=true`);
      const data: Chat[] = await res.json();

      // Разделяем специальные чаты и обычные
      const favoritesChat = data.find(c => c.isFavoritesChat || String(c.id).startsWith('favorites_'));
      const notificationsChat = data.find(c => c.isNotificationsChat || String(c.id).startsWith('notifications-') || String(c.id).startsWith('notifications_'));
      const regularChats = data.filter(c => !c.isFavoritesChat && !c.isNotificationsChat && !String(c.id).startsWith('favorites_') && !String(c.id).startsWith('notifications-') && !String(c.id).startsWith('notifications_'));

      const chatsWithNames = regularChats.map(chat => {
        let title: string;

        if (chat.title && chat.title.trim()) {
          title = chat.title;
        } else if (chat.participantIds && chat.participantIds.length > 0) {
          const participants = chat.participantIds
            .filter(id => id !== currentUser.id)
            .map(id => {
              const user = users.find(u => u.id === id);
              return user?.name || user?.username || user?.email || id;
            });
          title = participants.length > 0 ? participants.join(', ') : 'Личные заметки';
        } else {
          title = 'Неизвестный чат';
        }

        return {
          ...chat,
          title,
          displayTitle: title,
        };
      });

      // Загружаем последние сообщения для обычных чатов + для специальных
      const enrichChat = async (chat: Chat & Record<string, unknown>) => {
        try {
          const msgRes = await fetch(`/api/chats/${chat.id}/messages`);
          if (!msgRes.ok) return chat;
          const chatMessages: Message[] = await msgRes.json();
          if (!chatMessages.length) return chat;
          const lastMsg = chatMessages[chatMessages.length - 1];
          const isMyMessage = lastMsg.authorId === currentUser.id;
          const lastReadRaw = chat.readMessagesByUser?.[String(currentUser.id)];
          const lastReadAt = lastReadRaw ? new Date(lastReadRaw).getTime() : 0;
          const isFav = chat.isFavoritesChat || String(chat.id).startsWith('favorites_');
          const incomingUnreadCount = isFav ? 0 : chatMessages.filter(m => String(m.authorId) !== String(currentUser.id) && new Date(m.createdAt).getTime() > lastReadAt).length;
          return {
            ...chat,
            lastMessageContent: `${isMyMessage ? 'Вы: ' : ''}${lastMsg.content || ''}`,
            lastMessageTimestamp: lastMsg.createdAt,
            incomingUnreadCount,
          };
        } catch {
          return chat;
        }
      };

      const chatsWithLastMessages = await Promise.all(chatsWithNames.map(enrichChat));

      // Обогащаем специальные чаты
      const specialChats: (Chat & Record<string, unknown>)[] = [];
      if (notificationsChat) {
        const enriched = await enrichChat({ ...notificationsChat, displayTitle: 'Уведомления', title: 'Уведомления' } as Chat & Record<string, unknown>);
        specialChats.push(enriched as Chat & Record<string, unknown>);
      }
      if (favoritesChat) {
        const enriched = await enrichChat({ ...favoritesChat, displayTitle: 'Избранное', title: 'Избранное' } as Chat & Record<string, unknown>);
        specialChats.push(enriched as Chat & Record<string, unknown>);
      }

      setChats([...specialChats, ...chatsWithLastMessages] as Chat[]);
    } catch (err) {
      console.error('[TEST-CHAT] Failed to load chats:', err);
    }
  }, [currentUser, users]);

  // Загрузка списка чатов
  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  // Переключение чата
  const updateChatUrl = (chatId: string | null) => {
    try {
      const url = new URL(window.location.href);
      if (chatId) {
        url.searchParams.set('chat', chatId);
        // Ensure tab=messages is set if we're in account page
        if (url.pathname === '/account') {
          url.searchParams.set('tab', 'messages');
        }
      } else {
        url.searchParams.delete('chat');
      }
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Not in a browser context (e.g. SSR), skip
    }
  };

  const selectChat = (chatId: string | null) => {
    if (!chatId) {
      setCurrentChatId(null);
      setMessages([]);
      updateChatUrl(null);
      // Уведомляем родительский layout что чат закрыт (скрывать нижнее меню не нужно)
      window.dispatchEvent(new CustomEvent('chat-selection-changed', { detail: { isOpen: false } }));
      return;
    }
    updateChatUrl(chatId);
    // Уведомляем родительский layout что чат открыт (нижнее меню нужно скрыть)
    window.dispatchEvent(new CustomEvent('chat-selection-changed', { detail: { isOpen: true } }));
    console.log('=== SWITCHING TO CHAT:', chatId);
    
    // Сохраняем черновик текущего чата перед переключением
    if (currentChatId && messageText.trim()) {
      localStorage.setItem(`draft_${currentChatId}`, messageText);
    } else if (currentChatId) {
      localStorage.removeItem(`draft_${currentChatId}`);
    }
    
    // Загружаем черновик нового чата
    const draft = localStorage.getItem(`draft_${chatId}`) || '';
    setMessageText(draft);
    setEditingMessageId(null);
    
    if (messageCache[chatId]) {
      console.log('Using cached messages');
      setMessages(messageCache[chatId]);
      setCurrentChatId(chatId);
      setIsLoading(false);
      loadMessagesFromServer(chatId, true);
    } else {
      console.log('No cache - loading from server');
      setIsLoading(true);
      setCurrentChatId(chatId);
      loadMessagesFromServer(chatId, false);
    }
  };

  // Восстановление чата из URL при обновлении страницы (#11) и после переключения вкладок (#10)
  const hasRestoredFromUrl = useRef(false);
  useEffect(() => {
    if (hasRestoredFromUrl.current || chats.length === 0 || currentChatId) return;
    hasRestoredFromUrl.current = true;
    try {
      const params = new URLSearchParams(window.location.search);
      const chatFromUrl = params.get('chat');
      if (chatFromUrl && chats.some(c => String(c.id) === chatFromUrl)) {
        selectChat(chatFromUrl);
        return;
      }
      const lastId = localStorage.getItem('lastOpenedChatId');
      if (lastId && chats.some(c => String(c.id) === lastId)) {
        selectChat(lastId);
      }
    } catch { /* SSR or storage unavailable */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats.length, currentChatId]);

  // Сохраняем открытый чат в localStorage при каждом переключении
  useEffect(() => {
    if (currentChatId) {
      try { localStorage.setItem('lastOpenedChatId', currentChatId); } catch { /* ignore */ }
    }
  }, [currentChatId]);

  const loadMessagesFromServer = useCallback((chatId: string, silent: boolean) => {
    fetch(`/api/chats/${chatId}/messages`)
      .then(res => res.json())
      .then(async (data: Message[]) => {
        console.log(`Loaded ${data.length} messages for ${chatId}:`, data.slice(0, 3));
        setMessages(prev => {
          // Keep optimistic local messages until server confirms them.
          const pending = prev.filter(m => String(m.id).startsWith('temp_'));
          const merged = [...data];
          for (const temp of pending) {
            if (!merged.some(m => String(m.id) === String(temp.id))) {
              merged.push(temp);
            }
          }
          return merged;
        });
        setMessageCache(prev => {
          const pending = (prev[chatId] ?? []).filter(m => String(m.id).startsWith('temp_'));
          const merged = [...data];
          for (const temp of pending) {
            if (!merged.some(m => String(m.id) === String(temp.id))) {
              merged.push(temp);
            }
          }
          return { ...prev, [chatId]: merged };
        });
        if (!silent) setIsLoading(false);

        // Mark messages as read
        if (data.length > 0 && currentUser) {
          const lastMessage = data[data.length - 1];
          const markReadResponse = await fetch(`/api/chats/${chatId}/mark-read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser.id,
              lastMessageId: lastMessage.id
            })
          }).catch(() => null);

          // Update readMessagesByUser in chats state
          if (markReadResponse?.ok) {
            setChats(prev => prev.map(c => {
              if (c.id !== chatId) return c;
              const updated = { ...c } as any;
              if (!updated.readMessagesByUser) {
                updated.readMessagesByUser = {};
              }
              updated.readMessagesByUser[currentUser.id] = lastMessage.id;
              updated.incomingUnreadCount = 0;
              return updated;
            }));
          }
        }
      })
      .catch(err => {
        console.error('Failed to load messages:', err);
        if (!silent) setIsLoading(false);
      });
  }, [currentUser, loadChats]);

  useEffect(() => {
    if (!currentChatId) return;

    const interval = window.setInterval(() => {
      loadMessagesFromServer(currentChatId, true);
    }, 2500);

    return () => window.clearInterval(interval);
  }, [currentChatId, loadMessagesFromServer]);

  const handleSendMessage = async () => {
    if ((!messageText.trim() && attachments.length === 0) || !currentChatId || !currentUser) return;
    
    const content = messageText.trim();
    console.log('[TEST-CHAT] Sending message:', content);
    
    // Editing existing message
    if (editingMessageId) {
      try {
        const res = await fetch(`/api/chats/${currentChatId}/messages/${editingMessageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });

        if (res.ok) {
          const updated = await res.json();
          setMessages(prev => prev.map(m => String(m.id) === String(editingMessageId) ? { ...m, ...updated } : m));
          setMessageCache(prev => ({
            ...prev,
            [currentChatId]: (prev[currentChatId] || []).map(m => String(m.id) === String(editingMessageId) ? { ...m, ...updated } : m),
          }));
          setMessageText('');
          setEditingMessageId(null);
          localStorage.removeItem(`draft_${currentChatId}`);
          loadMessagesFromServer(currentChatId, true);
        }
      } catch (err) {
        console.error('[TEST-CHAT] Error updating message:', err);
      }
      return;
    }

    // Оптимистичное обновление UI
    let uploadedAttachments: Array<{type: string; url: string; name: string; size: number}> = [];

    // Upload files before sending
    if (attachments.length > 0) {
      try {
        uploadedAttachments = await Promise.all(
          attachments.map(async (att) => {
            const formData = new FormData();
            formData.append('file', att.file);
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            return { type: att.type, url: data.url, name: att.file.name, size: att.file.size };
          })
        );
      } catch (err) {
        console.error('[TEST-CHAT] Failed to upload attachments:', err);
        return;
      }
    }

    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      chatId: currentChatId,
      content,
      authorId: currentUser.id,
      authorName: currentUser.name || currentUser.username || 'Вы',
      createdAt: new Date().toISOString(),
      isDeleted: false,
      isSystemMessage: false,
      isEdited: false,
      attachments: uploadedAttachments,
      mentions: [],
      ...(replyTo?.id ? { replyToId: replyTo.id } : {}),
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setMessageText('');
    setReplyTo(null); // Очищаем состояние ответа после отправки
    setAttachments([]); // Clear attachment strip
    localStorage.removeItem(`draft_${currentChatId}`);
    
    // Автоскролл вниз
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    
    // Обновляем превью последнего сообщения в чате
    setChats(prev => prev.map(c => 
      c.id === currentChatId 
        ? { ...c, lastMessageContent: content, lastMessageTimestamp: tempMessage.createdAt }
        : c
    ));
    
    // Отправка на сервер
    try {
      const replyToIdToSend = replyTo?.id; // Сохраняем перед очисткой
      
      const res = await fetch(`/api/chats/${currentChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          authorId: currentUser.id,
          authorName: currentUser.name || currentUser.username,
          ...(replyToIdToSend ? { replyToId: replyToIdToSend } : {}),
          ...(uploadedAttachments.length > 0 ? { attachments: uploadedAttachments } : {}),
        }),
      });
      
      if (res.ok) {
        const newMessage = await res.json();
        // Заменяем временное сообщение реальным
        setMessages(prev => prev.map(m => m.id === tempMessage.id ? newMessage : m));
        // Обновляем кеш
        setMessageCache(prev => ({
          ...prev,
          [currentChatId]: prev[currentChatId]?.map(m => m.id === tempMessage.id ? newMessage : m) || [newMessage]
        }));
        // Обновляем превью в списке чатов реальными данными
        setChats(prev => prev.map(c => 
          c.id === currentChatId 
            ? { ...c, lastMessageContent: newMessage.content, lastMessageTimestamp: newMessage.createdAt }
            : c
        ));
      } else {
        console.error('[TEST-CHAT] Failed to send message:', res.status);
        // Убираем временное сообщение при ошибке
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        // Откатываем превью чата
        loadMessagesFromServer(currentChatId, true);
      }
    } catch (err) {
      console.error('[TEST-CHAT] Error sending message:', err);
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      // Откатываем превью чата
      loadMessagesFromServer(currentChatId, true);
    }
  };

  // Обработчик изменения текста с сохранением черновика
  const handleMessageChange = (text: string) => {
    setMessageText(text);
    
    // Сохраняем черновик с небольшой задержкой (debounce)
    if (currentChatId) {
      if (text.trim()) {
        localStorage.setItem(`draft_${currentChatId}`, text);
      } else {
        localStorage.removeItem(`draft_${currentChatId}`);
      }
    }
  };

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!currentChatId) return;
    try {
      const res = await fetch(`/api/chats/${currentChatId}/messages/${messageId}`, { method: 'DELETE' });
      if (!res.ok) return;
      setMessages(prev => prev.filter(m => String(m.id) !== String(messageId)));
      setMessageCache(prev => ({
        ...prev,
        [currentChatId]: (prev[currentChatId] || []).filter(m => String(m.id) !== String(messageId)),
      }));
    } catch (err) {
      console.error('[TEST-CHAT] Error deleting message:', err);
    }
  }, [currentChatId]);

  const handleReplyMessage = useCallback((message: Message) => {
    // Используем состояние replyTo вместо префикса в тексте
    setReplyTo({
      id: String(message.id),
      text: message.content || '',
      author: message.authorName || 'Unknown'
    });
    setShowMessageContextMenu(false);
    setContextMenuMessage(null);
    setTimeout(() => messageInputRef.current?.focus(), 0);
  }, []);

  const handleForwardMessage = useCallback(async (message: Message) => {
    setForwardingMessage(message);
    setShowForwardModal(true);
    setShowMessageContextMenu(false);
    setContextMenuMessage(null);
  }, []);

  const handleEditMessage = useCallback((messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setMessageText(content || '');
    setReplyTo(null); // Очищаем состояние ответа при редактировании
    setShowMessageContextMenu(false);
    setContextMenuMessage(null);
    setTimeout(() => messageInputRef.current?.focus(), 0);
  }, []);

  const handleTogglePin = useCallback(async (message: Message) => {
    if (!currentChatId || !currentUser) return;

    const isPinned = !!message.metadata?.isPinned;

    try {
      const response = await fetch(`/api/chats/${currentChatId}/messages/${message.id}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          isPinned: !isPinned
        })
      });

      if (!response.ok) throw new Error(`Failed to pin message: ${response.status}`);

      const result = await response.json();

      // Обновляем сообщение в локальном state
      setMessages(prev => prev.map(m => {
        if (String(m.id) !== String(message.id)) return m;
        return {
          ...m,
          metadata: {
            ...(m.metadata || {}),
            isPinned: result.pinnedMessage?.metadata?.isPinned || !isPinned,
            pinnedBy: result.pinnedMessage?.metadata?.pinnedBy,
            pinnedAt: result.pinnedMessage?.metadata?.pinnedAt
          },
        };
      }));
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  }, [currentChatId, currentUser]);

  const handleForwardToChat = useCallback(async (targetChatId: string) => {
    if (!forwardingMessage || !currentUser) throw new Error('No message or user');
    
    const res = await fetch(`/api/chats/${targetChatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: forwardingMessage.content,
        authorId: currentUser.id,
        authorName: currentUser.name || currentUser.username,
        forwardedFrom: forwardingMessage.id,
      }),
    });
    
    if (!res.ok) throw new Error(`Forward failed (${res.status})`);
    
    // Обновляем список чатов
    await loadChats();
  }, [forwardingMessage, currentUser, loadChats]);

  // Возврат к списку чатов на мобильных
  const handleBack = () => {
    setCurrentChatId(null);
    updateChatUrl(null);
    // Выключаем режим выделения при выходе из чата
    setIsSelectionMode(false);
    setSelectedMessages(new Set());
    // Уведомляем родительский layout что чат закрыт
    window.dispatchEvent(new CustomEvent('chat-selection-changed', { detail: { isOpen: false } }));
  };

  // Обработчики для режима выделения
  const handleForwardSelected = useCallback(() => {
    if (selectedMessages.size === 0) return;
    // Берем первое выделенное сообщение для пересылки
    const messageId = Array.from(selectedMessages)[0];
    const message = messages.find(m => String(m.id) === messageId);
    if (message) {
      setForwardingMessage(message);
      setShowForwardModal(true);
      setIsSelectionMode(false);
      setSelectedMessages(new Set());
    }
  }, [selectedMessages, messages]);

  const handleDeleteSelected = useCallback(async () => {
    if (!currentChatId || selectedMessages.size === 0) return;
    
    const confirmed = confirm(`Удалить ${selectedMessages.size} сообщений?`);
    if (!confirmed) return;

    try {
      for (const messageId of selectedMessages) {
        await fetch(`/api/chats/${currentChatId}/messages/${messageId}`, {
          method: 'DELETE'
        });
      }

      // Обновляем список сообщений
      setMessages(prev => prev.filter(m => !selectedMessages.has(String(m.id))));
      setIsSelectionMode(false);
      setSelectedMessages(new Set());
    } catch (error) {
      console.error('Error deleting messages:', error);
      alert('Ошибка при удалении сообщений');
    }
  }, [currentChatId, selectedMessages]);

  const handleCopySelected = useCallback(() => {
    if (selectedMessages.size === 0) return;

    const selectedTexts = messages
      .filter(m => selectedMessages.has(String(m.id)))
      .map(m => m.content)
      .join('\n\n');

    navigator.clipboard.writeText(selectedTexts).then(() => {
      setIsSelectionMode(false);
      setSelectedMessages(new Set());
    });
  }, [selectedMessages, messages]);

  const handleAddToFavorites = useCallback(async () => {
    if (!currentUser || selectedMessages.size === 0) return;

    const favChatId = `favorites_${currentUser.id}`;

    try {
      for (const messageId of selectedMessages) {
        const message = messages.find(m => String(m.id) === messageId);
        if (!message) continue;

        await fetch(`/api/chats/${favChatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: message.content,
            authorId: currentUser.id,
            authorName: currentUser.name || currentUser.username,
            forwardedFrom: message.id,
            attachments: message.attachments || []
          })
        });
      }

      setIsSelectionMode(false);
      setSelectedMessages(new Set());
    } catch (error) {
      console.error('Error adding to favorites:', error);
      alert('Ошибка при добавлении в избранное');
    }
  }, [currentUser, selectedMessages, messages]);

  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedMessages(new Set());
  }, []);

  // Auto-exit selection mode when all messages are deselected
  useEffect(() => {
    if (isSelectionMode && selectedMessages.size === 0) {
      setIsSelectionMode(false);
    }
  }, [isSelectionMode, selectedMessages.size]);

  const scrollToMessage = useCallback((messageId: string) => {
    const el = messageRefs.current[messageId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Подсвечиваем сообщение на мгновение
      el.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
      setTimeout(() => {
        el.style.backgroundColor = '';
      }, 1000);
    }
  }, [messageRefs]);

  const handleStartSelection = useCallback((message: Message) => {
    setIsSelectionMode(true);
    setSelectedMessages(new Set([String(message.id)]));
  }, []);

  const isArchivedForCurrentUser = useCallback((chat: Chat): boolean => {
    if (!currentUser) return false;
    const map = (chat as any).archivedByUser || (chat as any).archived_by_user || {};
    const raw = map?.[currentUser.id];
    if (typeof raw === 'string') return raw.toLowerCase() === 'true';
    return Boolean(raw || (chat as any).isArchivedForUser || (chat as any).is_archived_for_user);
  }, [currentUser]);

  const toggleArchiveChat = useCallback(async (chatId: string, nextArchived?: boolean) => {
    if (!currentUser) return;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    const currentArchived = isArchivedForCurrentUser(chat);
    const shouldArchive = typeof nextArchived === 'boolean' ? nextArchived : !currentArchived;

    // Если архивируем текущий открытый чат, закрываем его
    if (currentChatId === chatId && shouldArchive && !showArchivedChats) {
      setCurrentChatId(null);
      window.dispatchEvent(new CustomEvent('chat-selection-changed', { detail: { isOpen: false } }));
    }

    try {
      const res = await fetch(`/api/chats/${chatId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, isArchived: shouldArchive }),
      });
      if (!res.ok) throw new Error(`Archive failed (${res.status})`);
      
      // Перезагружаем чаты с сервера
      await loadChats();
    } catch (err) {
      console.error('[TEST-CHAT] Failed to toggle archive:', err);
      // В случае ошибки также перезагружаем, чтобы вернуть корректное состояние
      await loadChats();
    }
  }, [currentUser, chats, isArchivedForCurrentUser, currentChatId, showArchivedChats, loadChats]);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
        window.dispatchEvent(new CustomEvent('chat-selection-changed', { detail: { isOpen: false } }));
      }
      await loadChats();
    } catch (err) {
      console.error('[TEST-CHAT] Failed to delete chat:', err);
    }
  }, [currentChatId, loadChats]);

  const createChat = useCallback(async () => {
    if (!currentUser || selectedUsers.length === 0) return;

    const participantIds = Array.from(new Set([...selectedUsers, currentUser.id]));

    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds,
          title: isGroupChat ? groupTitle : undefined,
          isGroup: isGroupChat,
          creatorId: isGroupChat ? currentUser.id : undefined,
        }),
      });

      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      const newChat: Chat = await res.json();
      setShowNewChatModal(false);
      setSelectedUsers([]);
      setIsGroupChat(false);
      setGroupTitle('');
      setNewChatSearchQuery('');
      await loadChats();
      selectChat(newChat.id);
    } catch (err) {
      console.error('[TEST-CHAT] Failed to create chat:', err);
    }
  }, [currentUser, selectedUsers, isGroupChat, groupTitle, loadChats]);

  const togglePinChat = useCallback(async (chatId: string) => {
    if (!currentUser) return;
    
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    const isPinned = (chat as any).pinned_by_user?.[currentUser.id];
    
    try {
      const res = await fetch(`/api/chats/${chatId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          isPinned: !isPinned,
        }),
      });
      
      if (!res.ok) throw new Error(`Pin failed (${res.status})`);
      
      // Обновляем локальное состояние
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          const updated = { ...c } as any;
          if (!updated.pinned_by_user) updated.pinned_by_user = {};
          updated.pinned_by_user[currentUser.id] = !isPinned;
          return updated;
        }
        return c;
      }));
    } catch (err) {
      console.error('[TEST-CHAT] Failed to pin chat:', err);
    }
  }, [currentUser, chats]);

  const filteredUsers = users
    .filter(u => currentUser && u.id !== currentUser.id)
    .filter(u => {
      const q = newChatSearchQuery.trim().toLowerCase();
      if (!q) return true;
      return [u.name, u.username, u.email].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
    });

  const visibleChats = chats
    .filter(chat => {
      // Специальные чаты (избранное/уведомления) всегда видны
      const isSpecial = chat.isFavoritesChat || chat.isNotificationsChat || String(chat.id).startsWith('favorites_') || String(chat.id).startsWith('notifications-') || String(chat.id).startsWith('notifications_');
      if (isSpecial) return !showArchivedChats; // показываем только в основном списке
      return isArchivedForCurrentUser(chat) === showArchivedChats;
    })
    .filter(chat => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const displayTitle = (chat as any).displayTitle || chat.title || 'Чат';
      const lastMessage = String((chat as any).lastMessageContent || '');
      return displayTitle.toLowerCase().includes(q) || lastMessage.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      // Специальные чаты — всегда первыми (уведомления, затем избранное)
      const aIsNotif = a.isNotificationsChat || String(a.id).startsWith('notifications-') || String(a.id).startsWith('notifications_');
      const bIsNotif = b.isNotificationsChat || String(b.id).startsWith('notifications-') || String(b.id).startsWith('notifications_');
      const aIsFav = a.isFavoritesChat || String(a.id).startsWith('favorites_');
      const bIsFav = b.isFavoritesChat || String(b.id).startsWith('favorites_');

      if (aIsNotif && !bIsNotif) return -1;
      if (!aIsNotif && bIsNotif) return 1;
      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;

      // Закрепленные чаты всегда сверху
      const aPinned = currentUser && (a as any).pinned_by_user?.[currentUser.id];
      const bPinned = currentUser && (b as any).pinned_by_user?.[currentUser.id];
      
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      // Если оба закреплены, сортируем по pinned_order_by_user
      if (aPinned && bPinned) {
        const aOrder = (a as any).pinned_order_by_user?.[currentUser!.id] || 0;
        const bOrder = (b as any).pinned_order_by_user?.[currentUser!.id] || 0;
        return aOrder - bOrder;
      }
      
      // Остальные по дате последнего сообщения
      return 0;
    });

  const currentChat = chats.find(c => c.id === currentChatId);

  // Subtitle for chat header: online status or type label
  const chatSubtitle = (() => {
    if (!currentChat) return '';
    const cid = String(currentChatId || '');
    if ((currentChat as any).isFavoritesChat || cid.startsWith('favorites_')) return 'Личный архив';
    if ((currentChat as any).isNotificationsChat || cid.startsWith('notifications-') || cid.startsWith('notifications_')) return 'Системные уведомления';
    if (!!(currentChat as any).isGroup || ((currentChat.participantIds?.length ?? 0) > 2)) return '';
    const otherId = (currentChat.participantIds || []).find(id => String(id) !== String(currentUser?.id));
    const other = otherId ? users.find(u => String(u.id) === String(otherId)) : null;
    if (!other) return 'был(а) в сети недавно';
    if (other.isOnline) return 'в сети';
    if (!other.lastSeen) return 'не в сети';
    const seen = new Date(other.lastSeen);
    const diff = Date.now() - seen.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'был(а) в сети только что';
    if (mins < 60) return `был(а) в сети ${mins} мин. назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `был(а) в сети ${hours} ч. назад`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'был(а) в сети вчера';
    return `был(а) в сети ${seen.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
  })();

  // Градиенты фона для разных тем
  const backgroundGradient = theme === 'dark'
    ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
    : 'bg-gradient-to-br from-gray-100 via-white to-gray-50';
  
  // Фон и оверлей для области чата
  const chatBackgroundColor = theme === 'dark'
    ? (chatSettings.chatBackgroundDark || '#0f172a')
    : (chatSettings.chatBackgroundLight || '#f8fafc');
  const chatBackgroundImage = theme === 'dark'
    ? String(chatSettings.chatBackgroundImageDark || '').trim()
    : String(chatSettings.chatBackgroundImageLight || '').trim();
  const chatOverlayImage = theme === 'dark'
    ? String(chatSettings.chatOverlayImageDark || '').trim()
    : String(chatSettings.chatOverlayImageLight || '').trim();
  const overlayScale = Math.max(20, Math.min(200, Number(chatSettings.chatOverlayScale ?? 100) || 100));
  const overlayOpacity = Math.max(0, Math.min(1, Number(chatSettings.chatOverlayOpacity ?? 1) || 1));

  // Закрепленные сообщения
  const pinnedMessages = messages.filter(m => m.metadata?.isPinned);
  const hasPinnedMessages = pinnedMessages.length > 0;

  return (
    <div 
      className={`h-screen md:h-[100dvh] min-h-0 flex p-1 gap-1 md:pb-[52px] ${backgroundGradient} max-md:p-0 max-md:gap-0`} 
      style={{ 
        height: '100vh',
        // @ts-ignore - dvh not in CSSProperties yet
        height: '100dvh',
        minHeight: '100vh',
        // @ts-ignore
        minHeight: '100dvh'
      }}
    >
      {/* Скрываем сайдбар на мобильных когда открыт чат */}
      <div className={`${isBelow768 && currentChatId ? 'hidden' : 'flex'} flex-col md:mb-[56px] md:h-full md:min-h-0 max-md:w-full max-md:h-full`}>
        <ChatSidebar 
          chats={visibleChats}
          currentChatId={currentChatId}
          currentUser={currentUser}
          searchQuery={searchQuery}
          showArchivedChats={showArchivedChats}
          onSearchQueryChange={setSearchQuery}
          onToggleArchivedChats={() => setShowArchivedChats(prev => !prev)}
          onOpenNewChat={() => setShowNewChatModal(true)}
          onChatContextMenu={(chatId, position) => {
            setChatContextMenu({ chatId, top: position.top, left: position.left });
          }}
          onSelectChat={selectChat}
        />
      </div>

      <div
        className={`flex-1 flex flex-col rounded-t-[26px] rounded-b-2xl shadow-lg overflow-hidden max-md:rounded-none relative ${!currentChatId && isBelow768 ? 'hidden' : 'flex'}`}
        onDragOver={(e) => { if (currentChatId && !((currentChat as any)?.isFavoritesChat || String(currentChatId).startsWith('favorites_') || (currentChat as any)?.isNotificationsChat || String(currentChatId).startsWith('notifications-') || String(currentChatId).startsWith('notifications_'))) { e.preventDefault(); setIsDraggingOnChat(true); } }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingOnChat(false); }}
        onDrop={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingOnChat(false);
          if (!currentChatId) return;
          const files = e.dataTransfer.files;
          if (!files || files.length === 0) return;
          const fileArray = Array.from(files);
          const processed = await Promise.all(
            fileArray.map(async (file) => {
              const id = Math.random().toString(36).substr(2, 9);
              let type: 'image' | 'video' | 'file' = 'file';
              if (file.type.startsWith('image/')) type = 'image';
              else if (file.type.startsWith('video/')) type = 'video';
              let preview: string | undefined;
              if (type === 'image') {
                preview = await new Promise<string>((res, rej) => {
                  const reader = new FileReader();
                  reader.onload = (ev) => res(ev.target?.result as string);
                  reader.onerror = rej;
                  reader.readAsDataURL(file);
                });
              } else if (type === 'video') {
                try {
                  const video = document.createElement('video');
                  const url = URL.createObjectURL(file);
                  video.src = url; video.muted = true; video.playsInline = true;
                  preview = await new Promise<string>((res, rej) => {
                    video.onloadedmetadata = () => { video.currentTime = Math.min(1, video.duration / 2); };
                    video.onseeked = () => {
                      const canvas = document.createElement('canvas');
                      canvas.width = Math.min(video.videoWidth, 320); canvas.height = Math.min(video.videoHeight, 320);
                      canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
                      URL.revokeObjectURL(url); res(canvas.toDataURL('image/jpeg', 0.7));
                    };
                    video.onerror = () => { URL.revokeObjectURL(url); rej(new Error('video')); };
                  });
                } catch { /* no thumbnail */ }
              }
              return { id, file, type, preview } as AttachmentFile;
            })
          );
          setAttachments(prev => [...prev, ...processed]);
        }}
      >
        {currentChat ? (
          <>
            {/* Full-panel drag-drop overlay (Signal-style) */}
            {isDraggingOnChat && (
              <div className="absolute inset-0 z-[100] bg-blue-500/10 dark:bg-blue-500/15 border-4 border-dashed border-blue-400 dark:border-blue-500 rounded-inherit flex flex-col items-center justify-center gap-3 pointer-events-none">
                <div className="w-16 h-16 rounded-3xl bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-blue-600 dark:text-blue-400">Перетащите файлы для отправки</p>
                <p className="text-sm text-blue-500/70 dark:text-blue-400/70">Файлы будут добавлены к сообщению</p>
              </div>
            )}
            {/* Фон чата + хедер поверх сообщений, всё в relative контейнере */}
            <div 
              className="flex-1 relative overflow-hidden"
              style={{
                backgroundColor: chatBackgroundColor,
                ...(chatBackgroundImage && {
                  backgroundImage: `url('${chatBackgroundImage}')`,
                  backgroundSize: 'cover',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center center'
                })
              }}
            >
              {/* Overlay pattern */}
              {chatOverlayImage && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `url('${chatOverlayImage}')`,
                    backgroundSize: `${overlayScale * 3}px`,
                    backgroundRepeat: 'repeat',
                    backgroundPosition: 'center center',
                    opacity: overlayOpacity,
                    zIndex: 0,
                  }}
                />
              )}

              {/* Сообщения — стартуют с верха, скролляются за хедером */}
              {currentChatId && messages.length > 0 ? (
                <ChatTimelineV2
                  key={currentChatId}
                  chatId={currentChatId}
                  messages={messages}
                  messageSearchQuery=""
                  users={users}
                  currentUser={currentUser}
                  selectedChat={{
                    ...currentChat,
                    title: (currentChat as any).displayTitle || currentChat.title || 'Чат'
                  }}
                  selectedMessages={selectedMessages}
                  editingMessageId={editingMessageId}
                  isSelectionMode={isSelectionMode}
                  messageRefs={messageRefs}
                  theme={theme}
                  chatSettings={chatSettings}
                  isDesktopView={true}
                  myBubbleTextClass=""
                  useDarkTextOnBubble={false}
                  composerContainerRef={composerContainerRef}
                  messagesEndRef={messagesEndRef}
                  router={{}}
                  scrollTopPadding={hasPinnedMessages ? (isBelow768 ? 125 : 88) : (isBelow768 ? 100 : 72)}
                  // Keep room for floating composer; bottom nav is hidden on mobile when chat is open
                  scrollBottomPadding={67}
                  setSelectedMessages={setSelectedMessages}
                  setIsSelectionMode={setIsSelectionMode}
                  setContextMenuMessage={setContextMenuMessage}
                  setContextMenuPosition={setContextMenuPosition}
                  setShowMessageContextMenu={setShowMessageContextMenu}
                  scrollToMessage={(messageId: string) => {
                    const el = messageRefs.current[messageId];
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      // Подсвечиваем сообщение на мгновение
                      el.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                      setTimeout(() => {
                        el.style.backgroundColor = '';
                      }, 1000);
                    }
                  }}
                  setCurrentImageUrl={() => {}}
                  setShowImageModal={() => {}}
                />
              ) : (
                <EmptyState 
                  type="no-messages"
                  isLoading={isLoading}
                  messageCount={messages.length}
                  userCount={users.length}
                />
              )}

              {/* Хедер — абсолютно позиционирован поверх фона чата.
                  Сообщения скроллятся за ним, позиции баблов определяет scrollTopPadding. */}
              <div className="absolute top-0 md:-top-[7px] left-0 right-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                {isSelectionMode ? (
                  <SelectionActionsBar
                    selectedCount={selectedMessages.size}
                    onForward={handleForwardSelected}
                    onDelete={handleDeleteSelected}
                    onCancel={handleCancelSelection}
                    onCopy={handleCopySelected}
                    onAddToFavorites={handleAddToFavorites}
                  />
                ) : (
                  <ChatHeader 
                    title={(currentChat as any).displayTitle || currentChat.title || 'Чат'}
                    isLoading={isLoading}
                    messageCount={messages.length}
                    chatId={currentChatId || ''}
                    isGroupChat={!!(currentChat as any).isGroup || ((currentChat.participantIds?.length ?? 0) > 2)}
                    hasActiveGroupCall={groupCallState?.chatId === currentChatId && groupCallState.isActive}
                    groupCallParticipants={groupParticipants.length}
                    onBack={handleBack}
                    isMobile={isBelow768}
                    subtitle={chatSubtitle}
                    onStartVoiceCall={(currentChat as any)?.isFavoritesChat || String(currentChatId || '').startsWith('favorites_') || (currentChat as any)?.isNotificationsChat ? undefined : startVoiceCall}
                    onStartVideoCall={(currentChat as any)?.isFavoritesChat || String(currentChatId || '').startsWith('favorites_') || (currentChat as any)?.isNotificationsChat ? undefined : startVideoCall}
                    onStartGroupCall={(currentChat as any)?.isFavoritesChat || String(currentChatId || '').startsWith('favorites_') || (currentChat as any)?.isNotificationsChat ? undefined : (groupCallState?.isActive ? leaveGroupCall : startGroupCall)}
                    onOpenProfile={() => setShowProfilePanel(true)}
                    onOpenMenu={() => setShowActionsMenu(true)}
                    pinnedMessages={pinnedMessages}
                    onGoToMessage={scrollToMessage}
                    onUnpinMessage={(messageId) => {
                      const message = messages.find(m => String(m.id) === messageId);
                      if (message) handleTogglePin(message);
                    }}
                    canUnpin={true}
                  />
                )}
              </div>

              {/* Floating composer over chat background (no separate underlay block). */}
              <div className={`absolute ${isBelow768 && currentChatId ? 'bottom-0' : 'bottom-[56px] md:bottom-0'} left-0 right-0 z-10`} ref={composerContainerRef}>
                {(currentChat?.isNotificationsChat || String(currentChatId || '').startsWith('notifications-') || String(currentChatId || '').startsWith('notifications_')) ? (
                  <div className="mx-2 mb-2 px-4 py-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 text-[13px] text-gray-400 dark:text-gray-500 text-center select-none">
                    Чат только для чтения
                  </div>
                ) : (
                <ChatInput 
                  inputRef={messageInputRef}
                  messageText={messageText}
                  onMessageChange={handleMessageChange}
                  onSendMessage={handleSendMessage}
                  replyTo={replyTo}
                  onCancelReply={() => setReplyTo(null)}
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                  editingMessageId={editingMessageId}
                  onCancelEdit={() => {
                    setEditingMessageId(null);
                    setMessageText('');
                  }}
                />
                )}
              </div>

              {showProfilePanel && currentChat && (
                <ChatProfile
                  chat={currentChat}
                  messages={messages}
                  users={users}
                  currentUser={currentUser}
                  onClose={() => setShowProfilePanel(false)}
                  onArchiveChat={(chatId) => void toggleArchiveChat(chatId)}
                  onDeleteChat={(chatId) => {
                    void deleteChat(chatId);
                    setShowProfilePanel(false);
                  }}
                  isMobile={isBelow768}
                />
              )}

              {showActionsMenu && currentChat && (
                <ChatActionsMenu
                  onSearch={() => {/* TODO: implement search */}}
                  onArchive={() => void toggleArchiveChat(currentChat.id)}
                  onDelete={() => void deleteChat(currentChat.id)}
                  onClose={() => setShowActionsMenu(false)}
                  isMobile={isBelow768}
                />
              )}
            </div>
          </>
        ) : (
          <EmptyState type="no-chat" />
        )}
      </div>

      {/* Нижнее меню из основной части проекта ──────── */}
      {/* Скрываем полностью в test-chat на мобильных */}
      {/* MainBottomNav удален - не должен показываться в test-chat вообще */}

      {/* ── 1:1 Call Overlay ─────────────────────────────────────────── */}
      {callState !== 'idle' && (() => {
        const name = callTargetUser?.name ?? callTargetUser?.username ?? incomingCall?.fromUserName ?? 'Собеседник';
        const AVATAR_COLORS = ['from-blue-400 to-blue-600', 'from-green-400 to-green-600', 'from-purple-400 to-purple-600', 'from-pink-400 to-pink-600', 'from-orange-400 to-orange-600'];
        const uid = callTargetUser?.id ? String(callTargetUser.id) : 'x';
        const avatarColor = AVATAR_COLORS[uid.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
        const words = name.trim().split(/\s+/);
        const initials = words.length === 1 ? words[0][0].toUpperCase() : (words[0][0] + words[1][0]).toUpperCase();
        // In Electron, call.html handles the UI — keep CallOverlay for audio only (hidden)
        const isElectron = typeof window !== 'undefined' && !!(window as any).sharDesktop?.call;
        return (
          <div style={isElectron ? { position: 'fixed', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none', opacity: 0, zIndex: -1 } : {}}>
            <CallOverlay
              callState={callState}
              callType={callType}
              remoteUserName={name}
              remoteInitials={initials}
              remoteAvatarColor={avatarColor}
              incomingCall={incomingCall}
              remoteStream={remoteStream}
              localStream={localStream}
              onAccept={acceptCall}
              onReject={rejectCall}
              onHangup={hangup}
              onToggleMute={toggleMute}
              onToggleCamera={toggleCamera}
              onRequestDump={requestCallDump}
              onListAudioInputs={listCallAudioInputs}
              onSwitchAudioInput={switchCallAudioInput}
              onListAudioOutputs={listCallAudioOutputs}
            />
          </div>
        );
      })()}

      {/* ── Group Call View ───────────────────────────────────────────── */}
      {groupCallState?.isActive && (
        <GroupCallView
          groupCallState={groupCallState}
          participants={groupParticipants}
          localStream={groupLocalStream}
          localUser={currentUser ? (() => {
            const AVATAR_COLORS = ['from-blue-400 to-blue-600', 'from-green-400 to-green-600', 'from-purple-400 to-purple-600', 'from-pink-400 to-pink-600', 'from-orange-400 to-orange-600'];
            const uid = String(currentUser.id);
            const avatarColor = AVATAR_COLORS[uid.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
            const words = (currentUser.name || currentUser.username || '?').trim().split(/\s+/);
            const initials = words.length >= 2 ? words[0][0] + words[1][0] : words[0].slice(0, 2);
            return { userId: uid, userName: currentUser.name || currentUser.username || 'Вы', initials: initials.toUpperCase(), avatarColor };
          })() : null}
          onLeave={leaveGroupCall}
          onToggleMute={toggleGroupMute}
        />
      )}

      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onCreateChat={() => void createChat()}
        isGroupChat={isGroupChat}
        setIsGroupChat={setIsGroupChat}
        groupTitle={groupTitle}
        setGroupTitle={setGroupTitle}
        searchQuery={newChatSearchQuery}
        setSearchQuery={setNewChatSearchQuery}
        selectedUsers={selectedUsers}
        setSelectedUsers={setSelectedUsers}
        filteredUsers={filteredUsers}
      />

      {showMessageContextMenu && contextMenuMessage && (
        <MessageContextMenu
          message={contextMenuMessage}
          position={contextMenuPosition}
          currentUser={currentUser}
          messageInputRef={messageInputRef}
          onClose={() => {
            setShowMessageContextMenu(false);
            setContextMenuMessage(null);
          }}
          onReply={handleReplyMessage}
          onForward={handleForwardMessage}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          onShowTaskSelector={(msg) => {
            setSelectedMessageForAction(msg);
            setShowTaskListSelector(true);
          }}
          onLoadTodoLists={async () => {}}
          onShowEventSelector={(msg) => {
            setSelectedMessageForAction(msg);
            setShowEventCalendarSelector(true);
          }}
          onLoadCalendars={async () => {}}
          onTogglePin={handleTogglePin}
          onSelect={handleStartSelection}
          canPinMessage
        />
      )}

      {chatContextMenu && (() => {
        const targetChat = chats.find(c => c.id === chatContextMenu.chatId);
        if (!targetChat) return null;
        const archived = isArchivedForCurrentUser(targetChat);
        const isPinned = currentUser && (targetChat as any).pinned_by_user?.[currentUser.id];
        
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setChatContextMenu(null)} />
            <div
              className="fixed z-50 min-w-[220px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden"
              style={{ top: chatContextMenu.top, left: chatContextMenu.left }}
            >
              <button
                onClick={() => {
                  void togglePinChat(chatContextMenu.chatId);
                  setChatContextMenu(null);
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-3"
              >
                <Pin className={`w-4 h-4 ${isPinned ? 'text-blue-500' : 'text-gray-500 dark:text-gray-300'}`} />
                {isPinned ? 'Открепить' : 'Закрепить'}
              </button>
              <button
                onClick={() => {
                  void toggleArchiveChat(targetChat.id, !archived);
                  setChatContextMenu(null);
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-3"
              >
                <Archive className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                {archived ? 'Вернуть из архива' : 'В архив'}
              </button>
              <button
                onClick={() => {
                  if (confirm('Удалить чат?')) {
                    void deleteChat(targetChat.id);
                  }
                  setChatContextMenu(null);
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-300 flex items-center gap-3"
              >
                <Trash2 className="w-4 h-4" />
                Удалить чат
              </button>
            </div>
          </>
        );
      })()}

      <ForwardMessageModal
        isOpen={showForwardModal}
        onClose={() => {
          setShowForwardModal(false);
          setForwardingMessage(null);
        }}
        message={forwardingMessage}
        chats={chats}
        currentChatId={currentChatId}
        onForward={handleForwardToChat}
      />

      {showTaskListSelector && selectedMessageForAction && (
        <TaskListSelector
          show={showTaskListSelector}
          message={selectedMessageForAction}
          todoLists={[]}
          onClose={() => {
            setShowTaskListSelector(false);
            setSelectedMessageForAction(null);
          }}
        />
      )}

      {showEventCalendarSelector && selectedMessageForAction && (
        <EventCalendarSelector
          show={showEventCalendarSelector}
          message={selectedMessageForAction}
          calendarLists={[]}
          onClose={() => {
            setShowEventCalendarSelector(false);
            setSelectedMessageForAction(null);
          }}
        />
      )}
    </div>
  );
}