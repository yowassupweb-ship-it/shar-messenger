'use client';

import React from 'react';
import { Send, X, Paperclip, FileText, Link as LinkIcon, Calendar, Image, File, Upload, Smile, Check, Edit3, Reply } from 'lucide-react';
import Avatar from '@/components/common/data-display/Avatar';
import EmojiPicker from '@/components/common/overlays/EmojiPicker';
import { Chat, User, Message } from './types';

interface MessageInputProps {
  selectedChat: Chat | null;
  isDragging: boolean;
  attachments: any[];
  editingMessageId: string | null;
  replyToMessage: Message | null;
  showEmojiPicker: boolean;
  showAttachmentMenu: boolean;
  showMentionSuggestions: boolean;
  mentionQuery: string;
  users: User[];
  currentUser: User | null;
  messageInputRef: React.RefObject<HTMLTextAreaElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  isUserActiveRef: React.MutableRefObject<boolean>;
  lastActivityTimeRef: React.MutableRefObject<number>;
  savedMessageText: string;
  
  setIsDragging: (value: boolean) => void;
  setAttachments: React.Dispatch<React.SetStateAction<any[]>>;
  setEditingMessageId: (value: string | null) => void;
  setNewMessage: (value: string) => void;
  setSavedMessageText: (value: string) => void;
  setReplyToMessage: (value: Message | null) => void;
  setShowEmojiPicker: (value: boolean) => void;
  setShowAttachmentMenu: (value: boolean) => void;
  setShowMentionSuggestions: (value: boolean) => void;
  
  handleTextSelection: () => void;
  handleMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleMessageKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  scrollToMessage: (messageId: string) => void;
  updateMessage: (messageId: string, content: string) => void;
  sendMessage: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  selectedChat,
  isDragging,
  attachments,
  editingMessageId,
  replyToMessage,
  showEmojiPicker,
  showAttachmentMenu,
  showMentionSuggestions,
  mentionQuery,
  users,
  currentUser,
  messageInputRef,
  fileInputRef,
  isUserActiveRef,
  lastActivityTimeRef,
  savedMessageText,
  setIsDragging,
  setAttachments,
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
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
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
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
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
        } else {
          alert('Ошибка загрузки файла');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Ошибка загрузки файла');
      }
    }
    e.target.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      } else if (item.type && item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length === 0) return;
    e.preventDefault();

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file, file.name || 'pasted-image');
      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          setAttachments(prev => [...prev, {
            type: file.type.startsWith('image/') ? 'image' : 'file',
            name: file.name || (file.type.startsWith('image/') ? 'pasted-image' : 'file'),
            url: uploadData.url
          }]);
        }
      } catch (error) {
        console.error('Error uploading pasted file:', error);
      }
    }
  };

  return (
    <div
      className={`absolute bottom-0 max-[785px]:bottom-0 min-[786px]:bottom-[50px] left-0 right-0 z-30 px-[2px] md:px-4 lg:px-8 py-2 pb-[max(env(safe-area-inset-bottom,8px),8px)] ${
        isDragging ? 'scale-[1.02]' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-x-3 inset-y-0 bg-gradient-to-br from-blue-500/30 via-cyan-500/25 to-purple-500/30 border-4 border-blue-400/80 border-dashed rounded-[24px] flex items-center justify-center pointer-events-none z-50 backdrop-blur-md shadow-2xl">
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
      {!selectedChat?.isNotificationsChat && attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 px-2 md:px-4 lg:px-8">
          {attachments.map((att, idx) => (
            <div key={idx} className="backdrop-blur-xl bg-[var(--bg-secondary)]/80 border border-[var(--border-color)]/30 rounded-lg px-3 py-1.5 text-xs text-[var(--text-secondary)] flex items-center gap-2 shadow-lg">
              {att.type === 'task' && <FileText className="w-3 h-3" />}
              {att.type === 'link' && <LinkIcon className="w-3 h-3" />}
              {att.type === 'event' && <Calendar className="w-3 h-3" />}
              {att.type === 'image' && <Image className="w-3 h-3" />}
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
            className="h-11 px-6 rounded-full backdrop-blur-xl bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 flex items-center justify-center gap-2 text-amber-400 font-medium transition-all shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
            Убрать звук
          </button>
        </div>
      ) : (
        <div className="flex gap-1 md:gap-2 items-center relative bg-transparent">
          {/* Emoji button */}
          {!selectedChat?.isNotificationsChat && (
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="hidden md:flex w-11 h-11 rounded-full bg-gradient-to-br from-white/15 to-white/5 items-center justify-center transition-all duration-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] border border-white/20 backdrop-blur-sm flex-shrink-0 text-gray-400/90"
              >
                <Smile className="w-5 h-5" />
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
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center transition-all duration-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] border border-white/20 backdrop-blur-sm flex-shrink-0 text-[var(--text-secondary)]"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />
          
          {/* Input container */}
          <div className="flex-1 min-w-0 flex flex-col bg-transparent">
            {/* Edit indicator */}
            {editingMessageId && (
              <div className="mb-1 px-3 py-1.5 backdrop-blur-xl bg-blue-500/20 border border-blue-400/30 rounded-t-[18px] rounded-b-[18px] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span className="text-[11px] text-blue-400 font-medium">Редактирование сообщения</span>
                </div>
                <button
                  onClick={() => {
                    setEditingMessageId(null);
                    setNewMessage(savedMessageText);
                    setSavedMessageText('');
                  }}
                  className="w-5 h-5 rounded-full hover:bg-white/10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            
            {/* Reply indicator */}
            {replyToMessage && !editingMessageId && (
              <div className="mx-1 mb-1 px-3 py-2 backdrop-blur-xl bg-[var(--bg-secondary)]/80 border border-white/10 rounded-[35px] flex items-center justify-between gap-2" style={{ maxHeight: '70%', overflowY: 'auto' }}>
                <button
                  onClick={() => scrollToMessage(replyToMessage.id)}
                  className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity min-w-0 flex-1"
                >
                  <Reply className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[10px] text-blue-400 font-medium truncate">{replyToMessage.authorName}</p>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate max-w-[200px]">
                      {replyToMessage.content.length > 40 ? replyToMessage.content.substring(0, 40) + '...' : replyToMessage.content}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => setReplyToMessage(null)}
                  className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            
            <textarea
              ref={messageInputRef}
              onSelect={handleTextSelection}
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
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.style.borderColor = 'rgb(59, 130, 246)';
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
              }}
              onPaste={handlePaste}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.style.borderColor = '';
                e.currentTarget.style.backgroundColor = '';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.style.borderColor = '';
                e.currentTarget.style.backgroundColor = '';
                
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                  const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
                  if (imageFiles.length > 0) {
                    const newAttachments = imageFiles.map(file => ({
                      file,
                      preview: URL.createObjectURL(file),
                      type: 'image' as const
                    }));
                    setAttachments(prev => [...prev, ...newAttachments]);
                  }
                }
              }}
              placeholder={selectedChat?.isNotificationsChat ? "Чат только для чтения" : editingMessageId ? "Редактируйте сообщение..." : "Сообщение..."}
              disabled={selectedChat?.isNotificationsChat}
              className={`w-full px-4 py-2.5 bg-gradient-to-br from-white/15 to-white/5 border border-white/20 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-white/30 resize-none overflow-hidden shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-xl disabled:opacity-50 disabled:cursor-not-allowed ${(replyToMessage && !editingMessageId) || editingMessageId ? 'rounded-b-[22px] rounded-t-none border-t-0' : 'rounded-[22px]'}`}
              style={{ minHeight: '44px', maxHeight: '120px', lineHeight: '20px', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              rows={1}
            />

            {/* Mention suggestions */}
            {showMentionSuggestions && selectedChat?.isGroup && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
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
                updateMessage(editingMessageId, messageText);
                if (messageInputRef.current) {
                  messageInputRef.current.value = savedMessageText;
                }
                setSavedMessageText('');
              }}
              className="w-11 h-11 rounded-full backdrop-blur-2xl bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 border border-white/30 flex items-center justify-center text-white transition-all flex-shrink-0 shadow-[0_8px_32px_-8px_rgba(34,197,94,0.6),inset_0_1px_2px_rgba(255,255,255,0.2)] hover:shadow-[0_8px_40px_-8px_rgba(34,197,94,0.8),inset_0_1px_2px_rgba(255,255,255,0.25)]"
            >
              <Check className="w-5 h-5" />
            </button>
          ) : (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={sendMessage}
              disabled={selectedChat?.isNotificationsChat}
              className="w-10 h-10 md:w-11 md:h-11 rounded-full backdrop-blur-2xl bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 border border-white/30 disabled:from-white/5 disabled:to-white/5 disabled:border-white/10 flex items-center justify-center text-white disabled:text-[var(--text-muted)] transition-all flex-shrink-0 shadow-[0_8px_32px_-8px_rgba(59,130,246,0.6),inset_0_1px_2px_rgba(255,255,255,0.2)] hover:shadow-[0_8px_40px_-8px_rgba(59,130,246,0.8),inset_0_1px_2px_rgba(255,255,255,0.25)] disabled:shadow-none disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageInput;
