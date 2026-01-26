/**
 * Утилиты для генерации аватаров
 * Изменение методов здесь применится ко всем аватаркам в приложении
 */

/**
 * Метод генерации аватара
 * Можно легко переключить между различными способами генерации:
 * - 'initials' - инициалы с цветным фоном (текущий)
 * - 'boringavatars' - https://boringavatars.com/
 * - 'dicebear' - https://www.dicebear.com/
 * - 'ui-avatars' - https://ui-avatars.com/
 * - 'gravatar' - https://gravatar.com/
 */
type AvatarGenerationMethod = 'initials' | 'boringavatars' | 'dicebear' | 'ui-avatars' | 'gravatar';

const AVATAR_METHOD: AvatarGenerationMethod = 'initials';

/**
 * Генерация цвета на основе имени
 */
export const getColorFromName = (name: string): string => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-rose-500',
    'bg-emerald-500',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Получение инициалов из имени
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

/**
 * Генерация URL аватара для внешних сервисов
 */
export const generateAvatarUrl = (name: string, size: number = 80): string | null => {
  if (!name) return null;

  const method = AVATAR_METHOD as string;

  switch (method) {
    case 'initials':
      // Используем локальную генерацию, возвращаем null
      return null;

    case 'boringavatars':
      // https://boringavatars.com/
      // Варианты: marble, beam, pixel, sunset, ring, bauhaus
      const style = 'beam'; // можно менять: marble, beam, pixel, sunset, ring, bauhaus
      return `https://source.boringavatars.com/${style}/${size}/${encodeURIComponent(name)}?colors=264653,2a9d8f,e9c46a,f4a261,e76f51`;

    case 'dicebear':
      // https://www.dicebear.com/
      // Стили: avataaars, bottts, gridy, identicon, initials, lorelei, micah, personas, pixel-art
      const dicebearStyle = 'initials'; // можно менять стили
      return `https://api.dicebear.com/7.x/${dicebearStyle}/svg?seed=${encodeURIComponent(name)}&size=${size}`;

    case 'ui-avatars':
      // https://ui-avatars.com/
      const initials = getInitials(name);
      const bgColor = getColorFromName(name).replace('bg-', '').replace('-500', '');
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=${size}&background=${bgColor}&color=fff&bold=true`;

    case 'gravatar':
      // https://gravatar.com/
      // Требует email, используем name как fallback
      const hash = name.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
      }, 0);
      return `https://www.gravatar.com/avatar/${Math.abs(hash)}?s=${size}&d=retro`;

    default:
      return null;
  }
};

/**
 * Проверка, использует ли текущий метод внешний URL
 */
export const usesExternalUrl = (): boolean => {
  return AVATAR_METHOD !== 'initials';
};

/**
 * Получение названия текущего метода генерации
 */
export const getAvatarMethodName = (): string => {
  const names = {
    'initials': 'Инициалы',
    'boringavatars': 'Boring Avatars',
    'dicebear': 'DiceBear',
    'ui-avatars': 'UI Avatars',
    'gravatar': 'Gravatar'
  };
  return names[AVATAR_METHOD];
};
