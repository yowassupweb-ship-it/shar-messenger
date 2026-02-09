import React from 'react';
import { 
  ArrowLeft, 
  X, 
  Mail, 
  Edit3, 
  CheckSquare, 
  Plus, 
  Image, 
  File, 
  FileText, 
  LinkIcon,
  MessageCircle 
} from 'lucide-react';
import Avatar from '@/components/common/data-display/Avatar';
import { Chat, Message, User, Task } from './types';

export interface ChatInfoPanelProps {
  showChatInfo: boolean;
  setShowChatInfo: (show: boolean) => void;
  selectedChat: Chat | null;
  currentUser: User | null;
  users: User[];
  messages: Message[];
  tasks: Task[];
  chatInfoTab: string;
  setChatInfoTab: (tab: string) => void;
  setNewChatName: (name: string) => void;
  setShowRenameChatModal: (show: boolean) => void;
  setShowAddParticipantModal: (show: boolean) => void;
  removeParticipant: (participantId: string) => void;
  scrollToMessage: (messageId: string) => void;
  getChatAvatarData: (chat: Chat) => { avatar: string | undefined; name: string; type: 'user' | 'group' | 'favorites' | 'notifications' | 'system' };
  getChatTitle: (chat: Chat) => string;
}

const ChatInfoPanel: React.FC<ChatInfoPanelProps> = ({
  showChatInfo,
  setShowChatInfo,
  selectedChat,
  currentUser,
  users,
  messages,
  tasks,
  chatInfoTab,
  setChatInfoTab,
  setNewChatName,
  setShowRenameChatModal,
  setShowAddParticipantModal,
  removeParticipant,
  scrollToMessage,
  getChatAvatarData,
  getChatTitle,
}) => {
  if (!showChatInfo || !selectedChat) return null;

  // Определяем собеседника (не текущий пользователь)
  const otherParticipantId = selectedChat?.participantIds?.find(id => id !== currentUser?.id);
  const otherUser = otherParticipantId ? users.find(u => u.id === otherParticipantId) : null;
  
  // Статистика вложений
  const mediaCount = messages.filter(m => m.attachments?.some(a => a.type === 'image')).length;
  const fileCount = messages.filter(m => m.attachments?.some(a => a.type === 'file' || a.type === 'task')).length;
  const linkCount = messages.reduce((count, m) => {
    const attachmentLinks = (m.attachments || []).filter(a => a.type === 'link').length;
    const textLinks = (m.content.match(/(https?:\/\/[^\s<>"']+)/gi) || []).length;
    return count + attachmentLinks + textLinks;
  }, 0);
  
  // Общие задачи (где ОБА участника задействованы - один заказчик, другой исполнитель или наоборот)
  const sharedTasks = tasks.filter(task => {
    if (!otherUser || !currentUser) return false;
    
    // Получаем исполнителя (может быть assignedToId или assignedTo)
    const executorId = (task as any).assignedToId || task.assignedTo;
    // Получаем заказчика (может быть assignedById или authorId)
    const customerId = (task as any).assignedById || task.authorId;
    
    // Проверяем что ОБА участника задействованы в задаче
    const currentUserInvolved = executorId === currentUser.id || customerId === currentUser.id;
    const otherUserInvolved = executorId === otherUser.id || customerId === otherUser.id;
    
    return currentUserInvolved && otherUserInvolved;
  });

  return (
    <div className="fixed inset-0 z-50 lg:relative lg:inset-auto lg:z-auto w-full lg:w-80 lg:min-w-[320px] border-l-0 lg:border-l border-[var(--border-color)] flex flex-col bg-[var(--bg-secondary)] flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b border-[var(--border-color)] flex items-center px-4 gap-2 flex-shrink-0">
        <button
          onClick={() => setShowChatInfo(false)}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-all lg:hidden"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--text-primary)]" />
        </button>
        <span className="font-medium text-sm">{selectedChat?.isGroup ? 'Чат' : 'Профиль'}</span>
        <button
          onClick={() => setShowChatInfo(false)}
          className="ml-auto w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-all hidden lg:flex"
        >
          <X className="w-4 h-4 text-[var(--text-primary)]" />
        </button>
      </div>

      {/* Profile section */}
      <div className="p-4 border-b border-[var(--border-color)]">
        <div className="flex flex-col items-center">
          {(() => {
            const avatarData = getChatAvatarData(selectedChat!);
            return (
              <div className="mb-3">
                <Avatar
                  src={avatarData.avatar}
                  name={avatarData.name}
                  type={avatarData.type}
                  size="xl"
                />
              </div>
            );
          })()}
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg text-center">{getChatTitle(selectedChat!)}</h3>
            {/* Кнопка переименования - только для создателя группы */}
            {selectedChat?.isGroup && selectedChat.creatorId === currentUser?.id && (
              <button
                onClick={() => {
                  setNewChatName(selectedChat.title || '');
                  setShowRenameChatModal(true);
                }}
                className="w-6 h-6 rounded-full hover:bg-[var(--bg-tertiary)] flex items-center justify-center transition-colors"
                title="Переименовать чат"
              >
                <Edit3 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </button>
            )}
          </div>
          {selectedChat?.isGroup ? (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {selectedChat.participantIds?.length || 0} участник{(selectedChat.participantIds?.length || 0) === 1 ? '' : (selectedChat.participantIds?.length || 0) < 5 ? 'а' : 'ов'}
            </p>
          ) : otherUser && otherUser.email && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-[var(--text-secondary)]">
              <Mail className="w-3 h-3" />
              <span>{otherUser.email}</span>
            </div>
          )}
        </div>
        
        {/* Статистика вложений */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button
            onClick={() => setChatInfoTab('media')}
            className={`p-2 rounded-lg text-center transition-all ${chatInfoTab === 'media' ? 'bg-cyan-500/20' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)]'}`}
          >
            <p className="text-lg font-bold text-[var(--text-primary)]">{mediaCount}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Медиа</p>
          </button>
          <button
            onClick={() => setChatInfoTab('files')}
            className={`p-2 rounded-lg text-center transition-all ${chatInfoTab === 'files' ? 'bg-cyan-500/20' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)]'}`}
          >
            <p className="text-lg font-bold text-[var(--text-primary)]">{fileCount}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Файлы</p>
          </button>
          <button
            onClick={() => setChatInfoTab('links')}
            className={`p-2 rounded-lg text-center transition-all ${chatInfoTab === 'links' ? 'bg-cyan-500/20' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)]'}`}
          >
            <p className="text-lg font-bold text-[var(--text-primary)]">{linkCount}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Ссылки</p>
          </button>
        </div>
      </div>

      {/* Tab buttons */}
      <div className="overflow-x-auto border-b border-[var(--border-color)]" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className="flex min-w-max">
          <button
            onClick={() => setChatInfoTab('profile')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all whitespace-nowrap ${
              chatInfoTab === 'profile' 
                ? 'text-cyan-400 border-b-2 border-cyan-400' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            Задачи
          </button>
          {/* Вкладка Участники для групповых чатов */}
          {selectedChat?.isGroup && (
            <button
              onClick={() => setChatInfoTab('participants')}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all whitespace-nowrap ${
                chatInfoTab === 'participants' 
                  ? 'text-cyan-400 border-b-2 border-cyan-400' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              Участники
            </button>
          )}
          <button
            onClick={() => setChatInfoTab('media')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all whitespace-nowrap ${
              chatInfoTab === 'media' 
                ? 'text-cyan-400 border-b-2 border-cyan-400' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            Медиа
          </button>
          <button
            onClick={() => setChatInfoTab('files')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all whitespace-nowrap ${
              chatInfoTab === 'files' 
                ? 'text-cyan-400 border-b-2 border-cyan-400' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            Файлы
          </button>
          <button
            onClick={() => setChatInfoTab('links')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all whitespace-nowrap ${
              chatInfoTab === 'links' 
                ? 'text-cyan-400 border-b-2 border-cyan-400' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            Ссылки
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {chatInfoTab === 'profile' && (
          <div>
            {sharedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                <CheckSquare className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Нет общих задач</p>
                <p className="text-xs mt-1 text-center">Задачи, где вы оба участвуете, появятся здесь</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sharedTasks.slice(0, 10).map(task => (
                  <button
                    key={task.id}
                    onClick={() => window.location.href = `/todos?task=${task.id}`}
                    className="w-full p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        task.status === 'done' ? 'bg-green-500/20' : 
                        task.status === 'in_progress' ? 'bg-blue-500/20' : 'bg-gray-500/20'
                      }`}>
                        <CheckSquare className={`w-4 h-4 ${
                          task.status === 'done' ? 'text-green-400' : 
                          task.status === 'in_progress' ? 'text-blue-400' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{task.title}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                          {task.status === 'done' ? 'Выполнено' : 
                           task.status === 'in_progress' ? 'В работе' : 'Ожидает'}
                          {task.dueDate && ` • До ${new Date(task.dueDate).toLocaleDateString('ru-RU')}`}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
                {sharedTasks.length > 10 && (
                  <p className="text-center text-xs text-[var(--text-muted)] py-2">
                    И ещё {sharedTasks.length - 10} задач...
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Вкладка Участники */}
        {chatInfoTab === 'participants' && selectedChat?.isGroup && (
          <div className="pb-20">
            {/* Кнопка добавить участника - только для создателя */}
            {selectedChat.creatorId === currentUser?.id && (
              <button
                onClick={() => setShowAddParticipantModal(true)}
                className="w-full p-3 mb-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-sm text-[var(--text-primary)]">Добавить участника</span>
              </button>
            )}
            
            {/* Список участников */}
            <div className="space-y-2">
              {selectedChat.participantIds.map(participantId => {
                const participant = users.find(u => u.id === participantId);
                const isCreator = participantId === selectedChat.creatorId;
                const isCurrentUser = participantId === currentUser?.id;
                const canRemove = selectedChat.creatorId === currentUser?.id && !isCurrentUser;
                
                // Отладочное логирование
                if (isCurrentUser) {
                  console.log('DEBUG - Информация о создателе чата:', {
                    chatCreatorId: selectedChat.creatorId,
                    currentUserId: currentUser?.id,
                    participantId: participantId,
                    isCreator: isCreator,
                    canRemove: canRemove,
                    chatTitle: selectedChat.title
                  });
                }
                
                return (
                  <div key={participantId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
                    <Avatar
                      src={participant?.avatar}
                      name={participant?.name || participant?.username || 'Пользователь'}
                      size="sm"
                      type="user"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-primary)] truncate">
                        {participant?.name || participant?.username || 'Пользователь'}
                        {isCurrentUser && ' (вы)'}
                      </p>
                      {isCreator && (
                        <p className="text-[10px] text-cyan-400">Создатель группы</p>
                      )}
                    </div>
                    {canRemove && (
                      <button
                        onClick={() => removeParticipant(participantId)}
                        className="w-7 h-7 rounded-full hover:bg-red-500/20 flex items-center justify-center text-red-400"
                        title="Удалить из группы"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {chatInfoTab === 'media' && (
          <div className="pb-20">
            {(() => {
              const mediaItems = messages
                .filter(m => m.attachments?.some(a => a.type === 'image'))
                .flatMap(m => (m.attachments || []).filter(a => a.type === 'image').map(a => ({ ...a, messageId: m.id, date: m.createdAt })));
              
              if (mediaItems.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                    <Image className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">Нет медиафайлов</p>
                    <p className="text-xs mt-1 text-center">Фото и видео из этого чата будут отображаться здесь</p>
                  </div>
                );
              }
              
              return (
                <div className="grid grid-cols-3 gap-1">
                  {mediaItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => item.messageId && scrollToMessage(item.messageId)}
                      className="aspect-square rounded-lg bg-[var(--bg-tertiary)] overflow-hidden hover:opacity-80 transition-opacity relative group"
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Image className="w-6 h-6 text-[var(--text-muted)]" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[8px] text-white truncate">{item.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {chatInfoTab === 'files' && (
          <div className="pb-20">
            {(() => {
              const fileItems = messages
                .filter(m => m.attachments?.some(a => a.type === 'file' || a.type === 'task'))
                .flatMap(m => (m.attachments || []).filter(a => a.type === 'file' || a.type === 'task').map(a => ({ ...a, messageId: m.id, date: m.createdAt, authorName: m.authorName })));
              
              if (fileItems.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                    <File className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">Нет файлов</p>
                    <p className="text-xs mt-1 text-center">Документы из этого чата появятся здесь</p>
                  </div>
                );
              }
              
              return (
                <div className="space-y-2">
                  {fileItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (item.type === 'task' && (item.taskId || item.id)) {
                          window.location.href = `/todos?task=${item.taskId || item.id}`;
                        } else if (item.messageId) {
                          scrollToMessage(item.messageId);
                        }
                      }}
                      className="w-full p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          item.type === 'task' ? 'bg-cyan-500/20' : 'bg-orange-500/20'
                        }`}>
                          {item.type === 'task' ? (
                            <FileText className="w-5 h-5 text-cyan-400" />
                          ) : (
                            <File className="w-5 h-5 text-orange-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--text-primary)] truncate">{item.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {new Date(item.date).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {chatInfoTab === 'links' && (
          <div className="pb-20">
            {(() => {
              const linkItems: { url: string; name: string; messageId: string; date: string }[] = [];
              
              messages.forEach(m => {
                if (m.attachments) {
                  m.attachments.filter(a => a.type === 'link').forEach(a => {
                    linkItems.push({
                      url: a.url || '',
                      name: a.name || a.url || 'Ссылка',
                      messageId: m.id,
                      date: m.createdAt
                    });
                  });
                }
                
                const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
                const matches = m.content.match(urlRegex);
                if (matches) {
                  matches.forEach(url => {
                    if (!linkItems.some(l => l.url === url)) {
                      try {
                        const urlObj = new URL(url);
                        linkItems.push({ url, name: urlObj.hostname, messageId: m.id, date: m.createdAt });
                      } catch {
                        linkItems.push({ url, name: url.substring(0, 30), messageId: m.id, date: m.createdAt });
                      }
                    }
                  });
                }
              });
              
              if (linkItems.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                    <LinkIcon className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">Нет ссылок</p>
                    <p className="text-xs mt-1 text-center">Ссылки из этого чата появятся здесь</p>
                  </div>
                );
              }
              
              return (
                <div className="space-y-2">
                  {linkItems.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <LinkIcon className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--text-primary)] truncate">{item.name}</p>
                          <p className="text-[10px] text-blue-400 truncate">{item.url}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => window.open(item.url, '_blank')}
                          className="flex-1 py-1.5 text-[10px] font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 rounded-md transition-colors"
                        >
                          Открыть
                        </button>
                        <button
                          onClick={() => scrollToMessage(item.messageId)}
                          className="py-1.5 px-3 text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] rounded-md transition-colors"
                        >
                          К сообщению
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInfoPanel;
