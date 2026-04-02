import { X, Search, MessageSquare, Send } from 'lucide-react';
import type { Chat, Message, User } from '@/components/features/messages/types';
import { useState } from 'react';
import { getAvatarGradient, getChatAvatarUrl, getInitials, isFavoritesChat, isForwardTargetAllowed, isNotificationsChat } from './avatarUtils';
import { Star, Bell } from 'lucide-react';
interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  chats: Chat[];
  users: User[];
  currentUser: User | null;
  currentChatId: string | null;
  onForward: (targetChatId: string) => Promise<void>;
}

export default function ForwardMessageModal({
  isOpen,
  onClose,
  message,
  chats,
  users,
  currentUser,
  currentChatId,
  onForward,
}: ForwardMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [failedAvatarIds, setFailedAvatarIds] = useState<Set<string>>(new Set());

  if (!isOpen || !message) return null;

  const handleClose = () => {
    setSearchQuery('');
    setSelectedChatId(null);
    setIsSending(false);
    onClose();
  };

  const handleForward = async () => {
    if (!selectedChatId || isSending) return;
    
    setIsSending(true);
    try {
      await onForward(selectedChatId);
      handleClose();
    } catch (err) {
      console.error('[ForwardMessageModal] Error forwarding:', err);
      setIsSending(false);
    }
  };

  const filteredChats = chats
    .filter(chat => chat.id !== currentChatId) // Исключаем текущий чат
    .filter(chat => isForwardTargetAllowed(chat))
    .filter(chat => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const displayTitle = (chat as any).displayTitle || chat.title || 'Чат';
      return displayTitle.toLowerCase().includes(q);
    });

  const messagePreview = message.content?.slice(0, 100) || 'Без текста';

  return (
    <div className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-[2px] flex items-end md:items-center justify-center">
      <div className="w-full md:max-w-[560px] h-[86vh] md:h-[78vh] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 dark:border-slate-700 bg-gray-50/90 dark:bg-slate-800/80">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Переслать сообщение</h3>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-gray-200/70 dark:hover:bg-slate-700 flex items-center justify-center"
            title="Закрыть"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Сообщение:</div>
          <div className="text-sm text-gray-700 dark:text-gray-300 truncate">
            {messagePreview}
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск чатов"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredChats.map(chat => {
            const selected = selectedChatId === chat.id;
            const displayTitle = (chat as any).displayTitle || chat.title || 'Чат';
            const initials = getInitials(displayTitle);
            const avatarColor = getAvatarGradient(chat.id);
            const avatarUrl = getChatAvatarUrl(chat, currentUser, users);

            return (
              <label
                key={chat.id}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
                  selected
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500/60'
                    : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="forwardChat"
                  checked={selected}
                  onChange={() => setSelectedChatId(chat.id)}
                  className="w-4 h-4"
                />
                {isFavoritesChat(chat) ? (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-sm">
                    <Star className="w-5 h-5" fill="currentColor" strokeWidth={0} />
                  </div>
                ) : isNotificationsChat(chat) ? (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-sm">
                    <Bell className="w-5 h-5" />
                  </div>
                ) : avatarUrl && !failedAvatarIds.has(chat.id) ? (
                  <img
                    src={avatarUrl}
                    alt={displayTitle}
                    className="w-10 h-10 rounded-full object-cover"
                    onError={() => setFailedAvatarIds(prev => new Set(prev).add(chat.id))}
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor} text-white text-sm font-semibold flex items-center justify-center`}>
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {displayTitle}
                  </div>
                  {(chat as any).lastMessageContent && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {String((chat as any).lastMessageContent)}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
          {!filteredChats.length && (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Чаты не найдены
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50/90 dark:bg-slate-800/80 flex items-center gap-2">
          <button
            onClick={handleClose}
            className="flex-1 h-10 rounded-xl bg-gray-200 dark:bg-slate-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleForward}
            disabled={!selectedChatId || isSending}
            className="flex-1 h-10 rounded-xl bg-blue-500 text-sm font-medium text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isSending ? 'Отправка...' : 'Переслать'}
          </button>
        </div>
      </div>
    </div>
  );
}
