'use client';

import React from 'react';
import { Check, X, Reply, Edit3, FileText, Calendar, Link as LinkIcon, File, Download, CheckSquare, Bell, MessageCircle, Users, Star, ArrowRight } from 'lucide-react';
import Avatar from '@/components/common/data-display/Avatar';
import LinkPreview from './LinkPreview';
import { Message, User, Chat } from './types';
import { formatMessageDate, shouldShowDateSeparator, formatMessageText } from './utils';
import CallCard from '@/app/test-chat/CallCard';

const TASK_STATUS_LABELS: Record<string, string> = {
  'todo': 'К выполнению',
  'pending': 'В ожидании',
  'in-progress': 'В работе',
  'in_progress': 'В работе',
  'review': 'На проверке',
  'cancelled': 'Отменена',
  'stuck': 'Застряла',
  'done': 'Готово',
};

const TASK_STATUS_BADGE_CLASSES: Record<string, string> = {
  'todo': 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  'pending': 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  'in-progress': 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'in_progress': 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'review': 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  'cancelled': 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  'stuck': 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  'done': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
};

interface MessageItemProps {
  message: Message;
  index: number;
  filteredMessages: Message[];
  messages: Message[];
  users: User[];
  currentUser: User | null;
  selectedChat: Chat | null;
  selectedMessages: Set<string>;
  editingMessageId: string | null;
  isSelectionMode: boolean;
  messageRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  theme: 'light' | 'dark';
  chatSettings: any;
  isDesktopView: boolean;
  myBubbleTextClass: string;
  useDarkTextOnBubble: boolean;
  isReadByOthers: boolean;
  onSelectMessage: (messageId: string) => void;
  onDoubleClick: (messageId: string) => void;
  onContextMenu: (e: React.MouseEvent, message: Message) => void;
  scrollToMessage: (messageId: string) => void;
  setCurrentImageUrl: (url: string) => void;
  setShowImageModal: (show: boolean) => void;
  router: any;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  index,
  filteredMessages,
  messages,
  users,
  currentUser,
  selectedChat,
  selectedMessages,
  editingMessageId,
  isSelectionMode,
  messageRefs,
  theme,
  chatSettings,
  isDesktopView,
  myBubbleTextClass,
  useDarkTextOnBubble,
  isReadByOthers,
  onSelectMessage,
  onDoubleClick,
  onContextMenu,
  scrollToMessage,
  setCurrentImageUrl,
  setShowImageModal,
  router
}) => {
  const normalizeAuthorValue = (value: unknown): string => String(value ?? '').trim().toLowerCase();
  const currentUserIdNormalized = normalizeAuthorValue(currentUser?.id);
  const currentUserUsernameNormalized = normalizeAuthorValue(currentUser?.username);
  const currentUserNameNormalized = normalizeAuthorValue(currentUser?.name);
  const isCurrentUserMessageAuthor = (value: unknown): boolean => {
    const normalizedValue = normalizeAuthorValue(value);
    if (!normalizedValue) return false;

    return normalizedValue === currentUserIdNormalized
      || Boolean(currentUserUsernameNormalized && normalizedValue === currentUserUsernameNormalized)
      || Boolean(currentUserNameNormalized && normalizedValue === currentUserNameNormalized);
  };

  // Защита от null authorId (для системных сообщений)
  const authorId = message?.authorId || 'system';
  const isMyMessage = isCurrentUserMessageAuthor(authorId);
  const isEditing = editingMessageId === message.id;
  const isNotificationsChat = Boolean(
    selectedChat && (
      selectedChat.isNotificationsChat
      || String(selectedChat.id || '').startsWith('notifications-')
      || (selectedChat.isSystemChat && selectedChat.title === 'Уведомления')
    )
  );
  const isNotificationBubble = isNotificationsChat;
  const recoverMojibake = React.useCallback((value: string): string => {
    if (!value) return value;
    if (!/[ÐÑÂ]/.test(value)) return value;

    try {
      const binary = value
        .split('')
        .map((char) => String.fromCharCode(char.charCodeAt(0) & 0xff))
        .join('');

      return decodeURIComponent(
        Array.from(binary)
          .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
          .join('')
      );
    } catch {
      return value;
    }
  }, []);
  const normalizedNotificationContent = React.useMemo(() => {
    if (!isNotificationBubble) return message.content;
    const recovered = recoverMojibake(String(message.content || ''));
    const hasIrreversibleLoss = /\?{3,}/.test(recovered);

    const metadata = message.metadata || {};
    const fromUserName = String(metadata.fromUserName || '').trim();
    const taskTitle = String(metadata.taskTitle || '').trim();
    const oldStatus = String(metadata.oldStatus || '').trim();
    const newStatus = String(metadata.newStatus || '').trim();
    const executorName = String(metadata.executorName || '').trim();

    const fallbackContent = (() => {
      if (!hasIrreversibleLoss) return '';

      if (message.notificationType === 'task_status_changed' && (fromUserName || taskTitle || oldStatus || newStatus)) {
        const title = taskTitle || 'Задача';
        return `Статус изменён — ${fromUserName || 'Пользователь'}: «${title}» (${oldStatus || '—'} → ${newStatus || '—'})`;
      }

      if (message.notificationType === 'new_task' && (fromUserName || taskTitle)) {
        return `Новая задача — ${fromUserName || 'Пользователь'}: «${taskTitle || 'Задача'}»`;
      }

      if (message.notificationType === 'new_executor' && (taskTitle || executorName)) {
        return `Новый исполнитель — ${executorName || 'Пользователь'}: «${taskTitle || 'Задача'}»`;
      }

      return '';
    })();

    const source = fallbackContent || recovered;

    return source
      .replace(/<[^>]*>/g, '')
      .replace(/\bОткрыть\s+задачу\b/gi, '')
      .replace(/изменил\(а\)/gi, 'изменил')
      .replace(/назначил\(а\)/gi, 'назначил')
      .replace(/упомянул\(а\)/gi, 'упомянул')
      .replace(/прокомментировал\(а\)/gi, 'прокомментировал')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }, [isNotificationBubble, message.content, message.metadata, message.notificationType, recoverMojibake]);
  const displayContent = isNotificationBubble ? normalizedNotificationContent : message.content;
  const notificationInlineContent = React.useMemo(() => {
    if (!isNotificationBubble) return '';
    return normalizedNotificationContent
      .replace(/\n+/g, ' • ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }, [isNotificationBubble, normalizedNotificationContent]);
  const notificationInlineSegments = React.useMemo(() => {
    if (!isNotificationBubble) return [] as Array<{ text: string; bold: boolean }>;

    const raw = notificationInlineContent || displayContent;
    const segments: Array<{ text: string; bold: boolean }> = [];
    const regex = /«[^»]+»/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(raw)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (start > lastIndex) {
        segments.push({ text: raw.slice(lastIndex, start), bold: false });
      }
      segments.push({ text: match[0], bold: true });
      lastIndex = end;
    }

    if (lastIndex < raw.length) {
      segments.push({ text: raw.slice(lastIndex), bold: false });
    }

    return segments.length > 0 ? segments : [{ text: raw, bold: false }];
  }, [isNotificationBubble, notificationInlineContent, normalizedNotificationContent, message.content]);
  const notificationDisplayLines = React.useMemo(() => {
    if (!isNotificationBubble) return [] as string[];

    const fromNewLines = normalizedNotificationContent
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (fromNewLines.length > 1) return fromNewLines;

    const fromBullets = (notificationInlineContent || normalizedNotificationContent)
      .split('•')
      .map((line) => line.trim())
      .filter(Boolean);

    return fromBullets.length > 0 ? fromBullets : [normalizedNotificationContent];
  }, [isNotificationBubble, normalizedNotificationContent, notificationInlineContent]);
  const normalizeStatusKey = React.useCallback((value: string) => value.trim().toLowerCase().replace(/\s+/g, '-'), []);
  const getStatusLabel = React.useCallback((value: string) => {
    const normalized = normalizeStatusKey(value);
    return TASK_STATUS_LABELS[normalized] || value;
  }, [normalizeStatusKey]);
  const getStatusBadgeClass = React.useCallback((value: string) => {
    const normalized = normalizeStatusKey(value);
    return TASK_STATUS_BADGE_CLASSES[normalized] || 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)]';
  }, [normalizeStatusKey]);
  const taskStatusTransition = React.useMemo(() => {
    if (!isNotificationBubble) return null;
    if (message.notificationType !== 'task_status_changed') return null;

    const fromMetaOld = String(message.metadata?.oldStatus || '').trim();
    const fromMetaNew = String(message.metadata?.newStatus || '').trim();

    if (fromMetaOld && fromMetaNew) {
      return { oldStatus: fromMetaOld, newStatus: fromMetaNew };
    }

    const parenthesizedMatch = normalizedNotificationContent.match(/\(([^()]+?)\s*(?:→|->)\s*([^()]+?)\)/);
    if (parenthesizedMatch) {
      return {
        oldStatus: String(parenthesizedMatch[1] || '').trim(),
        newStatus: String(parenthesizedMatch[2] || '').trim(),
      };
    }

    const inlineStatusMatch = normalizedNotificationContent.match(/(?:статус\s*:?\s*)([a-z\-\s]+|[а-яё\-\s]+)\s*(?:→|->)\s*([a-z\-\s]+|[а-яё\-\s]+)/i);
    if (inlineStatusMatch) {
      return {
        oldStatus: String(inlineStatusMatch[1] || '').trim(),
        newStatus: String(inlineStatusMatch[2] || '').trim(),
      };
    }

    return null;
  }, [isNotificationBubble, message.notificationType, message.metadata?.oldStatus, message.metadata?.newStatus, normalizedNotificationContent]);
  const taskStatusHeadline = React.useMemo(() => {
    if (!taskStatusTransition) return '';
    const firstLine = notificationDisplayLines[0] || normalizedNotificationContent;
    return firstLine.replace(/\s*\(([^()]+?)\s*→\s*([^()]+?)\)\s*$/, '').trim();
  }, [taskStatusTransition, notificationDisplayLines, normalizedNotificationContent]);
  const notificationActorName = React.useMemo(() => {
    if (!isNotificationBubble) return null;

    const source = `${normalizedNotificationContent} ${notificationInlineContent}`;
    const normalizeName = (value: string) => value
      .toLowerCase()
      .replace(/[^\p{L}\s-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const pickLastFullName = (value: string): string | null => {
      const fullNameRegex = /([\p{Lu}][\p{Ll}]+(?:-[\p{Lu}][\p{Ll}]+)?\s+[\p{Lu}][\p{Ll}]+(?:-[\p{Lu}][\p{Ll}]+)?)/gu;
      const matches = Array.from(value.matchAll(fullNameRegex));
      if (matches.length === 0) return null;
      return matches[matches.length - 1]?.[1] || null;
    };

    const patterns = [
      /(?:^|•\s*)([^•\n:]{2,80}?)\s+изменил\s+задачу/i,
      /(?:^|•\s*)([^•\n:]{2,80}?)\s+обновил\s+задачу/i,
    ];

    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (match?.[1]) {
        const cleaned = match[1].trim();
        const extractedFullName = pickLastFullName(cleaned);
        if (extractedFullName) return extractedFullName;
        if (cleaned && !/задача\s+изменена/i.test(cleaned)) {
          const normalized = normalizeName(cleaned);
          const normalizedWords = normalized.split(' ').filter(Boolean);
          if (normalizedWords.length >= 2) {
            const lastTwoWords = normalizedWords.slice(-2).join(' ');
            return lastTwoWords
              .split(' ')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
        }
      }
    }

    const fallbackName = pickLastFullName(source);
    if (fallbackName) return fallbackName;

    return null;
  }, [isNotificationBubble, normalizedNotificationContent, notificationInlineContent]);
  const notificationActorUser = React.useMemo(() => {
    if (!notificationActorName) return null;
    const normalizeName = (value: string) => value
      .toLowerCase()
      .replace(/[^\p{L}\s-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const actorNormalized = normalizeName(notificationActorName);

    const exactMatch = users.find((user) => normalizeName(String(user.name || '')) === actorNormalized);
    if (exactMatch) return exactMatch;

    const actorWords = actorNormalized.split(' ').filter(Boolean);
    if (actorWords.length >= 2) {
      const actorShort = actorWords.slice(0, 2).join(' ');
      const shortMatch = users.find((user) => {
        const userWords = normalizeName(String(user.name || '')).split(' ').filter(Boolean);
        return userWords.length >= 2 && userWords.slice(0, 2).join(' ') === actorShort;
      });
      if (shortMatch) return shortMatch;
    }

    return null;
  }, [notificationActorName, users]);
  const effectiveLinkedEventId = message.linkedEventId || message.metadata?.linkedEventId;
  const replyTo = message.replyToId 
    ? messages.find(m => m.id === message.replyToId)
    : null;
  const replyImageUrl = React.useMemo(() => {
    if (!replyTo) return '';

    const imageAttachment = (replyTo.attachments || []).find((attachment: any) => {
      if (attachment?.type !== 'image') return false;
      return Boolean(String(attachment?.url || '').trim());
    });

    if (imageAttachment?.url) return String(imageAttachment.url).trim();

    const replyUrls = String(replyTo.content || '').match(/(https?:\/\/[^\s<>"']+)/gi) || [];
    const replyImagePattern = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff?)(\?|$|#)/i;
    const replyImageUrlMatch = replyUrls.find((url) => replyImagePattern.test(url));
    return replyImageUrlMatch ? String(replyImageUrlMatch).trim() : '';
  }, [replyTo]);
  const replyPreviewText = React.useMemo(() => {
    if (!replyTo) return '';

    const content = String(replyTo.content || '').trim();
    if (content) {
      return content.length > 50 ? `${content.substring(0, 50)}...` : content;
    }

    if (replyImageUrl) return 'Фото';

    const attachmentsCount = Array.isArray(replyTo.attachments) ? replyTo.attachments.length : 0;
    if (attachmentsCount > 0) return `Вложений: ${attachmentsCount}`;

    return 'Сообщение';
  }, [replyTo, replyImageUrl]);
  
  // Получаем автора сообщения для аватара
  const messageAuthor = users.find(u => u.id === authorId);
  
  // Проверяем является ли это последнее сообщение в группе от одного автора
  const nextMessage = filteredMessages[index + 1];
  const nextAuthorId = nextMessage?.authorId || 'system';
  const isLastInGroup = !nextMessage || nextAuthorId !== authorId;
  
  // Проверяем нужен ли разделитель даты
  const previousMessage = index > 0 ? filteredMessages[index - 1] : undefined;
  const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
  const previousAuthorId = previousMessage?.authorId || 'system';
  const wasPreviousMyMessage = isCurrentUserMessageAuthor(previousAuthorId);
  const isSideSwitch = Boolean(previousMessage) && wasPreviousMyMessage !== isMyMessage;

  // Определяем тип контента: только эмоджи или текст
  const content = displayContent.trim();
  const hasBasicChars = /[0-9a-zA-Zа-яА-ЯёЁ#*\-_+=<>!?@$%^&()\[\]{}|\\/:;"'.,`~]/.test(content);
  const realEmojis = content.match(/(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\u{FE0F})?(?:\u{200D}(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\u{FE0F})?)*/gu) || [];
  const isOnlyEmojis = !hasBasicChars && realEmojis.length > 0 && realEmojis.join('') === content.replace(/\s/g, '');
  const emojiCount = isOnlyEmojis ? realEmojis.length : 0;
  
  // Проверяем, является ли сообщение только картинкой (без текста)
  const hasOnlyImages = !message.content.trim() && message.attachments?.every(att => att.type === 'image');
  const hasOnlyAttachments = !message.content.trim() && message.attachments && message.attachments.length > 0 && !hasOnlyImages;
  
  const isLargeEmoji = emojiCount === 1;
  const isMediumEmoji = emojiCount >= 2 && emojiCount <= 5;
  const hasBackground = !isOnlyEmojis && !hasOnlyImages && !hasOnlyAttachments;
  const ownMessageAlignClass = isNotificationBubble
    ? 'justify-start'
    : isMyMessage
      ? 'justify-end'
      : 'justify-start';
  const rowPaddingClass = isNotificationBubble ? 'mx-0' : (isDesktopView ? 'md:px-2 md:-mx-2' : 'mx-0');
  const isGroupChatForAvatar = !!(selectedChat?.isGroup || (selectedChat?.participantIds?.length ?? 0) > 2);
  // Show avatar on mobile only in group chats; always show on desktop (md+)
  const avatarVisibilityClass = isNotificationBubble ? 'hidden' : (isGroupChatForAvatar ? 'flex' : 'hidden md:flex');
  const bubbleBoxClass = isNotificationBubble
    ? 'w-full max-w-[94%] md:max-w-[82%]'
    : hasOnlyImages
      ? (isDesktopView ? 'max-w-[78%] lg:max-w-[72%]' : 'max-w-[85%]')
      : (isDesktopView ? 'max-w-[74%] lg:max-w-[68%]' : 'max-w-[75%]');
  const bubbleOverflowClass = isNotificationBubble ? 'overflow-visible' : 'overflow-hidden';
  // Всегда используем полноценные эффекты (как в Signal/Telegram)
  const shouldUseFlatBubbleSurface = false;
  const notificationSurfaceClass = shouldUseFlatBubbleSurface
    ? (theme === 'dark'
      ? 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'
      : 'bg-white border-gray-300')
    : (theme === 'dark'
      ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20 hover:border-blue-500/40 transition-colors'
      : 'bg-gradient-to-r from-orange-100 to-amber-100 border-orange-200 hover:border-orange-300 transition-colors');
  const notificationTextClass = theme === 'dark' ? 'text-[var(--text-primary)]' : 'text-gray-800';
  const notificationActionClass = theme === 'dark'
    ? 'bg-blue-500/15 hover:bg-blue-500/25 border-blue-500/30 text-blue-400'
    : 'bg-blue-500/15 hover:bg-blue-500/25 border-blue-500/30 text-blue-600';
  const telegramUnreadCheckClass = useDarkTextOnBubble ? 'text-gray-700/85' : 'text-white/80';
  const telegramReadCheckClass = 'text-[#53bdeb]';
  const checkIconSizeClass = isDesktopView ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5';

  const renderTelegramChecks = (isRead: boolean, compact = false) => {
    const iconClass = compact ? 'w-2.5 h-2.5 md:w-3 md:h-3' : checkIconSizeClass;
    const pairWrapClass = compact
      ? 'w-[16px] md:w-[18px] h-2.5 md:h-3'
      : (isDesktopView ? 'w-[20px] h-3.5' : 'w-[16px] h-2.5');
    const secondCheckLeftClass = compact
      ? 'left-[4px] md:left-[5px]'
      : (isDesktopView ? 'left-[5px]' : 'left-[3px]');
    if (!isRead) {
      return <Check className={`${iconClass} ${telegramUnreadCheckClass}`} strokeWidth={2.2} />;
    }

    return (
      <span className={`relative inline-flex items-center ${pairWrapClass}`}>
        <Check className={`absolute left-0 top-1/2 -translate-y-1/2 ${iconClass} ${telegramReadCheckClass}`} strokeWidth={2.2} />
        <Check className={`absolute ${secondCheckLeftClass} top-1/2 -translate-y-1/2 ${iconClass} ${telegramReadCheckClass}`} strokeWidth={2.2} />
      </span>
    );
  };
  
  // Настройки стилей (Signal style: 18px radius, 4px in corner of last message in group)
  const bubbleRadius = 'rounded-[18px]';
  const mobileFontSize = chatSettings.fontSizeMobile || 15;
  const desktopFontSize = chatSettings.fontSize || 13;
  const bubbleOpacityRaw = Number(chatSettings?.bubbleOpacity ?? 0.92);
  const bubbleOpacity = Number.isFinite(bubbleOpacityRaw) ? Math.max(0.2, Math.min(1, bubbleOpacityRaw)) : 0.92;
  const fontSizeStyle = { fontSize: `${isDesktopView ? desktopFontSize : mobileFontSize}px`, lineHeight: isDesktopView ? '1.5' : '1.3' };

  const hexToRgba = (hex: string, alpha: number): string => {
    const normalized = String(hex || '').replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return hex;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const normalizeColorToRgba = (color: string, alpha: number): string => {
    const normalized = String(color || '').trim();
    if (!normalized) return color;

    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      return hexToRgba(normalized, alpha);
    }

    const rgbMatch = normalized.match(/^rgba?\(([^)]+)\)$/i);
    if (rgbMatch) {
      const parts = rgbMatch[1].split(',').map((part) => part.trim());
      const r = Number.parseFloat(parts[0] || '0');
      const g = Number.parseFloat(parts[1] || '0');
      const b = Number.parseFloat(parts[2] || '0');
      if ([r, g, b].every((value) => Number.isFinite(value))) {
        return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
      }
    }

    return normalized;
  };

  const resolveColorToRgba = (inputColor: string, alpha: number, fallbackHex: string): string => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return hexToRgba(fallbackHex, alpha);
    }

    try {
      const probe = document.createElement('span');
      probe.style.color = inputColor;
      probe.style.position = 'absolute';
      probe.style.left = '-9999px';
      probe.style.width = '0';
      probe.style.height = '0';
      document.body.appendChild(probe);

      const resolved = getComputedStyle(probe).color;
      probe.remove();

      const rgbMatch = resolved.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if (rgbMatch) {
        return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`;
      }
    } catch {
    }

    return hexToRgba(fallbackHex, alpha);
  };

  const ownBubbleColor = theme === 'dark' ? chatSettings.bubbleColor : chatSettings.bubbleColorLight;
  const opponentBubbleColor = theme === 'dark' 
    ? (chatSettings?.bubbleColorOpponent || '#1f2937') 
    : (chatSettings?.bubbleColorOpponentLight || '#e5e7eb');
  const ownBubbleTextColor = theme === 'dark'
    ? (chatSettings?.bubbleTextColor || '')
    : (chatSettings?.bubbleTextColorLight || '');
  const ownBubbleStyle = isMyMessage && hasBackground && !isNotificationBubble
    ? {
      backgroundColor: shouldUseFlatBubbleSurface ? resolveColorToRgba(ownBubbleColor, 1, '#545190') : hexToRgba(ownBubbleColor, bubbleOpacity),
      ...(shouldUseFlatBubbleSurface ? {} : { backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' })
    }
    : undefined;
  const opponentBubbleStyle = !isMyMessage && hasBackground && !isNotificationBubble && !message.isSystemMessage
    ? {
      backgroundColor: shouldUseFlatBubbleSurface ? resolveColorToRgba(opponentBubbleColor, 1, '#38414d') : hexToRgba(opponentBubbleColor, bubbleOpacity),
      ...(shouldUseFlatBubbleSurface ? {} : { backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' })
    }
    : undefined;
  const messageBubbleStyle = ownBubbleStyle || opponentBubbleStyle;
  
  // URL extraction
  const urls = displayContent.match(/(https?:\/\/[^\s<>"']+)/gi) || [];
  const imageExtPattern = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff?)(\?|$|#)/i;
  const imageUrls = urls.filter(url => imageExtPattern.test(url));
  const otherUrls = urls.filter(url => !imageExtPattern.test(url));
  const imageAttachments = React.useMemo(
    () => (message.attachments || []).filter(att => att.type === 'image'),
    [message.attachments]
  );
  const mergedImages = React.useMemo(() => {
    const ordered: Array<{ url: string; name?: string }> = [];
    const seen = new Set<string>();

    imageAttachments.forEach((att) => {
      const normalizedUrl = String(att?.url || '').trim();
      if (!normalizedUrl || seen.has(normalizedUrl)) return;
      seen.add(normalizedUrl);
      ordered.push({ url: normalizedUrl, name: att?.name });
    });

    imageUrls.forEach((url) => {
      const normalizedUrl = String(url || '').trim();
      if (!normalizedUrl || seen.has(normalizedUrl)) return;
      seen.add(normalizedUrl);
      ordered.push({ url: normalizedUrl });
    });

    return ordered;
  }, [imageAttachments, imageUrls]);
  const nonImageAttachments = React.useMemo(
    () => (message.attachments || []).filter(att => att.type !== 'image'),
    [message.attachments]
  );
  const needsRichTextFormatting = !isNotificationBubble && /(\*\*.+?\*\*|\*.+?\*|__.+?__|\[[^\]]+\]\([^)]+\)|https?:\/\/|@[a-zA-Zа-яА-ЯёЁ0-9_]+)/.test(displayContent);

  const formattedMessageHtml = React.useMemo(() => {
    if (!needsRichTextFormatting) return '';

    return formatMessageText(displayContent)
      .replace(
        /(https?:\/\/[^\s<>"']+)/gi,
        `<a href="$1" target="_blank" rel="noopener noreferrer" class="${isMyMessage ? (useDarkTextOnBubble ? 'text-gray-700 hover:text-gray-900' : 'text-white/80 hover:text-white') : 'text-blue-400 hover:text-blue-300'} underline">$1</a>`
      )
      .replace(
        /@([a-zA-Zа-яА-ЯёЁ0-9_]+(?:\s+[a-zA-Zа-яА-ЯёЁ0-9_]+)?)/g,
        `<span class="${isMyMessage ? (useDarkTextOnBubble ? 'text-gray-900 font-medium' : 'text-white font-medium') : 'text-blue-400 font-medium'}">@$1</span>`
      );
  }, [displayContent, needsRichTextFormatting, isMyMessage, useDarkTextOnBubble]);

  const renderSignalStyleImageGrid = React.useCallback((
    images: Array<{ url: string; name?: string }>,
    sourceKey: 'attachment' | 'url'
  ) => {
    if (!images.length) return null;

    const MAX_SHOWN = 4;
    const visibleImages = images.slice(0, MAX_SHOWN);
    const hiddenCount = Math.max(images.length - MAX_SHOWN, 0);
    const n = images.length;

    const imgCls = 'absolute inset-0 w-full h-full object-cover';
    const hoverCls = 'absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none';
    const wrapCls = 'mt-1 mb-1 overflow-hidden w-full max-w-[min(70vw,300px)] md:max-w-[300px]';

    const Tile = ({
      image, idx, isLast, className, style,
    }: {
      image: { url: string; name?: string };
      idx: number;
      isLast: boolean;
      className: string;
      style?: React.CSSProperties;
    }) => (
      <div
        key={`${sourceKey}-${idx}-${image.url}`}
        className={`relative group overflow-hidden bg-black/5 dark:bg-black/20 cursor-pointer ${className}`}
        style={style}
        onClick={() => { setCurrentImageUrl(image.url); setShowImageModal(true); }}
      >
        <img
          src={image.url}
          alt={image.name || 'Изображение'}
          loading="lazy"
          decoding="async"
          className={imgCls}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className={hoverCls} />
        {isLast && hiddenCount > 0 && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="text-white text-xl font-semibold">+{hiddenCount}</span>
          </div>
        )}
      </div>
    );

    // 1 image — full width
    if (n === 1) {
      return (
        <div className={wrapCls}>
          <div
            className="relative group rounded-2xl overflow-hidden bg-black/5 dark:bg-black/20 cursor-pointer"
            style={{ aspectRatio: '4/3', minHeight: 120, maxHeight: 300 }}
            onClick={() => { setCurrentImageUrl(images[0].url); setShowImageModal(true); }}
          >
            <img src={images[0].url} alt={images[0].name || 'Изображение'} loading="lazy" decoding="async" className={imgCls}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className={hoverCls} />
          </div>
        </div>
      );
    }

    // 2 images — side by side equal columns
    if (n === 2) {
      return (
        <div className={wrapCls}>
          <div className="flex gap-[2px] rounded-2xl overflow-hidden" style={{ height: 150 }}>
            <Tile image={visibleImages[0]} idx={0} isLast={false} className="flex-1" />
            <Tile image={visibleImages[1]} idx={1} isLast={true} className="flex-1" />
          </div>
        </div>
      );
    }

    // 3 images — Signal layout: big left + 2 small stacked right
    if (n === 3) {
      return (
        <div className={wrapCls}>
          <div className="flex gap-[2px] rounded-2xl overflow-hidden" style={{ height: 200 }}>
            <Tile image={visibleImages[0]} idx={0} isLast={false} className="flex-[3]" />
            <div className="flex-[2] flex flex-col gap-[2px]">
              <Tile image={visibleImages[1]} idx={1} isLast={false} className="flex-1 w-full" />
              <Tile image={visibleImages[2]} idx={2} isLast={true} className="flex-1 w-full" />
            </div>
          </div>
        </div>
      );
    }

    // 4+ images — 2×2 grid
    return (
      <div className={wrapCls}>
        <div className="grid grid-cols-2 gap-[2px] rounded-2xl overflow-hidden" style={{ height: 220 }}>
          {visibleImages.map((image, idx) => (
            <Tile
              key={`g-${idx}`}
              image={image}
              idx={idx}
              isLast={idx === visibleImages.length - 1}
              className="w-full h-full"
            />
          ))}
        </div>
      </div>
    );
  }, [setCurrentImageUrl, setShowImageModal]);

  const downloadAttachment = (attachment: any) => {
    if (!attachment?.url) return;

    const normalizedUrl = attachment.url.startsWith('http://') || attachment.url.startsWith('https://')
      ? attachment.url
      : attachment.url.startsWith('/')
        ? attachment.url
        : `/${attachment.url}`;

    const link = document.createElement('a');
    link.href = normalizedUrl;
    link.download = attachment.name || 'file';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <React.Fragment key={message.id}>
      {/* Разделитель даты */}
      {showDateSeparator && (
        <div className="flex justify-center my-6 select-none">
          <div className="px-2 py-0.5 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl border border-white/20 rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] flex items-center justify-center">
            <span className="text-[10px] font-medium text-[var(--text-muted)] leading-none">
              {formatMessageDate(new Date(message.createdAt))}
            </span>
          </div>
        </div>
      )}
      <div
        key={message.id}
        ref={(el) => { messageRefs.current[message.id] = el; }}
        className={`w-full flex ${ownMessageAlignClass} group ${rowPaddingClass} ${
          selectedMessages.has(message.id) ? 'bg-[var(--accent-primary)]/20' : ''
        } ${!isNotificationBubble && isSideSwitch ? 'mt-[9px] md:mt-[12px]' : ''}`}
        onClick={(e) => {
          if (isSelectionMode && !message.isDeleted) {
            e.stopPropagation();
            e.preventDefault();
            onSelectMessage(message.id);
          }
        }}
        onDoubleClick={(e) => {
          if (!message.isDeleted && !message.isSystemMessage) {
            e.stopPropagation();
            e.preventDefault();
            onDoubleClick(message.id);
          }
        }}
        onContextMenu={(e) => {
          if (!message.isDeleted && !message.isSystemMessage) {
            e.preventDefault();
            e.stopPropagation();
            onContextMenu(e, message);
          }
        }}
      >
        {/* Checkbox для выделения */}
        {(isSelectionMode || selectedMessages.has(message.id)) && !message.isDeleted && (
          <div className="absolute -right-8 top-1/2 -translate-y-1/2 z-10">
            <div 
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
                selectedMessages.has(message.id) 
                  ? 'bg-cyan-500 border-cyan-500' 
                  : 'border-[var(--text-muted)] hover:border-cyan-400'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectMessage(message.id);
              }}
            >
              {selectedMessages.has(message.id) && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
          </div>
        )}
        
        {/* Avatar - только на десктопе */}
        <div className={`${avatarVisibilityClass} flex-shrink-0 mr-2 self-start`}>
          <Avatar
            src={messageAuthor?.avatar}
            name={message.authorName || 'User'}
            size="sm"
            type={message.isSystemMessage ? 'notifications' : 'user'}
          />
        </div>

        {/* Attachments вынесены на уровень аватарки - только когда нет текста */}
        {message.attachments && message.attachments.length > 0 && message.attachments.filter(att => att.type !== 'image').length > 0 && !message.content.trim() && (
          <div className={`flex flex-col gap-2 ${isMyMessage ? '-mr-[75px] md:mr-2' : 'mr-2'} max-w-[80%] md:max-w-[400px]`}>
            {message.attachments.filter(att => att.type !== 'image').map((att, idx) => (
              <div key={idx}>
                {att.type === 'task' && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      const taskId = att.taskId || att.id;
                      if (taskId) {
                        window.location.href = `/todos?task=${taskId}`;
                      }
                    }}
                    className="group flex items-center gap-3 px-2.5 py-2 md:px-3 md:py-2.5 bg-gradient-to-br from-purple-500/20 via-purple-500/15 to-purple-500/20 dark:from-purple-500/20 dark:via-purple-500/15 dark:to-purple-500/20 rounded-xl md:rounded-2xl border-2 border-purple-500/50 dark:border-purple-400/30 hover:border-purple-500/70 dark:hover:border-purple-300/50 hover:shadow-lg hover:shadow-purple-500/25 dark:hover:shadow-purple-400/20 transition-all duration-300 w-full relative backdrop-blur-sm"
                  >
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 dark:from-purple-500 dark:to-purple-700 flex items-center justify-center flex-shrink-0 shadow-md transition-all duration-300">
                      <CheckSquare className="w-4 h-4 md:w-5 md:h-5 text-white drop-shadow-md" />
                    </div>
                    <div className="flex flex-col items-start min-w-0 flex-1 gap-1">
                      <span className="text-[10px] md:text-xs text-purple-700 dark:text-purple-400 font-bold uppercase tracking-wide">Задача</span>
                      <span className="text-sm md:text-base font-semibold text-purple-900 dark:text-purple-200 truncate max-w-[140px] md:max-w-[220px] leading-tight">{att.name}</span>
                      {(att.assignedToNames || att.assignedBy) && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {att.assignedBy && (
                            <div className="flex items-center gap-0.5">
                              <Avatar name={att.assignedBy} size="xs" className="ring-1 ring-purple-300 dark:ring-purple-500" />
                              <span className="text-[9px] text-purple-700 dark:text-purple-300">{att.assignedBy}</span>
                            </div>
                          )}
                          {att.assignedToNames && att.assignedToNames.length > 0 && (
                            <>
                              <span className="text-[9px] text-purple-600 dark:text-purple-400">→</span>
                              <div className="flex items-center -space-x-1">
                                {att.assignedToNames.slice(0, 3).map((name: string, i: number) => (
                                  <Avatar key={i} name={name} size="xs" className="ring-1 ring-purple-300 dark:ring-purple-500" />
                                ))}
                                {att.assignedToNames.length > 3 && (
                                  <span className="text-[9px] text-purple-700 dark:text-purple-300 ml-1">+{att.assignedToNames.length - 3}</span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] md:text-xs text-[var(--text-muted)] flex-shrink-0 self-end ml-2 font-medium">
                      {new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      {isMyMessage && <span className="inline-flex ml-0.5 align-middle">{renderTelegramChecks(isReadByOthers, true)}</span>}
                    </span>
                  </button>
                )}
                {att.type === 'event' && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      if (att.id) {
                        requestAnimationFrame(() => {
                          router.push(`/account?tab=calendar&event=${att.id}`);
                        });
                      }
                    }}
                    className="flex items-center gap-2 px-2.5 py-2 md:px-3 md:py-2.5 bg-green-500/20 dark:bg-green-500/15 rounded-lg md:rounded-xl border-2 border-green-500/60 dark:border-green-500/40 hover:bg-green-500/30 dark:hover:bg-green-500/25 hover:border-green-500/80 dark:hover:border-green-500/60 transition-all w-full"
                  >
                    <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg bg-green-500/30 dark:bg-green-500/25 flex items-center justify-center flex-shrink-0 border border-green-500/40">
                      <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-700 dark:text-green-400" />
                    </div>
                    <div className="flex flex-col items-start min-w-0 flex-1 gap-0.5">
                      <span className="text-[9px] md:text-[10px] text-green-700 dark:text-green-400 uppercase font-bold">Событие</span>
                      <span className="text-xs md:text-sm font-medium text-green-800 dark:text-green-300 truncate max-w-[120px] md:max-w-[200px]">{att.name}</span>
                      {att.organizerName && (
                        <div className="flex items-center gap-1">
                          <Avatar name={att.organizerName} size="xs" className="ring-1 ring-green-400 dark:ring-green-500" />
                          <span className="text-[9px] text-green-700 dark:text-green-300">{att.organizerName}</span>
                        </div>
                      )}
                    </div>
                  </button>
                )}
                {att.type === 'link' && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      if (att.url) {
                        requestAnimationFrame(() => {
                          window.open(att.url, '_blank');
                        });
                      }
                    }}
                    className={`flex flex-col items-start gap-1 px-3 py-2 rounded-xl border transition-colors w-full shadow-[var(--shadow-glass)] backdrop-blur-md ${
                      isMyMessage
                        ? 'bg-white/22 border-white/40 hover:bg-white/30'
                        : 'bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border-[var(--border-light)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)]'
                    }`}
                  >
                    <span className={`text-[10px] ${isMyMessage ? (useDarkTextOnBubble ? 'text-gray-800/80' : 'text-white/90') : 'text-[var(--accent-primary)]'}`}>Ссылка</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 backdrop-blur-md ${
                        isMyMessage ? 'bg-white/20 border-white/35' : 'bg-[var(--bg-glass-hover)] border-[var(--border-color)]'
                      }`}>
                        <LinkIcon className={`w-4 h-4 ${isMyMessage ? (useDarkTextOnBubble ? 'text-gray-800' : 'text-white') : 'text-[var(--accent-primary)]'}`} />
                      </div>
                      <span className={`text-sm font-medium truncate max-w-[160px] md:max-w-[240px] ${isMyMessage ? (useDarkTextOnBubble ? 'text-gray-900' : 'text-white') : 'text-[var(--text-primary)]'}`}>{att.name}</span>
                    </div>
                  </button>
                )}
                {(att.type === 'file' || att.type === 'document') && (
                  <div className="group inline-flex items-center gap-2 px-3 py-2 bg-white/50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 hover:bg-white/70 dark:hover:bg-slate-700/70 max-w-[280px] md:max-w-[320px] transition-all backdrop-blur-sm">
                    <div className="flex items-center gap-2.5 w-full min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                        {att.type === 'document' ? (
                          <FileText className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        ) : (
                          <File className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{att.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Документ</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          downloadAttachment(att);
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors flex-shrink-0"
                      >
                        <Download className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div 
          className={`${bubbleBoxClass} relative flex flex-col ${bubbleOverflowClass} ${message.linkedChatId && !isSelectionMode ? 'cursor-pointer' : ''}`}
          onClick={(e) => {
            if (!isSelectionMode && message.linkedChatId) {
              // Клик на системное сообщение с ссылкой на чат - переход к чату
              // Эта логика должна быть обработана родительским компонентом
            }
          }}
        >
          {/* Reply indicator */}
          {replyTo && (
            <div className="mb-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  scrollToMessage(replyTo.id);
                }}
                className="text-[10px] text-[var(--text-muted)] px-3 py-1 hover:text-blue-400 transition-colors inline-flex items-center gap-2 max-w-full"
                style={{ maxWidth: isMyMessage ? '220px' : '300px' }}
              >
                <Reply className="w-3 h-3 inline mr-1" />
                {replyImageUrl && (
                  <img
                    src={replyImageUrl}
                    alt="Миниатюра вложения"
                    className="w-8 h-8 rounded-md object-cover border border-[var(--border-light)] flex-shrink-0"
                    onClick={(event) => {
                      event.stopPropagation();
                      setCurrentImageUrl(replyImageUrl);
                      setShowImageModal(true);
                    }}
                  />
                )}
                <span className="truncate">
                  Ответ на: {replyPreviewText}
                </span>
              </button>
            </div>
          )}
          
          <div
            className={`${
              hasBackground
                ? `${
                    isNotificationBubble
                      ? `rounded-[18px] px-3 py-2 relative w-fit max-w-full border ${notificationSurfaceClass}`
                      : `${bubbleRadius} px-3 py-2 relative w-fit max-w-full`
                  } ${
                    isNotificationBubble
                      ? ''
                      : isMyMessage
                      ? `text-white ${isLastInGroup ? '!rounded-br-[6px]' : ''}`
                      : !isNotificationBubble && message.isSystemMessage
                        ? `bg-gradient-to-r from-orange-100 to-amber-100 dark:from-blue-500/10 dark:to-purple-500/10 border border-orange-200 dark:border-blue-500/20 hover:border-orange-300 dark:hover:border-blue-500/40 transition-colors ${isLastInGroup ? '!rounded-bl-[6px]' : ''}`
                        : `bg-[var(--bg-tertiary)] ${isLastInGroup ? '!rounded-bl-[6px]' : ''}`
                  } ${message.isDeleted ? 'opacity-60' : ''}`
                : ''
            }`}
            style={messageBubbleStyle}
          >
            {!isMyMessage && hasBackground && !isNotificationBubble && (
              <p className={`text-[10px] font-medium mb-0.5 select-none ${message.isSystemMessage ? 'text-orange-600 dark:text-purple-400' : 'text-[var(--accent-primary)] dark:text-gray-300'} flex items-center gap-1.5`}>
                <span>{message.authorName}</span>
                {selectedChat?.isGroup && authorId === selectedChat.creatorId && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-500 text-[9px]">
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Создатель
                  </span>
                )}
              </p>
            )}

            {/* Call card for voice/video calls */}
            {message.callInfo && !isNotificationBubble && (
              <div className="mb-2">
                <CallCard call={message.callInfo} isMyMessage={isMyMessage} />
              </div>
            )}

            {message.isDeleted ? (
              <p className="text-xs text-[var(--text-secondary)] italic">
                Сообщение удалено
              </p>
            ) : (
              <>
                {isLargeEmoji ? (
                  <div className="relative">
                    <p className={`${isDesktopView ? 'text-7xl' : 'text-5xl'} my-1 emoji-content emoji-native message-content`}>
                      {message.content}
                    </p>
                    <span className={`block text-right ${isDesktopView ? 'text-[11px]' : 'text-[9px]'} mt-1 ${isMyMessage ? 'text-[var(--text-muted)]' : 'text-[var(--text-muted)]'}`}>
                      {new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      {message.isEdited && <span className="ml-1">(изм.)</span>}
                    </span>
                  </div>
                ) : isMediumEmoji ? (
                  <div className="relative">
                    <p className={`${isDesktopView ? 'text-4xl' : 'text-3xl'} my-1 emoji-content emoji-native message-content`}>
                      {message.content}
                    </p>
                    <span className={`block text-right ${isDesktopView ? 'text-[11px]' : 'text-[9px]'} mt-1 ${isMyMessage ? 'text-[var(--text-muted)]' : 'text-[var(--text-muted)]'}`}>
                      {new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      {message.isEdited && <span className="ml-1">(изм.)</span>}
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="inline">
                      {isNotificationBubble ? (
                        <span className="block w-full min-w-0">
                          <span
                            className={`block min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere] text-left leading-tight ${notificationTextClass}`}
                          >
                            {taskStatusTransition ? (
                              <>
                                <span className="block text-[13px] md:text-sm font-semibold leading-tight">
                                  {taskStatusHeadline || 'Статус изменён'}
                                </span>
                                <span className="mt-1 inline-flex items-center gap-1.5 flex-wrap text-[11px] md:text-xs font-medium">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full border ${getStatusBadgeClass(taskStatusTransition.oldStatus)}`}>
                                    {getStatusLabel(taskStatusTransition.oldStatus)}
                                  </span>
                                  <span className="opacity-70">→</span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full border ${getStatusBadgeClass(taskStatusTransition.newStatus)}`}>
                                    {getStatusLabel(taskStatusTransition.newStatus)}
                                  </span>
                                </span>
                              </>
                            ) : notificationDisplayLines.length > 0 ? (
                              <>
                                <span className="block text-[13px] md:text-sm font-semibold leading-tight">
                                  {notificationDisplayLines[0]}
                                </span>
                                {notificationDisplayLines.slice(1).map((line, idx) => (
                                  <span key={idx} className="block text-[11px] md:text-xs font-medium opacity-90 leading-snug mt-0.5">
                                    {line}
                                  </span>
                                ))}
                              </>
                            ) : (
                              notificationInlineSegments.map((segment, idx) => (
                                <span key={idx} className={segment.bold ? 'font-semibold' : 'font-medium'}>
                                  {segment.text}
                                </span>
                              ))
                            )}
                          </span>
                          {(message.linkedTaskId || message.linkedPostId || message.linkedChatId || effectiveLinkedEventId) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (message.linkedTaskId) {
                                  window.location.href = `/account?tab=tasks&task=${message.linkedTaskId}`;
                                } else if (effectiveLinkedEventId) {
                                  window.location.href = `/account?tab=calendar&event=${effectiveLinkedEventId}`;
                                } else if (message.linkedPostId) {
                                  window.location.href = `/content-plan?post=${message.linkedPostId}`;
                                } else if (message.linkedChatId) {
                                  window.location.href = `/account?tab=messages&chat=${message.linkedChatId}`;
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border flex-shrink-0 md:ml-0 ${notificationActionClass}`}
                            >
                              {effectiveLinkedEventId && !message.linkedTaskId ? (
                                <Calendar className="w-3 h-3" />
                              ) : (
                                <CheckSquare className="w-3 h-3" />
                              )}
                              {message.linkedTaskId ? 'Открыть' : effectiveLinkedEventId ? 'Перейти' : message.linkedPostId ? 'Пост' : 'Чат'}
                            </button>
                          )}
                        </span>
                      ) : needsRichTextFormatting ? (
                        <>
                          <span
                            className={`message-content ${isMyMessage ? myBubbleTextClass : 'text-[var(--text-primary)]'} whitespace-pre-wrap [overflow-wrap:anywhere] ${isEditing ? 'bg-blue-500/10 -mx-2 -my-1 px-2 py-1 rounded border border-blue-400/30' : ''}`}
                            style={isMyMessage && ownBubbleTextColor ? { ...fontSizeStyle, color: ownBubbleTextColor } : fontSizeStyle}
                            dangerouslySetInnerHTML={{ __html: formattedMessageHtml }}
                          />
                          {!hasOnlyImages && !isOnlyEmojis && !hasOnlyAttachments && (
                            <span className="inline-flex items-baseline gap-0.5 ml-1.5 whitespace-nowrap select-none pointer-events-auto align-bottom">
                              <span className={`${isDesktopView ? 'text-[11px]' : 'text-[9px]'} select-none ${isMyMessage ? (useDarkTextOnBubble ? 'text-gray-700' : 'text-white/80') : 'text-[var(--text-muted)]'}`}>
                                {new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                {message.isEdited && <span className="ml-1">(изм.)</span>}
                              </span>
                              {isMyMessage && !message.isDeleted && renderTelegramChecks(isReadByOthers)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span
                          className={`message-content ${isMyMessage ? myBubbleTextClass : 'text-[var(--text-primary)]'} ${isNotificationBubble ? 'block max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] text-left text-[13px] md:text-sm leading-relaxed' : 'whitespace-pre-wrap [overflow-wrap:anywhere]'} ${isEditing ? 'bg-blue-500/10 -mx-2 -my-1 px-2 py-1 rounded border border-blue-400/30' : ''}`}
                          style={isMyMessage && ownBubbleTextColor ? { ...fontSizeStyle, color: ownBubbleTextColor } : fontSizeStyle}
                        >
                          {displayContent}
                          {!isNotificationBubble && !hasOnlyImages && !isOnlyEmojis && !hasOnlyAttachments && (
                            <span className="inline-flex items-baseline gap-0.5 ml-1.5 whitespace-nowrap select-none pointer-events-auto align-bottom">
                              <span className={`${isDesktopView ? 'text-[11px]' : 'text-[9px]'} select-none ${isMyMessage ? (useDarkTextOnBubble ? 'text-gray-700' : 'text-white/80') : 'text-[var(--text-muted)]'}`}>
                                {new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                {message.isEdited && <span className="ml-1">(изм.)</span>}
                              </span>
                              {isMyMessage && !message.isDeleted && renderTelegramChecks(isReadByOthers)}
                            </span>
                          )}
                        </span>
                      )}
                    </span>

                    {/* Кнопка перехода к задаче/публикации */}
                    {!isNotificationBubble && message.isSystemMessage && (message.linkedTaskId || message.linkedPostId || message.linkedChatId || effectiveLinkedEventId) && (
                      <div className="mt-3 mb-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (message.linkedTaskId) {
                              window.location.href = `/account?tab=tasks&task=${message.linkedTaskId}`;
                            } else if (effectiveLinkedEventId) {
                              window.location.href = `/account?tab=calendar&event=${effectiveLinkedEventId}`;
                            } else if (message.linkedPostId) {
                              window.location.href = `/content-plan?post=${message.linkedPostId}`;
                            } else if (message.linkedChatId) {
                              window.location.href = `/account?tab=messages&chat=${message.linkedChatId}`;
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors backdrop-blur-md ${
                            isMyMessage
                              ? 'bg-white/15 hover:bg-white/25 border border-white/30 text-white'
                              : 'bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {effectiveLinkedEventId && !message.linkedTaskId ? (
                            <Calendar className="w-3.5 h-3.5" />
                          ) : (
                            <CheckSquare className="w-3.5 h-3.5" />
                          )}
                          {message.linkedTaskId ? 'Открыть задачу' : effectiveLinkedEventId ? 'Открыть событие' : message.linkedPostId ? 'Открыть публикацию' : 'Открыть чат'}
                        </button>
                      </div>
                    )}

                    {/* Предпросмотр изображений (Signal-style grid) */}
                    {mergedImages.length > 0 && renderSignalStyleImageGrid(
                      mergedImages,
                      'attachment'
                    )}
                    
                    {/* Предпросмотр ссылок */}
                    {otherUrls.length > 0 && <LinkPreview url={otherUrls[0]} isMyMessage={isMyMessage} />}

                    {/* Attachments внутри bubble (file/video/task/event/link) */}
                    {message.attachments && message.attachments.length > 0 && nonImageAttachments.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2 mb-5 w-full">
                        {nonImageAttachments.map((att, idx) => (
                          <div key={idx} className="w-full">
                            {att.type === 'video' && att.url && (
                              <div className="w-full max-w-[260px] md:max-w-[300px]">
                                <video
                                  src={att.url}
                                  controls
                                  preload="metadata"
                                  playsInline
                                  className="w-full rounded-2xl bg-black"
                                  style={{ maxHeight: 220 }}
                                />
                                {att.name && (
                                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate px-1">{att.name}</div>
                                )}
                              </div>
                            )}
                            {att.type === 'task' && (
                              <button 
                                onClick={() => {
                                  const taskId = att.taskId || att.id;
                                  if (taskId) window.location.href = `/todos?task=${taskId}`;
                                }}
                                className="group w-full flex items-center gap-3 px-2.5 py-2 md:px-3 md:py-2.5 bg-gradient-to-br from-purple-500/20 via-purple-500/15 to-purple-500/20 dark:from-purple-500/20 dark:via-purple-500/15 dark:to-purple-500/20 rounded-xl md:rounded-2xl border-2 border-purple-500/50 dark:border-purple-400/30 hover:border-purple-500/70 dark:hover:border-purple-300/50 hover:shadow-lg hover:shadow-purple-500/25 dark:hover:shadow-purple-400/20 transition-all duration-300 backdrop-blur-md"
                              >
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 dark:from-purple-500 dark:to-purple-700 flex items-center justify-center flex-shrink-0 shadow-md transition-all duration-300">
                                  <CheckSquare className="w-4 h-4 md:w-5 md:h-5 text-white drop-shadow-md" />
                                </div>
                                <div className="flex flex-col items-start min-w-0 flex-1 gap-1">
                                  <span className="text-[10px] md:text-xs text-purple-700 dark:text-purple-400 font-bold uppercase tracking-wide">Задача</span>
                                  <span className="text-sm md:text-base font-semibold text-purple-900 dark:text-purple-200 truncate w-full leading-tight">{att.name}</span>
                                  {(att.assignedToNames || att.assignedBy) && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {att.assignedBy && (
                                        <div className="flex items-center gap-0.5">
                                          <Avatar name={att.assignedBy} size="xs" className="ring-1 ring-purple-300 dark:ring-purple-500" />
                                          <span className="text-[9px] text-purple-700 dark:text-purple-300">{att.assignedBy}</span>
                                        </div>
                                      )}
                                      {att.assignedToNames && att.assignedToNames.length > 0 && (
                                        <>
                                          <span className="text-[9px] text-purple-600 dark:text-purple-400">→</span>
                                          <div className="flex items-center -space-x-1">
                                            {att.assignedToNames.slice(0, 3).map((name: string, i: number) => (
                                              <Avatar key={i} name={name} size="xs" className="ring-1 ring-purple-300 dark:ring-purple-500" />
                                            ))}
                                            {att.assignedToNames.length > 3 && (
                                              <span className="text-[9px] text-purple-700 dark:text-purple-300 ml-1">+{att.assignedToNames.length - 3}</span>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </button>
                            )}
                            {att.type === 'event' && (
                              <button 
                                onClick={() => { if (att.id) window.location.href = `/account?tab=calendar&event=${att.id}`; }}
                                className="w-full flex items-center gap-2 px-2.5 py-2 md:px-3 md:py-2.5 bg-green-500/20 dark:bg-green-500/15 rounded-lg md:rounded-xl border-2 border-green-500/60 dark:border-green-500/40 hover:bg-green-500/30 dark:hover:bg-green-500/25 hover:border-green-500/80 dark:hover:border-green-500/60 transition-all backdrop-blur-md"
                              >
                                <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg bg-green-500/30 dark:bg-green-500/25 flex items-center justify-center flex-shrink-0 border border-green-500/40">
                                  <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-700 dark:text-green-400" />
                                </div>
                                <div className="flex flex-col items-start min-w-0 flex-1 gap-0.5">
                                  <span className="text-[9px] md:text-[10px] text-green-700 dark:text-green-400 uppercase font-bold">Событие</span>
                                  <span className="text-xs md:text-sm font-medium text-green-800 dark:text-green-300 truncate w-full">{att.name}</span>
                                  {att.organizerName && (
                                    <div className="flex items-center gap-1">
                                      <Avatar name={att.organizerName} size="xs" className="ring-1 ring-green-400 dark:ring-green-500" />
                                      <span className="text-[9px] text-green-700 dark:text-green-300">{att.organizerName}</span>
                                    </div>
                                  )}
                                </div>
                              </button>
                            )}
                            {att.type === 'link' && (
                              <button 
                                onClick={() => { if (att.url) window.open(att.url, '_blank'); }}
                                className={`w-full flex flex-col items-start gap-1 px-3 py-2 rounded-xl border transition-colors shadow-[var(--shadow-glass)] backdrop-blur-md ${
                                  isMyMessage
                                    ? 'bg-white/22 border-white/40 hover:bg-white/30'
                                    : 'bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border-[var(--border-light)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)]'
                                }`}
                              >
                                <span className={`text-[10px] ${isMyMessage ? (useDarkTextOnBubble ? 'text-gray-800/80' : 'text-white/90') : 'text-[var(--accent-primary)]'}`}>Ссылка</span>
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 backdrop-blur-md ${
                                    isMyMessage ? 'bg-white/20 border-white/35' : 'bg-[var(--bg-glass-hover)] border-[var(--border-color)]'
                                  }`}>
                                    <LinkIcon className={`w-4 h-4 ${isMyMessage ? (useDarkTextOnBubble ? 'text-gray-800' : 'text-white') : 'text-[var(--accent-primary)]'}`} />
                                  </div>
                                  <span className={`text-sm font-medium truncate flex-1 ${isMyMessage ? (useDarkTextOnBubble ? 'text-gray-900' : 'text-white') : 'text-[var(--text-primary)]'}`}>{att.name}</span>
                                </div>
                              </button>
                            )}
                            {(att.type === 'file' || att.type === 'document') && (
                              <div className="group w-full flex flex-col items-start gap-2 px-2.5 py-2 bg-gradient-to-br from-orange-500/20 via-red-500/15 to-orange-500/20 dark:from-orange-500/20 dark:via-red-500/15 dark:to-orange-500/20 rounded-xl border-2 border-orange-500/50 dark:border-orange-400/30 hover:border-orange-500/70 dark:hover:border-orange-300/50 max-w-[220px] md:max-w-[300px] hover:shadow-lg hover:shadow-orange-500/25 dark:hover:shadow-orange-400/20 transition-all duration-300 backdrop-blur-md">
                                <span className="text-[10px] md:text-xs text-orange-700 dark:text-orange-400 font-bold uppercase tracking-wide">{att.type === 'document' ? 'Документ' : 'Файл'}</span>
                                <div className="flex items-center gap-2.5 w-full min-w-0">
                                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 dark:from-orange-500 dark:to-red-600 flex items-center justify-center flex-shrink-0 shadow-md transition-all duration-300">
                                    {att.type === 'document' ? (
                                      <FileText className="w-4 h-4 md:w-5 md:h-5 text-white drop-shadow-md" />
                                    ) : (
                                      <File className="w-4 h-4 md:w-5 md:h-5 text-white drop-shadow-md" />
                                    )}
                                  </div>
                                  <span className="text-xs md:text-sm font-semibold text-gray-900 dark:text-[var(--text-primary)] truncate flex-1 min-w-0 leading-tight">{att.name}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      downloadAttachment(att);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-[10px] md:text-xs font-bold shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 flex items-center gap-1 flex-shrink-0"
                                  >
                                    <Download className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                    <span className="hidden md:inline">Скачать</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Изображения из attachments рендерятся в mergedImages */}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default MessageItem;
