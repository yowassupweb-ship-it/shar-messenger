'use client';

import React from 'react';
import { Check, X, Reply, Edit3, FileText, Calendar, Link as LinkIcon, File, Download, CheckSquare } from 'lucide-react';
import Avatar from '@/components/common/data-display/Avatar';
import LinkPreview from './LinkPreview';
import { Message, User, Chat } from './types';
import { formatMessageDate, shouldShowDateSeparator, formatMessageText } from './utils';

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
  onSelectMessage,
  onDoubleClick,
  onContextMenu,
  scrollToMessage,
  setCurrentImageUrl,
  setShowImageModal,
  router
}) => {
  // Защита от null authorId (для системных сообщений)
  const authorId = message?.authorId || 'system';
  const isMyMessage = authorId === currentUser?.id;
  const isEditing = editingMessageId === message.id;
  const replyTo = message.replyToId 
    ? messages.find(m => m.id === message.replyToId)
    : null;
  
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
  const wasPreviousMyMessage = previousAuthorId === currentUser?.id;
  const isSideSwitch = Boolean(previousMessage) && wasPreviousMyMessage !== isMyMessage;

  // Определяем тип контента: только эмоджи или текст
  const content = message.content.trim();
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
  
  // Настройки стилей
  const bubbleRadius = chatSettings.bubbleStyle === 'minimal' ? 'rounded-lg' : chatSettings.bubbleStyle === 'classic' ? 'rounded-2xl' : 'rounded-[18px]';
  const mobileFontSize = chatSettings.fontSizeMobile || 15;
  const desktopFontSize = chatSettings.fontSize || 13;
  const fontSizeStyle = { fontSize: `${isDesktopView ? desktopFontSize : mobileFontSize}px`, lineHeight: isDesktopView ? '1.5' : '1.3' };
  
  // URL extraction
  const urls = message.content.match(/(https?:\/\/[^\s<>"']+)/gi) || [];
  const imageExtPattern = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff?)(\?|$|#)/i;
  const imageUrls = urls.filter(url => imageExtPattern.test(url));
  const otherUrls = urls.filter(url => !imageExtPattern.test(url));

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
        className={`flex ${isMyMessage ? 'justify-end md:justify-start' : 'justify-start'} group transition-all duration-200 mx-0 md:px-2 md:-mx-2 ${
          selectedMessages.has(message.id) ? 'bg-[var(--accent-primary)]/20' : ''
        } ${isMyMessage ? 'message-animation-right md:message-animation-left' : 'message-animation-left'} ${isSideSwitch ? 'mt-[9px] md:mt-[12px]' : ''}`}
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
        <div className="hidden md:flex flex-shrink-0 mr-2 self-start">
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
                        requestAnimationFrame(() => {
                          router.push(`/todos?task=${taskId}`);
                        });
                      }
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 md:px-3 md:py-2 bg-cyan-500/10 dark:bg-cyan-500/10 rounded-lg md:rounded-xl border border-cyan-500/50 dark:border-cyan-500/30 hover:bg-cyan-500/20 dark:hover:bg-cyan-500/20 transition-colors w-full relative"
                  >
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-cyan-500/20 dark:bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3 h-3 md:w-4 md:h-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className="text-[9px] md:text-[10px] text-cyan-600 dark:text-cyan-400/70 uppercase">Задача</span>
                      <span className="text-xs md:text-sm font-medium text-cyan-700 dark:text-cyan-300 truncate max-w-[120px] md:max-w-[200px]">{att.name}</span>
                    </div>
                    <span className="text-[9px] md:text-[10px] text-[var(--text-muted)] flex-shrink-0 self-end ml-2">
                      {new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      {isMyMessage && <Check className="w-2.5 h-2.5 md:w-3 md:h-3 inline ml-0.5" />}
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
                    className="flex items-center gap-2 px-2 py-1.5 md:px-3 md:py-2 bg-green-500/10 dark:bg-green-500/10 rounded-lg md:rounded-xl border border-green-500/50 dark:border-green-500/30 hover:bg-green-500/20 dark:hover:bg-green-500/20 transition-colors w-full"
                  >
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-green-500/20 dark:bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-3 h-3 md:w-4 md:h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-[9px] md:text-[10px] text-green-600 dark:text-green-400/70 uppercase">Событие</span>
                      <span className="text-xs md:text-sm font-medium text-green-700 dark:text-green-300 truncate max-w-[120px] md:max-w-[200px]">{att.name}</span>
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
                    className="flex flex-col items-start gap-1 px-3 py-2 bg-purple-500/10 dark:bg-purple-500/10 rounded-xl border-2 border-purple-500/50 dark:border-purple-500/30 hover:bg-purple-500/20 dark:hover:bg-purple-500/20 transition-colors w-full"
                  >
                    <span className="text-[10px] text-purple-600 dark:text-purple-400/70">Ссылка</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 dark:bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <LinkIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300 truncate max-w-[160px] md:max-w-[240px]">{att.name}</span>
                    </div>
                  </button>
                )}
                {att.type === 'file' && (
                  <div className="inline-flex flex-col items-start gap-1 px-2 py-1.5 bg-orange-500/10 dark:bg-orange-500/10 rounded-xl border-2 border-orange-500/50 dark:border-orange-500/30 max-w-[200px] md:max-w-[280px]">
                    <span className="text-[9px] text-orange-600 dark:text-orange-400/70">Файл</span>
                    <div className="flex items-center gap-1.5 w-full min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-orange-500/20 dark:bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <File className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="text-xs font-medium text-[var(--text-primary)] truncate flex-1 min-w-0">{att.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          downloadAttachment(att);
                        }}
                        className="text-[10px] font-medium text-orange-600 dark:text-orange-400 hover:text-orange-500 dark:hover:text-orange-300 flex-shrink-0"
                      >
                        Скачать
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div 
          className={`max-w-[80%] md:max-w-[75%] lg:max-w-[65%] relative flex flex-col overflow-hidden ${message.linkedChatId && !isSelectionMode ? 'cursor-pointer' : ''}`}
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
                className="text-[10px] text-[var(--text-muted)] px-3 hover:text-blue-400 transition-colors inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ maxWidth: isMyMessage ? '200px' : '280px' }}
              >
                <Reply className="w-3 h-3 inline mr-1" />
                Ответ на: {replyTo.content.substring(0, 50)}...
              </button>
            </div>
          )}
          
          <div
            className={`${
              hasBackground
                ? `${bubbleRadius} px-2.5 py-1.5 md:px-3 md:py-2 relative w-fit max-w-full ${
                    isMyMessage
                      ? `text-white ${isLastInGroup ? 'rounded-br-sm md:rounded-br-[18px] md:rounded-bl-sm' : ''}`
                      : message.isSystemMessage
                        ? `bg-gradient-to-r from-orange-100 to-amber-100 dark:from-blue-500/10 dark:to-purple-500/10 border border-orange-200 dark:border-blue-500/20 hover:border-orange-300 dark:hover:border-blue-500/40 transition-colors ${isLastInGroup ? 'rounded-bl-sm' : ''}`
                        : `bg-[var(--bg-tertiary)] ${isLastInGroup ? 'rounded-bl-sm' : ''}`
                  } ${message.isDeleted ? 'opacity-60' : ''}`
                : ''
            }`}
            style={isMyMessage && hasBackground ? { backgroundColor: theme === 'dark' ? chatSettings.bubbleColor : chatSettings.bubbleColorLight } : undefined}
          >
            {!isMyMessage && hasBackground && (
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

            {message.isDeleted ? (
              <p className="text-xs text-[var(--text-secondary)] italic">
                Сообщение удалено
              </p>
            ) : (
              <>
                {isLargeEmoji ? (
                  <div className="relative">
                    <p 
                      className="text-5xl md:text-7xl my-1 emoji-content emoji-native message-content"
                      dangerouslySetInnerHTML={{ __html: message.content }}
                    />
                    <span className={`block text-right text-[9px] md:text-[11px] mt-1 ${isMyMessage ? 'text-[var(--text-muted)]' : 'text-[var(--text-muted)]'}`}>
                      {new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      {message.isEdited && <span className="ml-1">(изм.)</span>}
                    </span>
                  </div>
                ) : isMediumEmoji ? (
                  <div className="relative">
                    <p 
                      className="text-3xl md:text-4xl my-1 emoji-content emoji-native message-content"
                      dangerouslySetInnerHTML={{ __html: message.content }}
                    />
                    <span className={`block text-right text-[9px] md:text-[11px] mt-1 ${isMyMessage ? 'text-[var(--text-muted)]' : 'text-[var(--text-muted)]'}`}>
                      {new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      {message.isEdited && <span className="ml-1">(изм.)</span>}
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="inline">
                      <span
                        className={`message-content ${isMyMessage ? myBubbleTextClass : 'text-[var(--text-primary)]'} whitespace-pre-wrap [overflow-wrap:anywhere] ${isEditing ? 'bg-blue-500/10 -mx-2 -my-1 px-2 py-1 rounded border border-blue-400/30' : ''}`}
                        style={fontSizeStyle}
                        dangerouslySetInnerHTML={{
                          __html: formatMessageText(message.content)
                            .replace(
                              /(https?:\/\/[^\s<>"']+)/gi,
                              `<a href="$1" target="_blank" rel="noopener noreferrer" class="${isMyMessage ? (useDarkTextOnBubble ? 'text-gray-700 hover:text-gray-900' : 'text-white/80 hover:text-white') : 'text-blue-400 hover:text-blue-300'} underline">$1</a>`
                            )
                            .replace(
                              /@([a-zA-Zа-яА-ЯёЁ0-9_]+(?:\s+[a-zA-Zа-яА-ЯёЁ0-9_]+)?)/g,
                              `<span class="${isMyMessage ? (useDarkTextOnBubble ? 'text-gray-900 font-medium' : 'text-white font-medium') : 'text-blue-400 font-medium'}">@$1</span>`
                            )
                        }}
                      />
                      <span className="inline-block w-[80px] md:w-[90px]">&nbsp;</span>
                    </span>

                    {/* Кнопка перехода к задаче/публикации */}
                    {message.isSystemMessage && (message.linkedTaskId || message.linkedPostId) && (
                      <div className="mt-3 mb-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (message.linkedTaskId) {
                              window.location.href = `/todos?task=${message.linkedTaskId}`;
                            } else if (message.linkedPostId) {
                              window.location.href = `/content-plan?post=${message.linkedPostId}`;
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-medium transition-colors"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          {message.linkedTaskId ? 'Открыть задачу' : 'Открыть публикацию'}
                        </button>
                      </div>
                    )}

                    {/* Предпросмотр изображений из URL */}
                    {imageUrls.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {imageUrls.map((url, idx) => (
                          <div 
                            key={idx} 
                            className="relative group rounded-lg overflow-hidden bg-black/20 cursor-pointer"
                            onClick={() => {
                              setCurrentImageUrl(url);
                              setShowImageModal(true);
                            }}
                          >
                            <img 
                              src={url} 
                              alt="Изображение"
                              className="w-full h-auto max-h-64 object-cover hover:opacity-90 transition-opacity"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.parentElement!.style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Download className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Предпросмотр ссылок */}
                    {otherUrls.length > 0 && <LinkPreview url={otherUrls[0]} isMyMessage={isMyMessage} />}

                    {/* Attachments внутри bubble */}
                    {message.attachments && message.attachments.length > 0 && message.attachments.filter(att => att.type !== 'image').length > 0 && message.content.trim() && (
                      <div className="flex flex-col gap-2 mt-2 mb-5 w-full">
                        {message.attachments.filter(att => att.type !== 'image').map((att, idx) => (
                          <div key={idx} className="w-full">
                            {att.type === 'task' && (
                              <button 
                                onClick={() => {
                                  const taskId = att.taskId || att.id;
                                  if (taskId) window.location.href = `/todos?task=${taskId}`;
                                }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 md:px-3 md:py-2 bg-cyan-500/10 dark:bg-cyan-500/10 rounded-lg md:rounded-xl border border-cyan-500/50 dark:border-cyan-500/30 hover:bg-cyan-500/20 dark:hover:bg-cyan-500/20 transition-colors"
                              >
                                <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-cyan-500/20 dark:bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                                  <FileText className="w-3 h-3 md:w-4 md:h-4 text-cyan-600 dark:text-cyan-400" />
                                </div>
                                <div className="flex flex-col items-start min-w-0 flex-1">
                                  <span className="text-[9px] md:text-[10px] text-cyan-600 dark:text-cyan-400/70 uppercase">Задача</span>
                                  <span className="text-xs md:text-sm font-medium text-cyan-700 dark:text-cyan-300 truncate w-full">{att.name}</span>
                                </div>
                              </button>
                            )}
                            {att.type === 'event' && (
                              <button 
                                onClick={() => { if (att.id) window.location.href = `/account?tab=calendar&event=${att.id}`; }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 md:px-3 md:py-2 bg-green-500/10 dark:bg-green-500/10 rounded-lg md:rounded-xl border border-green-500/50 dark:border-green-500/30 hover:bg-green-500/20 dark:hover:bg-green-500/20 transition-colors"
                              >
                                <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-green-500/20 dark:bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                  <Calendar className="w-3 h-3 md:w-4 md:h-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex flex-col items-start min-w-0 flex-1">
                                  <span className="text-[9px] md:text-[10px] text-green-600 dark:text-green-400/70 uppercase">Событие</span>
                                  <span className="text-xs md:text-sm font-medium text-green-700 dark:text-green-300 truncate w-full">{att.name}</span>
                                </div>
                              </button>
                            )}
                            {att.type === 'link' && (
                              <button 
                                onClick={() => { if (att.url) window.open(att.url, '_blank'); }}
                                className="w-full flex flex-col items-start gap-1 px-3 py-2 bg-purple-500/10 dark:bg-purple-500/10 rounded-xl border-2 border-purple-500/50 dark:border-purple-500/30 hover:bg-purple-500/20 dark:hover:bg-purple-500/20 transition-colors"
                              >
                                <span className="text-[10px] text-purple-600 dark:text-purple-400/70">Ссылка</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 dark:bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                    <LinkIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                  </div>
                                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300 truncate flex-1">{att.name}</span>
                                </div>
                              </button>
                            )}
                            {att.type === 'file' && (
                              <div className="w-full flex flex-col items-start gap-1 px-2 py-1.5 bg-orange-500/10 dark:bg-orange-500/10 rounded-xl border-2 border-orange-500/50 dark:border-orange-500/30 max-w-[200px] md:max-w-[280px]">
                                <span className="text-[9px] text-orange-600 dark:text-orange-400/70">Файл</span>
                                <div className="flex items-center gap-1.5 w-full min-w-0">
                                  <div className="w-6 h-6 rounded-lg bg-orange-500/20 dark:bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                                    <File className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                                  </div>
                                  <span className="text-xs font-medium text-[var(--text-primary)] truncate flex-1 min-w-0">{att.name}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      downloadAttachment(att);
                                    }}
                                    className="text-[10px] font-medium text-orange-600 dark:text-orange-400 hover:text-orange-500 dark:hover:text-orange-300 flex-shrink-0"
                                  >
                                    Скачать
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Изображения из attachments */}
                    {message.attachments && message.attachments.filter(att => att.type === 'image').length > 0 && (
                      <div className="mt-2 mb-1">
                        <div className={`grid gap-1 ${message.attachments.filter(att => att.type === 'image').length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          {message.attachments.filter(att => att.type === 'image').map((att, idx) => (
                            <div 
                              key={idx}
                              className="relative group rounded-lg overflow-hidden bg-black/20 cursor-pointer"
                              onClick={() => {
                                setCurrentImageUrl(att.url);
                                setShowImageModal(true);
                              }}
                            >
                              <img 
                                src={att.url} 
                                alt={att.name || 'Изображение'}
                                className="w-full h-auto max-h-64 object-cover hover:opacity-90 transition-opacity rounded-lg"
                                style={{ maxWidth: message.attachments!.filter(a => a.type === 'image').length === 1 ? '300px' : '200px' }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center rounded-lg">
                                <Download className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Время и галочки */}
                    {!hasOnlyImages && !isOnlyEmojis && !hasOnlyAttachments && (
                      <span className="absolute bottom-0.5 right-2 flex items-center gap-0.5 select-none pointer-events-auto">
                        <span className={`text-[9px] md:text-[11px] select-none ${isMyMessage ? (useDarkTextOnBubble ? 'text-gray-700' : 'text-white/80') : 'text-[var(--text-muted)]'}`}>
                          {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {message.isEdited && <span className="ml-1">(изм.)</span>}
                        </span>
                        {isMyMessage && !message.isDeleted && (
                          <Check className={`w-2.5 h-2.5 md:w-3.5 md:h-3.5 ${useDarkTextOnBubble ? 'text-gray-700' : 'text-white/80'}`} />
                        )}
                      </span>
                    )}
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
