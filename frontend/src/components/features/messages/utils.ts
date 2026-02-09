import type { Message } from './types';

/**
 * Форматирование даты для разделителей в чате
 */
export function formatMessageDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const messageDate = new Date(date);
  messageDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  
  if (messageDate.getTime() === today.getTime()) {
    return 'Сегодня';
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return 'Вчера';
  } else {
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const day = messageDate.getDate();
    const month = months[messageDate.getMonth()];
    const year = messageDate.getFullYear();
    const currentYear = new Date().getFullYear();
    
    if (year === currentYear) {
      return `${day} ${month}`;
    } else {
      return `${day} ${month} ${year}`;
    }
  }
}

/**
 * Проверка, нужен ли разделитель даты между сообщениями
 */
export function shouldShowDateSeparator(
  currentMessage: Message,
  previousMessage: Message | undefined
): boolean {
  if (!previousMessage) return true;
  
  const currentDate = new Date(currentMessage.createdAt);
  const previousDate = new Date(previousMessage.createdAt);
  
  currentDate.setHours(0, 0, 0, 0);
  previousDate.setHours(0, 0, 0, 0);
  
  return currentDate.getTime() !== previousDate.getTime();
}

/**
 * Форматирование текста сообщения (markdown-like)
 * Поддерживает: **жирный**, *курсив*, __подчеркнутый__, [ссылка](url)
 */
export function formatMessageText(text: string): string {
  let formatted = text;
  
  // Жирный текст: **text**
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Курсив: *text*
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Подчеркнутый: __text__
  formatted = formatted.replace(/__(.+?)__/g, '<u>$1</u>');
  
  // Ссылки: [text](url)
  formatted = formatted.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>');
  
  return formatted;
}

/**
 * Получение заголовка чата
 */
export function getChatTitle(chat: any, currentUser: any, users: any[]): string {
  if (chat.isFavoritesChat) return 'Избранное';
  if (chat.isNotificationsChat) return 'Уведомления';
  if (chat.isSystemChat) return 'Системный чат';
  if (chat.title) return chat.title;
  
  if (!chat.isGroup && chat.participantIds) {
    const otherParticipantId = chat.participantIds.find((id: string) => id !== currentUser?.id);
    const otherUser = users.find((u) => u.id === otherParticipantId);
    return otherUser?.name || otherUser?.username || 'Пользователь';
  }
  
  return 'Групповой чат';
}

/**
 * Получение данных аватара чата
 */
export function getChatAvatarData(chat: any, currentUser: any, users: any[]): {
  type: 'user' | 'group' | 'favorites' | 'notifications' | 'system';
  name: string;
  avatar: string | undefined;
} {
  if (chat.isFavoritesChat) {
    return { type: 'favorites', name: 'Избранное', avatar: undefined };
  }
  
  if (chat.isNotificationsChat || chat.isSystemChat) {
    return { type: chat.isSystemChat ? 'system' : 'notifications', name: 'Уведомления', avatar: undefined };
  }
  
  if (chat.isGroup) {
    return { type: 'group', name: chat.title || 'Группа', avatar: chat.avatar };
  }
  
  const otherParticipantId = chat.participantIds?.find((id: string) => id !== currentUser?.id);
  const otherUser = users.find((u) => u.id === otherParticipantId);
  
  return {
    type: 'user',
    name: otherUser?.name || otherUser?.username || 'Пользователь',
    avatar: otherUser?.avatar
  };
}
