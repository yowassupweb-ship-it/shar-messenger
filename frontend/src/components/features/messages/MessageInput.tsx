'use client';

import React from 'react';
import { Send, X, Paperclip, FileText, Link as LinkIcon, Calendar, Image, File, Upload, Smile, Check, Edit3, Reply, Loader2 } from 'lucide-react';
import Avatar from '@/components/common/data-display/Avatar';
import EmojiPicker from '@/components/common/overlays/EmojiPicker';
import { Chat, User, Message } from './types';

interface MessageInputProps {
  selectedChat: Chat | null;
  isDragging: boolean;
  attachments: any[];
  isUploadingAttachments: boolean;
  editingMessageId: string | null;
  replyToMessage: Message | null;
  showEmojiPicker: boolean;
  showAttachmentMenu: boolean;
  showMentionSuggestions: boolean;
  mentionQuery: string;
  users: User[];
  currentUser: User | null;
  composerContainerRef: React.RefObject<HTMLDivElement>;
  messageInputRef: React.RefObject<HTMLTextAreaElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  isUserActiveRef: React.MutableRefObject<boolean>;
  lastActivityTimeRef: React.MutableRefObject<number>;
  savedMessageText: string;
  
  setIsDragging: (value: boolean) => void;
  setAttachments: React.Dispatch<React.SetStateAction<any[]>>;
  setIsUploadingAttachments: (value: boolean) => void;
  setEditingMessageId: (value: string | null) => void;
  setNewMessage: (value: string) => void;
  setSavedMessageText: (value: string) => void;
  setReplyToMessage: (value: Message | null) => void;
  setShowEmojiPicker: (value: boolean) => void;
  setShowAttachmentMenu: (value: boolean) => void;
  setShowMentionSuggestions: (value: boolean) => void;
  
  handleTextSelection: (contextMenuPoint?: { x: number; y: number }) => void;
  handleMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleMessageKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  scrollToMessage: (messageId: string) => void;
  updateMessage: (messageId: string, content: string) => Promise<boolean>;
  sendMessage: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  selectedChat,
  isDragging,
  attachments,
  isUploadingAttachments,
  editingMessageId,
  replyToMessage,
  showEmojiPicker,
  showAttachmentMenu,
  showMentionSuggestions,
  mentionQuery,
  users,
  currentUser,
  composerContainerRef,
  messageInputRef,
  fileInputRef,
  isUserActiveRef,
  lastActivityTimeRef,
  savedMessageText,
  setIsDragging,
  setAttachments,
  setIsUploadingAttachments,
  setEditingMessageId,
  setNewMessage,
  setSavedMessageText,
  setReplyToMessage,
  setShowEmojiPicker,
  setShowAttachmentMenu,
  setShowMentionSuggestions,
  handleTextSelection,
  handleMessageChange,
  handleMessageKeyDown,
  scrollToMessage,
  updateMessage,
  sendMessage
}) => {
  const DEFAULT_CHROMIUM_IMAGE_FILENAME = 'image.png';
  const dragDepthRef = React.useRef(0);

  const hasFilePayload = React.useCallback((transfer: DataTransfer | null | undefined) => {
    if (!transfer?.types) return false;
    return Array.from(transfer.types).includes('Files');
  }, []);

  const getDroppedFiles = React.useCallback((transfer: DataTransfer | null | undefined): File[] => {
    if (!transfer || transfer.types[0] !== 'Files') return [];
    return Array.from(transfer.files || []);
  }, []);

  const normalizePastedFile = React.useCallback((item: DataTransferItem): File | null => {
    const file = item.getAsFile();
    if (!file) return null;

    if (file.type === 'image/png' && file.name === DEFAULT_CHROMIUM_IMAGE_FILENAME) {
      return new File([file], `screenshot-${Date.now()}.png`, {
        type: file.type,
        lastModified: file.lastModified,
      });
    }

    return file;
  }, []);

  const getCurrentNavOffset = React.useCallback(() => {
    if (typeof window === 'undefined') return 0;

    const getVisibleHeight = (selector: string) => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return 0;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return 0;
      }
      return Math.max(0, Math.round(el.getBoundingClientRect().height));
    };

    const mobileNavHeight = getVisibleHeight('.bottom-nav-fixed');
    const desktopNavHeight = getVisibleHeight('.desktop-navigation');
    return Math.max(
      mobileNavHeight > 0 ? mobileNavHeight + 2 : 0,
      desktopNavHeight > 0 ? desktopNavHeight + 2 : 0
    );
  }, []);

  const [composerBottomOffset, setComposerBottomOffset] = React.useState(() => getCurrentNavOffset());

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    let lastOffset = -1;
    const updateBottomOffset = () => {
      const nextOffset = getCurrentNavOffset();

      if (nextOffset !== lastOffset) {
        lastOffset = nextOffset;
        setComposerBottomOffset(nextOffset);
      }
    };

    updateBottomOffset();
    const rafId = requestAnimationFrame(updateBottomOffset);
    window.addEventListener('resize', updateBottomOffset);

    // Double rAF: wait for React to commit DOM changes (nav display:none) before reading
    const onChatSelectionChanged = () => {
      requestAnimationFrame(() => requestAnimationFrame(updateBottomOffset));
    };
    window.addEventListener('chat-selection-changed', onChatSelectionChanged);

    // MutationObserver: watches for nav class changes (flex ↔ hidden) in real time
    // Watches both mobile (.bottom-nav-fixed) and desktop (.desktop-navigation) navs
    const navObserver = new MutationObserver(() => requestAnimationFrame(updateBottomOffset));
    const observeNav = (selector: string) => {
      const el = document.querySelector(selector);
      if (el) navObserver.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
    };
    observeNav('.bottom-nav-fixed');
    observeNav('.desktop-navigation');

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateBottomOffset);
      window.removeEventListener('chat-selection-changed', onChatSelectionChanged);
      navObserver?.disconnect();
    };
  }, [getCurrentNavOffset]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const raf = requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('composer-resize', { detail: { offset: composerBottomOffset } }));
    });
    return () => cancelAnimationFrame(raf);
  }, [composerBottomOffset]);

  const recalculateTextareaHeight = React.useCallback((nextValue?: string) => {
    const textarea = messageInputRef.current;
    if (!textarea) return;

    if (typeof nextValue === 'string' && textarea.value !== nextValue) {
      textarea.value = nextValue;
    }

    textarea.style.height = 'auto';
    const minHeight = 44;
    const maxHeight = 120;
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = nextHeight >= maxHeight ? 'auto' : 'hidden';
  }, [messageInputRef]);

  const actionButtonClass = 'w-11 h-11 rounded-full bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] flex items-center justify-center transition-all duration-200 shadow-[var(--shadow-card)] border border-[var(--border-light)] backdrop-blur-xl flex-shrink-0 text-[var(--text-secondary)]';
  const attachmentButtonClass = 'w-11 h-11 rounded-full bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] flex items-center justify-center transition-all duration-200 shadow-[var(--shadow-card)] border border-[var(--border-light)] backdrop-blur-xl flex-shrink-0 text-[var(--text-primary)]';
  const hasComposerContextBlock = Boolean(editingMessageId || replyToMessage);
  const composerContextBlockClass = 'mb-1 h-[42px] px-3 rounded-[18px] bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border border-[var(--border-light)] shadow-[var(--shadow-card)] backdrop-blur-xl flex items-center justify-between gap-2';
  const composerContextCloseButtonClass = 'w-6 h-6 rounded-full hover:bg-[var(--bg-glass-hover)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0';
  const replyImageUrl = React.useMemo(() => {
    const imageAttachment = replyToMessage?.attachments?.find((attachment: any) => {
      if (attachment?.type !== 'image') return false;
      return Boolean(String(attachment?.url || '').trim());
    });
    return imageAttachment ? String(imageAttachment.url).trim() : '';
  }, [replyToMessage]);
  const replyPreviewText = React.useMemo(() => {
    const content = String(replyToMessage?.content || '').trim();
    if (content) {
      return content.length > 40 ? `${content.substring(0, 40)}...` : content;
    }

    if (replyImageUrl) return 'Фото';

    const attachmentCount = Array.isArray(replyToMessage?.attachments) ? replyToMessage.attachments.length : 0;
    if (attachmentCount > 0) {
      return `Вложений: ${attachmentCount}`;
    }

    return 'Сообщение';
  }, [replyToMessage, replyImageUrl]);

  const uploadAndAttachFiles = React.useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setIsUploadingAttachments(true);
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          setAttachments(prev => [...prev, {
            type: file.type.startsWith('image/') ? 'image' : 'file',
            name: file.name,
            url: uploadData.url
          }]);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
    setIsUploadingAttachments(false);
  }, [setAttachments, setIsUploadingAttachments]);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);

    const files = getDroppedFiles(e.dataTransfer);
    if (files.length > 0) {
      await uploadAndAttachFiles(files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await uploadAndAttachFiles(files);
    e.target.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const fileItems = Array.from(items).filter((item) => item.kind === 'file');
    if (fileItems.length === 0) return;

    const allVisual = fileItems.every((item) => {
      const typeRoot = item.type.split('/')[0];
      return typeRoot === 'image' || typeRoot === 'video';
    });

    const files = allVisual
      ? fileItems.map(normalizePastedFile).filter((file): file is File => Boolean(file))
      : [normalizePastedFile(fileItems[0])].filter((file): file is File => Boolean(file));

    if (files.length === 0) return;
    e.preventDefault();
    await uploadAndAttachFiles(files);
  };

  return (
    <div
      ref={composerContainerRef}
      className={`absolute left-0 right-0 z-30 px-[2px] md:px-4 lg:px-8 py-2 pb-[max(env(safe-area-inset-bottom,8px),8px)] bg-transparent ${
        isDragging ? 'scale-[1.02]' : ''
      }`}
      style={{ bottom: `${composerBottomOffset}px` }}
      onDragEnter={(e) => {
        if (!hasFilePayload(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        dragDepthRef.current += 1;
        setIsDragging(true);
      }}
      onDragOver={(e) => {
        if (!hasFilePayload(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (!hasFilePayload(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) {
          setIsDragging(false);
        }
      }}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-x-3 inset-y-0 bg-gradient-to-br from-blue-500/30 via-cyan-500/25 to-purple-500/30 border-4 border-blue-400/80 border-dashed rounded-[24px] flex items-center justify-center pointer-events-none z-50 shadow-2xl">
          <div className="text-center animate-bounce">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/40 to-cyan-500/40 border-4 border-blue-400/70 flex items-center justify-center shadow-lg">
              <Upload className="w-10 h-10 text-blue-300 animate-pulse" />
            </div>
            <p className="text-lg text-blue-300 font-bold mb-2">Отпустите файлы для загрузки</p>
            <p className="text-sm text-blue-300/90 mt-1">Изображения и документы</p>
          </div>
        </div>
      )}
      
      {/* Attachments preview */}
      {isUploadingAttachments && (
        <div className="mb-2 px-2 md:px-4 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-glass)] border border-[var(--border-color)] shadow-[var(--shadow-glass)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-primary)]" />
            <span>Загрузка вложений...</span>
          </div>
        </div>
      )}

      {!selectedChat?.isNotificationsChat && attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 px-2 md:px-4 lg:px-8">
          {attachments.map((att, idx) => (
            <div key={idx} className="bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-secondary)] flex items-center gap-2 shadow-[var(--shadow-glass)]">
              {att.type === 'task' && <FileText className="w-3 h-3" />}
              {att.type === 'link' && <LinkIcon className="w-3 h-3" />}
              {att.type === 'event' && <Calendar className="w-3 h-3" />}
              {att.type === 'image' && att.url ? (
                <img
                  src={att.url}
                  alt={att.name || 'Фото'}
                  className="w-8 h-8 rounded-md object-cover border border-[var(--border-light)]"
                />
              ) : null}
              {att.type === 'image' && !att.url && <Image className="w-3 h-3" />}
              {att.type === 'file' && <File className="w-3 h-3" />}
              <span>{att.name}</span>
              <button
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {selectedChat?.isNotificationsChat ? (
        <div className="flex justify-center items-center w-full px-2 md:px-4 lg:px-8">
          <button
            onClick={() => alert('Функция отключения звука будет реализована')}
            className="h-11 px-6 rounded-full bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 flex items-center justify-center gap-2 text-amber-400 font-medium transition-all shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
            Убрать звук
          </button>
        </div>
      ) : (
        <div className="flex gap-1 md:gap-2 items-end relative bg-[var(--bg-glass)]/70 backdrop-blur-xl md:bg-transparent md:backdrop-filter-none rounded-[26px] md:rounded-none p-1 md:p-0">
          {/* Emoji button */}
          {!selectedChat?.isNotificationsChat && (
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`${actionButtonClass} hidden md:flex`}
              >
                <Smile className="w-4 h-4" />
              </button>
              
              {showEmojiPicker && (
                <EmojiPicker
                  onEmojiSelect={(emoji) => {
                    if (messageInputRef.current) {
                      const start = messageInputRef.current.selectionStart || 0;
                      const end = messageInputRef.current.selectionEnd || 0;
                      const text = messageInputRef.current.value;
                      const newText = text.substring(0, start) + emoji + text.substring(end);
                      messageInputRef.current.value = newText;
                      const newCursorPos = start + emoji.length;
                      messageInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
                      messageInputRef.current.focus();
                      setNewMessage(newText);
                      recalculateTextareaHeight(newText);
                    }
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </div>
          )}
          
          {/* Attachment button */}
          {!selectedChat?.isNotificationsChat && (
            <button
              disabled={isUploadingAttachments}
              onClick={(e) => {
                if (typeof window !== 'undefined') {
                  const rect = e.currentTarget.getBoundingClientRect();
                  window.dispatchEvent(new CustomEvent('attachment-menu-anchor', {
                    detail: {
                      x: rect.left,
                      y: rect.top,
                    }
                  }));
                }
                setShowAttachmentMenu(!showAttachmentMenu);
              }}
              className={`${attachmentButtonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Paperclip className="w-4 h-4" />
            </button>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="*/*"
            className="hidden"
            onChange={handleFileInputChange}
          />
          
          {/* Input container */}
          <div className="flex-1 min-w-0 flex flex-col bg-transparent">
            {/* Edit indicator */}
            {editingMessageId && (
              <div className={composerContextBlockClass}>
                <button
                  onClick={() => messageInputRef.current?.focus()}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-blue-500 font-medium leading-[1.1]">Редактирование</p>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate leading-[1.1]">
                      {(messageInputRef.current?.value || '').trim() || 'Измените текст сообщения'}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setEditingMessageId(null);
                    setNewMessage(savedMessageText);
                    setSavedMessageText('');
                    recalculateTextareaHeight(savedMessageText);
                    messageInputRef.current?.focus();
                  }}
                  className={composerContextCloseButtonClass}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            
            {/* Reply indicator */}
            {replyToMessage && !editingMessageId && (
              <div className={composerContextBlockClass}>
                <button
                  onClick={() => scrollToMessage(replyToMessage.id)}
                  className="flex items-center gap-2 text-left hover:opacity-85 transition-opacity min-w-0 flex-1"
                >
                  <Reply className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  {replyImageUrl && (
                    <img
                      src={replyImageUrl}
                      alt="Миниатюра ответа"
                      className="w-7 h-7 rounded-md object-cover border border-[var(--border-light)] flex-shrink-0"
                    />
                  )}
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[11px] text-blue-500 font-medium leading-[1.1] truncate">Ответ: {replyToMessage.authorName}</p>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate leading-[1.1]">
                      {replyPreviewText}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setReplyToMessage(null);
                    recalculateTextareaHeight(messageInputRef.current?.value || '');
                    messageInputRef.current?.focus();
                  }}
                  className={composerContextCloseButtonClass}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            
            <textarea
              ref={messageInputRef}
              onMouseUp={(e) => {
                if (e.button === 0) {
                  handleTextSelection();
                }
              }}
              onFocus={() => {
                isUserActiveRef.current = true;
                lastActivityTimeRef.current = Date.now();
              }}
              onBlur={() => {
                setTimeout(() => {
                  isUserActiveRef.current = false;
                }, 500);
              }}
              onChange={handleMessageChange}
              onKeyDown={handleMessageKeyDown}
              onPaste={handlePaste}
              onWheel={(e) => {
                const textarea = e.currentTarget;
                if (textarea.scrollHeight <= textarea.clientHeight) return;

                const scrollingDown = e.deltaY > 0;
                const atTop = textarea.scrollTop <= 0;
                const atBottom = Math.ceil(textarea.scrollTop + textarea.clientHeight) >= textarea.scrollHeight;

                if ((scrollingDown && !atBottom) || (!scrollingDown && !atTop)) {
                  e.stopPropagation();
                }
              }}
              onTouchMove={(e) => {
                const textarea = e.currentTarget;
                if (textarea.scrollHeight > textarea.clientHeight) {
                  e.stopPropagation();
                }
              }}
              placeholder={selectedChat?.isNotificationsChat ? "Чат только для чтения" : editingMessageId ? "Редактируйте сообщение..." : "Сообщение..."}
              disabled={selectedChat?.isNotificationsChat}
              className="w-full px-4 py-2.5 bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border border-[var(--border-light)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-primary)] resize-none overflow-y-auto shadow-[var(--shadow-card)] backdrop-blur-xl disabled:opacity-50 disabled:cursor-not-allowed rounded-[22px]"
              style={{ minHeight: '44px', maxHeight: '120px', lineHeight: '20px', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
              rows={1}
            />

            {/* Mention suggestions */}
            {showMentionSuggestions && selectedChat?.isGroup && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-lg shadow-[var(--shadow-card)] max-h-48 overflow-y-auto z-50">
                {(() => {
                  const participants = users.filter(u => 
                    selectedChat.participantIds?.includes(u.id) && 
                    u.id !== currentUser?.id &&
                    (u.name?.toLowerCase().includes(mentionQuery) || 
                     u.username?.toLowerCase().includes(mentionQuery) ||
                     u.shortId?.toLowerCase().includes(mentionQuery))
                  );

                  if (participants.length === 0) {
                    return (
                      <div className="p-3 text-xs text-[var(--text-muted)] text-center">
                        Участники не найдены
                      </div>
                    );
                  }

                  return participants.map(user => (
                    <button
                      key={user.id}
                      onClick={() => {
                        const textarea = messageInputRef.current;
                        if (!textarea) return;
                        const cursorPos = textarea.selectionStart || 0;
                        const currentText = textarea.value;
                        const textBeforeCursor = currentText.substring(0, cursorPos);
                        const textAfterCursor = currentText.substring(cursorPos);
                        const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
                        
                        const mentionText = user.shortId || user.username || user.name || 'user';
                        const newText = 
                          textBeforeCursor.substring(0, lastAtSymbol) + 
                          '@' + mentionText + ' ' + 
                          textAfterCursor;
                        
                        textarea.value = newText;
                        setNewMessage(newText);
                        recalculateTextareaHeight(newText);
                        setShowMentionSuggestions(false);
                        messageInputRef.current?.focus();
                      }}
                      className="w-full p-2 flex items-center gap-2 hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                    >
                      <Avatar
                        src={user.avatar}
                        name={user.name || user.username || 'Пользователь'}
                        size="xs"
                        type="user"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                          {user.name || user.username || 'Пользователь'}
                        </p>
                        {user.shortId && (
                          <p className="text-[10px] text-[var(--text-muted)]">@{user.shortId}</p>
                        )}
                      </div>
                    </button>
                  ));
                })()}
              </div>
            )}
          </div>
          
          {/* Send/Save button */}
          {editingMessageId ? (
            <button
              onClick={() => {
                const messageText = messageInputRef.current?.value || '';
                void updateMessage(editingMessageId, messageText);
              }}
              disabled={isUploadingAttachments}
              className="w-11 h-11 rounded-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 border border-white/30 flex items-center justify-center text-white transition-all flex-shrink-0 shadow-[0_8px_32px_-8px_rgba(34,197,94,0.6),inset_0_1px_2px_rgba(255,255,255,0.2)] hover:shadow-[0_8px_40px_-8px_rgba(34,197,94,0.8),inset_0_1px_2px_rgba(255,255,255,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploadingAttachments ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            </button>
          ) : (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={sendMessage}
              disabled={selectedChat?.isNotificationsChat || isUploadingAttachments}
              className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 border border-[var(--border-light)] disabled:from-[var(--bg-glass)] disabled:to-[var(--bg-glass)] disabled:border-[var(--border-color)] flex items-center justify-center text-white disabled:text-[var(--text-muted)] transition-all flex-shrink-0 shadow-[0_8px_32px_-8px_rgba(59,130,246,0.6),inset_0_1px_2px_rgba(255,255,255,0.2)] hover:shadow-[0_8px_40px_-8px_rgba(59,130,246,0.8),inset_0_1px_2px_rgba(255,255,255,0.25)] disabled:shadow-none disabled:cursor-not-allowed"
            >
              {isUploadingAttachments ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageInput;
