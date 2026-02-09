import { MessageCircle } from 'lucide-react';
import MessageItem from './MessageItem';
import type { Message, User, Chat } from './types';

interface MessagesAreaProps {
  messagesListRef: React.RefObject<HTMLDivElement | null>;
  messages: Message[];
  messageSearchQuery: string;
  users: User[];
  currentUser: User | null;
  selectedChat: Chat;
  selectedMessages: Set<string>;
  editingMessageId: string | null;
  isSelectionMode: boolean;
  messageRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  theme: 'light' | 'dark';
  chatSettings: any;
  isDesktopView: boolean;
  myBubbleTextClass: string;
  useDarkTextOnBubble: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  textareaHeight: number;
  router: any;
  setSelectedMessages: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setIsSelectionMode: (value: boolean) => void;
  setContextMenuMessage: (message: Message) => void;
  setContextMenuPosition: (pos: { top: number; left: number }) => void;
  setShowMessageContextMenu: (show: boolean) => void;
  scrollToMessage: (messageId: string) => void;
  setCurrentImageUrl: (url: string) => void;
  setShowImageModal: (show: boolean) => void;
}

export default function MessagesArea({
  messagesListRef,
  messages,
  messageSearchQuery,
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
  messagesEndRef,
  textareaHeight,
  router,
  setSelectedMessages,
  setIsSelectionMode,
  setContextMenuMessage,
  setContextMenuPosition,
  setShowMessageContextMenu,
  scrollToMessage,
  setCurrentImageUrl,
  setShowImageModal,
}: MessagesAreaProps) {
  return (
    <div ref={messagesListRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 pt-20 md:pt-16 pb-0 md:pb-64 bg-transparent scrollbar-hide-mobile">
      <div className="px-2 md:px-4 lg:px-8 h-full">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] select-none">
            <MessageCircle className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-base font-medium">Нет сообщений</p>
            <p className="text-sm mt-1 opacity-70">Начните общение</p>
          </div>
        ) : (
          <div className="space-y-1.5 md:space-y-[3px]">
            {messages.filter(message => {
              if (!message) return false;
              if (!messageSearchQuery.trim()) return true;
              return message.content.toLowerCase().includes(messageSearchQuery.toLowerCase());
            }).map((message, index, filteredMessages) => (
              <MessageItem
                key={message.id}
                message={message}
                index={index}
                filteredMessages={filteredMessages}
                messages={messages}
                users={users}
                currentUser={currentUser}
                selectedChat={selectedChat}
                selectedMessages={selectedMessages}
                editingMessageId={editingMessageId}
                isSelectionMode={isSelectionMode}
                messageRefs={messageRefs}
                theme={theme}
                chatSettings={chatSettings}
                isDesktopView={isDesktopView}
                myBubbleTextClass={myBubbleTextClass}
                useDarkTextOnBubble={useDarkTextOnBubble}
                onSelectMessage={(messageId) => {
                  setSelectedMessages(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(messageId)) {
                      newSet.delete(messageId);
                      if (newSet.size === 0) setIsSelectionMode(false);
                    } else {
                      newSet.add(messageId);
                    }
                    return newSet;
                  });
                }}
                onDoubleClick={(messageId) => {
                  setIsSelectionMode(true);
                  setSelectedMessages(new Set([messageId]));
                }}
                onContextMenu={(e, msg) => {
                  setContextMenuMessage(msg);
                  setContextMenuPosition({ top: e.clientY, left: e.clientX });
                  setShowMessageContextMenu(true);
                }}
                scrollToMessage={scrollToMessage}
                setCurrentImageUrl={setCurrentImageUrl}
                setShowImageModal={setShowImageModal}
                router={router}
              />
            ))}
          </div>
        )}
        <div 
          ref={messagesEndRef} 
          className="h-16 md:h-auto transition-all duration-150" 
          style={{ height: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${Math.max(141, 97 + textareaHeight)}px` : undefined }} 
        />
      </div>
    </div>
  );
}
