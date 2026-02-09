export interface Person {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  role: 'customer' | 'executor' | 'universal';
}

export interface LinkItem {
  id: string;
  url: string;
  title: string;
  description?: string;
  favicon?: string;
}

export interface ContentPost {
  id: string;
  title: string;
  postText?: string;
  platform: 'telegram' | 'vk' | 'dzen' | 'max' | 'mailing' | 'site';
  contentType: 'post' | 'story' | 'article' | 'mailing';
  publishDate: string;
  publishTime?: string;
  mediaUrls?: string[];
  postStatus: 'draft' | 'scheduled' | 'approved';
  roles?: ('smm' | 'manager')[];
  participants?: string[];
  assignedById?: string;
  assignedToIds?: string[];
  linkId?: string;
  linkUrl?: string;
  linkTitle?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  createdAt: string;
  readBy?: string[];
}

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  postId?: string;
  createdAt: number;
}

export interface Notification {
  id: string;
  type?: 'new_post' | 'comment' | 'mention' | 'status_change' | 'assignment' | 'new_task' | 'event_invite' | 'event_update' | 'event_reminder';
  postId?: string;
  postTitle?: string;
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

export interface ContentPlanMeta {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
  allowedUsers?: string[]; // ID пользователей с доступом (пустой = все)
}

export interface PostForm {
  title: string;
  postText: string;
  platform: 'telegram' | 'vk' | 'dzen' | 'max' | 'mailing' | 'site' | null;
  contentType: 'post' | 'story' | 'article' | 'mailing';
  publishDate: string;
  publishTime: string;
  postStatus: 'draft' | 'scheduled' | 'approved';
  assignedById?: string;
  assignedToIds: string[];
  linkId?: string;
  linkUrl?: string;
  linkTitle?: string;
}

export type ViewMode = 'columns' | 'calendar';
export type InboxTab = 'new' | 'history';
export type Platform = 'telegram' | 'vk' | 'dzen' | 'max' | 'mailing' | 'site';
export type ContentType = 'post' | 'story' | 'article' | 'mailing';
export type PostStatus = 'draft' | 'scheduled' | 'approved';
