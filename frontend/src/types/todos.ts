export interface Comment {
  id: string;
  todoId: string;
  authorId: string;
  authorName: string;
  content: string;
  mentions: string[];
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'new_task' | 'comment' | 'status_change' | 'assignment' | 'mention' | 'event_invite' | 'event_reminder' | 'event_update';
  todoId?: string;
  todoTitle?: string;
  eventId?: string;
  eventTitle?: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  todoId?: string;
  createdAt: number;
  groupKey?: string;
  count?: number;
}

export interface Person {
  id: string;
  name: string;
  username?: string;
  telegramId?: string;
  telegramUsername?: string;
  role: 'executor' | 'customer' | 'universal';
  department?: string;
  notifyOnNewTask?: boolean;
  notifyOnStatusChange?: boolean;
  notifyOnComment?: boolean;
  notifyOnMention?: boolean;
  lastSeen?: string;
  createdAt?: string;
}

export interface TodoCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
}

export interface LinkItem {
  id: string;
  url: string;
  title: string;
  description?: string;
  favicon?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'file';
  size?: number;
  uploadedAt: string;
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in-progress' | 'pending' | 'review' | 'cancelled' | 'stuck';
  reviewComment?: string;
  dueDate?: string;
  recurrence?: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  listId: string;
  categoryId?: string | null;
  tags: string[];
  assignedById?: string | null;
  assignedBy?: string | null;
  delegatedById?: string | null;
  delegatedBy?: string | null;
  assignedToId?: string | null;
  assignedTo?: string | null;
  assignedToIds?: string[];
  assignedToNames?: string[];
  linkId?: string;
  linkUrl?: string;
  linkTitle?: string;
  addToCalendar?: boolean;
  calendarEventId?: string;
  calendarListId?: string;
  chatId?: string;
  createdAt: string;
  updatedAt: string;
  order: number;
  archived?: boolean;
  comments?: Comment[];
  readCommentsByUser?: Record<string, string>;
  checklist?: ChecklistItem[];
  attachments?: Attachment[];
}

export interface TodoList {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
  order: number;
  archived?: boolean;
  defaultExecutorId?: string;
  defaultCustomerId?: string;
  defaultAddToCalendar?: boolean;
  creatorId?: string;
  allowedUsers?: string[];
  allowedDepartments?: string[];
  updatedAt?: string;
}

export interface CalendarList {
  id: string;
  name: string;
  color?: string;
  allowedUsers?: string[];
  allowedDepartments?: string[];
}

export interface TodoFilter {
  status: string | null;
  assignedById: string | null;
  assignedToId: string | null;
  onlyMy: boolean;
  categoryId: string | null;
  priority: string | null;
}

export const PRIORITY_COLORS = {
  low: 'border-l-blue-400 dark:border-l-blue-500',
  medium: 'border-l-yellow-400 dark:border-l-yellow-500',
  high: 'border-l-red-400 dark:border-l-red-500'
};

export const PRIORITY_BG = {
  low: 'bg-blue-400/10',
  medium: 'bg-yellow-400/10', 
  high: 'bg-red-400/10'
};

export const PRIORITY_LABELS = {
  low: 'Низкий',
  medium: 'Средний', 
  high: 'Высокий'
};

export interface StatusOption {
  value: string;
  label: string;
  color: string;
}
