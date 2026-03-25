'use client';

import { useState, useEffect } from 'react';
import { X, Image as ImageIcon, FileText, Link as LinkIcon, Bell, BellOff, Trash2, Archive, ChevronRight, Copy, Check, Video, File } from 'lucide-react';
import type { Chat, Message, User } from '@/components/features/messages/types';

interface ChatProfileProps {
  chat: Chat;
  messages: Message[];
  users: User[];
  currentUser: User | null;
  onClose: () => void;
  onArchiveChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onToggleMute?: (chatId: string) => void;
  isMuted?: boolean;
  isMobile?: boolean;
}

const AVATAR_COLORS = [
  'from-blue-400 to-blue-600',
  'from-green-400 to-green-600',
  'from-purple-400 to-purple-600',
  'from-pink-400 to-pink-600',
  'from-orange-400 to-orange-600',
  'from-red-400 to-red-600',
  'from-teal-400 to-teal-600',
  'from-indigo-400 to-indigo-600',
];

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getAvatarColor(id: string): string {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

type TabType = 'media' | 'files' | 'links' | 'participants';

export default function ChatProfile({
  chat,
  messages,
  users,
  currentUser,
  onClose,
  onArchiveChat,
  onDeleteChat,
  onToggleMute,
  isMuted = false,
  isMobile = false,
}: ChatProfileProps) {
  const [activeTab, setActiveTab] = useState<TabType>('media');
  const [linkCopied, setLinkCopied] = useState(false);
  const [mediaItems, setMediaItems] = useState<Message[]>([]);
  const [fileItems, setFileItems] = useState<Message[]>([]);
  const [linkItems, setLinkItems] = useState<Message[]>([]);

  const displayTitle = (chat as any).displayTitle || chat.title || 'Чат';
  const isGroupChat = !!(chat as any).isGroup || ((chat.participantIds?.length ?? 0) > 2);
  const participantCount = chat.participantIds?.length || 0;

  useEffect(() => {
    const media: Message[] = [];
    const files: Message[] = [];
    const links: Message[] = [];

    messages.forEach(msg => {
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach(att => {
          if (att.type === 'image' || att.type === 'video') {
            media.push(msg);
          } else {
            files.push(msg);
          }
        });
      }

      const urlRegex = /(https?:\/\/[^\s]+)/g;
      if (msg.content && urlRegex.test(msg.content)) {
        links.push(msg);
      }
    });

    setMediaItems(media);
    setFileItems(files);
    setLinkItems(links);
  }, [messages]);

  const copyLink = async () => {
    try {
      const link = `${window.location.origin}/account?tab=messages&chatId=${chat.id}`;
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'media':
        if (mediaItems.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500">
              <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">Нет медиафайлов</p>
            </div>
          );
        }
        return (
          <div className="grid grid-cols-3 gap-1 p-2">
            {mediaItems.slice(0, 50).map((msg, idx) => {
              const attachment = msg.attachments?.[0];
              if (!attachment) return null;

              return (
                <div
                  key={`${msg.id}-${idx}`}
                  className="relative aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {attachment.type === 'image' ? (
                    <img
                      src={attachment.url}
                      alt="Media"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <Video className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      case 'files':
        if (fileItems.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500">
              <FileText className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">Нет файлов</p>
            </div>
          );
        }
        return (
          <div className="space-y-1 p-2">
            {fileItems.slice(0, 50).map((msg, idx) => {
              const attachment = msg.attachments?.[0];
              if (!attachment) return null;

              return (
                <div
                  key={`${msg.id}-${idx}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <File className="w-8 h-8 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {attachment.name || 'Файл'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'links':
        if (linkItems.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500">
              <LinkIcon className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">Нет ссылок</p>
            </div>
          );
        }
        return (
          <div className="space-y-1 p-2">
            {linkItems.slice(0, 50).map((msg, idx) => {
              const urlMatch = msg.content?.match(/(https?:\/\/[^\s]+)/);
              if (!urlMatch) return null;
              const url = urlMatch[0];

              return (
                <a
                  key={`${msg.id}-${idx}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <LinkIcon className="w-6 h-6 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                      {url}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(msg.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        );

      case 'participants':
        if (!isGroupChat) {
          return (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500">
              <p className="text-sm">Это личный чат</p>
            </div>
          );
        }
        return (
          <div className="space-y-1 p-2">
            {(chat.participantIds || []).map(pid => {
              const user = users.find(u => String(u.id) === String(pid));
              const userName = user?.name || user?.username || user?.email || pid;
              const avatarColor = getAvatarColor(String(pid));
              const initials = getInitials(userName);

              return (
                <div
                  key={pid}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${avatarColor} text-white font-semibold text-sm flex-shrink-0`}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {userName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {String(pid) === String(currentUser?.id) ? 'Вы' : 'был(а) в сети недавно'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  const content = (
    <>
      <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="font-semibold text-gray-900 dark:text-gray-100">Профиль</div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          title="Закрыть"
        >
          <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 flex flex-col items-center border-b border-gray-200 dark:border-gray-700">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br ${getAvatarColor(chat.id)} text-white font-bold text-3xl shadow-lg mb-4`}
          >
            {getInitials(displayTitle)}
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center mb-1">
            {displayTitle}
          </h2>
          {isGroupChat && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {participantCount} {participantCount === 1 ? 'участник' : 'участника'}
            </p>
          )}
          <button
            onClick={copyLink}
            className="mt-3 px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            {linkCopied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span>Скопировано</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Скопировать ссылку</span>
              </>
            )}
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800">
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'media'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Медиа ({mediaItems.length})
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'files'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Файлы ({fileItems.length})
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'links'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Ссылки ({linkItems.length})
          </button>
          {isGroupChat && (
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'participants'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Участники
            </button>
          )}
        </div>

        <div className="min-h-[200px]">
          {renderTabContent()}
        </div>

        <div className="p-4 space-y-2 border-t border-gray-200 dark:border-gray-700 mt-4">
          {onToggleMute && (
            <button
              onClick={() => onToggleMute(chat.id)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isMuted ? (
                  <BellOff className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                ) : (
                  <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {isMuted ? 'Включить уведомления' : 'Выключить уведомления'}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          )}

          <button
            onClick={() => {
              onArchiveChat(chat.id);
              onClose();
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Archive className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                В архив
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          <button
            onClick={() => {
              if (confirm('Удалить этот чат?')) {
                onDeleteChat(chat.id);
                onClose();
              }
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                Удалить чат
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative w-full max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col animate-slide-up">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-0 right-0 h-full w-[380px] max-w-[85vw] bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-gray-700 z-20 shadow-2xl flex flex-col">
      {content}
    </div>
  );
}
