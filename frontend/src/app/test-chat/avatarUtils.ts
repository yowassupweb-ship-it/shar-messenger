import type { Chat, User } from '@/components/features/messages/types';

const AVATAR_GRADIENTS = [
  'from-blue-400 to-blue-600',
  'from-green-400 to-green-600',
  'from-purple-400 to-purple-600',
  'from-pink-400 to-pink-600',
  'from-orange-400 to-orange-600',
  'from-red-400 to-red-600',
  'from-teal-400 to-teal-600',
  'from-indigo-400 to-indigo-600',
] as const;

export function getInitials(text: string): string {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function getAvatarGradient(seed: string): string {
  const hash = String(seed || '')
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

export function isFavoritesChat(chat: Chat): boolean {
  return Boolean(chat.isFavoritesChat || String(chat.id).startsWith('favorites_'));
}

export function isNotificationsChat(chat: Chat): boolean {
  const cid = String(chat.id || '');
  return Boolean(chat.isNotificationsChat || cid.startsWith('notifications-') || cid.startsWith('notifications_'));
}

export function getChatAvatarUrl(chat: Chat, currentUser: User | null, users: User[]): string | undefined {
  if (chat.avatar) return chat.avatar;
  if (chat.isGroup) return undefined;

  const currentUserId = String(currentUser?.id ?? '');
  const otherParticipantId = (chat.participantIds || []).find(id => String(id) !== currentUserId);
  if (!otherParticipantId) return undefined;

  const otherUser = users.find(u => String(u.id) === String(otherParticipantId));
  return otherUser?.avatar;
}

export function isForwardTargetAllowed(chat: Chat): boolean {
  return !isNotificationsChat(chat);
}
