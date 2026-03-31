import { useEffect, useRef, useState } from 'react';
import { Send, Paperclip, Smile, X, Image as ImageIcon, File, Edit3, Plus, Play } from 'lucide-react';
import TextFormattingMenu from '@/components/features/messages/TextFormattingMenu';
import EmojiPicker from './EmojiPicker';

export interface ReplyMessage {
  id: string;
  text: string;
  author: string;
}

export interface AttachmentFile {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'video' | 'file';
  width?: number;
  height?: number;
}

interface ChatInputProps {
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  messageText: string;
  onMessageChange: (text: string) => void;
  onSendMessage: () => void;
  replyTo?: ReplyMessage | null;
  onCancelReply?: () => void;
  attachments?: AttachmentFile[];
  onAttachmentsChange?: (attachments: AttachmentFile[]) => void;
  editingMessageId?: string | null;
  onCancelEdit?: () => void;
}

export default function ChatInput({ 
  inputRef, 
  messageText, 
  onMessageChange, 
  onSendMessage,
  replyTo,
  onCancelReply,
  attachments = [],
  onAttachmentsChange,
  editingMessageId,
  onCancelEdit
}: ChatInputProps) {
  const localTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef ?? localTextareaRef;
  const composerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTextFormatMenu, setShowTextFormatMenu] = useState(false);
  const [formatMenuPosition, setFormatMenuPosition] = useState({ top: 0, left: 0 });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const generateVideoThumbnail = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      const cleanup = () => URL.revokeObjectURL(url);
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(video.videoWidth, 320);
          canvas.height = Math.min(video.videoHeight, 320);
          canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } catch (e) {
          reject(e);
        } finally {
          cleanup();
        }
      };
      video.onerror = () => { cleanup(); reject(new Error('video error')); };
      video.onloadedmetadata = () => { video.currentTime = Math.min(1, video.duration / 2); };
    });

  const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('image dimensions')); 
      img.src = dataUrl;
    });

  const getVideoDimensions = (file: File): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const width = video.videoWidth || 0;
        const height = video.videoHeight || 0;
        URL.revokeObjectURL(url);
        resolve({ width, height });
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('video dimensions'));
      };
      video.src = url;
    });

  const processFiles = async (files: FileList | File[]) => {
    if (!onAttachmentsChange) return;
    const fileArray = Array.from(files);
    const processed = await Promise.all(
      fileArray.map(async (file) => {
        const id = Math.random().toString(36).substr(2, 9);
        let type: 'image' | 'video' | 'file' = 'file';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        let preview: string | undefined;
        let width: number | undefined;
        let height: number | undefined;
        if (type === 'image') {
          preview = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onload = (e) => res(e.target?.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(file);
          });
          try {
            const dims = await getImageDimensions(preview);
            width = dims.width;
            height = dims.height;
          } catch {
            // ignore dimension detection errors
          }
        } else if (type === 'video') {
          preview = await generateVideoThumbnail(file).catch(() => undefined);
          try {
            const dims = await getVideoDimensions(file);
            width = dims.width;
            height = dims.height;
          } catch {
            // ignore dimension detection errors
          }
        }
        return { id, file, type, preview, width, height } as AttachmentFile;
      })
    );
    onAttachmentsChange([...attachments, ...processed]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onAttachmentsChange) return;

    const items = Array.from(e.clipboardData?.items || []);
    if (items.length === 0) return;

    const pastedFiles: File[] = [];
    for (const item of items) {
      if (item.kind !== 'file') continue;
      const file = item.getAsFile();
      if (!file) continue;
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        pastedFiles.push(file);
      }
    }

    if (pastedFiles.length === 0) return;

    // Prevent browser from inserting non-text clipboard payload into textarea.
    e.preventDefault();
    await processFiles(pastedFiles);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onMessageChange(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  };

  const openTextMenu = (x: number, y: number, forceShow = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const hasSelection = textarea.selectionStart !== textarea.selectionEnd;
    if (!hasSelection && !forceShow) {
      setShowTextFormatMenu(false);
      return;
    }
    setFormatMenuPosition({ top: Math.max(12, y - 10), left: x });
    setShowTextFormatMenu(true);
  };

  const wrapSelection = (prefix: string, suffix = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = messageText.slice(start, end);
    const wrapped = `${prefix}${selected}${suffix}`;
    const next = messageText.slice(0, start) + wrapped + messageText.slice(end);
    onMessageChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  };

  const applyFormatting = async (format: 'bold' | 'italic' | 'underline' | 'link' | 'strikethrough' | 'code' | 'spoiler' | 'copy' | 'paste' | 'cut' | 'selectAll') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (format === 'copy') {
      const selected = messageText.slice(textarea.selectionStart, textarea.selectionEnd);
      if (selected) await navigator.clipboard.writeText(selected);
      return;
    }

    if (format === 'cut') {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = messageText.slice(start, end);
      if (selected) {
        await navigator.clipboard.writeText(selected);
        onMessageChange(messageText.slice(0, start) + messageText.slice(end));
      }
      return;
    }

    if (format === 'paste') {
      const pasted = await navigator.clipboard.readText();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      onMessageChange(messageText.slice(0, start) + pasted + messageText.slice(end));
      return;
    }

    if (format === 'selectAll') {
      textarea.focus();
      textarea.setSelectionRange(0, messageText.length);
      return;
    }

    if (format === 'bold') return wrapSelection('**');
    if (format === 'italic') return wrapSelection('_');
    if (format === 'underline') return wrapSelection('<u>', '</u>');
    if (format === 'strikethrough') return wrapSelection('~~');
    if (format === 'code') return wrapSelection('`');
    if (format === 'spoiler') return wrapSelection('||');
    if (format === 'link') {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = messageText.slice(start, end) || 'текст';
      const wrapped = `[${selected}](https://)`;
      const next = messageText.slice(0, start) + wrapped + messageText.slice(end);
      onMessageChange(next);
    }
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = messageText.slice(0, start) + emoji + messageText.slice(end);
    onMessageChange(next);
    setRecentEmojis(prev => [emoji, ...prev.filter(e => e !== emoji)].slice(0, 24));
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + emoji.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    if (!onAttachmentsChange) return;
    onAttachmentsChange(attachments.filter(a => a.id !== id));
  };

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!showEmojiPicker) return;
      const target = event.target as Node;
      if (composerRef.current && !composerRef.current.contains(target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmojiPicker]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // After send/edit-submit message text becomes empty.
    // Force composer back to baseline one-line height.
    if (!messageText.trim()) {
      textarea.style.height = '44px';
      textarea.scrollTop = 0;
      return;
    }

    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  }, [messageText, textareaRef]);

  return (
    <div 
      ref={composerRef} 
      className="px-0 pt-0 max-md:px-0 bg-transparent border-0 shadow-none pb-[max(calc(env(safe-area-inset-bottom)+5px),5px)] relative"
    >
      {/* Edit Preview */}
      {editingMessageId && (
        <div className="mx-3 mb-1.5 py-2 px-3 bg-orange-50 dark:bg-orange-900/20 border-l-[3px] border-orange-500 dark:border-orange-400 rounded-lg flex items-center gap-2.5">
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            <Edit3 className="w-3 h-3 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            <div className="text-[12px] md:text-[11px] font-semibold text-orange-600 dark:text-orange-400 leading-tight">
              Редактирование
            </div>
          </div>
          {onCancelEdit && (
            <button
              onClick={onCancelEdit}
              className="flex-shrink-0 p-0.5 hover:bg-orange-200 dark:hover:bg-orange-800/50 rounded transition-colors"
              title="Отменить редактирование"
            >
              <X className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
            </button>
          )}
        </div>
      )}
      
      {/* Signal-style attachment strip */}
      {attachments.length > 0 && (
        <div className="px-3 pt-2.5 pb-1">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-end">
            {attachments.map(attachment => (
              <div key={attachment.id} className="relative flex-shrink-0">
                {/* Image thumbnail */}
                {attachment.type === 'image' && (
                  <div className="w-[88px] h-[88px] rounded-2xl overflow-hidden bg-black/5 dark:bg-black/30">
                    {attachment.preview ? (
                      <img src={attachment.preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      </div>
                    )}
                  </div>
                )}
                {/* Video thumbnail */}
                {attachment.type === 'video' && (
                  <div className="w-[88px] h-[88px] rounded-2xl overflow-hidden bg-gray-900 dark:bg-black relative">
                    {attachment.preview && (
                      <img src={attachment.preview} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-9 h-9 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-4 h-4 text-white ml-0.5" fill="white" strokeWidth={0} />
                      </div>
                    </div>
                  </div>
                )}
                {/* Generic file card */}
                {attachment.type === 'file' && (
                  <div className="w-[88px] h-[88px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 flex flex-col items-center justify-center gap-1 p-2">
                    <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-slate-700 flex items-center justify-center">
                      <File className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="text-[9px] text-gray-500 dark:text-gray-400 text-center leading-tight w-full truncate">
                      {attachment.file.name}
                    </div>
                    <div className="text-[8px] text-gray-400 dark:text-gray-500">
                      {formatFileSize(attachment.file.size)}
                    </div>
                  </div>
                )}
                {/* Always-visible remove button */}
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-gray-800/85 dark:bg-black/75 text-white flex items-center justify-center hover:bg-gray-900 dark:hover:bg-black shadow-sm transition-colors"
                  title="Удалить"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {/* Add more button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 w-[88px] h-[88px] rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-1.5 text-gray-400 dark:text-gray-500 hover:border-blue-400 hover:text-blue-400 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              <Plus className="w-6 h-6" />
              <span className="text-[10px] font-medium">Добавить</span>
            </button>
          </div>
        </div>
      )}

      {/* Editing Preview */}
      {editingMessageId && (
        <div className="px-3 py-2 mb-1 bg-orange-50/80 dark:bg-orange-900/30 backdrop-blur-sm rounded-lg mx-3 flex items-center gap-2.5">
          <div className="flex-1 min-w-0">
            <div className="text-[12px] md:text-[11px] font-medium text-orange-600 dark:text-orange-400 leading-tight">
              Редактирование сообщения
            </div>
            <div className="text-[14px] md:text-[13px] text-gray-700 dark:text-gray-300 truncate leading-tight mt-0.5">
              {messageText || 'Пустое сообщение'}
            </div>
          </div>
          {onCancelEdit && (
            <button
              onClick={onCancelEdit}
              className="flex-shrink-0 w-5 h-5 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400"
              title="Отменить редактирование"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Reply Preview */}
      {replyTo && !editingMessageId && (
        <div className="px-3 py-2 mb-1 bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-sm rounded-lg mx-3 flex items-center gap-2.5">
          <div className="flex-1 min-w-0">
            <div className="text-[12px] md:text-[11px] font-medium text-blue-600 dark:text-blue-400 leading-tight">
              {replyTo.author}
            </div>
            <div className="text-[14px] md:text-[13px] text-gray-700 dark:text-gray-300 truncate leading-tight mt-0.5">
              {replyTo.text}
            </div>
          </div>
          {onCancelReply && (
            <button
              onClick={onCancelReply}
              className="flex-shrink-0 w-5 h-5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400"
              title="Отменить ответ"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 w-full px-[5px] py-0">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={messageText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onMouseUp={(e) => openTextMenu(e.clientX, e.clientY)}
            onContextMenu={(e) => {
              e.preventDefault();
              // Показываем меню форматирования при правом клике на пустой инпут
              const isEmpty = !messageText.trim();
              openTextMenu(e.clientX, e.clientY, isEmpty);
            }}
            placeholder="Введите сообщение..."
            className="w-full pl-12 md:pl-11 pr-12 md:pr-11 py-2.5 md:py-2 min-h-[44px] md:min-h-[40px] text-[15px] md:text-[13px] text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-[24px] md:rounded-[22px] focus:outline-none focus:border-gray-300 dark:focus:border-gray-600 resize-none overflow-y-auto scrollbar-hide leading-5 md:leading-5 block placeholder:select-none"
            style={{
              maxHeight: '200px',
            }}
            rows={1}
          />
          <button
            onClick={() => setShowEmojiPicker(prev => !prev)}
            className="absolute left-3.5 md:left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title="Эмодзи"
          >
            <Smile className="w-5 h-5 md:w-[18px] md:h-[18px]" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute right-3.5 md:right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title="Прикрепить файл"
          >
            <Paperclip className="w-[18px] h-[18px] md:w-[16px] md:h-[16px]" />
          </button>
        </div>

        <div className="flex-shrink-0">
          <button
            onClick={onSendMessage}
            disabled={!messageText.trim() && attachments.length === 0}
            className="w-11 h-11 md:w-10 md:h-10 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 flex items-center justify-center transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed"
            title={editingMessageId ? "Сохранить" : "Отправить"}
          >
            <Send className="w-[18px] h-[18px] md:w-[16px] md:h-[16px]" />
          </button>
        </div>
      </div>

      <TextFormattingMenu
        showTextFormatMenu={showTextFormatMenu}
        formatMenuPosition={formatMenuPosition}
        setShowTextFormatMenu={setShowTextFormatMenu}
        applyFormatting={applyFormatting}
      />

      {showEmojiPicker && (
        <div className="absolute bottom-[56px] left-[8px] z-50">
          <EmojiPicker recents={recentEmojis} onSelect={insertEmoji} />
        </div>
      )}
    </div>
  );
}
