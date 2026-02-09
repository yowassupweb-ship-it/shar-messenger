import { useState, useCallback, useRef } from 'react';
import type { Message, Chat } from '@/components/features/messages/types';

/**
 * Хук для управления всеми UI состояниями в Messages страницеДля максимального переиспользования и улучшения производительности
 */
export function useMessagesUI() {
  // Модальные окна и UI состояния
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showReadByModal, setShowReadByModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showRenameChatModal, setShowRenameChatModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showTextFormatMenu, setShowTextFormatMenu] = useState(false);
  const [showMessageContextMenu, setShowMessageContextMenu] = useState(false);
  const [showChatContextMenu, setShowChatContextMenu] = useState(false);
  const [showEventCalendarSelector, setShowEventCalendarSelector] = useState(false);

  // UI режимы
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isChatListCollapsed, setIsChatListCollapsed] = useState(false);
  const [isDesktopView, setIsDesktopView] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  // Поисковые запросы
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [participantSearchQuery, setParticipantSearchQuery] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');

  // Вкладки и навигация
  const [chatInfoTab, setChatInfoTab] = useState<'profile' | 'tasks' | 'media' | 'files' | 'links' | 'participants'>('profile');

  // Выделение и контекстное меню
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [contextMenuMessage, setContextMenuMessage] = useState<Message | null>(null);
  const [contextMenuChat, setContextMenuChat] = useState<Chat | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ top: 0, left: 0 });
  const [chatContextMenuPosition, setChatContextMenuPosition] = useState({ top: 0, left: 0 });

  // Модальные данные
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [selectedChatsForForward, setSelectedChatsForForward] = useState<string[]>([]);
  const [readByMessage, setReadByMessage] = useState<Message | null>(null);
  const [creatingEventFromMessage, setCreatingEventFromMessage] = useState<Message | null>(null);
  const [newChatName, setNewChatName] = useState('');

  // Изображения
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [imageZoom, setImageZoom] = useState(1);
  const [imageGallery, setImageGallery] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Форматирование текста
  const [formatMenuPosition, setFormatMenuPosition] = useState({ top: 0, left: 0 });
  const [textSelection, setTextSelection] = useState({ start: 0, end: 0, text: '' });

  // Упоминания (mentions)
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });

  // Наведение (hover)
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);

  // Календарь
  const [calendarLists, setCalendarLists] = useState<any[]>([]);

  // Создание нового чата
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');

  // Typing индикаторы
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({}); // chatId -> userId[]
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Функции управления модалами
  const openNewChatModal = useCallback(() => {
    setShowNewChatModal(true);
    setSelectedUsers([]);
    setIsGroupChat(false);
    setGroupTitle('');
  }, []);

  const closeNewChatModal = useCallback(() => {
    setShowNewChatModal(false);
    setSelectedUsers([]);
    setIsGroupChat(false);
    setGroupTitle('');
  }, []);

  const openImageModal = useCallback((url: string, gallery?: string[], index?: number) => {
    setCurrentImageUrl(url);
    setShowImageModal(true);
    setImageZoom(1);
    if (gallery) {
      setImageGallery(gallery);
      setCurrentImageIndex(index || 0);
    }
  }, []);

  const closeImageModal = useCallback(() => {
    setShowImageModal(false);
    setCurrentImageUrl('');
    setImageGallery([]);
    setCurrentImageIndex(0);
    setImageZoom(1);
  }, []);

  const openForwardModal = useCallback((message: Message) => {
    setForwardingMessage(message);
    setShowForwardModal(true);
    setSelectedChatsForForward([]);
  }, []);

  const closeForwardModal = useCallback(() => {
    setShowForwardModal(false);
    setForwardingMessage(null);
    setSelectedChatsForForward([]);
  }, []);

  const openReadByModal = useCallback((message: Message) => {
    setReadByMessage(message);
    setShowReadByModal(true);
  }, []);

  const closeReadByModal = useCallback(() => {
    setShowReadByModal(false);
    setReadByMessage(null);
  }, []);

  const openRenameChatModal = useCallback((chatName: string) => {
    setNewChatName(chatName);
    setShowRenameChatModal(true);
  }, []);

  const closeRenameChatModal = useCallback(() => {
    setShowRenameChatModal(false);
    setNewChatName('');
  }, []);

  // Функции управления режимами
  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => {
      if (prev) {
        setSelectedMessages(new Set());
      }
      return !prev;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMessages(new Set());
    setIsSelectionMode(false);
  }, []);

  const toggleMessageSelection = useCallback((messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, []);

  // Контекстное меню
  const openMessageContextMenu = useCallback((message: Message, position: { top: number; left: number }) => {
    setContextMenuMessage(message);
    setContextMenuPosition(position);
    setShowMessageContextMenu(true);
  }, []);

  const closeMessageContextMenu = useCallback(() => {
    setShowMessageContextMenu(false);
    setContextMenuMessage(null);
  }, []);

  const openChatContextMenu = useCallback((chat: Chat, position: { top: number; left: number }) => {
    setContextMenuChat(chat);
    setChatContextMenuPosition(position);
    setShowChatContextMenu(true);
  }, []);

  const closeChatContextMenu = useCallback(() => {
    setShowChatContextMenu(false);
    setContextMenuChat(null);
  }, []);

  // Закрытие всех модалов
  const closeAllModals = useCallback(() => {
    setShowNewChatModal(false);
    setShowMessageSearch(false);
    setShowAttachmentMenu(false);
    setShowTaskPicker(false);
    setShowChatMenu(false);
    setShowEventPicker(false);
    setShowChatInfo(false);
    setShowAddParticipantModal(false);
    setShowForwardModal(false);
    setShowReadByModal(false);
    setShowEmojiPicker(false);
    setShowRenameChatModal(false);
    setShowImageModal(false);
    setShowTextFormatMenu(false);
    setShowMessageContextMenu(false);
    setShowChatContextMenu(false);
    setShowEventCalendarSelector(false);
    setShowMentionSuggestions(false);
  }, []);

  return {
    // Модальные окна
    showNewChatModal,
    setShowNewChatModal,
    showMessageSearch,
    setShowMessageSearch,
    showAttachmentMenu,
    setShowAttachmentMenu,
    showTaskPicker,
    setShowTaskPicker,
    showChatMenu,
    setShowChatMenu,
    showEventPicker,
    setShowEventPicker,
    showChatInfo,
    setShowChatInfo,
    showAddParticipantModal,
    setShowAddParticipantModal,
    showForwardModal,
    setShowForwardModal,
    showReadByModal,
    setShowReadByModal,
    showEmojiPicker,
    setShowEmojiPicker,
    showRenameChatModal,
    setShowRenameChatModal,
    showImageModal,
    setShowImageModal,
    showTextFormatMenu,
    setShowTextFormatMenu,
    showMessageContextMenu,
    setShowMessageContextMenu,
    showChatContextMenu,
    setShowChatContextMenu,
    showEventCalendarSelector,
    setShowEventCalendarSelector,

    // UI режимы
    isSelectionMode,
    setIsSelectionMode,
    isDragging,
    setIsDragging,
    isChatListCollapsed,
    setIsChatListCollapsed,
    isDesktopView,
    setIsDesktopView,

    // Поиск
    searchQuery,
    setSearchQuery,
    messageSearchQuery,
    setMessageSearchQuery,
    participantSearchQuery,
    setParticipantSearchQuery,
    mentionQuery,
    setMentionQuery,

    // Навигация
    chatInfoTab,
    setChatInfoTab,

    // Выделение
    selectedMessages,
    setSelectedMessages,
    contextMenuMessage,
    setContextMenuMessage,
    contextMenuChat,
    setContextMenuChat,
    contextMenuPosition,
    setContextMenuPosition,
    chatContextMenuPosition,
    setChatContextMenuPosition,

    // Модальные данные
    forwardingMessage,
    setForwardingMessage,
    selectedChatsForForward,
    setSelectedChatsForForward,
    readByMessage,
    setReadByMessage,
    creatingEventFromMessage,
    setCreatingEventFromMessage,
    newChatName,
    setNewChatName,

    // Изображения
    currentImageUrl,
    setCurrentImageUrl,
    imageZoom,
    setImageZoom,
    imageGallery,
    setImageGallery,
    currentImageIndex,
    setCurrentImageIndex,

    // Форматирование
    formatMenuPosition,
    setFormatMenuPosition,
    textSelection,
    setTextSelection,

    // Упоминания
    showMentionSuggestions,
    setShowMentionSuggestions,
    mentionPosition,
    setMentionPosition,

    // Наведение
    hoveredChatId,
    setHoveredChatId,

    // Календарь
    calendarLists,
    setCalendarLists,

    // Создание чата
    selectedUsers,
    setSelectedUsers,
    isGroupChat,
    setIsGroupChat,
    groupTitle,
    setGroupTitle,

    // Typing
    typingUsers,
    setTypingUsers,
    typingTimeout,
    setTypingTimeout,

    // Функции управления
    openNewChatModal,
    closeNewChatModal,
    openImageModal,
    closeImageModal,
    openForwardModal,
    closeForwardModal,
    openReadByModal,
    closeReadByModal,
    openRenameChatModal,
    closeRenameChatModal,
    toggleSelectionMode,
    clearSelection,
    toggleMessageSelection,
    openMessageContextMenu,
    closeMessageContextMenu,
    openChatContextMenu,
    closeChatContextMenu,
    closeAllModals,
  };
}
