export interface User {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  role: 'admin' | 'user';
  lastSeen?: string;
  isOnline?: boolean;
  shortId?: string;
  avatar?: string;
}

export interface Message {
  id: string;
  chatId: string;
  authorId: string;
  authorName: string;
  content: string;
  mentions: string[];
  replyToId?: string;
  createdAt: string;
  updatedAt?: string;
  isEdited: boolean;
  isDeleted?: boolean;
  attachments?: any[];
  isSystemMessage?: boolean;
  linkedChatId?: string;
  linkedMessageId?: string;
  linkedTaskId?: string;
  linkedPostId?: string;
  notificationType?: string;
  metadata?: {
    taskTitle?: string;
    postTitle?: string;
    fromUserName?: string;
  };
}

export interface Chat {
  id: string;
  title?: string;
  isGroup: boolean;
  isNotificationsChat?: boolean;
  isSystemChat?: boolean;
  isFavoritesChat?: boolean;
  participantIds: string[];
  creatorId?: string;
  createdAt: string;
  readMessagesByUser?: Record<string, string>;
  pinnedByUser?: Record<string, boolean>;
  lastMessage?: Message;
  unreadCount?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  dueDate?: string;
  assignedTo?: string | string[];
  authorId?: string;
  createdAt: string;
  assignedById?: string;
  assignedToId?: string;
  assignedToIds?: string[];
}
