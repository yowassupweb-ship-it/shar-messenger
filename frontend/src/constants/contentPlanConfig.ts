export const PLATFORM_CONFIG: Record<string, { color: string; name: string; icon: string; iconBg?: string }> = {
  telegram: { color: '#29b6f6', name: 'Telegram', icon: '/icons/telegram.svg' },
  vk: { color: '#0077FF', name: 'VK', icon: '/icons/vk.svg' },
  dzen: { color: '#FFFFFF', name: 'Дзен', icon: '/icons/dzen.svg' },
  max: { color: '#8B5CF6', name: 'MAX', icon: '/icons/max.svg' },
  mailing: { color: '#f59e0b', name: 'Рассылка', icon: '' },
  site: { color: '#10b981', name: 'Сайт', icon: '' }
};

export const PLATFORM_CONTENT_TYPES: Record<string, { id: string; label: string }[]> = {
  telegram: [
    { id: 'post', label: 'Пост' },
    { id: 'story', label: 'История' }
  ],
  vk: [
    { id: 'post', label: 'Пост' },
    { id: 'story', label: 'История' }
  ],
  dzen: [
    { id: 'article', label: 'Статья' }
  ],
  max: [
    { id: 'post', label: 'Пост' },
    { id: 'story', label: 'История' }
  ],
  mailing: [
    { id: 'mailing', label: 'Рассылка' }
  ],
  site: [
    { id: 'post', label: 'Пост' }
  ]
};

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Черновик', color: 'text-white/50', bg: 'bg-white/10' },
  scheduled: { label: 'Запланирован', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  approved: { label: 'Согласовано', color: 'text-green-400', bg: 'bg-green-500/20' }
};

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  post: 'Пост',
  story: 'История',
  article: 'Статья',
  mailing: 'Рассылка'
};

export const WEEKDAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

export const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export const PLAN_COLORS = [
  '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', 
  '#EF4444', '#EC4899', '#6366F1', '#14B8A6'
];
