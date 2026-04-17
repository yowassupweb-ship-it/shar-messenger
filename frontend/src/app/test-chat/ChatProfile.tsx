'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { X, Image as ImageIcon, FileText, Link as LinkIcon, Bell, BellOff, Trash2, Archive, ChevronRight, Copy, Check, Video, File, Camera, UserPlus, UserMinus } from 'lucide-react';
import type { Chat, Message, User } from '@/components/features/messages/types';
import { getInitials } from './avatarUtils';

function getDiceBearAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

interface ChatProfileProps {
  chat: Chat;
  messages: Message[];
  users: User[];
  currentUser: User | null;
  onClose: () => void;
  onArchiveChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onToggleMute?: (chatId: string) => void;
  canManageGroup?: boolean;
  onAddParticipant?: (userId: string) => Promise<void>;
  onRemoveParticipant?: (userId: string) => Promise<void>;
  onUpdateChatAvatar?: (file: File) => Promise<void>;
  isMuted?: boolean;
  isMobile?: boolean;
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
  canManageGroup = false,
  onAddParticipant,
  onRemoveParticipant,
  onUpdateChatAvatar,
  isMuted = false,
  isMobile = false,
}: ChatProfileProps) {
  const [activeTab, setActiveTab] = useState<TabType>('media');
  const [linkCopied, setLinkCopied] = useState(false);
  const [mediaItems, setMediaItems] = useState<Message[]>([]);
  const [fileItems, setFileItems] = useState<Message[]>([]);
  const [linkItems, setLinkItems] = useState<Message[]>([]);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [participantActionBusy, setParticipantActionBusy] = useState<string | null>(null);

  const displayTitle = (chat as any).displayTitle || chat.title || 'Чат';
  const isGroupChat = !!(chat as any).isGroup || ((chat.participantIds?.length ?? 0) > 2);
  const participantCount = chat.participantIds?.length || 0;
  const availableUsers = users.filter(u =>
    String(u.id) !== String(currentUser?.id) &&
    !(chat.participantIds || []).some(pid => String(pid) === String(u.id))
  );

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

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onUpdateChatAvatar) return;
    try {
      setIsSavingAvatar(true);
      await onUpdateChatAvatar(file);
    } finally {
      setIsSavingAvatar(false);
      event.target.value = '';
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
              const canRemove = canManageGroup && String(pid) !== String(currentUser?.id) && !!onRemoveParticipant;

              return (
                <div
                  key={pid}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={userName}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <img
                      src={getDiceBearAvatarUrl(userName)}
                      alt={userName}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {userName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {String(pid) === String(currentUser?.id) ? 'Вы' : 'был(а) в сети недавно'}
                    </div>
                  </div>
                  {canRemove && (
                    <button
                      onClick={async () => {
                        if (!onRemoveParticipant) return;
                        if (!confirm(`Удалить ${userName} из группы?`)) return;
                        try {
                          setParticipantActionBusy(String(pid));
                          await onRemoveParticipant(String(pid));
                        } finally {
                          setParticipantActionBusy(null);
                        }
                      }}
                      disabled={participantActionBusy === String(pid)}
                      className="px-2 py-1 rounded-lg text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      title="Исключить участника"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}

            {canManageGroup && onAddParticipant && (
              <div className="mt-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-slate-800/70">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Добавить участника</div>
                {availableUsers.length === 0 ? (
                  <div className="text-xs text-gray-500 dark:text-gray-400">Нет доступных пользователей</div>
                ) : (
                  <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                    {availableUsers.map(u => {
                      const label = u.name || u.username || u.email || String(u.id);
                      return (
                        <button
                          key={u.id}
                          onClick={async () => {
                            try {
                              setParticipantActionBusy(String(u.id));
                              await onAddParticipant(String(u.id));
                            } finally {
                              setParticipantActionBusy(null);
                            }
                          }}
                          disabled={participantActionBusy === String(u.id)}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50"
                        >
                          <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{label}</span>
                          <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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
          <div className="relative w-24 h-24 mb-4">
            {chat.avatar ? (
              <img src={chat.avatar} alt={displayTitle} className="w-24 h-24 rounded-full object-cover shadow-lg" />
            ) : (
              <img
                src={getDiceBearAvatarUrl(displayTitle || chat.id)}
                alt={displayTitle}
                className="w-24 h-24 rounded-full shadow-lg"
              />
            )}
            {isGroupChat && canManageGroup && onUpdateChatAvatar && (
              <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center cursor-pointer shadow-lg hover:bg-blue-700 transition-colors">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isSavingAvatar}
                  onChange={handleAvatarFileChange}
                />
              </label>
            )}
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
